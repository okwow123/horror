// Web Speech API (SpeechSynthesis) wrapper.
// 브라우저에서만 작동. 서버에서는 noop.
//
// 의도:
// - 무료, 키 불필요
// - OpenAI TTS / Google Cloud TTS / Naver Clova 로 업그레이드 가능한 thin wrapper
// - 한국어 음성 자동 선택 (lang='ko-KR')
// - 단락 단위 onEnd 콜백 → 인터랙티브 호러 등 분기 재생에 활용

export interface TTSOptions {
  voiceURI?: string;
  lang?: string;
  rate?: number;     // 0.1 ~ 10, default 0.9 (공포라 약간 느리게)
  pitch?: number;    // 0 ~ 2, default 1.0
  volume?: number;   // 0 ~ 1, default 1.0
  onStart?: () => void;
  onEnd?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onBoundary?: (charIndex: number) => void;
  onError?: (error: string) => void;
}

export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (!isSupported()) return [];
  return window.speechSynthesis.getVoices();
}

export function getKoreanVoices(): SpeechSynthesisVoice[] {
  return getVoices().filter(v => v.lang?.toLowerCase().startsWith('ko'));
}

/** 한국어 음성 우선으로 자동 선택. */
export function pickKoreanVoiceURI(): string | undefined {
  const voices = getKoreanVoices();
  if (voices.length === 0) return undefined;
  // Google/Microsoft 등 우선
  const preferred = voices.find(v => /google|microsoft|natural|neural/i.test(v.name));
  return (preferred ?? voices[0]).voiceURI;
}

export interface SpeakHandle {
  cancel: () => void;
  utterance: SpeechSynthesisUtterance;
}

export function speak(text: string, options: TTSOptions = {}): SpeakHandle | null {
  if (!isSupported()) {
    options.onError?.('Web Speech API 미지원 브라우저');
    return null;
  }
  const synth = window.speechSynthesis;
  // 새 utterance 시작 전 기존 queue 비우기
  synth.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = options.lang ?? 'ko-KR';
  utter.rate = clamp(options.rate ?? 0.9, 0.1, 10);
  utter.pitch = clamp(options.pitch ?? 1.0, 0, 2);
  utter.volume = clamp(options.volume ?? 1.0, 0, 1);

  if (options.voiceURI) {
    const voice = getVoices().find(v => v.voiceURI === options.voiceURI);
    if (voice) utter.voice = voice;
  } else {
    const uri = pickKoreanVoiceURI();
    if (uri) {
      const voice = getVoices().find(v => v.voiceURI === uri);
      if (voice) utter.voice = voice;
    }
  }

  if (options.onStart) utter.onstart = options.onStart;
  if (options.onEnd) utter.onend = options.onEnd;
  if (options.onPause) utter.onpause = options.onPause;
  if (options.onResume) utter.onresume = options.onResume;
  if (options.onBoundary) {
    utter.onboundary = (e) => options.onBoundary!(e.charIndex);
  }
  if (options.onError) {
    utter.onerror = (e) => options.onError!(e.error || 'unknown');
  }

  synth.speak(utter);

  return {
    cancel: () => synth.cancel(),
    utterance: utter,
  };
}

export function pause(): void {
  if (isSupported()) window.speechSynthesis.pause();
}

export function resume(): void {
  if (isSupported()) window.speechSynthesis.resume();
}

export function cancel(): void {
  if (isSupported()) window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  if (!isSupported()) return false;
  return window.speechSynthesis.speaking;
}

export function isPaused(): boolean {
  if (!isSupported()) return false;
  return window.speechSynthesis.paused;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
