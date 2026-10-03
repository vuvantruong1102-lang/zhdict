import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { pinyin } from "pinyin-pro";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import AskBox from "../components/AskBox.jsx";

function speak(word) {
  try {
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "zh-CN"; u.rate = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}

// lookup (tức thì, không AI) được auto-fetch. explain/zdic lazy (accordion).
const NEEDS = {
  lookup: (v) => v && v.in_cedict !== undefined,
};

export default function Chinese() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [word, setWord] = useState("");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState({});
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyFilter, setHistoryFilter] = useState("");
  const [hanVietFn, setHanVietFn] = useState(null);
  useEffect(() => { import("../lib/hanviet.js").then((m) => setHanVietFn(() => m.hanVietOf)); }, []);

  // Nhận ?w=<từ> (vd bấm cụm từ ở trang Dịch câu) -> tự tra
  const [searchParams] = useSearchParams();
  const wParam = searchParams.get("w");
  useEffect(() => {
    if (wParam) lookup(wParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wParam]);

  async function loadHistory() {
    const { data: rows, count } = await supabase.from("zhdict_searches")
      .select("word,pinyin,updated_at", { count: "exact" })
      .order("updated_at", { ascending: false });
    setHistory(rows || []);
    setHistoryTotal(count ?? (rows ? rows.length : 0));
  }
  useEffect(() => { loadHistory(); }, []);

  function saveCache(term, next) {
    supabase.from("zhdict_searches").upsert(
      { user_id: user.id, word: term, pinyin: pinyin(term, { toneType: "symbol" }), data: next },
      { onConflict: "user_id,word" }
    ).then(() => loadHistory());
  }

  async function lookup(w) {
    const term = (w || input).trim();
    if (!term) return;
    setWord(term); setInput(term);
    const { data: row } = await supabase.from("zhdict_searches")
      .select("data").eq("word", term).maybeSingle();
    const cached = row?.data || {};
    setData(cached);
    const todo = Object.keys(NEEDS).filter((k) => !NEEDS[k](cached[k]));
    todo.forEach((k) => fetchSection(term, k));
    // Nghĩa cốt lõi (ChatGPT) tự tải ngay, không cần bấm.
    // Tải lại nếu chưa có hoặc cache theo schema cũ (version < 2).
    if (!cached.gpt || (cached.gpt.version || 0) < 7) fetchSection(term, "gpt");
  }

  // Tra tức thì (lookup) hoặc accordion (explain/zdic)
  async function fetchSection(w, key) {
    const target = w || word;
    if (!target) return;
    setLoading((p) => ({ ...p, [key]: true }));
    try {
      const res = await api[key](target);
      setData((prev) => {
        const next = { ...prev, [key]: res };
        saveCache(target, next);
        return next;
      });
    } catch (e) {
      setData((p) => ({ ...p, [key]: { __error: "Lỗi tải dữ liệu, thử lại sau." } }));
    } finally {
      setLoading((p) => ({ ...p, [key]: false }));
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Tra Tiếng Trung</h1>
          <p className="page-sub">Phồn thể · Pinyin · Hán Việt · nghĩa Anh hiện tức thì. Nghĩa Việt & giải thích chỉ gọi AI khi bấm.</p>
        </div>
      </div>

      <div className="zh-layout">
        <div className="stack">
          <div className="row">
            <input className="input zh" value={input} placeholder="Gõ từ / chữ Hán cần tra…"
              style={{ fontSize: 17 }}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookup()} />
            <button className="btn" onClick={() => lookup()}>Tra cứu</button>
          </div>

          {!word && (
            <div className="empty">
              <div className="big">🀄</div>
              Nhập một từ tiếng Trung rồi bấm <b>Tra cứu</b>.
            </div>
          )}

          {word && (
            <>
              <div className="card card-pad fade-in">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                  <div className="row" style={{ alignItems: "baseline", gap: 14 }}>
                    <span className="zh" style={{ fontSize: 126, fontWeight: 500, lineHeight: 1.05 }}>{word}</span>
                    <span style={{ color: "var(--accent-700)", fontWeight: 600, fontSize: 28 }}>
                      {pinyin(word, { toneType: "symbol" })}
                    </span>
                  </div>
                  <button className="btn ghost sm" onClick={() => speak(word)}>🔊 Phát âm</button>
                </div>
              </div>

              <div className="card card-pad fade-in">
                <LookupBody d={data.lookup} word={word}
                  hanVietLocal={hanVietFn ? hanVietFn(word) : null} />
              </div>

              {/* Nghĩa cốt lõi — auto hiện, tách khỏi ChatGPT */}
              <div className="card card-pad fade-in">
                <CoreMeaning d={data.gpt} loading={loading.gpt} />
              </div>

              <Accordion title="ChatGPT"
                loaded={!!data.gpt && (data.gpt.__error || (data.gpt.version || 0) >= 7)} loading={loading.gpt}
                onLoad={() => fetchSection(word, "gpt")}
                onRefresh={() => fetchSection(word, "gpt")}>
                <GptBody d={data.gpt} onPick={(w) => lookup(w)} />
              </Accordion>

              <Accordion title="Baidu Baike"
                loaded={!!data.explain && (data.explain.__error || (data.explain.version || 0) >= 5)} loading={loading.explain}
                onLoad={() => fetchSection(word, "explain")}
                onRefresh={() => fetchSection(word, "explain")}>
                <ExplainBody d={data.explain} />
              </Accordion>

              <Accordion title="汉典"
                loaded={!!data.zdic} loading={loading.zdic}
                onLoad={() => fetchSection(word, "zdic")}
                onRefresh={() => fetchSection(word, "zdic")}>
                <ZdicBody d={data.zdic} />
              </Accordion>

              <AskBox
                context={`Từ tiếng Trung: "${word}" (pinyin ${pinyin(word, { toneType: "symbol" })}${data.lookup?.han_viet ? `, Hán Việt ${data.lookup.han_viet}` : ""}${data.lookup?.meaning_vi ? `, nghĩa: ${data.lookup.meaning_vi}` : ""})`}
                placeholder="Hỏi về từ này…" />
            </>
          )}
        </div>

        <aside className="zh-aside">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <p className="field-label" style={{ margin: 0 }}>🕘 Lịch sử tra cứu</p>
            <span className="tiny muted">Đã tra {historyTotal} từ</span>
          </div>
          {historyTotal === 0 ? (
            <div className="card card-pad tiny muted">Chưa có từ nào.</div>
          ) : (
            <>
              <input className="input" style={{ marginBottom: 8, padding: "7px 10px", fontSize: 13 }}
                placeholder="Lọc trong từ đã tra…" value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)} />
              {(() => {
                const f = historyFilter.trim().toLowerCase();
                const list = f
                  ? history.filter((h) => h.word.includes(historyFilter.trim()) || (h.pinyin || "").toLowerCase().includes(f))
                  : history;
                if (list.length === 0) return <div className="card card-pad tiny muted">Không có từ nào khớp.</div>;
                return (
                  <div className="card zh-history">
                    {list.map((h, i) => (
                      <div key={h.word} onClick={() => lookup(h.word)} className="zh-hist-row"
                        style={{ borderTop: i ? "1px solid var(--border)" : "none" }}>
                        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                          <span className="zh" style={{ fontSize: 18 }}>{h.word}</span>
                          <span className="tiny" style={{ color: "var(--accent-700)" }}>{h.pinyin}</span>
                        </div>
                        {h.updated_at && (
                          <div className="tiny muted" style={{ marginTop: 2 }}>
                            🕘 {new Date(h.updated_at).toLocaleDateString("vi-VN")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function Section({ title, loading, onRefresh, children }) {
  return (
    <div className="card card-pad stack fade-in">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <p className="field-label" style={{ margin: 0 }}>{title}</p>
        <div className="row" style={{ gap: 6 }}>
          {loading ? <div className="spinner" /> :
            onRefresh ? <button onClick={onRefresh} title="Tải lại" style={refreshStyle}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>↻</button> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function Accordion({ title, loaded, loading, onLoad, onRefresh, children }) {
  const [open, setOpen] = useState(false);
  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded && !loading) onLoad?.();
  }
  return (
    <div className="card stack fade-in" style={{ overflow: "hidden" }}>
      <button onClick={toggle} className="row"
        style={{ width: "100%", padding: "14px 18px", justifyContent: "space-between",
          background: "transparent", border: "none", cursor: "pointer",
          borderBottom: open ? "1px solid var(--border)" : "none" }}
        onMouseEnter={(e) => e.currentTarget.style.background = "var(--hover)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
        <span className="field-label" style={{ margin: 0 }}>
          <span style={{ display: "inline-block", width: 14, color: "var(--accent-700)" }}>{open ? "▾" : "▸"}</span>
          {title}
        </span>
        <div className="row" style={{ gap: 6 }}>
          {loading && <div className="spinner" />}
          {open && loaded && !loading && onRefresh && (
            <span onClick={(e) => { e.stopPropagation(); onRefresh(); }} title="Tải lại" style={refreshStyle}>↻</span>
          )}
        </div>
      </button>
      {open && (
        <div style={{ padding: "14px 18px" }}>
          {loading && !loaded ? <div className="muted tiny">Đang tải, vui lòng đợi vài giây…</div>
            : !loaded ? <div className="muted tiny">Chưa có dữ liệu. Bấm vào tiêu đề để tải.</div>
            : children}
        </div>
      )}
    </div>
  );
}

const refreshStyle = {
  width: 28, height: 28, borderRadius: 6, color: "var(--text-mute)",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  fontSize: 15, transition: "background .12s", cursor: "pointer",
  border: "none", background: "transparent",
};

function LookupBody({ d, word, hanVietLocal }) {
  if (!d) return <div className="muted tiny">Đang tra…</div>;
  if (d.__error) return <div style={{ color: "#c2185b" }}>{d.__error}</div>;
  const hanviet = hanVietLocal || d.han_viet;
  const traditional = d.traditional || word;
  const sameAsSimplified = traditional === word;
  return (
    <div className="row" style={{ flexWrap: "wrap", alignItems: "baseline", gap: "6px 18px", rowGap: 6 }}>
      <span><b>Phồn thể:</b> <span className="zh" style={{ fontSize: 18, color: "#8e44ad" }}>{traditional}</span>
        {sameAsSimplified && <span className="tiny muted"> (giống giản thể)</span>}</span>
      {hanviet && <span><b>Hán Việt:</b> <span style={{ color: "#c0392b", fontWeight: 600 }}>{hanviet}</span></span>}
      {d.definition_en && <span><b>Nghĩa (Anh):</b> <span style={{ color: "#2471a3" }}>{d.definition_en}</span></span>}
    </div>
  );
}

// Nghĩa cốt lõi — auto hiện, ô nền đỏ nổi bật
function CoreMeaning({ d, loading }) {
  if (loading && !d) return <div className="muted tiny">Đang tải nghĩa cốt lõi…</div>;
  if (!d) return <div className="muted tiny">Đang tải nghĩa cốt lõi…</div>;
  if (d.__error) return <div style={{ color: "#c2185b" }}>{d.__error}</div>;
  if (!d.core_vi) return <div className="muted tiny">Không có dữ liệu.</div>;
  return (
    <div>
      <div className="field-label" style={{ margin: 0, color: "#dc143b" }}>✦ Nghĩa cốt lõi</div>
      <div style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>{d.core_vi}</div>
      {d.core_note_vi && (
        <div style={{ marginTop: 6, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{d.core_note_vi}</div>
      )}
    </div>
  );
}

function GptBody({ d, onPick }) {
  if (!d) return null;
  if (d.__error) return <div style={{ color: "#c2185b" }}>{d.__error}</div>;
  const collocations = d.collocations || [];
  const structures = d.structures || [];
  const compare = d.compare || [];

  return (
    <div className="stack" style={{ gap: 18 }}>
      {/* Collocation phổ biến — mỗi collocation kèm 1 ví dụ ngay dưới */}
      {collocations.length > 0 && (
        <div>
          <p className="field-label" style={{ margin: "0 0 6px" }}>🔗 Collocation phổ biến</p>
          <div className="card card-pad stack" style={{ background: "var(--surface-2)", gap: 0 }}>
            {collocations.map((c, i) => (
              <div key={i} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
                {/* dòng collocation — đậm, nổi bật */}
                <div style={{ lineHeight: 1.5 }}>
                  <span className="zh" style={{ fontSize: 17, fontWeight: 700 }}>{c.zh}</span>
                  <span style={{ color: "var(--accent-700)", fontWeight: 600 }}> / {c.pinyin}</span>
                  <span style={{ fontWeight: 600 }}> / {c.vi}</span>
                </div>
                {c.note_vi && (
                  <div className="tiny muted" style={{ marginTop: 2, fontStyle: "italic" }}>{c.note_vi}</div>
                )}
                {/* ví dụ — thụt lề, viền trái, chữ nhạt hơn để phân biệt */}
                {Array.isArray(c.examples) && c.examples.length > 0 && (
                  <div style={{ marginTop: 5, marginLeft: 12, paddingLeft: 12,
                    borderLeft: "3px solid var(--accent)" }}>
                    {c.examples.map((ex, k) => (
                      <div key={k} style={{ lineHeight: 1.5, color: "var(--text-soft)",
                        marginTop: k ? 4 : 0 }}>
                        <span className="zh">{ex.zh}</span>
                        {ex.pinyin && <span style={{ color: "var(--accent-700)" }}> / {ex.pinyin}</span>}
                        {ex.vi && <span> / {ex.vi}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cấu trúc — tất cả trong 1 ô, mỗi cấu trúc + 1 ví dụ gộp dòng */}
      {structures.length > 0 && (
        <div>
          <p className="field-label" style={{ margin: "0 0 6px" }}>🏗️ Cấu trúc thường gặp</p>
          <div className="card card-pad" style={{ background: "var(--surface-2)" }}>
            {structures.map((s, i) => (
              <div key={i} style={{ padding: "9px 0", borderTop: i ? "1px solid var(--border)" : "none", lineHeight: 1.55 }}>
                <div>
                  <span className="zh" style={{ fontWeight: 600 }}>{s.pattern}</span>
                  {s.pinyin && <span style={{ color: "var(--accent-700)" }}> / {s.pinyin}</span>}
                  {s.vi && <span> / {s.vi}</span>}
                </div>
                {s.example_zh && (
                  <div style={{ marginTop: 2, color: "var(--text-mute)" }}>
                    → <span className="zh">{s.example_zh}</span>
                    {s.example_pinyin && <span style={{ color: "var(--accent-700)" }}> / {s.example_pinyin}</span>}
                    {s.example_vi && <span> / {s.example_vi}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phân biệt từ gần nghĩa — mỗi từ 1 ô: nghĩa, khác biệt, 3 collocation, 2 ví dụ */}
      {compare.length > 0 && (
        <div>
          <p className="field-label" style={{ margin: "0 0 6px" }}>⚖️ Phân biệt với từ gần nghĩa</p>
          <div className="stack" style={{ gap: 10 }}>
            {compare.map((c, i) => (
              <div key={i} className="card card-pad stack" style={{ background: "var(--surface-2)", gap: 6 }}>
                <div className="row" style={{ alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <span className="zh" style={{ fontSize: 19, cursor: "pointer", color: "var(--accent-700)" }}
                    onClick={() => onPick(c.word)} title="Bấm để tra từ này">{c.word}</span>
                  <span className="tiny" style={{ color: "var(--accent-700)" }}>{c.pinyin}</span>
                  {c.vi && <span style={{ fontWeight: 600 }}>· {c.vi}</span>}
                </div>
                {c.diff_vi && <div style={{ lineHeight: 1.55 }}>{c.diff_vi}</div>}

                {Array.isArray(c.collocations) && c.collocations.length > 0 && (
                  <div>
                    <div className="tiny" style={{ fontWeight: 600, color: "var(--text-mute)", marginBottom: 2 }}>Collocation</div>
                    {c.collocations.map((cc, k) => (
                      <div key={k} style={{ lineHeight: 1.5 }}>
                        <span className="zh" style={{ fontSize: 15 }}>{cc.zh}</span>
                        {cc.pinyin && <span style={{ color: "var(--accent-700)" }}> / {cc.pinyin}</span>}
                        {cc.vi && <span> / {cc.vi}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {Array.isArray(c.examples) && c.examples.length > 0 && (
                  <div>
                    <div className="tiny" style={{ fontWeight: 600, color: "var(--text-mute)", marginBottom: 2 }}>Ví dụ</div>
                    {c.examples.map((ce, k) => (
                      <div key={k} style={{ lineHeight: 1.5 }}>
                        <span className="zh">{ce.zh}</span>
                        {ce.pinyin && <span style={{ color: "var(--accent-700)" }}> / {ce.pinyin}</span>}
                        {ce.vi && <span> / {ce.vi}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExplainBody({ d }) {
  if (!d) return null;
  if (d.__error) return <div style={{ color: "#c2185b" }}>{d.__error}</div>;
  const heading = d.etymology_section || "字源演变";
  const hasBaike = d.source === "baidu_baike";
  return (
    <div className="stack">
      {/* AI giải thích — luôn hiển thị */}
      <p className="field-label" style={{ margin: 0 }}>🤖 AI giải thích</p>
      {d.ai_explain_vi
        ? <div style={{ whiteSpace: "pre-wrap" }}>{d.ai_explain_vi}</div>
        : <div className="muted tiny">Chưa có giải thích từ AI.</div>}

      <div className="divider" />

      {/* Nội dung Baidu Baike */}
      {hasBaike
        ? <span className="badge tieng_trung">Nguồn: Baidu Baike</span>
        : <span className="badge hoc_tap">Không lấy được Baike</span>}
      {hasBaike && d.intro_vi && <div>{d.intro_vi}</div>}
      {hasBaike && (
        <>
          <p className="field-label" style={{ margin: 0 }}>{heading} — Nguồn gốc tự dạng</p>
          {d.etymology_found && d.etymology_vi ? (
            <div style={{ whiteSpace: "pre-wrap" }}>{d.etymology_vi}</div>
          ) : (
            <div className="muted tiny">Không tìm thấy mục nguồn gốc tự dạng trên Baike cho từ này.</div>
          )}
        </>
      )}
      {d.source_url && <a className="tiny" href={d.source_url} target="_blank" rel="noreferrer">Xem trên Baike →</a>}
    </div>
  );
}

function ZdicBody({ d }) {
  if (!d) return null;
  if (d.__error) return <div style={{ color: "#c2185b" }}>{d.__error}</div>;
  if (d.source === "fail") return <div className="muted tiny">{d.source_note || "Không lấy được zdic."}</div>;
  const hasContent = d.basic_vi || d.etymology_vi || d.shuowen_vi;
  const label = d.source === "wiktionary" ? "Nguồn: Wiktionary (zdic timeout)" : "Nguồn: zdic.net (汉典)";
  return (
    <div className="stack">
      <span className="badge tieng_trung">{label}</span>
      {!hasContent && <div className="muted tiny">{d.source_note || "Không có nội dung phù hợp."}</div>}
      {d.basic_vi && (<div>
        <p className="field-label" style={{ margin: 0 }}>基本解释 — Nghĩa cơ bản</p>
        <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{d.basic_vi}</div></div>)}
      {d.etymology_vi && (<div>
        <div className="divider" />
        <p className="field-label" style={{ margin: 0 }}>{d.etymology_section || "字源字形"} — Nguồn gốc tự dạng</p>
        <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{d.etymology_vi}</div></div>)}
      {d.shuowen_vi && (<div>
        <div className="divider" />
        <p className="field-label" style={{ margin: 0 }}>说文解字 — Thuyết văn giải tự</p>
        <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{d.shuowen_vi}</div></div>)}
      {d.source_url && <a className="tiny" href={d.source_url} target="_blank" rel="noreferrer">Xem nguồn →</a>}
    </div>
  );
}
