CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO d1_migrations (name) VALUES
  ('0002_destination.sql'),
  ('0003_idempotency.sql'),
  ('0004_stock.sql'),
  ('0005_web_vitals.sql');
