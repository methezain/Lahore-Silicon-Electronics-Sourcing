-- Product photos. Variants are stored as base64 WebP text in D1, so no extra service is needed.
-- Forward-only.
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
