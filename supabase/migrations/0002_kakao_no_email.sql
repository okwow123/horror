-- ===========================================================================
-- 0002 — Kakao 비-비즈니스 앱 호환
-- ===========================================================================
-- 이미 0001_init.sql 을 적용한 DB 에서 실행:
--   Supabase 대시보드 → SQL Editor → 본 파일 통째로 실행
-- ===========================================================================

-- handle_new_user 트리거: Kakao OAuth (이메일 null) 케이스 대응
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
      meta->>'nickname',
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

-- 기존 트리거는 유지 (함수만 교체). 만약 트리거가 없다면 아래 한 줄 실행:
-- drop trigger if exists on_auth_user_created on auth.users;
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute function public.handle_new_user();
