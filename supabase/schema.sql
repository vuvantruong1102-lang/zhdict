-- ============================================================
--  Schema cho app Tra cứu Tiếng Trung (BẢN MỚI).
--  Dùng CHUNG project Supabase với app cũ (bản còn nhật ký).
--  Bảng lịch sử tra cứu dùng tiền tố zhdict_ để TÁCH RIÊNG,
--  không đụng tới zhnote_searches của app cũ.
--  Chạy file này 1 lần trong Supabase SQL Editor.
-- ============================================================

-- LỊCH SỬ TRA TỪ của app mới (kiêm cache kết quả từng nút) -----
--    data jsonb gom: { lookup, translate, explain, examples, synonyms }
create table if not exists public.zhdict_searches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  word        text not null,
  pinyin      text default '',
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, word)
);
create index if not exists zhdict_searches_user_idx on public.zhdict_searches(user_id, updated_at desc);

-- ROW LEVEL SECURITY ------------------------------------------
alter table public.zhdict_searches enable row level security;

create policy "zhdict_searches_own" on public.zhdict_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tự cập nhật updated_at --------------------------------------
-- Dùng chung hàm zhnote_touch_updated_at() nếu app cũ đã tạo;
-- create or replace nên chạy lại vẫn an toàn.
create or replace function public.zhnote_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists zhdict_searches_touch on public.zhdict_searches;
create trigger zhdict_searches_touch before update on public.zhdict_searches
  for each row execute function public.zhnote_touch_updated_at();
