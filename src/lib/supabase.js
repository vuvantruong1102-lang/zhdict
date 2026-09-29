import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.warn("Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY trong .env");
}

// Chọn nơi lưu phiên đăng nhập:
// - Điện thoại / PWA: dùng sessionStorage -> đóng app là mất phiên,
//   mở lại phải đăng nhập lại email + mật khẩu.
// - Máy tính: dùng localStorage -> giữ đăng nhập như bình thường.
function pickStorage() {
  try {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
    return standalone || mobile ? window.sessionStorage : window.localStorage;
  } catch {
    return window.localStorage;
  }
}

export const supabase = createClient(url, anon, {
  auth: {
    storage: pickStorage(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
