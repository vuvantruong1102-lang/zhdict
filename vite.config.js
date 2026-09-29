import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Khi chạy local nên dùng `vercel dev` để /api hoạt động.
// Nếu chạy `vite` thuần, có thể bật proxy bên dưới trỏ tới `vercel dev` (cổng 3000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // proxy: { "/api": "http://localhost:3000" },
  },
});
