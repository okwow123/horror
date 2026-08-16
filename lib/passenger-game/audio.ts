// PASSENGER — Web Audio API 사운드 매니저.
// 외부 파일 없이 합성. On/Off 가능.
//
// 사용법:
//   const audio = new PassengerAudio();
//   audio.start('road');
//   audio.stop();
//   audio.setEnabled(false);

export type AmbientMode = 'road' | 'forest' | 'camper' | 'motel' | 'silence' | 'tension' | 'basement' | 'final';

export class PassengerAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private intervals: number[] = [];
  private enabled = true;
  private currentMode: AmbientMode | null = null;

  isEnabled() { return this.enabled; }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (!v) this.stop();
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  start(mode: AmbientMode) {
    if (!this.enabled) return;
    if (this.currentMode === mode) return;
    this.stop();
    this.currentMode = mode;
    const ctx = this.ensureCtx();
    const out = this.masterGain!;

    switch (mode) {
      case 'road':    this.startRoad(ctx, out); break;
      case 'forest':  this.startForest(ctx, out); break;
      case 'camper':  this.startCamper(ctx, out); break;
      case 'motel':   this.startMotel(ctx, out); break;
      case 'tension': this.startTension(ctx, out); break;
      case 'basement':this.startBasement(ctx, out); break;
      case 'final':   this.startFinal(ctx, out); break;
      case 'silence':
      default:
        // 무음
        break;
    }
  }

  stop() {
    this.nodes.forEach(n => { try { (n as any).stop?.(); } catch {} });
    this.intervals.forEach(id => clearInterval(id));
    this.nodes = [];
    this.intervals = [];
    this.currentMode = null;
  }

  // 공개 유틸: 짧은 효과음
  beep(kind: 'click' | 'pickup' | 'locked' | 'pulse' | 'whisper' = 'click') {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain!);
    switch (kind) {
      case 'click':
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.15, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        osc.start(t); osc.stop(t + 0.07);
        break;
      case 'pickup':
        osc.frequency.value = 600; osc.type = 'triangle';
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        osc.start(t); osc.stop(t + 0.2);
        break;
      case 'locked':
        osc.frequency.value = 220; osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        osc.start(t); osc.stop(t + 0.3);
        break;
      case 'pulse':
        osc.frequency.value = 40; osc.type = 'sine';
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        osc.start(t); osc.stop(t + 0.45);
        break;
      case 'whisper':
        // 노이즈 + 필터 (속삭임)
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1800;
        filter.Q.value = 8;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        noise.connect(filter);
        filter.connect(g);
        g.connect(this.masterGain!);
        noise.start(t); noise.stop(t + 0.6);
        break;
    }
  }

  // --- 모드별 합성 ---

  private startRoad(ctx: AudioContext, out: AudioNode) {
    // 저주파 엔진 + 고주파 바람
    const engineOsc = ctx.createOscillator();
    engineOsc.frequency.value = 60; engineOsc.type = 'sawtooth';
    const engineGain = ctx.createGain();
    engineGain.gain.value = 0.04;
    engineOsc.connect(engineGain); engineGain.connect(out);
    engineOsc.start();
    this.nodes.push(engineOsc);

    // 백색 잡음 (바람)
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const wind = ctx.createBufferSource(); wind.buffer = buf; wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 600;
    const windGain = ctx.createGain(); windGain.gain.value = 0.05;
    wind.connect(windFilter); windFilter.connect(windGain); windGain.connect(out);
    wind.start();
    this.nodes.push(wind);
  }

  private startForest(ctx: AudioContext, out: AudioNode) {
    // 바람 + 가끔 새소리
    const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    const wind = ctx.createBufferSource(); wind.buffer = buf; wind.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 400;
    const g = ctx.createGain(); g.gain.value = 0.15;
    wind.connect(filt); filt.connect(g); g.connect(out);
    wind.start();
    this.nodes.push(wind);

    // 가끔 부엉/새소리 (짧은 chirp)
    const chirp = () => {
      if (this.currentMode !== 'forest') return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gn = ctx.createGain();
      osc.frequency.value = 700 + Math.random() * 600;
      osc.type = 'sine';
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      osc.connect(gn); gn.connect(out);
      osc.start(t); osc.stop(t + 0.12);
    };
    this.intervals.push(window.setInterval(() => { if (Math.random() < 0.3) chirp(); }, 2000));
  }

  private startCamper(ctx: AudioContext, out: AudioNode) {
    // 낮은 드론
    const osc = ctx.createOscillator();
    osc.frequency.value = 50; osc.type = 'sine';
    const g = ctx.createGain(); g.gain.value = 0.06;
    osc.connect(g); g.connect(out);
    osc.start();
    this.nodes.push(osc);

    // 아주 약한 잡음 (차 밖)
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 300;
    const ng = ctx.createGain(); ng.gain.value = 0.05;
    noise.connect(filt); filt.connect(ng); ng.connect(out);
    noise.start();
    this.nodes.push(noise);
  }

  private startMotel(ctx: AudioContext, out: AudioNode) {
    // 으스스한 드론 + 가끔 삐걱
    const osc = ctx.createOscillator();
    osc.frequency.value = 38; osc.type = 'sine';
    const g = ctx.createGain(); g.gain.value = 0.07;
    osc.connect(g); g.connect(out);
    osc.start();
    this.nodes.push(osc);

    // 가끔 삐걱 (5~10초마다)
    const creak = () => {
      if (this.currentMode !== 'motel') return;
      const t = ctx.currentTime;
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.frequency.value = 80 + Math.random() * 60;
      osc2.type = 'sawtooth';
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(0.05, t + 0.05);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc2.connect(g2); g2.connect(out);
      osc2.start(t); osc2.stop(t + 0.55);
    };
    this.intervals.push(window.setInterval(creak, 7000));
  }

  private startTension(ctx: AudioContext, out: AudioNode) {
    // 빠른 심장박동
    const beat = () => {
      if (this.currentMode !== 'tension') return;
      const t = ctx.currentTime;
      [0, 0.13].forEach(d => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.value = 55; osc.type = 'sine';
        g.gain.setValueAtTime(0.0001, t + d);
        g.gain.exponentialRampToValueAtTime(0.5, t + d + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18);
        osc.connect(g); g.connect(out);
        osc.start(t + d); osc.stop(t + d + 0.2);
      });
    };
    beat();
    this.intervals.push(window.setInterval(beat, 700));
  }

  private startBasement(ctx: AudioContext, out: AudioNode) {
    // 낮은 울림 (지하의 공명)
    const osc1 = ctx.createOscillator();
    osc1.frequency.value = 32; osc1.type = 'sine';
    const g1 = ctx.createGain(); g1.gain.value = 0.12;
    osc1.connect(g1); g1.connect(out);
    osc1.start();
    this.nodes.push(osc1);

    // 두 번째 옥타브 (으스스)
    const osc2 = ctx.createOscillator();
    osc2.frequency.value = 64; osc2.type = 'triangle';
    const g2 = ctx.createGain(); g2.gain.value = 0.04;
    osc2.connect(g2); g2.connect(out);
    osc2.start();
    this.nodes.push(osc2);

    // 물 떨어지는 소리 (드롭)
    const drop = () => {
      if (this.currentMode !== 'basement') return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = 180; osc.type = 'sine';
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(g); g.connect(out);
      osc.start(t); osc.stop(t + 0.2);
    };
    this.intervals.push(window.setInterval(drop, 3000));
  }

  private startFinal(ctx: AudioContext, out: AudioNode) {
    // 최종장소: 강한 저음 + 고주파 떨림
    const osc1 = ctx.createOscillator();
    osc1.frequency.value = 28; osc1.type = 'sine';
    const g1 = ctx.createGain(); g1.gain.value = 0.18;
    osc1.connect(g1); g1.connect(out);
    osc1.start();
    this.nodes.push(osc1);

    // 떨리는 고주파
    const osc2 = ctx.createOscillator();
    osc2.frequency.value = 1100; osc2.type = 'sawtooth';
    const g2 = ctx.createGain(); g2.gain.value = 0.03;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 6;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(g2.gain);
    osc2.connect(g2); g2.connect(out);
    osc2.start(); lfo.start();
    this.nodes.push(osc2, lfo);

    // 심장박동 (느리지만 강한)
    const beat = () => {
      if (this.currentMode !== 'final') return;
      const t = ctx.currentTime;
      [0, 0.18].forEach(d => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 45; o.type = 'sine';
        g.gain.setValueAtTime(0.0001, t + d);
        g.gain.exponentialRampToValueAtTime(0.55, t + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.25);
        o.connect(g); g.connect(out);
        o.start(t + d); o.stop(t + d + 0.3);
      });
    };
    beat();
    this.intervals.push(window.setInterval(beat, 1100));
  }
}
