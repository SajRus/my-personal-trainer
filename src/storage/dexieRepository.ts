import Dexie, { type Table } from 'dexie';
import type {
  BackupData,
  BodyWeightEntry,
  Equipment,
  ExerciseState,
  ISODate,
  Profile,
  SessionLog,
  TestResult,
} from '../domain/types';
import { BACKUP_VERSION, migrateBackup, normalizeProfile } from './migrate';
import type { Repository, SnapshotMeta } from './repository';

interface SnapshotRow extends Omit<SnapshotMeta, 'id'> {
  id?: number;
  data: BackupData;
}

/** Quante copie di sicurezza automatiche tenere. */
const MAX_SNAPSHOTS = 5;

class TrainerDB extends Dexie {
  profile!: Table<Profile, string>;
  equipment!: Table<Equipment, string>;
  exerciseStates!: Table<ExerciseState, string>;
  sessions!: Table<SessionLog, string>;
  tests!: Table<TestResult, string>;
  bodyWeight!: Table<BodyWeightEntry, string>;
  activeRest!: Table<{ date: ISODate }, string>;
  snapshots!: Table<SnapshotRow, number>;

  // REGOLA: lo schema si cambia solo aggiungendo una nuova versione (mai togliere tabelle o campi),
  // così i dati di chi usa già l'app restano intatti. Dexie applica gli aggiornamenti da solo.
  constructor(name: string) {
    super(name);
    this.version(1).stores({
      profile: 'id',
      equipment: 'id, kind',
      exerciseStates: 'exerciseId',
      sessions: 'id, date, dayType',
      tests: 'id, date',
      bodyWeight: 'date',
      activeRest: 'date',
    });
    // v2: copie di sicurezza automatiche
    this.version(2).stores({ snapshots: '++id, createdAt' });
  }

  /** Tabelle dei dati dell'utente (escluse le copie di sicurezza). */
  get dataTables() {
    return [this.profile, this.equipment, this.exerciseStates, this.sessions, this.tests, this.bodyWeight, this.activeRest];
  }
}

const byDate = <T extends { date: string }>(a: T, b: T) => a.date.localeCompare(b.date);

export class DexieRepository implements Repository {
  readonly db: TrainerDB;

  constructor(name = 'myPersonalTrainer') {
    this.db = new TrainerDB(name);
  }

  async getProfile() {
    const p = await this.db.profile.get('me');
    return p ? normalizeProfile(p) : null;
  }
  async saveProfile(p: Profile) {
    await this.db.profile.put(p);
  }

  listEquipment() {
    return this.db.equipment.toArray();
  }
  async saveEquipment(items: Equipment[]) {
    await this.db.equipment.bulkPut(items);
  }
  async deleteEquipment(id: string) {
    await this.db.equipment.delete(id);
  }

  listExerciseStates() {
    return this.db.exerciseStates.toArray();
  }
  async saveExerciseStates(states: ExerciseState[]) {
    await this.db.exerciseStates.bulkPut(states);
  }

  async listSessions() {
    return (await this.db.sessions.toArray()).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  }
  async addSession(s: SessionLog) {
    await this.db.sessions.put(s);
  }

  async listTests() {
    return (await this.db.tests.toArray()).sort(byDate);
  }
  async addTest(t: TestResult) {
    await this.db.tests.put(t);
  }

  async listBodyWeight() {
    return (await this.db.bodyWeight.toArray()).sort(byDate);
  }
  async saveBodyWeight(e: BodyWeightEntry) {
    await this.db.bodyWeight.put(e);
  }
  async deleteBodyWeight(date: ISODate) {
    await this.db.bodyWeight.delete(date);
  }

  async listActiveRest() {
    return (await this.db.activeRest.toArray()).map((r) => r.date).sort();
  }
  async setActiveRest(date: ISODate, done: boolean) {
    if (done) await this.db.activeRest.put({ date });
    else await this.db.activeRest.delete(date);
  }

  async exportAll(): Promise<BackupData> {
    return {
      app: 'myPersonalTrainer',
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      profile: await this.getProfile(),
      equipment: await this.listEquipment(),
      bodyWeight: await this.listBodyWeight(),
      tests: await this.listTests(),
      exerciseStates: await this.listExerciseStates(),
      sessions: await this.listSessions(),
      activeRest: await this.listActiveRest(),
    };
  }

  async importAll(raw: unknown) {
    const data = migrateBackup(raw); // valida prima di toccare qualsiasi dato
    if (await this.getProfile()) await this.saveSnapshot('Prima di importare un backup');
    const d = this.db;
    await d.transaction('rw', d.dataTables, async () => {
      await Promise.all(d.dataTables.map((t) => t.clear()));
      if (data.profile) await d.profile.put(data.profile);
      await d.equipment.bulkPut(data.equipment);
      await d.exerciseStates.bulkPut(data.exerciseStates);
      await d.sessions.bulkPut(data.sessions);
      await d.tests.bulkPut(data.tests);
      await d.bodyWeight.bulkPut(data.bodyWeight);
      await d.activeRest.bulkPut(data.activeRest.map((date) => ({ date })));
    });
  }

  async clearAll() {
    if (await this.getProfile()) await this.saveSnapshot('Prima di cancellare i dati');
    await Promise.all(this.db.dataTables.map((t) => t.clear()));
  }

  // ---------------------------------------------------------------- copie di sicurezza

  async saveSnapshot(reason: string, build?: string) {
    const data = await this.exportAll();
    await this.db.snapshots.add({ createdAt: data.exportedAt, reason, build, sessions: data.sessions.length, data });
    const all = await this.db.snapshots.orderBy('createdAt').primaryKeys();
    if (all.length > MAX_SNAPSHOTS) await this.db.snapshots.bulkDelete(all.slice(0, all.length - MAX_SNAPSHOTS));
  }

  async listSnapshots(): Promise<SnapshotMeta[]> {
    const rows = await this.db.snapshots.orderBy('createdAt').reverse().toArray();
    return rows.map(({ id, createdAt, reason, build, sessions }) => ({ id: id!, createdAt, reason, build, sessions }));
  }

  async getSnapshot(id: number) {
    return (await this.db.snapshots.get(id))?.data ?? null;
  }
}
