-- For an Orders table created before destination existed. Run once.
-- A new database from schema.sql already has this column.
ALTER TABLE Orders ADD COLUMN destination TEXT;
