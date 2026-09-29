import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { pinyin as pyfn } from "pinyin-pro";

const LEVELS = [1, 2, 3, 4, 5, 6, 7];
const levelLabel = (l) => (l >= 7 ? "HSK 7-9" : "HSK " + l);

export default function Hsk() {
  const navigate = useNavigate();
  const [HSK, setHSK] = useState(null);
  const [open, setOpen] = useState({ 1: true });
  const [limit, setLimit] = useState({});
  const [q, setQ] = useState("");

  useEffect(() => { import("../lib/hsk.js").then((m) => setHSK(m.HSK)); }, []);

  if (!HSK) return <div className="page" style={{ maxWidth: 960 }}><div className="card card-pad muted">Đang tải dữ liệu HSK…</div></div>;

  const byLevel = {};
  for (const r of HSK) (byLevel[r[1]] = byLevel[r[1]] || []).push(r);   // đã sắp theo tần suất

  const term = q.trim();

  return (
    <div className="page" style={{ maxWidth: 960 }}>
      <div className="page-head"><div>
        <h1 className="page-title">Từ vựng HSK</h1>
        <p className="page-sub">HSK 3.0, chia theo cấp; trong mỗi cấp sắp theo độ phổ biến. Bấm vào từ để tra chi tiết.</p>
      </div></div>

      <div className="stack">
        <input className="input" style={{ maxWidth: 260 }} placeholder="Tìm chữ Hán trong HSK…"
          value={q} onChange={(e) => setQ(e.target.value)} />
        {LEVELS.map((l) => {
          const all = (byLevel[l] || []).filter((r) => !term || r[0].includes(term));
          const isOpen = term ? true : !!open[l];
          const lim = limit[l] || 150;
          const shown = all.slice(0, lim);
          return (
            <div key={l} className="card hsk-level">
              <button className="hsk-head" onClick={() => setOpen((o) => ({ ...o, [l]: !o[l] }))}>
                <span className="todo-day-caret">{isOpen ? "▾" : "▸"}</span>
                <span style={{ flex: 1, fontWeight: 600 }}>{levelLabel(l)}</span>
                <span className="tiny muted">{all.length} từ</span>
              </button>
              {isOpen && (
                <div className="hsk-grid">
                  {shown.map((r) => (
                    <span key={r[0]} className="hsk-word" onClick={() => navigate(`/zh?w=${encodeURIComponent(r[0])}`)} title="Bấm để tra">
                      <span className="zh">{r[0]}</span>
                      <span className="tiny" style={{ color: "var(--accent-700)" }}>{pyfn(r[0], { toneType: "symbol" })}</span>
                    </span>
                  ))}
                  {all.length > shown.length && (
                    <button className="btn ghost sm" style={{ alignSelf: "center" }}
                      onClick={() => setLimit((s) => ({ ...s, [l]: lim + 300 }))}>
                      Xem thêm ({all.length - shown.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
