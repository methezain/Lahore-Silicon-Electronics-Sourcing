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
  idempotency_key TEXT,
  updated_at TEXT,
  admin_note TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS Orders_idempotency_key ON Orders (idempotency_key);
CREATE INDEX IF NOT EXISTS Orders_status_created ON Orders (status, created_at);

-- Live shelf counts. JSON stock_qty is only the seed. Orders decrement this table.
-- CHECK (qty >= 0) makes an oversell fail the statement so the order batch rolls back.
CREATE TABLE IF NOT EXISTS stock (
  part_number TEXT PRIMARY KEY,
  qty INTEGER NOT NULL CHECK (qty >= 0),
  restock_on TEXT
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

CREATE TABLE IF NOT EXISTS products (
  part_number TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS products_published ON products (published, sort_order, part_number);

CREATE TABLE IF NOT EXISTS media (
  key TEXT PRIMARY KEY,
  part_number TEXT,
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS media_files (
  key TEXT NOT NULL,
  width INTEGER NOT NULL CHECK (width IN (112, 640, 1024)),
  body TEXT NOT NULL,
  bytes INTEGER NOT NULL CHECK (bytes > 0),
  PRIMARY KEY (key, width)
);
