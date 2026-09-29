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
      temperature: 0.3,
      system: "Bạn là giáo viên tiếng Trung tận tâm, trả lời NGẮN GỌN, rõ ràng bằng tiếng Việt cho người Việt đang học. " +
        "Nếu có ngữ cảnh (từ/câu) thì bám vào đó. Chỉ trả JSON.",
      user: `NGỮ CẢNH (từ/câu đang xem): ${context || "(không có)"}\n\n` +
        `CÂU HỎI: ${question}\n\nTrả lời bằng tiếng Việt. JSON: {"answer":"..."}`,
    });
    return res.status(200).json({ answer: data.answer || "" });
  } catch (e) {
    console.error("ask", e);
    return res.status(500).json({ error: "server_error" });
  }
}
