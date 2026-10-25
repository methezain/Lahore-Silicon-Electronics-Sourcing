-- Field Web Vitals. Forward-only. No buyer name, phone, address, or order id.
-- `/order-success/<id>` is stored as `/order-success` by the writer.
CREATE TABLE IF NOT EXISTS web_vitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (name IN ('LCP', 'INP', 'CLS')),
  value REAL NOT NULL CHECK (value >= 0 AND value <= 60000),
  rating TEXT NOT NULL CHECK (rating IN ('good', 'needs-improvement', 'poor')),
  within_budget INTEGER NOT NULL CHECK (within_budget IN (0, 1)),
  path TEXT NOT NULL CHECK (length(path) BETWEEN 1 AND 80),
  recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
