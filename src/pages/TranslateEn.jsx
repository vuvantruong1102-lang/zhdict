import { useState } from "react";
import { api } from "../lib/api.js";
import Spinner from "../components/Spinner.jsx";

const clearBtn = {
  position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 8,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  fontSize: 20, lineHeight: 1, color: "var(--text-mute)",
  background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer",
};

export default function TranslateEn() {
  const [text, setText] = useState("");
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);

  function clearText() { setText(""); setRes(null); }

  async function analyze() {
    if (!text.trim()) return;
    setLoading(true); setRes(null);
    try { setRes(await api.sentenceEn(text.trim())); }
    catch (e) { setRes({ __error: "Không phân tích được, kiểm tra lại đoạn tiếng Anh." }); }
    finally { setLoading(false); }
  }

  return (
    <div className="page" style={{ maxWidth: 920 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">Dịch tiếng Anh</h1>
          <p className="page-sub">Dán đoạn tiếng Anh để dịch cả câu và xem nghĩa từng từ / cụm từ.</p>
        </div>
      </div>

      <div className="stack">
        <div className="card card-pad stack">
          <div style={{ position: "relative" }}>
            <textarea className="textarea" value={text} style={{ fontSize: 16, minHeight: 130 }}
              placeholder="I'm looking forward to seeing you next week."
              onChange={(e) => setText(e.target.value)} />
            {text && (
              <button type="button" style={clearBtn} onClick={clearText}
                title="Xoá nội dung" aria-label="Xoá nội dung">×</button>
            )}
          </div>
          <button className="btn" onClick={analyze} disabled={loading || !text.trim()}
            style={{ alignSelf: "flex-start" }}>
            {loading ? "Đang dịch…" : "Dịch & phân tích"}
          </button>
        </div>

        {loading && <div className="card card-pad"><Spinner label="Đang dịch & phân tích…" /></div>}

        {res && !res.__error && (
          <div className="stack fade-in">
            <div className="card card-pad stack">
              <p className="field-label" style={{ margin: 0 }}>Bản dịch</p>
              <div style={{ fontSize: 16 }}>{res.translation_vi}</div>
              {res.explanation_vi && <div className="muted">📐 {res.explanation_vi}</div>}
            </div>

            {res.tokens?.length > 0 && (
              <div className="card card-pad stack">
                <p className="field-label" style={{ margin: 0 }}>Nghĩa từng từ / cụm từ</p>
                {res.tokens.map((t, i) => (
                  <div key={i} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 8,
                    paddingTop: i ? 8 : 0, borderTop: i ? "1px solid var(--border)" : "none" }}>
                    <span style={{ fontWeight: 600, fontSize: 16 }}>{t.token}</span>
                    {t.ipa && <span className="tiny" style={{ color: "var(--accent-700)" }}>{t.ipa}</span>}
                    {t.pos && <span className="tiny muted">({t.pos})</span>}
                    <span style={{ flex: "1 1 220px" }}>{t.meaning_vi}</span>
                  </div>
                ))}
              </div>
            )}

            {res.new_words?.length > 0 && (
              <div className="card card-pad stack">
                <p className="field-label" style={{ margin: 0 }}>Từ / cụm từ nên học</p>
                {res.new_words.map((w, i) => (
                  <div key={i}>
                    <span style={{ fontWeight: 600, fontSize: 16 }}>{w.word}</span>{" "}
                    {w.ipa && <span className="tiny" style={{ color: "var(--accent-700)" }}>{w.ipa}</span>}
                    <div>{w.meaning_vi}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {res?.__error && <div className="card card-pad" style={{ color: "#d4537e" }}>{res.__error}</div>}
      </div>
    </div>
  );
}
