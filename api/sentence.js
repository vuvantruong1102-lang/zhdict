// POST { text } -> {
//   chunks: [{ tokens:[{hz,pinyin,meaning_vi,hl}] }],   hl ∈ {"entity","logic","particle",""}
//   translation_vi
// }
import { chatJSON, isChinese } from "./_lib/openai.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const text = (req.body?.text || "").trim();
  if (!isChinese(text)) return res.status(400).json({ error: "invalid_text" });

  try {
    const data = await chatJSON({
      temperature: 0.3,
      system:
        "Bạn là biên dịch viên Trung–Việt chuyên nghiệp kiêm giáo viên tiếng Trung cho người Việt. " +
        "Dịch MƯỢT, tự nhiên, thoát ý; xử lý đúng tên riêng. " +
        "Khi highlight từ, tuân thủ NGHIÊM NGẶT quy tắc được cho, ưu tiên độ chính xác hơn số lượng, không chắc thì không highlight. " +
        "Chỉ trả JSON.",
      user:
        `Phân tích và dịch câu tiếng Trung: "${text}".\n\n` +
        `Trả JSON {"chunks":[...],"translation_vi":"..."}.\n\n` +
        `A) "chunks": chia ĐÚNG câu gốc thành các cụm để đọc cho xuôi (gộp cụm hợp lý). ` +
        `Nối liền toàn bộ "hz" của mọi token theo thứ tự phải ra ĐÚNG câu gốc, KỂ CẢ dấu câu. ` +
        `Mỗi chunk = {"tokens":[...]}. Mỗi token = {"hz","pinyin"(có dấu thanh; "" nếu là dấu câu/số/chữ Latin),"meaning_vi","hl"}.\n\n` +
        `B) "hl" = nhãn highlight, CHỈ nhận 1 trong 4 giá trị: "entity", "logic", "particle", "" (rỗng = không highlight). ` +
        `Phân tích câu và CHỈ highlight những từ thuộc đúng 3 nhóm sau; TẤT CẢ từ khác để "".\n\n` +
        `1. "entity" — TÊN RIÊNG. Gồm: tên người Trung Quốc (马云, 鲁迅, 李白); ` +
        `tên người nước ngoài phiên âm (爱因斯坦, 莎士比亚, 埃隆·马斯克, 特朗普); ` +
        `tên quốc gia (中国, 美国, 法国, 德国). ` +
        `Highlight TOÀN BỘ tên như một đơn vị: nếu tên gồm nhiều token liền nhau, gán "entity" cho TẤT CẢ các token đó. ` +
        `KHÔNG highlight đại từ (我,你,他), KHÔNG highlight chức danh đứng riêng (老师,医生,主席), ` +
        `KHÔNG highlight tên thành phố/địa danh thường hay năm tháng số liệu (北京, 会议, 1989年, 上 đều KHÔNG phải entity).\n\n` +
        `2. "logic" — TỪ NỐI LOGIC có vai trò rõ ràng về quan hệ giữa các mệnh đề. Gồm: ` +
        `nhân quả (因为,所以,因此,由于,于是,从而); đối lập/nhượng bộ (但是,但,可是,然而,不过,虽然,尽管,却); ` +
        `bổ sung/tăng tiến (而且,并且,甚至,不仅,不但); điều kiện (如果,要是,只要,除非,否则); ` +
        `lựa chọn (或者,还是,要么); trình tự/chuyển ý (然后,接着,首先,其次,最后); ` +
        `và các cặp (因为…所以, 虽然…但是, 如果…就, 只要…就, 不仅…而且, 不但…还, 要么…要么, 与其…不如) — gán "logic" cho từng thành phần. ` +
        `就/还/也/却/才 CHỈ gán "logic" khi rõ ràng là một phần của cấu trúc/quan hệ logic; phó từ thường thì KHÔNG.\n\n` +
        `3. "particle" — TRỢ TỪ NGỮ PHÁP: 的 地 得 了 着 过. ` +
        `CHỈ gán khi ký tự thực sự làm chức năng trợ từ (漂亮的女孩→的; 慢慢地走→地; 说得很好→得; 我吃了饭→了). ` +
        `TUYỆT ĐỐI KHÔNG tách các ký tự này ra khỏi một từ hoàn chỉnh chứa chúng ` +
        `(了解, 得到, 地方, 过去, 着急... phải là MỘT token "" nguyên vẹn, KHÔNG gán particle).\n\n` +
        `NGUYÊN TẮC: ưu tiên độ chính xác; không chắc thì "". Không highlight danh/động/tính/phó từ thường. ` +
        `Không cố gán nhãn cho mọi từ. Giữ nguyên text gốc.\n\n` +
        `C) "translation_vi": dịch cả câu sang tiếng Việt mượt, tự nhiên.`,
    });
    return res.status(200).json({ text, ...data });
  } catch (e) {
    console.error("sentence", e);
    return res.status(500).json({ error: "server_error" });
  }
}
