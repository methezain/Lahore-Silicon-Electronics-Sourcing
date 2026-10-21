import { turnstileAction } from "./order-key";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN = 2048;

export type TurnstileVerdict = "ok" | "rejected" | "misconfigured" | "unavailable";

type Siteverify = {
  success?: unknown;
  action?: unknown;
  hostname?: unknown;
  metadata?: { result_with_testing_key?: unknown };
};

export function turnstileHostnames(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Cloudflare's published test secret answers `success` with hostname `example.com`
 * and no action. A real token must carry the checkout action. The hostname still
 * has to be on the allowlist, so the test hostname is not accepted in production.
 */
function actionAccepted(result: Siteverify): boolean {
  if (result.action === turnstileAction) return true;
  const testing = result.metadata?.result_with_testing_key === true;
  return testing && (result.action == null || result.action === "");
}

export async function verifyTurnstile(input: {
  token: string;
  secret: string | undefined;
  remoteip: string | null;
  hostnames: ReadonlySet<string>;
  fetchImpl?: (url: string, init: RequestInit) => Promise<Response>;
}): Promise<TurnstileVerdict> {
  if (!input.secret || input.hostnames.size === 0) return "misconfigured";
  if (input.token.length === 0 || input.token.length > MAX_TOKEN) return "rejected";

  const body = new URLSearchParams({
    secret: input.secret,
    response: input.token,
  });
  const remoteip = input.remoteip?.trim() ?? "";
  if (remoteip) body.set("remoteip", remoteip);

  const fetchImpl = input.fetchImpl ?? fetch;
  let result: Siteverify;
  try {
    const response = await fetchImpl(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return "unavailable";
    result = (await response.json()) as Siteverify;
  } catch (error) {
    console.error("Turnstile verification failed:", error instanceof Error ? error.name : "unknown");
    return "unavailable";
  }

  const hostname = typeof result.hostname === "string" ? result.hostname.trim().toLowerCase() : "";
  if (result.success !== true || !actionAccepted(result) || !input.hostnames.has(hostname)) {
    console.error("Turnstile verification failed.");
    return "rejected";
  }
  return "ok";
}
