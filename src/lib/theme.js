// Quản lý giao diện sáng/tối. Lưu lựa chọn vào localStorage (không nhạy cảm),
// mặc định theo cài đặt hệ thống (prefers-color-scheme) nếu chưa chọn.
const KEY = "vtnotes-theme";

export function getInitialTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  try {
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {}
  return "light";
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#15161a" : "#00A82D");
  try { localStorage.setItem(KEY, theme); } catch {}
}
