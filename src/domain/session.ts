// Trasforma un giorno del programma in una sequenza lineare di fasi che il
// player guidato scorre in automatico.

import { COOLDOWN, DAYS, EXERCISES, RULES, WARMUP } from '../data/program';
import { sessionTarget, variantOf } from './progression';
import type {
  Equipment,
  EquipmentKind,
  ExerciseDef,
  ExerciseState,
  Metric,
  Settings,
  TimedItem,
  VariantDef,
  WorkoutDayType,
} from './types';

export interface PlannedExercise {
  def: ExerciseDef;
  variant: VariantDef;
  target: number;
  loadId: string | null;
}

export interface PlannedBlock {
  id: string;
  sets: number;
  restSec: number;
  exercises: PlannedExercise[];
}

export interface SessionPlan {
  dayType: WorkoutDayType;
  deload: boolean;
  blocks: PlannedBlock[];
}

export function buildPlan(
  dayType: WorkoutDayType,
  states: Record<string, ExerciseState>,
  settings: Settings,
  deload: boolean,
): SessionPlan {
  const day = DAYS[dayType];
  return {
    dayType,
    deload,
    blocks: day.blocks.map((b) => ({
      id: b.id,
      sets: b.sets,
      restSec: b.rest === 'long' ? settings.restLongSec : settings.restShortSec,
      exercises: b.exercises.map((id) => {
        const def = EXERCISES[id];
        const state = states[id];
        if (!state) throw new Error(`Stato mancante per l'esercizio ${id}`);
        return {
          def,
          variant: variantOf(def, state),
          target: sessionTarget(def, state, deload),
          loadId: state.loadId,
        };
      }),
    })),
  };
}

// ---------------------------------------------------------------- fasi

export type Step =
  | { kind: 'timed'; phase: 'warmup' | 'cooldown'; item: TimedItem; seconds: number }
  /** Preparazione prima di un blocco: 1 esercizio o i 2 della superserie. */
  | { kind: 'prep'; exerciseIds: string[]; seconds: number }
  | {
      kind: 'work';
      exerciseId: string;
      blockId: string;
      setIndex: number;
      totalSets: number;
      target: number;
      metric: Metric;
      isLastSet: boolean;
      /** Posizione nella superserie: 0 = primo, 1 = secondo; null = esercizio singolo. */
      supersetPos: number | null;
    }
  | { kind: 'rest'; seconds: number; nextLabel: string };

export function buildSteps(plan: SessionPlan, settings: Settings): Step[] {
  const steps: Step[] = [];
  for (const item of WARMUP) steps.push({ kind: 'timed', phase: 'warmup', item, seconds: item.seconds });

  plan.blocks.forEach((block, bi) => {
    const superset = block.exercises.length > 1;
    steps.push({ kind: 'prep', exerciseIds: block.exercises.map((e) => e.def.id), seconds: settings.prepSec });
    for (let set = 0; set < block.sets; set++) {
      block.exercises.forEach((ex, ei) => {
        steps.push({
          kind: 'work',
          exerciseId: ex.def.id,
          blockId: block.id,
          setIndex: set,
          totalSets: block.sets,
          target: ex.target,
          metric: ex.def.metric,
          isLastSet: set === block.sets - 1,
          supersetPos: superset ? ei : null,
        });
      });
      const lastOfSession = bi === plan.blocks.length - 1 && set === block.sets - 1;
      if (!lastOfSession) {
        const nextBlock = set === block.sets - 1 ? plan.blocks[bi + 1] : block;
        const nextLabel =
          set === block.sets - 1
            ? nextBlock.exercises.map((e) => e.variant.name).join(' + ')
            : `Serie ${set + 2} di ${block.sets}`;
        steps.push({ kind: 'rest', seconds: block.restSec, nextLabel });
      }
    }
  });

  for (const item of COOLDOWN) steps.push({ kind: 'timed', phase: 'cooldown', item, seconds: item.seconds });
  return steps;
}

export function stepSeconds(step: Step): number {
  switch (step.kind) {
    case 'timed':
    case 'prep':
    case 'rest':
      return step.seconds;
    case 'work': {
      if (step.metric === 'seconds') return step.target;
      const def = EXERCISES[step.exerciseId];
      return step.target * RULES.secondsPerRep * (def.perSide ? 2 : 1);
    }
  }
}

export function estimateSeconds(steps: Step[]): number {
  return steps.reduce((sum, s) => sum + stepSeconds(s), 0);
}

// ---------------------------------------------------------------- attrezzi da preparare

export interface GearItem {
  kind: EquipmentKind;
  /** Attrezzo specifico (es. elastico Rosso) quando è noto. */
  items: Equipment[];
  anchors: string[];
}

export function gearForPlan(plan: SessionPlan, equipment: Equipment[]): GearItem[] {
  const map = new Map<EquipmentKind, GearItem>();
  const add = (kind: EquipmentKind, id?: string | null, anchor?: string) => {
    const g = map.get(kind) ?? { kind, items: [], anchors: [] };
    const e = id ? equipment.find((x) => x.id === id) : undefined;
    if (e && !g.items.some((x) => x.id === e.id)) g.items.push(e);
    if (anchor && !g.anchors.includes(anchor)) g.anchors.push(anchor);
    map.set(kind, g);
  };
  for (const w of WARMUP) w.equipment.forEach((k) => add(k));
  for (const b of plan.blocks) {
    for (const ex of b.exercises) {
      const kinds = [...ex.def.equipment, ...(ex.variant.extraEquipment ?? [])];
      if (ex.variant.loadKind) kinds.push(ex.variant.loadKind);
      for (const k of kinds) {
        add(k, k === ex.variant.loadKind ? ex.loadId : null, k === 'tube-band' ? ex.def.anchor : undefined);
      }
    }
  }
  for (const c of COOLDOWN) c.equipment.forEach((k) => add(k));
  return [...map.values()];
}
