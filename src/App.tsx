import { lazy, Suspense, useEffect, useState } from 'react';
import type { TodayView } from './app/trainer';
import { useAppData } from './app/useAppData';
import { todayISO } from './domain/dates';
import { Onboarding } from './features/onboarding/Onboarding';
import { Settings } from './features/settings/Settings';
import { TestRunner } from './features/tests/TestRunner';
import { Today } from './features/today/Today';
import { unlockMedia, WorkoutPlayer } from './features/workout/WorkoutPlayer';
import { requestPersistentStorage } from './storage';

// I grafici (Recharts) pesano: si caricano solo quando apri Progressi (restano comunque in cache offline).
const Progress = lazy(() => import('./features/progress/Progress').then((m) => ({ default: m.Progress })));

type Tab = 'today' | 'progress' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Oggi', icon: '🏋️' },
  { id: 'progress', label: 'Progressi', icon: '📈' },
  { id: 'settings', label: 'Impostazioni', icon: '⚙️' },
];

export default function App() {
  const data = useAppData();
  const [tab, setTab] = useState<Tab>('today');
  const [active, setActive] = useState<{ view: TodayView; date: string } | null>(null);
  const [testing, setTesting] = useState<string | null>(null); // data del test in corso
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    void requestPersistentStorage();
  }, []);

  const startTest = () => {
    unlockMedia();
    setTesting(todayISO());
  };

  if (data === undefined) return <div className="flex h-full items-center justify-center text-slate-500">Caricamento…</div>;
  if (data === null) return <Onboarding onStartTests={startTest} />;

  if (restarting) return <Onboarding restart={data} onDone={() => setRestarting(false)} onStartTests={startTest} />;
  if (testing) return <TestRunner data={data} date={testing} onClose={() => setTesting(null)} />;
  if (active?.view.workout) {
    return <WorkoutPlayer data={data} date={active.date} workout={active.view.workout} onClose={() => setActive(null)} />;
  }

  return (
    <div className="flex min-h-full flex-col">
      <main className="safe-top mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-4">
        {tab === 'today' && (
          <Today
            data={data}
            onStart={(view) => {
              unlockMedia(); // iOS: audio e voce si sbloccano solo dentro un tocco
              setActive({ view, date: todayISO() });
            }}
            onStartTest={startTest}
          />
        )}
        {tab === 'progress' && (
          <Suspense fallback={<p className="pt-6 text-slate-500">Caricamento…</p>}>
            <Progress data={data} />
          </Suspense>
        )}
        {tab === 'settings' && <Settings data={data} onStartTest={startTest} onRestart={() => setRestarting(true)} />}
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-0.5 py-3 text-sm ${tab === t.id ? 'text-accent' : 'text-slate-400'}`}
            >
              <span className="text-2xl">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
