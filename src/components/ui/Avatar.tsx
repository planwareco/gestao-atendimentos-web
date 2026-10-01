import type { CSSProperties } from 'react';
import { corDoTexto, iniciais } from '@/lib/masks';

/** Avatar com iniciais e cor estável por nome (ou cor explícita, ex.: do profissional). */
export function Avatar({ nome, size = 36, cor }: { nome: string; size?: number; cor?: string | null }) {
  return (
    <span className="avatar" aria-hidden="true" style={{ '--size': `${size}px`, '--avatar-bg': cor ?? corDoTexto(nome) } as CSSProperties}>
      {iniciais(nome)}
    </span>
  );
}
