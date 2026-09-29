-- Tạo bảng tra từ Hán-Anh CC-CEDICT (~130K dòng, public read)
CREATE TABLE IF NOT EXISTS zhnote_cedict (
  id BIGSERIAL PRIMARY KEY,
  traditional TEXT NOT NULL,
  simplified TEXT NOT NULL,
  pinyin TEXT NOT NULL,
  definitions TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS zhnote_cedict_simplified_idx  ON zhnote_cedict (simplified);
CREATE INDEX IF NOT EXISTS zhnote_cedict_traditional_idx ON zhnote_cedict (traditional);

-- Public read: ai cũng đọc được (dictionary chung)
ALTER TABLE zhnote_cedict ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cedict_public_read ON zhnote_cedict;
CREATE POLICY cedict_public_read ON zhnote_cedict FOR SELECT USING (true);
