// POST { word } -> {
//   core_vi, core_note_vi,
//   examples:     [{ zh, pinyin, vi, collocation }],                 // 6
//   collocations: [{ zh, pinyin, vi }],                              // 6
//   structures:   [{ pattern, pinyin, vi, example_zh, example_pinyin, example_vi }], // 3
//   compare:      [{ word, pinyin, vi, diff_vi,
//                    collocations:[{zh,pinyin,vi}]x3,
//                    examples:[{zh,pinyin,vi}]x2 }],                 // 3
//   version
// }
import { chatJSON, isChinese } from "./_lib/openai.js";
const SCHEMA_VERSION = 2;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const word = (req.body?.word || "").trim();
  if (!isChinese(word)) return res.status(400).json({ error: "invalid_word" });
  try {
    const payload = await chatJSON({
      temperature: 0.5,
      system:
        "Bạn là giáo viên tiếng Trung giàu kinh nghiệm, dạy người Việt. " +
        "Giải thích chính xác, tự nhiên, thực dụng, có chiều sâu. Chỉ trả JSON, không thêm chữ nào khác.",
      user:
        `Phân tích từ tiếng Trung "${word}" cho người Việt học tiếng Trung. Trả JSON với các khóa:\n\n` +
        `1. "core_vi": nghĩa cốt lõi, liệt kê các nét nghĩa chính ngăn cách bằng " / " ` +
        `(ví dụ với 亮相: "xuất hiện công khai / ra mắt / lộ diện / trình làng").\n` +
        `2. "core_note_vi": 2-4 câu giải thích sâu sắc thái và cách dùng đặc trưng, có đối chiếu với từ dễ nhầm nếu có ` +
        `(ví dụ: "Nó không đơn thuần là 出现 – xuất hiện, mà thường hàm ý xuất hiện trước công chúng để mọi người nhìn thấy, chú ý hoặc đánh giá.").\n` +
        `3. "examples": đúng 6 câu ví dụ, mỗi câu một collocation/ngữ cảnh KHÁC NHAU. Phần tử: {"zh","pinyin"(có dấu thanh),"vi","collocation"}.\n` +
        `4. "collocations": đúng 6 collocation phổ biến nhất. Phần tử: {"zh","pinyin","vi"}.\n` +
        `5. "structures": đúng 3 cấu trúc/mẫu câu thường gặp, MỖI CẤU TRÚC kèm 1 ví dụ. ` +
        `Phần tử: {"pattern"(mẫu chữ Hán),"pinyin","vi"(giải thích cách dùng),"example_zh","example_pinyin","example_vi"}.\n` +
        `6. "compare": đúng 3 từ gần nghĩa nhất với "${word}". Mỗi phần tử: ` +
        `{"word","pinyin","vi"(nghĩa chính ngắn),"diff_vi"(2-3 câu phân biệt rõ với "${word}" và góc nhìn riêng của từ này),` +
        `"collocations":[đúng 3 phần tử {"zh","pinyin","vi"}],"examples":[đúng 2 phần tử {"zh","pinyin","vi"}]}.\n\n` +
        `Luôn điền đủ số lượng yêu cầu. Chỉ trả JSON đúng cấu trúc.`,
    });

    const arr = (x) => (Array.isArray(x) ? x : []);
    const cmp = arr(payload.compare).slice(0, 3).map((c) => ({
      word: c.word || "",
      pinyin: c.pinyin || "",
      vi: c.vi || "",
      diff_vi: c.diff_vi || "",
      collocations: arr(c.collocations).slice(0, 3),
      examples: arr(c.examples).slice(0, 2),
    }));

    return res.status(200).json({
      core_vi: payload.core_vi || "",
      core_note_vi: payload.core_note_vi || "",
      examples: arr(payload.examples).slice(0, 6),
      collocations: arr(payload.collocations).slice(0, 6),
      structures: arr(payload.structures).slice(0, 3),
      compare: cmp,
      version: SCHEMA_VERSION,
    });
  } catch (e) {
    console.error("gpt", e);
    return res.status(500).json({ error: "server_error" });
  }
}
