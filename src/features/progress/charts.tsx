// Stile comune dei grafici (tema scuro). Palette validata per il daltonismo sulla superficie
// delle card (#151b23): blu, arancio, acqua, giallo — ΔE CVD minimo 8,4, contrasto ≥ 3:1.

import { useState, type ReactNode } from 'react';

export const CHART = {
  series: ['#3987e5', '#d95926', '#199e70', '#c98500'],
  grid: '#243040',
  axis: '#94a3b8',
  surface: '#151b23',
  text: '#e2e8f0',
};

export const axisProps = {
  stroke: CHART.grid,
  tick: { fill: CHART.axis, fontSize: 12 },
  tickLine: false,
  axisLine: false,
} as const;

export function ChartTooltip({
  active,
  payload,
  label,
  unit,
  labelFormat,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; dataKey: string }[];
  label?: string | number;
  unit?: string;
  labelFormat?: (l: string | number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-bg/95 px-3 py-2 text-sm shadow-lg">
      <div className="mb-1 text-slate-400">{label !== undefined && labelFormat ? labelFormat(label) : label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-slate-100">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums">
            {p.value}
            {unit ? ` ${unit}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Sezione con titolo, grafico e interruttore per la vista a tabella (accessibile anche senza colori). */
export function ChartSection({
  title,
  subtitle,
  table,
  children,
}: {
  title: string;
  subtitle?: string;
  table?: { head: string[]; rows: (string | number)[][] };
  children: ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
        {table && table.rows.length > 0 && (
          <button type="button" className="shrink-0 rounded-full bg-line px-3 py-1 text-sm text-slate-300" onClick={() => setAsTable((v) => !v)}>
            {asTable ? 'Grafico' : 'Tabella'}
          </button>
        )}
      </div>
      {asTable && table ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-left text-slate-400">
                {table.head.map((h) => (
                  <th key={h} className="py-1 pr-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-t border-line">
                  {r.map((c, j) => (
                    <td key={j} className="py-1.5 pr-3">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-slate-500">{text}</p>;
}
