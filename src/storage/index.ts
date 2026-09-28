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

const WEEK_MS = 7 * 86_400_000;

/**
 * Copia di sicurezza automatica all'avvio: dopo ogni aggiornamento dell'app (prima che il codice
 * nuovo scriva qualcosa) e comunque almeno una volta a settimana.
 */
let autoSnapshotRun: Promise<void> | null = null;

export function autoSnapshot(build: string = __BUILD_ID__): Promise<void> {
  // una sola volta per apertura dell'app, anche se chiamata più volte
  autoSnapshotRun ??= doAutoSnapshot(build);
  return autoSnapshotRun;
}

async function doAutoSnapshot(build: string) {
  try {
    if (!(await repo.getProfile())) return;
    const last = (await repo.listSnapshots())[0];
    if (!last || last.build !== build) {
      await repo.saveSnapshot(last ? 'Aggiornamento dell’app' : 'Prima copia di sicurezza', build);
    } else if (Date.now() - Date.parse(last.createdAt) > WEEK_MS) {
      await repo.saveSnapshot('Copia settimanale', build);
    }
  } catch {
    // una copia non riuscita non deve bloccare l'app
  }
}

export type { Repository };
