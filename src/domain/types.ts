// Modello dati dell'app. Tutto è serializzabile in JSON (nessuna classe, nessuna Date:
// le date sono stringhe ISO "YYYY-MM-DD"), così lo stesso modello potrà viaggiare
// verso l'API della fase 2 senza conversioni.

export type ISODate = string; // "2026-09-28"

export type DayType = 'A' | 'B' | 'C' | 'rest' | 'test';
export type WorkoutDayType = 'A' | 'B' | 'C';

export type MuscleGroup =
  | 'petto'
  | 'spalle'
  | 'tricipiti'
  | 'schiena'
  | 'bicipiti'
  | 'quadricipiti'
  | 'glutei'
  | 'femorali'
  | 'core';

export type EquipmentKind =
  | 'tube-band' // elastico tubolare con maniglie
  | 'flat-band' // fascia elastica piatta
  | 'mini-band'
  | 'dumbbell'
  | 'ball'
  | 'mat'
  | 'ab-wheel'
  | 'bike'
  | 'chair';

export type Anchor = 'alto' | 'medio' | 'basso';

export interface Equipment {
  id: string;
  kind: EquipmentKind;
  name: string; // "Rosso – medio", "Manubrio 2 kg"
  color?: string; // colore CSS per l'etichetta, es. "#ef4444"
  /** Ordine di durezza/carico dentro lo stesso tipo (più alto = più duro). Per i manubri: i kg. */
  level: number;
  /** Numero di pezzi (es. 2 manubri). Informativo. */
  quantity?: number;
}

export type Metric = 'reps' | 'seconds';

/** Una variante di un esercizio: un gradino della scala di progressione. */
export interface VariantDef {
  id: string;
  name: string;
  /** Ripetizioni (o secondi) da cui si parte quando si arriva su questa variante. */
  start: number;
  /** Limite oltre il quale si cambia elastico/carico o variante. Assente = nessun limite. */
  max?: number;
  /** Incremento settimanale. */
  step: number;
  /** Tipo di carico che si scala su questa variante (elastico o manubri). */
  loadKind?: EquipmentKind;
  /**
   * Con quale carico si parte quando si entra nella variante. Default: il più leggero.
   * `closestTo`: il carico col livello più vicino (per i manubri: i kg), es. 2 kg per le alzate laterali.
   */
  startLoad?: 'lightest' | 'heaviest' | { closestTo: number };
  /** Settimana del programma da cui la variante diventa obbligatoria (es. squat con elastico dalla settimana 3). */
  fromWeek?: number;
  /** Suggerimento mostrato quando si è al massimo e non c'è un gradino successivo. */
  maxHint?: string;
  /** Attrezzi in più richiesti solo da questa variante. */
  extraEquipment?: EquipmentKind[];
  /** Nota di esecuzione specifica della variante. */
  note?: string;
}

export type IllustrationKey = string;

export interface ExerciseDef {
  id: string;
  name: string;
  metric: Metric;
  perSide?: boolean;
  /** Muscoli principali (il primo decide il gruppo nel grafico del volume). */
  muscles: MuscleGroup[];
  /** Muscoli che aiutano (sinergici/stabilizzatori). */
  secondary?: MuscleGroup[];
  /** Attrezzi da preparare. */
  equipment: EquipmentKind[];
  anchor?: Anchor;
  description: string;
  tips: [string, string, string];
  illustration: IllustrationKey;
  variants: VariantDef[];
  /**
   * Collegamento a un test: dopo un test il target della prima variante
   * viene ricalcolato come `ratio × massimo del test`.
   */
  testLink?: { test: TestId; ratio: number };
}

export type RestKind = 'long' | 'short';

/** Un blocco della parte principale: un esercizio singolo o una superserie. */
export interface BlockDef {
  id: string;
  exercises: string[]; // 1 = esercizio singolo, 2 = superserie
  /**
   * Alternative per ogni posizione (stesso indice di `exercises`): la rotazione automatica
   * sceglie ogni volta un esercizio diverso tra l'originale e queste.
   */
  alternatives?: string[][];
  sets: number;
  rest: RestKind;
}

export interface TimedItem {
  id: string;
  name: string;
  seconds: number;
  equipment: EquipmentKind[];
  description: string;
  tips: [string, string, string];
  illustration: IllustrationKey;
  muscles?: MuscleGroup[];
  secondary?: MuscleGroup[];
}

export interface DayDef {
  type: WorkoutDayType;
  name: string;
  focus: string;
  blocks: BlockDef[];
}

export type TestId = 'pushups' | 'squat' | 'plank' | 'burpees' | 'crunch';

export interface TestDef {
  id: TestId;
  name: string;
  metric: Metric;
  /** 'max' = fino a esaurimento (plank: cronometro in avanti); numero = durata fissa in secondi */
  mode: 'max' | { seconds: number };
  unit: string;
  description: string;
  tips: [string, string, string];
  illustration: IllustrationKey;
  muscles?: MuscleGroup[];
  secondary?: MuscleGroup[];
}

export type TestValues = Record<TestId, number>;

// ---------------------------------------------------------------- stato utente

export interface Settings {
  reminderTime: string; // "07:30"
  voice: boolean;
  sounds: boolean;
  restLongSec: number;
  restShortSec: number;
  restBetweenTestsSec: number;
  /** Secondi di preparazione prima di ogni nuovo esercizio. */
  prepSec: number;
}

export type Sex = 'M' | 'F' | 'X'; // X = preferisce non dirlo

export interface Profile {
  id: 'me';
  heightCm: number;
  sex?: Sex;
  /** Lunedì in cui inizia la settimana 1 del programma. */
  programStart: ISODate;
  settings: Settings;
  createdAt: string;
}

export interface BodyWeightEntry {
  date: ISODate;
  kg: number;
}

export interface TestResult {
  id: string;
  date: ISODate;
  values: TestValues;
  /** Test iniziale del profilo o test fatto nell'app. */
  source: 'initial' | 'app';
}

export interface ChangeLog {
  date: ISODate;
  kind: 'increase' | 'repeat' | 'decrease' | 'load' | 'variant' | 'test' | 'hold' | 'start';
  reason: string;
  from: { variantIndex: number; target: number; loadId: string | null };
  to: { variantIndex: number; target: number; loadId: string | null };
}

export interface ExerciseState {
  exerciseId: string;
  variantIndex: number;
  target: number;
  loadId: string | null;
  /** Sessioni consecutive in cui il target è stato mancato. */
  missStreak: number;
  /** Ultima settimana di programma (numero assoluto) in cui si è progrediti. */
  lastProgressWeek: number;
  /**
   * L'ultima sessione è stata completata: la progressione scatta alla prossima
   * sessione dello stesso tipo in una nuova settimana (così è "+1 a settimana"
   * anche se ogni giorno si ripete due volte).
   */
  pendingProgress: boolean;
  /** Ultima modifica, col motivo, da mostrare all'utente. */
  lastChange: ChangeLog | null;
  history: ChangeLog[];
}

export interface SetLog {
  exerciseId: string;
  setIndex: number;
  target: number;
  done: number;
  variantIndex: number;
  loadId: string | null;
}

export interface SessionLog {
  id: string;
  date: ISODate;
  dayType: WorkoutDayType;
  /** Settimana assoluta dall'inizio del programma (1, 2, … anche oltre l'8). */
  week: number;
  deload: boolean;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  sets: SetLog[];
  /** Esercizi eseguiti con forma non buona (disattivato "forma ok"). */
  badForm: string[];
  completed: boolean;
}

/** Backup completo, anche formato di sincronizzazione per la fase 2. */
export interface BackupData {
  app: 'myPersonalTrainer';
  version: 1;
  exportedAt: string;
  profile: Profile | null;
  equipment: Equipment[];
  bodyWeight: BodyWeightEntry[];
  tests: TestResult[];
  exerciseStates: ExerciseState[];
  sessions: SessionLog[];
  /** Giorni di riposo attivo segnati come fatti. */
  activeRest: ISODate[];
}
