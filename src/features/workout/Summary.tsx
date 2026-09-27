import { sessionVolume, type AppData, type FinishResult } from '../../app/trainer';
import { Button, Card } from '../../components/ui';
import { DAYS, EXERCISES } from '../../data/program';
import { formatShort } from '../../domain/dates';
import type { SessionPlan } from '../../domain/session';
import { mmss } from '../../lib/format';

function Delta({ now, before, unit }: { now: number; before: number; unit: string }) {
  const d = now - before;
  if (d === 0) return <span className="text-slate-400">= come l’ultima volta</span>;
  return (
    <span className={d > 0 ? 'text-accent' : 'text-warn'}>
      {d > 0 ? '+' : ''}
      {d} {unit} rispetto all’ultima volta
    </span>
  );
}

export function Summary({
  plan,
  result,
  onClose,
}: {
  data: AppData;
  plan: SessionPlan;
  result: FinishResult;
  onClose: () => void;
}) {
  const { session, results, previous } = result;
  const vol = sessionVolume(session);
  const prevVol = previous ? sessionVolume(previous) : null;
  const prevReps = (id: string) => previous?.sets.filter((s) => s.exerciseId === id).reduce((a, s) => a + s.done, 0);

  return (
    <div className="safe-top safe-bottom fixed inset-0 z-40 flex flex-col overflow-y-auto bg-bg">
      <div className="flex flex-col gap-4 px-4 py-6">
        <div className="text-center">
          <div className="text-6xl">{session.completed ? '🏆' : '💪'}</div>
          <h1 className="mt-2 text-3xl font-bold">{session.completed ? 'Tutto completato!' : 'Allenamento finito'}</h1>
          <p className="text-slate-400">{DAYS[plan.dayType].name}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Tempo" value={mmss(session.durationSec)} />
          <Stat label="Ripetizioni" value={String(vol.reps)} />
          <Stat label="Tenuta" value={`${vol.seconds} s`} />
        </div>

        {prevVol && previous && (
          <Card>
            <p className="text-sm text-slate-400">Confronto con {formatShort(previous.date)}</p>
            <p className="text-lg">
              <Delta now={vol.reps} before={prevVol.reps} unit="ripetizioni" />
            </p>
            {vol.seconds + prevVol.seconds > 0 && (
              <p className="text-lg">
                <Delta now={vol.seconds} before={prevVol.seconds} unit="s di tenuta" />
              </p>
            )}
            <p className="text-slate-400">Tempo: {mmss(previous.durationSec)} → {mmss(session.durationSec)}</p>
          </Card>
        )}
        {!previous && (
          <Card>
            <p className="text-slate-400">Prima sessione di questo tipo: la prossima volta vedrai il confronto.</p>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          {results.map((r) => {
            const def = EXERCISES[r.exerciseId];
            const before = prevReps(r.exerciseId);
            return (
              <Card key={r.exerciseId}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">
                    {r.completed ? '✅' : '⚠️'} {def.name}
                  </span>
                  <span className="tabular-nums text-slate-300">
                    {r.reps} {def.metric === 'seconds' ? 's' : 'rip'}
                    {before !== undefined && before !== r.reps && (
                      <span className={r.reps > before ? 'text-accent' : 'text-warn'}>
                        {' '}
                        ({r.reps > before ? '+' : ''}
                        {r.reps - before})
                      </span>
                    )}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">Prossima volta: {r.next}</p>
              </Card>
            );
          })}
        </div>

        <Button variant="primary" big onClick={onClose}>
          Chiudi
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3 text-center">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
