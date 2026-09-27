import { useRef, useState, type TouchEvent } from 'react';
import { dayView, sessionVolume, type AppData, type DayView, type TodayView } from '../../app/trainer';
import { ExerciseInfo, infoFromExercise, type InfoItem } from '../../components/ExerciseInfo';
import { MuscleSummary } from '../../components/BodyMap';
import { ExerciseImage } from '../../components/ExerciseImage';
import { musclesOf } from '../../domain/stats';
import { Badge, Button, Card, Sheet } from '../../components/ui';
import { ACTIVE_REST, DAYS, EQUIPMENT_KIND_LABEL, EXERCISES, RULES, TESTS } from '../../data/program';
import { addDays, formatLong, mondayOf, todayISO } from '../../domain/dates';
import { DAY_TYPE_LABEL, programDay } from '../../domain/schedule';
import type { PlannedExercise } from '../../domain/session';
import type { ISODate, SessionLog } from '../../domain/types';
import { minutes, mmss, targetLabel } from '../../lib/format';
import { repo } from '../../storage';

export function Today({
  data,
  onStart,
  onStartTest,
}: {
  data: AppData;
  onStart: (view: TodayView) => void;
  onStartTest: () => void;
}) {
  const today = todayISO();
  const [date, setDate] = useState<ISODate>(today);
  const [info, setInfo] = useState<InfoItem | null>(null);
  const view = dayView(data, date, today);
  const { day } = view;

  // swipe orizzontale per cambiare giorno
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY });
  const onTouchEnd = (e: TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 50) setDate((d) => addDays(d, dx < 0 ? 1 : -1));
  };

  return (
    <div className="flex flex-col gap-4 pb-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="flex items-center justify-between gap-2">
        <button type="button" aria-label="Giorno precedente" className="h-12 w-12 shrink-0 rounded-full bg-line text-xl" onClick={() => setDate(addDays(date, -1))}>
          ◀
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-lg font-semibold capitalize">{date === today ? 'Oggi' : formatLong(date)}</p>
          <p className="text-sm text-slate-400">
            {date === today ? formatLong(date) : ''}
            {!day.notStarted && `${date === today ? ' · ' : ''}Settimana ${day.week} di ${RULES.programWeeks}`}
            {day.cycle > 1 && ` · ciclo ${day.cycle}`}
          </p>
        </div>
        <button type="button" aria-label="Giorno successivo" className="h-12 w-12 shrink-0 rounded-full bg-line text-xl" onClick={() => setDate(addDays(date, 1))}>
          ▶
        </button>
      </header>

      <WeekStrip data={data} today={today} selected={date} onSelect={setDate} />

      {date !== today && (
        <button type="button" onClick={() => setDate(today)} className="-mt-2 self-center rounded-full bg-accent/15 px-4 py-1.5 text-accent">
          ↩ Torna a oggi
        </button>
      )}

      {data.tests.length === 0 && (
        <Card className="border-warn/50">
          <p className="text-lg font-semibold text-warn">Target provvisori</p>
          <p className="mt-1 text-slate-300">Non hai ancora fatto i 5 test: i numeri sono stime da principiante. Con i test l’app li adatta a te.</p>
          <Button variant="primary" className="mt-3 w-full" onClick={onStartTest}>
            📊 Fai i test adesso
          </Button>
        </Card>
      )}

      {day.notStarted && (
        <Card>
          <p className="text-2xl font-semibold">Si parte {formatLong(data.profile.programStart)}</p>
          <p className="mt-1 text-slate-400">Il programma non è ancora iniziato. Vai avanti coi giorni per vedere cosa ti aspetta.</p>
        </Card>
      )}

      {view.sessions.map((s) => (
        <DoneSession key={s.id} session={s} data={data} />
      ))}

      {view.workout && (
        <WorkoutPreview view={view} data={data} onInfo={setInfo} onStart={() => onStart(view)} />
      )}

      {day.dayType === 'rest' && !day.notStarted && <RestDay date={date} done={view.activeRestDone} />}

      {day.dayType === 'test' && <TestDay view={view} onStartTest={onStartTest} />}

      <Sheet open={!!info} onClose={() => setInfo(null)}>
        {info && <ExerciseInfo item={info} />}
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------- allenamento (piano)

function WorkoutPreview({
  view,
  data,
  onInfo,
  onStart,
}: {
  view: DayView;
  data: AppData;
  onInfo: (i: InfoItem) => void;
  onStart: () => void;
}) {
  const w = view.workout!;
  const done = view.sessions.length > 0;
  return (
    <>
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">{DAYS[w.dayType].name}</h1>
            <p className="text-slate-400">{DAYS[w.dayType].focus}</p>
          </div>
          <Badge tone="accent">≈ {minutes(w.estimatedSec)}</Badge>
        </div>
        {view.day.deload && <p className="mt-3 rounded-xl bg-rest/10 p-3 text-rest">Settimana di scarico: volume ridotto del 40%.</p>}
        {view.when === 'future' && (
          <p className="mt-3 rounded-xl bg-line p-3 text-slate-300">
            Anteprima: i target sono stimati supponendo che tu completi le sessioni precedenti.
          </p>
        )}
        {view.when === 'past' && !done && <p className="mt-3 rounded-xl bg-warn/10 p-3 text-warn">Allenamento non registrato.</p>}
        {view.when === 'today' && done && <p className="mt-3 rounded-xl bg-accent/10 p-3 text-accent">✓ Allenamento di oggi completato</p>}
      </Card>

      {!(view.when === 'past' && done) && (
        <>
          <div className="flex flex-col gap-3">
            {w.plan.blocks.map((b) => (
              <Card key={b.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>{b.exercises.length > 1 ? 'Superserie' : 'Esercizio'}</span>
                  <span>
                    {b.sets} serie · recupero {b.restSec} s
                  </span>
                </div>
                {b.exercises.map((ex) => (
                  <ExerciseRow
                    key={ex.def.id}
                    ex={ex}
                    sets={b.sets}
                    data={data}
                    reason={view.when === 'past' ? undefined : w.prepared[ex.def.id].lastChange?.reason}
                    onInfo={() => onInfo(infoFromExercise(ex.def, ex.variant))}
                  />
                ))}
              </Card>
            ))}
          </div>

          <Card>
            <h2 className="mb-2 font-semibold text-slate-300">Muscoli {view.when === 'today' ? 'di oggi' : 'del giorno'}</h2>
            <MuscleSummary map={musclesOf(w.plan.blocks.flatMap((b) => b.exercises.map((e) => e.def)))} />
          </Card>

          <Card>
            <h2 className="mb-2 font-semibold text-slate-300">Da preparare</h2>
            <ul className="flex flex-col gap-1.5">
              {w.gear.map((g) => (
                <li key={g.kind} className="flex flex-wrap items-center gap-2">
                  <span>{EQUIPMENT_KIND_LABEL[g.kind]}</span>
                  {!data.equipment.some((e) => e.kind === g.kind) && (
                    <span className="rounded-full bg-warn/15 px-2 py-0.5 text-xs text-warn">non ce l’hai: aggiungilo in Impostazioni o improvvisa</span>
                  )}
                  {g.items.map((it) => (
                    <span key={it.id} className="flex items-center gap-1 text-sm text-slate-400">
                      {it.color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />}
                      {it.name}
                    </span>
                  ))}
                  {g.anchors.length > 0 && <span className="text-sm text-rest">ancoraggio {g.anchors.join(' e ')}</span>}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {view.when === 'today' && (
        <div className="sticky bottom-24 z-10">
          <Button variant="primary" big className="w-full shadow-lg shadow-black/50" onClick={onStart}>
            {done ? 'Rifai l’allenamento' : 'Inizia'}
          </Button>
        </div>
      )}
    </>
  );
}

function ExerciseRow({
  ex,
  sets,
  data,
  reason,
  onInfo,
}: {
  ex: PlannedExercise;
  sets: number;
  data: AppData;
  reason?: string;
  onInfo: () => void;
}) {
  const load = data.equipment.find((e) => e.id === ex.loadId);
  return (
    <button type="button" onClick={onInfo} className="flex items-center gap-3 text-left">
      <ExerciseImage illustration={ex.def.illustration} className="h-16 w-20 shrink-0" paused />
      <div className="min-w-0 flex-1">
        <div className="font-semibold leading-tight">{ex.variant.name}</div>
        <div className="text-lg text-accent">
          {sets} × {targetLabel(ex.target, ex.def.metric, ex.def.perSide)}
        </div>
        {load && (
          <div className="flex items-center gap-1.5 text-sm text-slate-300">
            {load.color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: load.color }} />}
            {load.name}
          </div>
        )}
        {reason && <div className="text-sm text-slate-400">{reason}</div>}
      </div>
      <span className="text-2xl text-slate-500" aria-hidden>
        ⓘ
      </span>
    </button>
  );
}

// ---------------------------------------------------------------- allenamento fatto

function DoneSession({ session, data }: { session: SessionLog; data: AppData }) {
  const vol = sessionVolume(session);
  const ids = [...new Set(session.sets.map((s) => s.exerciseId))];
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {session.completed ? '✅' : '⚠️'} {DAYS[session.dayType].name}
        </h2>
        <Badge tone={session.completed ? 'accent' : 'warn'}>{session.completed ? 'completato' : 'parziale'}</Badge>
      </div>
      <p className="text-slate-400">
        {mmss(session.durationSec)} · {vol.reps} ripetizioni{vol.seconds > 0 && ` · ${vol.seconds} s di tenuta`}
        {session.deload && ' · scarico'}
      </p>
      <ul className="flex flex-col gap-2">
        {ids.map((id) => {
          const def = EXERCISES[id];
          const sets = session.sets.filter((s) => s.exerciseId === id).sort((a, b) => a.setIndex - b.setIndex);
          const load = data.equipment.find((e) => e.id === sets[sets.length - 1]?.loadId);
          const hit = sets.every((s) => s.done >= s.target);
          return (
            <li key={id} className="flex flex-col">
              <span className="font-semibold">{def?.variants[sets[0]?.variantIndex ?? 0]?.name ?? def?.name ?? id}</span>
              <span className="text-slate-300">
                <span className={hit ? 'text-accent' : 'text-warn'}>{sets.map((s) => s.done).join(' · ')}</span>
                <span className="text-slate-500">
                  {' '}
                  / {targetLabel(sets[0]?.target ?? 0, def?.metric ?? 'reps', def?.perSide)}
                </span>
                {load && <span className="text-sm text-slate-400"> · {load.name}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------- riposo e test

function RestDay({ date, done }: { date: ISODate; done: boolean }) {
  return (
    <Card>
      <h1 className="text-2xl font-bold">{ACTIVE_REST.name}</h1>
      <p className="mt-1 text-lg text-slate-300">{ACTIVE_REST.description}</p>
      <ExerciseImage illustration="bike" className="mt-3 aspect-[4/3] w-full" />
      <Button variant={done ? 'secondary' : 'primary'} big className="mt-4 w-full" onClick={() => repo.setActiveRest(date, !done)}>
        {done ? '✓ Fatto (annulla)' : 'Segna come fatto'}
      </Button>
    </Card>
  );
}

function TestDay({ view, onStartTest }: { view: DayView; onStartTest: () => void }) {
  const t = view.test;
  return (
    <Card>
      <h1 className="text-2xl font-bold">Giorno di test {view.day.test === 'final' ? 'finale' : 'intermedio'}</h1>
      {t ? (
        <ul className="mt-2 flex flex-col gap-1 text-lg">
          {TESTS.map((d) => (
            <li key={d.id} className="flex justify-between">
              <span>{d.name}</span>
              <span className="font-semibold tabular-nums">
                {t.values[d.id]} <span className="text-sm text-slate-400">{d.unit}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p className="mt-1 text-slate-400">5 test in sequenza con 3 minuti di recupero. Dopo, i target vengono ricalcolati.</p>
          <ul className="mt-2 list-inside list-disc text-lg">
            {TESTS.map((d) => (
              <li key={d.id}>
                {d.name} <span className="text-slate-400">({d.unit})</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {view.when === 'today' && (
        <Button variant="primary" big className="mt-4 w-full" onClick={onStartTest}>
          {t ? 'Rifai i test' : 'Inizia i test'}
        </Button>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- settimana

/** Striscia della settimana del giorno selezionato: tocca un giorno per vederlo. */
function WeekStrip({
  data,
  today,
  selected,
  onSelect,
}: {
  data: AppData;
  today: ISODate;
  selected: ISODate;
  onSelect: (d: ISODate) => void;
}) {
  const monday = mondayOf(selected);
  const done = new Set([...data.sessions.map((s) => s.date), ...data.activeRest, ...data.tests.filter((t) => t.source === 'app').map((t) => t.date)]);
  const letters = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {letters.map((l, i) => {
        const date = addDays(monday, i);
        const d = programDay(data.profile.programStart, date);
        const label = d.notStarted ? '·' : d.dayType === 'rest' ? 'R' : d.dayType === 'test' ? 'T' : d.dayType;
        const isSel = date === selected;
        return (
          <button
            type="button"
            key={date}
            onClick={() => onSelect(date)}
            aria-label={`${formatLong(date)}: ${DAY_TYPE_LABEL[d.dayType]}`}
            className={`flex flex-col items-center rounded-xl py-2 ${isSel ? 'bg-line' : ''} ${date === today ? 'ring-1 ring-accent' : ''}`}
          >
            <span className="text-xs text-slate-500">{l}</span>
            <span className={`text-lg font-semibold ${date < today && !done.has(date) && d.dayType !== 'rest' && !d.notStarted ? 'text-slate-500' : ''}`}>
              {label}
            </span>
            <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${done.has(date) ? 'bg-accent' : 'bg-transparent'}`} />
          </button>
        );
      })}
    </div>
  );
}
