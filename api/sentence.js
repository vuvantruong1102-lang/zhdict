// POST { text } -> {
//   tokens:[{token,pinyin,meaning_vi,role}],   // dòng tô màu phía dưới
//   segments:[{text,type}],                    // câu gốc nhóm theo cụm nghĩa (đọc cho xuôi)
//   translation_vi
// }
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
        "Bản dịch phải MƯỢT, TỰ NHIÊN, thoát ý theo văn phong tiếng Việt, dùng từ đắt, xử lý đúng tên riêng/cách gọi tắt. " +
        "Chỉ trả về JSON.",
      user:
        `Phân tích và dịch câu tiếng Trung sau: "${text}".\n\n` +
        `1) "tokens": tách câu thành các từ/cụm theo cách tách từ tiếng Trung. Mỗi phần tử ` +
        `{"token"(chữ Hán),"pinyin"(có dấu thanh),"meaning_vi"(nghĩa ngắn),"role"}. ` +
        `"role" ∈ {"subject","verb","object","attributive","adverbial","conjunction","other"} theo chức năng trong câu. ` +
        `GIỮ nguyên các dấu câu (。，、；：？！""''…—) thành token riêng với role="other".\n\n` +
        `2) "segments": viết lại ĐÚNG câu gốc, chia thành các CỤM để ĐỌC CHO XUÔI, dễ hiểu dễ nhớ (gộp thành cụm to hợp lý, không chia quá vụn). ` +
        `Nối liền tất cả "text" lại phải ra ĐÚNG câu gốc, kể cả dấu câu. Mỗi phần tử {"text","type"}. ` +
        `"type" ∈ {"chunk","proper","frame","conj","punct","plain"}:\n` +
        `   - "proper" = TÊN RIÊNG (tên người, địa danh, tổ chức, thương hiệu...). Ví dụ 特朗普, 美国, 白宫, 乔·拜登.\n` +
        `   - "frame" = một KẾT CẤU NGỮ PHÁP cố định mà các thành phần đứng CÁCH XA nhau ôm lấy nội dung ở giữa ` +
        `(ví dụ 在...之下, 把...V, 被...V, 是...的, 不但...而且, 因为...所以, 对...来说). ` +
        `Khi gặp loại này, GỘP TOÀN BỘ kết cấu + phần ở giữa thành MỘT segment "frame" duy nhất, viết liền ` +
        `(ví dụ "在危险的病毒之下" là một "frame").\n` +
        `   - "conj" = liên từ/từ nối đứng riêng (和, 与, 及, 并, 而, 或, 跟...).\n` +
        `   - "punct" = dấu câu.\n` +
        `   - "chunk" = một cụm nghĩa thông thường để đọc cho xuôi.\n` +
        `   - "plain" = phần còn lại không thuộc nhóm nào.\n` +
        `Ưu tiên gộp "đọc cho xuôi" cho các cụm thường; nhưng tên riêng luôn tách thành "proper", ` +
        `kết cấu khung cách xa luôn gộp thành "frame", liên từ nối luôn là "conj".\n\n` +
        `3) "translation_vi": dịch cả câu sang tiếng Việt mượt, tự nhiên, thoát ý.\n\n` +
        `JSON: {"tokens":[{"token":"","pinyin":"","meaning_vi":"","role":""}],` +
        `"segments":[{"text":"","type":""}],"translation_vi":""}`,
    });
    return res.status(200).json({ text, ...data });
  } catch (e) {
    console.error("sentence", e);
    return res.status(500).json({ error: "server_error" });
  }
}
