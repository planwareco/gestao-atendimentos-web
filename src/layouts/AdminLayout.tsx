import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAdminSession } from '@/admin/AdminSessionProvider';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';
import { useMedia } from '@/lib/hooks';

const ITENS = [
  { to: '/admin', label: 'Visão geral', icon: 'bx-pulse', end: true },
  { to: '/admin/empresas', label: 'Empresas', icon: 'bx-buildings' },
  { to: '/admin/catalogo', label: 'Catálogo e preços', icon: 'bx-purchase-tag' },
  { to: '/admin/auditoria', label: 'Auditoria', icon: 'bx-shield-quarter' },
];

/** Casca do painel do super admin (sessão separada da empresa). */
export function AdminLayout() {
  const { admin, logout } = useAdminSession();
  const nav = useNavigate();
  const loc = useLocation();
  const desktop = useMedia('(min-width: 1024px)');
  const [aberta, setAberta] = useState(false);
  useEffect(() => setAberta(false), [loc.pathname]);

  return (
    <div className={cn('shell shell--admin', aberta && 'shell--open')}>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <aside className="sidebar" aria-label="Menu do admin">
        <div className="sidebar__brand">
          <Logo claro />
          {!desktop && (
            <button type="button" className="sidebar__close" aria-label="Fechar menu" onClick={() => setAberta(false)}>
              <i className="bx bx-x" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="sidebar__company">
          <span className="sidebar__company-name">Admin da plataforma</span>
          <span className="sidebar__company-role">Acesso restrito</span>
        </div>
        <nav className="sidebar__nav">
          <div className="sidebar__group">
            <ul>
              {ITENS.map((i) => (
                <li key={i.to}>
                  <NavLink to={i.to} end={i.end} className={({ isActive }) => cn('sidebar__link', isActive && 'is-active')}>
                    <i className={cn('bx', i.icon)} aria-hidden="true" />
                    <span className="sidebar__label">{i.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <div className="sidebar__foot">
          {admin && (
            <div className="sidebar__user">
              <Avatar nome={admin.nome} size={34} cor="var(--secondary)" />
              <div className="sidebar__user-text">
                <strong>{admin.nome}</strong>
                <span>{admin.email}</span>
              </div>
            </div>
          )}
          <button
            type="button"
            className="sidebar__collapse"
            onClick={async () => {
              await logout();
              nav('/admin/login', { replace: true });
            }}
          >
            <i className="bx bx-log-out" aria-hidden="true" />
            <span className="sidebar__label">Sair do admin</span>
          </button>
        </div>
      </aside>
      <div className="scrim" onClick={() => setAberta(false)} aria-hidden="true" />
      <div className="shell__main">
        <header className="topbar">
          <button type="button" className="topbar__menu" aria-label="Abrir menu" aria-expanded={aberta} onClick={() => setAberta(true)}>
            <i className="bx bx-menu-alt-left" aria-hidden="true" />
          </button>
          <div className="topbar__date">
            <span className="topbar__hello">Painel da plataforma</span>
            <span className="topbar__today">
              <i className="bx bx-shield-alt-2" aria-hidden="true" /> Sessão protegida por 2FA
            </span>
          </div>
        </header>
        <main id="conteudo" className="shell__content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
