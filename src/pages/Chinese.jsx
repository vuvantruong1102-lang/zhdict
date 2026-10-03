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

  // Dịch nghĩa sang tiếng Việt (AI) — on demand
  async function translateVi() {
    if (!word) return;
    const lk = data.lookup || {};
    setLoading((p) => ({ ...p, vi: true }));
    try {
      const res = await api.translatevi(word, lk.definition_en || "", lk.han_viet || "");
      setData((prev) => {
        const nextLookup = {
          ...prev.lookup,
          meaning_vi: res.meaning_vi,
          han_viet: res.han_viet || prev.lookup?.han_viet || null,
        };
        const next = { ...prev, lookup: nextLookup };
        saveCache(word, next);
        return next;
      });
    } catch (e) {
      setData((prev) => ({ ...prev, lookup: { ...prev.lookup, meaning_vi: "⚠ Lỗi dịch, thử lại." } }));
    } finally {
      setLoading((p) => ({ ...p, vi: false }));
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
                    <span className="zh" style={{ fontSize: 42, fontWeight: 500 }}>{word}</span>
                    <span style={{ color: "var(--accent-700)", fontWeight: 600, fontSize: 19 }}>
                      {pinyin(word, { toneType: "symbol" })}
                    </span>
                  </div>
                  <button className="btn ghost sm" onClick={() => speak(word)}>🔊 Phát âm</button>
                </div>
              </div>

              <Section title="Phồn thể · Pinyin · Hán Việt · Nghĩa"
                loading={loading.lookup} onRefresh={() => fetchSection(word, "lookup")}>
                <LookupBody d={data.lookup} word={word}
                  hanVietLocal={hanVietFn ? hanVietFn(word) : null}
                  onTranslateVi={translateVi} viLoading={loading.vi} />
              </Section>

              <Accordion title="ChatGPT"
                loaded={!!data.gpt} loading={loading.gpt}
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

function LookupBody({ d, word, hanVietLocal, onTranslateVi, viLoading }) {
  if (!d) return <div className="muted tiny">Đang tra…</div>;
  if (d.__error) return <div style={{ color: "#c2185b" }}>{d.__error}</div>;
  return (
    <div className="stack">
      {d.traditional && (
        <div><b>Phồn thể:</b> <span className="zh" style={{ fontSize: 18 }}>{d.traditional}</span>
          {d.traditional === word && <span className="tiny muted"> (giản thể và phồn thể giống nhau)</span>}
        </div>
      )}
      <div><b>Pinyin:</b> <span style={{ color: "var(--accent-700)" }}>{pinyin(word, { toneType: "symbol" })}</span></div>
      <div><b>Hán Việt:</b> {hanVietLocal || d.han_viet || "—"}</div>

      {d.definition_en && (
        <div>
          <b>Nghĩa (Anh):</b>
          <div style={{ whiteSpace: "pre-wrap", marginTop: 2 }}>{d.definition_en}</div>
        </div>
      )}

      {d.meaning_vi ? (
        <div><b>Nghĩa (Việt):</b> {d.meaning_vi}</div>
      ) : (
        <div>
          <button className="btn ghost sm" onClick={onTranslateVi} disabled={viLoading}
            title="Gọi AI dịch sang tiếng Việt (~2 VND). Sau đó cache miễn phí.">
            {viLoading ? "Đang dịch…" : (d.definition_en ? "▾ Dịch nghĩa sang tiếng Việt (AI)" : "▾ Lấy nghĩa tiếng Việt (AI)")}
          </button>
          {!d.in_cedict && (
            <div className="tiny muted" style={{ marginTop: 6 }}>
              Không có trong CC-CEDICT — AI sẽ tự tạo nghĩa khi bạn bấm.
            </div>
          )}
        </div>
      )}

      {(d.in_cedict || d.han_viet) && (
        <div className="tiny muted" style={{ marginTop: 2 }}>
          Nguồn: {d.in_cedict && "CC-CEDICT"}{d.in_cedict && d.han_viet && " · "}{d.han_viet && "Wiktionary"}
        </div>
      )}
    </div>
  );
}

function GptBody({ d, onPick }) {
  if (!d) return null;
  if (d.__error) return <div style={{ color: "#c2185b" }}>{d.__error}</div>;
  const examples = d.examples || [];
  const collocations = d.collocations || [];
  const structures = d.structures || [];
  const compare = d.compare || [];

  return (
    <div className="stack" style={{ gap: 18 }}>
      {/* 1. Nghĩa cốt lõi — ô nền màu nổi bật */}
      {d.core_vi && (
        <div style={{
          borderLeft: "4px solid #dc143b",
          background: "rgba(220,20,59,0.06)",
          borderRadius: 10, padding: "12px 16px",
        }}>
          <div className="field-label" style={{ margin: 0, color: "#dc143b" }}>✦ Nghĩa cốt lõi</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{d.core_vi}</div>
          {d.core_note_vi && (
            <div style={{ marginTop: 6, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{d.core_note_vi}</div>
          )}
        </div>
      )}

      {/* 2. Câu ví dụ */}
      {examples.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <p className="field-label" style={{ margin: 0 }}>📝 Câu ví dụ ({examples.length})</p>
          {examples.map((ex, i) => (
            <div key={i} className="card card-pad stack" style={{ background: "var(--surface-2)", gap: 2 }}>
              {ex.collocation && (
                <div className="tiny" style={{ fontWeight: 600, color: "var(--accent-700)" }}>{ex.collocation}</div>
              )}
              <div className="zh" style={{ fontSize: 18 }}>{ex.zh}</div>
              <div className="tiny" style={{ color: "var(--accent-700)" }}>{ex.pinyin}</div>
              <div>{ex.vi}</div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Collocation phổ biến */}
      {collocations.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <p className="field-label" style={{ margin: 0 }}>🔗 Collocation phổ biến ({collocations.length})</p>
          {collocations.map((c, i) => (
            <div key={i} className="row" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 12,
              padding: "6px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
              <div className="row" style={{ alignItems: "baseline", gap: 8, flexShrink: 0 }}>
                <span className="zh" style={{ fontSize: 17 }}>{c.zh}</span>
                <span className="tiny" style={{ color: "var(--accent-700)" }}>{c.pinyin}</span>
              </div>
              <span style={{ textAlign: "right" }}>{c.vi}</span>
            </div>
          ))}
        </div>
      )}

      {/* 4. Cấu trúc thường gặp */}
      {structures.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <p className="field-label" style={{ margin: 0 }}>🏗️ Cấu trúc thường gặp ({structures.length})</p>
          {structures.map((s, i) => (
            <div key={i} className="card card-pad stack" style={{ background: "var(--surface-2)", gap: 3 }}>
              <div className="zh" style={{ fontSize: 17, fontWeight: 600 }}>{s.pattern}</div>
              {s.pinyin && <div className="tiny" style={{ color: "var(--accent-700)" }}>{s.pinyin}</div>}
              {s.vi && <div>{s.vi}</div>}
              {s.example_zh && (
                <div className="zh tiny" style={{ marginTop: 2, color: "var(--text-mute)" }}>→ {s.example_zh}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 5. Phân biệt từ gần nghĩa */}
      {compare.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <p className="field-label" style={{ margin: 0 }}>⚖️ Phân biệt với từ gần nghĩa ({compare.length})</p>
          {compare.map((c, i) => (
            <div key={i} className="card card-pad stack" style={{ background: "var(--surface-2)", gap: 3 }}>
              <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
                <span className="zh" style={{ fontSize: 18, cursor: "pointer", color: "var(--accent-700)" }}
                  onClick={() => onPick(c.word)} title="Bấm để tra từ này">{c.word}</span>
                <span className="tiny" style={{ color: "var(--accent-700)" }}>{c.pinyin}</span>
                {c.vi && <span className="tiny muted">· {c.vi}</span>}
              </div>
              {c.diff_vi && <div>{c.diff_vi}</div>}
            </div>
          ))}
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
