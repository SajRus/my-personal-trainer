import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, EXERCISES } from '../src/data/program';
import { EXAMPLE_EQUIPMENT, EXAMPLE_TESTS } from './fixtures';
import { addDays, nearestMonday } from '../src/domain/dates';
import { initialState } from '../src/domain/progression';
import { programDay } from '../src/domain/schedule';
import { buildPlan, buildSteps, estimateSeconds, gearForPlan } from '../src/domain/session';

const START = '2026-09-28'; // lunedì

describe('calendario', () => {
  it('rotazione Lun A, Mar B, Mer C, Gio A, Ven B, Sab C, Dom riposo', () => {
    const types = Array.from({ length: 7 }, (_, i) => programDay(START, addDays(START, i)).dayType);
    expect(types).toEqual(['A', 'B', 'C', 'A', 'B', 'C', 'rest']);
  });

  it('prima dell’inizio il programma non è partito', () => {
    const d = programDay(START, '2026-09-27');
    expect(d.notStarted).toBe(true);
  });

  it('domenica della settimana 4: test', () => {
    const d = programDay(START, addDays(START, 3 * 7 + 6));
    expect(d.week).toBe(4);
    expect(d.dayType).toBe('test');
    expect(d.test).toBe('mid');
  });

  it('settimana 8: scarico da lunedì a venerdì, test sabato, domenica riposo', () => {
    const w8 = addDays(START, 7 * 7);
    const days = Array.from({ length: 7 }, (_, i) => programDay(START, addDays(w8, i)));
    expect(days.map((d) => d.deload)).toEqual([true, true, true, true, true, false, false]);
    expect(days[5].dayType).toBe('test');
    expect(days[5].test).toBe('final');
    expect(days[6].dayType).toBe('rest');
  });

  it('dopo 8 settimane riparte un nuovo ciclo', () => {
    const d = programDay(START, addDays(START, 8 * 7));
    expect(d.cycle).toBe(2);
    expect(d.week).toBe(1);
    expect(d.absWeek).toBe(9);
  });

  it('lunedì più vicino', () => {
    expect(nearestMonday('2026-09-28')).toBe('2026-09-28'); // lunedì
    expect(nearestMonday('2026-09-29')).toBe('2026-09-28'); // martedì → ieri
    expect(nearestMonday('2026-09-27')).toBe('2026-09-28'); // domenica → domani
  });
});

describe('sessione', () => {
  const ctx = { date: START, absWeek: 1, equipment: EXAMPLE_EQUIPMENT };
  const states = Object.fromEntries(
    Object.values(EXERCISES).map((e) => [e.id, initialState(e, EXAMPLE_TESTS, ctx)]),
  );

  it('superserie: esercizio 1 → esercizio 2 → recupero', () => {
    const plan = buildPlan('A', states, DEFAULT_SETTINGS, false);
    const steps = buildSteps(plan, DEFAULT_SETTINGS);
    const kinds = steps.map((s) => (s.kind === 'work' ? s.exerciseId : s.kind));
    const i = kinds.indexOf('dip');
    expect(kinds.slice(i - 1, i + 4)).toEqual(['prep', 'dip', 'lateralRaise', 'rest', 'dip']);
  });

  it('inizia col riscaldamento e finisce col defaticamento', () => {
    const steps = buildSteps(buildPlan('C', states, DEFAULT_SETTINGS, false), DEFAULT_SETTINGS);
    expect(steps[0].kind === 'timed' && steps[0].item.id).toBe('warmup-bike');
    expect(steps[1].kind === 'timed' && steps[1].item.id).toBe('warmup-pullapart');
    const last = steps[steps.length - 1];
    expect(last.kind === 'timed' && last.phase).toBe('cooldown');
  });

  it('numero di serie e recuperi come da tabella', () => {
    const steps = buildSteps(buildPlan('A', states, DEFAULT_SETTINGS, false), DEFAULT_SETTINGS);
    const work = steps.filter((s) => s.kind === 'work');
    expect(work.filter((s) => s.kind === 'work' && s.exerciseId === 'pushup')).toHaveLength(4);
    expect(work.filter((s) => s.kind === 'work' && s.exerciseId === 'pike')).toHaveLength(3);
    const rests = steps.filter((s) => s.kind === 'rest');
    expect(rests[0].kind === 'rest' && rests[0].seconds).toBe(60);
    expect(rests[rests.length - 1].kind === 'rest' && rests[rests.length - 1].seconds).toBe(45);
  });

  // Con i recuperi della tabella (≈ 7,5 min) le sessioni stanno tra 15 e 20 minuti.
  it('durata stimata tra 15 e 20 minuti', () => {
    for (const d of ['A', 'B', 'C'] as const) {
      const min = estimateSeconds(buildSteps(buildPlan(d, states, DEFAULT_SETTINGS, false), DEFAULT_SETTINGS)) / 60;
      expect(min).toBeGreaterThan(15);
      expect(min).toBeLessThan(20);
    }
  });

  it('attrezzi da preparare con elastico e ancoraggio', () => {
    const gear = gearForPlan(buildPlan('C', states, DEFAULT_SETTINGS, false), EXAMPLE_EQUIPMENT);
    const band = gear.find((g) => g.kind === 'tube-band')!;
    expect(band.items.map((i) => i.id)).toEqual(['tube-yellow']);
    expect(band.anchors.sort()).toEqual(['alto', 'medio']);
  });
});
