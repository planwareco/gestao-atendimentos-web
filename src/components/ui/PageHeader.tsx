import type { ReactNode } from 'react';
import { useTitulo } from '@/lib/hooks';

/** Cabeçalho de página: título, descrição curta e ações à direita. */
export function PageHeader({ titulo, descricao, acoes, voltar }: { titulo: string; descricao?: ReactNode; acoes?: ReactNode; voltar?: ReactNode }) {
  useTitulo(titulo);
  return (
    <header className="page-head" data-aos="fade-up" data-aos-duration="500">
      <div className="page-head__text">
        {voltar}
        <h1 className="h-1">{titulo}</h1>
        {descricao && <p className="page-head__desc">{descricao}</p>}
      </div>
      {acoes && <div className="page-head__actions">{acoes}</div>}
    </header>
  );
}
