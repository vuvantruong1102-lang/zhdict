// POST { text } -> {
//   chunks: [{ type, tokens:[{hz,pinyin,meaning_vi,emphasis}] }],
//   translation_vi
// }
// Câu gốc chia theo cụm nghĩa (đọc cho xuôi). Mỗi chunk gồm các token (chữ+pinyin),
// token ngữ pháp của kết cấu cách xa (在...之下) có emphasis=true để in đậm.
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
        `Trả JSON {"chunks":[...],"translation_vi":"..."}.\n\n` +
        `"chunks": chia ĐÚNG câu gốc thành các CỤM để ĐỌC CHO XUÔI (gộp cụm to hợp lý, không chia vụn). ` +
        `Nối liền tất cả chữ Hán của mọi token theo thứ tự phải ra ĐÚNG câu gốc, KỂ CẢ dấu câu. ` +
        `Mỗi chunk = {"type","tokens":[...]}.\n` +
        `  - "type" ∈ {"normal","proper","conj","punct"}: ` +
        `"proper" = cụm là TÊN RIÊNG. BẮT BUỘC đánh dấu "proper" cho MỌI tên riêng, không được bỏ sót: ` +
        `tên người (特朗普=Trump, 拜登=Biden, 习近平, 马斯克=Musk...), ` +
        `tên quốc gia/địa danh (美国, 中国, 北京, 台湾, 纽约...), ` +
        `tên tổ chức/cơ quan (白宫, 联合国, 国会...), ` +
        `tên thương hiệu/sản phẩm (苹果, 华为...), ` +
        `và tên viết bằng CHỮ LATIN/VIẾT TẮT (NASA, GDP, iPhone, AI, CEO...). ` +
        `Mỗi tên riêng là MỘT chunk "proper" riêng. Hãy rà kỹ cả câu để không sót tên nào; ` +
        `"conj" = cụm là liên từ/từ nối đứng riêng (和, 与, 及, 并, 而, 或, 跟); ` +
        `"punct" = cụm là dấu câu; "normal" = cụm nghĩa thường.\n` +
        `  - "tokens": tách cụm thành từng từ tiếng Trung. Mỗi token = ` +
        `{"hz"(chữ Hán của từ),"pinyin"(pinyin có dấu thanh; để "" nếu là dấu câu),"meaning_vi"(nghĩa ngắn),"emphasis"(true/false)}.\n` +
        `  - "emphasis": đặt true CHỈ cho những từ ngữ pháp thuộc một KẾT CẤU cố định mà hai thành phần đứng CÁCH XA nhau ` +
        `(ví dụ 在...之下 thì chỉ 在 và 之下 có emphasis=true, phần giữa 危险的病毒 emphasis=false; ` +
        `tương tự 把, 被, 是...的, 不但...而且, 因为...所以, 对...来说 — chỉ các TỪ KHUNG mới emphasis=true). ` +
        `Các từ còn lại emphasis=false.\n\n` +
        `"translation_vi": dịch cả câu sang tiếng Việt mượt, tự nhiên, thoát ý.`,
    });
    return res.status(200).json({ text, ...data });
  } catch (e) {
    console.error("sentence", e);
    return res.status(500).json({ error: "server_error" });
  }
}
