// Guida vocale in italiano con la Web Speech API.

let voice: SpeechSynthesisVoice | null = null;

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  voice = voices.find((v) => v.lang === 'it-IT' && v.localService) ?? voices.find((v) => v.lang.startsWith('it')) ?? null;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'it-IT';
  if (voice) u.voice = voice;
  u.rate = 1.05;
  synth.speak(u);
}

/** Su iOS la sintesi vocale parte solo se la prima frase nasce da un tocco. */
export function unlockSpeech() {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  window.speechSynthesis.speak(u);
}

export function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
