import { useEffect } from 'react';
import type { Settings } from '../domain/types';
import { setAudioSession } from './audio';
import { music, type MusicMode } from './music';

/** Prepara la sessione audio del telefono in base alla scelta di musica (dentro il tocco su "Inizia"). */
export function prepareAudioSession(settings: Settings) {
  const m = settings.music ?? 'energia';
  setAudioSession(m === 'mine' ? 'ambient' : m === 'off' ? 'auto' : 'playback');
}

/** Colonna sonora durante un allenamento o i test: parte, segue la fase, si ferma alla fine. */
export function useWorkoutMusic(settings: Settings, opts: { active: boolean; paused: boolean; mode: MusicMode; muted: boolean }) {
  const style = settings.music ?? 'energia';
  const enabled = (style === 'energia' || style === 'chill') && !opts.muted;
  const volume = (settings.musicVolume ?? 50) / 100;

  useEffect(() => {
    if (enabled && opts.active && !opts.paused) music.start(style, volume);
    else music.stop(opts.active ? 0.3 : 1.2);
  }, [enabled, opts.active, opts.paused, style, volume]);

  useEffect(() => {
    music.setMode(opts.mode);
  }, [opts.mode]);

  useEffect(() => () => music.stop(0.5), []);
}
