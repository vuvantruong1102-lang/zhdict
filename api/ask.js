// POST { question, context } -> { answer }
// Hỏi đáp tự do về một từ/câu tiếng Trung.
import { chatJSON } from "./_lib/openai.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const question = (req.body?.question || "").trim();
  const context = (req.body?.context || "").trim();
  if (!question) return res.status(400).json({ error: "empty_question" });
  try {
    const data = await chatJSON({
      temperature: 0.5,
      system:
        "Bạn là giáo viên tiếng Trung tận tâm, giàu kinh nghiệm, đang kèm riêng một người Việt học tiếng Trung. " +
        "Hãy trả lời CẶN KẼ, CHI TIẾT và DỄ HIỂU bằng tiếng Việt — giảng giải như đang dạy học, không trả lời hời hợt hay cụt lủn. " +
        "Nguyên tắc khi trả lời:\n" +
        "- Giải thích rõ BẢN CHẤT vấn đề, không chỉ kết luận. Nêu lý do TẠI SAO, phân tích sắc thái, ngữ cảnh, sự khác biệt.\n" +
        "- LUÔN kèm ít nhất 2-3 ví dụ minh họa (câu tiếng Trung + pinyin có dấu thanh + dịch tiếng Việt) để làm rõ ý.\n" +
        "- Khi so sánh/phân biệt từ, chỉ rõ từng từ hợp với tình huống nào, cho ví dụ đối chiếu đúng–sai nếu cần.\n" +
        "- Nếu liên quan ngữ pháp, nêu cấu trúc và cách dùng.\n" +
        "- Trình bày rõ ràng, có thể xuống dòng, gạch đầu dòng cho dễ đọc. Chữ Hán luôn kèm pinyin.\n" +
        "- Nếu có ngữ cảnh (từ/câu đang xem) thì bám sát vào đó. " +
        "Chỉ trả JSON.",
      user:
        `NGỮ CẢNH (từ/câu đang xem): ${context || "(không có)"}\n\n` +
        `CÂU HỎI: ${question}\n\n` +
        `Hãy trả lời thật chi tiết, cặn kẽ bằng tiếng Việt, kèm ví dụ minh họa. JSON: {"answer":"..."}`,
    });
    return res.status(200).json({ answer: data.answer || "" });
  } catch (e) {
    console.error("ask", e);
    return res.status(500).json({ error: "server_error" });
  }
}
