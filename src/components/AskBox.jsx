import { useState } from "react";
import { api } from "../lib/api.js";

// Ô hỏi đáp tái sử dụng: đặt dưới mỗi từ (Tra) hoặc mỗi câu (Dịch).
export default function AskBox({ context, placeholder }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);   // [{ q, a }]  (a === null khi đang trả lời)
  const [loading, setLoading] = useState(false);

  async function ask() {
    const question = q.trim();
    if (!question || loading) return;
    setQ(""); setLoading(true);
    setItems((prev) => [...prev, { q: question, a: null }]);
    try {
      const r = await api.ask(question, context || "");
      setItems((prev) => prev.map((it, i) => i === prev.length - 1 ? { ...it, a: r.answer || "(không có trả lời)" } : it));
    } catch {
      setItems((prev) => prev.map((it, i) => i === prev.length - 1 ? { ...it, a: "⚠ Lỗi, thử lại." } : it));
    } finally { setLoading(false); }
  }

  return (
    <div className="askbox stack">
      <p className="field-label" style={{ margin: 0 }}>💬 Hỏi đáp <span className="tiny muted">— hỏi chỗ chưa rõ</span></p>
      {items.map((it, i) => (
        <div key={i} className="ask-item">
          <div className="ask-q">❓ {it.q}</div>
          <div className="ask-a">{it.a === null ? <span className="muted tiny">Đang trả lời…</span> : it.a}</div>
        </div>
      ))}
      <div className="row" style={{ gap: 8 }}>
        <input className="input" value={q} placeholder={placeholder || "Nhập câu hỏi…"}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} />
        <button className="btn sm" onClick={ask} disabled={loading || !q.trim()}>Hỏi</button>
      </div>
    </div>
  );
}
