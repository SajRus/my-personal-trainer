import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { loadAll, setupProgram } from '../src/app/trainer';
import { BASELINE_TESTS, buildEquipment, EXERCISES } from '../src/data/program';
import { initialState } from '../src/domain/progression';
import { DexieRepository } from '../src/storage/dexieRepository';

describe('attrezzatura scelta al primo avvio', () => {
  it('crea i set generici per i tipi scelti e i manubri coi pesi indicati', () => {
    const eq = buildEquipment(['tube-band', 'dumbbell', 'mat'], [10, 4]);
    expect(eq.filter((e) => e.kind === 'tube-band')).toHaveLength(3);
    expect(eq.filter((e) => e.kind === 'dumbbell').map((e) => e.name)).toEqual(['Manubri 4 kg', 'Manubri 10 kg']);
    expect(eq.some((e) => e.kind === 'ball')).toBe(false);
  });

  it('le alzate laterali partono dal manubrio più vicino a 2 kg, non dal più pesante', () => {
    const ctx = (kg: number[]) => ({ date: '2026-09-28', absWeek: 1, equipment: buildEquipment(['dumbbell'], kg) });
    expect(initialState(EXERCISES.lateralRaise, BASELINE_TESTS, ctx([4, 10])).loadId).toBe('db-4');
    expect(initialState(EXERCISES.lateralRaise, BASELINE_TESTS, ctx([1, 2])).loadId).toBe('db-2');
    expect(initialState(EXERCISES.lateralRaise, BASELINE_TESTS, ctx([1, 3])).loadId).toBe('db-1'); // pari: il più leggero
    expect(initialState(EXERCISES.lateralRaise, BASELINE_TESTS, ctx([])).loadId).toBeNull();
  });
});

describe('primo avvio senza dati personali predefiniti', () => {
  it('con test provvisori non salva un test finto: i grafici partono dal primo test vero', async () => {
    const repo = new DexieRepository(`setup-${Math.random()}`);
    await setupProgram(repo, {
      today: '2026-09-27',
      programStart: '2026-09-28',
      heightCm: 165,
      weightKg: 60,
      tests: BASELINE_TESTS,
      equipment: buildEquipment(['mat', 'chair'], []),
      provisional: true,
    });
    const data = (await loadAll(repo))!;
    expect(data.tests).toHaveLength(0);
    expect(data.profile.heightCm).toBe(165);
    expect(data.equipment.map((e) => e.id).sort()).toEqual(['chair', 'mat']);
    expect(data.states.pushup.target).toBe(4); // 55% di 8
    expect(data.states.bandRow.loadId).toBeNull(); // nessun elastico
    expect(data.states.pushup.lastChange?.reason).toContain('provvisoria');
  });
});

describe('sesso', () => {
  it('le stime provvisorie dipendono dal sesso e il sesso resta nel profilo', async () => {
    const { BASELINE_BY_SEX } = await import('../src/data/program');
    const make = async (sex: 'M' | 'F') => {
      const repo = new DexieRepository(`sex-${Math.random()}`);
      await setupProgram(repo, {
        today: '2026-09-27',
        programStart: '2026-09-28',
        heightCm: 170,
        weightKg: 65,
        sex,
        tests: BASELINE_BY_SEX[sex],
        equipment: buildEquipment(['mat'], []),
        provisional: true,
      });
      return (await loadAll(repo))!;
    };
    const f = await make('F');
    const m = await make('M');
    expect(f.profile.sex).toBe('F');
    expect(f.states.pushup.target).toBeLessThan(m.states.pushup.target);
  });
});

describe('kettlebell', () => {
  it('si creano coi pesi scelti e il goblet squat parte dal più vicino a 8 kg', () => {
    const eq = buildEquipment(['kettlebell'], [], [16, 6, 12]);
    expect(eq.map((e) => e.name)).toEqual(['Kettlebell 6 kg', 'Kettlebell 12 kg', 'Kettlebell 16 kg']);
    const ctx = { date: '2026-09-28', absWeek: 1, equipment: eq };
    expect(initialState(EXERCISES.gobletSquat, BASELINE_TESTS, ctx).loadId).toBe('kb-6');
  });
});
