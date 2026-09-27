import { useRef, useState, type ReactNode } from 'react';
import { setupProgram, type AppData } from '../../app/trainer';
import { Button, Card, NumericInput, Toggle } from '../../components/ui';
import {
  BASELINE_BY_SEX,
  buildEquipment,
  COOLDOWN_POOLS,
  DUMBBELL_CHOICES,
  EQUIPMENT_KIND_LABEL,
  EXERCISES,
  SEX_LABEL,
  TESTS,
  WARMUP_POOLS,
} from '../../data/program';
import { formatLong, nearestMonday, todayISO } from '../../domain/dates';
import type { BackupData, EquipmentKind, Sex, TestValues } from '../../domain/types';
import { readFileAsText } from '../../lib/files';
import { repo } from '../../storage';

type Step = 'welcome' | 'profile' | 'equipment' | 'level' | 'start';

const KINDS: EquipmentKind[] = ['mat', 'tube-band', 'mini-band', 'flat-band', 'dumbbell', 'ball', 'ab-wheel', 'chair', 'bike'];

/** Per ogni tipo di attrezzo, gli esercizi del programma che lo usano (per spiegare a cosa serve). */
function usedFor(kind: EquipmentKind): string[] {
  const names = new Set<string>();
  for (const ex of Object.values(EXERCISES)) {
    const kinds = [...ex.equipment, ...ex.variants.flatMap((v) => [...(v.loadKind ? [v.loadKind] : []), ...(v.extraEquipment ?? [])])];
    if (kinds.includes(kind)) names.add(ex.name.toLowerCase());
  }
  for (const t of [...WARMUP_POOLS.flat(), ...COOLDOWN_POOLS.flat()]) if (t.equipment.includes(kind)) names.add(t.name.toLowerCase());
  return [...names];
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
  placeholder,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-2">
      <span className="text-lg">{label}</span>
      <span className="flex items-center gap-2">
        <NumericInput
          value={value}
          onChange={onChange}
          decimals={step < 1}
          placeholder={placeholder}
          ariaLabel={label}
          className="w-24 rounded-xl border border-line bg-bg px-3 py-2 text-right text-xl"
        />
        {suffix && <span className="w-16 text-sm text-slate-400">{suffix}</span>}
      </span>
    </label>
  );
}

function StepHeader({ n, total, title, text }: { n: number; total: number; title: string; text?: ReactNode }) {
  return (
    <header>
      <div className="mb-3 flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < n ? 'bg-accent' : 'bg-line'}`} />
        ))}
      </div>
      <h1 className="text-3xl font-bold">{title}</h1>
      {text && <p className="mt-1 text-slate-400">{text}</p>}
    </header>
  );
}

/**
 * Configurazione iniziale a passi (profilo → attrezzatura → livello → inizio), senza dati
 * predefiniti di nessuno. Con `restart` diventa "Ricomincia il programma": salta l'attrezzatura
 * e parte dai dati dell'utente.
 */
export function Onboarding({
  restart,
  onDone,
  onStartTests,
}: {
  restart?: AppData;
  onDone?: () => void;
  /** Chiamata se l'utente sceglie di fare subito i test guidati. */
  onStartTests?: () => void;
} = {}) {
  const today = todayISO();
  const steps: Step[] = restart ? ['profile', 'level', 'start'] : ['welcome', 'profile', 'equipment', 'level', 'start'];
  const [step, setStep] = useState<Step>(steps[0]);
  const idx = steps.indexOf(step);
  const next = () => setStep(steps[idx + 1]);
  const back = () => (idx > 0 ? setStep(steps[idx - 1]) : onDone?.());

  const lastTest = restart?.tests[restart.tests.length - 1]?.values;
  const lastWeight = restart?.bodyWeight[restart.bodyWeight.length - 1]?.kg;
  const [sex, setSex] = useState<Sex | null>(restart?.profile.sex ?? null);
  const [heightCm, setHeight] = useState(restart?.profile.heightCm ?? NaN);
  const [weightKg, setWeight] = useState(lastWeight ?? NaN);
  const [kinds, setKinds] = useState<EquipmentKind[]>(['mat']);
  const [dumbbellKg, setDumbbellKg] = useState<number[]>([]);
  const [mode, setMode] = useState<'guided' | 'known'>(restart ? 'known' : 'guided');
  const [tests, setTests] = useState<TestValues>(
    lastTest ? { ...lastTest } : ({ pushups: NaN, squat: NaN, plank: NaN, burpees: NaN, crunch: NaN } as TestValues),
  );
  const [programStart, setStart] = useState(restart ? today : nearestMonday(today));
  const [saving, setSaving] = useState(false);

  const profileValid = sex !== null && heightCm > 0 && weightKg > 0;
  const testsValid = mode === 'guided' || Object.values(tests).every((v) => Number.isFinite(v) && v >= 0);
  const toggleKind = (k: EquipmentKind, on: boolean) => setKinds((prev) => (on ? [...prev, k] : prev.filter((x) => x !== k)));

  const submit = async () => {
    setSaving(true);
    const guided = mode === 'guided';
    // prima di qualsiasi await: su iOS audio e voce si sbloccano solo dentro il tocco
    if (guided) onStartTests?.();
    await setupProgram(repo, {
      today,
      programStart,
      heightCm,
      weightKg,
      sex: sex ?? 'X',
      tests: guided ? (lastTest ?? BASELINE_BY_SEX[sex ?? 'X']) : tests,
      provisional: guided, // i valori veri arrivano dai test guidati
      equipment: restart ? undefined : buildEquipment(kinds, kinds.includes('dumbbell') ? dumbbellKg : []),
    });
    onDone?.();
  };

  const nav = (canGo: boolean, label = 'Avanti') => (
    <div className="flex flex-col gap-2">
      <Button variant="primary" big disabled={!canGo} onClick={next}>
        {label}
      </Button>
      {(idx > 0 || onDone) && (
        <Button variant="ghost" onClick={back}>
          {idx > 0 ? '◀ Indietro' : 'Annulla'}
        </Button>
      )}
    </div>
  );

  return (
    <main className="safe-top safe-bottom mx-auto flex max-w-md flex-col gap-5 px-4 py-6">
      {step === 'welcome' && <Welcome onStart={next} />}

      {step === 'profile' && (
        <>
          <StepHeader
            n={idx + 1}
            total={steps.length}
            title={restart ? 'Ricomincia il programma' : 'Il tuo profilo'}
            text={restart ? 'Nuovi test e nuova data di inizio. Storico, attrezzatura e impostazioni restano.' : 'Servono per seguire i tuoi progressi. Restano solo su questo telefono.'}
          />
          <Card>
            <p className="mb-2 text-lg">Sesso</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Sesso">
              {(['F', 'M', 'X'] as Sex[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={sex === k}
                  onClick={() => setSex(k)}
                  className={`min-h-[3.25rem] rounded-xl border-2 px-2 text-base ${sex === k ? 'border-accent bg-accent/15' : 'border-line'}`}
                >
                  {SEX_LABEL[k]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-slate-500">Serve per le stime di partenza prima dei test e per la figura dei muscoli.</p>
          </Card>
          <Card>
            <NumberField label="Altezza" value={heightCm} onChange={setHeight} suffix="cm" placeholder="es. 175" />
            <NumberField label="Peso" value={weightKg} onChange={setWeight} step={0.1} suffix="kg" placeholder="es. 70" />
          </Card>
          {nav(profileValid)}
        </>
      )}

      {step === 'equipment' && (
        <>
          <StepHeader n={idx + 1} total={steps.length} title="La tua attrezzatura" text="Segna cosa hai. Nomi, colori e durezza degli elastici li cambi dopo in Impostazioni." />
          <Card className="flex flex-col divide-y divide-line">
            {KINDS.map((k) => {
              const on = kinds.includes(k);
              return (
                <div key={k} className="py-2">
                  <Toggle label={EQUIPMENT_KIND_LABEL[k]} checked={on} onChange={(v) => toggleKind(k, v)} />
                  <p className="text-sm text-slate-500">Serve per: {usedFor(k).join(', ')}</p>
                  {on && ['tube-band', 'mini-band', 'flat-band'].includes(k) && (
                    <p className="mt-1 text-sm text-slate-400">Creo {k === 'flat-band' ? '2' : '3'} livelli (leggero → duro): li adatti dopo ai tuoi.</p>
                  )}
                  {on && k === 'dumbbell' && (
                    <div className="mt-2">
                      <p className="mb-2 text-sm text-slate-400">Che pesi hai? (kg, anche più di uno)</p>
                      <div className="flex flex-wrap gap-2">
                        {DUMBBELL_CHOICES.map((kg) => {
                          const sel = dumbbellKg.includes(kg);
                          return (
                            <button
                              key={kg}
                              type="button"
                              onClick={() => setDumbbellKg((p) => (sel ? p.filter((x) => x !== kg) : [...p, kg]))}
                              className={`h-11 min-w-[3rem] rounded-full border px-3 text-lg ${sel ? 'border-accent bg-accent/15' : 'border-line'}`}
                            >
                              {kg}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
          {kinds.length < 3 && (
            <p className="text-sm text-warn">Il programma usa diversi attrezzi: senza, alcuni esercizi andranno adattati (li vedrai segnalati).</p>
          )}
          {nav(!(kinds.includes('dumbbell') && dumbbellKg.length === 0))}
        </>
      )}

      {step === 'level' && (
        <>
          <StepHeader n={idx + 1} total={steps.length} title="Il tuo livello" text="Da 5 test semplici l’app calcola da quante ripetizioni partire." />
          <Choice
            active={mode === 'guided'}
            onClick={() => setMode('guided')}
            title="Faccio i test guidati adesso"
            badge="consigliato"
            text="Circa 15 minuti: piegamenti, squat, plank, burpees e crunch, con timer e recuperi. Si fanno appena finita la configurazione."
          />
          <Choice
            active={mode === 'known'}
            onClick={() => setMode('known')}
            title="Conosco già i miei numeri"
            text="Inserisci i risultati di un test recente."
          />
          {mode === 'known' && (
            <Card>
              {TESTS.map((t) => (
                <NumberField
                  key={t.id}
                  label={t.name}
                  value={tests[t.id]}
                  onChange={(v) => setTests((prev) => ({ ...prev, [t.id]: v }))}
                  suffix={t.unit}
                  placeholder="0"
                />
              ))}
            </Card>
          )}
          {nav(testsValid)}
        </>
      )}

      {step === 'start' && (
        <>
          <StepHeader n={idx + 1} total={steps.length} title="Quando inizi?" />
          <Card>
            <input
              type="date"
              value={programStart}
              onChange={(e) => e.target.value && setStart(e.target.value)}
              className="w-full rounded-xl border border-line bg-bg px-3 py-3 text-lg"
            />
            <p className="mt-2 text-sm text-slate-400">
              Settimana 1 da {formatLong(programStart)}. Lunedì A, martedì B, mercoledì C, giovedì A, venerdì B, sabato C, domenica riposo.
            </p>
          </Card>
          <Button variant="primary" big disabled={saving} onClick={submit}>
            {mode === 'guided' ? 'Crea e inizia i test' : restart ? 'Ricomincia da qui' : 'Crea il mio programma'}
          </Button>
          <Button variant="ghost" onClick={back}>
            ◀ Indietro
          </Button>
        </>
      )}
    </main>
  );
}

function Choice({ active, onClick, title, text, badge }: { active: boolean; onClick: () => void; title: string; text: string; badge?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-2xl border-2 p-4 text-left ${active ? 'border-accent bg-accent/10' : 'border-line bg-card'}`}
    >
      <span className="flex items-center gap-2 text-lg font-semibold">
        <span className={`h-5 w-5 rounded-full border-2 ${active ? 'border-accent bg-accent' : 'border-slate-500'}`} />
        {title}
        {badge && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">{badge}</span>}
      </span>
      <span className="mt-1 block text-slate-400">{text}</span>
    </button>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = JSON.parse(await readFileAsText(file)) as BackupData;
      await repo.importAll(data); // l'app si apre da sola appena i dati sono salvati
    } catch (e) {
      setMsg(`Backup non valido: ${(e as Error).message}`);
    }
  };

  return (
    <>
      <header className="pt-6 text-center">
        <div className="text-6xl">💪</div>
        <h1 className="mt-3 text-3xl font-bold">Benvenuto</h1>
        <p className="mt-2 text-lg text-slate-300">15 minuti al giorno, 6 giorni su 7, in camera, con pochi attrezzi.</p>
      </header>
      <Card>
        <ul className="flex flex-col gap-2 text-slate-300">
          <li>🏋️ Allenamento guidato con timer e voce</li>
          <li>📈 Progressione automatica, sempre col motivo</li>
          <li>📴 Funziona anche offline</li>
          <li>🔒 I tuoi dati restano solo su questo telefono</li>
        </ul>
      </Card>
      <Button variant="primary" big onClick={onStart}>
        Configura il mio programma
      </Button>
      <Button variant="ghost" onClick={() => fileRef.current?.click()}>
        Ho già un backup: ripristina
      </Button>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => restore(e.target.files?.[0])} />
      {msg && <p className="text-center text-sm text-red-400">{msg}</p>}
    </>
  );
}
