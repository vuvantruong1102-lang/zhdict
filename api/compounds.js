// POST { word } -> { compounds: [{ word, pinyin, vi }], version }
import { chatJSON, isChinese } from "./_lib/openai.js";
const SCHEMA_VERSION = 1;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const word = (req.body?.word || "").trim();
  if (!isChinese(word)) return res.status(400).json({ error: "invalid_word" });
  try {
    const payload = await chatJSON({
      temperature: 0.3,
      system: "Bạn là từ điển tiếng Trung cho người Việt. Chỉ trả JSON, không thêm chữ nào khác.",
      user:
        `Liệt kê 5 từ ghép / cụm từ thường gặp NHẤT có chứa "${word}" (ưu tiên thông dụng đời sống & HSK).\n` +
        `Mỗi mục: từ ghép chữ Hán (word), pinyin có dấu thanh (pinyin), nghĩa tiếng Việt ngắn gọn (vi).\n` +
        `JSON: {"compounds":[{"word":"...","pinyin":"...","vi":"..."}]}`,
    });
    return res.status(200).json({
      compounds: Array.isArray(payload.compounds) ? payload.compounds.slice(0, 6) : [],
      version: SCHEMA_VERSION,
    });
  } catch (e) {
    console.error("compounds", e);
    return res.status(500).json({ error: "server_error" });
  }
}
