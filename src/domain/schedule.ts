import { RULES } from '../data/program';
import { diffDays, mondayOf, weekdayMon0 } from './dates';
import type { DayType, ISODate } from './types';

export interface ProgramDay {
  date: ISODate;
  /** Il programma non è ancora iniziato. */
  notStarted: boolean;
  /** Settimana assoluta dall'inizio (1, 2, …); 0 o negativa prima dell'inizio. */
  absWeek: number;
  /** Ciclo di 8 settimane (1, 2, …). */
  cycle: number;
  /** Settimana dentro il ciclo (1…8). */
  week: number;
  weekday: number;
  dayType: DayType;
  deload: boolean;
  test: 'mid' | 'final' | null;
}

/** Che cosa prevede il programma in una certa data. */
export function programDay(programStart: ISODate, date: ISODate): ProgramDay {
  const start = mondayOf(programStart);
  const days = diffDays(date, start);
  const weekday = weekdayMon0(date);
  const absWeek = Math.floor(days / 7) + 1;
  const notStarted = days < 0;
  const n = RULES.programWeeks;
  const cycle = notStarted ? 0 : Math.floor((absWeek - 1) / n) + 1;
  const week = notStarted ? 0 : ((absWeek - 1) % n) + 1;

  const base = { date, notStarted, absWeek, cycle, week, weekday };
  if (notStarted) return { ...base, dayType: 'rest', deload: false, test: null };

  if (week === RULES.midTest.week && weekday === RULES.midTest.weekday) {
    return { ...base, dayType: 'test', deload: false, test: 'mid' };
  }
  if (week === RULES.deload.week) {
    if (weekday === RULES.deload.finalTestWeekday) {
      return { ...base, dayType: 'test', deload: false, test: 'final' };
    }
    const deload = weekday <= RULES.deload.lastWeekday;
    return { ...base, dayType: RULES.weekRotation[weekday], deload, test: null };
  }
  return { ...base, dayType: RULES.weekRotation[weekday], deload: false, test: null };
}

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  A: 'Spinta',
  B: 'Gambe',
  C: 'Tirata e core',
  rest: 'Riposo',
  test: 'Test',
};
