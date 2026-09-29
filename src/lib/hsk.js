import { HSK } from "./hsk-data.js";
let _map = null;
function ensureMap() {
  if (!_map) { _map = new Map(); for (const r of HSK) if (!_map.has(r[0])) _map.set(r[0], r[1]); }
  return _map;
}
export function hskLevel(word) { return ensureMap().get(word) || 0; }        // 0 = ngoài HSK
export function hskLabel(level) { return !level ? null : (level >= 7 ? "HSK 7-9" : "HSK " + level); }
export { HSK };
