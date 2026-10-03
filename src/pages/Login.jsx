import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

// Email đăng nhập cố định. Có thể ghi đè bằng biến môi trường
// VITE_DEFAULT_EMAIL trên Vercel nếu muốn đổi mà không sửa code.
const LOGIN_EMAIL = import.meta.env.VITE_DEFAULT_EMAIL || "vuvantruong.1102@gmail.com";

export default function Login() {
  const { signIn } = useAuth();
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(""); setBusy(true);
    const { error } = await signIn(LOGIN_EMAIL, pass);
    setBusy(false);
    if (error) setErr(error.message);
  }

  return (
    <div className="center" style={{ minHeight: "82vh" }}>
      <div style={{ width: 380, maxWidth: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="brand-mark" style={{ width: 44, height: 44, fontSize: 22, margin: "0 auto" }}>志</div>
          <h1 className="page-title" style={{ marginTop: 14, fontSize: 24 }}>ZDICT</h1>
          <p className="page-sub" style={{ marginTop: 6 }}>Tra cứu Tiếng Trung</p>
        </div>

        <div className="card card-pad stack">
          <div>
            <p className="field-label">Mật khẩu</p>
            <input className="input" type="password" value={pass} autoFocus
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••••" />
          </div>

          {err && <div className="tiny" style={{ color: "#c2185b" }}>{err}</div>}

          <button className="btn block" onClick={submit} disabled={busy || !pass}>
            {busy ? "Đang xử lý…" : "Đăng nhập"}
          </button>
        </div>
      </div>
    </div>
  );
}
