import { supabase } from "./supabase.js";

// Xuất lịch sử tra cứu tiếng Trung (kèm cache kết quả) ra file JSON tải về máy.
export async function exportBackup(user) {
  if (!user) return;
  const { data } = await supabase
    .from("zhdict_searches")
    .select("*")
    .order("created_at", { ascending: true });

  const backup = {
    app: "ZH Tra cứu",
    version: 2,
    exported_at: new Date().toISOString(),
    user_id: user.id,
    searches: data || [],
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zh-tracuu-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
