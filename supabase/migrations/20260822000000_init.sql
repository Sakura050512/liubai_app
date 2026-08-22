-- ============================================================
-- 留白 (Liubai) App —— 完整数据库 Schema 迁移
-- 在 Supabase SQL Editor 中执行即可。
-- 幂等设计：已存在的表/列/策略都会跳过，可安全重复执行，
-- 也适用于已有数据的线上库。
--
-- 注意：若你的线上库中 talk_records 已存在但结构不同（空表），
-- 建议先执行  DROP TABLE public.talk_records;  再运行本迁移。
-- ============================================================

-- ---------- 情绪打卡 ----------
create table if not exists public.mood_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mood text not null,
  emoji text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists mood_records_user_time_idx
  on public.mood_records (user_id, created_at desc);

-- ---------- 日记 ----------
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt text,
  content text not null,
  ai_reflection text,
  created_at timestamptz not null default now()
);

create index if not exists journal_entries_user_time_idx
  on public.journal_entries (user_id, created_at desc);

-- ---------- 心里话（树洞记录） ----------
-- 用户主动选择"留住这段时光"时写入，条数 = 留下的次数。
-- 若表已存在则补充缺失的列（幂等升级）。
create table if not exists public.talk_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.talk_records add column if not exists mode text;
alter table public.talk_records add column if not exists content text;

create index if not exists talk_records_user_time_idx
  on public.talk_records (user_id, created_at desc);

-- ---------- 词典收藏 ----------
create table if not exists public.dictionary_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_zh text not null,
  created_at timestamptz not null default now(),
  unique (user_id, entry_zh)
);

create index if not exists dictionary_favorites_user_idx
  on public.dictionary_favorites (user_id, created_at desc);

-- ---------- 用户资料 ----------
create table if not exists public.users_profile (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null default '旅行者',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 行级安全（RLS）：心理健康数据，必须每人只能看自己的
-- 用 pg_policies 检查保证幂等（CREATE POLICY 不支持 IF NOT EXISTS）
-- ============================================================
alter table public.mood_records enable row level security;
alter table public.journal_entries enable row level security;
alter table public.talk_records enable row level security;
alter table public.dictionary_favorites enable row level security;
alter table public.users_profile enable row level security;

-- 临时辅助函数：策略不存在时才创建
create or replace function public.ensure_policy(p_name text, p_table text, p_sql text)
returns void language plpgsql as $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = p_table and policyname = p_name
  ) then
    execute p_sql;
  end if;
end $$;

select public.ensure_policy('mood_records: 本人可读', 'mood_records',
  'create policy "mood_records: 本人可读" on public.mood_records for select using (auth.uid() = user_id)');
select public.ensure_policy('mood_records: 本人可写', 'mood_records',
  'create policy "mood_records: 本人可写" on public.mood_records for insert with check (auth.uid() = user_id)');
select public.ensure_policy('mood_records: 本人可改', 'mood_records',
  'create policy "mood_records: 本人可改" on public.mood_records for update using (auth.uid() = user_id) with check (auth.uid() = user_id)');
select public.ensure_policy('mood_records: 本人可删', 'mood_records',
  'create policy "mood_records: 本人可删" on public.mood_records for delete using (auth.uid() = user_id)');

select public.ensure_policy('journal_entries: 本人可读', 'journal_entries',
  'create policy "journal_entries: 本人可读" on public.journal_entries for select using (auth.uid() = user_id)');
select public.ensure_policy('journal_entries: 本人可写', 'journal_entries',
  'create policy "journal_entries: 本人可写" on public.journal_entries for insert with check (auth.uid() = user_id)');
select public.ensure_policy('journal_entries: 本人可改', 'journal_entries',
  'create policy "journal_entries: 本人可改" on public.journal_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id)');
select public.ensure_policy('journal_entries: 本人可删', 'journal_entries',
  'create policy "journal_entries: 本人可删" on public.journal_entries for delete using (auth.uid() = user_id)');

select public.ensure_policy('talk_records: 本人可读', 'talk_records',
  'create policy "talk_records: 本人可读" on public.talk_records for select using (auth.uid() = user_id)');
select public.ensure_policy('talk_records: 本人可写', 'talk_records',
  'create policy "talk_records: 本人可写" on public.talk_records for insert with check (auth.uid() = user_id)');
select public.ensure_policy('talk_records: 本人可改', 'talk_records',
  'create policy "talk_records: 本人可改" on public.talk_records for update using (auth.uid() = user_id) with check (auth.uid() = user_id)');
select public.ensure_policy('talk_records: 本人可删', 'talk_records',
  'create policy "talk_records: 本人可删" on public.talk_records for delete using (auth.uid() = user_id)');

select public.ensure_policy('favorites: 本人可读', 'dictionary_favorites',
  'create policy "favorites: 本人可读" on public.dictionary_favorites for select using (auth.uid() = user_id)');
select public.ensure_policy('favorites: 本人可写', 'dictionary_favorites',
  'create policy "favorites: 本人可写" on public.dictionary_favorites for insert with check (auth.uid() = user_id)');
select public.ensure_policy('favorites: 本人可改', 'dictionary_favorites',
  'create policy "favorites: 本人可改" on public.dictionary_favorites for update using (auth.uid() = user_id) with check (auth.uid() = user_id)');
select public.ensure_policy('favorites: 本人可删', 'dictionary_favorites',
  'create policy "favorites: 本人可删" on public.dictionary_favorites for delete using (auth.uid() = user_id)');

select public.ensure_policy('profile: 本人可读', 'users_profile',
  'create policy "profile: 本人可读" on public.users_profile for select using (auth.uid() = id)');
select public.ensure_policy('profile: 本人可建', 'users_profile',
  'create policy "profile: 本人可建" on public.users_profile for insert with check (auth.uid() = id)');
select public.ensure_policy('profile: 本人可改', 'users_profile',
  'create policy "profile: 本人可改" on public.users_profile for update using (auth.uid() = id) with check (auth.uid() = id)');

-- 用完即弃
drop function if exists public.ensure_policy;

-- ============================================================
-- 权限（配合 RLS 使用；匿名角色仅经认证路径访问）
-- ============================================================
grant usage on schema public to anon, authenticated;
grant all on public.mood_records to anon, authenticated;
grant all on public.journal_entries to anon, authenticated;
grant all on public.talk_records to anon, authenticated;
grant all on public.dictionary_favorites to anon, authenticated;
grant all on public.users_profile to anon, authenticated;
