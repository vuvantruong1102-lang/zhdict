// POST { word } -> { examples: [{ zh, pinyin, vi }], version }
import { chatJSON, isChinese } from "./_lib/openai.js";
const SCHEMA_VERSION = 1;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const word = (req.body?.word || "").trim();
  if (!isChinese(word)) return res.status(400).json({ error: "invalid_word" });
  try {
    const payload = await chatJSON({
      temperature: 0.4,
      system: "Bạn là giáo viên tiếng Trung cho người Việt. Chỉ trả JSON, không thêm chữ nào khác.",
      user:
        `Đặt 5 câu ví dụ tiếng Trung có dùng từ "${word}", từ dễ đến khó, tự nhiên & thực dụng.\n` +
        `Mỗi câu gồm: câu chữ Hán (zh), pinyin có dấu thanh (pinyin), bản dịch tiếng Việt (vi).\n` +
        `JSON: {"examples":[{"zh":"...","pinyin":"...","vi":"..."}]}`,
    });
    return res.status(200).json({
      examples: Array.isArray(payload.examples) ? payload.examples.slice(0, 6) : [],
      version: SCHEMA_VERSION,
    });
  } catch (e) {
    console.error("examples", e);
    return res.status(500).json({ error: "server_error" });
  }
}
