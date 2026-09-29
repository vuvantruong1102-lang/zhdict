// POST { text } -> { translation_vi, tokens[], explanation_vi, new_words[] }
// Dịch đoạn tiếng Anh sang tiếng Việt + tách nghĩa từng từ/cụm từ. Dùng AI.
import { chatJSON } from "./_lib/openai.js";

const hasLatin = (s) => /[a-zA-Z]/.test(s || "");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const text = (req.body?.text || "").trim();
  if (!hasLatin(text)) return res.status(400).json({ error: "invalid_text" });

  try {
    const data = await chatJSON({
      system: "Bạn là giáo viên tiếng Anh giàu kinh nghiệm dạy người Việt. Chỉ trả về JSON, không thêm chữ nào khác.",
      user:
        `Phân tích đoạn tiếng Anh sau cho người Việt học: "${text}".\n` +
        `1) Dịch cả đoạn sang tiếng Việt tự nhiên, sát nghĩa (translation_vi).\n` +
        `2) Tách thành các từ / cụm từ có nghĩa, ƯU TIÊN gộp thành cụm từ - phrasal verb - collocation - thành ngữ ` +
        `thay vì tách rời từng từ. Mỗi mục kèm: phiên âm IPA (ipa), từ loại viết tắt (pos: n, v, adj, adv, phr.v, idiom...), ` +
        `nghĩa tiếng Việt (meaning_vi).\n` +
        `3) Giải thích cấu trúc / ngữ pháp / điểm đáng chú ý nếu có (explanation_vi).\n` +
        `4) Liệt kê từ / cụm từ khó hoặc đáng học để lưu lại (new_words).\n` +
        `JSON: {"translation_vi":"","tokens":[{"token":"","ipa":"","pos":"","meaning_vi":""}],"explanation_vi":"","new_words":[{"word":"","ipa":"","meaning_vi":""}]}`,
    });
    return res.status(200).json({ text, ...data });
  } catch (e) {
    console.error("translate-en", e);
    return res.status(500).json({ error: "server_error" });
  }
}
