// Colonna sonora generata in tempo reale con Web Audio: nessun file da scaricare (funziona offline)
// e nessun problema di diritti. Due stili, con un sequencer a 16 passi e una progressione
// di accordi in La minore (Am – F – C – G).
//
// Durante l'allenamento la musica segue la fase: piena nelle serie, ovattata nei recuperi,
// più tranquilla in riscaldamento/defaticamento. Si abbassa quando parla la guida vocale.

import { getAudioContext } from './audio';
import { setSpeakingListener } from './speech';

export type MusicStyle = 'energia' | 'chill';
export type MusicMode = 'work' | 'rest' | 'calm';

const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

// accordi e bassi (MIDI), voice leading vicino per suonare morbido
const CHORDS = [
  [57, 60, 64], // Am
  [57, 60, 65], // F
  [55, 60, 64], // C
  [55, 59, 62], // G
];
const BASS = [45, 41, 48, 43]; // A2 F2 C3 G2: frequenze che un altoparlante di telefono riesce a riprodurre

const STYLE = {
  energia: { bpm: 124, swing: 0 },
  chill: { bpm: 88, swing: 0.12 },
} as const;

const MODE: Record<MusicMode, { cutoff: number; gain: number }> = {
  work: { cutoff: 16000, gain: 1 },
  calm: { cutoff: 3200, gain: 0.8 },
  rest: { cutoff: 750, gain: 0.65 },
};

class Music {
  private ctx: AudioContext | null = null;
  private vol!: GainNode;
  private duckGain!: GainNode;
  private modeGain!: GainNode;
  private filter!: BiquadFilterNode;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private nextTime = 0;
  private step = 0;
  private bar = 0;
  private style: MusicStyle = 'energia';
  private mode: MusicMode = 'calm';
  private volume = 0.5;
  private running = false;

  get isPlaying() {
    return this.running;
  }

  private setup(): boolean {
    const ctx = getAudioContext();
    if (!ctx) return false;
    if (this.ctx === ctx) return true;
    this.ctx = ctx;
    this.vol = ctx.createGain();
    this.duckGain = ctx.createGain();
    this.modeGain = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 0.7;
    this.vol.connect(this.modeGain).connect(this.duckGain).connect(this.filter).connect(ctx.destination);
    // un secondo di rumore bianco, riusato per rullante e charleston
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;
    return true;
  }

  /** Va chiamata dopo unlockAudio() (cioè dopo un tocco dell'utente). */
  start(style: MusicStyle, volume: number) {
    if (!this.setup() || !this.ctx) return;
    this.style = style;
    this.setVolume(volume);
    this.applyMode(0);
    if (this.running) return;
    this.running = true;
    this.step = 0;
    this.bar = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.vol.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.vol.gain.exponentialRampToValueAtTime(this.level(), this.ctx.currentTime + 1.2);
    this.timer = setInterval(() => this.tick(), 25);
  }

  stop(fade = 0.8) {
    if (!this.ctx || !this.running) return;
    this.running = false;
    const t = this.ctx.currentTime;
    this.vol.gain.cancelScheduledValues(t);
    this.vol.gain.setValueAtTime(Math.max(this.vol.gain.value, 0.0001), t);
    this.vol.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    const timer = this.timer;
    setTimeout(() => clearInterval(timer), fade * 1000 + 100);
  }

  pause() {
    this.stop(0.3);
  }

  resume() {
    if (this.ctx && !this.running) this.start(this.style, this.volume);
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.ctx && this.running) this.vol.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.2);
  }

  setMode(mode: MusicMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.applyMode(0.6);
  }

  /** Abbassa la musica mentre parla la guida vocale. */
  duck(on: boolean) {
    if (!this.ctx) return;
    this.duckGain.gain.setTargetAtTime(on ? 0.3 : 1, this.ctx.currentTime, on ? 0.05 : 0.3);
  }

  private level() {
    // curva percettiva: metà slider ≈ metà volume percepito, con margine per voce e beep
    return Math.max(0.0001, this.volume ** 2 * 0.55);
  }

  private applyMode(time: number) {
    if (!this.ctx) return;
    const m = MODE[this.mode];
    const t = this.ctx.currentTime;
    this.filter.frequency.setTargetAtTime(m.cutoff, t, time / 3 + 0.001);
    this.modeGain.gain.setTargetAtTime(m.gain, t, time / 3 + 0.001);
  }

  // ---------------------------------------------------------------- sequencer

  private tick() {
    if (!this.ctx || !this.running) return;
    const { bpm, swing } = STYLE[this.style];
    const stepDur = 60 / bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      const t = this.nextTime + (this.step % 2 === 1 ? swing * stepDur : 0);
      if (this.style === 'energia') this.energia(this.step, this.bar, t, stepDur);
      else this.chill(this.step, this.bar, t, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar = (this.bar + 1) % 4;
    }
  }

  private energia(s: number, bar: number, t: number, d: number) {
    const busy = this.mode === 'work';
    if (s % 4 === 0) this.kick(t, 1);
    if (s === 4 || s === 12) this.clap(t, 0.8);
    if (s % 4 === 2) this.hat(t, 0.9, true);
    else if (busy && s % 2 === 1) this.hat(t, 0.35, false);
    if (s % 4 === 2) this.bass(t, BASS[bar] + (s === 10 ? 12 : 0), d * 1.6);
    if (busy) {
      const chord = CHORDS[bar];
      this.pluck(t, chord[s % 3] + 12 + (s >= 8 ? 12 : 0), 0.06);
    } else if (s === 0) {
      this.pad(t, CHORDS[bar], d * 16, 0.035);
    }
  }

  private chill(s: number, bar: number, t: number, d: number) {
    if (s === 0 || s === 10) this.kick(t, 0.7);
    if (s === 7) this.kick(t, 0.35);
    if (s === 4 || s === 12) this.snareSoft(t, 0.55);
    if (s % 2 === 0) this.hat(t, s % 4 === 0 ? 0.3 : 0.18, false);
    if (s === 0) this.pad(t, CHORDS[bar], d * 16, 0.05);
    if (s === 0 || s === 10) this.bass(t, BASS[bar], d * 5);
    if (this.mode === 'work' && (s === 3 || s === 6 || s === 14)) this.pluck(t, CHORDS[bar][(s + bar) % 3] + 12, 0.045);
  }

  // ---------------------------------------------------------------- strumenti

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private kick(t: number, vel: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
    this.env(g, t, 0.9 * vel, 0.003, 0.28);
    o.connect(g).connect(this.vol);
    o.start(t);
    o.stop(t + 0.35);
    // "click" iniziale: si sente anche dall'altoparlante del telefono
    this.noiseHit(t, 'highpass', 2500, 0.12 * vel, 0.012);
  }

  private clap(t: number, vel: number) {
    for (const dt of [0, 0.012, 0.024]) this.noiseHit(t + dt, 'bandpass', 1500, 0.35 * vel, dt === 0.024 ? 0.14 : 0.02);
  }

  private snareSoft(t: number, vel: number) {
    this.noiseHit(t, 'bandpass', 1100, 0.3 * vel, 0.16);
  }

  private hat(t: number, vel: number, open: boolean) {
    this.noiseHit(t, 'highpass', 7500, 0.12 * vel, open ? 0.11 : 0.035);
  }

  private noiseHit(t: number, type: BiquadFilterType, freq: number, peak: number, decay: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    this.env(g, t, peak, 0.002, decay);
    src.connect(f).connect(g).connect(this.vol);
    src.start(t, Math.random() * 0.5);
    src.stop(t + decay + 0.05);
  }

  private bass(t: number, midi: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = midiHz(midi);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 5;
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(260, t + dur);
    const g = ctx.createGain();
    this.env(g, t, 0.22, 0.005, dur);
    o.connect(f).connect(g).connect(this.vol);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private pluck(t: number, midi: number, peak: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = midiHz(midi);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(3200, t);
    f.frequency.exponentialRampToValueAtTime(700, t + 0.15);
    const g = ctx.createGain();
    this.env(g, t, peak, 0.003, 0.16);
    o.connect(f).connect(g).connect(this.vol);
    o.start(t);
    o.stop(t + 0.22);
  }

  private pad(t: number, notes: number[], dur: number, peak: number) {
    const ctx = this.ctx!;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1400;
    f.connect(this.vol);
    for (const n of notes) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = midiHz(n);
      o.detune.value = (Math.random() - 0.5) * 8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.6);
      g.gain.setValueAtTime(peak, t + dur - 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(f);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }
}

export const music = new Music();
setSpeakingListener((speaking) => music.duck(speaking));
