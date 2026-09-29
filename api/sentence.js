// POST { text } -> { tokens[], translation_vi, explanation_vi, new_words[] }
// Dùng cho tính năng "Highlight & save": dán câu, tách từ + pinyin + giải thích.
import { chatJSON, isChinese } from "./_lib/openai.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const text = (req.body?.text || "").trim();
  if (!isChinese(text)) return res.status(400).json({ error: "invalid_text" });

  try {
    const data = await chatJSON({
      system: "Bạn là giáo viên tiếng Trung, phân tích câu cho người Việt học. Chỉ trả về JSON.",
      user:
        `Phân tích câu tiếng Trung sau: "${text}".\n` +
        `1) Tách câu thành các từ/cụm từ theo đúng cách tách từ tiếng Trung, mỗi từ kèm pinyin (có dấu thanh) và nghĩa tiếng Việt ngắn gọn.\n` +
        `2) Dịch cả câu sát nghĩa sang tiếng Việt.\n` +
        `JSON:\n` +
        `{"tokens":[{"token":"","pinyin":"","meaning_vi":""}],"translation_vi":""}`,
    });
    return res.status(200).json({ text, ...data });
  } catch (e) {
    console.error("sentence", e);
    return res.status(500).json({ error: "server_error" });
  }
}
