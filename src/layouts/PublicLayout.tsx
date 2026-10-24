import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '@/auth/SessionProvider';
import { rotaInicial } from '@/auth/guards';
import { Logo } from '@/components/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const LINKS = [
  { href: '/#recursos', label: 'Recursos' },
  { href: '/#segmentos', label: 'Segmentos' },
  { href: '/#precos', label: 'Preços' },
  { href: '/#duvidas', label: 'Dúvidas' },
];

/** Casca pública: navegação em vidro flutuante e rodapé. */
export function PublicLayout() {
  const { sessao } = useSession();
  const loc = useLocation();
  const [aberto, setAberto] = useState(false);
  const [rolou, setRolou] = useState(false);
  const enxuto = loc.pathname.startsWith('/checkout') || loc.pathname === '/pendente';

  useEffect(() => setAberto(false), [loc.pathname, loc.hash]);

  // Sentinela no topo: IntersectionObserver em vez de listener de scroll
  useEffect(() => {
    const s = document.getElementById('topo-sentinela');
    if (!s) return;
    const io = new IntersectionObserver(([e]) => setRolou(!e.isIntersecting), { rootMargin: '-24px 0px 0px 0px' });
    io.observe(s);
    return () => io.disconnect();
  }, []);

  return (
    <div className="public">
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <span id="topo-sentinela" aria-hidden="true" className="public__sentinel" />
      <header className={cn('pnav', rolou && 'pnav--scrolled', aberto && 'pnav--open')}>
        <div className="pnav__inner">
          <Link to="/" aria-label="Simbora Gerir, página inicial">
            <Logo />
          </Link>
          {!enxuto && (
            <nav className="pnav__links" aria-label="Seções">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href}>
                  {l.label}
                </a>
              ))}
            </nav>
          )}
          <div className="pnav__actions">
            {sessao ? (
              <ButtonLink to={rotaInicial(sessao.permissoes)} size="sm" iconRight="bx-right-arrow-alt">
                Abrir o sistema
              </ButtonLink>
            ) : (
              <>
                {!enxuto && (
                  <NavLink to="/admin/login" className="pnav__login pnav__gestor hide-sm" title="Área do gestor da plataforma">
                    <i className="bx bx-shield-quarter" aria-hidden="true" />
                    Gestor
                  </NavLink>
                )}
                <NavLink to="/login" className="pnav__login">
                  Entrar
                </NavLink>
                {!enxuto && (
                  <ButtonLink to="/cadastro" size="sm" iconRight="bx-right-arrow-alt" className="hide-xs">
                    Começar agora
                  </ButtonLink>
                )}
              </>
            )}
            {!enxuto && (
              <button type="button" className="pnav__burger" aria-label={aberto ? 'Fechar menu' : 'Abrir menu'} aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
                <i className={cn('bx', aberto ? 'bx-x' : 'bx-menu')} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        {aberto && (
          <nav className="pnav__mobile" aria-label="Seções">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setAberto(false)}>
                {l.label}
                <i className="bx bx-chevron-right" aria-hidden="true" />
              </a>
            ))}
            {!sessao && (
              <Link to="/demo" onClick={() => setAberto(false)}>
                <span>
                  <i className="bx bx-play-circle" aria-hidden="true" /> Testar grátis
                </span>
                <i className="bx bx-chevron-right" aria-hidden="true" />
              </Link>
            )}
            {!sessao && (
              <Link to="/admin/login" onClick={() => setAberto(false)}>
                <span>
                  <i className="bx bx-shield-quarter" aria-hidden="true" /> Acesso do gestor
                </span>
                <i className="bx bx-chevron-right" aria-hidden="true" />
              </Link>
            )}
            {!sessao && (
              <ButtonLink to="/cadastro" block iconRight="bx-right-arrow-alt">
                Começar agora
              </ButtonLink>
            )}
          </nav>
        )}
      </header>

      <main id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="pfooter">
        <div className="pfooter__inner">
          <div className="pfooter__brand">
            <Logo />
            <p>Agenda, clientes, orçamentos e financeiro para quem vive de atender bem.</p>
          </div>
          <div className="pfooter__cols">
            <div>
              <h2>Produto</h2>
              <a href="/#recursos">Recursos</a>
              <a href="/#precos">Preços</a>
              <a href="/#segmentos">Segmentos</a>
            </div>
            <div>
              <h2>Conta</h2>
              <Link to="/cadastro">Criar conta</Link>
              <Link to="/login">Entrar</Link>
              <Link to="/admin/login">Acesso do gestor</Link>
            </div>
          </div>
        </div>
        <div className="pfooter__base">
          <span>© {new Date().getFullYear()} Simbora Gerir. Todos os direitos reservados.</span>
          <span>Pagamentos processados pelo Mercado Pago.</span>
        </div>
      </footer>
    </div>
  );
}
