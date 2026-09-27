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
import type { Repository } from './repository';

class TrainerDB extends Dexie {
  profile!: Table<Profile, string>;
  equipment!: Table<Equipment, string>;
  exerciseStates!: Table<ExerciseState, string>;
  sessions!: Table<SessionLog, string>;
  tests!: Table<TestResult, string>;
  bodyWeight!: Table<BodyWeightEntry, string>;
  activeRest!: Table<{ date: ISODate }, string>;

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
  }
}

const byDate = <T extends { date: string }>(a: T, b: T) => a.date.localeCompare(b.date);

export class DexieRepository implements Repository {
  readonly db: TrainerDB;

  constructor(name = 'myPersonalTrainer') {
    this.db = new TrainerDB(name);
  }

  async getProfile() {
    return (await this.db.profile.get('me')) ?? null;
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
      version: 1,
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

  async importAll(data: BackupData) {
    if (data.app !== 'myPersonalTrainer' || data.version !== 1) {
      throw new Error('File di backup non riconosciuto');
    }
    const d = this.db;
    await d.transaction('rw', [d.profile, d.equipment, d.exerciseStates, d.sessions, d.tests, d.bodyWeight, d.activeRest], async () => {
      await this.clearAll();
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
    await Promise.all(this.db.tables.map((t) => t.clear()));
  }
}
