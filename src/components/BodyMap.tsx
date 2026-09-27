// Figura del corpo (fronte e retro) con i muscoli colorabili. Disegno originale a forme
// semplici, stile manichino. Il lato destro è lo specchio del sinistro.

import { useState } from 'react';
import { MUSCLE_LABEL } from '../data/program';
import type { MuscleMap } from '../domain/stats';
import type { MuscleGroup } from '../domain/types';

type Shape =
  | { d: string; m?: MuscleGroup; mirror?: boolean }
  | { e: [number, number, number, number, number?]; m?: MuscleGroup; mirror?: boolean };

// ---------------------------------------------------------------- forme (viewBox 0 0 100 210)

const HEAD: Shape[] = [
  { e: [50, 15, 9, 11] },
  { d: 'M45,24 L55,24 L56,31 L44,31 Z' },
];

const LIMBS_NEUTRAL: Shape[] = [
  { e: [22, 78, 4.5, 11.5, 12], mirror: true }, // avambraccio
  { e: [18.5, 95, 3.5, 5], mirror: true }, // mano
  { e: [42, 164, 5, 4], mirror: true }, // ginocchio
  { e: [42, 203, 5, 3], mirror: true }, // piede
];

const FRONT: Shape[] = [
  ...HEAD,
  { e: [30, 38, 7.5, 7], m: 'spalle', mirror: true },
  { d: 'M50,34 L50,53 Q42,56 35,51 Q31,44 35,37 Q42,33 50,34 Z', m: 'petto', mirror: true },
  { e: [26, 55, 5, 10.5, 10], m: 'bicipiti', mirror: true },
  { d: 'M42.5,61 Q42.5,56 47.5,56 L52.5,56 Q57.5,56 57.5,61 L57.5,89 Q57.5,94 52.5,94 L47.5,94 Q42.5,94 42.5,89 Z', m: 'core' },
  { d: 'M36,55 Q41,57 41.5,60 L41.5,93 Q38,90 36.5,84 Q34,70 36,55 Z', m: 'core', mirror: true },
  { d: 'M37,96 L63,96 Q64,106 60,112 L50,118 L40,112 Q36,106 37,96 Z' },
  { d: 'M36.5,108 Q33,122 34.5,140 Q36,154 39,160 L46.5,160 Q48.5,140 48.5,122 L48,116 L40,112 Z', m: 'quadricipiti', mirror: true },
  { d: 'M37.5,168 Q37,185 39.5,200 L44.5,200 Q47,185 46.5,168 Z', mirror: true }, // tibia
  ...LIMBS_NEUTRAL,
];

const BACK: Shape[] = [
  ...HEAD,
  { d: 'M42,27 L58,27 Q66,31 69,34 L58,40 L50,52 L42,40 L31,34 Q34,31 42,27 Z', m: 'schiena' }, // trapezio
  { e: [30, 38, 7.5, 7], m: 'spalle', mirror: true },
  { e: [26, 55, 5, 10.5, 10], m: 'tricipiti', mirror: true },
  { d: 'M35,44 L42,41 L50,53 L50,78 Q44,80 39,76 Q34,62 35,44 Z', m: 'schiena', mirror: true }, // dorsali
  { d: 'M40,78 Q45,81 50,80 Q55,81 60,78 L61,94 L39,94 Z', m: 'core' }, // lombari
  { d: 'M37,95 L50,96 L50,116 Q43,120 37,115 Q34,105 37,95 Z', m: 'glutei', mirror: true },
  { d: 'M36,117 Q43,121 49,118 Q48.5,140 46.5,160 L39,160 Q35,150 34.5,135 Q34.5,125 36,117 Z', m: 'femorali', mirror: true },
  { e: [42, 180, 5, 13], mirror: true }, // polpaccio
  ...LIMBS_NEUTRAL,
];

const NEUTRAL = '#243040';
const OUTLINE = '#0b0f14';

function ShapeEl({ s, fill, onPick }: { s: Shape; fill: string; onPick?: () => void }) {
  const props = {
    fill,
    stroke: OUTLINE,
    strokeWidth: 1.2,
    onClick: onPick,
    style: onPick ? { cursor: 'pointer' } : undefined,
  };
  const title = s.m ? <title>{MUSCLE_LABEL[s.m]}</title> : null;
  if ('d' in s)
    return (
      <path d={s.d} {...props}>
        {title}
      </path>
    );
  const [cx, cy, rx, ry, rot] = s.e;
  return (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined} {...props}>
      {title}
    </ellipse>
  );
}

function Figure({
  shapes,
  label,
  colorOf,
  onPick,
}: {
  shapes: Shape[];
  label: string;
  colorOf: (m: MuscleGroup) => string | null;
  onPick: (m: MuscleGroup) => void;
}) {
  const render = (s: Shape, i: number, mirrored: boolean) => {
    const fill = (s.m && colorOf(s.m)) || NEUTRAL;
    return <ShapeEl key={`${mirrored ? 'r' : 'l'}${i}`} s={s} fill={fill} onPick={s.m ? () => onPick(s.m!) : undefined} />;
  };
  return (
    <figure className="flex flex-1 flex-col items-center">
      <svg viewBox="0 0 100 210" className="h-auto w-full max-w-[9rem]" role="img" aria-label={`Figura ${label.toLowerCase()}`}>
        {shapes.map((s, i) => render(s, i, false))}
        <g transform="matrix(-1 0 0 1 100 0)">{shapes.map((s, i) => (s.mirror ? render(s, i, true) : null))}</g>
      </svg>
      <figcaption className="text-xs text-slate-500">{label}</figcaption>
    </figure>
  );
}

/**
 * Mappa del corpo. `colorOf` decide il colore di ogni muscolo (null = neutro);
 * `describe` il testo mostrato quando si tocca un muscolo.
 */
export function BodyMap({
  colorOf,
  describe,
  className = '',
}: {
  colorOf: (m: MuscleGroup) => string | null;
  describe?: (m: MuscleGroup) => string;
  className?: string;
}) {
  const [picked, setPicked] = useState<MuscleGroup | null>(null);
  return (
    <div className={className}>
      <div className="flex justify-center gap-4">
        <Figure shapes={FRONT} label="Fronte" colorOf={colorOf} onPick={setPicked} />
        <Figure shapes={BACK} label="Retro" colorOf={colorOf} onPick={setPicked} />
      </div>
      <p className="mt-1 min-h-[1.25rem] text-center text-sm text-slate-300" aria-live="polite">
        {picked ? `${MUSCLE_LABEL[picked]}${describe ? `: ${describe(picked)}` : ''}` : 'Tocca un muscolo per il nome'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- mappa di un esercizio


// Tre livelli di luminosità ben separati (neutro scuro → secondario medio → principale chiaro),
// così si distinguono anche senza vedere i colori.
export const INVOLVEMENT_COLOR = { primary: '#4ade80', secondary: '#15803d' };

/** Mappa + legenda per uno o più esercizi: principali pieni, secondari tenui. */
export function MuscleSummary({ map, compact = false }: { map: MuscleMap; compact?: boolean }) {
  const primary = (Object.keys(map) as MuscleGroup[]).filter((m) => map[m] === 'primary');
  const secondary = (Object.keys(map) as MuscleGroup[]).filter((m) => map[m] === 'secondary');
  return (
    <div className="flex flex-col gap-2">
      {!compact && (
        <BodyMap
          colorOf={(m) => (map[m] ? INVOLVEMENT_COLOR[map[m]!] : null)}
          describe={(m) => (map[m] === 'primary' ? 'lavora di più' : map[m] === 'secondary' ? 'aiuta' : 'non coinvolto')}
        />
      )}
      <div className="flex flex-col gap-1 text-sm">
        {primary.length > 0 && (
          <p className="flex flex-wrap items-center gap-x-2">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <span className="h-3 w-3 rounded-sm" style={{ background: INVOLVEMENT_COLOR.primary }} /> Principali:
            </span>
            <span className="text-slate-100">{primary.map((m) => MUSCLE_LABEL[m]).join(', ')}</span>
          </p>
        )}
        {secondary.length > 0 && (
          <p className="flex flex-wrap items-center gap-x-2">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <span className="h-3 w-3 rounded-sm" style={{ background: INVOLVEMENT_COLOR.secondary }} /> Secondari:
            </span>
            <span className="text-slate-300">{secondary.map((m) => MUSCLE_LABEL[m]).join(', ')}</span>
          </p>
        )}
      </div>
    </div>
  );
}
