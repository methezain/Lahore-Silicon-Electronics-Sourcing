-- Admin core: order bookkeeping, audit trail, key-value meta. Forward-only.
ALTER TABLE Orders ADD COLUMN updated_at TEXT;
ALTER TABLE Orders ADD COLUMN admin_note TEXT;

CREATE INDEX IF NOT EXISTS Orders_status_created ON Orders (status, created_at);

CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  restocked INTEGER NOT NULL DEFAULT 0 CHECK (restocked IN (0, 1)),
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  actor TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS order_events_order ON order_events (order_id, id);

-- Holds who did what, never a buyer name, phone or address.
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  detail_json TEXT
);

CREATE INDEX IF NOT EXISTS audit_log_at ON audit_log (at);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
