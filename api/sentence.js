// POST { text } -> {
//   tokens:[{token,pinyin,meaning_vi,role}],   // dòng tô màu phía dưới
//   segments:[{text,type}],                    // câu gốc nhóm theo cụm nghĩa (chunking)
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
        `2) "segments": viết lại ĐÚNG câu gốc nhưng CHIA THÀNH CÁC CỤM NGHĨA (chunking) để dễ đọc dễ nhớ. ` +
        `Mỗi phần tử {"text"(phần chữ Hán liền nhau),"type"}. Nối liền tất cả "text" lại phải ra ĐÚNG câu gốc, kể cả dấu câu. ` +
        `"type" ∈ {"chunk","frame","plain","punct"}: ` +
        `"chunk" = một cụm nghĩa hoàn chỉnh (ví dụ "太平洋两岸的工厂" = các nhà máy ở hai bờ Thái Bình Dương); ` +
        `"frame" = từ/cặp từ thuộc khung cấu trúc ngữ pháp cố định cần làm nổi bật ` +
        `(ví dụ 因为…所以, 不但…而且, 把, 被, 是…的, 对…来说, 均/都, 虽然…但是 — đánh dấu CHÍNH các từ khung này); ` +
        `"punct" = dấu câu; "plain" = phần còn lại không thuộc nhóm nào. ` +
        `Ưu tiên: nếu một phần vừa là khung vừa trong cụm, tách từ khung ra thành "frame" riêng. ` +
        `Chia hợp lý, mỗi "chunk" là một khối có nghĩa, không chia quá vụn.\n\n` +
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
