import { cn } from '@/lib/cn';

/** Marca do produto: monograma + nome. `claro` para fundos escuros. */
export function Logo({ claro, compacto, className }: { claro?: boolean; compacto?: boolean; className?: string }) {
  return (
    <span className={cn('logo', claro && 'logo--light', className)}>
      <svg viewBox="0 0 64 64" width="32" height="32" aria-hidden="true" className="logo__mark">
        <rect width="64" height="64" rx="18" fill="currentColor" className="logo__bg" />
        <path d="M18 44 30 18h4l12 26h-6.4l-2.6-6H27l-2.6 6zm11.2-11h7.6L33 24.2z" className="logo__glyph" />
        <circle cx="47" cy="17" r="5" className="logo__dot" />
      </svg>
      {!compacto && <span className="logo__text">Atendo</span>}
    </span>
  );
}
