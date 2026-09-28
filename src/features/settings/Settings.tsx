import { useEffect, useRef, useState, type ReactNode } from 'react';
import { saveProfileFields, saveSettings, type AppData } from '../../app/trainer';
import { Button, Card, NumberRow, Sheet, Toggle } from '../../components/ui';
import { MEDIA } from '../../data/media';
import { EQUIPMENT_KIND_LABEL, EQUIPMENT_PRESETS, EXERCISES, SEX_LABEL, WEIGHT_KINDS } from '../../data/program';
import { todayISO } from '../../domain/dates';
import type { BackupData, Equipment, EquipmentKind, MusicSetting, Sex } from '../../domain/types';
import { unlockAudio } from '../../lib/audio';
import { music } from '../../lib/music';
import { prepareAudioSession } from '../../lib/useWorkoutMusic';
import { markExported } from '../../lib/backupReminder';
import { readFileAsText, shareOrDownload } from '../../lib/files';
import { migrateBackup } from '../../storage/migrate';
import type { SnapshotMeta } from '../../storage/repository';
import { buildReminderIcs } from '../../lib/ics';
import { newId } from '../../lib/id';
import { repo } from '../../storage';

const SWATCHES = ['#eab308', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ec4899', '#6b7280', '#111827', '#a3e635'];
const KIND_ORDER: EquipmentKind[] = [
  'tube-band',
  'flat-band',
  'mini-band',
  'dumbbell',
  'kettlebell',
  'pullup-bar',
  'suspension',
  'ball',
  'mat',
  'ab-wheel',
  'bike',
  'chair',
  'jump-rope',
  'foam-roller',
];
/** Tipi con livelli di durezza/carico: sono quelli che la progressione scala. */
const LEVELED: EquipmentKind[] = ['tube-band', 'flat-band', 'mini-band', 'dumbbell', 'kettlebell'];
const isWeight = (k: EquipmentKind) => WEIGHT_KINDS.includes(k);

export function Settings({ data, onStartTest, onRestart }: { data: AppData; onStartTest: () => void; onRestart: () => void }) {
  const s = data.profile.settings;
  const set = (patch: Partial<typeof s>) => saveSettings(repo, data, patch);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <h1 className="text-3xl font-bold">Impostazioni</h1>

      <Section title="Profilo">
        <p className="text-lg">Sesso</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Sesso">
          {(['F', 'M', 'X'] as Sex[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={(data.profile.sex ?? 'X') === k}
              onClick={() => saveProfileFields(repo, data, { sex: k })}
              className={`min-h-[3rem] rounded-xl border-2 px-2 text-base ${(data.profile.sex ?? 'X') === k ? 'border-accent bg-accent/15' : 'border-line'}`}
            >
              {SEX_LABEL[k]}
            </button>
          ))}
        </div>
        <NumberRow label="Altezza" value={data.profile.heightCm} unit="cm" min={100} onChange={(v) => saveProfileFields(repo, data, { heightCm: v })} />
      </Section>

      <EquipmentSection data={data} />

      <Section title="Allenamento guidato">
        <Toggle label="Guida vocale" checked={s.voice} onChange={(v) => set({ voice: v })} />
        <Toggle label="Suoni (3-2-1 e fine fase)" checked={s.sounds} onChange={(v) => set({ sounds: v })} />
        <NumberRow label="Recupero lungo" value={s.restLongSec} step={5} min={10} unit="s" onChange={(v) => set({ restLongSec: v })} />
        <NumberRow label="Recupero breve" value={s.restShortSec} step={5} min={10} unit="s" onChange={(v) => set({ restShortSec: v })} />
        <NumberRow label="Recupero tra i test" value={s.restBetweenTestsSec} step={30} min={30} unit="s" onChange={(v) => set({ restBetweenTestsSec: v })} />
        <NumberRow label="Preparazione" value={s.prepSec} step={5} min={0} unit="s" onChange={(v) => set({ prepSec: v })} />
        <p className="text-sm text-slate-400">Lungo: primo esercizio di ogni giorno (tabella: 60 s). Breve: gli altri (tabella: 45 s).</p>
      </Section>

      <MusicSection data={data} />

      <ReminderSection data={data} />

      <Section title="Test e programma">
        <Button onClick={onStartTest}>📊 Fai i 5 test adesso</Button>
        <p className="text-sm text-slate-400">Dopo i test i target vengono ricalcolati dai nuovi massimi.</p>
        <Button onClick={onRestart}>🔄 Ricomincia il programma</Button>
        <p className="text-sm text-slate-400">Nuovi test e nuova data di inizio. Storico, attrezzatura e impostazioni restano.</p>
      </Section>

      <DataSection />

      <SnapshotSection />

      <CreditsSection />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-2">
      <h2 className="mb-1 text-lg font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

// ---------------------------------------------------------------- attrezzatura

function EquipmentSection({ data }: { data: AppData }) {
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [isNew, setIsNew] = useState(false);
  const usedBy = (id: string) =>
    Object.values(data.states)
      .filter((st) => st.loadId === id)
      .map((st) => EXERCISES[st.exerciseId]?.name)
      .filter(Boolean);

  const add = (kind: EquipmentKind) => {
    const same = data.equipment.filter((e) => e.kind === kind);
    setIsNew(true);
    setEditing({
      id: `${kind}-${newId().slice(0, 8)}`,
      kind,
      name: '',
      color: LEVELED.includes(kind) && !isWeight(kind) ? SWATCHES[same.length % SWATCHES.length] : undefined,
      level: same.length ? Math.max(...same.map((e) => e.level)) + (isWeight(kind) ? 2 : 1) : isWeight(kind) ? 8 : 1,
      quantity: kind === 'dumbbell' ? 2 : kind === 'kettlebell' ? 1 : undefined,
    });
  };

  return (
    <Section title="Attrezzatura">
      <p className="text-sm text-slate-400">
        Il livello decide l’ordine di durezza: quando arrivi al massimo, l’app propone l’elastico o il peso col livello successivo.
      </p>
      {KIND_ORDER.map((kind) => {
        const items = data.equipment.filter((e) => e.kind === kind).sort((a, b) => a.level - b.level);
        const leveled = LEVELED.includes(kind);
        if (!leveled) {
          // attrezzi singoli: basta dire se ce l'hai
          return (
            <div key={kind} className="border-t border-line pt-1">
              <Toggle
                label={EQUIPMENT_KIND_LABEL[kind]}
                checked={items.length > 0}
                onChange={async (on) => {
                  if (on) await repo.saveEquipment(EQUIPMENT_PRESETS[kind]);
                  else for (const it of items) await repo.deleteEquipment(it.id);
                }}
              />
            </div>
          );
        }
        return (
          <div key={kind} className="border-t border-line pt-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-300">{EQUIPMENT_KIND_LABEL[kind]}</h3>
              {leveled && (
                <button type="button" className="rounded-full bg-line px-3 py-1 text-sm" onClick={() => add(kind)}>
                  + Aggiungi
                </button>
              )}
            </div>
            <ul className="mt-1">
              {items.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className="flex min-h-[3rem] w-full items-center gap-3 text-left"
                    onClick={() => {
                      setIsNew(false);
                      setEditing(e);
                    }}
                  >
                    {e.color ? <span className="h-5 w-5 rounded-full border border-white/20" style={{ background: e.color }} /> : <span className="w-5" />}
                    <span className="flex-1 text-lg">{e.name}</span>
                    {leveled && !isWeight(e.kind) && <span className="text-sm text-slate-400">livello {e.level}</span>}
                    <span className="text-slate-500">›</span>
                  </button>
                </li>
              ))}
              {!items.length && <li className="py-2 text-sm text-slate-500">Nessuno: aggiungine uno.</li>}
            </ul>
          </div>
        );
      })}

      <Sheet open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <EquipmentEditor
            item={editing}
            isNew={isNew}
            usedBy={usedBy(editing.id)}
            onSave={async (e) => {
              await repo.saveEquipment([e]);
              setEditing(null);
            }}
            onDelete={async () => {
              await repo.deleteEquipment(editing.id);
              setEditing(null);
            }}
          />
        )}
      </Sheet>
    </Section>
  );
}

function EquipmentEditor({
  item,
  isNew,
  usedBy,
  onSave,
  onDelete,
}: {
  item: Equipment;
  isNew: boolean;
  usedBy: string[];
  onSave: (e: Equipment) => void;
  onDelete: () => void;
}) {
  const [e, setE] = useState(item);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const leveled = LEVELED.includes(e.kind);
  const hasColor = !isWeight(e.kind) && leveled;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold">
        {isNew ? 'Nuovo' : 'Modifica'}: {EQUIPMENT_KIND_LABEL[e.kind].toLowerCase()}
      </h2>
      <label className="flex flex-col gap-1">
        <span className="text-slate-400">Nome</span>
        <input
          value={e.name}
          placeholder={e.kind === 'dumbbell' ? 'es. Manubri 3 kg' : e.kind === 'kettlebell' ? 'es. Kettlebell 12 kg' : 'es. Verde – medio'}
          onChange={(ev) => setE({ ...e, name: ev.target.value })}
          className="rounded-xl border border-line bg-card px-3 py-3 text-lg"
        />
      </label>
      {hasColor && (
        <div>
          <span className="text-slate-400">Colore</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colore ${c}`}
                onClick={() => setE({ ...e, color: c })}
                className={`h-10 w-10 rounded-full border-2 ${e.color === c ? 'border-white' : 'border-transparent'}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      )}
      {leveled && (
        <NumberRow
          label={isWeight(e.kind) ? 'Peso (kg)' : 'Livello di durezza'}
          value={e.level}
          step={isWeight(e.kind) ? 0.5 : 1}
          min={0}
          onChange={(v) => setE({ ...e, level: v })}
        />
      )}
      <Button variant="primary" disabled={!e.name.trim()} onClick={() => onSave({ ...e, name: e.name.trim() })}>
        Salva
      </Button>
      {!isNew &&
        (confirmDelete ? (
          <div className="rounded-xl border border-red-600/50 p-3">
            <p className="mb-2">
              Eliminare «{item.name}»?
              {usedBy.length > 0 && ` È in uso in: ${usedBy.join(', ')}. Alla prossima progressione verrà proposto un altro attrezzo.`}
            </p>
            <Button variant="danger" className="w-full" onClick={onDelete}>
              Sì, elimina
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            Elimina
          </Button>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------- musica

const MUSIC_OPTIONS: { id: MusicSetting; label: string; text: string }[] = [
  { id: 'energia', label: '⚡ Energia', text: '124 BPM, ritmo house: carica durante le serie.' },
  { id: 'chill', label: '🌙 Chill', text: '88 BPM, lo-fi morbido: per chi preferisce un sottofondo.' },
  { id: 'mine', label: '🎧 La mia musica', text: 'Spotify, Apple Music…: avviala prima, l’app non la ferma.' },
  { id: 'off', label: '🔇 Nessuna', text: 'Solo beep e voce.' },
];

function MusicSection({ data }: { data: AppData }) {
  const s = data.profile.settings;
  const current = s.music ?? 'energia';
  const volume = s.musicVolume ?? 50;
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => () => music.stop(0.3), []);

  const preview = () => {
    if (previewing) {
      music.stop(0.4);
      setPreviewing(false);
      return;
    }
    prepareAudioSession(s);
    unlockAudio(); // dentro il tocco: su iPhone è obbligatorio
    music.setMode('work');
    music.start(current === 'chill' ? 'chill' : 'energia', volume / 100);
    setPreviewing(true);
  };

  const choose = async (id: MusicSetting) => {
    await saveSettings(repo, data, { music: id });
    if (previewing) {
      music.stop(0.2);
      setPreviewing(false);
    }
  };

  return (
    <Section title="Musica durante l’allenamento">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Musica">
        {MUSIC_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={current === o.id}
            onClick={() => choose(o.id)}
            className={`rounded-xl border-2 p-3 text-left ${current === o.id ? 'border-accent bg-accent/15' : 'border-line'}`}
          >
            <span className="block text-base font-semibold">{o.label}</span>
            <span className="block text-xs text-slate-400">{o.text}</span>
          </button>
        ))}
      </div>
      {(current === 'energia' || current === 'chill') && (
        <>
          <NumberRow
            label="Volume"
            value={volume}
            step={10}
            min={10}
            unit="%"
            onChange={(v) => {
              const vol = Math.min(100, v);
              void saveSettings(repo, data, { musicVolume: vol });
              music.setVolume(vol / 100);
            }}
          />
          <Button onClick={preview}>{previewing ? '■ Ferma' : '▶ Ascolta'}</Button>
          <p className="text-sm text-slate-400">
            La colonna sonora è creata dall’app (funziona anche offline): segue l’allenamento, ovattata nei recuperi, e si abbassa quando
            parla la guida. Durante l’allenamento puoi zittirla col tasto 🎵.
          </p>
        </>
      )}
      {current === 'mine' && (
        <p className="text-sm text-slate-400">
          Avvia la tua musica in un’altra app, poi apri il Trainer e tocca Inizia: beep e voce si sovrappongono senza fermarla. Su iPhone la
          voce può abbassarla per un attimo.
        </p>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------- promemoria

function ReminderSection({ data }: { data: AppData }) {
  const time = data.profile.settings.reminderTime;
  const [msg, setMsg] = useState('');

  const createIcs = async () => {
    const start = todayISO() < data.profile.programStart ? data.profile.programStart : todayISO();
    const url = location.origin + import.meta.env.BASE_URL;
    const ics = buildReminderIcs({ startDate: start, time, url });
    const r = await shareOrDownload('allenamento.ics', ics, 'text/calendar');
    setMsg(
      r === 'shared'
        ? 'Scegli «Calendario» (o «Salva su File» e poi aprilo) per aggiungere l’evento.'
        : r === 'downloaded'
          ? 'File scaricato: aprilo per aggiungerlo al Calendario.'
          : '',
    );
  };

  return (
    <Section title="Promemoria">
      <label className="flex min-h-[3rem] items-center justify-between gap-3 text-lg">
        <span>Orario preferito</span>
        <input
          type="time"
          value={time}
          onChange={(e) => e.target.value && saveSettings(repo, data, { reminderTime: e.target.value })}
          className="rounded-xl border border-line bg-bg px-3 py-2 text-lg"
        />
      </label>
      <Button variant="primary" onClick={createIcs}>
        📅 Aggiungi al Calendario (.ics)
      </Button>
      {msg && <p className="text-sm text-accent">{msg}</p>}
      <p className="text-sm text-slate-400">
        Crea un evento giornaliero alle {time} con un avviso. Su iPhone le notifiche di una web app richiedono un server: il
        Calendario è l’alternativa semplice.
      </p>

      <details className="rounded-xl bg-bg p-3">
        <summary className="cursor-pointer text-lg">Aprire l’app a orario fisso (Comandi Rapidi)</summary>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-slate-300">
          <li>Apri l’app <b>Comandi Rapidi</b> e vai su <b>Automazione</b>.</li>
          <li>
            Tocca <b>+</b> (o «Nuova automazione») → <b>Ora del giorno</b>.
          </li>
          <li>
            Imposta <b>{time}</b>, ripeti <b>Ogni giorno</b> (o togli la domenica), scegli <b>Esegui subito</b> e tocca <b>Avanti</b>.
          </li>
          <li>
            Tocca <b>Nuovo comando rapido vuoto</b> → <b>Aggiungi azione</b> → cerca <b>Apri URL</b>.
          </li>
          <li>
            Come URL scrivi l’indirizzo dell’app: <code className="break-all rounded bg-card px-1">{location.origin + import.meta.env.BASE_URL}</code>
          </li>
          <li>
            In alternativa usa l’azione <b>Apri app</b> e scegli «Trainer» (l’icona sulla schermata Home).
          </li>
          <li>Tocca <b>Fine</b>. Alle {time} l’iPhone aprirà l’allenamento del giorno.</li>
        </ol>
      </details>
    </Section>
  );
}

// ---------------------------------------------------------------- dati

function DataSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pendingImport, setPendingImport] = useState<BackupData | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const exportData = async () => {
    const backup = await repo.exportAll();
    const r = await shareOrDownload(`trainer-backup-${todayISO()}.json`, JSON.stringify(backup, null, 2), 'application/json');
    if (r !== 'cancelled') {
      markExported();
      setMsg({ ok: true, text: 'Backup creato. Conservalo su File o iCloud Drive.' });
    }
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      // accetta anche backup di versioni precedenti dell'app
      setPendingImport(migrateBackup(JSON.parse(await readFileAsText(file))));
    } catch (e) {
      setMsg({ ok: false, text: `File non valido: ${(e as Error).message}` });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const doImport = async () => {
    if (!pendingImport) return;
    try {
      await repo.importAll(pendingImport);
      setMsg({ ok: true, text: 'Dati importati.' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setPendingImport(null);
  };

  return (
    <Section title="Dati e backup">
      <p className="text-sm text-slate-400">I dati restano solo su questo telefono. Fai un backup ogni tanto.</p>
      <Button onClick={exportData}>⬆️ Esporta backup (JSON)</Button>
      <Button onClick={() => fileRef.current?.click()}>⬇️ Importa backup</Button>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
      {msg && <p className={`text-sm ${msg.ok ? 'text-accent' : 'text-red-400'}`}>{msg.text}</p>}

      {pendingImport && (
        <div className="rounded-xl border border-warn/50 p-3">
          <p className="mb-2">
            Importare il backup del {pendingImport.exportedAt.slice(0, 10)}? ({pendingImport.sessions.length} allenamenti,{' '}
            {pendingImport.tests.length} test). I dati attuali verranno sostituiti, ma prima ne salvo una copia di sicurezza.
          </p>
          <div className="flex gap-2">
            <Button variant="primary" className="flex-1" onClick={doImport}>
              Importa
            </Button>
            <Button className="flex-1" onClick={() => setPendingImport(null)}>
              Annulla
            </Button>
          </div>
        </div>
      )}

      {confirmWipe ? (
        <div className="rounded-xl border border-red-600/50 p-3">
          <p className="mb-2">Cancellare tutti i dati? Allenamenti, test, peso e attrezzatura verranno eliminati. Resta una copia di sicurezza che puoi ripristinare qui sotto.</p>
          <div className="flex gap-2">
            <Button variant="danger" className="flex-1" onClick={() => repo.clearAll()}>
              Cancella tutto
            </Button>
            <Button className="flex-1" onClick={() => setConfirmWipe(false)}>
              Annulla
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setConfirmWipe(true)}>
          Cancella tutti i dati
        </Button>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------- copie di sicurezza

function SnapshotSection() {
  const [list, setList] = useState<SnapshotMeta[]>([]);
  const [confirm, setConfirm] = useState<SnapshotMeta | null>(null);
  const [msg, setMsg] = useState('');
  const refresh = () => repo.listSnapshots().then(setList).catch(() => setList([]));
  useEffect(() => {
    void refresh();
  }, []);

  const restore = async (s: SnapshotMeta) => {
    const data = await repo.getSnapshot(s.id);
    if (!data) return;
    await repo.importAll(data); // salva prima una copia dello stato attuale
    setConfirm(null);
    setMsg('Copia ripristinata.');
    void refresh();
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <Section title="Copie di sicurezza automatiche">
      <p className="text-sm text-slate-400">
        L’app salva da sola una copia dei tuoi dati dopo ogni aggiornamento, una volta a settimana e prima di importare, cancellare o
        ricominciare. Restano sul telefono (le ultime 5): se la rimuovi dalla schermata Home, conta solo il backup esportato.
      </p>
      {list.length === 0 && <p className="text-sm text-slate-500">Ancora nessuna copia.</p>}
      <ul className="flex flex-col divide-y divide-line">
        {list.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 py-2">
            <span>
              <span className="block">{s.reason}</span>
              <span className="text-sm text-slate-400">
                {fmt(s.createdAt)} · {s.sessions} allenamenti
              </span>
            </span>
            <button type="button" className="shrink-0 rounded-full bg-line px-3 py-1.5 text-sm" onClick={() => setConfirm(s)}>
              Ripristina
            </button>
          </li>
        ))}
      </ul>
      {msg && <p className="text-sm text-accent">{msg}</p>}
      <Sheet open={!!confirm} onClose={() => setConfirm(null)}>
        {confirm && (
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-bold">Ripristinare questa copia?</h2>
            <p className="text-slate-300">
              «{confirm.reason}» del {fmt(confirm.createdAt)}, con {confirm.sessions} allenamenti. I dati attuali vengono sostituiti, ma
              prima ne salvo una copia: puoi sempre tornare indietro.
            </p>
            <Button variant="primary" onClick={() => restore(confirm)}>
              Ripristina
            </Button>
          </div>
        )}
      </Sheet>
    </Section>
  );
}

// ---------------------------------------------------------------- crediti

function CreditsSection() {
  const byAuthor = new Map<string, { license: string; source: string }>();
  for (const m of Object.values(MEDIA)) {
    const key = `${m.author} · ${m.license}`;
    if (!byAuthor.has(key)) byAuthor.set(key, { license: m.license, source: m.source });
  }
  return (
    <Section title="Crediti delle foto">
      <ul className="flex flex-col gap-1 text-sm text-slate-400">
        {[...byAuthor.entries()].map(([k, v]) => (
          <li key={k}>
            {k} —{' '}
            <a href={v.source.includes('free-exercise-db') ? 'https://github.com/yuhonas/free-exercise-db' : v.source} target="_blank" rel="noreferrer" className="underline">
              fonte
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}
