// POST { text } -> { tokens[], translation_vi, translation_literal_vi? }
// Dán câu tiếng Trung -> tách từ + pinyin + nghĩa, và bản dịch mượt tiếng Việt.
import { chatJSON, isChinese } from "./_lib/openai.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const text = (req.body?.text || "").trim();
  if (!isChinese(text)) return res.status(400).json({ error: "invalid_text" });

  try {
    const data = await chatJSON({
      temperature: 0.4,
      system:
        "Bạn là biên dịch viên Trung–Việt chuyên nghiệp, đồng thời là giáo viên tiếng Trung cho người Việt. " +
        "Bản dịch phải MƯỢT và TỰ NHIÊN như người Việt bản xứ viết, dịch THOÁT Ý theo văn phong tiếng Việt chứ không dịch bám từng chữ. " +
        "Dùng từ ngữ đắt, đúng sắc thái (ví dụ 精華地段 → 'vị trí đắc địa' chứ không phải 'địa điểm tinh hoa'). " +
        "Xử lý đúng tên riêng, địa danh, cách gọi tắt và thuật ngữ theo cách người Việt quen dùng " +
        "(ví dụ 雙北 là cách gọi gộp Đài Bắc và Tân Bắc → dịch 'khu vực Đài Bắc – Tân Bắc', KHÔNG phiên âm máy móc thành 'Song Bắc'). " +
        "Chỉ trả về JSON.",
      user:
        `Phân tích và dịch câu tiếng Trung sau: "${text}".\n` +
        `1) Tách câu thành các từ/cụm từ theo đúng cách tách từ tiếng Trung, mỗi từ kèm pinyin (có dấu thanh) và nghĩa tiếng Việt ngắn gọn.\n` +
        `2) "translation_vi": dịch cả câu sang tiếng Việt MƯỢT, tự nhiên, thoát ý, đúng văn phong người Việt.\n` +
        `3) "translation_literal_vi": một bản dịch sát nghĩa từng cụm (để người học đối chiếu), ngắn gọn.\n` +
        `JSON:\n` +
        `{"tokens":[{"token":"","pinyin":"","meaning_vi":""}],"translation_vi":"","translation_literal_vi":""}`,
    });
    return res.status(200).json({ text, ...data });
  } catch (e) {
    console.error("sentence", e);
    return res.status(500).json({ error: "server_error" });
  }
}
