import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

export interface OpcaoAba<T extends string> {
  valor: T;
  label: string;
  icon?: string;
}

/** Abas com navegação por setas (padrão WAI-ARIA). */
export function Tabs<T extends string>({ abas, valor, onChange, label }: { abas: OpcaoAba<T>[]; valor: T; onChange: (v: T) => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const tecla = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const prox = (i + (e.key === 'ArrowRight' ? 1 : -1) + abas.length) % abas.length;
    onChange(abas[prox].valor);
    ref.current?.querySelectorAll<HTMLButtonElement>('button')[prox]?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={label} ref={ref}>
      {abas.map((a, i) => (
        <button
          key={a.valor}
          role="tab"
          type="button"
          aria-selected={a.valor === valor}
          tabIndex={a.valor === valor ? 0 : -1}
          onClick={() => onChange(a.valor)}
          onKeyDown={(e) => tecla(e, i)}
        >
          {a.icon && <i className={cn('bx', a.icon)} aria-hidden="true" />}
          {a.label}
        </button>
      ))}
    </div>
  );
}

/** Controle segmentado (filtros curtos). */
export function Segmented<T extends string>({ opcoes, valor, onChange, label }: { opcoes: OpcaoAba<T>[]; valor: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {opcoes.map((o) => (
        <button key={o.valor} type="button" aria-pressed={o.valor === valor} onClick={() => onChange(o.valor)}>
          {o.icon && <i className={cn('bx', o.icon)} aria-hidden="true" style={{ marginRight: 4 }} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
