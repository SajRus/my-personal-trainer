// Statistiche per la schermata Progressi. Funzioni pure.

import { EXERCISES, MUSCLE_MACRO, MUSCLES, type MacroGroup } from '../data/program';
import { addDays, diffDays } from './dates';
import { programDay } from './schedule';
import type { ISODate, MuscleGroup, SessionLog } from './types';

export function macroOf(exerciseId: string): MacroGroup | null {
  const first = EXERCISES[exerciseId]?.muscles[0];
  if (!first) return null;
  for (const [k, g] of Object.entries(MUSCLE_MACRO)) {
    if ((g.muscles as readonly string[]).includes(first)) return k as MacroGroup;
  }
  return null;
}

export type WeeklyVolume = { week: number } & Record<MacroGroup, number>;

/** Serie svolte per macro-gruppo muscolare, settimana per settimana (settimane assolute del programma). */
export function weeklySets(sessions: SessionLog[], programStart: ISODate): WeeklyVolume[] {
  const byWeek = new Map<number, WeeklyVolume>();
  for (const s of sessions) {
    const week = programDay(programStart, s.date).absWeek;
    if (week < 1) continue;
    const row = byWeek.get(week) ?? { week, spinta: 0, tirata: 0, gambe: 0, core: 0 };
    for (const set of s.sets) {
      const g = macroOf(set.exerciseId);
      if (g && set.done > 0) row[g] += 1;
    }
    byWeek.set(week, row);
  }
  if (byWeek.size === 0) return [];
  const last = Math.max(...byWeek.keys());
  // settimane senza sessioni compaiono a zero, così i buchi si vedono
  return Array.from({ length: last }, (_, i) => byWeek.get(i + 1) ?? { week: i + 1, spinta: 0, tirata: 0, gambe: 0, core: 0 });
}

/** Giorni in cui è stato fatto qualcosa: allenamento, test o riposo attivo. */
export function activeDays(sessions: SessionLog[], testDates: ISODate[], activeRest: ISODate[]): Set<ISODate> {
  return new Set([...sessions.map((s) => s.date), ...testDates, ...activeRest]);
}

/**
 * Serie di giorni consecutivi: quanti giorni di allenamento/test previsti di fila sono stati fatti,
 * contando all'indietro da oggi. I giorni di riposo non interrompono la serie; oggi, se non ancora fatto,
 * non la interrompe (la giornata non è finita).
 */
export function streak(programStart: ISODate, done: Set<ISODate>, today: ISODate): number {
  let count = 0;
  for (let date = today; ; date = addDays(date, -1)) {
    const d = programDay(programStart, date);
    if (d.notStarted) break;
    if (d.dayType === 'rest') {
      if (done.has(date)) count++;
      continue;
    }
    if (done.has(date)) count++;
    else if (date !== today) break;
    if (diffDays(today, date) > 3650) break;
  }
  return count;
}

// ---------------------------------------------------------------- muscoli

export type Involvement = 'primary' | 'secondary';
export type MuscleMap = Partial<Record<MuscleGroup, Involvement>>;

/** Unisce i muscoli di più esercizi: un muscolo principale in almeno uno resta principale. */
export function musclesOf(items: { muscles?: MuscleGroup[]; secondary?: MuscleGroup[] }[]): MuscleMap {
  const map: MuscleMap = {};
  for (const it of items) {
    for (const m of it.secondary ?? []) if (!map[m]) map[m] = 'secondary';
    for (const m of it.muscles ?? []) map[m] = 'primary';
  }
  return map;
}

/**
 * Serie per muscolo nei 7 giorni da `monday`: 1 per i muscoli principali, ½ per i secondari
 * (convenzione comune per stimare il volume di allenamento).
 */
export function muscleSets(sessions: SessionLog[], monday: ISODate): Record<MuscleGroup, number> {
  const out = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<MuscleGroup, number>;
  const end = addDays(monday, 7);
  for (const s of sessions) {
    if (s.date < monday || s.date >= end) continue;
    for (const set of s.sets) {
      const def = EXERCISES[set.exerciseId];
      if (!def || set.done <= 0) continue;
      for (const m of def.muscles) out[m] += 1;
      for (const m of def.secondary ?? []) out[m] += 0.5;
    }
  }
  return out;
}
