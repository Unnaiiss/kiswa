/**
 * Only allows a same-origin, path-relative redirect target — used for the
 * customer account flows' "redirect back to wherever they came from"
 * (?redirect=... query param). Rejects anything that could send the browser
 * off-site: absolute URLs ("https://evil.com"), protocol-relative URLs
 * ("//evil.com" — browsers treat these as absolute, using the current
 * page's protocol), and backslash variants some browsers also normalize
 * into protocol-relative ("/\evil.com", "\\evil.com"). Falls back to
 * `fallback` for anything that doesn't look like a safe internal path.
 */
export function sanitizeRedirect(
  target: string | null | undefined,
  fallback: string,
): string {
  if (!target) return fallback;
  if (!target.startsWith("/")) return fallback;
  if (target.startsWith("//")) return fallback;
  if (target.startsWith("/\\") || target.startsWith("\\")) return fallback;
  if (target.includes("://")) return fallback;
  return target;
}
