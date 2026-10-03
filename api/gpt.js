// POST { word } -> {
//   core_vi, core_note_vi,
//   collocations: [{ zh, pinyin, vi, note_vi?, examples:[{zh,pinyin,vi}]x2 }], // 4-8, cụm THẬT
//   structures:   [{ pattern, pinyin, vi, example_zh, example_pinyin, example_vi }], // 2-4
//   compare:      [{ word, pinyin, vi, diff_vi,
//                    collocations:[{zh,pinyin,vi}]x3,
//                    examples:[{zh,pinyin,vi}]x2 }],                 // 3
//   version
// }
import { chatJSON, isChinese } from "./_lib/openai.js";
const SCHEMA_VERSION = 8;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const word = (req.body?.word || "").trim();
  if (!isChinese(word)) return res.status(400).json({ error: "invalid_word" });
  try {
    const payload = await chatJSON({
      temperature: 0.6,
      system:
        "Bạn là giáo viên tiếng Trung bản ngữ, giàu kinh nghiệm dạy người Việt. " +
        "Nguyên tắc tối quan trọng: CHỈ đưa ra các cụm (collocation) và câu mà người Trung Quốc THẬT SỰ dùng trong đời sống, " +
        "báo chí, học thuật hoặc hội thoại. TUYỆT ĐỐI KHÔNG bịa cụm bằng cách ghép máy móc từ đang tra với một danh từ bất kỳ. " +
        "Thà đưa ít cụm mà chuẩn và đắt, còn hơn nhiều cụm mà gượng ép hoặc không ai dùng. " +
        "Câu ví dụ phải tự nhiên như người bản xứ nói, lấy từ tình huống đời thường (hội thoại, công việc, tin tức, mua sắm, gia đình, học thuật). " +
        "Chỉ trả JSON, không thêm chữ nào khác.",
      user:
        `Phân tích từ/cụm tiếng Trung "${word}" cho người Việt học tiếng Trung. Trả JSON với các khóa:\n\n` +
        `1. "core_vi": nghĩa cốt lõi, liệt kê các nét nghĩa chính ngăn cách bằng " / ".\n` +
        `2. "core_note_vi": 2-4 câu giải thích sâu sắc thái, cách dùng đặc trưng, đối chiếu với từ dễ nhầm nếu có.\n` +
        `3. "collocations": ÍT NHẤT 5 collocation / kết cấu (lý tưởng 5-8) QUAN TRỌNG và THẬT SỰ phổ biến nhất với "${word}", xếp từ hay gặp nhất. ` +
        `Tất cả phải là cụm người bản xứ dùng thật trong thực tế — KHÔNG bịa cụm ghép máy móc để cho đủ số. ` +
        `Hãy khai thác đủ các dạng (cụm động từ, kết cấu ngữ pháp, biến thể, mẫu cố định) để đạt tối thiểu 5 cụm chất lượng. ` +
        `Collocation KHÔNG nhất thiết phải chứa nguyên chữ "${word}" ghép với danh từ: nó có thể là cụm động từ, kết cấu ngữ pháp, ` +
        `dạng biến thể hoặc mẫu cố định mà "${word}" tham gia (ví dụ với 奠基 thì cụm quan trọng nhất là động từ 奠定……基础, ` +
        `rồi các kết cấu ……的奠基人, 奠基之作, 奠基性+danh từ, 奠基仪式). ` +
        `MỖI collocation kèm ĐÚNG 2 câu ví dụ đời thường, mỗi câu một tình huống khác nhau. Phần tử: ` +
        `{"zh"(cụm/kết cấu chữ Hán),"pinyin","vi"(nghĩa cụm),"note_vi"(tùy chọn: 1 câu ghi chú ngắn về sắc thái/ngữ cảnh nếu cần, không thì để ""),` +
        `"examples":[đúng 2 phần tử {"zh","pinyin"(có dấu thanh),"vi"}]}.\n` +
        `4. "structures": đúng 4 cấu trúc/mẫu câu cố định mà người bản xứ HAY DÙNG NHẤT, đáng thuộc nguyên khối, MỖI CẤU TRÚC kèm 1 ví dụ đời thường. ` +
        `Phần tử: {"pattern"(mẫu chữ Hán, có thể chèn A/B/.../Adj),"pinyin","vi"(giải thích cách dùng),"example_zh","example_pinyin","example_vi"}.\n` +
        `5. "compare": đúng 4 từ gần nghĩa nhất với "${word}". Mỗi phần tử: ` +
        `{"word","pinyin","vi"(nghĩa chính ngắn),"diff_vi"(2-3 câu phân biệt rõ với "${word}" và góc nhìn riêng),` +
        `"collocations":[đúng 3 phần tử {"zh","pinyin","vi"}],"examples":[đúng 2 phần tử {"zh","pinyin","vi"} đời thường]}.\n\n` +
        `Chất lượng quan trọng hơn số lượng. Chỉ trả JSON đúng cấu trúc.`,
    });

    const arr = (x) => (Array.isArray(x) ? x : []);
    const colls = arr(payload.collocations).slice(0, 8).map((c) => ({
      zh: c.zh || "",
      pinyin: c.pinyin || "",
      vi: c.vi || "",
      note_vi: c.note_vi || "",
      examples: arr(c.examples).slice(0, 2),
    }));
    const cmp = arr(payload.compare).slice(0, 4).map((c) => ({
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
      collocations: colls,
      structures: arr(payload.structures).slice(0, 4),
      compare: cmp,
      version: SCHEMA_VERSION,
    });
  } catch (e) {
    console.error("gpt", e);
    return res.status(500).json({ error: "server_error" });
  }
}
