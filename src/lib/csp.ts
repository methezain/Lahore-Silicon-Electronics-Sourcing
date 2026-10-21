/** SHA-256 CSP hash of an inline style or script body. Astro hashes its own bundles. */

export async function cspSha256(content: string): Promise<`sha256-${string}`> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  const bytes = new Uint8Array(digest);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `sha256-${btoa(binary)}`;
}
