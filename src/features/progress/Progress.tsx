import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AppData } from '../../app/trainer';
import { BodyMap } from '../../components/BodyMap';
import { Button, Chip, Stepper } from '../../components/ui';
import { EXERCISES, MUSCLE_LABEL, MUSCLE_MACRO, MUSCLES, TESTS, type MacroGroup } from '../../data/program';
import { addDays, formatShort, mondayOf, todayISO, weekdayMon0 } from '../../domain/dates';
import { programDay } from '../../domain/schedule';
import { activeDays, muscleSets, streak, weeklySets } from '../../domain/stats';
import type { ChangeLog, ISODate, MuscleGroup } from '../../domain/types';
import { repo } from '../../storage';
import { axisProps, CHART, ChartSection, ChartTooltip, Empty, Legend } from './charts';

export function Progress({ data }: { data: AppData }) {
  const today = todayISO();
  const appTests = data.tests;
  const done = useMemo(
    () => activeDays(data.sessions, data.tests.filter((t) => t.source === 'app').map((t) => t.date), data.activeRest),
    [data],
  );
  const currentStreak = streak(data.profile.programStart, done, today);
  const lastWeight = data.bodyWeight[data.bodyWeight.length - 1];

  return (
    <div className="flex flex-col gap-4 pb-4">
      <h1 className="text-3xl font-bold">Progressi</h1>

      <div className="grid grid-cols-3 gap-2">
        <Stat value={String(currentStreak)} label={currentStreak === 1 ? 'giorno di fila' : 'giorni di fila'} />
        <Stat value={String(data.sessions.length)} label="allenamenti" />
        <Stat value={lastWeight ? String(lastWeight.kg).replace('.', ',') : '—'} label="kg" />
      </div>

      <Calendar data={data} done={done} today={today} />
      <WeekMuscles data={data} today={today} />
      <TestCharts tests={appTests} />
      <VolumeChart data={data} />
      <WeightChart data={data} today={today} />
      <LoadHistory data={data} />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3 text-center">
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

// ---------------------------------------------------------------- calendario

const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

function Calendar({ data, done, today }: { data: AppData; done: Set<ISODate>; today: ISODate }) {
  const [month, setMonth] = useState(today.slice(0, 7)); // "2026-09"
  const first = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const gridStart = mondayOf(first);
  const cells = Math.ceil((weekdayMon0(first) + daysInMonth) / 7) * 7;
  const shift = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label="Mese precedente" className="h-10 w-10 rounded-full bg-line" onClick={() => shift(-1)}>
          ◀
        </button>
        <h2 className="text-lg font-semibold">
          {MONTHS[m - 1]} {y}
        </h2>
        <button type="button" aria-label="Mese successivo" className="h-10 w-10 rounded-full bg-line" onClick={() => shift(1)}>
          ▶
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((l, i) => (
          <div key={i} className="text-xs text-slate-500">
            {l}
          </div>
        ))}
        {Array.from({ length: cells }, (_, i) => {
          const date = addDays(gridStart, i);
          const inMonth = date.startsWith(month);
          const d = programDay(data.profile.programStart, date);
          const isDone = done.has(date);
          const missed = !isDone && date < today && !d.notStarted && d.dayType !== 'rest';
          const letter = d.notStarted ? '' : d.dayType === 'rest' ? 'R' : d.dayType === 'test' ? 'T' : d.dayType;
          return (
            <div
              key={date}
              title={isDone ? 'fatto' : missed ? 'saltato' : ''}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm ${
                !inMonth ? 'opacity-25' : ''
              } ${isDone ? 'bg-accent font-semibold text-black' : missed ? 'bg-line/60 text-slate-500' : 'text-slate-300'} ${
                date === today ? 'ring-2 ring-slate-100' : ''
              }`}
            >
              <span>{Number(date.slice(8))}</span>
              <span className={`text-[10px] leading-none ${isDone ? 'text-black/70' : 'text-slate-500'}`}>
                {isDone ? '✓' : letter}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-accent" /> fatto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-line" /> saltato
        </span>
        <span>A/B/C allenamento · T test · R riposo</span>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- muscoli della settimana

/** Scala sequenziale a una tinta (blu), validata sul fondo scuro: più chiaro = più serie. */
const RAMP = [
  { min: 0.5, color: '#184f95', label: '1–3' },
  { min: 3.5, color: '#256abf', label: '4–6' },
  { min: 6.5, color: '#3987e5', label: '7–10' },
  { min: 10.5, color: '#86b6ef', label: '11+' },
];

function rampColor(v: number): string | null {
  let c: string | null = null;
  for (const r of RAMP) if (v >= r.min) c = r.color;
  return c;
}

function WeekMuscles({ data, today }: { data: AppData; today: ISODate }) {
  const [monday, setMonday] = useState(mondayOf(today));
  const sets = muscleSets(data.sessions, monday);
  const fmt = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');
  const total = MUSCLES.reduce((a, m) => a + sets[m], 0);
  const sorted = [...MUSCLES].sort((a, b) => sets[b] - sets[a]);

  return (
    <ChartSection
      title="Muscoli della settimana"
      subtitle="Serie per muscolo: principali 1, secondari ½"
      table={{ head: ['Muscolo', 'Serie'], rows: sorted.map((m) => [MUSCLE_LABEL[m], fmt(sets[m])]) }}
    >
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Settimana precedente" className="h-10 w-10 rounded-full bg-line" onClick={() => setMonday(addDays(monday, -7))}>
          ◀
        </button>
        <span className="text-slate-200">
          {monday === mondayOf(today) ? 'Questa settimana' : `Settimana dal ${formatShort(monday)}`}
        </span>
        <button
          type="button"
          aria-label="Settimana successiva"
          disabled={monday >= mondayOf(today)}
          className="h-10 w-10 rounded-full bg-line disabled:opacity-30"
          onClick={() => setMonday(addDays(monday, 7))}
        >
          ▶
        </button>
      </div>
      {total === 0 ? (
        <Empty text="Nessun allenamento in questa settimana." />
      ) : (
        <>
          <BodyMap colorOf={(m: MuscleGroup) => rampColor(sets[m])} describe={(m) => `${fmt(sets[m])} serie`} />
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>Serie:</span>
            {RAMP.map((r) => (
              <span key={r.label} className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-sm" style={{ background: r.color }} />
                {r.label}
              </span>
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {sorted
              .filter((m) => sets[m] > 0)
              .map((m) => (
                <li key={m} className="flex justify-between">
                  <span className="text-slate-300">{MUSCLE_LABEL[m]}</span>
                  <span className="tabular-nums text-slate-100">{fmt(sets[m])}</span>
                </li>
              ))}
          </ul>
          {sorted.some((m) => sets[m] === 0) && (
            <p className="mt-2 text-xs text-slate-500">
              Non allenati: {sorted.filter((m) => sets[m] === 0).map((m) => MUSCLE_LABEL[m].toLowerCase()).join(', ')}
            </p>
          )}
        </>
      )}
    </ChartSection>
  );
}

// ---------------------------------------------------------------- test

function TestCharts({ tests }: { tests: AppData['tests'] }) {
  const rows = tests.map((t) => ({ date: t.date, ...t.values }));
  return (
    <ChartSection
      title="Test"
      subtitle="Un grafico per test: unità diverse, scale diverse"
      table={{ head: ['Data', ...TESTS.map((t) => t.name)], rows: rows.map((r) => [formatShort(r.date), ...TESTS.map((t) => r[t.id])]) }}
    >
      {rows.length === 0 ? (
        <Empty text="Nessun test ancora." />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {TESTS.map((t) => {
            const lastV = rows[rows.length - 1][t.id];
            const firstV = rows[0][t.id];
            return (
              <div key={t.id}>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-medium text-slate-200">
                    {t.name} <span className="text-sm text-slate-500">({t.unit})</span>
                  </h3>
                  <span className="tabular-nums text-slate-100">
                    <span className="text-xl font-bold">{lastV}</span>
                    {rows.length > 1 && lastV !== firstV && (
                      <span className="ml-1.5 text-sm text-slate-400">
                        {lastV > firstV ? '+' : ''}
                        {lastV - firstV} dall’inizio
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke={CHART.grid} vertical={false} />
                      <XAxis dataKey="date" tickFormatter={formatShort} {...axisProps} />
                      <YAxis allowDecimals={false} domain={['auto', 'auto']} width={32} {...axisProps} />
                      <Tooltip
                        content={<ChartTooltip unit={t.unit} labelFormat={(l) => formatShort(String(l))} />}
                        cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }}
                      />
                      <Line
                        type="monotone"
                        dataKey={t.id}
                        name={t.name}
                        stroke={CHART.series[0]}
                        strokeWidth={2}
                        dot={{ r: 4, fill: CHART.series[0], stroke: CHART.surface, strokeWidth: 2 }}
                        activeDot={{ r: 6, stroke: CHART.surface, strokeWidth: 2 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ChartSection>
  );
}

// ---------------------------------------------------------------- volume

const GROUPS = Object.keys(MUSCLE_MACRO) as MacroGroup[];

function VolumeChart({ data }: { data: AppData }) {
  const rows = weeklySets(data.sessions, data.profile.programStart).slice(-12);
  return (
    <ChartSection
      title="Volume settimanale"
      subtitle="Serie svolte per gruppo muscolare"
      table={{
        head: ['Sett.', ...GROUPS.map((g) => MUSCLE_MACRO[g].label), 'Totale'],
        rows: rows.map((r) => [r.week, ...GROUPS.map((g) => r[g]), GROUPS.reduce((a, g) => a + r[g], 0)]),
      }}
    >
      {rows.length === 0 ? (
        <Empty text="Nessun allenamento ancora." />
      ) : (
        <>
          <Legend items={GROUPS.map((g, i) => ({ label: MUSCLE_MACRO[g].label, color: CHART.series[i] }))} />
          <div className="mt-2 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="25%">
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="week" tickFormatter={(w) => `S${w}`} {...axisProps} />
                <YAxis allowDecimals={false} width={32} {...axisProps} />
                <Tooltip content={<ChartTooltip unit="serie" labelFormat={(l) => `Settimana ${l}`} />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                {GROUPS.map((g, i) => (
                  <Bar
                    key={g}
                    dataKey={g}
                    name={MUSCLE_MACRO[g].label}
                    stackId="v"
                    fill={CHART.series[i]}
                    stroke={CHART.surface}
                    strokeWidth={2}
                    radius={i === GROUPS.length - 1 ? [4, 4, 0, 0] : 0}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </ChartSection>
  );
}

// ---------------------------------------------------------------- peso

function WeightChart({ data, today }: { data: AppData; today: ISODate }) {
  const last = data.bodyWeight[data.bodyWeight.length - 1];
  const todayEntry = data.bodyWeight.find((b) => b.date === today);
  const [kg, setKg] = useState(todayEntry?.kg ?? last?.kg ?? 80);
  const rows = data.bodyWeight;
  const delta = rows.length > 1 ? Math.round((rows[rows.length - 1].kg - rows[0].kg) * 10) / 10 : 0;

  return (
    <ChartSection
      title="Peso corporeo"
      subtitle={rows.length > 1 ? `${delta > 0 ? '+' : ''}${delta} kg dall’inizio` : undefined}
      table={{ head: ['Data', 'kg'], rows: [...rows].reverse().map((r) => [formatShort(r.date), r.kg]) }}
    >
      {rows.length > 0 && (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatShort} {...axisProps} />
              <YAxis
                domain={[Math.floor(Math.min(...rows.map((r) => r.kg)) - 1), Math.ceil(Math.max(...rows.map((r) => r.kg)) + 1)]}
                allowDecimals={false}
                width={32}
                {...axisProps}
              />
              <Tooltip content={<ChartTooltip unit="kg" labelFormat={(l) => formatShort(String(l))} />} cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }} />
              <Line
                type="monotone"
                dataKey="kg"
                name="Peso"
                stroke={CHART.series[0]}
                strokeWidth={2}
                dot={{ r: 4, fill: CHART.series[0], stroke: CHART.surface, strokeWidth: 2 }}
                activeDot={{ r: 6, stroke: CHART.surface, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-4 border-t border-line pt-4">
        <p className="mb-2 text-center text-sm text-slate-400">Peso di oggi</p>
        <Stepper value={Math.round(kg * 10) / 10} onChange={(v) => setKg(Math.round(v * 10) / 10)} step={0.1} unit="kg" />
        <Button variant="primary" className="mt-3 w-full" onClick={() => repo.saveBodyWeight({ date: today, kg })}>
          {todayEntry ? 'Aggiorna il peso di oggi' : 'Salva il peso di oggi'}
        </Button>
      </div>
    </ChartSection>
  );
}

// ---------------------------------------------------------------- storico carichi

const KIND_ICON: Record<ChangeLog['kind'], string> = {
  start: '•',
  increase: '⬆',
  decrease: '⬇',
  load: '🔁',
  variant: '⭐',
  test: '📊',
  hold: '⏸',
  repeat: '=',
};

function LoadHistory({ data }: { data: AppData }) {
  const ids = Object.keys(EXERCISES);
  const [id, setId] = useState(ids[0]);
  const [showRepeats, setShowRepeats] = useState(false);
  const state = data.states[id];
  const ex = EXERCISES[id];
  const history = [...(state?.history ?? [])].reverse().filter((h) => showRepeats || h.kind !== 'repeat');
  const load = (lid: string | null) => data.equipment.find((e) => e.id === lid);
  const unit = ex.metric === 'seconds' ? ' s' : '';

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="text-lg font-semibold">Storico carichi ed elastici</h2>
      <p className="mb-3 text-sm text-slate-400">Ogni cambio di ripetizioni, elastico o variante, col motivo</p>
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {ids.map((x) => (
          <Chip key={x} active={x === id} onClick={() => setId(x)}>
            <span className="whitespace-nowrap">{EXERCISES[x].name}</span>
          </Chip>
        ))}
      </div>
      {state && (
        <p className="mb-3 text-slate-200">
          Ora: <span className="font-semibold">{ex.variants[state.variantIndex]?.name}</span> · {state.target}
          {unit}
          {load(state.loadId) && ` · ${load(state.loadId)!.name}`}
        </p>
      )}
      <ol className="flex flex-col gap-3 border-l border-line pl-4">
        {history.map((h, i) => {
          const l = load(h.to.loadId);
          return (
            <li key={i} className="relative">
              <span className="absolute -left-[1.6rem] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-bg text-xs">
                {KIND_ICON[h.kind]}
              </span>
              <div className="text-sm text-slate-400">{formatShort(h.date)}</div>
              <div className="text-slate-100">
                {ex.variants[h.to.variantIndex]?.name} · {h.to.target}
                {unit}
                {l && (
                  <span className="ml-1.5 inline-flex items-center gap-1 text-slate-300">
                    {l.color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />}
                    {l.name}
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-400">{h.reason}</div>
            </li>
          );
        })}
      </ol>
      <button type="button" className="mt-3 text-sm text-slate-400 underline" onClick={() => setShowRepeats((v) => !v)}>
        {showRepeats ? 'Nascondi le sessioni senza cambi' : 'Mostra anche le sessioni senza cambi'}
      </button>
    </section>
  );
}
