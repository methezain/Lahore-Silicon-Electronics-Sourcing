export type AdminResult = { meta?: { changes?: number } };

export interface AdminBound {
  run(): Promise<AdminResult>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface AdminDatabase {
  prepare(query: string): { bind(...values: unknown[]): AdminBound };
  batch(statements: readonly AdminBound[]): Promise<readonly AdminResult[]>;
}

export function changesOf(result: AdminResult | undefined): number {
  const changes = result?.meta?.changes;
  return typeof changes === "number" ? changes : 0;
}

/** Escapes `%`, `_` and the escape character for a LIKE with `ESCAPE '\'`. */
export function likePattern(text: string): string {
  return `%${text.replace(/[\%_]/g, (char) => `\${char}`)}%`;
}
