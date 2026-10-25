import { exec as execCommand } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { expect, type Page } from '@playwright/test';

const exec = promisify(execCommand);

function devVar(name: string): string | undefined {
  try {
    const line = readFileSync('.dev.vars', 'utf8').split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
    return line?.slice(name.length + 1).trim() || undefined;
  } catch {
    return undefined;
  }
}

export const sameOrigin = { Origin: 'http://localhost:4321' };
export const adminKey = process.env.ADMIN_KEY ?? devVar('ADMIN_KEY');

let counter = 0;
export function freshIp(): string {
  counter += 1;
  return `198.51.100.${(Date.now() + counter) % 250 + 1}`;
}

/** Each browser gets its own client address, so one test's attempts never throttle another's. */
export async function signIn(page: Page, key = adminKey ?? ''): Promise<void> {
  const ip = freshIp();
  await page.context().route('http://localhost:4321/**', (route) => route.continue({ headers: { ...route.request().headers(), 'cf-connecting-ip': ip } }));
  await page.goto('/admin/login');
  await page.getByLabel('Admin key').fill(key);
  await expect(page.locator('#login-turnstile-token')).not.toHaveValue('', { timeout: 20_000 });
  await page.getByRole('button', { name: 'Sign in' }).click();
}

export async function localSql(sql: string): Promise<string> {
  const { stdout } = await exec(`npx wrangler d1 execute electronics-sourcing-db --local --json --command "${sql.replace(/"/g, '\\"')}"`, {
    timeout: 90_000,
  });
  return stdout;
}

export async function localQty(part: string): Promise<number> {
  const out = JSON.parse(await localSql(`SELECT qty FROM stock WHERE part_number = '${part}'`)) as { results: { qty: number }[] }[];
  return out[0]?.results[0]?.qty ?? -1;
}
