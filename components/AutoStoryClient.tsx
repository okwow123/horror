'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles, RefreshCw, AlertTriangle, Info, ArrowLeft, Check, Loader2,
} from 'lucide-react';
import { AudioHorrorPlayer } from './AudioHorrorPlayer';

type Phase = 'preview' | 'submitting';

// AI가 글을 쓰는 동안의 진행 단계.
// 컨셉 결정은 즉시지만, 사용자가 단계를 볼 수 있도록 약간의 텀을 둔다.
type GenerateStep = 'idle' | 'rolling' | 'generating' | 'verifying' | 'done';

interface StepInfo {
  key: Exclude<GenerateStep, 'idle'>;
  label: string;
  hint: string;
}

const STEPS: StepInfo[] = [
  { key: 'rolling',    label: '컨셉 결정',     hint: '장소·인물·공포 요소를 정하고 있어요' },
  { key: 'generating', label: '이야기 쓰기',   hint: 'AI 가 한 편의 공포 단편을 짓고 있어요 (10~20초)' },
  { key: 'verifying',  label: '마무리',        hint: '분량·구조 검증 중' },
  { key: 'done',       label: '완료',          hint: '새 이야기가 깼어요' },
];

interface Story {
  title: string;
  content: string;
  used_fallback: boolean;
  sources: {
    origin: 'horror_contents' | 'crawl_items' | 'posts' | 'none';
    sample_count: number;
    total_available: number;
    column: 'subject' | 'unknown';
    sentence_count: number;
  };
  concept: { place: string; setup: string; twist: string; tone: string };
}

interface AutoStoryClientProps {
  aiConfigured: boolean;
}

export function AutoStoryClient({ aiConfigured }: AutoStoryClientProps) {
  const [story, setStory] = useState<Story | null>(null);
  const [phase, setPhase] = useState<Phase>('preview');
  const [step, setStep] = useState<GenerateStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const isWorking = step !== 'idle' && step !== 'done';
  const hasStory = story !== null;

  const generate = async () => {
    if (isWorking) return;
    setError(null);
    setStep('rolling');
    await delay(450);
    setStep('generating');
    try {
      const res = await fetch('/api/posts/auto-generate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI 호출에 실패했어요');
      if (!data.title || !data.content) throw new Error('AI 가 빈 응답을 줬어요');
      setStep('verifying');
      await delay(350);
      setStory({
        title: data.title,
        content: data.content,
        used_fallback: !!data.used_fallback,
        sources: data.sources,
        concept: data.concept,
      });
      setStep('done');
      setTimeout(() => setStep('idle'), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류');
      setStep('idle');
    }
  };

  const submit = async () => {
    if (!story?.title || !story?.content) return;
    setPhase('submitting');
    setError(null);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: { auto: true, source: story.sources.origin, concept: story.concept },
          title: story.title,
          content: story.content,
          is_anonymous: isAnonymous,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '게시 실패');
      window.location.href = `/?highlight=${data.post.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류');
      setPhase('preview');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-serif text-blood-500">AI 가 깬다</h1>
        <p className="text-sm text-midnight-400">
          무서운 이야기를 한 편 만들어 볼게요.
        </p>
      </div>

      {/* AI 미설정 경고 */}
      {!aiConfigured && (
        <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg text-xs text-amber-200">
          <Info size={14} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1">AI 가 설정되지 않았어요</p>
            <p className="text-amber-300/80">
              <code className="px-1 bg-amber-900/40 rounded">.env.local</code> 에 <code className="px-1 bg-amber-900/40 rounded">MINIMAX_API_KEY</code> 를 추가하면
              진짜 AI 가 이야기를 써 줘요. 지금은 템플릿 글로 표시 중.
            </p>
          </div>
        </div>
      )}

      {/* 진행 단계 */}
      {isWorking && <Stepper current={step} steps={STEPS} />}

      {/* story 가 없으면: 시작 화면 / 있으면: 미리보기 + 액션 */}
      {!hasStory && !isWorking && (
        <div className="text-center space-y-4 py-8">
          <p className="text-midnight-300 text-sm">
            아래 버튼을 누르면 컨셉을 뽑고 이야기를 만들기 시작해요.
          </p>
          <button
            onClick={generate}
            disabled={!aiConfigured}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blood-700 hover:bg-blood-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={18} />
            AI 가 한 편 써줄게요
          </button>
        </div>
      )}

      {hasStory && story && (
        <>
          {/* 출처 메타 */}
          <p className="text-[11px] text-midnight-500 text-center">
            {story.sources.origin === 'none'
              ? '아직 참고할 글이 없어 컨셉만으로 만들었어요. horror_contents 에 원문을 채우면 더 다양한 글이 나와요.'
              : `참고 소스: ${story.sources.origin}${story.sources.column !== 'unknown' ? ` · ${story.sources.column}` : ''} · 표본 ${story.sources.sample_count}건 (전체 ${story.sources.total_available}건)`}
            {story.sources.sentence_count > 0 && (
              <> · 본문 {story.sources.sentence_count}문장 · {story.content.length.toLocaleString()}자</>
            )}
          </p>

          {/* 텍스트 카드 */}
          <div className="bg-midnight-800 border border-midnight-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 space-y-4">
              <h3 className="font-serif text-2xl text-white text-balance">{story.title}</h3>
              <p className="text-sm text-midnight-100 whitespace-pre-wrap leading-relaxed">
                {story.content}
              </p>
            </div>
          </div>

          {/* 🎧 음성 호러 — 환경음과 함께 듣기 */}
          <AudioHorrorPlayer title={story.title} content={story.content} />

          {/* 컨셉 메타 */}
          {story.concept && (
            <details className="text-xs text-midnight-500 px-1">
              <summary className="cursor-pointer hover:text-midnight-300">컨셉 보기</summary>
              <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-midnight-700">
                <p>장소: {story.concept.place}</p>
                <p>도입: {story.concept.setup}</p>
                <p>반전: {story.concept.twist}</p>
                <p>분위기: {story.concept.tone}</p>
              </div>
            </details>
          )}

          {/* 익명 토글 */}
          <label className="flex items-center gap-2 px-4 py-3 bg-midnight-900/50 border border-midnight-700 rounded-lg cursor-pointer hover:border-midnight-500">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={e => setIsAnonymous(e.target.checked)}
              disabled={isWorking || phase === 'submitting'}
              className="w-4 h-4 rounded border-midnight-600 bg-midnight-800 text-blood-600 focus:ring-blood-600 focus:ring-offset-midnight-900"
            />
            <span className="text-sm text-midnight-200">익명으로 게시</span>
            <span className="text-[11px] text-midnight-500 ml-auto">작성자가 "익명"으로 표시돼요</span>
          </label>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/post/create"
              className="flex items-center justify-center gap-1 px-4 py-3 text-sm border border-midnight-700 text-midnight-200 rounded-lg hover:bg-midnight-800"
            >
              <ArrowLeft size={14} /> 직접 쓰기
            </Link>
            <button
              onClick={generate}
              disabled={isWorking || phase === 'submitting'}
              className="flex items-center justify-center gap-1 px-4 py-3 text-sm border border-midnight-700 text-midnight-200 rounded-lg hover:bg-midnight-800 disabled:opacity-50"
            >
              {isWorking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {isWorking ? '작성 중…' : 'AI 다시'}
            </button>
            <button
              onClick={submit}
              disabled={isWorking || phase === 'submitting'}
              className="flex-1 px-4 py-3 text-sm bg-blood-700 hover:bg-blood-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {phase === 'submitting' && <Loader2 size={16} className="animate-spin" />}
              {phase === 'submitting' ? '게시 중…' : '피드에 올리기'}
            </button>
          </div>
        </>
      )}

      {error && <p className="text-sm text-blood-500 text-center">{error}</p>}
    </div>
  );
}

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

function Stepper({ current, steps }: { current: GenerateStep; steps: StepInfo[] }) {
  const currentIdx = steps.findIndex(s => s.key === current);
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-blood-700/40 bg-blood-900/10 px-4 py-3 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        {steps.map((s, i) => {
          const status: 'done' | 'active' | 'pending' =
            i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'pending';
          return (
            <div key={s.key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium border-2',
                  status === 'done'    && 'bg-blood-700 border-blood-500 text-white',
                  status === 'active'  && 'bg-blood-900 border-blood-500 text-blood-200',
                  status === 'pending' && 'bg-transparent border-midnight-700 text-midnight-600',
                ].filter(Boolean).join(' ')}
              >
                {status === 'done'   ? <Check size={14} /> :
                 status === 'active' ? <Loader2 size={14} className="animate-spin" /> :
                 i + 1}
              </div>
              <span
                className={[
                  'text-[10px] tracking-wider uppercase',
                  status === 'done'    && 'text-blood-300',
                  status === 'active'  && 'text-blood-200',
                  status === 'pending' && 'text-midnight-600',
                ].filter(Boolean).join(' ')}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-blood-200/80 text-center">
        {steps[currentIdx]?.hint ?? '잠시만요…'}
      </p>
    </div>
  );
}
