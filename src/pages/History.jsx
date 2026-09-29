import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { pinyin as pyfn } from "pinyin-pro";
import { supabase } from "../lib/supabase.js";

const hanCount = (s) => [...(s || "")].filter((c) => /[\u4e00-\u9fff]/.test(c)).length;
const isIdiom = (s) => hanCount(s) >= 4;
const LEVEL_OPTS = [["1","HSK 1"],["2","HSK 2"],["3","HSK 3"],["4","HSK 4"],["5","HSK 5"],["6","HSK 6"],["7","HSK 7-9"]];

export default function History() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hsk, setHsk] = useState(null);
  const [q, setQ] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [idiomOnly, setIdiomOnly] = useState(false);

  useEffect(() => { import("../lib/hsk.js").then((m) => setHsk(() => m)); }, []);

  const load = useCallback(async () => {
    const { data } = await supabase.from("zhdict_searches")
      .select("word,pinyin,updated_at,data").order("updated_at", { ascending: false });
    setRows((data || []).map((r) => {
      const lk = (r.data && r.data.lookup) || {};
      return { word: r.word, pinyin: r.pinyin, date: r.updated_at, meaning: lk.meaning_vi || lk.definition_en || "" };
    }));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function remove(word) {
    setRows((prev) => prev.filter((r) => r.word !== word));
    await supabase.from("zhdict_searches").delete().eq("word", word);
  }

  const level = (w) => (hsk ? hsk.hskLevel(w) : 0);
  const filtered = rows.filter((r) => {
    if (idiomOnly && !isIdiom(r.word)) return false;
    if (levelFilter !== "all") {
      const lv = level(r.word);
      if (levelFilter === "none" && lv) return false;
      if (levelFilter !== "none" && String(lv) !== levelFilter) return false;
    }
    if (q.trim()) {
      const f = q.trim().toLowerCase();
      if (!r.word.includes(q.trim()) && !(r.pinyin || "").toLowerCase().includes(f) && !(r.meaning || "").toLowerCase().includes(f)) return false;
    }
    return true;
  });

  return (
    <div className="page" style={{ maxWidth: 960 }}>
      <div className="page-head"><div>
        <h1 className="page-title">Lịch sử tra cứu</h1>
        <p className="page-sub">Tất cả từ đã tra. Bấm vào từ để xem chi tiết. Lọc theo cấp HSK hoặc thành ngữ.</p>
      </div></div>

      <div className="stack">
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <input className="input" style={{ maxWidth: 240 }} placeholder="Tìm từ / pinyin / nghĩa…"
            value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" style={{ maxWidth: 160 }} value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="all">Tất cả cấp</option>
            {LEVEL_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            <option value="none">Ngoài HSK</option>
          </select>
          <label className="row" style={{ gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={idiomOnly} onChange={(e) => setIdiomOnly(e.target.checked)} /> Chỉ thành ngữ
          </label>
          <span className="tiny muted" style={{ marginLeft: "auto" }}>{filtered.length} từ</span>
        </div>

        {loading ? <div className="card card-pad muted">Đang tải…</div>
        : filtered.length === 0 ? <div className="card card-pad muted tiny">Không có từ nào khớp.</div>
        : (
          <div className="card hist-table">
            {filtered.map((r, i) => {
              const lb = hsk && hsk.hskLabel(level(r.word));
              return (
                <div key={r.word} className="hist-row" style={{ borderTop: i ? "1px solid var(--border)" : "none" }}>
                  <span className="hist-date tiny muted">{new Date(r.date).toLocaleDateString("vi-VN")}</span>
                  <span className="zh hist-word" onClick={() => navigate(`/?w=${encodeURIComponent(r.word)}`)} title="Bấm để tra">{r.word}</span>
                  <span className="tiny hist-py" style={{ color: "var(--accent-700)" }}>{r.pinyin || pyfn(r.word, { toneType: "symbol" })}</span>
                  <span className="hist-mean tiny">{r.meaning}</span>
                  <span className="hist-badges">
                    {isIdiom(r.word) && <span className="badge hoc_tap">thành ngữ</span>}
                    {lb && <span className="badge tieng_trung">{lb}</span>}
                  </span>
                  <button className="hist-del" onClick={() => remove(r.word)} title="Xoá khỏi lịch sử">×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
