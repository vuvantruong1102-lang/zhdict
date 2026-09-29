// Usage:
//   1) Tải CC-CEDICT: https://www.mdbg.net/chinese/dictionary?page=cc-cedict
//      Download "CC-CEDICT (.txt)" -> giải nén được file cedict_ts.u8
//   2) Cài deps trong project: npm install @supabase/supabase-js dotenv
//   3) Chạy: 
//      SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/import-cedict.js path/to/cedict_ts.u8
//   * SUPABASE_SERVICE_KEY lấy ở Supabase > Project Settings > API > "service_role" key
//     (KHÔNG đẩy lên git, key này có quyền admin)

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
const file = process.argv[2];

if (!url || !key || !file) {
  console.error("Thiếu env. Usage:");
  console.error("  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/import-cedict.js path/to/cedict_ts.u8");
  process.exit(1);
}

const supabase = createClient(url, key);
const lines = readFileSync(file, "utf8").split("\n");
const entries = [];

for (const line of lines) {
  if (!line || line.startsWith("#")) continue;
  // Format CC-CEDICT: "Traditional Simplified [pinyin] /def1/def2/.../"
  const m = line.match(/^(\S+) (\S+) \[(.+?)\] \/(.+)\/$/);
  if (!m) continue;
  const [, traditional, simplified, pinyin, defsStr] = m;
  const definitions = defsStr.split("/").filter(Boolean);
  entries.push({ traditional, simplified, pinyin, definitions });
}

console.log(`Parsed ${entries.length} entries. Bắt đầu insert theo batch 1000...`);

const BATCH = 1000;
let done = 0;
for (let i = 0; i < entries.length; i += BATCH) {
  const batch = entries.slice(i, i + BATCH);
  const { error } = await supabase.from("zhnote_cedict").insert(batch);
  if (error) { console.error("Batch lỗi tại offset", i, ":", error.message); process.exit(1); }
  done += batch.length;
  process.stdout.write(`\r  Đã insert ${done} / ${entries.length}`);
}
console.log("\nXong! ✓");
