// Regole di progressione automatica. Funzioni pure: ricevono lo stato di un
// esercizio e restituiscono il nuovo stato, con il motivo della modifica.

import { RULES } from '../data/program';
import type {
  ChangeLog,
  Equipment,
  EquipmentKind,
  ExerciseDef,
  ExerciseState,
  ISODate,
  SetLog,
  TestValues,
  VariantDef,
} from './types';

export interface Ctx {
  date: ISODate;
  /** Settimana assoluta del programma. */
  absWeek: number;
  equipment: Equipment[];
}

// ---------------------------------------------------------------- carichi ed elastici

export function loadsOfKind(equipment: Equipment[], kind: EquipmentKind): Equipment[] {
  return equipment.filter((e) => e.kind === kind).sort((a, b) => a.level - b.level);
}

export function startLoad(equipment: Equipment[], variant: VariantDef): string | null {
  if (!variant.loadKind) return null;
  const list = loadsOfKind(equipment, variant.loadKind);
  if (list.length === 0) return null;
  const pref = variant.startLoad;
  if (pref === 'heaviest') return list[list.length - 1].id;
  if (pref && typeof pref === 'object') {
    // a parità di distanza vince il più leggero (la lista è già in ordine crescente)
    return list.reduce((best, e) => (Math.abs(e.level - pref.closestTo) < Math.abs(best.level - pref.closestTo) ? e : best)).id;
  }
  return list[0].id;
}

/** Il prossimo attrezzo più duro dello stesso tipo, tra quelli registrati. */
export function nextLoad(equipment: Equipment[], kind: EquipmentKind, currentId: string | null): Equipment | null {
  const list = loadsOfKind(equipment, kind);
  const current = list.find((e) => e.id === currentId);
  if (!current) return list[0] ?? null;
  return list.find((e) => e.level > current.level) ?? null;
}

function loadLabel(kind: EquipmentKind, e: Equipment): string {
  if (kind === 'dumbbell') return `ai ${e.name.toLowerCase()}`;
  if (kind === 'kettlebell') return `al ${e.name.toLowerCase()}`;
  if (kind === 'mini-band') return `alla mini band «${e.name}»`;
  return `all'elastico ${e.name}`;
}

// ---------------------------------------------------------------- utilità

function unit(ex: ExerciseDef): string {
  return ex.metric === 'seconds' ? ' s' : '';
}

function roundToStep(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

function snapshot(s: ExerciseState) {
  return { variantIndex: s.variantIndex, target: s.target, loadId: s.loadId };
}

function withChange(
  prev: ExerciseState,
  next: Omit<ExerciseState, 'lastChange' | 'history'>,
  date: ISODate,
  kind: ChangeLog['kind'],
  reason: string,
): ExerciseState {
  const change: ChangeLog = { date, kind, reason, from: snapshot(prev), to: snapshot(next as ExerciseState) };
  return { ...next, lastChange: change, history: [...prev.history, change] };
}

export function variantOf(ex: ExerciseDef, state: ExerciseState): VariantDef {
  return ex.variants[Math.min(state.variantIndex, ex.variants.length - 1)];
}

// ---------------------------------------------------------------- stato iniziale e test

export function targetFromTest(ex: ExerciseDef, tests: TestValues): number | null {
  if (!ex.testLink) return null;
  const v = ex.variants[0];
  let t = roundToStep(ex.testLink.ratio * tests[ex.testLink.test], v.step);
  if (v.max !== undefined) t = Math.min(t, v.max);
  return t;
}

export function initialState(ex: ExerciseDef, tests: TestValues, ctx: Ctx): ExerciseState {
  const v = ex.variants[0];
  const fromTest = targetFromTest(ex, tests);
  const target = fromTest ?? v.start;
  const base: ExerciseState = {
    exerciseId: ex.id,
    variantIndex: 0,
    target,
    loadId: startLoad(ctx.equipment, v),
    missStreak: 0,
    lastProgressWeek: ctx.absWeek,
    pendingProgress: false,
    lastChange: null,
    history: [],
  };
  const reason = fromTest !== null ? `Punto di partenza calcolato dal test (${testPct(ex)})` : 'Punto di partenza del programma';
  const change: ChangeLog = { date: ctx.date, kind: 'start', reason, from: snapshot(base), to: snapshot(base) };
  return { ...base, lastChange: change, history: [change] };
}

function testPct(ex: ExerciseDef): string {
  return `${Math.round((ex.testLink?.ratio ?? 0) * 100)}% del massimo`;
}

/** Dopo un test: ricalcola il target dai nuovi massimi (solo sulla variante di base). */
export function recalcFromTest(ex: ExerciseDef, state: ExerciseState, tests: TestValues, ctx: Ctx): ExerciseState {
  const t = targetFromTest(ex, tests);
  const reset = { ...state, missStreak: 0, pendingProgress: false, lastProgressWeek: ctx.absWeek };
  if (t === null || state.variantIndex !== 0) {
    // Nessun collegamento al test o variante già avanzata: si riparte da dove si è.
    return { ...reset, lastChange: state.lastChange, history: state.history };
  }
  const max = tests[ex.testLink!.test];
  return withChange(
    state,
    { ...reset, target: t },
    ctx.date,
    'test',
    `Ricalcolato dal test: ${testPct(ex)} di ${max}${unit(ex)} → ${t}${unit(ex)}`,
  );
}

// ---------------------------------------------------------------- prima della sessione

/**
 * Prepara lo stato per una nuova sessione:
 * - cambi di variante legati alla settimana (es. squat con elastico dalla settimana 3)
 * - progressione settimanale se l'ultima sessione è stata completata
 */
export function prepareForSession(ex: ExerciseDef, state: ExerciseState, ctx: Ctx): ExerciseState {
  let s = state;

  // Variante obbligatoria da una certa settimana
  for (let i = ex.variants.length - 1; i > s.variantIndex; i--) {
    const v = ex.variants[i];
    if (v.fromWeek !== undefined && ctx.absWeek >= v.fromWeek) {
      return withChange(
        s,
        {
          ...s,
          variantIndex: i,
          target: v.start,
          loadId: startLoad(ctx.equipment, v),
          missStreak: 0,
          pendingProgress: false,
          lastProgressWeek: ctx.absWeek,
        },
        ctx.date,
        'variant',
        `Dalla settimana ${v.fromWeek}: ${v.name}, riparti da ${v.start}${unit(ex)}`,
      );
    }
  }

  if (s.pendingProgress && ctx.absWeek > s.lastProgressWeek) {
    s = progress(ex, s, ctx);
  }
  return s;
}

/** Applica un gradino di progressione. */
export function progress(ex: ExerciseDef, s: ExerciseState, ctx: Ctx): ExerciseState {
  const v = variantOf(ex, s);
  const base = { ...s, pendingProgress: false, lastProgressWeek: ctx.absWeek, missStreak: 0 };

  // 1. Si può ancora aggiungere
  if (v.max === undefined || s.target < v.max) {
    const target = v.max === undefined ? s.target + v.step : Math.min(v.max, s.target + v.step);
    return withChange(
      s,
      { ...base, target },
      ctx.date,
      'increase',
      `+${target - s.target}${unit(ex)} perché hai completato tutto la volta scorsa`,
    );
  }

  // 2. Al massimo: elastico/carico più duro, ripartendo dalle ripetizioni di partenza
  if (v.loadKind) {
    const next = nextLoad(ctx.equipment, v.loadKind, s.loadId);
    if (next) {
      return withChange(
        s,
        { ...base, loadId: next.id, target: v.start },
        ctx.date,
        'load',
        `Passa ${loadLabel(v.loadKind, next)} e riparti da ${v.start}${unit(ex)}`,
      );
    }
  }

  // 3. Variante successiva
  const nextVariant = ex.variants[s.variantIndex + 1];
  if (nextVariant) {
    return withChange(
      s,
      {
        ...base,
        variantIndex: s.variantIndex + 1,
        target: nextVariant.start,
        loadId: nextVariant.loadKind ? startLoad(ctx.equipment, nextVariant) : null,
      },
      ctx.date,
      'variant',
      `Passa a: ${nextVariant.name}, riparti da ${nextVariant.start}${unit(ex)}`,
    );
  }

  // 4. Nessun gradino successivo
  return withChange(s, base, ctx.date, 'hold', v.maxHint ?? 'Hai raggiunto il massimo previsto: mantieni');
}

// ---------------------------------------------------------------- dopo la sessione

export interface ExerciseOutcome {
  sets: SetLog[];
  plannedSets: number;
  formOk: boolean;
  /** Sessione di scarico: non conta per la progressione. */
  deload: boolean;
}

export function isCompleted(state: ExerciseState, o: ExerciseOutcome): boolean {
  return o.formOk && o.sets.length >= o.plannedSets && o.sets.every((set) => set.done >= state.target);
}

/** Valuta la sessione appena fatta e aggiorna lo stato dell'esercizio. */
export function evaluateSession(ex: ExerciseDef, state: ExerciseState, o: ExerciseOutcome, ctx: Ctx): ExerciseState {
  if (o.deload) return state;

  // Se l'utente ha cambiato elastico/peso durante la sessione, si adotta quello usato nell'ultima serie.
  const v = variantOf(ex, state);
  const lastLoad = o.sets.length ? o.sets[o.sets.length - 1].loadId : state.loadId;
  const s: ExerciseState = v.loadKind && lastLoad !== state.loadId ? { ...state, loadId: lastLoad } : state;

  if (isCompleted(s, o)) {
    const sameWeek = ctx.absWeek <= s.lastProgressWeek;
    return withChange(
      s,
      { ...s, missStreak: 0, pendingProgress: true },
      ctx.date,
      'repeat',
      sameWeek
        ? 'Completato! La progressione scatta dalla prossima settimana'
        : 'Completato! Alla prossima sessione si sale',
    );
  }

  const missStreak = s.missStreak + 1;
  if (missStreak >= RULES.missesBeforeDecrease) {
    let target = Math.round(s.target * RULES.decreaseFactor);
    if (ex.metric === 'seconds') target = Math.floor(target / v.step) * v.step;
    if (target >= s.target) target = s.target - v.step;
    target = Math.max(v.step, target);
    return withChange(
      s,
      { ...s, target, missStreak: 0, pendingProgress: false },
      ctx.date,
      'decrease',
      `−10% (${s.target} → ${target}${unit(ex)}) perché hai mancato il target ${missStreak} volte di fila`,
    );
  }

  return withChange(
    s,
    { ...s, missStreak, pendingProgress: false },
    ctx.date,
    'repeat',
    o.formOk ? 'Stesso target: la volta scorsa non l’hai completato' : 'Stesso target: la forma non era buona',
  );
}

/** Target effettivo di una sessione (ridotto nella settimana di scarico). */
export function sessionTarget(ex: ExerciseDef, state: ExerciseState, deload: boolean): number {
  if (!deload) return state.target;
  const v = variantOf(ex, state);
  return Math.max(v.step, Math.round((state.target * RULES.deload.volumeFactor) / v.step) * v.step);
}
