import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MEDIA } from '../src/data/media';
import { COOLDOWN_POOLS, EXERCISES, TESTS, WARMUP_POOLS } from '../src/data/program';

describe('immagini degli esercizi', () => {
  const keys = [
    ...Object.values(EXERCISES).map((e) => e.illustration),
    ...WARMUP_POOLS.flat().map((w) => w.illustration),
    ...COOLDOWN_POOLS.flat().map((c) => c.illustration),
    ...TESTS.map((t) => t.illustration),
  ];

  it.each(keys)('%s ha immagini, licenza e fonte', (key) => {
    const m = MEDIA[key];
    expect(m, key).toBeDefined();
    expect(m.frames.length).toBeGreaterThan(0);
    expect(m.license).not.toBe('');
    expect(m.source).toMatch(/^https:\/\//);
  });

  it('tutti i file esistono in public/', () => {
    for (const m of Object.values(MEDIA)) {
      for (const f of m.frames) expect(existsSync(`public/${f}`), f).toBe(true);
    }
  });
});
