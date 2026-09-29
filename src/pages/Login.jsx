import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

// Email mặc định để đăng nhập.
// Ưu tiên biến môi trường VITE_DEFAULT_EMAIL (đặt trong Vercel để không
// lộ email trong code). Nếu không đặt thì dùng chuỗi bên dưới —
// >>> ĐỔI "ban@email.com" thành email bạn đang dùng <<<
const DEFAULT_EMAIL = import.meta.env.VITE_DEFAULT_EMAIL || "ban@email.com";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [other, setOther] = useState(false); // dùng email khác?
  const [mode, setMode] = useState("in");

  async function submit() {
    setErr(""); setMsg(""); setBusy(true);
    const fn = mode === "in" ? signIn : signUp;
    const { error } = await fn(email.trim(), pass);
    setBusy(false);
    if (error) return setErr(error.message);
    if (mode === "up") setMsg("Đã tạo tài khoản. Nếu cần xác nhận email, kiểm tra hộp thư rồi đăng nhập.");
  }

  return (
    <div className="center" style={{ minHeight: "82vh" }}>
      <div style={{ width: 380, maxWidth: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="brand-mark" style={{ width: 44, height: 44, fontSize: 18, margin: "0 auto" }}>V</div>
          <h1 className="page-title" style={{ marginTop: 14, fontSize: 24 }}>VTNotes</h1>
          <p className="page-sub" style={{ marginTop: 6 }}>My notes</p>
        </div>

        <div className="card card-pad stack">
          {!other ? (
            <div>
              <p className="field-label">Tài khoản</p>
              <div style={{ padding: "11px 14px", borderRadius: 10, background: "var(--surface-2)",
                border: "1px solid var(--border)", fontSize: 15, wordBreak: "break-all" }}>
                {email}
              </div>
            </div>
          ) : (
            <div>
              <p className="field-label">Email</p>
              <input className="input" type="email" value={email} autoCapitalize="none"
                onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" />
            </div>
          )}

          <div>
            <p className="field-label">Mật khẩu</p>
            <input className="input" type="password" value={pass} autoFocus
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••••" />
          </div>

          {err && <div className="tiny" style={{ color: "#c2185b" }}>{err}</div>}
          {msg && <div className="tiny" style={{ color: "var(--accent-700)" }}>{msg}</div>}

          <button className="btn block" onClick={submit} disabled={busy || !email || !pass}>
            {busy ? "Đang xử lý…" : mode === "in" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>

          <div className="tiny muted center">
            <button onClick={() => { if (other) setEmail(DEFAULT_EMAIL); setOther(!other); setErr(""); setMode("in"); }}
              style={{ color: "var(--accent-700)", fontWeight: 600 }}>
              {other ? "← Dùng email mặc định" : "Dùng email khác"}
            </button>
            {other && (
              <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(""); }}
                style={{ color: "var(--accent-700)", fontWeight: 600, marginLeft: 14 }}>
                {mode === "in" ? "Đăng ký" : "Đăng nhập"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
