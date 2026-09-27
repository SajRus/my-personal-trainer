import { DexieRepository } from './dexieRepository';
import type { Repository } from './repository';

export const repo: Repository = new DexieRepository();

// Chiede al browser di non cancellare i dati quando lo spazio scarseggia.
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // non supportato: pazienza
  }
}

export type { Repository };
