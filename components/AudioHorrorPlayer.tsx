'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play, Pause, Square, CloudRain, Wind, Footprints, Heart,
  Wind as BreathIcon, DoorOpen, Volume2, Loader2,
} from 'lucide-react';
import {
  speak, cancel as ttsCancel, pause as ttsPause, resume as ttsResume,
  getVoices, getKoreanVoices, isSupported as ttsSupported,
  type SpeakHandle,
} from '@/lib/audio/tts';
import {
  createAmbient, isSupported as audioSupported,
  type AmbientType, type AmbientHandle,
} from '@/lib/audio/ambient';

interface AudioHorrorPlayerProps {
  title: string;
  content: string;
}

const AMBIENTS: { type: AmbientType; label: string; Icon: typeof CloudRain }[] = [
  { type: 'rain',      label: '비',     Icon: CloudRain },
  { type: 'wind',      label: '바람',   Icon: Wind },
  { type: 'footsteps', label: '발소리', Icon: Footprints },
  { type: 'heartbeat', label: '심장',   Icon: Heart },
  { type: 'breath',    label: '호흡',   Icon: BreathIcon },
  { type: 'door',      label: '문',     Icon: DoorOpen },
  { type: 'silence',   label: '정적',   Icon: Volume2 },
];

export function AudioHorrorPlayer({ title, content }: AudioHorrorPlayerProps) {
  const [ambientType, setAmbientType] = useState<AmbientType>('silence');
  const [ambientVolume, setAmbientVolume] = useState(0.3);
  const [ttsRate, setTtsRate] = useState(0.85);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(-1);
  const [totalChunks, setTotalChunks] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string | undefined>(undefined);
  const [supported, setSupported] = useState(true);

  const ambientRef = useRef<AmbientHandle | null>(null);
  const speakRef = useRef<SpeakHandle | null>(null);
  const chunksRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  // 재생/일시정지 버튼 클릭 시점에 최신 설정값을 사용하기 위한 ref
  const playOptionsRef = useRef({ rate: 0.85, voiceURI: undefined as string | undefined });

  // ---- 초기화 ----
  useEffect(() => {
    const ttsOK = ttsSupported();
    const audioOK = audioSupported();
    setSupported(ttsOK && audioOK);

    // 한국어 음성 로드 (Chrome 등은 비동기 도착)
    const loadVoices = () => {
      const ko = getKoreanVoices();
      setVoices(ko);
      if (ko.length > 0 && !voiceURI) {
        setVoiceURI(ko[0].voiceURI);
        playOptionsRef.current.voiceURI = ko[0].voiceURI;
      }
    };
    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // 본문을 단락 단위로 분할
  useEffect(() => {
    const chunks = content
      .split(/\n\n+/)
      .map(s => s.trim())
      .filter(Boolean);
    // 빈 단락은 제거, 너무 긴 단락(>200자)은 문장 단위로 추가 분할
    const refined: string[] = [];
    for (const c of chunks) {
      if (c.length <= 200) {
        refined.push(c);
      } else {
        // 마침표/물음표/느낌표 뒤에서 분할
        const parts = c.split(/(?<=[.!?。])\s+/);
        let acc = '';
        for (const p of parts) {
          if ((acc + ' ' + p).trim().length > 180) {
            if (acc) refined.push(acc.trim());
            acc = p;
          } else {
            acc = (acc ? acc + ' ' : '') + p;
          }
        }
        if (acc) refined.push(acc.trim());
      }
    }
    chunksRef.current = refined;
    setTotalChunks(refined.length);
  }, [content]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      try { ttsCancel(); } catch {}
      if (ambientRef.current) {
        ambientRef.current.stop();
        ambientRef.current = null;
      }
    };
  }, []);

  // 옵션 ref 업데이트
  useEffect(() => {
    playOptionsRef.current.rate = ttsRate;
    playOptionsRef.current.voiceURI = voiceURI;
  }, [ttsRate, voiceURI]);

  // ---- 재생 ----
  const playNext = useCallback(() => {
    const chunks = chunksRef.current;
    if (indexRef.current >= chunks.length) {
      setPlaying(false);
      setPaused(false);
      setCurrentChunk(-1);
      if (ambientRef.current) {
        ambientRef.current.stop();
        ambientRef.current = null;
      }
      return;
    }
    const idx = indexRef.current;
    setCurrentChunk(idx);
    const { rate, voiceURI: vURI } = playOptionsRef.current;
    speakRef.current = speak(chunks[idx], {
      voiceURI: vURI,
      rate,
      volume: 1.0,
      onEnd: () => {
        indexRef.current = idx + 1;
        // 단락 사이 350ms 짧은 호흡
        setTimeout(() => playNext(), 350);
      },
      onError: (err) => {
        if (err === 'canceled' || err === 'interrupted') return;
        setPlaying(false);
        setPaused(false);
        setCurrentChunk(-1);
        if (ambientRef.current) {
          ambientRef.current.stop();
          ambientRef.current = null;
        }
      },
    });
  }, []);

  const handlePlay = () => {
    if (paused) {
      ttsResume();
      setPaused(false);
      return;
    }
    if (playing) return;
    // 환경음 시작
    if (ambientType !== 'silence' && !ambientRef.current) {
      try {
        ambientRef.current = createAmbient(ambientType, ambientVolume);
      } catch (e) {
        // 환경음 실패해도 TTS는 진행
      }
    }
    indexRef.current = 0;
    setPlaying(true);
    setPaused(false);
    playNext();
  };

  const handlePause = () => {
    ttsPause();
    setPaused(true);
  };

  const handleStop = () => {
    ttsCancel();
    setPlaying(false);
    setPaused(false);
    setCurrentChunk(-1);
    indexRef.current = chunksRef.current.length;  // 다음 재생은 처음부터
    if (ambientRef.current) {
      ambientRef.current.stop();
      ambientRef.current = null;
    }
  };

  // 분위기 변경
  const handleAmbientChange = (type: AmbientType) => {
    setAmbientType(type);
    if (ambientRef.current) {
      ambientRef.current.stop();
      ambientRef.current = null;
    }
    if (type !== 'silence' && playing && !paused) {
      try {
        ambientRef.current = createAmbient(type, ambientVolume);
      } catch {}
    }
  };

  // 환경음 볼륨
  const handleAmbientVolume = (v: number) => {
    setAmbientVolume(v);
    if (ambientRef.current) ambientRef.current.setVolume(v);
  };

  if (!supported) {
    return (
      <div className="rounded-2xl border border-midnight-700 bg-midnight-900/50 p-6 text-center text-sm text-midnight-400">
        이 브라우저는 음성 재생을 지원하지 않아요. Chrome, Edge, Safari (iOS 16+)를 권장해요.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-blood-700/30 bg-gradient-to-b from-midnight-900 to-black p-5 space-y-4">
      {/* 분위기 헤더 */}
      <div className="text-center space-y-1">
        <p className="text-[10px] uppercase tracking-[0.3em] text-blood-400">🎧 음성으로 듣기</p>
        <p className="text-xs text-midnight-400">환경음을 선택하고 재생하세요</p>
      </div>

      {/* 분위기 선택 */}
      <div>
        <p className="text-[10px] text-midnight-500 uppercase tracking-wider mb-2">분위기</p>
        <div className="grid grid-cols-7 gap-1.5">
          {AMBIENTS.map(({ type, label, Icon }) => {
            const active = ambientType === type;
            return (
              <button
                key={type}
                onClick={() => handleAmbientChange(type)}
                title={label}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] transition ${
                  active
                    ? 'border-blood-500 bg-blood-900/40 text-blood-300'
                    : 'border-midnight-700 text-midnight-300 hover:border-midnight-500 hover:text-midnight-200'
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 음성 선택 (한국어 음성 2개 이상이면) */}
      {voices.length > 1 && (
        <div>
          <p className="text-[10px] text-midnight-500 uppercase tracking-wider mb-2">음성</p>
          <select
            value={voiceURI || ''}
            onChange={(e) => {
              setVoiceURI(e.target.value);
              playOptionsRef.current.voiceURI = e.target.value;
            }}
            className="w-full bg-midnight-900 border border-midnight-700 rounded px-2 py-1.5 text-xs text-midnight-200"
          >
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 컨트롤 */}
      <div className="flex items-center gap-2">
        {!playing || paused ? (
          <button
            onClick={handlePlay}
            disabled={totalChunks === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blood-700 hover:bg-blood-600 disabled:opacity-50 text-white font-medium rounded-lg"
          >
            {playing && paused ? <Play size={16} /> : <Play size={16} />}
            {playing && paused ? '계속' : '재생'}
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-midnight-700 hover:bg-midnight-600 text-white font-medium rounded-lg"
          >
            <Pause size={16} />
            일시정지
          </button>
        )}
        <button
          onClick={handleStop}
          disabled={!playing && !paused}
          className="px-4 py-3 bg-midnight-800 hover:bg-midnight-700 text-midnight-200 rounded-lg disabled:opacity-40"
        >
          <Square size={16} />
        </button>
      </div>

      {/* 진행 표시 */}
      {(playing || paused) && (
        <div className="flex items-center gap-2 text-[11px] text-midnight-400">
          <Loader2 size={12} className="animate-spin text-blood-500" />
          <span>
            {currentChunk >= 0 ? `${currentChunk + 1} / ${totalChunks} 단락` : '준비 중…'}
          </span>
          <span className="ml-auto text-midnight-500">재생 속도 {ttsRate.toFixed(1)}x</span>
        </div>
      )}

      {/* 슬라이더 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-midnight-500 mb-1">재생 속도: {ttsRate.toFixed(1)}x</p>
          <input
            type="range"
            min="0.5"
            max="1.3"
            step="0.05"
            value={ttsRate}
            onChange={(e) => setTtsRate(parseFloat(e.target.value))}
            className="w-full accent-blood-500"
          />
        </div>
        <div>
          <p className="text-[10px] text-midnight-500 mb-1">환경음: {Math.round(ambientVolume * 100)}%</p>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={ambientVolume}
            onChange={(e) => handleAmbientVolume(parseFloat(e.target.value))}
            disabled={ambientType === 'silence'}
            className="w-full accent-blood-500 disabled:opacity-40"
          />
        </div>
      </div>

      {/* 제목 (작게) */}
      <p className="text-[11px] text-midnight-500 text-center truncate">🔊 {title}</p>
    </div>
  );
}
