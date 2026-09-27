// Genera un evento ricorrente giornaliero in formato iCalendar (.ics) con un avviso,
// da importare nel Calendario di iPhone.

const pad = (n: number) => String(n).padStart(2, '0');

function stamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export interface ReminderInput {
  /** Primo giorno, "2026-09-28" */
  startDate: string;
  /** Orario "07:30" (ora locale del telefono) */
  time: string;
  durationMin?: number;
  url?: string;
  uid?: string;
  now?: Date;
}

export function buildReminderIcs({ startDate, time, durationMin = 15, url, uid, now = new Date() }: ReminderInput): string {
  const [h, m] = time.split(':').map(Number);
  const date = startDate.replace(/-/g, '');
  const endTotal = h * 60 + m + durationMin;
  const start = `${date}T${pad(h)}${pad(m)}00`;
  const end = `${date}T${pad(Math.floor(endTotal / 60) % 24)}${pad(endTotal % 60)}00`;
  const description = `15 minuti di allenamento in camera.${url ? `\nApri l'app: ${url}` : ''}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//myPersonalTrainer//IT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid ?? `allenamento-${date}@mypersonaltrainer`}`,
    `DTSTAMP:${stamp(now)}`,
    // ora "flottante" (senza fuso): resta all'orario scelto anche col cambio dell'ora legale
    `DTSTART:${start}`,
    `DTEND:${end}`,
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escapeText('💪 Allenamento (15 min)')}`,
    `DESCRIPTION:${escapeText(description)}`,
    ...(url ? [`URL:${url}`] : []),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText('È ora di allenarsi!')}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}
