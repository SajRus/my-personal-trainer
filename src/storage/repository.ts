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

export interface SnapshotMeta {
  id: number;
  createdAt: string;
  reason: string;
  build?: string;
  sessions: number;
}

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
  /** Sostituisce i dati con quelli del backup (accetta anche versioni vecchie). Prima salva una copia di sicurezza. */
  importAll(data: unknown): Promise<void>;
  /** Cancella i dati (non le copie di sicurezza). Prima salva una copia di sicurezza. */
  clearAll(): Promise<void>;

  /** Copie di sicurezza automatiche sul dispositivo (le ultime 5). */
  saveSnapshot(reason: string, build?: string): Promise<void>;
  listSnapshots(): Promise<SnapshotMeta[]>;
  getSnapshot(id: number): Promise<BackupData | null>;
}
