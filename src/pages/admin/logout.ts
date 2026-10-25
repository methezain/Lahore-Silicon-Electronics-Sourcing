import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { recordAudit, type AuditDatabase } from "../../lib/admin/audit";
import { adminActor, adminCookie, adminLoginPath } from "../../lib/admin/constants";

export const prerender = false;

export const GET: APIRoute = ({ redirect }) => redirect(adminLoginPath, 302);

export const POST: APIRoute = async ({ cookies, locals, redirect }) => {
  cookies.set(adminCookie, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 });
  if (locals.admin) await recordAudit(env?.DB as AuditDatabase | undefined, { actor: adminActor, action: "admin.logout" });
  return redirect(adminLoginPath, 303);
};
