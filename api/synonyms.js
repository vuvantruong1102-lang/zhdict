// POST { word } -> { word, synonyms: [{ word, pinyin, meaning_vi, note_vi }] }
import { chatJSON, isChinese } from "./_lib/openai.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const word = (req.body?.word || "").trim();
  if (!isChinese(word)) return res.status(400).json({ error: "invalid_word" });

  try {
    const data = await chatJSON({
      system: "Bạn là chuyên gia từ vựng tiếng Trung. Chỉ trả về JSON.",
      user:
        `Liệt kê các từ đồng nghĩa và gần nghĩa của "${word}" (tối đa 6 từ). ` +
        `Với mỗi từ nêu khác biệt sắc thái/ngữ cảnh. JSON:\n` +
        `{"synonyms":[{"word":"chữ Hán","pinyin":"","meaning_vi":"nghĩa","note_vi":"khác biệt so với từ gốc"}]}`,
    });
    return res.status(200).json({ word, ...data });
  } catch (e) {
    console.error("synonyms", e);
    return res.status(500).json({ error: "server_error" });
  }
}
