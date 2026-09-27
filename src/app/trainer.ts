// Casi d'uso dell'app: uniscono la logica pura (domain) e lo storage (repository).

import { DAYS, DEFAULT_EQUIPMENT, DEFAULT_SETTINGS, EXERCISES } from '../data/program';
import {
  evaluateSession,
  initialState,
  isCompleted,
  prepareForSession,
  recalcFromTest,
  type Ctx,
} from '../domain/progression';
import { programDay, type ProgramDay } from '../domain/schedule';
import {
  buildPlan,
  buildSteps,
  estimateSeconds,
  gearForPlan,
  type GearItem,
  type SessionPlan,
  type Step,
} from '../domain/session';
import type {
  BodyWeightEntry,
  Equipment,
  ExerciseState,
  ISODate,
  Profile,
  Settings,
  SessionLog,
  SetLog,
  TestResult,
  TestValues,
  WorkoutDayType,
} from '../domain/types';
import type { Repository } from '../storage/repository';
import { newId } from '../lib/id';
import { todayISO } from '../domain/dates';

export interface AppData {
  profile: Profile;
  equipment: Equipment[];
  states: Record<string, ExerciseState>;
  sessions: SessionLog[];
  tests: TestResult[];
  bodyWeight: BodyWeightEntry[];
  activeRest: ISODate[];
}

export async function loadAll(repo: Repository): Promise<AppData | null> {
  const profile = await repo.getProfile();
  if (!profile) return null;
  const [equipment, states, sessions, tests, bodyWeight, activeRest] = await Promise.all([
    repo.listEquipment(),
    repo.listExerciseStates(),
    repo.listSessions(),
    repo.listTests(),
    repo.listBodyWeight(),
    repo.listActiveRest(),
  ]);
  const byId: Record<string, ExerciseState> = Object.fromEntries(states.map((s) => [s.exerciseId, s]));
  // Esercizi aggiunti in program.ts dopo l'inizio: stato iniziale dall'ultimo test.
  const lastTest = tests[tests.length - 1];
  for (const ex of Object.values(EXERCISES)) {
    if (!byId[ex.id] && lastTest) {
      const ctx: Ctx = { date: todayISO(), absWeek: programDay(profile.programStart, todayISO()).absWeek, equipment };
      byId[ex.id] = initialState(ex, lastTest.values, ctx);
    }
  }
  return {
    profile,
    equipment,
    states: byId,
    sessions,
    tests,
    bodyWeight,
    activeRest,
  };
}

// ---------------------------------------------------------------- primo avvio

export interface SetupInput {
  today: ISODate;
  programStart: ISODate;
  heightCm: number;
  weightKg: number;
  tests: TestValues;
}

export async function setupProgram(repo: Repository, input: SetupInput): Promise<void> {
  const existing = await repo.getProfile();
  const equipment = (await repo.listEquipment()).length ? await repo.listEquipment() : DEFAULT_EQUIPMENT;
  const profile: Profile = {
    id: 'me',
    heightCm: input.heightCm,
    programStart: input.programStart,
    settings: existing?.settings ?? DEFAULT_SETTINGS,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  const ctx: Ctx = { date: input.today, absWeek: Math.max(1, programDay(input.programStart, input.today).absWeek), equipment };
  await repo.saveEquipment(equipment);
  await repo.saveBodyWeight({ date: input.today, kg: input.weightKg });
  await repo.addTest({ id: newId(), date: input.today, values: input.tests, source: existing ? 'app' : 'initial' });
  await repo.saveExerciseStates(Object.values(EXERCISES).map((ex) => initialState(ex, input.tests, ctx)));
  // Il profilo per ultimo: la sua presenza indica che la configurazione è completa.
  await repo.saveProfile(profile);
}

// ---------------------------------------------------------------- oggi

export interface TodayView {
  day: ProgramDay;
  workout: {
    dayType: WorkoutDayType;
    plan: SessionPlan;
    steps: Step[];
    estimatedSec: number;
    gear: GearItem[];
    /** Stati già preparati per la sessione (con la progressione della settimana applicata). */
    prepared: Record<string, ExerciseState>;
  } | null;
  doneToday: SessionLog | null;
}

export function exercisesOfDay(dayType: WorkoutDayType): string[] {
  return DAYS[dayType].blocks.flatMap((b) => b.exercises);
}

export function ctxFor(data: AppData, date: ISODate): Ctx {
  return { date, absWeek: programDay(data.profile.programStart, date).absWeek, equipment: data.equipment };
}

export function todayView(data: AppData, date: ISODate): TodayView {
  const day = programDay(data.profile.programStart, date);
  const doneToday = [...data.sessions].reverse().find((s) => s.date === date) ?? null;
  if (day.dayType !== 'A' && day.dayType !== 'B' && day.dayType !== 'C') return { day, workout: null, doneToday };

  const ctx = ctxFor(data, date);
  const prepared = { ...data.states };
  for (const id of exercisesOfDay(day.dayType)) {
    prepared[id] = prepareForSession(EXERCISES[id], data.states[id], ctx);
  }
  const plan = buildPlan(day.dayType, prepared, data.profile.settings, day.deload);
  const steps = buildSteps(plan, data.profile.settings);
  return {
    day,
    doneToday,
    workout: {
      dayType: day.dayType,
      plan,
      steps,
      estimatedSec: estimateSeconds(steps),
      gear: gearForPlan(plan, data.equipment),
      prepared,
    },
  };
}

// ---------------------------------------------------------------- fine allenamento

export interface FinishInput {
  date: ISODate;
  plan: SessionPlan;
  prepared: Record<string, ExerciseState>;
  startedAt: string;
  endedAt: string;
  sets: SetLog[];
  badForm: string[];
}

export interface ExerciseResult {
  exerciseId: string;
  completed: boolean;
  reps: number;
  /** Motivo della prossima modifica. */
  next: string;
}

export interface FinishResult {
  session: SessionLog;
  results: ExerciseResult[];
  previous: SessionLog | null;
}

export async function finishWorkout(repo: Repository, data: AppData, input: FinishInput): Promise<FinishResult> {
  const day = programDay(data.profile.programStart, input.date);
  const ctx = ctxFor(data, input.date);
  const updated: ExerciseState[] = [];
  const results: ExerciseResult[] = [];

  for (const block of input.plan.blocks) {
    for (const ex of block.exercises) {
      const id = ex.def.id;
      const sets = input.sets.filter((s) => s.exerciseId === id).sort((a, b) => a.setIndex - b.setIndex);
      const outcome = { sets, plannedSets: block.sets, formOk: !input.badForm.includes(id), deload: input.plan.deload };
      const prepared = input.prepared[id];
      const after = evaluateSession(ex.def, prepared, outcome, ctx);
      updated.push(after);
      results.push({
        exerciseId: id,
        completed: isCompleted({ ...prepared, target: ex.target }, outcome),
        reps: sets.reduce((sum, s) => sum + s.done, 0),
        next: input.plan.deload ? 'Settimana di scarico: nessuna modifica' : (after.lastChange?.reason ?? ''),
      });
    }
  }

  const previous = [...data.sessions].reverse().find((s) => s.dayType === input.plan.dayType) ?? null;
  const session: SessionLog = {
    id: newId(),
    date: input.date,
    dayType: input.plan.dayType,
    week: day.absWeek,
    deload: input.plan.deload,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationSec: Math.round((Date.parse(input.endedAt) - Date.parse(input.startedAt)) / 1000),
    sets: input.sets,
    badForm: input.badForm,
    completed: results.every((r) => r.completed),
  };

  await repo.addSession(session);
  await repo.saveExerciseStates(updated);
  return { session, results, previous };
}

/** Volume di una sessione: ripetizioni totali (per gamba contano doppio) e secondi di tenuta. */
export function sessionVolume(s: Pick<SessionLog, 'sets'>): { reps: number; seconds: number } {
  let reps = 0;
  let seconds = 0;
  for (const set of s.sets) {
    const def = EXERCISES[set.exerciseId];
    if (!def) continue;
    if (def.metric === 'seconds') seconds += set.done;
    else reps += set.done * (def.perSide ? 2 : 1);
  }
  return { reps, seconds };
}

// ---------------------------------------------------------------- test

export interface TestOutcome {
  result: TestResult;
  previous: TestResult | null;
  /** Esercizi il cui target è cambiato, col motivo. */
  changes: { exerciseId: string; from: number; to: number; reason: string }[];
}

/** Salva un test e ricalcola i target dai nuovi massimi. */
export async function saveTestResult(repo: Repository, data: AppData, date: ISODate, values: TestValues): Promise<TestOutcome> {
  const previous = data.tests[data.tests.length - 1] ?? null;
  const result: TestResult = { id: newId(), date, values, source: 'app' };
  const ctx = ctxFor(data, date);
  const updated: ExerciseState[] = [];
  const changes: TestOutcome['changes'] = [];
  for (const ex of Object.values(EXERCISES)) {
    const before = data.states[ex.id];
    const after = recalcFromTest(ex, before, values, ctx);
    updated.push(after);
    if (after.target !== before.target) {
      changes.push({ exerciseId: ex.id, from: before.target, to: after.target, reason: after.lastChange?.reason ?? '' });
    }
  }
  await repo.addTest(result);
  await repo.saveExerciseStates(updated);
  return { result, previous, changes };
}

// ---------------------------------------------------------------- un giorno qualsiasi

export interface DayView extends TodayView {
  when: 'past' | 'today' | 'future';
  /** Sessioni registrate in quel giorno. */
  sessions: SessionLog[];
  test: TestResult | null;
  activeRestDone: boolean;
}

/**
 * Cosa prevede (o cosa è stato fatto) in un giorno. Per i giorni futuri il piano è una proiezione
 * dallo stato attuale: i target possono cambiare in base alle sessioni intermedie.
 */
export function dayView(data: AppData, date: ISODate, today: ISODate): DayView {
  const base = todayView(data, date);
  return {
    ...base,
    when: date < today ? 'past' : date > today ? 'future' : 'today',
    sessions: data.sessions.filter((s) => s.date === date),
    test: data.tests.find((t) => t.date === date && t.source === 'app') ?? null,
    activeRestDone: data.activeRest.includes(date),
  };
}

// ---------------------------------------------------------------- impostazioni

export async function saveSettings(repo: Repository, data: AppData, patch: Partial<Settings>): Promise<void> {
  await repo.saveProfile({ ...data.profile, settings: { ...data.profile.settings, ...patch } });
}
