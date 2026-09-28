import { useEffect, useRef, useState } from 'react';
import { saveTestResult, type AppData, type TestOutcome } from '../../app/trainer';
import { ExerciseImage } from '../../components/ExerciseImage';
import { ExerciseInfo } from '../../components/ExerciseInfo';
import { Button, Card, Sheet, Stepper } from '../../components/ui';
import { BASELINE_BY_SEX, EXERCISES, TESTS } from '../../data/program';
import type { ISODate, TestDef, TestValues } from '../../domain/types';
import { countdownBeep, endBeep } from '../../lib/audio';
import { mmss } from '../../lib/format';
import { speak, stopSpeech } from '../../lib/speech';
import { useWakeLock } from '../../lib/useWakeLock';
import { useWorkoutMusic } from '../../lib/useWorkoutMusic';
import { repo } from '../../storage';

type Phase =
  | { kind: 'prep'; i: number }
  | { kind: 'run'; i: number }
  | { kind: 'enter'; i: number }
  | { kind: 'rest'; i: number } // recupero prima del test i
  | { kind: 'saving' };

/** Durata in secondi di una fase a tempo (conto alla rovescia); null = nessun conto alla rovescia. */
function countdown(phase: Phase, prepSec: number, restSec: number): number | null {
  if (phase.kind === 'prep') return prepSec;
  if (phase.kind === 'rest') return restSec;
  if (phase.kind === 'run') {
    const mode = TESTS[phase.i].mode;
    return mode === 'max' ? null : mode.seconds;
  }
  return null;
}

function announce(phase: Phase): string {
  if (phase.kind === 'saving') return 'Test completati. Ottimo lavoro!';
  const t = TESTS[phase.i];
  switch (phase.kind) {
    case 'prep':
      return `Test ${phase.i + 1} di ${TESTS.length}: ${t.name}. ${t.description}`;
    case 'run':
      return t.mode === 'max' ? (t.metric === 'seconds' ? 'Via! Premi stop quando ti fermi.' : 'Via! Fai il massimo.') : `Via! ${t.mode.seconds} secondi.`;
    case 'enter':
      return t.metric === 'seconds' ? 'Controlla il tempo e salva.' : 'Quante ne hai fatte?';
    case 'rest':
      return `Prossimo test: ${t.name}.`;
  }
}

export function TestRunner({ data, date, onClose }: { data: AppData; date: ISODate; onClose: () => void }) {
  const settings = data.profile.settings;
  const hasPrevious = data.tests.length > 0;
  const last = data.tests[data.tests.length - 1]?.values ?? BASELINE_BY_SEX[data.profile.sex ?? 'X'];
  const [phase, setPhase] = useState<Phase>({ kind: 'prep', i: 0 });
  const [values, setValues] = useState<TestValues>({ ...last });
  const [now, setNow] = useState(Date.now());
  const [showInfo, setShowInfo] = useState(false);
  const [outcome, setOutcome] = useState<TestOutcome | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const phaseStart = useRef(Date.now());
  const lastBeep = useRef(Infinity);
  const extra = useRef(0); // secondi aggiunti/tolti al recupero
  useWakeLock(!outcome);
  const [musicMuted, setMusicMuted] = useState(false);
  const hasMusic = settings.music === undefined || settings.music === 'energia' || settings.music === 'chill';
  useWorkoutMusic(settings, {
    active: !outcome,
    paused: false,
    muted: musicMuted,
    mode: phase.kind === 'run' ? 'work' : phase.kind === 'rest' ? 'rest' : 'calm',
  });

  const total = countdown(phase, settings.prepSec, settings.restBetweenTestsSec);
  const elapsed = (now - phaseStart.current) / 1000;
  const remaining = total === null ? null : Math.max(0, Math.ceil(total + extra.current - elapsed));

  const next = (p: Phase) => {
    phaseStart.current = Date.now();
    lastBeep.current = Infinity;
    extra.current = 0;
    setNow(Date.now());
    setPhase(p);
  };

  const afterEnter = (i: number) => {
    if (i + 1 < TESTS.length) next({ kind: 'rest', i: i + 1 });
    else next({ kind: 'saving' });
  };

  // voce a ogni cambio di fase
  useEffect(() => {
    if (!settings.voice) return;
    if (phase.kind === 'rest') {
      speak(`Recupero ${Math.round(settings.restBetweenTestsSec / 60)} minuti. Prossimo test: ${TESTS[phase.i].name}.`);
    } else speak(announce(phase));
  }, [phase, settings.voice, settings.restBetweenTestsSec]);

  // orologio
  useEffect(() => {
    if (outcome) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [outcome]);

  // fine dei conti alla rovescia + beep 3-2-1
  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 3 && remaining >= 1 && remaining < lastBeep.current) {
      lastBeep.current = remaining;
      if (settings.sounds) countdownBeep();
    }
    if (remaining > 0) return;
    if (settings.sounds) endBeep();
    if (phase.kind === 'prep') next({ kind: 'run', i: phase.i });
    else if (phase.kind === 'rest') next({ kind: 'prep', i: phase.i });
    else if (phase.kind === 'run') next({ kind: 'enter', i: phase.i });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  // salvataggio finale: una sola volta (i dati si aggiornano dopo il salvataggio e l'effetto ripartirebbe)
  const saved = useRef(false);
  useEffect(() => {
    if (phase.kind !== 'saving' || saved.current) return;
    saved.current = true;
    void saveTestResult(repo, data, date, values).then(setOutcome);
  }, [phase, data, date, values]);

  useEffect(() => () => stopSpeech(), []);

  if (outcome) return <TestSummary outcome={outcome} onClose={onClose} />;
  if (phase.kind === 'saving') return <div className="fixed inset-0 z-40 flex items-center justify-center bg-bg">Salvataggio…</div>;

  const t: TestDef = TESTS[phase.i];
  const setValue = (v: number) => setValues((prev) => ({ ...prev, [t.id]: v }));
  const stopPlank = () => {
    setValue(Math.round(elapsed));
    if (settings.sounds) endBeep();
    next({ kind: 'enter', i: phase.i });
  };

  return (
    <div className="safe-top safe-bottom fixed inset-0 z-40 flex flex-col bg-bg">
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between">
          <button type="button" className="h-11 w-11 rounded-full bg-line text-xl" onClick={() => setConfirmExit(true)} aria-label="Esci">
            ✕
          </button>
          <span className="text-sm font-semibold uppercase tracking-wide text-warn">
            Test {phase.i + 1} di {TESTS.length}
          </span>
          {hasMusic ? (
            <button
              type="button"
              aria-label={musicMuted ? 'Attiva la musica' : 'Spegni la musica'}
              className="h-11 w-11 rounded-full bg-line text-lg"
              onClick={() => setMusicMuted((m) => !m)}
            >
              {musicMuted ? '🔇' : '🎵'}
            </button>
          ) : (
            <span className="w-11" />
          )}
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1">
          {TESTS.map((x, i) => (
            <div key={x.id} className={`h-1.5 rounded-full ${i < phase.i ? 'bg-accent' : i === phase.i ? 'bg-warn' : 'bg-line'}`} />
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {phase.kind === 'rest' ? (
          <>
            <p className="text-center text-2xl font-semibold text-rest">Recupero</p>
            <div className="text-center text-[5.5rem] font-bold leading-none tabular-nums text-rest">{mmss(remaining ?? 0)}</div>
            <div className="flex justify-center gap-3">
              <Button onClick={() => (extra.current -= 30)}>−30 s</Button>
              <Button onClick={() => (extra.current += 30)}>+30 s</Button>
            </div>
            <p className="text-center text-lg text-slate-300">Prossimo: {t.name}</p>
            <ExerciseImage illustration={t.illustration} className="aspect-[16/10] w-full" />
          </>
        ) : (
          <>
            <button type="button" onClick={() => setShowInfo(true)} className="flex items-center justify-center gap-2">
              <span className="text-3xl font-bold">{t.name}</span>
              <span className="text-2xl text-slate-500">ⓘ</span>
            </button>
            <p className="text-center text-lg text-slate-300">{t.description}</p>
            <ExerciseImage illustration={t.illustration} className="aspect-[16/10] w-full" />

            {phase.kind === 'prep' && (
              <>
                <p className="text-center text-slate-400">Preparati</p>
                <div className="text-center text-7xl font-bold tabular-nums">{mmss(remaining ?? 0)}</div>
              </>
            )}

            {phase.kind === 'run' && t.mode !== 'max' && (
              <div className="text-center text-[5.5rem] font-bold leading-none tabular-nums text-accent">{mmss(remaining ?? 0)}</div>
            )}

            {phase.kind === 'run' && t.mode === 'max' && t.metric === 'seconds' && (
              <div className="text-center text-[5.5rem] font-bold leading-none tabular-nums text-accent">{mmss(elapsed)}</div>
            )}

            {(phase.kind === 'enter' || (phase.kind === 'run' && t.mode === 'max' && t.metric === 'reps')) && (
              <Card>
                <p className="mb-2 text-center text-slate-400">
                  {t.metric === 'seconds' ? 'Secondi tenuti' : 'Ripetizioni fatte'}
                  {hasPrevious && ` · ultima volta ${last[t.id]}`}
                </p>
                <Stepper value={values[t.id]} onChange={setValue} step={1} unit={t.unit} />
              </Card>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 px-4 pb-3">
        {phase.kind === 'prep' && <Button onClick={() => next({ kind: 'run', i: phase.i })}>Sono pronto ▶</Button>}
        {phase.kind === 'rest' && <Button onClick={() => next({ kind: 'prep', i: phase.i })}>Salta il recupero ▶</Button>}
        {phase.kind === 'run' && t.mode === 'max' && t.metric === 'seconds' && (
          <Button variant="primary" big onClick={stopPlank}>
            ■ Stop
          </Button>
        )}
        {(phase.kind === 'enter' || (phase.kind === 'run' && t.mode === 'max' && t.metric === 'reps')) && (
          <Button variant="primary" big onClick={() => afterEnter(phase.i)}>
            ✓ Salva
          </Button>
        )}
      </div>

      <Sheet open={showInfo} onClose={() => setShowInfo(false)}>
        <ExerciseInfo item={{ ...t, name: `Test: ${t.name}` }} />
      </Sheet>
      <Sheet open={confirmExit} onClose={() => setConfirmExit(false)}>
        <h2 className="text-2xl font-bold">Interrompere i test?</h2>
        <p className="mt-1 text-slate-400">I risultati non verranno salvati.</p>
        <Button variant="danger" className="mt-4 w-full" onClick={onClose}>
          Esci senza salvare
        </Button>
      </Sheet>
    </div>
  );
}

function TestSummary({ outcome, onClose }: { outcome: TestOutcome; onClose: () => void }) {
  const prev = outcome.previous?.values;
  return (
    <div className="safe-top safe-bottom fixed inset-0 z-40 flex flex-col overflow-y-auto bg-bg">
      <div className="flex flex-col gap-4 px-4 py-6">
        <div className="text-center">
          <div className="text-6xl">📊</div>
          <h1 className="mt-2 text-3xl font-bold">Test salvati</h1>
        </div>
        <Card>
          <ul className="flex flex-col gap-2">
            {TESTS.map((t) => {
              const v = outcome.result.values[t.id];
              const d = prev ? v - prev[t.id] : 0;
              return (
                <li key={t.id} className="flex items-center justify-between text-lg">
                  <span>{t.name}</span>
                  <span className="tabular-nums">
                    <span className="font-bold">{v}</span> <span className="text-sm text-slate-400">{t.unit}</span>
                    {prev && d !== 0 && (
                      <span className={`ml-2 text-base ${d > 0 ? 'text-accent' : 'text-warn'}`}>
                        {d > 0 ? '+' : ''}
                        {d}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold text-slate-300">Nuovi target</h2>
          {outcome.changes.length === 0 ? (
            <p className="text-slate-400">Nessun target cambiato: gli esercizi già avanzati (elastico, varianti) restano dove sono.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {outcome.changes.map((c) => (
                <li key={c.exerciseId}>
                  <span className="font-semibold">{EXERCISES[c.exerciseId].name}</span>: {c.from} → <span className="text-accent">{c.to}</span>
                  <p className="text-sm text-slate-400">{c.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Button variant="primary" big onClick={onClose}>
          Chiudi
        </Button>
      </div>
    </div>
  );
}
