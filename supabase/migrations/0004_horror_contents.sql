-- ===========================================================================
-- 0004: horror_contents — 사용자가 긁어온 무서운 이야기 원문 소스 풀
-- ===========================================================================
-- 사용자 멘트: "내가 긁어온 소스 자체가 horror_contents 테이블에 있어"
-- 컬럼: subject (제목) + content (본문). 다른 컬럼 없음.
-- AI 자동 글쓰기 (/post/auto) 가 이 테이블에서 표본을 추출해
-- MiniMax 에게 학습시켜 새로운 이야기를 한 편 만들어낸다.
--
-- 만약 이미 다른 컬럼 구조로 만들어진 DB 라면:
--   - 본 파일이 CREATE 만 하고 (if not exists) 멈추면 OK
--   - 컬럼이 다른 경우 ALTER TABLE 로 맞춰주세요
-- ===========================================================================

create table if not exists public.horror_contents (
  id uuid default gen_random_uuid() primary key,
  subject text,
  content text not null,
  source_url text,
  language text not null default 'ko',
  created_at timestamptz not null default now()
);

-- 기존에 다른 컬럼 구조(title 등) 으로 만들어져 있다면 subject/content 로 맞춤.
-- 이미 subject/content 가 있으면 이 두 줄은 no-op.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'horror_contents'
  ) then
    -- subject 컬럼이 없으면 추가
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'horror_contents' and column_name = 'subject'
    ) then
      alter table public.horror_contents add column subject text;
    end if;
    -- content 컬럼이 없으면 추가
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'horror_contents' and column_name = 'content'
    ) then
      alter table public.horror_contents add column content text;
      update public.horror_contents set content = '' where content is null;
      alter table public.horror_contents alter column content set not null;
    end if;
  end if;
end $$;

create index if not exists horror_contents_created_at_idx
  on public.horror_contents (created_at desc, id desc);

-- ----- RLS -----------------------------------------------------------------
alter table public.horror_contents enable row level security;

-- AI 가 읽어갈 수 있어야 하므로 anon/authenticated 모두 select 허용.
-- (이 테이블은 크롤/큐레이션된 외부 원문이라 사용자 작성 콘텐츠가 아님)
drop policy if exists horror_contents_read on public.horror_contents;
create policy horror_contents_read on public.horror_contents for select using (true);

-- insert/update/delete 는 service_role 로만 (cron / admin 스크립트).
-- 별도 policy 를 두지 않으면 anon/authenticated 가 쓸 수 없다.
