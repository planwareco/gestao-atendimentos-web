import { cn } from '@/lib/cn';

/**
 * Marca do produto Simbora Gerir: monograma "S" que vira "$" pelas hastes de destaque.
 * `claro` para fundos escuros; `compacto` mostra só o símbolo.
 */
export function Logo({ claro, compacto, className }: { claro?: boolean; compacto?: boolean; className?: string }) {
  return (
    <span className={cn('logo', claro && 'logo--light', className)}>
      <svg viewBox="0 0 64 64" width="32" height="32" aria-hidden="true" className="logo__mark">
        <rect width="64" height="64" rx="18" fill="currentColor" className="logo__bg" />
        <path d="M32 9.6v3.4M32 51v3.4" strokeWidth="5.6" strokeLinecap="round" className="logo__dot" />
        <path
          transform="translate(32 32) scale(.84) translate(-32.1 -33.9)"
          d="M42.6 23.2C40.9 19.9 37 17.8 32.1 17.8c-6.3 0-10.6 3.3-10.6 7.9 0 4.9 4.4 6.6 10.7 7.9 6.6 1.3 11.1 3.3 11.1 8.4 0 4.8-4.6 8.2-11.1 8.2-5.3 0-9.5-2.2-11.4-5.8"
          strokeWidth="7.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="logo__glyph"
        />
      </svg>
      {!compacto && (
        <span className="logo__text">
          Simbora <span className="logo__accent">Gerir</span>
        </span>
      )}
    </span>
  );
}
