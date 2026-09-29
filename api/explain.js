// POST { word } -> { word, source, intro_vi, etymology_vi, etymology_found,
//                    etymology_section, version }
// v4: xử lý trang ĐA NGHĨA (disambiguation) của Baike. Chữ như 制 có nhiều
// nghĩa nên Baike trả trang "请在下列义项中选择" thay vì trang chữ Hán.
// -> phát hiện, lần theo link tới mục 汉语汉字 rồi fetch lại.
import * as cheerio from "cheerio";
import { chatJSON, isChinese } from "./_lib/openai.js";

const SCHEMA_VERSION = 5;

const ETYMOLOGY_HEADINGS = [
  "字源演变", "字源解说", "文字源流", "字形演变", "词源演变", "词源",
];
const NEXT_SECTION_MARKERS = [
  "详细释义", "现代释义", "古籍释义", "字形书法",
  "音韵汇集", "词性变化", "基本释义", "康熙字典",
  "近义词", "反义词", "笔顺", "笔画", "注音",
];
const BLOCK_MARKERS = ["百度安全验证", "请输入验证码", "网络不给力", "antispider"];

function htmlToText(html) {
  const $ = cheerio.load(html);
  $("script, style, noscript, header, footer, nav").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

function extractIntro(html) {
  const $ = cheerio.load(html);
  const sels = [".lemmaSummary", ".lemma-summary", ".J-summary",
    '[class*="lemmaSummary"]', '[class*="lemma-summary"]'];
  for (const sel of sels) {
    const t = $(sel).first().text().replace(/\s+/g, " ").trim();
    if (t && t.length > 10) return t;
  }
  return null;
}

function extractEtymology(text) {
  const all = [];
  for (const heading of ETYMOLOGY_HEADINGS) {
    let pos = 0;
    while (true) {
      const idx = text.indexOf(heading, pos);
      if (idx === -1) break;
      const start = idx + heading.length;
      let end = text.length;
      for (const m of NEXT_SECTION_MARKERS) {
        const mi = text.indexOf(m, start);
        if (mi !== -1 && mi < end) end = mi;
      }
      for (const h2 of ETYMOLOGY_HEADINGS) {
        if (h2 === heading) continue;
        const hi = text.indexOf(h2, start);
        if (hi !== -1 && hi < end) end = hi;
      }
      end = Math.min(end, start + 10000);
      let slice = text.slice(start, end).trim();
      slice = slice.replace(/^(?:\s|播报|编辑)+/, "").trim();
      all.push({ heading, slice });
      pos = idx + 1;
    }
  }
  if (all.length === 0) return null;
  all.sort((a, b) => b.slice.length - a.slice.length);
  return all[0].slice.length > 50 ? { heading: all[0].heading, text: all[0].slice } : null;
}

// Trang đa nghĩa: chứa các marker đặc trưng
function isDisambiguation(text) {
  return /是一个多义词|请在下列义项中选择|共\d+个义项|该词条/.test(text);
}

// Tìm link tới nghĩa chữ Hán trong trang đa nghĩa
function findCharacterSenseLink(html) {
  const $ = cheerio.load(html);
  const candidates = [];
  $("a").each((_, el) => {
    const href = ($(el).attr("href") || "").split("?")[0];
    const txt = $(el).text().trim();
    if (/^\/item\/[^/]+\/\d+/.test(href)) candidates.push({ href, txt });
  });
  // Ưu tiên nghĩa "汉语汉字" / "汉字" / "文字", rồi mới đến chứa "字"
  const pick = candidates.find((c) => /汉语汉字|汉字|文字/.test(c.txt))
            || candidates.find((c) => /字/.test(c.txt))
            || candidates[0];
  return pick ? pick.href : null;
}

async function fetchUrl(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal, redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9",
        Accept: "text/html,application/xhtml+xml",
        Referer: "https://baike.baidu.com/",
      },
    });
    if (!r.ok) return { ok: false, reason: `HTTP ${r.status}` };
    const html = await r.text();
    if (BLOCK_MARKERS.some((m) => html.includes(m))) return { ok: false, reason: "blocked" };
    return { ok: true, html, url };
  } catch (e) {
    return { ok: false, reason: e.name === "AbortError" ? "timeout" : "fetch_error" };
  } finally {
    clearTimeout(timer);
  }
}

// Fetch + tự giải quyết trang đa nghĩa
async function fetchBaikeResolved(word) {
  const first = await fetchUrl(`https://baike.baidu.com/item/${encodeURIComponent(word)}`);
  if (!first.ok) return first;
  const text = htmlToText(first.html);
  // Nếu không thấy etymology VÀ là trang đa nghĩa -> lần theo link nghĩa chữ Hán
  if (!extractEtymology(text) && isDisambiguation(text)) {
    const link = findCharacterSenseLink(first.html);
    if (link) {
      const second = await fetchUrl(`https://baike.baidu.com${link}`);
      if (second.ok) return second;
    }
  }
  return first;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const word = (req.body?.word || "").trim();
  if (!isChinese(word)) return res.status(400).json({ error: "invalid_word" });

  try {
    const baike = await fetchBaikeResolved(word);

    let introZh = null, etyResult = null;
    if (baike.ok) {
      const text = htmlToText(baike.html);
      introZh = extractIntro(baike.html) || text.slice(0, 1500);
      etyResult = extractEtymology(text);
    }

    // Một lần gọi AI: LUÔN có "ai_explain_vi" (AI tự giải thích, không phụ thuộc Baike);
    // nếu lấy được Baike thì kèm dịch intro_vi (+ etymology_vi nếu có mục từ nguyên).
    let user =
      `Chữ/từ tiếng Trung: "${word}".\n\n` +
      `(1) Hãy TỰ giải thích nghĩa và cách dùng của "${word}" bằng tiếng Việt: nghĩa chính, ` +
      `sắc thái, và nếu cần thì ví dụ ngắn. Viết tự nhiên, súc tích nhưng đủ ý. Đưa vào trường "ai_explain_vi".\n`;
    if (baike.ok && (introZh || etyResult)) {
      if (introZh) user += `\n[VĂN BẢN ĐẦU TRANG BAIKE — có thể chứa mục lục và bảng thông tin]\n${introZh}\n`;
      if (etyResult) user += `\n[MỤC ${etyResult.heading} — nguồn gốc/diễn biến tự dạng]\n${etyResult.text}\n`;
      user += `\n(2) Từ phần đầu trang Baike, BỎ QUA mục lục và bảng thông tin, chỉ dịch phần ` +
        `mô tả/định nghĩa chính sang tiếng Việt -> "intro_vi". Không bịa nội dung Baike.\n`;
      if (etyResult)
        user += `(3) Dịch ĐẦY ĐỦ mục ${etyResult.heading} sang tiếng Việt, giữ trọn nội dung, không rút gọn, không bịa -> "etymology_vi".\n`;
      user += `\nJSON: {"ai_explain_vi":"...","intro_vi":"...","etymology_vi":"..."}`;
    } else {
      user += `\nJSON: {"ai_explain_vi":"..."}`;
    }

    const payload = await chatJSON({
      temperature: 0.2,
      system: "Bạn là chuyên gia Hán ngữ, giải thích cho người Việt học. Dịch/diễn đạt tiếng Việt tự nhiên, " +
        "không bịa nội dung trích từ Baike. Chỉ trả JSON.",
      user,
    });

    return res.status(200).json({
      word,
      source: baike.ok ? "baidu_baike" : "ai_only",
      source_url: baike.ok ? baike.url : null,
      source_note: baike.ok ? null : `Không lấy được Baike (${baike.reason}).`,
      ai_explain_vi: payload.ai_explain_vi || "",
      intro_vi: payload.intro_vi || "",
      etymology_vi: payload.etymology_vi || "",
      etymology_found: !!(etyResult && payload.etymology_vi),
      etymology_section: etyResult ? etyResult.heading : null,
      version: SCHEMA_VERSION,
    });
  } catch (e) {
    console.error("explain", e);
    return res.status(500).json({ error: "server_error" });
  }
}
