import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../src/data/program';
import { EXAMPLE_EQUIPMENT, EXAMPLE_TESTS } from './fixtures';
import {
  evaluateSession,
  initialState,
  nextLoad,
  prepareForSession,
  recalcFromTest,
  sessionTarget,
  type Ctx,
} from '../src/domain/progression';
import type { Equipment, ExerciseDef, ExerciseState, SetLog } from '../src/domain/types';

const ctx = (absWeek: number, equipment: Equipment[] = EXAMPLE_EQUIPMENT): Ctx => ({
  date: '2026-09-28',
  absWeek,
  equipment,
});

const sets = (s: ExerciseState, n: number, done: number | number[]): SetLog[] =>
  Array.from({ length: n }, (_, i) => ({
    exerciseId: s.exerciseId,
    setIndex: i,
    target: s.target,
    done: Array.isArray(done) ? done[i] : done,
    variantIndex: s.variantIndex,
    loadId: s.loadId,
  }));

/** Simula una sessione completata (tutte le serie al target) e la preparazione della successiva. */
function completeAndPrepare(ex: ExerciseDef, s: ExerciseState, week: number, nextWeek: number, n = 4) {
  const after = evaluateSession(ex, s, { sets: sets(s, n, s.target), plannedSets: n, formOk: true, deload: false }, ctx(week));
  return prepareForSession(ex, after, ctx(nextWeek));
}

const init = (id: string, week = 1) => initialState(EXERCISES[id], EXAMPLE_TESTS, ctx(week));

describe('stato iniziale dai test', () => {
  it('rispetta le tabelle del programma', () => {
    expect(init('pushup').target).toBe(6);
    expect(init('pike').target).toBe(5);
    expect(init('dip').target).toBe(8);
    expect(init('lateralRaise').target).toBe(12);
    expect(init('squat').target).toBe(15);
    expect(init('reverseLunge').target).toBe(8);
    expect(init('legCurl').target).toBe(8);
    expect(init('gluteBridge').target).toBe(15);
    expect(init('bandRow').target).toBe(10);
    expect(init('latPulldown').target).toBe(10);
    expect(init('facePull').target).toBe(12);
    expect(init('abWheel').target).toBe(5);
    expect(init('plank').target).toBe(30);
  });

  it('assegna i carichi di partenza', () => {
    expect(init('lateralRaise').loadId).toBe('db-2'); // manubri da 2 kg
    expect(init('bandRow').loadId).toBe('tube-yellow'); // elastico più leggero
    expect(init('gluteBridge').loadId).toBe('mini-light');
    expect(init('pushup').loadId).toBeNull();
  });
});

describe('progressione settimanale', () => {
  it('+1 rip alla settimana successiva se ho completato tutto', () => {
    const ex = EXERCISES.pushup;
    const s = completeAndPrepare(ex, init('pushup'), 1, 2);
    expect(s.target).toBe(7);
    expect(s.lastChange?.reason).toBe('+1 perché hai completato tutto la volta scorsa');
  });

  it('non sale due volte nella stessa settimana (A si fa lunedì e giovedì)', () => {
    const ex = EXERCISES.pushup;
    let s = init('pushup');
    s = completeAndPrepare(ex, s, 1, 1); // lunedì → giovedì settimana 1
    expect(s.target).toBe(6);
    s = completeAndPrepare(ex, s, 1, 2); // giovedì → lunedì settimana 2
    expect(s.target).toBe(7);
    s = completeAndPrepare(ex, s, 2, 2); // lunedì → giovedì settimana 2
    expect(s.target).toBe(7);
  });

  it('plank: +5 s a settimana', () => {
    const ex = EXERCISES.plank;
    const s = completeAndPrepare(ex, init('plank'), 1, 2, 3);
    expect(s.target).toBe(35);
    expect(s.lastChange?.reason).toContain('+5 s');
  });

  it('se manco il target ripete lo stesso carico', () => {
    const ex = EXERCISES.pushup;
    const s0 = init('pushup');
    const s1 = evaluateSession(ex, s0, { sets: sets(s0, 4, [6, 6, 5, 4]), plannedSets: 4, formOk: true, deload: false }, ctx(1));
    const s2 = prepareForSession(ex, s1, ctx(2));
    expect(s2.target).toBe(6);
    expect(s2.missStreak).toBe(1);
    expect(s2.lastChange?.kind).toBe('repeat');
  });

  it('con forma non buona non progredisce anche se le ripetizioni ci sono', () => {
    const ex = EXERCISES.pushup;
    const s0 = init('pushup');
    const s1 = evaluateSession(ex, s0, { sets: sets(s0, 4, 6), plannedSets: 4, formOk: false, deload: false }, ctx(1));
    expect(prepareForSession(ex, s1, ctx(2)).target).toBe(6);
    expect(s1.lastChange?.reason).toContain('forma');
  });

  it('serie saltate = target mancato', () => {
    const ex = EXERCISES.pushup;
    const s0 = init('pushup');
    const s1 = evaluateSession(ex, s0, { sets: sets(s0, 3, 6), plannedSets: 4, formOk: true, deload: false }, ctx(1));
    expect(s1.missStreak).toBe(1);
  });

  it('dopo 2 sessioni mancate di fila riduce del 10%', () => {
    const ex = EXERCISES.squat;
    let s: ExerciseState = { ...init('squat'), target: 20 };
    const miss = { plannedSets: 4, formOk: true, deload: false };
    s = evaluateSession(ex, s, { ...miss, sets: sets(s, 4, 15) }, ctx(2));
    expect(s.target).toBe(20);
    s = evaluateSession(ex, s, { ...miss, sets: sets(s, 4, 15) }, ctx(2));
    expect(s.target).toBe(18);
    expect(s.missStreak).toBe(0);
    expect(s.lastChange?.kind).toBe('decrease');
    expect(s.lastChange?.reason).toContain('−10%');
  });

  it('la riduzione del 10% scende sempre di almeno un gradino', () => {
    const ex = EXERCISES.pike;
    let s = init('pike'); // 5 rip: 5 × 0,9 = 4,5 → 4
    const miss = { plannedSets: 3, formOk: true, deload: false };
    s = evaluateSession(ex, s, { ...miss, sets: sets(s, 3, 3) }, ctx(1));
    s = evaluateSession(ex, s, { ...miss, sets: sets(s, 3, 3) }, ctx(1));
    expect(s.target).toBe(4);
  });

  it('plank: la riduzione resta su multipli di 5 s', () => {
    const ex = EXERCISES.plank;
    let s: ExerciseState = { ...init('plank'), target: 40 };
    const miss = { plannedSets: 3, formOk: true, deload: false };
    s = evaluateSession(ex, s, { ...miss, sets: sets(s, 3, 20) }, ctx(2));
    s = evaluateSession(ex, s, { ...miss, sets: sets(s, 3, 20) }, ctx(2));
    expect(s.target).toBe(35);
  });

  it('una sessione riuscita azzera il conteggio degli errori', () => {
    const ex = EXERCISES.pushup;
    let s = init('pushup');
    s = evaluateSession(ex, s, { sets: sets(s, 4, 3), plannedSets: 4, formOk: true, deload: false }, ctx(1));
    s = evaluateSession(ex, s, { sets: sets(s, 4, 6), plannedSets: 4, formOk: true, deload: false }, ctx(1));
    expect(s.missStreak).toBe(0);
    s = evaluateSession(ex, s, { sets: sets(s, 4, 3), plannedSets: 4, formOk: true, deload: false }, ctx(2));
    expect(s.target).toBe(6);
  });
});

describe('varianti', () => {
  it('piegamenti: raggiunto 4×12 → con elastico sulla schiena da 4×6', () => {
    const ex = EXERCISES.pushup;
    let s: ExerciseState = { ...init('pushup'), target: 12 };
    s = completeAndPrepare(ex, s, 1, 2);
    expect(s.variantIndex).toBe(1);
    expect(s.target).toBe(6);
    expect(s.loadId).toBe('tube-yellow');
    expect(s.lastChange?.reason).toBe('Passa a: Piegamenti con elastico sulla schiena, riparti da 6');
  });

  it('dip: raggiunto 3×15 → gambe tese', () => {
    const ex = EXERCISES.dip;
    const s = completeAndPrepare(ex, { ...init('dip'), target: 15 }, 1, 2, 3);
    expect(ex.variants[s.variantIndex].id).toBe('dip-straight');
  });

  it('squat: dalla settimana 3 con elastico sotto i piedi, 4×12', () => {
    const ex = EXERCISES.squat;
    let s = init('squat');
    s = completeAndPrepare(ex, s, 1, 2);
    expect(s.target).toBe(16);
    s = completeAndPrepare(ex, s, 2, 3);
    expect(s.variantIndex).toBe(1);
    expect(s.target).toBe(12);
    expect(s.loadId).toBe('tube-yellow');
    expect(s.lastChange?.reason).toContain('Dalla settimana 3');
  });

  it('ab wheel: dopo il massimo passa a escursione più ampia', () => {
    const ex = EXERCISES.abWheel;
    const s = completeAndPrepare(ex, { ...init('abWheel'), target: 10 }, 1, 2, 3);
    expect(ex.variants[s.variantIndex].id).toBe('abwheel-wide');
    expect(s.target).toBe(5);
  });

  it('affondi: raggiunto 3×12 → con manubri da 2 kg', () => {
    const ex = EXERCISES.reverseLunge;
    const s = completeAndPrepare(ex, { ...init('reverseLunge'), target: 12 }, 1, 2, 3);
    expect(ex.variants[s.variantIndex].id).toBe('lunge-db');
    expect(s.loadId).toBe('db-2');
  });
});

describe('progressione degli elastici', () => {
  it('nextLoad sceglie il successivo in ordine di durezza tra quelli registrati', () => {
    expect(nextLoad(EXAMPLE_EQUIPMENT, 'tube-band', 'tube-yellow')?.id).toBe('tube-red');
    expect(nextLoad(EXAMPLE_EQUIPMENT, 'tube-band', 'tube-blue')?.id).toBe('tube-black');
    expect(nextLoad(EXAMPLE_EQUIPMENT, 'tube-band', 'tube-black')).toBeNull();
  });

  it('usa l’ordine di durezza, non l’ordine di inserimento', () => {
    const eq: Equipment[] = [
      { id: 'b3', kind: 'tube-band', name: 'Nero', level: 30 },
      { id: 'b1', kind: 'tube-band', name: 'Verde', level: 10 },
      { id: 'b2', kind: 'tube-band', name: 'Blu', level: 20 },
    ];
    expect(nextLoad(eq, 'tube-band', 'b1')?.id).toBe('b2');
    expect(nextLoad(eq, 'tube-band', 'b2')?.id).toBe('b3');
  });

  it('rematore: raggiunto 4×15 → elastico successivo, ripartendo da 4×10', () => {
    const ex = EXERCISES.bandRow;
    const s = completeAndPrepare(ex, { ...init('bandRow'), target: 15 }, 1, 2);
    expect(s.loadId).toBe('tube-red');
    expect(s.target).toBe(10);
    expect(s.lastChange?.kind).toBe('load');
    expect(s.lastChange?.reason).toBe("Passa all'elastico Rosso – medio e riparti da 10");
  });

  it('rematore: senza elastici più duri → consiglio di allontanarsi dalla porta', () => {
    const ex = EXERCISES.bandRow;
    const s = completeAndPrepare(ex, { ...init('bandRow'), target: 15, loadId: 'tube-black' }, 1, 2);
    expect(s.target).toBe(15);
    expect(s.lastChange?.kind).toBe('hold');
    expect(s.lastChange?.reason).toContain('passo più lontano');
  });

  it('ponte glutei: raggiunto 3×20 → mini band più dura da 3×15', () => {
    const ex = EXERCISES.gluteBridge;
    const s = completeAndPrepare(ex, { ...init('gluteBridge'), target: 20 }, 1, 2, 3);
    expect(s.loadId).toBe('mini-medium');
    expect(s.target).toBe(15);
    expect(s.lastChange?.reason).toContain('mini band');
  });

  it('squat con elastico: raggiunto 4×20 → elastico più duro da 4×12', () => {
    const ex = EXERCISES.squat;
    const s = completeAndPrepare(ex, { ...init('squat'), variantIndex: 1, target: 20, loadId: 'tube-yellow', lastProgressWeek: 3 }, 4, 5);
    expect(s.loadId).toBe('tube-red');
    expect(s.target).toBe(12);
  });

  it('alzate laterali: al massimo coi 2 kg (nessun manubrio più pesante) → pausa di 2 s', () => {
    const ex = EXERCISES.lateralRaise;
    const s = completeAndPrepare(ex, { ...init('lateralRaise'), target: 20 }, 1, 2, 3);
    expect(ex.variants[s.variantIndex].id).toBe('raise-pause');
    expect(s.target).toBe(12);
    expect(s.loadId).toBe('db-2');
  });

  it('se in sessione uso un altro elastico, lo stato lo adotta', () => {
    const ex = EXERCISES.bandRow;
    const s0 = init('bandRow');
    const used = sets(s0, 4, 10).map((x) => ({ ...x, loadId: 'tube-red' }));
    const s1 = evaluateSession(ex, s0, { sets: used, plannedSets: 4, formOk: true, deload: false }, ctx(1));
    expect(s1.loadId).toBe('tube-red');
  });
});

describe('test e scarico', () => {
  it('dopo un test ricalcola i target dai nuovi massimi', () => {
    const ex = EXERCISES.pushup;
    const s = recalcFromTest(ex, { ...init('pushup'), target: 9 }, { ...EXAMPLE_TESTS, pushups: 18 }, ctx(4));
    expect(s.target).toBe(10); // 55% di 18 = 9,9
    expect(s.lastChange?.kind).toBe('test');
    expect(s.lastChange?.reason).toContain('di 18');
    expect(s.pendingProgress).toBe(false);
  });

  it('dopo un test non progredisce subito alla settimana dopo', () => {
    const ex = EXERCISES.pushup;
    let s = { ...init('pushup'), pendingProgress: true };
    s = recalcFromTest(ex, s, { ...EXAMPLE_TESTS, pushups: 18 }, ctx(4));
    s = prepareForSession(ex, s, ctx(5));
    expect(s.target).toBe(10);
  });

  it('il test non tocca le varianti già avanzate', () => {
    const ex = EXERCISES.squat;
    const before: ExerciseState = { ...init('squat'), variantIndex: 1, target: 14, loadId: 'tube-yellow' };
    const s = recalcFromTest(ex, before, { ...EXAMPLE_TESTS, squat: 30 }, ctx(4));
    expect(s.target).toBe(14);
  });

  it('il ricalcolo rispetta il massimo della variante', () => {
    const s = recalcFromTest(EXERCISES.pushup, init('pushup'), { ...EXAMPLE_TESTS, pushups: 40 }, ctx(4));
    expect(s.target).toBe(12);
  });

  it('settimana di scarico: volume −40% e nessuna progressione', () => {
    const ex = EXERCISES.pushup;
    const s: ExerciseState = { ...init('pushup'), target: 10 };
    expect(sessionTarget(ex, s, true)).toBe(6);
    expect(sessionTarget(EXERCISES.plank, { ...init('plank'), target: 50 }, true)).toBe(30);
    const after = evaluateSession(ex, s, { sets: sets(s, 4, 6), plannedSets: 4, formOk: true, deload: true }, ctx(8));
    expect(after).toBe(s);
  });
});
