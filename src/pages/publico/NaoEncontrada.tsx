import { ButtonLink } from '@/components/ui/Button';
import { useTitulo } from '@/lib/hooks';

export default function NaoEncontrada() {
  useTitulo('Página não encontrada');
  return (
    <div className="container status-page">
      <div className="status-page__card card card--pad" data-aos="zoom-in">
        <span className="status-page__codigo num" aria-hidden="true">
          404
        </span>
        <h1 className="h-1">Esta página não existe</h1>
        <p className="muted">O endereço pode ter mudado ou sido digitado errado.</p>
        <ButtonLink to="/" icon="bx-home-alt">
          Voltar ao início
        </ButtonLink>
      </div>
    </div>
  );
}
