import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useSession } from '@/auth/SessionProvider';
import { cn } from '@/lib/cn';
import { linkWhatsapp } from '@/lib/masks';
import { PERGUNTAS } from './trilhas';
import { useTextoTour } from './texto';
import { useTour } from './TourProvider';

const SUPORTE = import.meta.env.VITE_SUPORTE_WHATSAPP as string | undefined;

/** Central de ajuda: o passo a passo de cada parte do sistema e as dúvidas mais comuns. */
export function CentralAjuda() {
  const tour = useTour();
  const { demo } = useSession();
  const painel = useRef<HTMLDivElement>(null);
  const t = useTextoTour();
  const aberta = tour?.ajudaAberta ?? false;

  useEffect(() => {
    if (!aberta) return;
    const anterior = document.activeElement as HTMLElement | null;
    painel.current?.focus();
    const h = (e: KeyboardEvent) => e.key === 'Escape' && tour?.fecharAjuda();
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', h);
      document.body.style.overflow = '';
      anterior?.focus?.();
    };
  }, [aberta, tour]);

  if (!tour || !aberta) return null;
  const { disponiveis, concluidas, trilhaAtual, iniciar, fecharAjuda } = tour;
  const feitas = disponiveis.filter((tr) => concluidas.has(tr.id)).length;
  const ids = new Set(disponiveis.map((tr) => tr.id));
  const perguntas = PERGUNTAS.filter((p) => !p.trilha || ids.has(p.trilha));
  const suporte = linkWhatsapp(SUPORTE, 'Olá! Preciso de ajuda com o Simbora Gerir.');

  return createPortal(
    <div className="ajuda" role="presentation">
      <div className="ajuda__scrim" onClick={fecharAjuda} aria-hidden="true" />
      <div ref={painel} className="ajuda__painel" role="dialog" aria-modal="true" aria-labelledby="ajuda-titulo" tabIndex={-1}>
        <header className="ajuda__topo">
          <div>
            <h2 id="ajuda-titulo" className="h-2">
              Central de ajuda
            </h2>
            <p className="muted text-sm">Passo a passo guiado de cada parte do sistema.</p>
          </div>
          <button type="button" className="ajuda__fechar" onClick={fecharAjuda} aria-label="Fechar a ajuda">
            <i className="bx bx-x" aria-hidden="true" />
          </button>
        </header>

        <div className="ajuda__corpo">
          {trilhaAtual && (
            <button type="button" className="ajuda__agora" onClick={() => iniciar(trilhaAtual.id)}>
              <span className="ajuda__agora-icone" aria-hidden="true">
                <i className={cn('bx', trilhaAtual.icone)} />
              </span>
              <span className="grow">
                <small>Nesta tela</small>
                <strong>{t(trilhaAtual.titulo)}</strong>
              </span>
              <span className="btn btn--primary btn--sm" aria-hidden="true">
                Mostrar <i className="bx bx-right-arrow-alt" />
              </span>
            </button>
          )}

          <section aria-labelledby="ajuda-trilhas">
            <div className="row row--between">
              <h3 id="ajuda-trilhas" className="ajuda__secao">
                Passo a passo
              </h3>
              <span className="text-xs muted num">
                {feitas} de {disponiveis.length} feitos
              </span>
            </div>
            <div className="ajuda__barra" role="progressbar" aria-valuemin={0} aria-valuemax={disponiveis.length} aria-valuenow={feitas} aria-label="Passo a passo concluídos">
              <span style={{ width: `${disponiveis.length ? (feitas / disponiveis.length) * 100 : 0}%` }} />
            </div>
            <ul className="ajuda__trilhas">
              {disponiveis.map((tr) => {
                const feita = concluidas.has(tr.id);
                return (
                  <li key={tr.id}>
                    <button type="button" className={cn('ajuda__trilha', feita && 'is-feita')} onClick={() => iniciar(tr.id)}>
                      <span className="ajuda__trilha-icone" aria-hidden="true">
                        <i className={cn('bx', feita ? 'bx-check' : tr.icone)} />
                      </span>
                      <span className="grow">
                        <strong>{t(tr.titulo)}</strong>
                        <small>{t(tr.resumo)}</small>
                      </span>
                      <span className="ajuda__duracao">{feita ? 'Rever' : tr.duracao}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="ajuda-faq">
            <h3 id="ajuda-faq" className="ajuda__secao">
              Dúvidas comuns
            </h3>
            <div className="ajuda__faq">
              {perguntas.map((p) => (
                <details key={p.pergunta}>
                  <summary>
                    {t(p.pergunta)}
                    <i className="bx bx-chevron-down" aria-hidden="true" />
                  </summary>
                  <p>{t(p.resposta)}</p>
                  {p.trilha && ids.has(p.trilha) && (
                    <button type="button" className="btn btn--link btn--sm" onClick={() => iniciar(p.trilha!)}>
                      <i className="bx bx-pointer" aria-hidden="true" /> Me mostre na tela
                    </button>
                  )}
                </details>
              ))}
            </div>
          </section>
        </div>

        <footer className="ajuda__rodape">
          {demo ? (
            <>
              <span className="text-sm">
                <strong>Gostou?</strong> Crie sua conta e organize a sua agenda hoje.
              </span>
              <Link to="/cadastro" className="btn btn--primary btn--sm">
                Criar minha conta
              </Link>
            </>
          ) : (
            <>
              <span className="text-sm muted">Ainda com dúvida? Fale com a gente.</span>
              {suporte && (
                <a href={suporte} target="_blank" rel="noopener noreferrer" className="btn btn--soft btn--sm">
                  <i className="bx bxl-whatsapp" aria-hidden="true" /> Suporte
                </a>
              )}
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
