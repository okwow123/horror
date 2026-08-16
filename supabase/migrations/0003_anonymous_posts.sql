-- ===========================================================================
-- 0003: 익명 게시 기능
-- ===========================================================================
-- 사용자가 글을 쓸 때 "익명으로 게시" 를 켜면
--   is_anonymous = true 로 저장되고, 피드/상세/프로필에서 작성자가 "익명" 으로 표시됨.
-- user_id 는 그대로 유지 (RLS, 좋아요/팔로우 같은 개인화 기능에 필요).
-- ===========================================================================

alter table public.posts
  add column if not exists is_anonymous boolean not null default false;

create index if not exists posts_anon_idx on public.posts (is_anonymous) where is_anonymous = true;

-- (선택) 기존 row 는 모두 false — default 가 false 라서 자동으로 처리됨.
-- 만약 특정 사용자 글을 익명으로 강제하고 싶으면:
-- update public.posts set is_anonymous = false;  -- 명시적 초기화
