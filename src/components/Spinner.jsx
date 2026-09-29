export default function Spinner({ label }) {
  return (
    <div className="row" style={{ color: "var(--text-soft)", fontSize: 14 }}>
      <div className="spinner" /> {label || "Đang xử lý…"}
    </div>
  );
}
