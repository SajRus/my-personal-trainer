// Beep generati con Web Audio (nessun file audio da scaricare).
// Su iOS l'audio si sblocca solo dopo un tocco: chiamare unlockAudio() nel click di "Inizia".

let ctx: AudioContext | null = null;

export function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx ??= new AC();
    void ctx.resume();
    // un buffer muto "sveglia" l'audio su Safari
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    ctx = null;
  }
}

function tone(freq: number, duration: number, delay = 0, volume = 0.35) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

/** Beep corto per il conto alla rovescia 3-2-1. */
export function countdownBeep() {
  tone(880, 0.12);
}

/** Beep lungo a doppia nota per la fine di una fase. */
export function endBeep() {
  tone(988, 0.15);
  tone(1319, 0.35, 0.16);
}
