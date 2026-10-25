import { constantTimeEqual, hmacHex, sha256, toHex } from "./compare";
import { sessionSeconds } from "./constants";

const VERSION = "v1";

export type SessionSecrets = {
  sessionSecret: string;
  adminKey: string;
};

/** Binds a session to the current admin key, so rotating the key signs everyone out. */
async function keyFingerprint(adminKey: string): Promise<string> {
  return toHex(await sha256(`admin-session:${adminKey}`)).slice(0, 16);
}

async function sign(secrets: SessionSecrets, expires: number): Promise<string> {
  return hmacHex(secrets.sessionSecret, `${VERSION}.${expires}.${await keyFingerprint(secrets.adminKey)}`);
}

export async function signSession(secrets: SessionSecrets, nowSeconds: number): Promise<string> {
  const expires = nowSeconds + sessionSeconds;
  return `${VERSION}.${expires}.${await sign(secrets, expires)}`;
}

export async function verifySession(token: string | undefined, secrets: SessionSecrets, nowSeconds: number): Promise<boolean> {
  if (!token || token.length > 256) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== VERSION) return false;
  const [, expiresText = "", signature = ""] = parts;
  if (!/^\d{1,12}$/.test(expiresText)) return false;
  const expires = Number(expiresText);
  const expected = new TextEncoder().encode(await sign(secrets, expires));
  if (!constantTimeEqual(new TextEncoder().encode(signature), expected)) return false;
  return expires > nowSeconds;
}
