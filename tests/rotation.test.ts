import { describe, expect, it } from 'vitest';
import { buildEquipment, DAYS, EXERCISES } from '../src/data/program';
import { addDays } from '../src/domain/dates';
import { canDoExercise, chooseDay, occurrence } from '../src/domain/rotation';
import { EXAMPLE_EQUIPMENT } from './fixtures';

const START = '2026-09-28'; // lunedì: A lun/gio, B mar/ven, C mer/sab

describe('rotazione automatica', () => {
  it('conta le volte che è capitato lo stesso tipo di giorno', () => {
    expect(occurrence(START, START, 'A')).toBe(0); // primo lunedì
    expect(occurrence(START, addDays(START, 3), 'A')).toBe(1); // giovedì
    expect(occurrence(START, addDays(START, 7), 'A')).toBe(2); // lunedì dopo
  });

  it('il primo esercizio di ogni giorno resta fisso', () => {
    for (let w = 0; w < 6; w++) {
      expect(chooseDay('A', addDays(START, w * 7), START, EXAMPLE_EQUIPMENT).blocks[0]).toEqual(['pushup']);
      expect(chooseDay('B', addDays(START, w * 7 + 1), START, EXAMPLE_EQUIPMENT).blocks[0]).toEqual(['squat']);
      expect(chooseDay('C', addDays(START, w * 7 + 2), START, EXAMPLE_EQUIPMENT).blocks[0]).toEqual(['bandRow']);
    }
  });

  it('due sessioni di fila dello stesso tipo non sono mai uguali', () => {
    for (const [type, offset] of [['A', 0], ['B', 1], ['C', 2]] as const) {
      const dates = Array.from({ length: 8 }, (_, i) => addDays(START, offset + Math.floor(i / 2) * 7 + (i % 2) * 3));
      const sessions = dates.map((d) => JSON.stringify(chooseDay(type, d, START, EXAMPLE_EQUIPMENT).blocks.slice(1)));
      for (let i = 1; i < sessions.length; i++) expect(sessions[i], `${type} sessione ${i}`).not.toBe(sessions[i - 1]);
    }
  });

  it('in poche settimane usa tutte le alternative', () => {
    const seen = new Set<string>();
    for (let w = 0; w < 8; w++) {
      for (const off of [0, 3]) chooseDay('C', addDays(START, w * 7 + 2 + off), START, EXAMPLE_EQUIPMENT).blocks.flat().forEach((id) => seen.add(id));
    }
    const all = DAYS.C.blocks.flatMap((b) => [...b.exercises, ...(b.alternatives ?? []).flat()]);
    expect([...seen].sort()).toEqual([...new Set(all)].sort());
  });

  it('è deterministica: la stessa data dà sempre la stessa scelta (anteprima affidabile)', () => {
    const d = addDays(START, 17);
    expect(chooseDay('B', d, START, EXAMPLE_EQUIPMENT)).toEqual(chooseDay('B', d, START, EXAMPLE_EQUIPMENT));
  });

  it('sceglie solo esercizi possibili con l’attrezzatura posseduta', () => {
    const bodyweightOnly = buildEquipment(['mat', 'chair'], []);
    const owned = new Set(bodyweightOnly.map((e) => e.kind));
    for (let i = 0; i < 20; i++) {
      const c = chooseDay('A', addDays(START, i * 7), START, bodyweightOnly);
      // slot 2 (spalle) e 3 (tricipiti): senza manubri né elastici restano pike e dip / mani strette
      expect(['pike']).toContain(c.blocks[1][0]);
      expect(['dip', 'diamondPushup']).toContain(c.blocks[2][0]);
      for (const id of c.blocks.slice(1).flat().filter((x) => x !== 'lateralRaise')) {
        expect(canDoExercise(EXERCISES[id], owned), id).toBe(true);
      }
    }
  });

  it('senza cyclette il riscaldamento usa la corsa sul posto', () => {
    const noBike = buildEquipment(['mat'], []);
    for (let i = 0; i < 6; i++) {
      expect(chooseDay('A', addDays(START, i), START, noBike).warmup[0].id).toBe('warmup-run');
    }
  });

  it('anche riscaldamento e defaticamento cambiano da un giorno all’altro', () => {
    const w = [0, 1, 2].map((i) => chooseDay('A', addDays(START, i), START, EXAMPLE_EQUIPMENT).warmup[1].id);
    expect(new Set(w).size).toBeGreaterThan(1);
  });
});
