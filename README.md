# 심야 (深夜) — 공포 이야기 SNS

> 카드에 답하기만 하면, 어둠이 이야기를 써준다.

Next.js 14 + Supabase + Vercel + MiniMax 로 만든 인스타그램 스타일 공포 이야기 피드.
사람이 없어도 AI 봇이 크롤링한 소재로 매일 밤 피드를 채운다.

## ✨ 기능

- 🩸 **카드 기반 스토리 생성** — 5~6장의 빨간 카드(Q&A)로 1분 안에 공포 단편 생성
- 📱 **인스타그램 스타일 무한 피드** — cursor 기반 페이지네이션
- ❤️ **좋아요 / 댓글**
- 👥 **팔로우 / 프로필**
- 🤖 **AI 자동 포스팅** — Vercel Cron 으로 6시간마다 크롤 → AI 리라이팅 → 자동 게시
- 🌐 **카카오 OAuth + 이메일 매직링크**
- 🌑 **공포 무드 UI** — blood/midnight 컬러, flicker 애니메이션, serif 제목

## 🛠 스택

| | |
|---|---|
| Framework | Next.js 14 App Router |
| DB / Auth | Supabase (Postgres + RLS) |
| AI | MiniMax (`MiniMax-M3`) |
| Hosting | Vercel (Cron 포함) |
| Crawler | cheerio (네이티브 fetch) |
| Style | Tailwind + 커스텀 디자인 토큰 |

## 🚀 셋업

### 1) 의존성

```bash
cd /Users/kimminje/workspace/horror
npm install
```

### 2) 환경변수

```bash
cp .env.example .env.local
# .env.local 채우기
```

### 3) Supabase 마이그레이션

Supabase 대시보드 → SQL Editor → `supabase/migrations/0001_init.sql` 통째로 실행.

### 4) Kakao OAuth (직접 호출 — Supabase Kakao provider 우회)

> ⚠️ Supabase 의 Kakao provider 는 `account_email` 을 default scope 에 강제 박아서 비-비즈니스 앱에서 항상 동의항목 에러가 남. 그래서 **Kakao REST API 를 직접 호출**하고, 결과로 받은 user info 로 Supabase admin API 를 통해 user 를 생성/조회. (`account_email` 안 받음)

**Kakao Developers 설정** (https://developers.kakao.com):

1. 내 애플리케이션 → 앱 선택 → **앱 설정** → **플랫폼** → **Web 플랫폼 등록**
   - 사이트 도메인: `http://localhost:3000` (개발), `https://<your-domain>` (운영)
2. **앱 설정** → **카카오 로그인** → **Redirect URI 등록**
   - `http://localhost:3000/auth/kakao/callback`
   - `https://<your-domain>/auth/kakao/callback`
3. **카카오 로그인** → **동의항목**: `닉네임`, `프로필 사진` 은 기본 활성화. `이메일` 은 **비활성화** 상태로 두기 (비즈니스 앱 아닐 때).
4. **앱 설정** → **보안** → **Client Secret**: 발급 (활성화 ON). 코드/시크릿 발급.
5. **제품 설정** → **카카오 로그인** 활성화 상태 ON.
6. **앱 키** 의 **REST API 키** 복사 → `.env.local` 의 `KAKAO_CLIENT_ID`
7. 위 4에서 발급한 Client Secret → `.env.local` 의 `KAKAO_CLIENT_SECRET`

**.env.local** 예시:
```
KAKAO_CLIENT_ID=abcd1234...
KAKAO_CLIENT_SECRET=kxcv...
```

**Supabase 대시보드**:
- Authentication → Providers → Kakao: **Enable 끄기** (더이상 안 씀)
- Email provider: Magic Link 활성화 (이메일 로그인은 그대로 사용)

**동작 흐름**:
1. 유저가 "카카오로 시작하기" 클릭
2. `/auth/kakao/start` → Kakao OAuth URL 로 redirect (`scope=profile_nickname profile_image`)
3. Kakao 동의화면 → 유저가 닉네임/사진만 동의 (이메일 항목 없음)
4. `/auth/kakao/callback?code=...` 으로 복귀
5. 서버: code → access_token 교환 → user info 조회 (id, nickname, profile_image)
6. Supabase admin: `generateLink({ type: 'magiclink', email: 'kakao-{id}@kakao.simya.app' })`
7. `action_link` 의 `token_hash` 를 `/auth/kakao/done` 페이지로 전달
8. 클라이언트: `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })` 로 세션 확립
9. 홈으로 redirect, 로그인 완료

**Kakao 유저 특징**:
- `auth.users.email` = `kakao-{kakao_id}@kakao.simya.app` (synthetic, unique)
- `profiles.username` = `kakao_{kakao_id}` (트리거가 자동 생성)
- `profiles.display_name` = Kakao 닉네임
- `profiles.avatar_url` = Kakao 프로필 이미지 (만료 가능 — 장기적으로 Storage 복사 권장)

### 5) 봇 유저 만들기 (자동 포스팅용)

1. Supabase 대시보드 → Authentication → Users → Add user
   - Email: `simya-bot@simya.app` (아무거나)
   - Password: 아무거나 (자동 로그인 X)
   - Auto Confirm User: ON
2. 생성된 user 의 UUID 복사
3. SQL Editor 에서:
   ```sql
   update public.profiles
     set username = '__simya_bot', display_name = '심야의 그림자', is_bot = true
     where id = 'PASTE-UUID-HERE';
   ```
4. `.env.local` 에 `SIMYA_BOT_USER_ID=<UUID>` 추가

### 6) 자동 포스팅 모드: AI 랜덤 생성 (기본)

심야는 **크롤링 없이** AI 가 매번 새로운 무서운 이야기를 만들어서 게시합니다.

- `lib/random-story.ts` 에 30+ 컨셉 풀 (장소 × 상황 × 결말 힌트)
- 호출 시 무작위로 1개 뽑아서 → 컨셉 + 결말 힌트 + 톤을 prompt 로 → AI 가 1인칭 700~1100자 단편 생성
- 저작권 리스크 없음 (출처/원문 0)
- AI 가 죽어도 템플릿 fallback 으로 일단 게시

**수동 트리거**:
- `/admin` → "AI 무서운 이야기 1편" / "3편" 버튼
- 또는 curl: `curl 'http://localhost:3000/api/admin/trigger?steps=generate&count=3&secret=YOUR_SECRET'`

**자동 트리거** (`vercel.json`):
- `0 */6 * * *` — 매 6시간 1편 자동 게시
- Hobby Vercel 은 cron 1일 1회 제한. 더 자주 돌리려면 Pro/Enterprise 또는 `/admin` 수동

**컨셉 풀 추가**: `lib/random-story.ts` 의 `SEEDS` 배열에 `{ place, setup, twist, tone }` 객체 추가만 하면 됨.

### 7) (선택) 크롤 모드

`lib/crawler.ts` 와 `/api/admin/trigger?steps=crawl,post` 는 라이브러리로 남아있음. Reddit/Creepypasta/Naver 에서 긁어와서 리라이팅하려면 `npx tsx scripts/seed-sources.ts` 후 admin 의 (구) 크롤/포스트 버튼 사용. 단, 기본 cron 은 AI 생성 모드.

### 7) Vercel 배포

```bash
vercel
```

Vercel 대시보드에서:
- Project Settings → Environment Variables: `.env.local` 내용 등록
- `vercel.json` 의 cron 스케줄은 자동 적용 (매 6시간 crawl, 매 8시간 post)
- ⚠️ Hobby 플랜은 cron 하루 1회. Pro/Enterprise 가 더 자주 가능.

## 🧪 로컬 개발

```bash
npm run dev
# http://localhost:3000
```

수동으로 크롤/포스팅 트리거:
```bash
curl http://localhost:3000/api/cron/crawl
curl http://localhost:3000/api/cron/post
# CRON_SECRET 설정 시 ?secret=xxx 또는 Authorization: Bearer xxx
```

## 📂 구조

```
app/
  page.tsx              피드 (홈)
  login/                로그인
  post/
    create/             카드 기반 생성
  profile/[username]/   유저 프로필
  api/
    posts/              피드 GET / POST
    posts/[id]/like/    좋아요 토글
    posts/[id]/comments/ 댓글 CRUD
    follow/             팔로우 토글
    cron/crawl/         6시간마다 크롤
    cron/post/          8시간마다 AI 포스팅
components/
  Feed.tsx, PostCard.tsx, CardFlow.tsx,
  CommentSection.tsx, FollowButton.tsx, TopNav.tsx
lib/
  supabase/             client/server/middleware/database.types
  story.ts              카드/크롤 → 이야기 생성
  minimax.ts            MiniMax API 래퍼
  crawler.ts            creepypasta / naver_blog / rss
  posts.ts, utils.ts, types.ts
supabase/migrations/
  0001_init.sql
scripts/
  seed-sources.ts
```

## 🎨 디자인 토큰

- `blood-500/600/700` — 강조색 (호버/액티브)
- `midnight-800/900/950` — 배경
- `flicker` — 제목 깜빡임 (저주파)
- `pulse-slow` — 미묘한 호흡감
- 본문은 `font-serif` 로 떨어뜨려 공포책 느낌

## ⚖️ 법적/윤리적 주의

- 크롤한 원문은 AI 가 **완전히 재작성**하여 게시합니다 (단순 복제 X). 그래도 출처 사이트의 ToS 를 확인하세요.
- Creepypasta.com 의 콘텐츠는 CC-BY 가 아닌 경우 상업 사용에 제한이 있을 수 있습니다.
- 네이버 블로그 검색 결과는 snippet 만 사용, 원문 페이지로의 직접 연결은 권장되지 않습니다.
- 18세 이상 / 공포 콘텐츠 민감 사용자 보호를 위해 추후 `age_gate` 또는 "다크 모드 경고" 추가 권장.

## 🗺 로드맵

- [ ] 다크/노이즈 배경 이미지
- [ ] 음성 TTS 로 이야기를 들려주는 모드
- [ ] 푸시 알림 (Web Push) — 새 봇 글 도착 시
- [ ] 태그/카테고리
- [ ] 신고/숨김 기능
- [ ] 해시태그 검색
- [ ] i18n (영어 모드)

## License

Private. © 심야(深夜) — made by Mavis for the user.
