import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { finishWorkout, type AppData, type FinishResult, type TodayView } from '../../app/trainer';
import { MuscleSummary } from '../../components/BodyMap';
import { ExerciseImage } from '../../components/ExerciseImage';
import { musclesOf } from '../../domain/stats';
import { ANCHOR_LABEL, ExerciseInfo, infoFromExercise, infoFromTimed } from '../../components/ExerciseInfo';
import { Button, Chip, Sheet, Stepper } from '../../components/ui';
import { EXERCISES } from '../../data/program';
import { loadsOfKind } from '../../domain/progression';
import type { PlannedExercise, Step } from '../../domain/session';
import type { SetLog } from '../../domain/types';
import { countdownBeep, endBeep, unlockAudio } from '../../lib/audio';
import { mmss, targetLabel } from '../../lib/format';
import { speak, stopSpeech, unlockSpeech } from '../../lib/speech';
import { useWakeLock } from '../../lib/useWakeLock';
import { useWorkoutMusic } from '../../lib/useWorkoutMusic';
import { repo } from '../../storage';
import { Summary } from './Summary';

type Workout = NonNullable<TodayView['workout']>;

const keyOf = (exerciseId: string, setIndex: number) => `${exerciseId}#${setIndex}`;

/** Secondi del conto alla rovescia di una fase; null = fase senza timer (serie a ripetizioni). */
function countdownOf(step: Step): number | null {
  if (step.kind === 'work') {
    if (step.metric !== 'seconds') return null;
    // esercizi a tempo per lato (es. plank laterale): il timer copre entrambi i lati
    return step.target * (EXERCISES[step.exerciseId].perSide ? 2 : 1);
  }
  return step.seconds;
}

/** Prepara l'audio e la voce: va chiamata dentro il tocco su "Inizia" (requisito di iOS). */
export function unlockMedia() {
  unlockAudio();
  unlockSpeech();
}

export function WorkoutPlayer({
  data,
  date,
  workout,
  onClose,
}: {
  data: AppData;
  date: string;
  workout: Workout;
  onClose: () => void;
}) {
  const { steps, plan } = workout;
  const settings = data.profile.settings;
  const planned = useMemo(() => {
    const m: Record<string, PlannedExercise> = {};
    plan.blocks.forEach((b) => b.exercises.forEach((e) => (m[e.def.id] = e)));
    return m;
  }, [plan]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(countdownOf(steps[0]));
  const [logs, setLogs] = useState<Record<string, SetLog>>({});
  // Bozza della serie in corso, legata all'indice della fase: così è corretta già al primo disegno.
  const [draftState, setDraftState] = useState<{ index: number; done: number; loadId: string | null } | null>(null);
  const [badForm, setBadForm] = useState<string[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [result, setResult] = useState<FinishResult | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(new Date().toISOString());
  const timer = useRef({ endsAt: null as number | null, remainingMs: 0, lastBeep: Infinity, stepStart: Date.now(), switched: false });
  const logsRef = useRef(logs);
  logsRef.current = logs;

  const step = steps[index];
  const stepRef = useRef(step);
  stepRef.current = step;
  useWakeLock(!result);
  const [musicMuted, setMusicMuted] = useState(false);
  const hasMusic = settings.music === undefined || settings.music === 'energia' || settings.music === 'chill';
  useWorkoutMusic(settings, {
    active: !result,
    paused,
    muted: musicMuted,
    mode: step.kind === 'work' ? 'work' : step.kind === 'rest' ? 'rest' : 'calm',
  });

  const draft = useMemo(() => {
    if (draftState?.index === index) return draftState;
    if (step.kind !== 'work') return { index, done: 0, loadId: null };
    const existing = logs[keyOf(step.exerciseId, step.setIndex)];
    const previous = logs[keyOf(step.exerciseId, step.setIndex - 1)];
    return {
      index,
      done: existing?.done ?? step.target,
      loadId: existing?.loadId ?? previous?.loadId ?? planned[step.exerciseId].loadId,
    };
  }, [draftState, index, step, logs, planned]);
  const setDraft = (d: { done: number; loadId: string | null }) => setDraftState({ index, ...d });

  // ------------------------------------------------------------ salvataggio

  const saveLog = useCallback(
    (exerciseId: string, setIndex: number, done: number, loadId: string | null) => {
      const p = planned[exerciseId];
      const log: SetLog = {
        exerciseId,
        setIndex,
        target: p.target,
        done,
        variantIndex: p.def.variants.indexOf(p.variant),
        loadId,
      };
      setLogs((prev) => ({ ...prev, [keyOf(exerciseId, setIndex)]: log }));
      logsRef.current = { ...logsRef.current, [keyOf(exerciseId, setIndex)]: log };
    },
    [planned],
  );

  const finishing = useRef(false);
  const finish = useCallback(async () => {
    if (finishing.current) return; // una sola volta, anche se timer e tocco arrivano insieme
    finishing.current = true;
    stopSpeech();
    const res = await finishWorkout(repo, data, {
      date,
      plan,
      prepared: workout.prepared,
      startedAt: startedAt.current,
      endedAt: new Date().toISOString(),
      sets: Object.values(logsRef.current),
      badForm,
    });
    if (settings.voice) speak('Allenamento completato. Ottimo lavoro!');
    setResult(res);
  }, [data, date, plan, workout.prepared, badForm, settings.voice]);

  const goTo = useCallback(
    (i: number) => {
      if (i >= steps.length) void finish();
      else setIndex(Math.max(0, i));
    },
    [steps.length, finish],
  );

  /** Fine naturale di una fase a tempo. */
  const completeStep = useCallback(() => {
    const s = steps[index];
    if (s.kind === 'work' && s.metric === 'seconds') {
      const existing = logsRef.current[keyOf(s.exerciseId, s.setIndex)];
      saveLog(s.exerciseId, s.setIndex, existing?.done ?? s.target, existing?.loadId ?? planned[s.exerciseId].loadId);
    }
    goTo(index + 1);
  }, [steps, index, goTo, saveLog, planned]);

  // ------------------------------------------------------------ ingresso in una fase

  useEffect(() => {
    const s = steps[index];
    const secs = countdownOf(s);
    timer.current = {
      endsAt: secs !== null && !paused ? Date.now() + secs * 1000 : null,
      remainingMs: (secs ?? 0) * 1000,
      lastBeep: Infinity,
      stepStart: Date.now(),
      switched: false,
    };
    setRemaining(secs);

    if (settings.voice) speak(announce(s, planned, data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // ------------------------------------------------------------ pausa

  useEffect(() => {
    const t = timer.current;
    if (paused && t.endsAt !== null) {
      t.remainingMs = t.endsAt - Date.now();
      t.endsAt = null;
    } else if (!paused && t.endsAt === null && countdownOf(steps[index]) !== null) {
      t.endsAt = Date.now() + t.remainingMs;
    }
  }, [paused, steps, index]);

  // ------------------------------------------------------------ orologio

  const completeRef = useRef(completeStep);
  completeRef.current = completeStep;

  useEffect(() => {
    if (result) return;
    const id = setInterval(() => {
      setElapsed(Math.round((Date.now() - Date.parse(startedAt.current)) / 1000));
      const t = timer.current;
      if (t.endsAt === null) return;
      const ms = t.endsAt - Date.now();
      const sec = Math.ceil(ms / 1000);
      setRemaining(Math.max(0, sec));
      if (sec <= 3 && sec >= 1 && sec < t.lastBeep) {
        t.lastBeep = sec;
        if (settings.sounds) countdownBeep();
      }
      // a metà di un esercizio a tempo per lato: cambio lato
      const cur = stepRef.current;
      if (cur.kind === 'work' && cur.metric === 'seconds' && EXERCISES[cur.exerciseId].perSide && !t.switched && sec <= cur.target) {
        t.switched = true;
        if (settings.sounds) endBeep();
        if (settings.voice) speak('Cambia lato');
      }
      if (ms <= 0) {
        t.endsAt = null;
        if (settings.sounds) endBeep();
        completeRef.current();
      }
    }, 200);
    return () => clearInterval(id);
  }, [result, settings.sounds]);

  useEffect(() => () => stopSpeech(), []);

  // ------------------------------------------------------------ azioni

  const confirmSet = () => {
    if (step.kind !== 'work') return;
    saveLog(step.exerciseId, step.setIndex, draft.done, draft.loadId);
    if (settings.sounds) endBeep();
    goTo(index + 1);
  };

  const stopTimedSet = () => {
    if (step.kind !== 'work') return;
    const sides = EXERCISES[step.exerciseId].perSide ? 2 : 1;
    const done = Math.round((Date.now() - timer.current.stepStart) / 1000 / sides);
    saveLog(step.exerciseId, step.setIndex, Math.min(done, step.target), draft.loadId);
    goTo(index + 1);
  };

  const addRest = (sec: number) => {
    const t = timer.current;
    if (t.endsAt !== null) t.endsAt += sec * 1000;
    else t.remainingMs += sec * 1000;
    setRemaining((r) => (r ?? 0) + sec);
  };

  const toggleForm = (id: string) =>
    setBadForm((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // ------------------------------------------------------------ render

  if (result) return <Summary data={data} plan={plan} result={result} onClose={onClose} />;

  const lastWork = [...steps.slice(0, index)].reverse().find((s) => s.kind === 'work') as
    | Extract<Step, { kind: 'work' }>
    | undefined;
  const lastLog = lastWork ? logs[keyOf(lastWork.exerciseId, lastWork.setIndex)] : undefined;

  const phase = phaseOf(step);
  const infoItem =
    step.kind === 'timed'
      ? infoFromTimed(step.item)
      : step.kind === 'work'
        ? infoFromExercise(planned[step.exerciseId].def, planned[step.exerciseId].variant)
        : step.kind === 'prep'
          ? infoFromExercise(planned[step.exerciseIds[0]].def, planned[step.exerciseIds[0]].variant)
          : null;

  return (
    <div className="safe-top safe-bottom fixed inset-0 z-40 flex flex-col bg-bg">
      {/* barra superiore */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between">
          <button type="button" className="h-11 w-11 rounded-full bg-line text-xl" onClick={() => setConfirmExit(true)} aria-label="Esci">
            ✕
          </button>
          <span className={`text-sm font-semibold uppercase tracking-wide ${phase.color}`}>{phase.label}</span>
          <span className="flex items-center gap-2">
            {hasMusic && (
              <button
                type="button"
                aria-label={musicMuted ? 'Attiva la musica' : 'Spegni la musica'}
                className="h-11 w-11 rounded-full bg-line text-lg"
                onClick={() => setMusicMuted((m) => !m)}
              >
                {musicMuted ? '🔇' : '🎵'}
              </button>
            )}
            <span className="w-11 text-right text-sm tabular-nums text-slate-400">{mmss(elapsed)}</span>
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-accent transition-all" style={{ width: `${(index / steps.length) * 100}%` }} />
        </div>
      </div>

      {/* contenuto della fase */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {step.kind === 'timed' && (
          <>
            <Title text={step.item.name} onInfo={() => setShowInfo(true)} />
            <ExerciseImage illustration={step.item.illustration} className="aspect-[4/3] w-full" paused={paused} />
            <p className="text-center text-lg text-slate-300">{step.item.description}</p>
            <BigTimer value={remaining} color="text-warn" />
          </>
        )}

        {step.kind === 'prep' && (
          <>
            <p className="text-center text-slate-400">{step.exerciseIds.length > 1 ? 'Preparati: superserie' : 'Preparati'}</p>
            {step.exerciseIds.map((id) => {
              const p = planned[id];
              return (
                <div key={id} className="flex items-center gap-3">
                  <ExerciseImage illustration={p.def.illustration} className="h-24 w-32 shrink-0" paused={paused} />
                  <div>
                    <div className="text-xl font-bold leading-tight">{p.variant.name}</div>
                    <div className="text-lg text-accent">{targetLabel(p.target, p.def.metric, p.def.perSide)}</div>
                    <LoadName data={data} loadId={p.loadId} />
                    {p.def.anchor && <div className="text-sm text-rest">{ANCHOR_LABEL[p.def.anchor]}</div>}
                  </div>
                </div>
              );
            })}
            <MuscleSummary map={musclesOf(step.exerciseIds.map((id) => planned[id].def))} compact />
            <Button variant="ghost" onClick={() => setShowInfo(true)}>
              ⓘ Come si fa
            </Button>
            <BigTimer value={remaining} color="text-slate-200" />
          </>
        )}

        {step.kind === 'work' && (
          <WorkView
            step={step}
            planned={planned[step.exerciseId]}
            data={data}
            draft={draft}
            setDraft={setDraft}
            remaining={remaining}
            paused={paused}
            formOk={!badForm.includes(step.exerciseId)}
            onToggleForm={() => toggleForm(step.exerciseId)}
            onInfo={() => setShowInfo(true)}
          />
        )}

        {step.kind === 'rest' && (
          <>
            <p className="text-center text-2xl font-semibold text-rest">Recupero</p>
            <BigTimer value={remaining} color="text-rest" />
            <div className="flex justify-center gap-3">
              <Button onClick={() => addRest(-15)}>−15 s</Button>
              <Button onClick={() => addRest(15)}>+15 s</Button>
            </div>
            <p className="text-center text-lg text-slate-300">Poi: {step.nextLabel}</p>
            {lastWork && lastLog && (
              <div className="rounded-2xl border border-line bg-card p-4">
                <p className="mb-2 text-center text-sm text-slate-400">
                  Correggi l’ultima serie · {planned[lastWork.exerciseId].variant.name}
                </p>
                <Stepper
                  value={lastLog.done}
                  step={lastWork.metric === 'seconds' ? 5 : 1}
                  unit={lastWork.metric === 'seconds' ? 'secondi' : 'ripetizioni'}
                  onChange={(v) => saveLog(lastLog.exerciseId, lastLog.setIndex, v, lastLog.loadId)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* comandi */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-3 [&>button]:whitespace-nowrap [&>button]:px-2 [&>button]:text-base">
        <Button onClick={() => goTo(index - 1)} disabled={index === 0}>
          ◀ Indietro
        </Button>
        <Button onClick={() => setPaused((p) => !p)} disabled={remaining === null}>
          {paused ? '▶ Riprendi' : '❚❚ Pausa'}
        </Button>
        <Button onClick={() => goTo(index + 1)}>Salta ▶</Button>
      </div>
      {step.kind === 'work' && (
        <div className="px-4 pb-3">
          {step.metric === 'reps' ? (
            <Button variant="primary" big className="w-full" onClick={confirmSet}>
              ✓ Fatto
            </Button>
          ) : (
            <Button variant="secondary" big className="w-full" onClick={stopTimedSet}>
              ■ Stop (mi fermo prima)
            </Button>
          )}
        </div>
      )}

      <Sheet open={showInfo} onClose={() => setShowInfo(false)}>
        {infoItem && <ExerciseInfo item={infoItem} />}
      </Sheet>

      <Sheet open={confirmExit} onClose={() => setConfirmExit(false)}>
        <h2 className="text-2xl font-bold">Vuoi uscire?</h2>
        <div className="mt-4 flex flex-col gap-3">
          <Button
            variant="primary"
            onClick={() => {
              setConfirmExit(false);
              void finish();
            }}
          >
            Termina e salva quello che ho fatto
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              stopSpeech();
              onClose();
            }}
          >
            Esci senza salvare
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------- sotto-componenti

function WorkView({
  step,
  planned,
  data,
  draft,
  setDraft,
  remaining,
  paused,
  formOk,
  onToggleForm,
  onInfo,
}: {
  step: Extract<Step, { kind: 'work' }>;
  planned: PlannedExercise;
  data: AppData;
  draft: { done: number; loadId: string | null };
  setDraft: (d: { done: number; loadId: string | null }) => void;
  remaining: number | null;
  paused: boolean;
  formOk: boolean;
  onToggleForm: () => void;
  onInfo: () => void;
}) {
  const { def, variant } = planned;
  const loads = variant.loadKind ? loadsOfKind(data.equipment, variant.loadKind) : [];
  return (
    <>
      <div className="flex items-center justify-between text-slate-400">
        <span>
          Serie {step.setIndex + 1} di {step.totalSets}
          {step.isLastSet && <span className="ml-2 font-semibold text-warn">ultima</span>}
        </span>
        {step.supersetPos !== null && <span>Superserie {step.supersetPos + 1}/2</span>}
      </div>
      <Title text={variant.name} onInfo={onInfo} />
      <ExerciseImage illustration={def.illustration} className="aspect-[16/10] w-full" paused={paused} />

      {step.metric === 'seconds' ? (
        <>
          {def.perSide && remaining !== null && (
            <p className="text-center text-lg font-semibold text-warn">{remaining > step.target ? 'Primo lato' : 'Secondo lato'}</p>
          )}
          <BigTimer value={remaining} color="text-accent" />
        </>
      ) : (
        <>
          <p className="text-center text-lg text-slate-400">
            Obiettivo: <span className="font-semibold text-accent">{targetLabel(step.target, 'reps', def.perSide)}</span>
          </p>
          <Stepper
            value={draft.done}
            onChange={(v) => setDraft({ ...draft, done: v })}
            unit={def.perSide ? 'ripetizioni per lato' : 'ripetizioni fatte'}
          />
        </>
      )}

      {loads.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {loads.map((l) => (
            <Chip key={l.id} active={draft.loadId === l.id} color={l.color} onClick={() => setDraft({ ...draft, loadId: l.id })}>
              {l.name}
            </Chip>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onToggleForm}
        className={`mx-auto rounded-full px-4 py-2 text-base ${formOk ? 'bg-accent/15 text-accent' : 'bg-warn/15 text-warn'}`}
      >
        {formOk ? '✓ Forma ok' : '⚠ Forma da migliorare (niente progressione)'}
      </button>
    </>
  );
}

function Title({ text, onInfo }: { text: string; onInfo: () => void }) {
  return (
    <button type="button" onClick={onInfo} className="flex items-center justify-center gap-2 text-center">
      <span className="text-3xl font-bold leading-tight">{text}</span>
      <span className="text-2xl text-slate-500">ⓘ</span>
    </button>
  );
}

function BigTimer({ value, color }: { value: number | null; color: string }) {
  if (value === null) return null;
  return <div className={`text-center text-[5.5rem] font-bold leading-none tabular-nums ${color}`}>{mmss(value)}</div>;
}

function LoadName({ data, loadId }: { data: AppData; loadId: string | null }) {
  const l = data.equipment.find((e) => e.id === loadId);
  if (!l) return null;
  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-300">
      {l.color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />}
      {l.name}
    </div>
  );
}

function phaseOf(step: Step): { label: string; color: string } {
  switch (step.kind) {
    case 'timed':
      return step.phase === 'warmup'
        ? { label: 'Riscaldamento', color: 'text-warn' }
        : { label: 'Defaticamento', color: 'text-warn' };
    case 'prep':
      return { label: 'Preparazione', color: 'text-slate-300' };
    case 'work':
      return { label: 'Esercizio', color: 'text-accent' };
    case 'rest':
      return { label: 'Recupero', color: 'text-rest' };
  }
}

// ---------------------------------------------------------------- guida vocale

function loadSpoken(data: AppData, loadId: string | null): string {
  const l = data.equipment.find((e) => e.id === loadId);
  return l ? l.name.replace('–', ',') : '';
}

export function announce(step: Step, planned: Record<string, PlannedExercise>, data: AppData): string {
  switch (step.kind) {
    case 'timed':
      return `${step.phase === 'warmup' ? 'Riscaldamento' : 'Defaticamento'}. ${step.item.name}, ${step.seconds} secondi.`;
    case 'prep': {
      const parts = step.exerciseIds.map((id) => {
        const p = planned[id];
        const load = loadSpoken(data, p.loadId);
        return `${p.variant.name}${load ? `, ${load}` : ''}`;
      });
      const anchor = planned[step.exerciseIds[0]].def.anchor;
      const head = step.exerciseIds.length > 1 ? 'Superserie: ' : 'Prossimo esercizio: ';
      return `${head}${parts.join(' e ')}.${anchor ? ` Ancoraggio ${anchor}.` : ''}`;
    }
    case 'work': {
      const p = planned[step.exerciseId];
      const def = EXERCISES[step.exerciseId];
      const amount =
        step.metric === 'seconds'
          ? `${step.target} secondi${def.perSide ? ' per lato' : ''}. Via!`
          : `${step.target} ripetizioni${def.perSide ? ' per lato' : ''}.`;
      const head = step.supersetPos === 1 ? '' : step.isLastSet ? 'Ultima serie. ' : `Serie ${step.setIndex + 1} di ${step.totalSets}. `;
      return `${head}${p.variant.name}, ${amount}`;
    }
    case 'rest':
      return `Recupero ${step.seconds} secondi.`;
  }
}
