import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-black active:bg-green-400',
  secondary: 'bg-line text-slate-100 active:bg-slate-600',
  ghost: 'bg-transparent text-slate-300 active:bg-line',
  danger: 'bg-red-600 text-white active:bg-red-500',
};

export function Button({
  variant = 'secondary',
  big,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; big?: boolean }) {
  return (
    <button
      type="button"
      className={`rounded-2xl font-semibold transition-colors disabled:opacity-40 ${
        big ? 'min-h-[4.5rem] px-6 text-2xl' : 'min-h-[3.25rem] px-4 text-lg'
      } ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-card p-4 ${className}`}>{children}</div>;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  step = 1,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        aria-label="Meno"
        className="h-20 w-20 shrink-0 rounded-2xl bg-line text-4xl font-bold active:bg-slate-600"
        onClick={() => onChange(Math.max(min, value - step))}
      >
        −
      </button>
      <div className="text-center">
        <div className="text-6xl font-bold tabular-nums">{value}</div>
        {unit && <div className="text-sm text-slate-400">{unit}</div>}
      </div>
      <button
        type="button"
        aria-label="Più"
        className="h-20 w-20 shrink-0 rounded-2xl bg-line text-4xl font-bold active:bg-slate-600"
        onClick={() => onChange(value + step)}
      >
        +
      </button>
    </div>
  );
}

export function Chip({
  active,
  color,
  children,
  onClick,
}: {
  active?: boolean;
  color?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[2.75rem] items-center gap-2 rounded-full border px-4 text-base ${
        active ? 'border-accent bg-accent/15 text-white' : 'border-line bg-card text-slate-300'
      }`}
    >
      {color && <span className="h-3 w-3 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={onClose}>
      <div
        className="safe-bottom max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border-t border-line bg-bg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
        {children}
        <Button className="mt-5 w-full" onClick={onClose}>
          Chiudi
        </Button>
      </div>
    </div>
  );
}

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'accent' | 'warn' | 'rest' }) {
  const tones = {
    default: 'bg-line text-slate-300',
    accent: 'bg-accent/20 text-accent',
    warn: 'bg-warn/20 text-warn',
    rest: 'bg-rest/20 text-rest',
  };
  return <span className={`inline-block shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-[3rem] w-full items-center justify-between gap-3 text-left text-lg"
    >
      <span>{label}</span>
      <span className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-line'}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${checked ? 'left-7' : 'left-1'}`} />
      </span>
    </button>
  );
}

/** Riga compatta "etichetta  [−] valore [+]" per le impostazioni numeriche. */
export function NumberRow({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  unit?: string;
}) {
  return (
    <div className="flex min-h-[3rem] items-center justify-between gap-3">
      <span className="text-lg">{label}</span>
      <span className="flex items-center gap-2">
        <button type="button" aria-label={`${label}: meno`} className="h-11 w-11 rounded-xl bg-line text-2xl" onClick={() => onChange(Math.max(min, value - step))}>
          −
        </button>
        <span className="w-16 text-center text-lg tabular-nums">
          {value}
          {unit && <span className="text-sm text-slate-400"> {unit}</span>}
        </span>
        <button type="button" aria-label={`${label}: più`} className="h-11 w-11 rounded-xl bg-line text-2xl" onClick={() => onChange(value + step)}>
          +
        </button>
      </span>
    </div>
  );
}
