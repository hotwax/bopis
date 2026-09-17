// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  compareBuilds,
  fetchDeployedEntryScriptSrc,
  getEntryScriptSrc,
  getLoadedEntryScriptSrc
} from "../src/utils/appUpdateUtil";

/**
 * Copied verbatim from the script tags https://bopis-uat.hotwax.io/ actually serves, so these tests
 * fail if the real build output ever stops matching our assumptions. The order matters: the module
 * entry is first, but several later tags also carry a src and must not be mistaken for it.
 */
const DEPLOYED_HTML = `<!DOCTYPE html><html><head>
  <script type="module" crossorigin src="/assets/index-CpyuU-8L.js"></script>
  <script type="module">console.log("inline, no src")</script>
  <script id="vite-plugin-pwa:register-sw" src="/registerSW.js"></script>
  <script type="text/javascript" src="/epos-2.27.0.js"></script>
  <script nomodule>!function(){}()</script>
  <script nomodule crossorigin id="vite-legacy-polyfill" src="/assets/polyfills-legacy-DITV9aQr.js"></script>
  <script nomodule crossorigin id="vite-legacy-entry" data-src="/assets/index-legacy-CGZhEBFt.js"></script>
</head><body></body></html>`;

describe("getEntryScriptSrc", () => {
  it("picks the fingerprinted module entry out of a real deployed index.html", () => {
    expect(getEntryScriptSrc(DEPLOYED_HTML)).toBe("/assets/index-CpyuU-8L.js");
  });

  it("never returns the legacy bundles", () => {
    // Both are the same app at the same version; comparing one against the module entry would report
    // an update on every single check.
    const result = getEntryScriptSrc(DEPLOYED_HTML);
    expect(result).not.toContain("legacy");
    expect(result).not.toContain("polyfills");
  });

  it("does not read data-src as src", () => {
    // Guards the attribute boundary: `\bsrc=` matches inside `data-src=`, which would pick up the
    // legacy entry's file name from a tag that also claimed type=module.
    const html = `<script type="module" data-src="/assets/decoy-legacy.js"></script>`;
    expect(getEntryScriptSrc(html)).toBeNull();
  });

  it("skips module scripts that have no src", () => {
    const html = `<script type="module">boot()</script><script type="module" src="/assets/real.js"></script>`;
    expect(getEntryScriptSrc(html)).toBe("/assets/real.js");
  });

  it("skips scripts that have a src but are not modules", () => {
    const html = `<script src="/registerSW.js"></script><script type="module" src="/assets/real.js"></script>`;
    expect(getEntryScriptSrc(html)).toBe("/assets/real.js");
  });

  it("tolerates attribute order and single quotes", () => {
    const html = `<script crossorigin src='/assets/index-abc.js' type='module'></script>`;
    expect(getEntryScriptSrc(html)).toBe("/assets/index-abc.js");
  });

  it("returns null when there is no module entry at all", () => {
    expect(getEntryScriptSrc("<html><body>offline placeholder</body></html>")).toBeNull();
  });

  it("reads a versioned base path's entry unchanged", () => {
    const html = `<script type="module" crossorigin src="/v5.3.1/assets/index-CpyuU-8L.js"></script>`;
    expect(getEntryScriptSrc(html)).toBe("/v5.3.1/assets/index-CpyuU-8L.js");
  });
});

describe("getLoadedEntryScriptSrc", () => {
  const docWith = (html: string) => new DOMParser().parseFromString(html, "text/html");

  it("returns the raw attribute, not the resolved absolute URL", () => {
    // The deployed HTML is compared as text, so the DOM side must not be resolved to
    // http://localhost/assets/... or every comparison would report a false update.
    const doc = docWith(`<script type="module" src="/assets/index-CpyuU-8L.js"></script>`);
    expect(getLoadedEntryScriptSrc(doc)).toBe("/assets/index-CpyuU-8L.js");
  });

  it("ignores non-module and src-less scripts the same way", () => {
    const doc = docWith(DEPLOYED_HTML);
    expect(getLoadedEntryScriptSrc(doc)).toBe("/assets/index-CpyuU-8L.js");
  });

  it("returns null when the document has no module entry", () => {
    expect(getLoadedEntryScriptSrc(docWith("<p>nothing</p>"))).toBeNull();
  });
});

describe("compareBuilds", () => {
  it("reports up-to-date only when both sides are known and identical", () => {
    expect(compareBuilds("/assets/index-A.js", "/assets/index-A.js")).toBe("up-to-date");
  });

  it("reports update-available when the deployed entry has a different hash", () => {
    expect(compareBuilds("/assets/index-CWy1QCxv.js", "/assets/index-CpyuU-8L.js")).toBe("update-available");
  });

  it.each([
    ["loaded missing", null, "/assets/index-A.js"],
    ["deployed missing", "/assets/index-A.js", null],
    ["both missing", null, null]
  ])("reports unknown rather than up-to-date when %s", (_label, loaded, deployed) => {
    // A failed read must never be presented to the user as a clean bill of health.
    expect(compareBuilds(loaded, deployed)).toBe("unknown");
  });
});

describe("fetchDeployedEntryScriptSrc", () => {
  const okResponse = (body: string) =>
    ({ ok: true, text: () => Promise.resolve(body) }) as unknown as Response;

  it("bypasses the http cache so a republished build is actually seen", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(DEPLOYED_HTML));
    await fetchDeployedEntryScriptSrc("/", fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledWith("/", expect.objectContaining({ cache: "no-store" }));
  });

  it("requests the base url it is given, so a versioned build reads its own index.html", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(DEPLOYED_HTML));
    await fetchDeployedEntryScriptSrc("/v5.3.1/", fetchImpl as unknown as typeof fetch);
    expect(fetchImpl.mock.calls[0][0]).toBe("/v5.3.1/");
  });

  it("returns the deployed entry on success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(DEPLOYED_HTML));
    await expect(fetchDeployedEntryScriptSrc("/", fetchImpl as unknown as typeof fetch))
      .resolves.toBe("/assets/index-CpyuU-8L.js");
  });

  it("returns null on a non-OK response instead of parsing an error page", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve("<script type=\"module\" src=\"/assets/oops.js\"></script>")
    } as unknown as Response);
    await expect(fetchDeployedEntryScriptSrc("/", fetchImpl as unknown as typeof fetch)).resolves.toBeNull();
  });

  it("propagates a network failure so the caller can report it rather than claim up-to-date", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(fetchDeployedEntryScriptSrc("/", fetchImpl as unknown as typeof fetch)).rejects.toThrow("offline");
  });
});
