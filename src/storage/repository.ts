// Interfaccia dello strato dati. L'app parla solo con questa interfaccia:
// oggi l'implementazione è Dexie (IndexedDB sul telefono); nella fase 2 si potrà
// aggiungere un'implementazione che sincronizza con l'API sul server di casa.

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

export interface Repository {
  getProfile(): Promise<Profile | null>;
  saveProfile(p: Profile): Promise<void>;

  listEquipment(): Promise<Equipment[]>;
  saveEquipment(items: Equipment[]): Promise<void>;
  deleteEquipment(id: string): Promise<void>;

  listExerciseStates(): Promise<ExerciseState[]>;
  saveExerciseStates(states: ExerciseState[]): Promise<void>;

  listSessions(): Promise<SessionLog[]>;
  addSession(s: SessionLog): Promise<void>;

  listTests(): Promise<TestResult[]>;
  addTest(t: TestResult): Promise<void>;

  listBodyWeight(): Promise<BodyWeightEntry[]>;
  saveBodyWeight(e: BodyWeightEntry): Promise<void>;
  deleteBodyWeight(date: ISODate): Promise<void>;

  listActiveRest(): Promise<ISODate[]>;
  setActiveRest(date: ISODate, done: boolean): Promise<void>;

  exportAll(): Promise<BackupData>;
  importAll(data: BackupData): Promise<void>;
  clearAll(): Promise<void>;
}
