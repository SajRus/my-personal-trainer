// Compatibilità: chi usa già l'app non deve mai perdere la sua storia.
// I file in tests/compat/ sono backup nel formato delle versioni pubblicate: NON modificarli,
// aggiungine di nuovi quando il formato cambia. Ogni versione futura deve continuare a leggerli.

import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dayView, loadAll, todayView } from '../src/app/trainer';
import { addDays } from '../src/domain/dates';
import { muscleSets, streak, weeklySets } from '../src/domain/stats';
import { DexieRepository } from '../src/storage/dexieRepository';
import { migrateBackup } from '../src/storage/migrate';

const v1 = () => JSON.parse(readFileSync('tests/compat/backup-v1.json', 'utf8'));
const fresh = () => new DexieRepository(`compat-${Math.random()}`);

describe('backup v1 (formato pubblicato)', () => {
  it('si importa senza perdere nulla', async () => {
    const backup = v1();
    const repo = fresh();
    await repo.importAll(backup);
    const data = (await loadAll(repo))!;
    expect(data.sessions).toHaveLength(backup.sessions.length);
    expect(data.tests).toHaveLength(backup.tests.length);
    expect(data.bodyWeight).toHaveLength(backup.bodyWeight.length);
    expect(data.activeRest).toEqual(backup.activeRest);
    for (const s of backup.exerciseStates) expect(data.states[s.exerciseId].target).toBe(s.target);
  });

  it('dopo l’import tutte le schermate funzionano sui dati vecchi', async () => {
    const repo = fresh();
    await repo.importAll(v1());
    const data = (await loadAll(repo))!;
    const start = data.profile.programStart;
    for (let i = 0; i < 21; i++) {
      const d = addDays(start, i);
      expect(() => dayView(data, d, addDays(start, 10))).not.toThrow();
    }
    expect(weeklySets(data.sessions, start).length).toBeGreaterThan(0);
    expect(muscleSets(data.sessions, start).petto).toBeGreaterThan(0);
    expect(streak(start, new Set(data.sessions.map((s) => s.date)), addDays(start, 8))).toBeGreaterThan(0);
  });

  it('export → import restituisce gli stessi dati', async () => {
    const a = fresh();
    await a.importAll(v1());
    const exported = await a.exportAll();
    const b = fresh();
    await b.importAll(JSON.parse(JSON.stringify(exported)));
    expect({ ...(await b.exportAll()), exportedAt: '' }).toEqual({ ...exported, exportedAt: '' });
  });
});

describe('dati di versioni precedenti o incompleti', () => {
  /** Simula i dati della prima versione: niente sesso, niente esercizi nuovi, campi mancanti. */
  const legacy = () => {
    const b = v1();
    delete b.profile.sex;
    delete b.profile.settings.prepSec;
    b.exerciseStates = b.exerciseStates
      .filter((s: { exerciseId: string }) => ['pushup', 'pike', 'dip', 'lateralRaise', 'squat', 'bandRow', 'plank'].includes(s.exerciseId))
      .map((s: Record<string, unknown>) => {
        const { pendingProgress: _p, ...rest } = s;
        return rest;
      });
    delete b.activeRest;
    return b;
  };

  it('completa i campi mancanti e crea gli stati degli esercizi nuovi', async () => {
    const repo = fresh();
    await repo.importAll(legacy());
    const data = (await loadAll(repo))!;
    expect(data.profile.settings.prepSec).toBe(10);
    expect(data.states.pushup.pendingProgress).toBe(false);
    expect(data.states.mountainClimbers).toBeDefined(); // esercizio aggiunto dopo
    expect(data.activeRest).toEqual([]);
    expect(() => todayView(data, addDays(data.profile.programStart, 9))).not.toThrow();
  });

  it('sessioni con esercizi che non esistono più non rompono nulla', async () => {
    const b = v1();
    b.sessions[0].sets.push({ exerciseId: 'esercizioRimosso', setIndex: 0, target: 5, done: 5, variantIndex: 0, loadId: null });
    const repo = fresh();
    await repo.importAll(b);
    const data = (await loadAll(repo))!;
    expect(() => weeklySets(data.sessions, data.profile.programStart)).not.toThrow();
    expect(() => muscleSets(data.sessions, data.profile.programStart)).not.toThrow();
  });

  it('rifiuta file che non sono backup, senza toccare i dati esistenti', async () => {
    const repo = fresh();
    await repo.importAll(v1());
    await expect(repo.importAll({ foo: 1 })).rejects.toThrow('Non è un backup');
    await expect(repo.importAll({ app: 'myPersonalTrainer', version: 999 })).rejects.toThrow('più nuova');
    expect((await loadAll(repo))!.sessions.length).toBe(v1().sessions.length);
  });

  it('migrateBackup è tollerante verso campi assenti', () => {
    const m = migrateBackup({ app: 'myPersonalTrainer' });
    expect(m.sessions).toEqual([]);
    expect(m.profile).toBeNull();
  });
});

describe('copie di sicurezza automatiche', () => {
  it('importare o cancellare salva prima una copia, che si può ripristinare', async () => {
    const repo = fresh();
    await repo.importAll(v1());
    const before = await repo.exportAll();
    await repo.clearAll();
    expect(await loadAll(repo)).toBeNull();
    const [snap] = await repo.listSnapshots();
    expect(snap.reason).toContain('cancellare');
    expect(snap.sessions).toBe(before.sessions.length);
    await repo.importAll(await repo.getSnapshot(snap.id));
    expect({ ...(await repo.exportAll()), exportedAt: '' }).toEqual({ ...before, exportedAt: '' });
  });

  it('tiene solo le ultime 5 copie', async () => {
    const repo = fresh();
    await repo.importAll(v1());
    for (let i = 0; i < 8; i++) await repo.saveSnapshot(`copia ${i}`);
    const list = await repo.listSnapshots();
    expect(list).toHaveLength(5);
    expect(list[0].reason).toBe('copia 7');
  });
});

describe('aggiornamento del database sul telefono', () => {
  it('un database creato con lo schema v1 si apre con la versione nuova senza perdere nulla', async () => {
    const Dexie = (await import('dexie')).default;
    const name = `upgrade-${Math.random()}`;
    const backup = v1();
    // il database come lo crea la versione già installata sui telefoni (solo schema v1)
    const old = new Dexie(name);
    old.version(1).stores({
      profile: 'id',
      equipment: 'id, kind',
      exerciseStates: 'exerciseId',
      sessions: 'id, date, dayType',
      tests: 'id, date',
      bodyWeight: 'date',
      activeRest: 'date',
    });
    await old.table('profile').put(backup.profile);
    await old.table('equipment').bulkPut(backup.equipment);
    await old.table('exerciseStates').bulkPut(backup.exerciseStates);
    await old.table('sessions').bulkPut(backup.sessions);
    await old.table('tests').bulkPut(backup.tests);
    await old.table('bodyWeight').bulkPut(backup.bodyWeight);
    await old.table('activeRest').bulkPut(backup.activeRest.map((date: string) => ({ date })));
    old.close();

    // la versione nuova apre lo stesso database (Dexie esegue l'aggiornamento allo schema v2)
    const repo = new DexieRepository(name);
    const data = (await loadAll(repo))!;
    expect(data.sessions).toHaveLength(backup.sessions.length);
    expect(data.tests).toHaveLength(backup.tests.length);
    expect(data.bodyWeight).toHaveLength(backup.bodyWeight.length);
    expect(data.states.pushup.target).toBe(backup.exerciseStates.find((s: { exerciseId: string }) => s.exerciseId === 'pushup').target);
    // e le funzioni nuove funzionano
    await repo.saveSnapshot('prova');
    expect((await repo.listSnapshots())[0].sessions).toBe(backup.sessions.length);
  });
});
