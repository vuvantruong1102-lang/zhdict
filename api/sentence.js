// POST { text } -> { tokens[{token,pinyin,meaning_vi,role}], translation_vi }
// Dán câu tiếng Trung -> tách từ + pinyin + vai trò ngữ pháp, và bản dịch mượt tiếng Việt.
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
        "Dùng từ ngữ đắt, đúng sắc thái. Xử lý đúng tên riêng, địa danh, cách gọi tắt, thuật ngữ theo cách người Việt quen dùng " +
        "(ví dụ 雙北 → 'khu vực Đài Bắc – Tân Bắc', không phiên âm máy móc). " +
        "Chỉ trả về JSON.",
      user:
        `Phân tích và dịch câu tiếng Trung sau: "${text}".\n` +
        `1) "tokens": tách câu thành các từ/cụm từ theo đúng cách tách từ tiếng Trung. Mỗi phần tử: ` +
        `{"token"(chữ Hán),"pinyin"(có dấu thanh),"meaning_vi"(nghĩa ngắn),"role"(vai trò ngữ pháp trong câu)}.\n` +
        `   "role" chỉ nhận MỘT trong các giá trị sau (viết thường, không dấu): ` +
        `"subject" (chủ ngữ), "verb" (động từ/vị ngữ chính), "object" (tân ngữ), ` +
        `"attributive" (định ngữ/bổ nghĩa cho danh từ), "adverbial" (trạng ngữ/bổ nghĩa cho động từ), ` +
        `"conjunction" (liên từ/giới từ/trợ từ), "other" (còn lại). ` +
        `Hãy gán role chính xác theo chức năng trong câu, không đoán bừa.\n` +
        `2) "translation_vi": dịch cả câu sang tiếng Việt MƯỢT, tự nhiên, thoát ý, đúng văn phong người Việt.\n` +
        `JSON: {"tokens":[{"token":"","pinyin":"","meaning_vi":"","role":""}],"translation_vi":""}`,
    });
    return res.status(200).json({ text, ...data });
  } catch (e) {
    console.error("sentence", e);
    return res.status(500).json({ error: "server_error" });
  }
}
