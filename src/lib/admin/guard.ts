import { adminLoginPath } from "./constants";

export type Gate = "pass" | "login" | "hide";

/** Router decodes percent-escapes before matching, so the guard must too. */
export function normalizePath(pathname: string): string {
  let path = pathname;
  for (let i = 0; i < 2; i += 1) {
    try {
      path = decodeURIComponent(path);
    } catch {
      return "/admin/malformed";
    }
  }
  return path.toLowerCase().replace(/\/{2,}/g, "/").replace(/(.)\/$/, "$1");
}

export function isAdminPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return path === "/admin" || path.startsWith("/admin/") || path.startsWith("/_actions/admin") || path.startsWith("/media/upload");
}

export function isAdminPage(pathname: string): boolean {
  const path = normalizePath(pathname);
  return path === "/admin" || path.startsWith("/admin/");
}

export function gate(pathname: string, method: string, signedIn: boolean): Gate {
  if (!isAdminPath(pathname)) return "pass";
  if (normalizePath(pathname) === adminLoginPath) return "pass";
  if (signedIn) return "pass";
  if (isAdminPage(pathname) && (method === "GET" || method === "HEAD")) return "login";
  return "hide";
}

export const adminResponseHeaders = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
} as const;
