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
};
