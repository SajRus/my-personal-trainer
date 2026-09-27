import { useState } from 'react';
import { setupProgram } from '../../app/trainer';
import { Button, Card } from '../../components/ui';
import { INITIAL_PROFILE, TESTS } from '../../data/program';
import { formatLong, nearestMonday, todayISO } from '../../domain/dates';
import type { TestValues } from '../../domain/types';
import type { AppData } from '../../app/trainer';
import { repo } from '../../storage';

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-2">
      <span className="text-lg">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(parseFloat(e.target.value.replace(',', '.')))}
          className="w-24 rounded-xl border border-line bg-bg px-3 py-2 text-right text-xl"
        />
        {suffix && <span className="w-16 text-sm text-slate-400">{suffix}</span>}
      </span>
    </label>
  );
}

/**
 * Primo avvio, oppure "Ricomincia il programma" (restart): nuovi test e nuova data di inizio,
 * mantenendo storico, attrezzatura e impostazioni.
 */
export function Onboarding({ restart, onDone }: { restart?: AppData; onDone?: () => void } = {}) {
  const today = todayISO();
  const lastTest = restart?.tests[restart.tests.length - 1]?.values;
  const lastWeight = restart?.bodyWeight[restart.bodyWeight.length - 1]?.kg;
  const [heightCm, setHeight] = useState(restart?.profile.heightCm ?? INITIAL_PROFILE.heightCm);
  const [weightKg, setWeight] = useState(lastWeight ?? INITIAL_PROFILE.weightKg);
  const [tests, setTests] = useState<TestValues>({ ...(lastTest ?? INITIAL_PROFILE.tests) });
  const [programStart, setStart] = useState(nearestMonday(today));
  const [saving, setSaving] = useState(false);

  const valid = heightCm > 0 && weightKg > 0 && Object.values(tests).every((v) => Number.isFinite(v) && v >= 0);

  const submit = async () => {
    setSaving(true);
    await setupProgram(repo, { today, programStart, heightCm, weightKg, tests });
    onDone?.();
  };

  return (
    <main className="safe-top safe-bottom mx-auto flex max-w-md flex-col gap-5 px-4 py-6">
      <header>
        <h1 className="text-3xl font-bold">{restart ? 'Ricomincia il programma' : 'Benvenuto 💪'}</h1>
        <p className="mt-1 text-slate-400">
          {restart
            ? 'Nuovi test e nuova data di inizio: i target ripartono da qui. Storico, attrezzatura e impostazioni restano.'
            : '15 minuti al giorno, 6 giorni su 7, in camera. Controlla i tuoi dati e partiamo.'}
        </p>
      </header>

      <Card>
        <h2 className="mb-1 font-semibold text-slate-300">Profilo</h2>
        <NumberField label="Altezza" value={heightCm} onChange={setHeight} suffix="cm" />
        <NumberField label="Peso" value={weightKg} onChange={setWeight} step={0.1} suffix="kg" />
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold text-slate-300">Test iniziali</h2>
        <p className="mb-2 text-sm text-slate-400">Da questi numeri l’app calcola le serie di partenza.</p>
        {TESTS.map((t) => (
          <NumberField
            key={t.id}
            label={t.name}
            value={tests[t.id]}
            onChange={(v) => setTests((prev) => ({ ...prev, [t.id]: v }))}
            suffix={t.unit}
          />
        ))}
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold text-slate-300">Inizio del programma</h2>
        <input
          type="date"
          value={programStart}
          onChange={(e) => e.target.value && setStart(e.target.value)}
          className="w-full rounded-xl border border-line bg-bg px-3 py-3 text-lg"
        />
        <p className="mt-2 text-sm text-slate-400">
          Settimana 1 da {formatLong(programStart)}. Lunedì A, martedì B, mercoledì C, giovedì A, venerdì B, sabato C,
          domenica riposo.
        </p>
      </Card>

      <Button variant="primary" big disabled={!valid || saving} onClick={submit}>
        {restart ? 'Ricomincia da qui' : 'Crea il mio programma'}
      </Button>
      {onDone && (
        <Button variant="ghost" onClick={onDone}>
          Annulla
        </Button>
      )}
    </main>
  );
}
