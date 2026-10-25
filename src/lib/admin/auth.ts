import { verifyTurnstile, turnstileHostnames } from "../turnstile";
import { constantTimeEqual, sha256 } from "./compare";
import { adminTurnstileAction, maxKeyLength, minSecretLength } from "./constants";
import { signSession } from "./session";

export type AdminLimiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

export type LoginDeps = {
  adminKey: string | undefined;
  sessionSecret: string | undefined;
  turnstileSecret: string | undefined;
  hostnames: string | undefined;
  limiter: AdminLimiter | undefined;
  nowSeconds: number;
  fetchImpl?: (url: string, init: RequestInit) => Promise<Response>;
};

export type LoginInput = {
  key: string;
  turnstileToken: string;
  remoteip: string | null;
};

export type LoginFailure = "misconfigured" | "unavailable" | "throttled" | "captcha" | "wrong-key";

export type LoginOutcome = { ok: true; token: string } | { ok: false; reason: LoginFailure };

export const loginMessages: Record<LoginFailure, string> = {
  misconfigured: "Sign-in is not set up on this server.",
  unavailable: "The check could not be completed. Try again.",
  throttled: "Too many attempts. Wait a minute, then try again.",
  captcha: "Complete the check above.",
  "wrong-key": "That key is not right.",
};

export const loginStatus: Record<LoginFailure, number> = {
  misconfigured: 500,
  unavailable: 503,
  throttled: 429,
  captcha: 403,
  "wrong-key": 401,
};

export function limitKey(remoteip: string | null): string {
  const ip = remoteip?.trim() ?? "";
  return `admin-login:${ip && ip.length <= 64 && !/[\s,]/.test(ip) ? ip : "unknown"}`;
}

export async function adminKeyMatches(input: string, adminKey: string): Promise<boolean> {
  if (input.length === 0 || input.length > maxKeyLength) return false;
  const [given, wanted] = await Promise.all([sha256(input), sha256(adminKey)]);
  return constantTimeEqual(given, wanted);
}

/** Throttle first, then Turnstile, then the key. Every attempt counts against the limit. */
export async function attemptLogin(input: LoginInput, deps: LoginDeps): Promise<LoginOutcome> {
  const { adminKey, sessionSecret, limiter } = deps;
  if (!adminKey || adminKey.length < minSecretLength || !sessionSecret || sessionSecret.length < minSecretLength || !limiter) {
    return { ok: false, reason: "misconfigured" };
  }

  try {
    const outcome = await limiter.limit({ key: limitKey(input.remoteip) });
    if (outcome.success !== true) return { ok: false, reason: "throttled" };
  } catch (error) {
    console.error("Admin rate limit failed:", error instanceof Error ? error.name : "unknown");
    return { ok: false, reason: "unavailable" };
  }

  const verdict = await verifyTurnstile({
    token: input.turnstileToken,
    secret: deps.turnstileSecret,
    remoteip: input.remoteip,
    hostnames: turnstileHostnames(deps.hostnames),
    action: adminTurnstileAction,
    fetchImpl: deps.fetchImpl,
  });
  if (verdict === "rejected") return { ok: false, reason: "captcha" };
  if (verdict === "misconfigured") return { ok: false, reason: "misconfigured" };
  if (verdict !== "ok") return { ok: false, reason: "unavailable" };

  if (!(await adminKeyMatches(input.key, adminKey))) return { ok: false, reason: "wrong-key" };
  return { ok: true, token: await signSession({ sessionSecret, adminKey }, deps.nowSeconds) };
}
