// Support for the manual "check for updates" action in DxpAppVersionInfo.
//
// The OMS stays the single source of truth for WHICH build a deployment should run:
// admin/apps/{appId}/appVersions -> currentVersion, resolved by useAuth().fetchAppVersion() and
// applied to the URL by getCanonicalPath(). Nothing here re-implements or second-guesses that.
//
// This module answers only the question that check cannot: whether the build sitting at our own
// canonical path has been republished since this tab loaded it. That happens routinely — the release
// workflow rebuilds the same vX.Y.Z tree on every run — and it is invisible to a version comparison
// because the version string does not change.
//
// Vite fingerprints the entry bundle (assets/index-<hash>.js) and rewrites index.html to point at it,
// so a different entry src means a different build. Firebase Hosting serves index.html with
// `cache-control: no-cache`, so a no-store fetch revalidates rather than reading a stale copy.

const SCRIPT_TAG_PATTERN = /<script\b[^>]*>/gi;

// The attribute must start at a whitespace boundary, not merely a word boundary: `\bsrc=` also matches
// the `data-src=` that vite-plugin-legacy puts on its nomodule entry, which would read the wrong file.
const attributeOf = (tag: string, name: string): string | null => {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}=["']([^"']*)["']`, "i"));
  return match ? match[1] : null;
};

/**
 * Extract the module entry bundle's src from an index.html string.
 *
 * Only `type="module"` scripts count: the legacy plugin also emits a `nomodule` bundle with its own
 * hash, and matching that instead would compare two different files and report a phantom update.
 * Returns null when no module script is present, which the caller treats as "cannot tell".
 */
export const getEntryScriptSrc = (html: string): string | null => {
  for (const match of html.matchAll(SCRIPT_TAG_PATTERN)) {
    const tag = match[0];
    const src = attributeOf(tag, "src");
    if (!src) continue;
    if (attributeOf(tag, "type")?.toLowerCase() === "module") return src;
  }
  return null;
};

/**
 * The entry bundle this tab actually loaded. getAttribute (not the resolved .src property) so it is
 * compared like-for-like with the raw markup returned by getEntryScriptSrc.
 */
export const getLoadedEntryScriptSrc = (doc: Document): string | null =>
  doc.querySelector('script[type="module"][src]')?.getAttribute("src") ?? null;

export type BuildComparison = "update-available" | "up-to-date" | "unknown";

/**
 * "unknown" when either side could not be read — reported separately from "up-to-date" so a failed
 * read is never shown to the user as a clean bill of health.
 */
export const compareBuilds = (loaded: string | null, deployed: string | null): BuildComparison => {
  if (!loaded || !deployed) return "unknown";
  return loaded === deployed ? "up-to-date" : "update-available";
};

/**
 * Fetch the entry bundle src currently published at `baseUrl`.
 *
 * baseUrl is import.meta.env.BASE_URL, which vite.config.ts sets to `/${buildVersion}/` for a versioned
 * build and `/` otherwise — so this always reads the index.html of the version this build belongs to,
 * never another version's. Returns null on any non-OK response so the caller reports "unknown".
 */
export const fetchDeployedEntryScriptSrc = async (
  baseUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<string | null> => {
  const response = await fetchImpl(baseUrl, { cache: "no-store", headers: { Accept: "text/html" } });
  if (!response.ok) return null;
  return getEntryScriptSrc(await response.text());
};
