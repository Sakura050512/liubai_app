-- ============================================================
-- 留白 (Liubai) App —— 会话记忆摘要
-- 在 Supabase SQL Editor 中执行即可（幂等，可重复执行）。
--
-- 目的：Talk（聊聊）页面每次「留住这段对话」时，额外让 AI 生成一段
-- 第一人称的简短摘要（用户提到的事、情绪走向、未解的心结），
-- 下次开始新对话时注入 system prompt，让 AI 记得你最近在想什么。
--
-- 为什么单独建表而不放进 talk_records：
--   1) 摘要很短（约 80 字），取出最近 N 条很便宜；
--   2) 用户可以单独删除记忆而不删掉对话原文；
--   3) talk_records 已上线且有数据，不动它的结构风险最小。
-- ============================================================

create table if not exists public.talk_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  talk_id uuid references public.talk_records (id) on delete cascade,
  title text,
  summary text not null,
  mood text,
  created_at timestamptz not null default now()
);

create index if not exists talk_summaries_user_time_idx
  on public.talk_summaries (user_id, created_at desc);

alter table public.talk_summaries enable row level security;

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

select public.ensure_policy('talk_summaries: 本人可读', 'talk_summaries',
  'create policy "talk_summaries: 本人可读" on public.talk_summaries for select using (auth.uid() = user_id)');
select public.ensure_policy('talk_summaries: 本人可写', 'talk_summaries',
  'create policy "talk_summaries: 本人可写" on public.talk_summaries for insert with check (auth.uid() = user_id)');
select public.ensure_policy('talk_summaries: 本人可改', 'talk_summaries',
  'create policy "talk_summaries: 本人可改" on public.talk_summaries for update using (auth.uid() = user_id) with check (auth.uid() = user_id)');
select public.ensure_policy('talk_summaries: 本人可删', 'talk_summaries',
  'create policy "talk_summaries: 本人可删" on public.talk_summaries for delete using (auth.uid() = user_id)');

drop function if exists public.ensure_policy;

grant all on public.talk_summaries to anon, authenticated;
