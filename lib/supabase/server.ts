import { createServerClient } from '@supabase/ssr';
import { createClient as createRawClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

/**
 * NOTE: @supabase/ssr v0.5 의 createServerClient 가 Database generic 을
 * 완전히 포워딩하지 못하는 케이스가 있어 (ssr 의 GenericSchema 가 supabase-js 의
 * 최신 GenericSchema 와 동기화 안 됨) 결과적으로 select 의 Row 타입이 `never` 가 됨.
 * 우회: @supabase/ssr 로 client 생성 후 SupabaseClient<Database> 로 캐스팅.
 */
export function createClient(): SupabaseClient<Database> {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as any),
            );
          } catch {
            // Server Component 에서 set 호출 시 무시
          }
        },
      },
    },
  ) as unknown as SupabaseClient<Database>;
}

// service_role: RLS 우회. 오직 서버(API route, cron) 전용. 절대 클라이언트로 노출 금지.
export function createServiceClient(): SupabaseClient<Database> {
  return createRawClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
