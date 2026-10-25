-- Live shelf counts for databases created before stock existed.
-- JSON stock_qty is only this seed. A later apply does not reset a live count.
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
