import { HANVIET_MAP } from "./hanviet-data.js";

// Tra âm Hán Việt cho 1 chữ hoặc cả từ (ghép âm từng chữ).
// vd "学生" -> "học sinh", "制度" -> "chế độ"
export function hanVietOf(word) {
  if (!word) return null;
  const chars = [...word];
  const readings = chars.map((c) => HANVIET_MAP[c] || null);
  if (readings.every((r) => r)) return readings.join(" ");
  if (readings.some((r) => r)) return readings.map((r, i) => r || chars[i]).join(" ");
  return null;
}
