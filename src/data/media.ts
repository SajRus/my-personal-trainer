// ============================================================================
//  IMMAGINI DEGLI ESERCIZI — foto con licenza libera, salvate in public/exercises
//  così funzionano offline. Ogni esercizio ha 1-4 fotogrammi (posizione
//  iniziale → finale) che l'app alterna come una piccola animazione.
//
//  Fonti:
//  - free-exercise-db (https://github.com/yuhonas/free-exercise-db): pubblico dominio (Unlicense)
//  - Wikimedia Commons: licenze Creative Commons, con attribuzione all'autore
// ============================================================================

export interface ExerciseMedia {
  frames: string[];
  /** Pagina da cui proviene l'immagine. */
  source: string;
  license: string;
  author?: string;
  /** Avviso quando la foto non è identica alla nostra variante (es. cavo al posto dell'elastico). */
  note?: string;
}

const FEDB = 'free-exercise-db';
const PD = 'Pubblico dominio (Unlicense)';
const fedb = (id: string) => `https://github.com/yuhonas/free-exercise-db/tree/main/exercises/${id}`;

const frames = (key: string, n: number) =>
  Array.from({ length: n }, (_, i) => `exercises/${key}-${i}.webp`);

export const MEDIA: Record<string, ExerciseMedia> = {
  pushup: { frames: frames('pushup', 2), source: fedb('Pushups'), license: PD, author: FEDB },
  pike: {
    frames: frames('pike', 1),
    source: 'https://commons.wikimedia.org/wiki/File:Downward-Facing-Dog.JPG',
    license: 'CC BY 3.0',
    author: 'Iveto (Wikimedia Commons)',
    note: 'Posizione di partenza (V rovesciata). Da qui piega i gomiti e porta la testa verso terra.',
  },
  dip: {
    frames: frames('dip', 2),
    source: fedb('Bench_Dips'),
    license: PD,
    author: FEDB,
    note: 'In foto su una panca: con la sedia il movimento è lo stesso.',
  },
  lateralRaise: { frames: frames('lateralRaise', 2), source: fedb('Side_Lateral_Raise'), license: PD, author: FEDB },
  squat: { frames: frames('squat', 2), source: fedb('Bodyweight_Squat'), license: PD, author: FEDB },
  lunge: {
    frames: frames('lunge', 2),
    source: fedb('Dumbbell_Rear_Lunge'),
    license: PD,
    author: FEDB,
    note: 'In foto con i manubri: all’inizio falli a corpo libero.',
  },
  legCurl: { frames: frames('legCurl', 2), source: fedb('Ball_Leg_Curl'), license: PD, author: FEDB },
  bridge: {
    frames: frames('bridge', 2),
    source: fedb('Butt_Lift_Bridge'),
    license: PD,
    author: FEDB,
    note: 'Aggiungi la mini band sopra le ginocchia.',
  },
  row: {
    frames: frames('row', 2),
    source: fedb('Seated_Cable_Rows'),
    license: PD,
    author: FEDB,
    note: 'In foto al cavo: con l’elastico agganciato alla porta (altezza media) il movimento è lo stesso.',
  },
  pulldown: {
    frames: frames('pulldown', 2),
    source: fedb('Kneeling_High_Pulley_Row'),
    license: PD,
    author: FEDB,
    note: 'In foto al cavo alto: usa l’elastico agganciato in alto alla porta.',
  },
  facePull: {
    frames: frames('facePull', 2),
    source: fedb('Face_Pull'),
    license: PD,
    author: FEDB,
    note: 'In foto al cavo: usa l’elastico agganciato in alto alla porta.',
  },
  abWheel: { frames: frames('abWheel', 2), source: fedb('Ab_Roller'), license: PD, author: FEDB },
  plank: { frames: frames('plank', 1), source: fedb('Plank'), license: PD, author: FEDB },
  bike: { frames: frames('bike', 2), source: fedb('Bicycling_Stationary'), license: PD, author: FEDB },
  pullApart: { frames: frames('pullApart', 2), source: fedb('Band_Pull_Apart'), license: PD, author: FEDB },
  stretchChest: { frames: frames('stretchChest', 2), source: fedb('Dynamic_Chest_Stretch'), license: PD, author: FEDB },
  stretchLats: { frames: frames('stretchLats', 2), source: fedb('Standing_Lateral_Stretch'), license: PD, author: FEDB },
  stretchQuads: {
    frames: frames('stretchQuads', 2),
    source: fedb('Standing_Elevated_Quad_Stretch'),
    license: PD,
    author: FEDB,
    note: 'In foto su uno step: usa la sedia.',
  },
  stretchHams: {
    frames: frames('stretchHams', 2),
    source: fedb('Seated_Hamstring_and_Calf_Stretch'),
    license: PD,
    author: FEDB,
    note: 'L’elastico attorno ai piedi è facoltativo.',
  },
  burpee: {
    frames: frames('burpee', 4),
    source: 'https://commons.wikimedia.org/wiki/Category:Burpees',
    license: 'CC BY-SA 4.0',
    author: 'Taco fleur (Wikimedia Commons)',
  },
  crunch: { frames: frames('crunch', 2), source: fedb('Crunches'), license: PD, author: FEDB },

  // ---- esercizi della rotazione automatica
  dbShoulderPress: { frames: frames('dbShoulderPress', 2), source: fedb('Dumbbell_Shoulder_Press'), license: PD, author: FEDB, note: 'In foto su una panca: usa la sedia, oppure fallo in piedi.' },
  bandShoulderPress: { frames: frames('bandShoulderPress', 2), source: fedb('Shoulder_Press_-_With_Bands'), license: PD, author: FEDB },
  arnoldPress: { frames: frames('arnoldPress', 2), source: fedb('Arnold_Dumbbell_Press'), license: PD, author: FEDB, note: 'In foto su una panca: usa la sedia.' },
  diamondPushup: { frames: frames('diamondPushup', 2), source: fedb('Push-Ups_-_Close_Triceps_Position'), license: PD, author: FEDB },
  overheadExt: { frames: frames('overheadExt', 2), source: fedb('Standing_Dumbbell_Triceps_Extension'), license: PD, author: FEDB },
  kickback: { frames: frames('kickback', 2), source: fedb('Tricep_Dumbbell_Kickback'), license: PD, author: FEDB, note: 'In foto su una panca: appoggiati alla sedia.' },
  bandLateralRaise: { frames: frames('bandLateralRaise', 2), source: fedb('Lateral_Raise_-_With_Bands'), license: PD, author: FEDB },
  frontRaise: { frames: frames('frontRaise', 2), source: fedb('Front_Dumbbell_Raise'), license: PD, author: FEDB },
  splitSquat: { frames: frames('splitSquat', 2), source: fedb('Split_Squat_with_Dumbbells'), license: PD, author: FEDB, note: 'In foto con i manubri: all’inizio a corpo libero.' },
  stepUp: { frames: frames('stepUp', 2), source: fedb('Dumbbell_Step_Ups'), license: PD, author: FEDB, note: 'In foto su una panca e con manubri: usa una sedia stabile, all’inizio senza pesi.' },
  plieSquat: { frames: frames('plieSquat', 2), source: fedb('Plie_Dumbbell_Squat'), license: PD, author: FEDB },
  rdl: { frames: frames('rdl', 2), source: fedb('Stiff-Legged_Dumbbell_Deadlift'), license: PD, author: FEDB },
  bandGoodMorning: { frames: frames('bandGoodMorning', 2), source: fedb('Band_Good_Morning'), license: PD, author: FEDB },
  singleLegBridge: { frames: frames('singleLegBridge', 2), source: fedb('Single_Leg_Glute_Bridge'), license: PD, author: FEDB },
  donkeyKick: { frames: frames('donkeyKick', 2), source: fedb('Glute_Kickback'), license: PD, author: FEDB },
  straightArmPulldown: { frames: frames('straightArmPulldown', 2), source: fedb('Straight-Arm_Pulldown'), license: PD, author: FEDB, note: 'In foto al cavo: usa l’elastico agganciato in alto alla porta.' },
  oneArmRow: { frames: frames('oneArmRow', 2), source: fedb('One-Arm_Dumbbell_Row'), license: PD, author: FEDB, note: 'In foto su una panca: appoggiati alla sedia.' },
  reverseFly: { frames: frames('reverseFly', 2), source: fedb('Back_Flyes_-_With_Bands'), license: PD, author: FEDB, note: 'Elastico agganciato davanti a te, all’altezza del petto.' },
  hammerCurl: { frames: frames('hammerCurl', 2), source: fedb('Hammer_Curls'), license: PD, author: FEDB },
  dbCurl: { frames: frames('dbCurl', 2), source: fedb('Dumbbell_Bicep_Curl'), license: PD, author: FEDB },
  mountainClimbers: { frames: frames('mountainClimbers', 2), source: fedb('Mountain_Climbers'), license: PD, author: FEDB },
  bicycleCrunch: { frames: frames('bicycleCrunch', 2), source: fedb('Air_Bike'), license: PD, author: FEDB },
  russianTwist: { frames: frames('russianTwist', 2), source: fedb('Russian_Twist'), license: PD, author: FEDB, note: 'In foto con un disco: va bene a mani libere o con un manubrio.' },
  deadBug: { frames: frames('deadBug', 2), source: fedb('Dead_Bug'), license: PD, author: FEDB },
  reverseCrunch: { frames: frames('reverseCrunch', 2), source: fedb('Reverse_Crunch'), license: PD, author: FEDB },
  ballCrunch: { frames: frames('ballCrunch', 2), source: fedb('Exercise_Ball_Crunch'), license: PD, author: FEDB },
  sidePlank: { frames: frames('sidePlank', 2), source: fedb('Side_Bridge'), license: PD, author: FEDB },
  superman: { frames: frames('superman', 2), source: fedb('Superman'), license: PD, author: FEDB },
  armCircles: { frames: frames('armCircles', 2), source: fedb('Arm_Circles'), license: PD, author: FEDB },
  inchworm: { frames: frames('inchworm', 2), source: fedb('Inchworm'), license: PD, author: FEDB },
  starJump: { frames: frames('starJump', 2), source: fedb('Star_Jump'), license: PD, author: FEDB, note: 'Il jumping jack è la versione senza salto alto: apri e chiudi gambe e braccia.' },
  stretchOverhead: { frames: frames('stretchOverhead', 2), source: fedb('Overhead_Stretch'), license: PD, author: FEDB },
  stretchQuadsFloor: { frames: frames('stretchQuadsFloor', 2), source: fedb('All_Fours_Quad_Stretch'), license: PD, author: FEDB },
  stretchHamsBand: { frames: frames('stretchHamsBand', 2), source: fedb('Hamstring_Stretch'), license: PD, author: FEDB, note: 'Va bene l’elastico tubolare o la fascia.' },
  runInPlace: { frames: frames('runInPlace', 2), source: fedb('Fast_Skipping'), license: PD, author: FEDB, note: 'Sul posto: ginocchia alte e braccia che accompagnano.' },

  // ---- attrezzi aggiunti: sbarra, kettlebell, TRX, corda, rullo
  pullUp: { frames: frames('pullUp', 2), source: fedb('Pullups'), license: PD, author: FEDB },
  chinUp: { frames: frames('chinUp', 2), source: fedb('Chin-Up'), license: PD, author: FEDB },
  hangingKneeRaise: { frames: frames('hangingKneeRaise', 2), source: fedb('Hanging_Leg_Raise'), license: PD, author: FEDB, note: 'In foto a gambe tese: con le ginocchia piegate è più facile, si parte da lì.' },
  gobletSquat: { frames: frames('gobletSquat', 2), source: fedb('Goblet_Squat'), license: PD, author: FEDB },
  kbSwing: { frames: frames('kbSwing', 2), source: fedb('One-Arm_Kettlebell_Swings'), license: PD, author: FEDB, note: 'In foto a un braccio: a due mani è più semplice e sicuro.' },
  kbRow: { frames: frames('kbRow', 2), source: fedb('Alternating_Kettlebell_Row'), license: PD, author: FEDB, note: 'In foto con due kettlebell: va bene anche uno alla volta.' },
  trxRow: { frames: frames('trxRow', 2), source: fedb('Suspended_Row'), license: PD, author: FEDB, note: 'In foto con gli anelli: con il TRX il movimento è lo stesso.' },
  trxSplitSquat: { frames: frames('trxSplitSquat', 2), source: fedb('Suspended_Split_Squat'), license: PD, author: FEDB },
  trxKneeTuck: { frames: frames('trxKneeTuck', 2), source: fedb('Suspended_Reverse_Crunch'), license: PD, author: FEDB, note: 'Piedi nelle cinghie: in foto la versione che solleva il bacino.' },
  jumpRope: { frames: frames('jumpRope', 2), source: fedb('Rope_Jumping'), license: PD, author: FEDB },
  rollLats: { frames: frames('rollLats', 2), source: fedb('Latissimus_Dorsi-SMR'), license: PD, author: FEDB },
  rollQuads: { frames: frames('rollQuads', 2), source: fedb('Quadriceps-SMR'), license: PD, author: FEDB },
  rollHams: { frames: frames('rollHams', 2), source: fedb('Hamstring-SMR'), license: PD, author: FEDB },
};
