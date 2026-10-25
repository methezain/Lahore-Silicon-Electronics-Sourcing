export type AuditDatabase = {
  prepare(sql: string): {
    bind(...values: unknown[]): { run(): Promise<unknown> };
  };
};

type Preparable<B> = { prepare(sql: string): { bind(...values: unknown[]): B } };

const INSERT_IF_CHANGED = "INSERT INTO audit_log (actor, action, target, detail_json) SELECT ?, ?, ?, ? WHERE changes() = 1";

/** For a batch: the row is written only while `changes()` reports that the previous statement changed one row. */
export function recordAuditStatement<B>(db: Preparable<B>, entry: AuditEntry): B {
  const detail = entry.detail ? JSON.stringify(entry.detail) : null;
  return db.prepare(INSERT_IF_CHANGED).bind(entry.actor, entry.action, entry.target ?? null, detail);
}

export type AuditEntry = {
  actor: string;
  action: string;
  target?: string;
  detail?: Record<string, string | number | boolean>;
};

/** Never put a buyer name, phone or address in `detail`. Failure is logged, not thrown. */
export async function recordAudit(db: AuditDatabase | undefined, entry: AuditEntry): Promise<boolean> {
  if (!db) return false;
  try {
    await db
      .prepare("INSERT INTO audit_log (actor, action, target, detail_json) VALUES (?, ?, ?, ?)")
      .bind(entry.actor, entry.action, entry.target ?? null, entry.detail ? JSON.stringify(entry.detail) : null)
      .run();
    return true;
  } catch (error) {
    console.error("Audit write failed:", error instanceof Error ? error.name : "unknown");
    return false;
  }
}
