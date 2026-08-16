'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2, ArrowLeft, RotateCcw, Skull, Heart, Eye, Sparkles,
} from 'lucide-react';
import { createAmbient, type AmbientHandle, type AmbientType } from '@/lib/audio/ambient';
import { NODE_TITLES, type HauntedNode, type EndingType, type HauntedChoice } from '@/lib/haunted-game/prompts';

interface HistoryEntry {
  node: number;
  choice: string;       // intent
  choiceText: string;
}

const ENDING_META: Record<EndingType, { label: string; color: string; icon: typeof Skull }> = {
  good:    { label: '탈출',     color: 'text-emerald-400', icon: Sparkles },
  bad:     { label: '사로잡힘', color: 'text-red-500',     icon: Skull },
  cryptic: { label: '반복',     color: 'text-purple-400',  icon: Eye },
  rescue:  { label: '구조',     color: 'text-sky-300',     icon: Heart },
};

export function HauntedGame() {
  const [turn, setTurn] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [node, setNode] = useState<HauntedNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ambientRef = useRef<AmbientHandle | null>(null);

  // ambient 자동 재생 (currentNode.ambient)
  useEffect(() => {
    if (!node) return;
    if (ambientRef.current) {
      ambientRef.current.stop();
      ambientRef.current = null;
    }
    if (node.ambient && node.ambient !== 'silence') {
      try {
        ambientRef.current = createAmbient(node.ambient, 0.3);
      } catch {}
    }
  }, [node?.ambient, node?.turnNumber]);

  // 언마운트 정리
  useEffect(() => {
    return () => {
      if (ambientRef.current) {
        ambientRef.current.stop();
        ambientRef.current = null;
      }
    };
  }, []);

  const fetchTurn = useCallback(async (
    nextTurn: number,
    hist: HistoryEntry[],
    choiceText: string | null,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/haunted-game/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnNumber: nextTurn,
          history: hist,
          choiceText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '흉가 생성 실패');
      if (!data.node) throw new Error('빈 응답');
      setNode(data.node);
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  // 시작
  const start = () => {
    setHistory([]);
    setNode(null);
    setTurn(0);
    fetchTurn(0, [], null);
  };

  // 선택
  const choose = (choice: HauntedChoice) => {
    if (loading || !node) return;
    const newHistory: HistoryEntry[] = [
      ...history,
      { node: node.turnNumber, choice: choice.intent, choiceText: choice.text },
    ];
    setHistory(newHistory);
    setNode(null);
    fetchTurn(node.turnNumber + 1, newHistory, choice.text);
  };

  // 처음 마운트 시 자동 시작
  useEffect(() => {
    fetchTurn(0, [], null);
  }, [fetchTurn]);

  const nodeTitle = node ? (NODE_TITLES[node.turnNumber] ?? `${node.turnNumber}단계`) : '흉가에 발을 들이다';
  const endingMeta = node?.isEnding && node.endingType ? ENDING_META[node.endingType] : null;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-midnight-500 hover:text-midnight-300"
        >
          <ArrowLeft size={12} /> 피드로
        </Link>
        <div className="text-[10px] uppercase tracking-[0.3em] text-blood-400">심야 · 흉가 체험</div>
        <button
          onClick={start}
          disabled={loading}
          className="inline-flex items-center gap-1 text-xs text-blood-400 hover:text-blood-300 disabled:opacity-40"
        >
          <RotateCcw size={12} /> 다시
        </button>
      </div>

      <h1 className="text-2xl font-serif text-center text-white text-balance">
        {nodeTitle}
      </h1>

      {/* 진행 표시 */}
      {node && (
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 7 }, (_, i) => i + 1).map((step) => {
            const reached = step <= node.turnNumber;
            const current = step === node.turnNumber;
            return (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition ${
                  current ? 'bg-blood-500' :
                  reached ? 'bg-blood-700' :
                  'bg-midnight-800'
                }`}
              />
            );
          })}
        </div>
      )}

      {/* 본문 카드 */}
      <div className="relative min-h-[180px] rounded-2xl border border-blood-700/30 bg-gradient-to-b from-midnight-900 to-black p-6 shadow-2xl">
        {loading && !node ? (
          <div className="flex items-center justify-center gap-2 py-12 text-midnight-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">흉가가 깨어나는 중…</span>
          </div>
        ) : node ? (
          <div className="space-y-4">
            {endingMeta && (
              <div className={`flex items-center gap-2 ${endingMeta.color}`}>
                <endingMeta.icon size={20} />
                <span className="text-sm font-semibold tracking-wider uppercase">
                  결말 · {endingMeta.label}
                </span>
              </div>
            )}
            <p className="text-base text-midnight-100 leading-relaxed whitespace-pre-wrap font-serif">
              {node.text}
            </p>
          </div>
        ) : (
          <p className="text-sm text-midnight-500">…</p>
        )}
      </div>

      {/* 선택지 또는 엔딩 액션 */}
      {!loading && node && !node.isEnding && (
        <div className="space-y-2">
          {node.choices.map((c, i) => (
            <button
              key={i}
              onClick={() => choose(c)}
              disabled={loading}
              className="w-full text-left px-5 py-4 bg-midnight-900/70 hover:bg-blood-900/40 border border-midnight-700 hover:border-blood-500 rounded-lg text-sm text-midnight-200 hover:text-white transition disabled:opacity-50"
            >
              <span className="text-blood-400 mr-2">→</span>
              {c.text}
            </button>
          ))}
        </div>
      )}

      {/* 엔딩 액션 */}
      {!loading && node?.isEnding && (
        <div className="space-y-2">
          <button
            onClick={start}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blood-700 hover:bg-blood-600 text-white font-medium rounded-lg"
          >
            <RotateCcw size={16} />
            다시 시작하기
          </button>
          <Link
            href="/post/auto"
            className="w-full flex items-center justify-center gap-2 px-5 py-3 border border-midnight-700 text-midnight-200 hover:bg-midnight-800 rounded-lg text-sm"
          >
            <Sparkles size={14} />
            AI 가 다른 이야기 써줄까?
          </Link>
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 px-5 py-3 border border-midnight-700 text-midnight-200 hover:bg-midnight-800 rounded-lg text-sm"
          >
            <ArrowLeft size={14} />
            피드로 돌아가기
          </Link>
        </div>
      )}

      {error && (
        <p className="text-sm text-blood-500 text-center">{error}</p>
      )}

      {/* ambient 표시 */}
      {node && node.ambient !== 'silence' && (
        <p className="text-[10px] text-midnight-500 text-center uppercase tracking-widest">
          · ambient: {node.ambient} ·
        </p>
      )}
    </div>
  );
}
