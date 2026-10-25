-- For an Orders table created before the idempotency key. Run once.
-- A new database from schema.sql already has this column and index.
-- SQLite cannot add a UNIQUE column with ALTER TABLE, so the uniqueness is an index.
ALTER TABLE Orders ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS Orders_idempotency_key ON Orders (idempotency_key);
