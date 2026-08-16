-- ===========================================================================
-- 심야(深夜) — Supabase 초기 스키마
-- ===========================================================================
-- 실행: Supabase 대시보드 SQL Editor 에서 한 번 실행
-- 또는: supabase db push
-- ===========================================================================

-- ----- profiles -------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  is_bot boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);

-- username 자동 셋업 트리거 (회원가입 시 기본 username 부여)
-- Kakao 비-비즈니스 앱은 이메일을 못 받으므로 (provider_id 기반 fallback)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
  base_username text;
  final_username text;
  counter int := 0;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  -- username 우선순위:
  -- 1) meta.username (이메일 가입자가 직접 지정)
  -- 2) Kakao provider_id (이메일 없는 OAuth 가입)
  -- 3) 이메일 local part
  -- 4) 'user' + uuid 앞 8자리
  base_username := coalesce(
    meta->>'username',
    case
      when meta->>'provider' = 'kakao' and nullif(meta->>'provider_id', '') is not null
        then 'kakao_' || (meta->>'provider_id')
      else null
    end,
    case when new.email is not null then split_part(new.email, '@', 1) else null end,
    'user' || substr(new.id::text, 1, 8)
  );

  base_username := lower(regexp_replace(base_username, '[^a-z0-9_]', '', 'g'));
  if length(base_username) < 2 then
    base_username := 'user' || substr(new.id::text, 1, 8);
  end if;
  final_username := base_username;

  while exists (select 1 from public.profiles where username = final_username) loop
    counter := counter + 1;
    final_username := base_username || counter::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(
      meta->>'display_name',
      meta->>'name',
      meta->>'full_name',
      meta->>'nickname',  -- Kakao 닉네임
      final_username
    ),
    coalesce(
      meta->>'avatar_url',
      meta->>'picture'
    )
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----- posts ----------------------------------------------------------------
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text,
  content text not null,
  image_url text,
  source_url text,
  is_auto boolean not null default false,
  likes_count int not null default 0,
  comments_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc, id desc);
create index if not exists posts_user_id_idx on public.posts (user_id, created_at desc);

-- ----- card_answers --------------------------------------------------------
create table if not exists public.card_answers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  answers jsonb not null,
  post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists card_answers_user_id_idx on public.card_answers (user_id, created_at desc);

-- ----- follows -------------------------------------------------------------
create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists follows_follower_idx on public.follows (follower_id);

-- ----- likes ---------------------------------------------------------------
create table if not exists public.likes (
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists likes_post_id_idx on public.likes (post_id);

-- likes_count 자동 동기화
create or replace function public.sync_likes_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists likes_count_sync on public.likes;
create trigger likes_count_sync
  after insert or delete on public.likes
  for each row execute function public.sync_likes_count();

-- ----- comments ------------------------------------------------------------
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  content text not null check (length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists comments_post_id_idx on public.comments (post_id, created_at desc);
create index if not exists comments_user_id_idx on public.comments (user_id);

-- comments_count 자동 동기화
create or replace function public.sync_comments_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists comments_count_sync on public.comments;
create trigger comments_count_sync
  after insert or delete on public.comments
  for each row execute function public.sync_comments_count();

-- ----- crawl_sources -------------------------------------------------------
create table if not exists public.crawl_sources (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  url text not null,
  type text not null,          -- 'creepypasta_list' | 'naver_blog' | 'rss' | etc.
  active boolean not null default true,
  last_crawled_at timestamptz,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists crawl_sources_active_idx on public.crawl_sources (active) where active = true;

-- ----- crawl_items ---------------------------------------------------------
create table if not exists public.crawl_items (
  id uuid default gen_random_uuid() primary key,
  source_id uuid references public.crawl_sources(id) on delete cascade,
  raw_title text,
  raw_content text not null,
  raw_url text,
  language text default 'ko',
  processed boolean not null default false,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists crawl_items_pending_idx
  on public.crawl_items (processed, created_at) where processed = false;

-- ----- Bot profile (자동 포스팅 전용) ---------------------------------------
-- Vercel Cron 에서 SYSTEM_USER_ID 로 사용. 한 번만 만들고 id 를 환경변수에 넣어도 됨.
-- 아래 함수는 가입된 유저 중 username='__simya_bot' 으로 단일 행 보장.
create or replace function public.ensure_bot_profile()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  bot_id uuid;
begin
  select id into bot_id from public.profiles where username = '__simya_bot' limit 1;
  if bot_id is null then
    -- 시스템 유저는 auth.users 에 없으면 만들 수 없으므로,
    -- 최초 1회는 admin API (service_role) 로 auth.users 에 생성 후 호출.
    -- 여기서는 만약 있다면 true 로 마킹만 한다.
    return null;
  end if;
  update public.profiles set is_bot = true where id = bot_id;
  return bot_id;
end;
$$;

-- ===========================================================================
-- RLS
-- ===========================================================================
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.card_answers enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.crawl_sources enable row level security;
alter table public.crawl_items enable row level security;

-- profiles: 모두 읽기, 본인만 수정
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- posts: 모두 읽기, 로그인 유저는 생성, 본인 글만 수정/삭제
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select using (true);

drop policy if exists posts_insert_auth on public.posts;
create policy posts_insert_auth on public.posts for insert
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists posts_update_self on public.posts;
create policy posts_update_self on public.posts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists posts_delete_self on public.posts;
create policy posts_delete_self on public.posts for delete using (auth.uid() = user_id);

-- card_answers: 본인 것만
drop policy if exists card_answers_all_self on public.card_answers;
create policy card_answers_all_self on public.card_answers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- follows: 누구나 조회, 본인 팔로우만 생성/삭제
drop policy if exists follows_read on public.follows;
create policy follows_read on public.follows for select using (true);

drop policy if exists follows_insert_self on public.follows;
create policy follows_insert_self on public.follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists follows_delete_self on public.follows;
create policy follows_delete_self on public.follows for delete
  using (auth.uid() = follower_id);

-- likes: 누구나 조회, 본인 것만 생성/삭제
drop policy if exists likes_read on public.likes;
create policy likes_read on public.likes for select using (true);

drop policy if exists likes_insert_self on public.likes;
create policy likes_insert_self on public.likes for insert
  with check (auth.uid() = user_id);

drop policy if exists likes_delete_self on public.likes;
create policy likes_delete_self on public.likes for delete
  using (auth.uid() = user_id);

-- comments: 모두 읽기, 로그인 유저는 작성, 본인 것만 삭제
drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select using (true);

drop policy if exists comments_insert_auth on public.comments;
create policy comments_insert_auth on public.comments for insert
  with check (auth.uid() = user_id);

drop policy if exists comments_delete_self on public.comments;
create policy comments_delete_self on public.comments for delete
  using (auth.uid() = user_id);

-- crawl_sources / crawl_items: 일반 유저는 읽기만. service_role 로만 쓰기.
drop policy if exists crawl_sources_read on public.crawl_sources;
create policy crawl_sources_read on public.crawl_sources for select using (true);

drop policy if exists crawl_items_read on public.crawl_items;
create policy crawl_items_read on public.crawl_items for select using (true);

-- ===========================================================================
-- Bot user 생성 SQL (최초 1회, Supabase SQL Editor 에서 실행)
-- ===========================================================================
-- 1) auth.users 에 봇 계정 만들기 (Supabase 는 직접 insert 가 어려우므로
--    Supabase 대시보드 Authentication > Users > Add user > email & password 로
--    simya-bot@simya.app 같은 계정을 만든다.)
-- 2) 그 사용자의 uuid 를 복사해서 아래에 넣고 실행:
--
-- update public.profiles
--   set username = '__simya_bot', display_name = '심야의 그림자', is_bot = true
--   where id = 'PASTE-UUID-HERE';
--
-- 3) 환경변수 SIMYA_BOT_USER_ID 에 그 uuid 저장 → cron 라우트가 사용.
