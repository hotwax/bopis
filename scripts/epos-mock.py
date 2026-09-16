#!/usr/bin/env python3
"""
Mock Epson ePOS-Print endpoint, for developing without a network printer.

Stands in for a printer's ePOS-Print service: accepts the same XML that
epson.ePOSPrint posts to

    /cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000

converts it to ESC/POS, and pipes it to a printer attached over USB via
`lp -o raw`. Any ESC/POS printer works, including a plain TM-T88V that has no
ePOS support of its own.

    python3 scripts/epos-mock.py --printer-host 192.168.0.206   # over the network
    python3 scripts/epos-mock.py --queue EPSON_TM_T88V_S_A      # over USB (CUPS)
    python3 scripts/epos-mock.py --dry-run                      # print nothing

--printer-host sends raw ESC/POS to the printer's port 9100, which works on any
networked TM printer including ones with no ePOS support of their own (a UB-E03
card, for instance). --queue goes through CUPS to a USB-attached printer.

Point the app at it with VITE_EPOS_HOST=localhost:8008. Swapping that to a real
printer's IP is the only change needed to run against actual hardware.

Find your queue name with:  lpstat -p
"""

import argparse
import base64
import re
import socket
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from xml.etree import ElementTree as ET

NS = "{http://www.epson-pos.com/schemas/2011/03/epos-print}"

ESC = b"\x1b"
GS = b"\x1d"

ALIGN = {"left": 0, "center": 1, "right": 2}

BARCODE_TYPE = {
    "upc_a": 65, "upc_e": 66, "ean13": 67, "jan13": 67,
    "ean8": 68, "jan8": 68, "code39": 69, "itf": 70,
    "codabar": 71, "code93": 72, "code128": 73,
}
HRI_POS = {"none": 0, "above": 1, "below": 2, "both": 3}

# Rows of raster per GS v 0 command; a whole receipt at once can overrun the
# printer's input buffer.
IMAGE_BAND_ROWS = 128


def _bool(v, default=False):
    if v is None:
        return default
    return str(v).lower() == "true"


def esc_pos_from_epos(xml_bytes):
    """Translate an ePOS-Print XML document into ESC/POS bytes."""
    root = ET.fromstring(xml_bytes)

    body = root.find(f".//{NS}epos-print")
    if body is None:
        body = root if root.tag == f"{NS}epos-print" else root

    out = bytearray()
    out += ESC + b"@"                      # initialize

    for el in body:
        tag = el.tag.replace(NS, "")
        a = el.attrib

        if tag == "text":
            if "align" in a:
                out += ESC + b"a" + bytes([ALIGN.get(a["align"], 0)])
            if "em" in a:
                out += ESC + b"E" + bytes([1 if _bool(a["em"]) else 0])
            if "ul" in a:
                out += ESC + b"-" + bytes([1 if _bool(a["ul"]) else 0])

            dw, dh = _bool(a.get("dw")), _bool(a.get("dh"))
            w = int(a.get("width", 2 if dw else 1))
            h = int(a.get("height", 2 if dh else 1))
            w, h = max(1, min(w, 8)), max(1, min(h, 8))
            if (w, h) != (1, 1):
                out += GS + b"!" + bytes([((w - 1) << 4) | (h - 1)])

            if el.text:
                out += el.text.replace("\r\n", "\n").encode("cp437", "replace")

            if (w, h) != (1, 1):
                out += GS + b"!" + bytes([0])
            if _bool(a.get("em")):
                out += ESC + b"E" + bytes([0])
            if _bool(a.get("ul")):
                out += ESC + b"-" + bytes([0])

        elif tag == "feed":
            if "line" in a:
                out += ESC + b"d" + bytes([max(0, min(int(a["line"]), 255))])
            elif "unit" in a:
                out += ESC + b"J" + bytes([max(0, min(int(a["unit"]), 255))])
            else:
                out += b"\n"

        elif tag == "cut":
            out += GS + b"V" + (bytes([1]) if a.get("type") == "no_feed" else bytes([66, 0]))

        elif tag == "pulse":
            drawer = 0 if a.get("drawer", "drawer_1") == "drawer_1" else 1
            out += ESC + b"p" + bytes([drawer, 50, 50])

        elif tag == "barcode":
            btype = BARCODE_TYPE.get(a.get("type", "code128"), 73)
            out += GS + b"h" + bytes([max(1, min(int(a.get("height", 40)), 255))])
            out += GS + b"w" + bytes([max(2, min(int(a.get("width", 3)), 6))])
            out += GS + b"H" + bytes([HRI_POS.get(a.get("hri", "below"), 2)])
            data = (el.text or "").encode("ascii", "replace")
            out += GS + b"k" + bytes([btype, len(data)]) + data

        elif tag == "symbol":
            data = (el.text or "").encode("utf-8")
            size = max(1, min(int(a.get("width", 5)), 16))
            out += GS + b"(k" + bytes([4, 0, 49, 65, 50, 0])          # model 2
            out += GS + b"(k" + bytes([3, 0, 49, 67, size])            # module size
            out += GS + b"(k" + bytes([3, 0, 49, 69, 49])              # EC level M
            n = len(data) + 3
            out += GS + b"(k" + bytes([n & 0xFF, (n >> 8) & 0xFF, 49, 80, 48]) + data
            out += GS + b"(k" + bytes([3, 0, 49, 81, 48])              # print

        elif tag == "image":
            # ePOS mono raster is 1bpp, MSB first, 1 = ink - exactly the packing
            # GS v 0 expects, so the payload passes straight through.
            w, h = int(a.get("width", 0)), int(a.get("height", 0))
            raw = base64.b64decode((el.text or "").strip())
            row_bytes = (w + 7) // 8

            if a.get("align") in ALIGN:
                out += ESC + b"a" + bytes([ALIGN[a["align"]]])

            expected = row_bytes * h
            if len(raw) < expected:
                sys.stderr.write(
                    f"[epos-mock] image raster short: {len(raw)} < {expected}; padding\n")
                raw += b"\x00" * (expected - len(raw))

            for top in range(0, h, IMAGE_BAND_ROWS):
                rows = min(IMAGE_BAND_ROWS, h - top)
                chunk = raw[top * row_bytes:(top + rows) * row_bytes]
                out += GS + b"v0" + bytes([
                    0,
                    row_bytes & 0xFF, (row_bytes >> 8) & 0xFF,
                    rows & 0xFF, (rows >> 8) & 0xFF,
                ]) + chunk

        elif tag == "logo":
            sys.stderr.write("[epos-mock] <logo> needs printer NV memory; skipped\n")

    return bytes(out)


def readable(xml_bytes):
    """Plain-text rendering of the receipt, for the console."""
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return "<unparseable>"
    lines = []
    for el in root.iter():
        tag = el.tag.replace(NS, "")
        if tag == "text" and el.text:
            lines.append(el.text.rstrip("\n"))
        elif tag == "feed":
            lines.append("")
        elif tag == "cut":
            lines.append("-- cut --")
        elif tag in ("barcode", "symbol"):
            lines.append(f"[{tag}: {(el.text or '').strip()}]")
        elif tag == "image":
            lines.append(f"[image: {el.get('width')}x{el.get('height')} dots]")
    return "\n".join(lines)


def send_raw(data, printer_host=None, queue=None, timeout=30):
    """Deliver ESC/POS to the printer. Returns (ok, message)."""
    if printer_host:
        host, _, port = printer_host.partition(":")
        try:
            with socket.create_connection((host, int(port or 9100)), timeout=timeout) as sock:
                sock.sendall(data)
            return True, f"sent {len(data)} bytes to {host}:{port or 9100}"
        except OSError as e:
            return False, f"socket error: {e}"

    p = subprocess.run(["lp", "-d", queue, "-o", "raw"], input=data, capture_output=True)
    if p.returncode != 0:
        return False, f"lp failed: {p.stderr.decode().strip()}"

    return True, p.stdout.decode().strip()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    queue = None
    printer_host = None
    dry_run = False

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, SOAPAction, If-Modified-Since")

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self):
        if "service.cgi" not in self.path:
            self.send_response(404)
            self._cors()
            self.send_header("Content-Length", "0")
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length)

        ok, code = True, ""
        try:
            escpos = esc_pos_from_epos(raw)
            print("\n" + "=" * 46)
            print(readable(raw))
            print("=" * 46)
            print(f"[epos-mock] {len(escpos)} bytes of ESC/POS", flush=True)

            if self.dry_run:
                print(escpos[:200].hex(" "), "..." if len(escpos) > 200 else "", flush=True)
            else:
                sent, message = send_raw(escpos, self.printer_host, self.queue)
                if sent:
                    print(f"[epos-mock] {message}", flush=True)
                else:
                    ok, code = False, "DeviceNotFound"
                    sys.stderr.write(f"[epos-mock] {message}\n")
        except Exception as e:              # noqa: BLE001 - a mock must never 500 its client
            ok, code = False, "EX_BADPORT"
            sys.stderr.write(f"[epos-mock] error: {e}\n")

        payload = (
            '<?xml version="1.0" encoding="utf-8"?>'
            '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>'
            f'<response success="{"true" if ok else "false"}" code="{code}" '
            'status="252" battery="0" '
            'xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print"/>'
            "</s:Body></s:Envelope>"
        ).encode()

        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "text/xml; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args):
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--printer-host", metavar="HOST[:PORT]",
                    help="send raw ESC/POS over the network (default port 9100)")
    ap.add_argument("--queue", default="EPSON_TM_T88V_S_A", help="CUPS queue name (see: lpstat -p)")
    ap.add_argument("--port", type=int, default=8008, help="port this mock listens on")
    ap.add_argument("--dry-run", action="store_true", help="don't send to the printer")
    args = ap.parse_args()

    Handler.queue = args.queue
    Handler.printer_host = args.printer_host
    Handler.dry_run = args.dry_run

    target = (f"network {args.printer_host}" if args.printer_host
              else f"cups queue {args.queue}")
    print(f"[epos-mock] listening on http://localhost:{args.port}/cgi-bin/epos/service.cgi")
    print(f"[epos-mock] printing to {target}  dry_run={args.dry_run}")
    print(f"[epos-mock] set VITE_EPOS_HOST=localhost:{args.port}")
    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
