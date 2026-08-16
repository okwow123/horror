// Web Audio API 환경음 합성.
// 의존성 없는 순수 합성 — 비/바람/발소리/심장/호흡/문/정적.
//
// 무료, 키 불필요. 한 페이지에서 동시에 여러 ambient 를 합성할 수 있도록
// 각각 독립 AudioContext 를 만들지 않고, 호출 시마다 새로 만든다 (브라우저 자동 GC).

export type AmbientType =
  | 'rain'      // 빗소리 — 백색잡음 + 밴드패스
  | 'wind'      // 바람 — 저역통과 + LFO 변조
  | 'footsteps' // 발소리 — 주기적 임펄스
  | 'heartbeat' // 심장박동 — 저주파 sine + envelope
  | 'breath'    // 호흡 — 노이즈 + ADSR
  | 'door'      // 문 삐걱 — 짧은 임펄스 + decay
  | 'silence';  // 정적

export interface AmbientHandle {
  stop: () => void;
  setVolume: (v: number) => void;
}

export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'AudioContext' in window;
}

export function createAmbient(type: AmbientType, masterVolume = 0.3): AmbientHandle {
  if (!isSupported()) {
    return noopHandle();
  }
  // 모바일 Safari 등은 첫 사용자 제스처 전에 AudioContext 생성/시작 못 함
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new Ctx();
  const masterGain = ctx.createGain();
  masterGain.gain.value = masterVolume;
  masterGain.connect(ctx.destination);

  const disposers: Array<() => void> = [];

  switch (type) {
    case 'rain': return rain(ctx, masterGain, disposers);
    case 'wind': return wind(ctx, masterGain, disposers);
    case 'footsteps': return footsteps(ctx, masterGain, disposers);
    case 'heartbeat': return heartbeat(ctx, masterGain, disposers);
    case 'breath': return breath(ctx, masterGain, disposers);
    case 'door': return door(ctx, masterGain, disposers);
    case 'silence':
    default:
      return makeHandle(masterGain, ctx, disposers);
  }
}

function makeHandle(masterGain: GainNode, ctx: AudioContext, disposers: Array<() => void>): AmbientHandle {
  return {
    stop: () => {
      disposers.forEach(d => { try { d(); } catch {} });
      try { masterGain.disconnect(); } catch {}
      ctx.close().catch(() => {});
    },
    setVolume: (v: number) => {
      const clamped = Math.max(0, Math.min(1, v));
      try { masterGain.gain.value = clamped; } catch {}
    },
  };
}

function noopHandle(): AmbientHandle {
  return { stop: () => {}, setVolume: () => {} };
}

// ----------------- 각 ambient 합성 -----------------

function rain(ctx: AudioContext, out: GainNode, disposers: Array<() => void>): AmbientHandle {
  // 백색잡음 + 3kHz 밴드패스 → 빗소리 질감
  const bufferSize = 2 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3000;
  filter.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.value = 0.7;

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  noise.start();
  disposers.push(() => { try { noise.stop(); } catch {} });

  return makeHandle(out, ctx, disposers);
}

function wind(ctx: AudioContext, out: GainNode, disposers: Array<() => void>): AmbientHandle {
  const bufferSize = 2 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;

  const gain = ctx.createGain();
  gain.gain.value = 0.8;

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  noise.start();
  disposers.push(() => { try { noise.stop(); } catch {} });

  // LFO — 음량 천천히 변조 (바람소리 물결)
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.18;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.25;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();
  disposers.push(() => { try { lfo.stop(); } catch {} });

  return makeHandle(out, ctx, disposers);
}

function footsteps(ctx: AudioContext, out: GainNode, disposers: Array<() => void>): AmbientHandle {
  // 약 0.8초 간격의 임펄스
  const stepInterval = 800;
  let stopped = false;

  const playStep = () => {
    if (stopped) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 90;
    osc.type = 'sine';
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.4, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.2);
  };
  playStep();
  const iv = window.setInterval(playStep, stepInterval);
  disposers.push(() => { stopped = true; clearInterval(iv); });

  return makeHandle(out, ctx, disposers);
}

function heartbeat(ctx: AudioContext, out: GainNode, disposers: Array<() => void>): AmbientHandle {
  // "lub-dub" 두 박자, 1초 주기
  let stopped = false;

  const playBeat = () => {
    if (stopped) return;
    [0, 0.15].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 55;
      osc.type = 'sine';
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.6, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  };
  playBeat();
  const iv = window.setInterval(playBeat, 1000);
  disposers.push(() => { stopped = true; clearInterval(iv); });

  return makeHandle(out, ctx, disposers);
}

function breath(ctx: AudioContext, out: GainNode, disposers: Array<() => void>): AmbientHandle {
  // 4초 주기: 1.5초 들숨 + 1.5초 날숨 + 1초 정적
  let stopped = false;

  const playBreath = () => {
    if (stopped) return;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.5);  // inhale attack
    gain.gain.linearRampToValueAtTime(0.25, t + 1.5);
    gain.gain.linearRampToValueAtTime(0.0001, t + 2.0);

    const buf = ctx.createBuffer(1, ctx.sampleRate * 2.5, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    noise.start(t);
    noise.stop(t + 2.2);
  };
  playBreath();
  const iv = window.setInterval(playBreath, 4000);
  disposers.push(() => { stopped = true; clearInterval(iv); });

  return makeHandle(out, ctx, disposers);
}

function door(ctx: AudioContext, out: GainNode, disposers: Array<() => void>): AmbientHandle {
  // 짧은 임펄스 + 빠른 decay (문 삐걱 한 번)
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (buf.length * 0.25));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1500;
  filter.Q.value = 4;

  noise.connect(filter);
  filter.connect(out);
  noise.start();
  // door 는 한 번만 재생, 끝나면 stop
  setTimeout(() => {
    try { noise.stop(); } catch {}
    try { filter.disconnect(); } catch {}
  }, 800);
  disposers.push(() => { try { noise.stop(); } catch {} });

  return makeHandle(out, ctx, disposers);
}
