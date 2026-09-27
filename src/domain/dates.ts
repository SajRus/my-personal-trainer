import type { ISODate } from './types';

// Le date di calendario sono stringhe "YYYY-MM-DD". I calcoli avvengono in UTC
// per non avere sorprese col cambio dell'ora legale.

const DAY_MS = 86_400_000;

export function toUTC(date: ISODate): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function fromUTC(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Data locale di oggi (quella che vede l'utente sul telefono). */
export function todayISO(now: Date = new Date()): ISODate {
  // Solo in sviluppo: ?oggi=2026-09-28 simula un altro giorno (utile per provare A/B/C, test, riposo).
  if (import.meta.env?.DEV && typeof location !== 'undefined') {
    const fake = new URLSearchParams(location.search).get('oggi');
    if (fake && /^\d{4}-\d{2}-\d{2}$/.test(fake)) return fake;
  }
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUTC(toUTC(date) + days * DAY_MS);
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(a) - toUTC(b)) / DAY_MS);
}

/** 0 = lunedì … 6 = domenica */
export function weekdayMon0(date: ISODate): number {
  return (new Date(toUTC(date)).getUTCDay() + 6) % 7;
}

export function mondayOf(date: ISODate): ISODate {
  return addDays(date, -weekdayMon0(date));
}

/** Lunedì più vicino: oggi se è lunedì, altrimenti il prossimo (o quello appena passato se è martedì). */
export function nearestMonday(date: ISODate): ISODate {
  const wd = weekdayMon0(date);
  if (wd === 0) return date;
  return wd <= 1 ? mondayOf(date) : addDays(mondayOf(date), 7);
}

const WEEKDAYS = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

export function formatLong(date: ISODate): string {
  const [, m, d] = date.split('-').map(Number);
  return `${WEEKDAYS[weekdayMon0(date)]} ${d} ${MONTHS[m - 1]}`;
}

export function formatShort(date: ISODate): string {
  const [, m, d] = date.split('-').map(Number);
  return `${d}/${m}`;
}

export function weekdayName(i: number): string {
  return WEEKDAYS[i];
}
