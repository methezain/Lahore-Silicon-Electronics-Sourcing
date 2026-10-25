import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { adminCookie, adminLoginPath } from "./lib/admin/constants";
import { adminResponseHeaders, gate, isAdminPath } from "./lib/admin/guard";
import { verifySession } from "./lib/admin/session";
import { secureResponse } from "./lib/security-headers";

function withAdminHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(adminResponseHeaders)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (!isAdminPath(pathname)) return secureResponse(await next());

  const secrets = env?.ADMIN_KEY && env?.SESSION_SECRET ? { adminKey: env.ADMIN_KEY, sessionSecret: env.SESSION_SECRET } : null;
  const signedIn = secrets !== null && (await verifySession(context.cookies.get(adminCookie)?.value, secrets, Math.floor(Date.now() / 1000)));

  const verdict = gate(pathname, context.request.method, signedIn);
  if (verdict === "login") return secureResponse(withAdminHeaders(context.redirect(adminLoginPath, 302)));
  if (verdict === "hide") return secureResponse(withAdminHeaders(new Response("Not found", { status: 404 })));

  if (signedIn) context.locals.admin = { signedIn: true };
  return secureResponse(withAdminHeaders(await next()));
});
