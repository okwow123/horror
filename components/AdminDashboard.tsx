'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Play, CheckCircle2, AlertCircle, Clock, Settings } from 'lucide-react';

interface Status {
  sources: Array<{
    id: string;
    name: string;
    type: string;
    active: boolean;
    last_crawled_at: string | null;
    url: string;
  }>;
  sources_error?: string;
  queue_pending: number;
  bot: { id: string; username: string; display_name: string | null } | null;
  bot_configured: boolean;
  recent_posts: Array<{
    id: string;
    title: string | null;
    is_auto: boolean;
    created_at: string;
    image_url: string | null;
    source_url: string | null;
  }>;
}

function timeAgo(iso: string | null): string {
  if (!iso) return '한 번도 안 함';
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return '방금';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
  return `${Math.floor(seconds / 86400)}일 전`;
}

export function AdminDashboard({ initial }: { initial: Status }) {
  const [status, setStatus] = useState<Status>(initial);
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/status', { cache: 'no-store' });
      const data = await r.json();
      setStatus(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, [refresh]);

  const trigger = async (steps: string) => {
    setRunning(steps);
    setError(null);
    setResult(null);
    try {
      const r = await fetch(`/api/admin/trigger?steps=${steps}`);
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || '실행 실패');
      } else {
        setResult(JSON.stringify(data, null, 2));
        await refresh();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="활성 소스"
          value={String(status.sources.filter(s => s.active).length)}
          sub={`총 ${status.sources.length}개`}
        />
        <StatCard
          label="처리 대기"
          value={String(status.queue_pending)}
          sub="crawl_items"
          warn={status.queue_pending === 0}
        />
        <StatCard
          label="봇 유저"
          value={status.bot_configured && status.bot ? status.bot.display_name || status.bot.username : '미설정'}
          sub={status.bot_configured ? 'SIMYA_BOT_USER_ID OK' : '.env.local 확인'}
          warn={!status.bot_configured}
        />
        <StatCard
          label="최근 24h 게시"
          value={String(status.recent_posts.filter(p => Date.now() - new Date(p.created_at).getTime() < 86400000).length)}
          sub={`총 ${status.recent_posts.length}개 (최근 10)`}
        />
      </div>

      {/* Manual trigger */}
      <div className="bg-midnight-800 border border-midnight-700 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm text-midnight-300">
          <Settings size={16} /> 수동 실행
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => trigger('generate')}
            disabled={running !== null || !status.bot_configured}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blood-700 hover:bg-blood-600 text-white rounded-lg disabled:opacity-50 font-medium"
          >
            {running === 'generate' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            AI 무서운 이야기 1편
          </button>
          <button
            onClick={() => trigger('generate,3')}
            disabled={running !== null || !status.bot_configured}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blood-800 hover:bg-blood-700 text-white rounded-lg disabled:opacity-50"
          >
            {running === 'generate,3' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            AI 무서운 이야기 3편
          </button>
        </div>
        <p className="text-xs text-midnight-500">
          AI 가 컨셉 풀에서 무작위로 무서운 이야기를 새로 지어서 심야의 그림자 명의로 즉시 게시.
          크롤링 없이 매번 다른 컨셉 + 결말.
        </p>
        {error && (
          <div className="flex items-start gap-2 p-3 bg-blood-900/30 border border-blood-800 rounded-lg text-sm text-blood-300">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <div className="font-mono whitespace-pre-wrap">{error}</div>
          </div>
        )}
        {result && (
          <pre className="p-3 bg-midnight-900 border border-midnight-700 rounded-lg text-xs text-midnight-200 overflow-x-auto max-h-96 overflow-y-auto">
            {result}
          </pre>
        )}
      </div>

      {/* Sources (크롤 모드는 더이상 기본 안 씀 — 라이브러리로만 유지) */}
      {status.sources.length > 0 && (
        <div className="bg-midnight-800 border border-midnight-700 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-midnight-200">크롤 소스 (선택, 미사용)</h3>
            <span className="text-xs text-midnight-500">기본은 AI 랜덤 생성</span>
          </div>
          {status.sources_error && (
            <p className="text-sm text-blood-500">에러: {status.sources_error}</p>
          )}
          <div className="divide-y divide-midnight-700">
            {status.sources.map(s => (
              <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-white truncate">{s.name}</span>
                    {!s.active && <span className="text-[10px] px-1.5 py-0.5 bg-midnight-700 text-midnight-400 rounded">OFF</span>}
                  </div>
                  <p className="text-xs text-midnight-500 truncate">
                    <span className="font-mono">{s.type}</span> · {timeAgo(s.last_crawled_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-1 text-xs text-midnight-400 hover:text-white"
          >
            <RefreshCw size={12} /> 새로고침
          </button>
        </div>
      )}

      {/* Recent posts */}
      <div className="bg-midnight-800 border border-midnight-700 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-medium text-midnight-200">최근 자동 포스트</h3>
        <div className="space-y-2">
          {status.recent_posts.length === 0 && (
            <p className="text-sm text-midnight-500">아직 게시 없음</p>
          )}
          {status.recent_posts.map(p => (
            <div key={p.id} className="flex items-start gap-3 py-2 border-b border-midnight-700/50 last:border-0">
              {p.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{p.title || '(제목 없음)'}</p>
                <div className="flex items-center gap-2 text-xs text-midnight-500 mt-0.5">
                  {p.is_auto ? (
                    <span className="px-1.5 py-0.5 bg-blood-900/50 text-blood-300 rounded text-[10px]">BOT</span>
                  ) : (
                    <span className="px-1.5 py-0.5 bg-midnight-700 text-midnight-300 rounded text-[10px]">USER</span>
                  )}
                  <Clock size={10} />
                  {timeAgo(p.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-midnight-800 border border-midnight-700 rounded-2xl p-5 space-y-2">
        <h3 className="text-sm font-medium text-midnight-200">자동 스케줄</h3>
        <p className="text-sm text-midnight-400">
          자동 생성은 비활성화. 위의 <span className="text-blood-300">"수동 실행"</span> 으로만 AI 이야기를 게시할 수 있어.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={cn('bg-midnight-800 border rounded-xl p-3', warn ? 'border-amber-700/40' : 'border-midnight-700')}>
      <div className="text-xs text-midnight-400">{label}</div>
      <div className={cn('text-2xl font-serif mt-1 truncate', warn ? 'text-amber-400' : 'text-white')}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-midnight-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function cn(...args: (string | false | undefined)[]) {
  return args.filter(Boolean).join(' ');
}
