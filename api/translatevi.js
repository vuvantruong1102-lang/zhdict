// POST { word, definition_en?, han_viet? } -> { han_viet, meaning_vi }
// Gọi AI dịch nghĩa sang tiếng Việt. Nếu có definition_en (từ CEDICT) thì
// dịch từ đó (chính xác hơn, rẻ hơn); không có thì AI tự sinh.
import { chatJSON, isChinese } from "./_lib/openai.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const word = (req.body?.word || "").trim();
  const defEn = (req.body?.definition_en || "").trim();
  const hvHint = (req.body?.han_viet || "").trim();
  if (!isChinese(word)) return res.status(400).json({ error: "invalid_word" });

  try {
    const payload = await chatJSON({
      temperature: 0.2,
      system: "Bạn là từ điển Hán-Việt chính xác. Chỉ trả JSON, không thêm chữ nào khác.",
      user:
        `Chữ/từ tiếng Trung: "${word}"\n` +
        (defEn ? `[Định nghĩa tiếng Anh (CC-CEDICT):]\n${defEn}\n` : "") +
        (hvHint ? `[Âm Hán Việt: ${hvHint}]\n` : "") +
        `\nTrả JSON:\n` +
        `- han_viet: âm Hán Việt${hvHint ? " (DÙNG dữ liệu trên)" : ""}\n` +
        `- meaning_vi: nghĩa tiếng Việt rõ ràng${defEn ? " (DỊCH từ định nghĩa tiếng Anh trên sang tiếng Việt tự nhiên, đủ ý)" : ""}, 1-3 dòng\n` +
        `JSON only.`,
    });
    return res.status(200).json({
      han_viet: payload.han_viet || hvHint || "",
      meaning_vi: payload.meaning_vi || "",
    });
  } catch (e) {
    console.error("translatevi", e);
    return res.status(500).json({ error: "server_error" });
  }
}
