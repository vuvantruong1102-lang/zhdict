import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { pinyin } from "pinyin-pro";
import { api } from "../lib/api.js";
import Spinner from "../components/Spinner.jsx";
import AskBox from "../components/AskBox.jsx";

const hasHan = (s) => /[\u4e00-\u9fff]/.test(s || "");

// Màu theo vai trò ngữ pháp
const ROLE_COLORS = {
  subject:     "#c0392b", // chủ ngữ — đỏ
  verb:        "#1e7e34", // động từ/vị ngữ — xanh lá
  object:      "#2471a3", // tân ngữ — xanh dương
  attributive: "#8e44ad", // định ngữ — tím
  adverbial:   "#b9770e", // trạng ngữ — cam
  conjunction: "#7f8c8d", // liên/giới/trợ từ — xám
  other:       "var(--text)",
};
const ROLE_LABELS = {
  subject: "chủ ngữ", verb: "động từ / vị ngữ", object: "tân ngữ",
  attributive: "định ngữ", adverbial: "trạng ngữ", conjunction: "liên/giới/trợ từ", other: "khác",
};
// Chú thích chỉ hiện các vai trò chính
const LEGEND = [
  ["subject", "Chủ ngữ"], ["verb", "Động từ/Vị ngữ"], ["object", "Tân ngữ"],
  ["attributive", "Định ngữ"], ["adverbial", "Trạng ngữ"],
];

// Tách văn bản dài thành từng câu (tránh timeout). Cắt theo dấu câu tiếng Trung;
// câu nào vẫn quá dài thì cắt tiếp theo dấu phẩy.
function splitSentences(t) {
  const parts = (t || "").replace(/\r/g, "").split(/(?<=[。！？；\n])/);
  const out = [];
  for (let p of parts) {
    p = p.trim();
    if (!p) continue;
    if (p.length > 120) {
      let buf = "";
      for (const s of p.split(/(?<=[，,、])/)) {
        if ((buf + s).length > 120 && buf) { out.push(buf.trim()); buf = s; }
        else buf += s;
      }
      if (buf.trim()) out.push(buf.trim());
    } else out.push(p);
  }
  return out;
}

export default function Translate() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);

  function clearText() { setText(""); setRes(null); }

  function lookupWord(w) {
    if (hasHan(w)) navigate(`/?w=${encodeURIComponent(w.trim())}`);
  }

  async function analyze() {
    const full = text.trim();
    if (!full) return;
    if (!hasHan(full)) { setRes({ __error: "Chưa thấy chữ Hán nào — kiểm tra lại nội dung." }); return; }
    setLoading(true); setRes(null); setProgress(null);
    const chunks = splitSentences(full);
    try {
      const sentences = [];
      for (let i = 0; i < chunks.length; i++) {
        if (chunks.length > 1) setProgress({ i: i + 1, n: chunks.length });
        const r = await api.sentence(chunks[i]);
        sentences.push({ chinese: chunks[i], tokens: r.tokens || [], segments: r.segments || [], translation_vi: r.translation_vi || "" });
      }
      setRes({ text: full, sentences });
    } catch (e) {
      setRes({ __error: "Không phân tích được. Nếu văn bản quá dài, hãy thử đoạn ngắn hơn rồi phân tích lại." });
    } finally {
      setLoading(false); setProgress(null);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 920 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">Dịch tiếng Trung</h1>
          <p className="page-sub">Dán câu (hoặc cả đoạn) tiếng Trung. Trên cùng là bản dịch tiếng Việt; bên dưới là câu gốc với pinyin, các từ được tô màu theo vai trò ngữ pháp. Bấm vào từ để tra chi tiết.</p>
        </div>
      </div>

      <div className="stack">
        <div className="card card-pad stack">
          <div className="ta-wrap">
            <textarea className="textarea zh" value={text} style={{ fontSize: 17, minHeight: 130 }}
              placeholder="我从越南来，正在学习中文。" onChange={(e) => setText(e.target.value)} />
            {text && (
              <button type="button" className="ta-clear" onClick={clearText}
                title="Xoá nội dung" aria-label="Xoá nội dung">×</button>
            )}
          </div>
          <button className="btn" onClick={analyze} disabled={loading || !text.trim()}
            style={{ alignSelf: "flex-start" }}>
            {loading ? (progress ? `Đang phân tích ${progress.i}/${progress.n}…` : "Đang phân tích…") : "Phân tích & tạo pinyin"}
          </button>
        </div>

        {loading && <div className="card card-pad"><Spinner label="Đang tách từ & dịch…" /></div>}

        {res && !res.__error && (
          <div className="stack fade-in">
            {res.sentences.map((s, si) => (
              <div key={si} className="card card-pad stack">
                {res.sentences.length > 1 && <p className="field-label" style={{ margin: 0 }}>Câu {si + 1}</p>}

                {/* Câu gốc nhóm theo cụm nghĩa: khung in đậm, cụm nghĩa gạch chân */}
                {Array.isArray(s.segments) && s.segments.length > 0 && (
                  <div className="chunk-line zh">
                    {s.segments.map((seg, i) => {
                      const cls = seg.type === "proper" ? "seg-proper"
                        : seg.type === "frame" ? "seg-frame"
                        : seg.type === "conj" ? "seg-conj"
                        : seg.type === "chunk" ? "seg-chunk"
                        : seg.type === "punct" ? "seg-punct" : "seg-plain";
                      return <span key={i} className={cls}>{seg.text}</span>;
                    })}
                  </div>
                )}

                {/* Bản dịch tiếng Việt */}
                <div className="tok-trans"><b>Dịch:</b> {s.translation_vi}</div>

                {/* Dòng 2: chữ Hán (trên) + pinyin (dưới), tô màu theo vai trò ngữ pháp */}
                <div className="sent-flow">
                  {s.tokens.map((t, i) => {
                    if (!hasHan(t.token)) return <span key={i} className="flow-punct zh">{t.token}</span>;
                    const py = t.pinyin || pinyin(t.token, { toneType: "symbol" });
                    const color = ROLE_COLORS[t.role] || ROLE_COLORS.other;
                    return (
                      <span key={i} className="flow-tok" onClick={() => lookupWord(t.token)}
                        title={`${t.meaning_vi || ""}${t.role ? ` · ${ROLE_LABELS[t.role] || t.role}` : ""} — bấm để tra`}>
                        <span className="flow-hz zh" style={{ color }}>{t.token}</span>
                        <span className="flow-py" style={{ color }}>{py}</span>
                      </span>
                    );
                  })}
                </div>

                {/* Chú thích màu */}
                <div className="role-legend">
                  {LEGEND.map(([role, label]) => (
                    <span key={role} className="role-chip">
                      <span className="role-dot" style={{ background: ROLE_COLORS[role] }} />{label}
                    </span>
                  ))}
                </div>

                <AskBox context={`Câu tiếng Trung: "${s.chinese}" — Bản dịch: ${s.translation_vi}`}
                  placeholder="Hỏi về câu này…" />
              </div>
            ))}
          </div>
        )}

        {res?.__error && <div className="card card-pad" style={{ color: "#d4537e" }}>{res.__error}</div>}
      </div>
    </div>
  );
}
