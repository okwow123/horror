'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STORY_CARDS, type CardQuestion } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Loader2, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { HORROR_IMAGES } from '@/lib/images';

type AnswerMap = Record<string, string>;

interface Step {
  card: CardQuestion;
}

function buildSteps(answers: AnswerMap): Step[] {
  const out: Step[] = [];
  for (const c of STORY_CARDS) {
    if (c.id === 'q2_where' && answers.q1 !== 'yes') continue;
    if (c.id === 'q2_other' && answers.q2_where !== 'other') continue;
    if (c.id === 'q3_alone' && answers.q1 !== 'yes') continue;
    if (c.id === 'q4_time' && answers.q1 !== 'yes') continue;
    if (c.id === 'q5_feel' && answers.q1 !== 'yes') continue;
    out.push({ card: c });
  }
  return out;
}

/** 마지막 썰풀기 step 은 optional — 빈 값 허용. */
const OPTIONAL_TEXT_CARD = 'q6_tell_free';

type Phase = 'cards' | 'preview' | 'submitting';

export function CardFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('cards');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [story, setStory] = useState<{ title: string; content: string } | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = useMemo(() => buildSteps(answers), [answers]);
  const current = steps[step];
  const total = steps.length;

  const handleChoice = (value: string) => {
    setAnswers(a => ({ ...a, [current.card.id]: value }));
  };

  const handleText = (text: string) => {
    setAnswers(a => ({ ...a, [current.card.id]: text }));
  };

  const next = () => { if (step < total - 1) setStep(s => s + 1); };
  const back = () => { if (step > 0) setStep(s => s - 1); };

  const generate = async () => {
    setError(null);
    setUsedFallback(false);
    try {
      const res = await fetch('/api/posts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '이야기를 만드는 데 실패했어요');
      }
      if (!data.title || !data.content) {
        throw new Error('AI 가 빈 응답을 줬어요. 잠시 후 다시 시도해 주세요.');
      }
      setStory({ title: data.title, content: data.content });
      setUsedFallback(!!data.used_fallback);
      setAiConfigured(!!data.ai_configured);
      // recommended image 도 있으면 사용
      if (data.recommended_image) {
        const idx = HORROR_IMAGES.findIndex(i => i.id === data.recommended_image.id);
        if (idx >= 0) setSelectedImageIdx(idx);
      }
      setPhase('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류');
    }
  };

  const submit = async () => {
    if (!story || !story.title || !story.content) {
      setError('이야기가 비어있어요. 다시 만들어 주세요.');
      return;
    }
    setPhase('submitting');
    setError(null);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          title: story.title,
          content: story.content,
          image_url: HORROR_IMAGES[selectedImageIdx].url,
          is_anonymous: isAnonymous,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || '게시 실패');
      }
      window.location.href = `/?highlight=${data.post.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류');
      setPhase('preview');
    }
  };

  const regenerateImage = () => {
    setSelectedImageIdx(i => (i + 1) % HORROR_IMAGES.length);
  };

  // ----- Preview Phase -----
  if (phase === 'preview' || phase === 'submitting') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-serif text-blood-400">이야기가 깼어</h2>
          <p className="text-sm text-midnight-400">마음에 드는 분위기를 골라서 게시해.</p>
        </div>

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

        {usedFallback && aiConfigured && (
          <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg text-xs text-amber-200">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium mb-1">AI 응답이 비어서 템플릿으로 채웠어요</p>
              <p className="text-amber-300/80">[AI 다시] 버튼으로 재시도하거나, [다시 쓰기] 로 처음부터.</p>
            </div>
            <button
              onClick={() => { setStory(null); generate(); }}
              className="px-2 py-1 text-amber-200 hover:text-white border border-amber-700/50 rounded"
            >
              <RefreshCw size={12} className="inline mr-1" /> AI 다시
            </button>
          </div>
        )}

        {/* 미리보기 카드 */}
        <div className="bg-midnight-800 border border-midnight-700 rounded-2xl overflow-hidden shadow-2xl">
          <div className="relative w-full bg-midnight-900" style={{ aspectRatio: '4 / 5' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HORROR_IMAGES[selectedImageIdx].url}
              alt="선택된 이미지"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="font-serif text-xl text-white text-balance drop-shadow-lg">
                {story?.title}
              </h3>
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm text-midnight-100 whitespace-pre-wrap leading-relaxed line-clamp-6">
              {story?.content}
            </p>
          </div>
        </div>

        {/* 이미지 선택 그리드 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-midnight-300">분위기 선택 ({selectedImageIdx + 1}/{HORROR_IMAGES.length})</p>
            <button
              onClick={regenerateImage}
              className="flex items-center gap-1 text-xs text-midnight-300 hover:text-white"
            >
              <RefreshCw size={14} /> 랜덤
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {HORROR_IMAGES.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setSelectedImageIdx(i)}
                className={cn(
                  'relative aspect-square rounded-lg overflow-hidden border-2 transition',
                  selectedImageIdx === i
                    ? 'border-blood-500 ring-2 ring-blood-700'
                    : 'border-midnight-700 hover:border-midnight-500',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* 익명 토글 */}
        <label className="flex items-center gap-2 px-4 py-3 bg-midnight-900/50 border border-midnight-700 rounded-lg cursor-pointer hover:border-midnight-500 transition">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={e => setIsAnonymous(e.target.checked)}
            className="w-4 h-4 rounded border-midnight-600 bg-midnight-800 text-blood-600 focus:ring-blood-600 focus:ring-offset-midnight-900"
          />
          <span className="text-sm text-midnight-200">익명으로 게시</span>
          <span className="text-[11px] text-midnight-500 ml-auto">작성자가 "익명"으로 표시돼요</span>
        </label>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPhase('cards'); setStory(null); }}
            disabled={phase === 'submitting'}
            className="flex-1 px-4 py-3 text-sm border border-midnight-700 text-midnight-200 rounded-lg hover:bg-midnight-800 disabled:opacity-50"
          >
            다시 쓰기
          </button>
          <button
            onClick={submit}
            disabled={phase === 'submitting' || !story?.title || !story?.content}
            className="flex-1 px-4 py-3 text-sm bg-blood-700 hover:bg-blood-600 text-white font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {phase === 'submitting' && <Loader2 size={16} className="animate-spin" />}
            {phase === 'submitting' ? '게시 중…' : '피드에 올리기'}
          </button>
        </div>

        {error && <p className="text-sm text-blood-500 text-center">{error}</p>}
      </div>
    );
  }

  // ----- Cards Phase -----
  if (!current) {
    return <div className="text-center text-midnight-300">카드를 불러오는 중…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 h-1 rounded-full transition',
              i <= step ? 'bg-blood-600' : 'bg-midnight-700',
            )}
          />
        ))}
      </div>

      <div
        className={cn(
          'relative bg-gradient-to-br from-blood-900 via-midnight-800 to-midnight-900',
          'border-2 border-blood-700 rounded-3xl p-8 min-h-[280px] flex flex-col items-center justify-center text-center',
          'shadow-[0_0_40px_rgba(127,29,29,0.4)]',
        )}
        key={current.card.id}
      >
        <div className="absolute inset-0 pointer-events-none opacity-30 rounded-3xl"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(239,68,68,0.4), transparent 60%)' }}
        />
        <div className="relative z-10 space-y-4 w-full">
          <div className="text-5xl">{current.card.emoji}</div>
          <h2 className="text-2xl font-serif text-white text-balance">{current.card.question}</h2>

          {current.card.type === 'yesno' && (
            <div className="flex gap-3 justify-center pt-2">
              <YesNoButton active={answers[current.card.id] === 'yes'} onClick={() => handleChoice('yes')} label="예" color="yes" />
              <YesNoButton active={answers[current.card.id] === 'no'} onClick={() => handleChoice('no')} label="아니오" color="no" />
            </div>
          )}

          {current.card.type === 'choice' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto pt-2">
              {current.card.options?.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleChoice(opt.value)}
                  className={cn(
                    'px-4 py-3 rounded-xl border text-sm transition',
                    answers[current.card.id] === opt.value
                      ? 'bg-blood-700 border-blood-500 text-white'
                      : 'bg-midnight-900/50 border-midnight-700 text-midnight-200 hover:border-blood-700',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {current.card.type === 'text' && (
            <div className="pt-2 max-w-md mx-auto">
              <textarea
                value={answers[current.card.id] || ''}
                onChange={e => handleText(e.target.value)}
                rows={current.card.id === OPTIONAL_TEXT_CARD ? 5 : 3}
                maxLength={current.card.id === OPTIONAL_TEXT_CARD ? 800 : 100}
                placeholder={current.card.id === OPTIONAL_TEXT_CARD ? '짧게 풀어줘. 비워도 괜찮아.' : '한 줄로 적어줘'}
                className="w-full px-4 py-3 bg-midnight-900/70 border border-midnight-700 rounded-xl text-white placeholder:text-midnight-500 focus:outline-none focus:border-blood-600 resize-none"
              />
              {current.card.id === OPTIONAL_TEXT_CARD && (
                <p className="text-[11px] text-midnight-500 mt-1.5 text-right">
                  {(answers[current.card.id] || '').length} / 800 · 비워서 건너뛸 수 있어
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={back}
          disabled={step === 0}
          className="flex items-center gap-1 px-4 py-2 text-sm text-midnight-300 hover:text-white disabled:opacity-30"
        >
          <ArrowLeft size={16} /> 이전
        </button>
        <span className="text-xs text-midnight-500">{step + 1} / {total}</span>
        {step < total - 1 ? (
          <button
            onClick={next}
            disabled={!answers[current.card.id]}
            className="flex items-center gap-1 px-4 py-2 text-sm bg-blood-700 hover:bg-blood-600 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
          >
            다음 <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={generate}
            disabled={
              !answers[current.card.id] &&
              current.card.id !== OPTIONAL_TEXT_CARD
            }
            className="flex items-center gap-1 px-5 py-2 text-sm bg-blood-700 hover:bg-blood-600 text-white rounded-lg disabled:opacity-50"
          >
            이야기 만들기
          </button>
        )}
      </div>

      {error && <p className="text-sm text-blood-500 text-center">{error}</p>}
    </div>
  );
}

function YesNoButton({ active, onClick, label, color }: {
  active: boolean; onClick: () => void; label: string; color: 'yes' | 'no';
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-8 py-3 rounded-xl text-base font-medium transition',
        active
          ? color === 'yes'
            ? 'bg-blood-600 text-white shadow-lg shadow-blood-900/50'
            : 'bg-midnight-700 text-white'
          : 'bg-midnight-900/50 text-midnight-200 border border-midnight-700 hover:border-blood-700',
      )}
    >
      {label}
    </button>
  );
}
