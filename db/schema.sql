DROP TABLE IF EXISTS Orders;

CREATE TABLE Orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  items_json TEXT NOT NULL,
  total_price INTEGER NOT NULL,
  payment_ref TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
