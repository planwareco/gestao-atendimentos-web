import { ButtonLink } from '@/components/ui/Button';
import { useTitulo } from '@/lib/hooks';
import { linkWhatsapp } from '@/lib/masks';

/** Empresa desativada pelo admin: dados preservados, acesso bloqueado. */
export default function ContaDesativada() {
  useTitulo('Acesso desativado');
  const suporte = linkWhatsapp(import.meta.env.VITE_SUPORTE_WHATSAPP as string | undefined, 'Olá! O acesso da minha empresa no Atendo está desativado.');
  return (
    <div className="container status-page">
      <div className="status-page__card card card--pad" data-aos="zoom-in">
        <span className="status-page__icone status-page__icone--danger" aria-hidden="true">
          <i className="bx bx-block" />
        </span>
        <h1 className="h-1">Acesso desativado</h1>
        <p className="muted">O acesso desta empresa foi suspenso. Seus dados continuam guardados e voltam exatamente como estavam após a reativação.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          {suporte && (
            <a href={suporte} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
              <i className="bx bxl-whatsapp" aria-hidden="true" /> Falar com o suporte
            </a>
          )}
          <ButtonLink to="/" variant="ghost">
            Página inicial
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
