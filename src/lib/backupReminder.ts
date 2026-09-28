// Promemoria per il backup esterno (l'unica protezione se si cancella l'app dal telefono).
// Si ricorda solo su questo dispositivo: è una comodità, non un dato dell'allenamento.

const KEY = 'mpt-last-export';
const EVERY_DAYS = 14;

export function markExported(now = new Date()) {
  try {
    localStorage.setItem(KEY, now.toISOString());
  } catch {
    // archivio non disponibile: pazienza
  }
}

export function lastExport(): Date | null {
  try {
    const v = localStorage.getItem(KEY);
    return v ? new Date(v) : null;
  } catch {
    return null;
  }
}

/** Vale la pena ricordarlo: ci sono abbastanza dati e l'ultimo backup è vecchio (o non c'è). */
export function shouldRemindBackup(sessions: number, now = new Date()): boolean {
  if (sessions < 6) return false;
  const last = lastExport();
  return !last || now.getTime() - last.getTime() > EVERY_DAYS * 86_400_000;
}
