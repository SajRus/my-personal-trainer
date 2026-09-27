import { useEffect, useState } from 'react';
import { MEDIA } from '../data/media';

/** Foto dell'esercizio: alterna i fotogrammi (posizione iniziale ↔ finale) come una piccola animazione. */
export function ExerciseImage({
  illustration,
  className = '',
  interval = 1200,
  paused = false,
}: {
  illustration: string;
  className?: string;
  interval?: number;
  paused?: boolean;
}) {
  const media = MEDIA[illustration];
  const [frame, setFrame] = useState(0);
  const count = media?.frames.length ?? 0;

  useEffect(() => {
    setFrame(0);
    if (count < 2 || paused) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % count), interval);
    return () => clearInterval(t);
  }, [illustration, count, interval, paused]);

  if (!media) return null;
  const base = import.meta.env.BASE_URL;
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white ${className}`}>
      {media.frames.map((src, i) => (
        <img
          key={src}
          src={base + src}
          alt=""
          draggable={false}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
            i === frame ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      {count > 1 && (
        <div className="absolute bottom-2 right-2 flex gap-1">
          {media.frames.map((src, i) => (
            <span key={src} className={`h-1.5 w-1.5 rounded-full ${i === frame ? 'bg-slate-800' : 'bg-slate-400'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MediaCredit({ illustration }: { illustration: string }) {
  const m = MEDIA[illustration];
  if (!m) return null;
  return (
    <p className="text-xs text-slate-500">
      Foto: {m.author ?? 'autore sconosciuto'} · {m.license} ·{' '}
      <a href={m.source} target="_blank" rel="noreferrer" className="underline">
        fonte
      </a>
    </p>
  );
}
