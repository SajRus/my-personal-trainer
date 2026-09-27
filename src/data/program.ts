// ============================================================================
//  PROGRAMMA DI ALLENAMENTO — file di configurazione modificabile
//  Qui stanno esercizi, varianti, giorni, regole, test e attrezzatura di default.
//  La logica (src/domain) legge solo da qui: per cambiare il programma basta
//  modificare questo file.
// ============================================================================

import { EXTRA_COOLDOWN, EXTRA_EXERCISES, EXTRA_WARMUP, RUN_IN_PLACE } from './exercises-extra';
import type {
  DayDef,
  DayType,
  Equipment,
  ExerciseDef,
  MuscleGroup,
  Settings,
  Sex,
  TestDef,
  TestValues,
  TimedItem,
} from '../domain/types';

// ---------------------------------------------------------------- regole generali

export const RULES = {
  /** Durata del programma in settimane; poi riparte un nuovo ciclo. */
  programWeeks: 8,
  /** Rotazione settimanale, indice 0 = lunedì. */
  weekRotation: ['A', 'B', 'C', 'A', 'B', 'C', 'rest'] as DayType[],
  /** Test intermedio: domenica della settimana 4 (giorno 6 = domenica). */
  midTest: { week: 4, weekday: 6 },
  /** Settimana di scarico: da lunedì a venerdì volume ridotto, sabato test finale. */
  deload: { week: 8, lastWeekday: 4, volumeFactor: 0.6, finalTestWeekday: 5 },
  /** Dopo 2 sessioni di fila mancate si riduce del 10%. */
  missesBeforeDecrease: 2,
  decreaseFactor: 0.9,
  /** Secondi stimati per una ripetizione (per la durata stimata). */
  secondsPerRep: 2.5,
} as const;

export const DEFAULT_SETTINGS: Settings = {
  reminderTime: '07:30',
  voice: true,
  sounds: true,
  restLongSec: 60,
  restShortSec: 45,
  restBetweenTestsSec: 180,
  prepSec: 10,
};

// ---------------------------------------------------------------- gruppi muscolari per i grafici

/** Macro-gruppi usati nel grafico del volume settimanale (il primo muscolo di ogni esercizio decide il gruppo). */
export const MUSCLE_MACRO = {
  spinta: { label: 'Spinta', muscles: ['petto', 'spalle', 'tricipiti'] },
  tirata: { label: 'Tirata', muscles: ['schiena', 'bicipiti'] },
  gambe: { label: 'Gambe', muscles: ['quadricipiti', 'glutei', 'femorali'] },
  core: { label: 'Core', muscles: ['core'] },
} as const;

export type MacroGroup = keyof typeof MUSCLE_MACRO;

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  petto: 'Petto',
  spalle: 'Spalle',
  tricipiti: 'Tricipiti',
  schiena: 'Schiena',
  bicipiti: 'Bicipiti',
  quadricipiti: 'Quadricipiti',
  glutei: 'Glutei',
  femorali: 'Femorali',
  core: 'Addominali e core',
};

export const MUSCLES: MuscleGroup[] = ['petto', 'spalle', 'tricipiti', 'bicipiti', 'schiena', 'core', 'glutei', 'quadricipiti', 'femorali'];

// ---------------------------------------------------------------- livello di partenza

/**
 * Valori provvisori da principiante, usati solo finché non si fanno i test guidati
 * (o se si sceglie di partire senza test). Nessun dato personale qui: ognuno inserisce i propri.
 */
export const BASELINE_TESTS: TestValues = { pushups: 7, squat: 19, plank: 30, burpees: 7, crunch: 15 };

/** Stime da principiante per sesso (usate solo prima dei test: poi contano i risultati veri). */
export const BASELINE_BY_SEX: Record<Sex, TestValues> = {
  M: { pushups: 10, squat: 20, plank: 30, burpees: 8, crunch: 15 },
  F: { pushups: 4, squat: 18, plank: 30, burpees: 6, crunch: 15 },
  X: BASELINE_TESTS,
};

export const SEX_LABEL: Record<Sex, string> = { M: 'Uomo', F: 'Donna', X: 'Preferisco non dirlo' };

// ---------------------------------------------------------------- attrezzatura: preset generici

/** Set proposti nella configurazione iniziale quando si dice "ho questo attrezzo". Nomi e colori si cambiano dopo. */
export const EQUIPMENT_PRESETS: Record<Equipment['kind'], Equipment[]> = {
  'tube-band': [
    { id: 'tube-1', kind: 'tube-band', name: 'Giallo – leggero', color: '#eab308', level: 1 },
    { id: 'tube-2', kind: 'tube-band', name: 'Rosso – medio', color: '#ef4444', level: 2 },
    { id: 'tube-3', kind: 'tube-band', name: 'Blu – duro', color: '#3b82f6', level: 3 },
  ],
  'flat-band': [
    { id: 'flat-1', kind: 'flat-band', name: 'Fascia leggera', color: '#a3e635', level: 1 },
    { id: 'flat-2', kind: 'flat-band', name: 'Fascia media', color: '#f97316', level: 2 },
  ],
  'mini-band': [
    { id: 'mini-1', kind: 'mini-band', name: 'Mini band leggera', color: '#facc15', level: 1 },
    { id: 'mini-2', kind: 'mini-band', name: 'Mini band media', color: '#22c55e', level: 2 },
    { id: 'mini-3', kind: 'mini-band', name: 'Mini band dura', color: '#a855f7', level: 3 },
  ],
  dumbbell: [], // si scelgono i pesi
  ball: [{ id: 'ball', kind: 'ball', name: 'Palla da pilates', level: 1 }],
  mat: [{ id: 'mat', kind: 'mat', name: 'Tappetino', level: 1 }],
  'ab-wheel': [{ id: 'ab-wheel', kind: 'ab-wheel', name: 'Ruota per addominali', level: 1 }],
  bike: [{ id: 'bike', kind: 'bike', name: 'Cyclette', level: 1 }],
  chair: [{ id: 'chair', kind: 'chair', name: 'Sedia stabile', level: 1 }],
};

/** Pesi dei manubri proposti nella configurazione iniziale (kg). */
export const DUMBBELL_CHOICES = [1, 2, 3, 4, 5, 6, 8, 10, 12];

export function dumbbell(kg: number): Equipment {
  return { id: `db-${kg}`, kind: 'dumbbell', name: `Manubri ${String(kg).replace('.', ',')} kg`, level: kg, quantity: 2 };
}

/** Attrezzatura a partire dai tipi posseduti e dai pesi dei manubri. */
export function buildEquipment(kinds: Equipment['kind'][], dumbbellKg: number[]): Equipment[] {
  const out: Equipment[] = [];
  for (const k of kinds) {
    if (k === 'dumbbell') out.push(...[...dumbbellKg].sort((a, b) => a - b).map(dumbbell));
    else out.push(...EQUIPMENT_PRESETS[k]);
  }
  return out;
}

export const EQUIPMENT_KIND_LABEL: Record<Equipment['kind'], string> = {
  'tube-band': 'Elastico tubolare',
  'flat-band': 'Fascia elastica',
  'mini-band': 'Mini band',
  dumbbell: 'Manubri',
  ball: 'Palla pilates',
  mat: 'Tappetino',
  'ab-wheel': 'Ab wheel',
  bike: 'Cyclette',
  chair: 'Sedia',
};

// ---------------------------------------------------------------- esercizi

const BASE_EXERCISES: Record<string, ExerciseDef> = {
  pushup: {
    id: 'pushup',
    name: 'Piegamenti',
    metric: 'reps',
    muscles: ['petto'],
    secondary: ['tricipiti', 'spalle'],
    equipment: ['mat'],
    description: 'Mani poco più larghe delle spalle, corpo dritto dalla testa ai talloni. Scendi finché il petto sfiora il pavimento e risali.',
    tips: [
      'Gomiti a circa 45° dal busto, non aperti a T',
      'Stringi glutei e addominali: il bacino non deve cadere',
      'Scendi in 2 secondi, risali in modo deciso',
    ],
    illustration: 'pushup',
    testLink: { test: 'pushups', ratio: 0.55 },
    variants: [
      { id: 'pushup', name: 'Piegamenti', start: 6, max: 12, step: 1 },
      {
        id: 'pushup-band',
        name: 'Piegamenti con elastico sulla schiena',
        start: 6,
        max: 12,
        step: 1,
        loadKind: 'tube-band',
        note: 'Passa l’elastico dietro la schiena, sotto le ascelle, e tieni le maniglie sotto i palmi.',
      },
    ],
  },
  pike: {
    id: 'pike',
    name: 'Pike push-up',
    metric: 'reps',
    muscles: ['spalle'],
    secondary: ['tricipiti', 'petto'],
    equipment: ['mat'],
    description: 'Da posizione di piegamento porta il bacino in alto a V rovesciata. Piega i gomiti portando la testa verso il pavimento davanti alle mani.',
    tips: [
      'Il bacino resta alto per tutta la serie',
      'La testa scende davanti alle mani, formando un triangolo',
      'Più avvicini i piedi alle mani, più lavorano le spalle',
    ],
    illustration: 'pike',
    testLink: { test: 'pushups', ratio: 0.45 },
    variants: [
      { id: 'pike', name: 'Pike push-up', start: 5, max: 12, step: 1 },
      {
        id: 'pike-chair',
        name: 'Pike push-up con piedi sulla sedia',
        start: 5,
        step: 1,
        extraEquipment: ['chair'],
        note: 'Piedi sulla sedia: più peso sulle spalle.',
      },
    ],
  },
  dip: {
    id: 'dip',
    name: 'Dip alla sedia',
    metric: 'reps',
    muscles: ['tricipiti'],
    secondary: ['petto', 'spalle'],
    equipment: ['chair'],
    description: 'Mani sul bordo della sedia dietro di te, dita in avanti. Scendi piegando i gomiti fino a 90° e risali spingendo.',
    tips: [
      'Tieni la schiena vicina alla sedia',
      'Gomiti che puntano indietro, non in fuori',
      'Non scendere oltre i 90° se senti fastidio alle spalle',
    ],
    illustration: 'dip',
    testLink: { test: 'pushups', ratio: 0.73 },
    variants: [
      { id: 'dip-bent', name: 'Dip alla sedia (gambe piegate)', start: 8, max: 15, step: 1 },
      { id: 'dip-straight', name: 'Dip alla sedia a gambe tese', start: 8, step: 1 },
    ],
  },
  lateralRaise: {
    id: 'lateralRaise',
    name: 'Alzate laterali',
    metric: 'reps',
    muscles: ['spalle'],
    equipment: ['dumbbell'],
    description: 'In piedi, manubri lungo i fianchi. Solleva le braccia di lato fino all’altezza delle spalle, gomiti appena piegati.',
    tips: [
      'Non oltre l’altezza delle spalle',
      'Niente slancio col busto',
      'Mignolo leggermente più alto del pollice in cima',
    ],
    illustration: 'lateralRaise',
    variants: [
      { id: 'raise', name: 'Alzate laterali', start: 12, max: 20, step: 1, loadKind: 'dumbbell', startLoad: { closestTo: 2 } },
      {
        id: 'raise-pause',
        name: 'Alzate laterali con pausa di 2 s in alto',
        start: 12,
        max: 20,
        step: 1,
        loadKind: 'dumbbell',
        startLoad: { closestTo: 2 },
        maxHint: 'Hai raggiunto il massimo: mantieni, oppure aggiungi un elastico piatto sotto i piedi',
      },
    ],
  },
  squat: {
    id: 'squat',
    name: 'Squat',
    metric: 'reps',
    muscles: ['quadricipiti', 'glutei'],
    secondary: ['femorali', 'core'],
    equipment: [],
    description: 'Piedi alla larghezza delle spalle, punte leggermente aperte. Scendi portando il bacino indietro come per sederti e risali.',
    tips: [
      'Talloni sempre a terra',
      'Ginocchia nella direzione delle punte dei piedi',
      'Petto alto e schiena neutra',
    ],
    illustration: 'squat',
    testLink: { test: 'squat', ratio: 0.75 },
    variants: [
      { id: 'squat-bw', name: 'Squat a corpo libero', start: 15, max: 20, step: 1 },
      {
        id: 'squat-band',
        name: 'Squat con elastico',
        start: 12,
        max: 20,
        step: 1,
        loadKind: 'tube-band',
        fromWeek: 3,
        note: 'Elastico sotto i piedi, maniglie all’altezza delle spalle.',
      },
    ],
  },
  reverseLunge: {
    id: 'reverseLunge',
    name: 'Affondi indietro alternati',
    metric: 'reps',
    perSide: true,
    muscles: ['quadricipiti', 'glutei'],
    secondary: ['femorali', 'core'],
    equipment: [],
    description: 'Fai un passo indietro e scendi finché il ginocchio posteriore sfiora il pavimento. Torna su spingendo col tallone anteriore.',
    tips: [
      'Busto dritto, sguardo in avanti',
      'Il ginocchio anteriore resta sopra la caviglia',
      'Le ripetizioni sono per gamba',
    ],
    illustration: 'lunge',
    testLink: { test: 'squat', ratio: 0.4 },
    variants: [
      { id: 'lunge-bw', name: 'Affondi indietro', start: 8, max: 12, step: 1 },
      {
        id: 'lunge-db',
        name: 'Affondi indietro con manubri',
        start: 8,
        max: 15,
        step: 1,
        loadKind: 'dumbbell',
        startLoad: { closestTo: 2 },
        maxHint: 'Hai raggiunto il massimo: mantieni con una pausa di 1 s in basso',
      },
    ],
  },
  legCurl: {
    id: 'legCurl',
    name: 'Leg curl sulla palla',
    metric: 'reps',
    muscles: ['femorali'],
    secondary: ['glutei', 'core'],
    equipment: ['ball', 'mat'],
    description: 'Supino, talloni sulla palla. Solleva il bacino e porta la palla verso i glutei piegando le ginocchia, poi distendi.',
    tips: [
      'Il bacino resta alto per tutta la serie',
      'Braccia a terra aperte per stabilità',
      'Distendi lentamente, in 2 secondi',
    ],
    illustration: 'legCurl',
    testLink: { test: 'squat', ratio: 0.4 },
    variants: [
      { id: 'legcurl', name: 'Leg curl sulla palla', start: 8, max: 15, step: 1 },
      {
        id: 'legcurl-single',
        name: 'Leg curl sulla palla a una gamba',
        start: 6,
        step: 1,
        note: 'Ripetizioni per gamba: l’altra gamba resta sollevata.',
      },
    ],
  },
  gluteBridge: {
    id: 'gluteBridge',
    name: 'Ponte glutei con mini band',
    metric: 'reps',
    muscles: ['glutei'],
    secondary: ['femorali', 'core'],
    equipment: ['mini-band', 'mat'],
    description: 'Supino, ginocchia piegate, mini band sopra le ginocchia. Spingi coi talloni e solleva il bacino fino ad allineare spalle, bacino e ginocchia.',
    tips: [
      'Spingi le ginocchia in fuori contro l’elastico',
      'Stringi i glutei 1 secondo in alto',
      'Non inarcare la zona lombare',
    ],
    illustration: 'bridge',
    testLink: { test: 'squat', ratio: 0.75 },
    variants: [
      {
        id: 'bridge',
        name: 'Ponte glutei con mini band',
        start: 15,
        max: 20,
        step: 1,
        loadKind: 'mini-band',
        maxHint: 'Nessuna mini band più dura: passa al ponte a una gamba',
      },
    ],
  },
  bandRow: {
    id: 'bandRow',
    name: 'Rematore con elastico',
    metric: 'reps',
    muscles: ['schiena'],
    secondary: ['bicipiti', 'spalle'],
    equipment: ['tube-band'],
    anchor: 'medio',
    description: 'Elastico agganciato alla porta a metà altezza. Tira le maniglie verso l’ombelico portando i gomiti indietro e stringendo le scapole.',
    tips: [
      'Petto in fuori, spalle lontane dalle orecchie',
      'Gomiti vicini al corpo',
      'Ritorno controllato, senza farti tirare dall’elastico',
    ],
    illustration: 'row',
    variants: [
      {
        id: 'row',
        name: 'Rematore con elastico',
        start: 10,
        max: 15,
        step: 1,
        loadKind: 'tube-band',
        maxHint: 'Nessun elastico più duro: fai un passo più lontano dalla porta e riparti da 10',
      },
    ],
  },
  latPulldown: {
    id: 'latPulldown',
    name: 'Lat pulldown con elastico',
    metric: 'reps',
    muscles: ['schiena'],
    secondary: ['bicipiti'],
    equipment: ['tube-band'],
    anchor: 'alto',
    description: 'In ginocchio o in piedi davanti alla porta, elastico agganciato in alto. Tira le maniglie verso il petto portando i gomiti in basso e indietro.',
    tips: [
      'Pensa a portare i gomiti nelle tasche posteriori',
      'Busto leggermente inclinato indietro',
      'Non incassare la testa tra le spalle',
    ],
    illustration: 'pulldown',
    variants: [
      {
        id: 'pulldown',
        name: 'Lat pulldown con elastico',
        start: 10,
        max: 15,
        step: 1,
        loadKind: 'tube-band',
        maxHint: 'Nessun elastico più duro: allontanati di un passo dalla porta',
      },
    ],
  },
  facePull: {
    id: 'facePull',
    name: 'Face pull',
    metric: 'reps',
    muscles: ['schiena', 'spalle'],
    secondary: ['bicipiti'],
    equipment: ['tube-band'],
    anchor: 'alto',
    description: 'Elastico agganciato in alto. Tira le maniglie verso il viso aprendo i gomiti in fuori e ruotando le mani indietro.',
    tips: [
      'Gomiti alti, all’altezza delle spalle',
      'Alla fine le mani sono ai lati delle orecchie',
      'Carico leggero, movimento pulito',
    ],
    illustration: 'facePull',
    variants: [
      {
        id: 'facepull',
        name: 'Face pull',
        start: 12,
        max: 15,
        step: 1,
        loadKind: 'tube-band',
        maxHint: 'Nessun elastico più duro: allontanati di un passo dalla porta',
      },
    ],
  },
  abWheel: {
    id: 'abWheel',
    name: 'Ab wheel in ginocchio',
    metric: 'reps',
    muscles: ['core'],
    secondary: ['schiena', 'spalle'],
    equipment: ['ab-wheel', 'mat'],
    description: 'In ginocchio sul tappetino, mani sulle impugnature. Fai rotolare la ruota in avanti tenendo la schiena neutra, poi torna indietro con gli addominali.',
    tips: [
      'Bacino in retroversione: non inarcare la schiena',
      'Vai solo fin dove controlli il ritorno',
      'Espira mentre torni indietro',
    ],
    illustration: 'abWheel',
    testLink: { test: 'crunch', ratio: 0.34 },
    variants: [
      { id: 'abwheel-partial', name: 'Ab wheel in ginocchio (escursione parziale)', start: 5, max: 10, step: 1 },
      { id: 'abwheel-wide', name: 'Ab wheel in ginocchio (escursione ampia)', start: 5, max: 10, step: 1 },
      { id: 'abwheel-full', name: 'Ab wheel in ginocchio (escursione completa)', start: 5, step: 1 },
    ],
  },
  plank: {
    id: 'plank',
    name: 'Plank',
    metric: 'seconds',
    muscles: ['core'],
    secondary: ['spalle', 'glutei'],
    equipment: ['mat'],
    description: 'Appoggio sugli avambracci e sulle punte dei piedi, corpo in linea retta. Mantieni la posizione.',
    tips: [
      'Gomiti sotto le spalle',
      'Stringi glutei e addominali',
      'Respira regolarmente, non trattenere il fiato',
    ],
    illustration: 'plank',
    testLink: { test: 'plank', ratio: 0.667 },
    variants: [{ id: 'plank', name: 'Plank', start: 30, step: 5 }],
  },
};

/** Tutti gli esercizi: quelli base del programma + le alternative della rotazione (exercises-extra.ts). */
export const EXERCISES: Record<string, ExerciseDef> = { ...BASE_EXERCISES, ...EXTRA_EXERCISES };

// ---------------------------------------------------------------- giorni
// Il primo esercizio di ogni giorno è fisso (su quello si misura la progressione e i test);
// gli altri ruotano in automatico tra l'originale e le `alternatives`.

export const DAYS: Record<'A' | 'B' | 'C', DayDef> = {
  A: {
    type: 'A',
    name: 'Giorno A — Spinta',
    focus: 'Petto, spalle, tricipiti',
    blocks: [
      { id: 'A1', exercises: ['pushup'], sets: 4, rest: 'long' },
      { id: 'A2', exercises: ['pike'], sets: 3, rest: 'short', alternatives: [['dbShoulderPress', 'bandShoulderPress', 'arnoldPress']] },
      {
        id: 'A3',
        exercises: ['dip', 'lateralRaise'],
        sets: 3,
        rest: 'short',
        alternatives: [
          ['diamondPushup', 'overheadExt', 'kickback'],
          ['bandLateralRaise', 'frontRaise'],
        ],
      },
    ],
  },
  B: {
    type: 'B',
    name: 'Giorno B — Gambe e glutei',
    focus: 'Quadricipiti, glutei, femorali',
    blocks: [
      { id: 'B1', exercises: ['squat'], sets: 4, rest: 'long' },
      { id: 'B2', exercises: ['reverseLunge'], sets: 3, rest: 'short', alternatives: [['splitSquat', 'stepUp', 'plieSquat']] },
      {
        id: 'B3',
        exercises: ['legCurl', 'gluteBridge'],
        sets: 3,
        rest: 'short',
        alternatives: [
          ['rdl', 'bandGoodMorning'],
          ['singleLegBridge', 'donkeyKick'],
        ],
      },
    ],
  },
  C: {
    type: 'C',
    name: 'Giorno C — Tirata e core',
    focus: 'Schiena, bicipiti, addominali',
    blocks: [
      { id: 'C1', exercises: ['bandRow'], sets: 4, rest: 'long' },
      {
        id: 'C2',
        exercises: ['latPulldown', 'facePull'],
        sets: 3,
        rest: 'short',
        alternatives: [
          ['straightArmPulldown', 'oneArmRow'],
          ['reverseFly', 'hammerCurl', 'dbCurl'],
        ],
      },
      {
        id: 'C3',
        exercises: ['abWheel', 'plank'],
        sets: 3,
        rest: 'short',
        alternatives: [
          ['mountainClimbers', 'bicycleCrunch', 'russianTwist', 'deadBug', 'reverseCrunch', 'ballCrunch'],
          ['sidePlank', 'superman'],
        ],
      },
    ],
  },
};

// ---------------------------------------------------------------- riscaldamento e defaticamento

export const WARMUP: TimedItem[] = [
  {
    id: 'warmup-bike',
    name: 'Cyclette',
    seconds: 90,
    equipment: ['bike'],
    description: 'Pedala a resistenza bassa per scaldarti.',
    tips: ['Resistenza bassa', 'Ritmo costante e agile', 'Schiena dritta, spalle rilassate'],
    illustration: 'bike',
    muscles: ['quadricipiti'],
    secondary: ['femorali', 'glutei'],
  },
  {
    id: 'warmup-pullapart',
    name: 'Band pull-apart',
    seconds: 30,
    equipment: ['flat-band'],
    description: 'Braccia tese davanti, apri l’elastico piatto leggero fino al petto stringendo le scapole.',
    tips: ['Braccia tese all’altezza delle spalle', 'Stringi le scapole alla fine', 'Ritorno lento'],
    illustration: 'pullApart',
    muscles: ['schiena', 'spalle'],
  },
];

export const COOLDOWN: TimedItem[] = [
  {
    id: 'stretch-chest',
    name: 'Allungamento petto',
    seconds: 30,
    equipment: [],
    description: 'In piedi, braccia tese all’altezza delle spalle: aprile all’indietro finché senti tirare il petto e mantieni.',
    tips: ['Petto in fuori, scapole strette', 'Braccia all’altezza delle spalle', 'Respira profondamente'],
    illustration: 'stretchChest',
    muscles: ['petto'],
    secondary: ['spalle'],
  },
  {
    id: 'stretch-lats',
    name: 'Allungamento dorsali',
    seconds: 30,
    equipment: [],
    description: 'In piedi, porta un braccio sopra la testa e inclinati dalla parte opposta.',
    tips: ['Metà tempo per lato', 'Bacino fermo', 'Allunga verso l’alto, non solo di lato'],
    illustration: 'stretchLats',
    muscles: ['schiena'],
    secondary: ['core'],
  },
  {
    id: 'stretch-quads',
    name: 'Allungamento quadricipiti',
    seconds: 30,
    equipment: ['chair'],
    description: 'Di spalle alla sedia, appoggia il collo del piede posteriore sulla seduta e piega leggermente la gamba davanti.',
    tips: ['Metà tempo per lato', 'Bacino in avanti, busto dritto', 'Stringi il gluteo della gamba dietro'],
    illustration: 'stretchQuads',
    muscles: ['quadricipiti'],
  },
  {
    id: 'stretch-hams',
    name: 'Allungamento femorali',
    seconds: 30,
    equipment: ['mat'],
    description: 'Seduto a gambe tese, piegati in avanti dalle anche verso le punte. Se non ci arrivi, passa un elastico attorno ai piedi.',
    tips: ['Schiena lunga, non curva', 'Ginocchia distese ma non bloccate', 'Nessun molleggio'],
    illustration: 'stretchHams',
    muscles: ['femorali'],
  },
];

/**
 * Rose per riscaldamento e defaticamento: in ogni posizione la rotazione sceglie un elemento
 * diverso a ogni sessione (il primo è quello originale).
 */
export const WARMUP_POOLS: TimedItem[][] = [[WARMUP[0], RUN_IN_PLACE], [WARMUP[1], ...EXTRA_WARMUP]];
export const COOLDOWN_POOLS: TimedItem[][] = [
  [COOLDOWN[0]],
  [COOLDOWN[1], EXTRA_COOLDOWN.lats],
  [COOLDOWN[2], EXTRA_COOLDOWN.quads],
  [COOLDOWN[3], EXTRA_COOLDOWN.hams],
];

export const ACTIVE_REST = {
  name: 'Riposo attivo',
  description: '15-20 minuti di cyclette leggera, facoltativa.',
  minutes: 20,
};

// ---------------------------------------------------------------- test

export const TESTS: TestDef[] = [
  {
    id: 'pushups',
    name: 'Piegamenti',
    metric: 'reps',
    mode: 'max',
    unit: 'rip',
    description: 'Il massimo numero di piegamenti in una serie, con buona forma.',
    tips: ['Petto che sfiora il pavimento', 'Corpo dritto', 'Ti fermi quando la forma cede'],
    illustration: 'pushup',
    muscles: ['petto'],
    secondary: ['tricipiti', 'spalle'],
  },
  {
    id: 'squat',
    name: 'Squat',
    metric: 'reps',
    mode: 'max',
    unit: 'rip',
    description: 'Il massimo numero di squat a corpo libero in una serie.',
    tips: ['Cosce parallele al pavimento', 'Talloni a terra', 'Ritmo costante'],
    illustration: 'squat',
    muscles: ['quadricipiti', 'glutei'],
    secondary: ['femorali'],
  },
  {
    id: 'plank',
    name: 'Plank',
    metric: 'seconds',
    mode: 'max',
    unit: 's',
    description: 'Tieni il plank il più a lungo possibile. Premi Stop quando il bacino cede.',
    tips: ['Gomiti sotto le spalle', 'Corpo in linea', 'Stop quando la posizione cede'],
    illustration: 'plank',
    muscles: ['core'],
    secondary: ['spalle'],
  },
  {
    id: 'burpees',
    name: 'Burpees',
    metric: 'reps',
    mode: { seconds: 60 },
    unit: 'rip in 1 min',
    description: 'Quanti burpees completi fai in 1 minuto.',
    tips: ['Petto a terra, poi salto', 'Braccia sopra la testa nel salto', 'Tieni un ritmo sostenibile'],
    illustration: 'burpee',
    muscles: ['quadricipiti', 'petto'],
    secondary: ['spalle', 'tricipiti', 'core', 'glutei'],
  },
  {
    id: 'crunch',
    name: 'Crunch',
    metric: 'reps',
    mode: { seconds: 60 },
    unit: 'rip in 1 min',
    description: 'Quanti crunch fai in 1 minuto.',
    tips: ['Scapole staccate da terra', 'Non tirare il collo', 'Zona lombare appoggiata'],
    illustration: 'crunch',
    muscles: ['core'],
  },
];
