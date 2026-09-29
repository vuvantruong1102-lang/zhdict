// POST { word } -> { traditional, definition_en, cedict_pinyin, in_cedict }
// Tra TỨC THÌ từ CC-CEDICT (local DB). KHÔNG AI, KHÔNG scrape.
// Hán Việt giờ tính ở frontend bằng map nhúng sẵn -> không cần ở đây.
import { createClient } from "@supabase/supabase-js";
import { isChinese } from "./_lib/openai.js";

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const word = (req.body?.word || "").trim();
  if (!isChinese(word)) return res.status(400).json({ error: "invalid_word" });

  try {
    let hits = [];
    try {
      const { data } = await sb.from("zhnote_cedict")
        .select("traditional, simplified, pinyin, definition")
        .or(`simplified.eq."${word}",traditional.eq."${word}"`)
        .limit(6);
      hits = data || [];
    } catch (e) { hits = []; }

    const inCedict = hits.length > 0;
    let traditional = null, definition_en = null, cedict_pinyin = null;
    if (inCedict) {
      traditional = hits[0].traditional;
      cedict_pinyin = hits[0].pinyin;
      definition_en = hits.map((e) => `[${e.pinyin}] ${e.definition}`).join("\n");
    }

    return res.status(200).json({ traditional, definition_en, cedict_pinyin, in_cedict: inCedict });
  } catch (e) {
    console.error("lookup", e);
    return res.status(500).json({ error: "server_error" });
  }
}
