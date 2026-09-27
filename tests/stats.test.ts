import { describe, expect, it } from 'vitest';
import { addDays } from '../src/domain/dates';
import { activeDays, macroOf, streak, weeklySets } from '../src/domain/stats';
import type { SessionLog } from '../src/domain/types';
import { buildReminderIcs } from '../src/lib/ics';

const START = '2026-09-28'; // lunedì

const session = (date: string, sets: [string, number][]): SessionLog => ({
  id: date,
  date,
  dayType: 'A',
  week: 1,
  deload: false,
  startedAt: `${date}T07:00:00Z`,
  endedAt: `${date}T07:15:00Z`,
  durationSec: 900,
  sets: sets.map(([exerciseId, done], i) => ({ exerciseId, setIndex: i, target: 6, done, variantIndex: 0, loadId: null })),
  badForm: [],
  completed: true,
});

describe('gruppi muscolari', () => {
  it('ogni esercizio ha un macro-gruppo', () => {
    expect(macroOf('pushup')).toBe('spinta');
    expect(macroOf('bandRow')).toBe('tirata');
    expect(macroOf('squat')).toBe('gambe');
    expect(macroOf('legCurl')).toBe('gambe');
    expect(macroOf('plank')).toBe('core');
    expect(macroOf('facePull')).toBe('tirata'); // primo muscolo: schiena
  });
});

describe('volume settimanale', () => {
  it('conta le serie fatte per gruppo, con le settimane vuote a zero', () => {
    const rows = weeklySets(
      [
        session(START, [['pushup', 6], ['pushup', 6], ['plank', 30], ['pushup', 0]]),
        session(addDays(START, 14), [['squat', 15]]),
      ],
      START,
    );
    expect(rows).toEqual([
      { week: 1, spinta: 2, tirata: 0, gambe: 0, core: 1 },
      { week: 2, spinta: 0, tirata: 0, gambe: 0, core: 0 },
      { week: 3, spinta: 0, tirata: 0, gambe: 1, core: 0 },
    ]);
  });
});

describe('streak', () => {
  const days = (n: number) => Array.from({ length: n }, (_, i) => addDays(START, i));

  it('conta i giorni consecutivi fatti', () => {
    const done = new Set(days(3));
    expect(streak(START, done, addDays(START, 2))).toBe(3);
  });

  it('oggi non ancora fatto non interrompe la serie', () => {
    const done = new Set(days(3));
    expect(streak(START, done, addDays(START, 3))).toBe(3);
  });

  it('un giorno saltato la interrompe', () => {
    const done = new Set([START, addDays(START, 2)]);
    expect(streak(START, done, addDays(START, 2))).toBe(1);
  });

  it('la domenica di riposo non interrompe la serie', () => {
    const done = new Set([...days(6), addDays(START, 7)]); // lun-sab, dom saltata, lun
    expect(streak(START, done, addDays(START, 7))).toBe(7);
  });

  it('activeDays unisce allenamenti, test e riposo attivo', () => {
    const s = activeDays([session(START, [])], ['2026-10-25'], ['2026-10-04']);
    expect([...s].sort()).toEqual(['2026-09-28', '2026-10-04', '2026-10-25']);
  });
});

describe('promemoria .ics', () => {
  const ics = buildReminderIcs({
    startDate: '2026-09-28',
    time: '07:30',
    url: 'https://example.com/',
    now: new Date('2026-09-27T10:00:00Z'),
  });

  it('evento giornaliero all’orario scelto con avviso', () => {
    expect(ics).toContain('DTSTART:20260928T073000');
    expect(ics).toContain('DTEND:20260928T074500');
    expect(ics).toContain('RRULE:FREQ=DAILY');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:PT0M');
    expect(ics).toContain('URL:https://example.com/');
  });

  it('usa CRLF e caratteri speciali escapati', () => {
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
    expect(ics).toContain("Apri l'app: https://example.com/");
    expect(ics).toMatch(/DESCRIPTION:15 minuti di allenamento in camera\.\\n/);
  });

  it('orario a cavallo della mezzanotte', () => {
    expect(buildReminderIcs({ startDate: '2026-09-28', time: '23:50' })).toContain('DTEND:20260928T000500');
  });
});

describe('muscoli', () => {
  it('unisce principali e secondari di più esercizi', async () => {
    const { musclesOf } = await import('../src/domain/stats');
    const { EXERCISES } = await import('../src/data/program');
    const m = musclesOf([EXERCISES.pushup, EXERCISES.dip]);
    expect(m.petto).toBe('primary');
    expect(m.tricipiti).toBe('primary'); // secondario nei piegamenti, principale nei dip
    expect(m.spalle).toBe('secondary');
    expect(m.quadricipiti).toBeUndefined();
  });

  it('serie per muscolo nella settimana: principali 1, secondari ½', async () => {
    const { muscleSets } = await import('../src/domain/stats');
    const sets = muscleSets(
      [session(START, [['pushup', 6], ['pushup', 6], ['pushup', 0]]), session(addDays(START, 7), [['squat', 15]])],
      START,
    );
    expect(sets.petto).toBe(2);
    expect(sets.tricipiti).toBe(1);
    expect(sets.spalle).toBe(1);
    expect(sets.quadricipiti).toBe(0); // settimana dopo
  });

  it('ogni esercizio ha almeno un muscolo principale', async () => {
    const { EXERCISES } = await import('../src/data/program');
    for (const ex of Object.values(EXERCISES)) expect(ex.muscles.length, ex.id).toBeGreaterThan(0);
  });
});
