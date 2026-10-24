import type { ReactNode } from 'react';
import { useTitulo } from '@/lib/hooks';
import { useTour } from '@/tour/TourProvider';
import { Button } from './Button';

/** Cabeçalho de página: título, descrição curta e ações à direita (com o "Como usar" da tela, quando houver). */
export function PageHeader({ titulo, descricao, acoes, voltar }: { titulo: string; descricao?: ReactNode; acoes?: ReactNode; voltar?: ReactNode }) {
  useTitulo(titulo);
  const tour = useTour();
  const trilha = tour?.trilhaAtual;
  return (
    <header className="page-head" data-aos="fade-up" data-aos-duration="500">
      <div className="page-head__text">
        {voltar}
        <h1 className="h-1">{titulo}</h1>
        {descricao && <p className="page-head__desc">{descricao}</p>}
      </div>
      {(acoes || trilha) && (
        <div className="page-head__actions">
          {trilha && (
            <Button variant="ghost" icon="bx-help-circle" className="page-head__ajuda" onClick={() => tour.iniciar(trilha.id)} title={`Passo a passo: ${trilha.titulo}`}>
              Como usar
            </Button>
          )}
          {acoes}
        </div>
      )}
    </header>
  );
}
