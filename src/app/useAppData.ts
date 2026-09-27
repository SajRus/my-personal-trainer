import { useLiveQuery } from 'dexie-react-hooks';
import { repo } from '../storage';
import { loadAll, type AppData } from './trainer';

/**
 * Dati dell'app, aggiornati in automatico quando cambiano nel database.
 * `undefined` = in caricamento, `null` = primo avvio (nessun profilo).
 */
export function useAppData(): AppData | null | undefined {
  return useLiveQuery(() => loadAll(repo), []);
}
