// POST { word } -> { core_vi, version }
// Nghĩa cốt lõi — giải thích ngắn gọn, cặn kẽ, tự tải ngay khi tra từ.
import { chatJSON, isChinese } from "./_lib/openai.js";
const SCHEMA_VERSION = 1;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const word = (req.body?.word || "").trim();
  if (!isChinese(word)) return res.status(400).json({ error: "invalid_word" });
  try {
    const data = await chatJSON({
      temperature: 0.4,
      system:
        "Bạn là giáo viên tiếng Trung giàu kinh nghiệm, dạy người Việt. " +
        "Giải thích nghĩa cốt lõi của từ một cách chính xác, cặn kẽ nhưng gọn, dễ hiểu. Chỉ trả JSON.",
      user:
        `Giải thích nghĩa cốt lõi của từ tiếng Trung "${word}" cho người Việt. ` +
        `Nêu các nét nghĩa chính và sắc thái/cách dùng đặc trưng, đối chiếu với từ dễ nhầm nếu có. ` +
        `Viết 2-4 câu tiếng Việt, tự nhiên. JSON: {"core_vi":"..."}`,
    });
    return res.status(200).json({ core_vi: data.core_vi || "", version: SCHEMA_VERSION });
  } catch (e) {
    console.error("core", e);
    return res.status(500).json({ error: "server_error" });
  }
}
