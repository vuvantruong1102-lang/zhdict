import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { pinyin } from "pinyin-pro";
import { api } from "../lib/api.js";
import Spinner from "../components/Spinner.jsx";
import AskBox from "../components/AskBox.jsx";

const hasHan = (s) => /[\u4e00-\u9fff]/.test(s || "");




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

  const [pop, setPop] = useState(null); // { word, core, loading }

  function clearText() { setText(""); setRes(null); setPop(null); }

  // Click từ -> hiện bong bóng nghĩa cốt lõi tại chỗ
  async function showPopup(w, ev) {
    const word = (w || "").trim();
    if (!hasHan(word)) return;
    ev?.stopPropagation?.();
    setPop({ word, core: null, loading: true });
    try {
      const r = await api.core(word);
      setPop((p) => (p && p.word === word ? { ...p, core: r.core_vi || "(không có dữ liệu)", loading: false } : p));
    } catch {
      setPop((p) => (p && p.word === word ? { ...p, core: "Lỗi tải, thử lại.", loading: false } : p));
    }
  }
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
      let allChunks = [];
      let allTrans = [];
      for (let i = 0; i < chunks.length; i++) {
        if (chunks.length > 1) setProgress({ i: i + 1, n: chunks.length });
        const r = await api.sentence(chunks[i]);
        allChunks = allChunks.concat(r.chunks || []);
        if (r.translation_vi) allTrans.push(r.translation_vi);
      }
      // Gộp tất cả thành một kết quả liền mạch (không chia câu 1, câu 2...)
      setRes({ text: full, sentences: [{ chinese: full, chunks: allChunks, translation_vi: allTrans.join(" ") }] });
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

                {/* Bản dịch tiếng Việt — lên trên */}
                <div className="tok-trans"><b>Dịch:</b> {s.translation_vi}</div>

                {/* Câu gốc: các token chảy tự do (tự xuống dòng từng chữ, không tràn khung).
                    Token ĐẦU mỗi cụm có khoảng cách lớn hơn -> thấy ranh giới cụm.
                    Chữ trong cùng cụm (và tên riêng) sát nhau. */}
                {Array.isArray(s.chunks) && s.chunks.length > 0 && (
                  <div className="chunk-flow">
                    {(() => {
                      // Làm phẳng toàn bộ token để xét token liền kề (gom tên riêng sát nhau)
                      const flat = [];
                      s.chunks.forEach((ch, ci) =>
                        (ch.tokens || []).forEach((t, ti) => flat.push({ t, chunkStart: ti === 0 })));
                      return flat.map((item, idx) => {
                        const t = item.t;
                        const hz = (t.hz || "").trim();
                        const isPunctOnly = !hasHan(hz) && !/[A-Za-z0-9]/.test(hz);
                        if (isPunctOnly) return <span key={idx} className="cf-punct zh">{t.hz}</span>;
                        const py = hasHan(hz) ? (t.pinyin || pinyin(hz, { toneType: "symbol" })) : (t.pinyin || "");
                        // Màu theo nhãn hl: entity=đỏ, logic=xanh, particle=tím
                        const cls = t.hl === "entity" ? " cf-entity"
                          : t.hl === "logic" ? " cf-logic"
                          : t.hl === "particle" ? " cf-particle" : "";
                        // Gạch chân từ ghép 2-4 chữ Hán
                        const hanLen = (hz.match(/[\u4e00-\u9fff]/g) || []).length;
                        const underline = hanLen >= 2 && hanLen <= 4 ? " cf-underline" : "";
                        // Token entity liền ngay sau một entity -> sát nhau (cùng tên riêng)
                        const prev = flat[idx - 1]?.t;
                        const tightWithPrev = t.hl === "entity" && prev && prev.hl === "entity";
                        // Token đứng ngay sau DẤU CÂU -> không cần thêm khoảng cách
                        // (dấu câu đã là ranh giới rồi)
                        const prevHz = (prev?.hz || "").trim();
                        const afterPunct = prev && !hasHan(prevHz) && !/[A-Za-z0-9]/.test(prevHz);
                        const chunkStart = item.chunkStart && !tightWithPrev && !afterPunct ? " cf-chunk-start" : "";
                        return (
                          <span key={idx}
                            className={"cf-tok" + cls + underline + chunkStart}
                            onClick={(e) => showPopup(hz, e)}
                            title={t.meaning_vi || ""}>
                            <span className="cf-hz zh">{t.hz}</span>
                            <span className="cf-py">{py || "\u00a0"}</span>
                          </span>
                        );
                      });
                    })()}
                  </div>
                )}

                <AskBox context={`Câu tiếng Trung: "${s.chinese}" — Bản dịch: ${s.translation_vi}`}
                  placeholder="Hỏi về câu này…" />
              </div>
            ))}
          </div>
        )}

        {res?.__error && <div className="card card-pad" style={{ color: "#d4537e" }}>{res.__error}</div>}
      </div>

      {/* Bong bóng nghĩa cốt lõi khi bấm từ trong câu */}
      {pop && (
        <div className="wp-overlay" onClick={() => setPop(null)}>
          <div className="wp-card" onClick={(e) => e.stopPropagation()}>
            <div className="wp-head">
              <span className="zh" style={{ fontSize: 24, fontWeight: 600 }}>{pop.word}</span>
              <button className="wp-close" onClick={() => setPop(null)} aria-label="Đóng">✕</button>
            </div>
            <div className="wp-body">
              {pop.loading ? <span className="muted tiny">Đang tải nghĩa…</span>
                : <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{pop.core}</span>}
            </div>
            <button className="btn sm block" onClick={() => lookupWord(pop.word)}>Tra chi tiết →</button>
          </div>
        </div>
      )}
    </div>
  );
}
