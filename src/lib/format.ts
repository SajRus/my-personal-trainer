export function mmss(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function minutes(totalSec: number): string {
  return `${Math.round(totalSec / 60)} min`;
}

export function targetLabel(value: number, metric: 'reps' | 'seconds', perSide?: boolean): string {
  if (metric === 'seconds') return `${value} s`;
  return perSide ? `${value} per gamba` : `${value} rip`;
}
