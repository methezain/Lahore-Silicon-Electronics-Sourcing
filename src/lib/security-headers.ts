/** Response headers from docs/engineering.md#security. CSP hashes come from Astro. */

export const frameAncestorsPolicy = "frame-ancestors 'none'";

export const securityHeaderEntries = [
  ["Strict-Transport-Security", "max-age=31536000; includeSubDomains"],
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()"],
] as const;

/**
 * Sets the fixed headers and adds `frame-ancestors` to the CSP policy.
 * One Content-Security-Policy header: a second header would be joined with a comma.
 */
export function applySecurityHeaders(headers: Headers): void {
  for (const [name, value] of securityHeaderEntries) headers.set(name, value);

  const current = headers.get("Content-Security-Policy")?.trim() ?? "";
  if (!current) {
    headers.set("Content-Security-Policy", frameAncestorsPolicy);
    return;
  }
  if (/frame-ancestors/i.test(current)) return;
  const base = current.endsWith(";") ? current.slice(0, -1) : current;
  headers.set("Content-Security-Policy", `${base}; ${frameAncestorsPolicy}`);
}
