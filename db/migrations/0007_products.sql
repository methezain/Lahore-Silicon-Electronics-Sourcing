-- Products live in D1. `data` is the full record as JSON, validated by src/lib/admin/product-schema.ts.
-- Quantity stays in `stock`; `products` holds no count. Forward-only.
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

ALTER TABLE stock ADD COLUMN restock_on TEXT;
