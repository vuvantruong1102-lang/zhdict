// POST { word } -> {
//   core_vi, core_note_vi,
//   examples: [{ zh, pinyin, vi, collocation }],       // 6
//   collocations: [{ zh, pinyin, vi }],                // 6
//   structures: [{ pattern, pinyin, vi, example_zh }], // 3
//   compare: [{ word, pinyin, vi, diff_vi }],          // 3
//   version
// }
import { chatJSON, isChinese } from "./_lib/openai.js";
const SCHEMA_VERSION = 1;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const word = (req.body?.word || "").trim();
  if (!isChinese(word)) return res.status(400).json({ error: "invalid_word" });
  try {
    const payload = await chatJSON({
      temperature: 0.5,
      system:
        "Bạn là giáo viên tiếng Trung giàu kinh nghiệm, dạy người Việt. " +
        "Giải thích chính xác, tự nhiên, thực dụng. Chỉ trả JSON, không thêm chữ nào khác.",
      user:
        `Phân tích từ tiếng Trung "${word}" cho người Việt học tiếng Trung. Trả về JSON với các khóa sau:\n\n` +
        `1. "core_vi": nghĩa cốt lõi của từ, ngắn gọn 1 câu (ví dụ: "xuất hiện công khai / ra mắt / lộ diện / trình làng").\n` +
        `2. "core_note_vi": 1-2 câu giải thích sắc thái, cách dùng đặc trưng, phân biệt với nghĩa đen nếu có.\n` +
        `3. "examples": đúng 6 câu ví dụ, MỖI CÂU dùng một collocation / ngữ cảnh KHÁC NHAU. Mỗi phần tử: {"zh": câu chữ Hán, "pinyin": pinyin có dấu thanh, "vi": dịch tiếng Việt, "collocation": cụm/ngữ cảnh được minh họa}.\n` +
        `4. "collocations": đúng 6 collocation (cụm kết hợp) phổ biến nhất với từ này. Mỗi phần tử: {"zh": cụm chữ Hán, "pinyin": pinyin, "vi": nghĩa tiếng Việt}.\n` +
        `5. "structures": đúng 3 cấu trúc / mẫu câu thường gặp với từ này. Mỗi phần tử: {"pattern": mẫu cấu trúc bằng chữ Hán (có thể chèn ..., A, B), "pinyin": pinyin của mẫu, "vi": giải thích cách dùng bằng tiếng Việt, "example_zh": một câu ví dụ ngắn áp dụng mẫu}.\n` +
        `6. "compare": đúng 3 từ gần nghĩa nhất, phân biệt với "${word}". Mỗi phần tử: {"word": từ gần nghĩa (chữ Hán), "pinyin": pinyin, "vi": nghĩa ngắn, "diff_vi": điểm khác biệt chính so với "${word}" bằng tiếng Việt}.\n\n` +
        `Nếu từ quá đơn giản hoặc không đủ dữ liệu cho mục nào, vẫn cố gắng điền đầy đủ số lượng yêu cầu bằng các trường hợp sát nhất. Chỉ trả JSON đúng cấu trúc trên.`,
    });

    const arr = (x) => (Array.isArray(x) ? x : []);
    return res.status(200).json({
      core_vi: payload.core_vi || "",
      core_note_vi: payload.core_note_vi || "",
      examples: arr(payload.examples).slice(0, 6),
      collocations: arr(payload.collocations).slice(0, 6),
      structures: arr(payload.structures).slice(0, 3),
      compare: arr(payload.compare).slice(0, 3),
      version: SCHEMA_VERSION,
    });
  } catch (e) {
    console.error("gpt", e);
    return res.status(500).json({ error: "server_error" });
  }
}
