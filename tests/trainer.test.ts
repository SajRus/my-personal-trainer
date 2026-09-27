import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { finishWorkout, loadAll, setupProgram, todayView, type AppData } from '../src/app/trainer';
import { INITIAL_PROFILE } from '../src/data/program';
import { addDays } from '../src/domain/dates';
import type { SetLog } from '../src/domain/types';
import { DexieRepository } from '../src/storage/dexieRepository';

const START = '2026-09-28'; // lunedì
let repo: DexieRepository;

beforeEach(async () => {
  repo = new DexieRepository(`test-${Math.random()}`);
  await setupProgram(repo, {
    today: '2026-09-27',
    programStart: START,
    heightCm: 179,
    weightKg: 87.5,
    tests: INITIAL_PROFILE.tests,
  });
});

/** Fa l'allenamento del giorno eseguendo `done(target)` ripetizioni in ogni serie. */
async function train(date: string, done: (target: number) => number = (t) => t) {
  const data = (await loadAll(repo)) as AppData;
  const view = todayView(data, date);
  const w = view.workout!;
  const sets: SetLog[] = [];
  for (const b of w.plan.blocks) {
    for (const ex of b.exercises) {
      for (let i = 0; i < b.sets; i++) {
        sets.push({ exerciseId: ex.def.id, setIndex: i, target: ex.target, done: done(ex.target), variantIndex: 0, loadId: ex.loadId });
      }
    }
  }
  return finishWorkout(repo, data, {
    date,
    plan: w.plan,
    prepared: w.prepared,
    startedAt: `${date}T07:00:00.000Z`,
    endedAt: `${date}T07:17:00.000Z`,
    sets,
    badForm: [],
  });
}

const target = async (date: string, id: string) => {
  const data = (await loadAll(repo)) as AppData;
  return todayView(data, date).workout!.plan.blocks.flatMap((b) => b.exercises).find((e) => e.def.id === id)!.target;
};

describe('flusso completo', () => {
  it('primo avvio: profilo, attrezzatura, test iniziale, peso e stati', async () => {
    const data = (await loadAll(repo))!;
    expect(data.profile.programStart).toBe(START);
    expect(data.equipment.length).toBeGreaterThan(10);
    expect(data.tests).toHaveLength(1);
    expect(data.bodyWeight[0].kg).toBe(87.5);
    expect(data.states.pushup.target).toBe(6);
  });

  it('lunedì A e giovedì A a 6, lunedì dopo a 7', async () => {
    expect(await target(START, 'pushup')).toBe(6);
    const r = await train(START);
    expect(r.session.completed).toBe(true);
    expect(r.session.durationSec).toBe(17 * 60);
    expect(await target(addDays(START, 3), 'pushup')).toBe(6);
    await train(addDays(START, 3));
    expect(await target(addDays(START, 7), 'pushup')).toBe(7);
  });

  it('confronto con la sessione precedente dello stesso tipo', async () => {
    const first = await train(START);
    expect(first.previous).toBeNull();
    const second = await train(addDays(START, 3));
    expect(second.previous?.id).toBe(first.session.id);
  });

  it('target mancato due volte → −10%', async () => {
    await train(START, (t) => t - 2);
    await train(addDays(START, 3), (t) => t - 2);
    const data = (await loadAll(repo))!;
    expect(data.states.pushup.target).toBe(5);
    expect(data.states.pushup.lastChange?.kind).toBe('decrease');
  });

  it('export e import restituiscono gli stessi dati', async () => {
    await train(START);
    const backup = await repo.exportAll();
    const other = new DexieRepository(`test-${Math.random()}`);
    await other.importAll(JSON.parse(JSON.stringify(backup)));
    const again = await other.exportAll();
    expect({ ...again, exportedAt: '' }).toEqual({ ...backup, exportedAt: '' });
  });
});

describe('test e giorni', () => {
  it('salvare un test ricalcola i target', async () => {
    const { saveTestResult } = await import('../src/app/trainer');
    const data = (await loadAll(repo))!;
    const out = await saveTestResult(repo, data, addDays(START, 27), { ...INITIAL_PROFILE.tests, pushups: 18, plank: 60 });
    expect(out.previous?.values.pushups).toBe(11);
    const after = (await loadAll(repo))!;
    expect(after.states.pushup.target).toBe(10);
    expect(after.states.plank.target).toBe(40);
    expect(after.tests).toHaveLength(2);
    expect(out.changes.map((c) => c.exerciseId)).toContain('pushup');
  });

  it('vista di un giorno passato, di oggi e futuro', async () => {
    const { dayView } = await import('../src/app/trainer');
    await train(START);
    const data = (await loadAll(repo))!;
    const today = addDays(START, 1);
    expect(dayView(data, START, today).when).toBe('past');
    expect(dayView(data, START, today).sessions).toHaveLength(1);
    expect(dayView(data, today, today).when).toBe('today');
    const nextMon = dayView(data, addDays(START, 7), today);
    expect(nextMon.when).toBe('future');
    // anteprima: la progressione della settimana 2 è già visibile
    expect(nextMon.workout!.plan.blocks[0].exercises[0].target).toBe(7);
  });
});
