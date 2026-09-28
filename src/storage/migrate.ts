// Compatibilità dei dati nel tempo. REGOLA: chi usa già l'app non deve mai perdere la sua storia.
// - I backup (e le copie di sicurezza) di qualsiasi versione precedente si devono poter importare.
// - I campi mancanti prendono un valore di default; quelli sconosciuti si conservano.
// - Se cambi il formato, aumenta BACKUP_VERSION e aggiungi qui il passaggio dalla versione precedente,
//   poi aggiungi un file in tests/compat/ con un esempio della versione nuova.

import { DEFAULT_SETTINGS } from '../data/program';
import type { BackupData, ExerciseState, Profile } from '../domain/types';

export const BACKUP_VERSION = 1;

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Completa uno stato esercizio salvato da una versione precedente. */
export function normalizeState(s: Partial<ExerciseState> & { exerciseId: string }): ExerciseState {
  return {
    variantIndex: 0,
    target: 1,
    loadId: null,
    missStreak: 0,
    lastProgressWeek: 0,
    pendingProgress: false,
    lastChange: null,
    history: [],
    ...s,
  } as ExerciseState;
}

export function normalizeProfile(p: Profile): Profile {
  return { ...p, id: 'me', settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } };
}

/** Porta un backup (anche vecchio o parziale) al formato attuale. Lancia un errore solo se non è un backup dell'app. */
export function migrateBackup(raw: unknown): BackupData {
  if (!raw || typeof raw !== 'object') throw new Error('File vuoto o non valido');
  const d = raw as Record<string, unknown>;
  if (d.app !== 'myPersonalTrainer') throw new Error('Non è un backup di myPersonalTrainer');
  const version = typeof d.version === 'number' ? d.version : 1;
  if (version > BACKUP_VERSION) {
    throw new Error('Backup creato da una versione più nuova dell’app: aggiorna l’app e riprova');
  }
  // (qui, in futuro: if (version < 2) { ...conversione 1 → 2... })
  return {
    ...(d as object),
    app: 'myPersonalTrainer',
    version: BACKUP_VERSION,
    exportedAt: typeof d.exportedAt === 'string' ? d.exportedAt : new Date().toISOString(),
    profile: d.profile ? normalizeProfile(d.profile as Profile) : null,
    equipment: arr(d.equipment),
    bodyWeight: arr(d.bodyWeight),
    tests: arr(d.tests),
    exerciseStates: arr<ExerciseState>(d.exerciseStates).filter((s) => s && typeof s.exerciseId === 'string').map(normalizeState),
    sessions: arr(d.sessions),
    activeRest: arr(d.activeRest),
  } as BackupData;
}
