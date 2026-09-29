# 中文 Tra cứu Tiếng Trung

App tra cứu & học tiếng Trung. Giao diện sáng/tối, tối giản, tối ưu cho mobile (cài được như PWA).

## Chức năng
- **Tra Tiếng Trung** (`/`): tra từ/cụm — pinyin, Hán Việt, nghĩa, zdic, ví dụ, từ đồng nghĩa, giải thích AI.
- **Dịch tiếng Trung** (`/translate`): dán câu/đoạn tiếng Trung, mỗi từ hiện pinyin · Hán · Hán Việt · nghĩa, kèm bản dịch cả câu. Bấm từ để tra chi tiết.
- **Dịch tiếng Anh** (`/translate-en`): dịch câu tiếng Anh.
- **Lịch sử tra cứu** (`/history`): xem lại các từ đã tra, lọc theo cấp HSK / thành ngữ.
- **Từ vựng HSK** (`/hsk`): tra danh sách từ vựng theo cấp.

## Công nghệ
- Frontend: React + Vite + React Router
- Backend: Vercel serverless functions (`/api/*`) + OpenAI
- Dữ liệu người dùng: Supabase (bảng `zhdict_searches` — lịch sử tra cứu (riêng, tách khỏi app cũ), kèm cache kết quả)

## Cài đặt
```bash
npm install
npm run dev      # phát triển
npm run build    # build production
```

## Cơ sở dữ liệu
Chạy `supabase/schema.sql` trong Supabase SQL Editor (tạo bảng `zhdict_searches` + RLS).
Tuỳ chọn: `supabase/add-cedict.sql` để thêm dữ liệu từ điển CC-CEDICT.

## Ghi chú
Phiên bản này đã **loại bỏ toàn bộ phần nhật ký/ghi chú** (Notes, Todo, Thẻ) từ app gốc,
chỉ giữ các chức năng liên quan đến tiếng Trung.
