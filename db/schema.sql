-- Forward-only. Creates the table when it is missing and does not drop rows.
CREATE TABLE IF NOT EXISTS Orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  destination TEXT,
  address TEXT NOT NULL,
  items_json TEXT NOT NULL,
  total_price INTEGER NOT NULL,
  payment_ref TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  idempotency_key TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS Orders_idempotency_key ON Orders (idempotency_key);

-- Live shelf counts. JSON stock_qty is only the seed. Orders decrement this table.
-- CHECK (qty >= 0) makes an oversell fail the statement so the order batch rolls back.
CREATE TABLE IF NOT EXISTS stock (
  part_number TEXT PRIMARY KEY,
  qty INTEGER NOT NULL CHECK (qty >= 0)
);

-- One row. A missing part makes the guard subquery NULL, and NOT NULL fails the batch.
CREATE TABLE IF NOT EXISTS stock_guard (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  ok INTEGER NOT NULL CHECK (ok = 1)
);

INSERT OR IGNORE INTO stock_guard (id, ok) VALUES (1, 1);

-- Seeded once from the catalog counts. A later apply does not reset a live count.
INSERT OR IGNORE INTO stock (part_number, qty) VALUES
  ('AMS1117-3.3', 80),
  ('ARDUINO-NANO', 12),
  ('DS18B20', 24),
  ('ESP32-WROOM-32D', 9),
  ('HC-SR04', 18),
  ('LM2596S', 16),
  ('LM7805', 48),
  ('NE555', 60),
  ('SRD-05VDC-SL-C', 14),
  ('TCRT5000', 30);

-- Field Web Vitals. No buyer name, phone, address, or order id.
CREATE TABLE IF NOT EXISTS web_vitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (name IN ('LCP', 'INP', 'CLS')),
  value REAL NOT NULL CHECK (value >= 0 AND value <= 60000),
  rating TEXT NOT NULL CHECK (rating IN ('good', 'needs-improvement', 'poor')),
  within_budget INTEGER NOT NULL CHECK (within_budget IN (0, 1)),
  path TEXT NOT NULL CHECK (length(path) BETWEEN 1 AND 80),
  recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
