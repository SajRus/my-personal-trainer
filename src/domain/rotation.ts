// Rotazione automatica degli esercizi: a ogni sessione dello stesso tipo si sceglie un esercizio
// diverso tra l'originale e le alternative, così l'allenamento non diventa monotono.
// È deterministica (dipende solo dalla data): l'anteprima dei giorni futuri è quindi affidabile.

import { COOLDOWN_POOLS, DAYS, EXERCISES, WARMUP_POOLS } from '../data/program';
import { addDays, diffDays, mondayOf } from './dates';
import { programDay } from './schedule';
import type { Equipment, EquipmentKind, ExerciseDef, ISODate, TimedItem, WorkoutDayType } from './types';

/** Il tappetino non è indispensabile: si può fare anche sul pavimento. */
const OPTIONAL: EquipmentKind[] = ['mat'];

function kindsNeeded(def: { equipment: EquipmentKind[] }, extra: EquipmentKind[] = []): EquipmentKind[] {
  return [...def.equipment, ...extra].filter((k) => !OPTIONAL.includes(k));
}

export function canDoExercise(def: ExerciseDef, owned: Set<EquipmentKind>): boolean {
  const v = def.variants[0];
  return kindsNeeded(def, [...(v.loadKind ? [v.loadKind] : []), ...(v.extraEquipment ?? [])]).every((k) => owned.has(k));
}

export function canDoTimed(item: TimedItem, owned: Set<EquipmentKind>): boolean {
  return kindsNeeded(item).every((k) => owned.has(k));
}

/**
 * Quante volte è già capitato un giorno di questo tipo dall'inizio del programma, prima di `date`
 * (0 = prima volta). Serve a far avanzare la rotazione di un passo a ogni sessione.
 */
export function occurrence(programStart: ISODate, date: ISODate, dayType: WorkoutDayType): number {
  const start = mondayOf(programStart);
  const days = diffDays(date, start);
  let n = 0;
  for (let i = 0; i < days; i++) {
    const d = programDay(programStart, addDays(start, i));
    if (d.dayType === dayType) n++;
  }
  return Math.max(0, n);
}

/** Sceglie dalla rosa l'elemento n-esimo tra quelli fattibili (se nessuno lo è, il primo). */
export function pick<T>(pool: T[], n: number, feasible: (x: T) => boolean): T {
  const ok = pool.filter(feasible);
  const list = ok.length ? ok : pool.slice(0, 1);
  return list[n % list.length];
}

export interface DayChoice {
  /** Per ogni blocco, gli esercizi scelti (1 o 2 per la superserie). */
  blocks: string[][];
  warmup: TimedItem[];
  cooldown: TimedItem[];
}

/** Gli esercizi di un giorno dopo la rotazione, tenendo conto dell'attrezzatura posseduta. */
export function chooseDay(dayType: WorkoutDayType, date: ISODate, programStart: ISODate, equipment: Equipment[]): DayChoice {
  const owned = new Set(equipment.map((e) => e.kind));
  const n = occurrence(programStart, date, dayType);
  const dayIndex = Math.max(0, diffDays(date, mondayOf(programStart)));
  const day = DAYS[dayType];
  return {
    blocks: day.blocks.map((b) =>
      b.exercises.map((id, i) => {
        const pool = [id, ...(b.alternatives?.[i] ?? [])];
        const feasible = (x: string) => canDoExercise(EXERCISES[x], owned);
        // se nulla è possibile (es. niente elastici), si prova con le riserve della posizione
        const fallback = b.fallbacks?.[i] ?? [];
        if (!pool.some(feasible) && fallback.some(feasible)) {
          // la riserva resta sempre la stessa: su quella si misura la progressione
          return pick(fallback, 0, feasible);
        }
        // l'offset per posizione evita che tutte le rose avanzino "in coro"
        return pick(pool, n + i, feasible);
      }),
    ),
    // riscaldamento e defaticamento cambiano ogni giorno: si usa il numero di giorni dall'inizio
    warmup: WARMUP_POOLS.map((pool, i) => pick(pool, dayIndex + i, (x) => canDoTimed(x, owned))),
    cooldown: COOLDOWN_POOLS.map((pool, i) => pick(pool, dayIndex + i, (x) => canDoTimed(x, owned))),
  };
}

/** La scelta "classica" senza rotazione: gli esercizi originali della tabella. */
export function defaultChoice(dayType: WorkoutDayType): DayChoice {
  return {
    blocks: DAYS[dayType].blocks.map((b) => [...b.exercises]),
    warmup: WARMUP_POOLS.map((p) => p[0]),
    cooldown: COOLDOWN_POOLS.map((p) => p[0]),
  };
}
