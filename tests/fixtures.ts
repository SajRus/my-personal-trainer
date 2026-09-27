// Dati d'esempio per i test: sono i valori da cui è stata ricavata la tabella del programma
// (es. 11 piegamenti al test → 4×6). Non sono usati dall'app.
import type { Equipment, TestValues } from '../src/domain/types';

export const EXAMPLE_TESTS: TestValues = { pushups: 11, squat: 20, plank: 45, burpees: 10, crunch: 15 };

export const EXAMPLE_EQUIPMENT: Equipment[] = [
  { id: 'tube-yellow', kind: 'tube-band', name: 'Giallo – leggero', color: '#eab308', level: 1 },
  { id: 'tube-red', kind: 'tube-band', name: 'Rosso – medio', color: '#ef4444', level: 2 },
  { id: 'tube-blue', kind: 'tube-band', name: 'Blu – duro', color: '#3b82f6', level: 3 },
  { id: 'tube-black', kind: 'tube-band', name: 'Nero – molto duro', color: '#6b7280', level: 4 },
  { id: 'flat-light', kind: 'flat-band', name: 'Fascia leggera', color: '#a3e635', level: 1 },
  { id: 'flat-medium', kind: 'flat-band', name: 'Fascia media', color: '#f97316', level: 2 },
  { id: 'mini-light', kind: 'mini-band', name: 'Mini band leggera', color: '#facc15', level: 1 },
  { id: 'mini-medium', kind: 'mini-band', name: 'Mini band media', color: '#22c55e', level: 2 },
  { id: 'mini-hard', kind: 'mini-band', name: 'Mini band dura', color: '#a855f7', level: 3 },
  { id: 'db-1', kind: 'dumbbell', name: 'Manubri 1 kg', level: 1, quantity: 2 },
  { id: 'db-2', kind: 'dumbbell', name: 'Manubri 2 kg', level: 2, quantity: 2 },
  { id: 'ball', kind: 'ball', name: 'Palla da pilates', level: 1 },
  { id: 'mat', kind: 'mat', name: 'Tappetino', level: 1 },
  { id: 'ab-wheel', kind: 'ab-wheel', name: 'Ruota per addominali', level: 1 },
  { id: 'bike', kind: 'bike', name: 'Cyclette', level: 1 },
  { id: 'chair', kind: 'chair', name: 'Sedia stabile', level: 1 },
];
