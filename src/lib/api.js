async function post(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "request_failed");
  return data;
}

export const api = {
  lookup:      (word) => post("/api/lookup", { word }),
  translatevi: (word, definition_en, han_viet) =>
                 post("/api/translatevi", { word, definition_en, han_viet }),
  examples:    (word) => post("/api/examples",  { word }),
  compounds:   (word) => post("/api/compounds", { word }),
  explain:     (word) => post("/api/explain",   { word }),
  zdic:        (word) => post("/api/zdic",      { word }),
  sentence:    (text) => post("/api/sentence",  { text }),
  sentenceEn:  (text) => post("/api/translate-en", { text }),
  ask:         (question, context) => post("/api/ask", { question, context }),
};
