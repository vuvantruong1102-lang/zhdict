import { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Login from "./pages/Login.jsx";
import Chinese from "./pages/Chinese.jsx";
import Translate from "./pages/Translate.jsx";
import TranslateEn from "./pages/TranslateEn.jsx";
import History from "./pages/History.jsx";
import Hsk from "./pages/Hsk.jsx";

function Guard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center" style={{ height: "60vh" }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  const loc = useLocation();
  const showSidebar = user && loc.pathname !== "/login";

  const [navHidden, setNavHidden] = useState(() => {
    try { return localStorage.getItem("vtnotes-nav-hidden") === "1"; } catch { return false; }
  });
  function setNav(v) {
    setNavHidden(v);
    try { localStorage.setItem("vtnotes-nav-hidden", v ? "1" : "0"); } catch {}
  }

  return (
    <div className={"app" + (showSidebar && navHidden ? " nav-hidden" : "")}>
      {showSidebar && !navHidden && <Sidebar onHide={() => setNav(true)} />}
      {showSidebar && navHidden && (
        <button className="nav-show" onClick={() => setNav(false)} title="Hiện menu" aria-label="Hiện menu">☰</button>
      )}
      <main className="main">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={<Guard><Chinese /></Guard>} />
          <Route path="/zh" element={<Navigate to="/" replace />} />
          <Route path="/translate" element={<Guard><Translate /></Guard>} />
          <Route path="/translate-en" element={<Guard><TranslateEn /></Guard>} />
          <Route path="/history" element={<Guard><History /></Guard>} />
          <Route path="/hsk" element={<Guard><Hsk /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
