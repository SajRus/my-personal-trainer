import { MEDIA } from '../data/media';
import { EQUIPMENT_KIND_LABEL } from '../data/program';
import { musclesOf } from '../domain/stats';
import type { Anchor, EquipmentKind, ExerciseDef, MuscleGroup, TimedItem, VariantDef } from '../domain/types';
import { MuscleSummary } from './BodyMap';
import { ExerciseImage, MediaCredit } from './ExerciseImage';

export interface InfoItem {
  name: string;
  description: string;
  tips: [string, string, string];
  illustration: string;
  anchor?: Anchor;
  note?: string;
  equipment?: EquipmentKind[];
  muscles?: MuscleGroup[];
  secondary?: MuscleGroup[];
}

export const ANCHOR_LABEL: Record<Anchor, string> = {
  alto: 'Ancoraggio alto: sopra la porta',
  medio: 'Ancoraggio medio: all’altezza della maniglia',
  basso: 'Ancoraggio basso: in fondo alla porta',
};

/** Scheda dell'esercizio: foto, descrizione, ancoraggio e 3 consigli di esecuzione. */
export function ExerciseInfo({ item }: { item: InfoItem }) {
  const photoNote = MEDIA[item.illustration]?.note;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold">{item.name}</h2>
      <ExerciseImage illustration={item.illustration} className="aspect-[4/3] w-full" />
      {photoNote && <p className="-mt-2 text-sm italic text-slate-400">{photoNote}</p>}
      <p className="text-lg leading-snug">{item.description}</p>
      {item.note && <p className="rounded-xl bg-accent/10 p-3 text-base text-accent">{item.note}</p>}
      {item.anchor && <p className="rounded-xl bg-rest/10 p-3 text-base text-rest">{ANCHOR_LABEL[item.anchor]}</p>}
      {item.equipment && item.equipment.length > 0 && (
        <p className="text-slate-400">Attrezzi: {item.equipment.map((k) => EQUIPMENT_KIND_LABEL[k]).join(', ')}</p>
      )}
      {item.muscles && item.muscles.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Muscoli coinvolti</h3>
          <MuscleSummary map={musclesOf([item])} />
        </div>
      )}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Come farlo bene</h3>
        <ol className="flex flex-col gap-2">
          {item.tips.map((t, i) => (
            <li key={t} className="flex gap-3 text-base">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-line text-sm font-bold">
                {i + 1}
              </span>
              {t}
            </li>
          ))}
        </ol>
      </div>
      <MediaCredit illustration={item.illustration} />
    </div>
  );
}

export function infoFromExercise(def: ExerciseDef, variant: VariantDef): InfoItem {
  return {
    name: variant.name,
    description: def.description,
    tips: def.tips,
    illustration: def.illustration,
    anchor: def.anchor,
    note: variant.note,
    muscles: def.muscles,
    secondary: def.secondary,
    equipment: [...new Set([...def.equipment, ...(variant.loadKind ? [variant.loadKind] : []), ...(variant.extraEquipment ?? [])])],
  };
}

export function infoFromTimed(item: TimedItem): InfoItem {
  return { ...item };
}
