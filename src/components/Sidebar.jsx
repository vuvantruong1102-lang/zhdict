import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { exportBackup } from "../lib/backup.js";
import { getInitialTheme, applyTheme } from "../lib/theme.js";

// ===== Icons (inline SVG, nét mảnh) =====
const stroke = { stroke: "currentColor", fill: "none", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };
const IconBook = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
);
const IconType = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
);
const IconGlobe = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/></svg>
);
const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
);
const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
);
const IconMoon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
);
const IconSun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
);
const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
);

const TOOLS = [
  { to: "/",             label: "Tra Tiếng Trung",  Icon: IconBook },
  { to: "/translate",    label: "Dịch tiếng Trung", Icon: IconType },
  { to: "/translate-en", label: "Dịch tiếng Anh",   Icon: IconGlobe },
  { to: "/history",      label: "Lịch sử tra cứu",  Icon: IconClock },
  { to: "/hsk",          label: "Từ vựng HSK",      Icon: IconGrid },
];

export default function Sidebar({ onHide }) {
  const { user, signOut } = useAuth();
  const loc = useLocation();

  const [backingUp, setBackingUp] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  useEffect(() => { applyTheme(theme); }, [theme]);

  async function doBackup() {
    setBackingUp(true);
    try { await exportBackup(user); } finally { setBackingUp(false); }
  }

  return (
    <aside className="sidebar">
      <div className="nav-scroll">
        <div className="brand">
          <span className="brand-mark">中</span>
          <span className="brand-name">中文 Tra cứu</span>
          {onHide && (
            <button className="nav-collapse" onClick={onHide} title="Ẩn menu" aria-label="Ẩn menu">«</button>
          )}
        </div>

        <div className="nav-section">
          <div className="nav-head"><span>Công cụ</span></div>
          {TOOLS.map(({ to, label, Icon }) => (
            <Link key={to} to={to}
              className={"nav-item" + (loc.pathname === to ? " active" : "")}>
              <span className="nav-ico"><Icon /></span>
              <span className="nav-label">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="nav-bottom">
        <button className="nav-item" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
          <span className="nav-ico">{theme === "dark" ? <IconSun /> : <IconMoon />}</span>
          <span className="nav-label">{theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}</span>
        </button>
        <button className="nav-item" onClick={doBackup} disabled={backingUp}>
          <span className="nav-ico"><IconDownload /></span>
          <span className="nav-label">{backingUp ? "Đang tải…" : "Sao lưu lịch sử"}</span>
        </button>
        <button className="nav-item signout" onClick={() => signOut()}>
          <span className="nav-ico"><IconLogout /></span>
          <span className="nav-label">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
