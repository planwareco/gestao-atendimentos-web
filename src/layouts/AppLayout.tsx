import { useEffect, useState, type CSSProperties } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { Modulo, Permissao } from '@/api/types';
import { useSession } from '@/auth/SessionProvider';
import { usePermissao } from '@/auth/usePermissao';
import { AlterarSenhaModal } from '@/components/AlterarSenhaModal';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { fmtDataLonga } from '@/lib/dates';
import { useClickFora, useMedia } from '@/lib/hooks';
import { PAPEIS } from '@/lib/labels';
import { useRotulos } from '@/lib/rotulos';

interface ItemMenu {
  to: string;
  label: string;
  icon: string;
  p: Permissao;
  modulo: Modulo;
  end?: boolean;
}

const CHAVE_COLAPSO = 'atendo:sidebar-colapsada';
const ler = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const gravar = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* armazenamento indisponível: preferência só nesta visita */
  }
};

/** Casca da área da empresa: sidebar marinho, topo com ações e banner de somente leitura. */
export function AppLayout() {
  const { sessao, logout } = useSession();
  const { pode, temModulo, ehProprietario, somenteLeitura, podeEscrever } = usePermissao();
  const r = useRotulos();
  const nav = useNavigate();
  const loc = useLocation();
  const desktop = useMedia('(min-width: 1024px)');
  const [aberta, setAberta] = useState(false);
  const [colapsada, setColapsada] = useState(() => ler(CHAVE_COLAPSO) === '1');
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [senha, setSenha] = useState(false);
  const refMenu = useClickFora<HTMLDivElement>(menuUsuario, () => setMenuUsuario(false));

  useEffect(() => setAberta(false), [loc.pathname]);
  useEffect(() => {
    if (desktop) setAberta(false);
  }, [desktop]);

  if (!sessao) return null;
  const { empresa, usuario } = sessao;
  const logo = empresa.aparencia?.logoUrl;

  const grupos: { titulo: string; itens: ItemMenu[] }[] = [
    {
      titulo: 'Operação',
      itens: [
        { to: '/app', label: 'Visão geral', icon: 'bx-grid-alt', p: 'dashboard:ver', modulo: 'NUCLEO', end: true },
        { to: '/app/agenda', label: 'Agenda', icon: 'bx-calendar', p: 'agenda:ler', modulo: 'NUCLEO' },
        { to: '/app/atendimentos', label: r.atendimentos, icon: 'bx-list-check', p: 'atendimentos:ler', modulo: 'NUCLEO' },
        { to: '/app/clientes', label: r.clientes, icon: 'bx-user', p: 'clientes:ler', modulo: 'NUCLEO' },
        { to: '/app/servicos', label: r.servicos, icon: 'bx-purchase-tag-alt', p: 'servicos:ler', modulo: 'NUCLEO' },
        { to: '/app/historico', label: 'Histórico', icon: 'bx-history', p: 'clientes:ler', modulo: 'NUCLEO' },
        { to: '/app/orcamentos', label: 'Orçamentos', icon: 'bx-file', p: 'orcamentos:ler', modulo: 'ORCAMENTOS' },
      ],
    },
    {
      titulo: 'Gestão',
      itens: [
        { to: '/app/despesas', label: 'Despesas', icon: 'bx-receipt', p: 'despesas:ler', modulo: 'FINANCEIRO' },
        { to: '/app/financeiro', label: 'Financeiro', icon: 'bx-line-chart', p: 'financeiro:ver', modulo: 'FINANCEIRO' },
        { to: '/app/profissionais', label: 'Profissionais', icon: 'bx-id-card', p: 'profissionais:ler', modulo: 'MULTI_PROFISSIONAL' },
        { to: '/app/equipe', label: 'Equipe', icon: 'bx-group', p: 'usuarios:gerenciar', modulo: 'MULTI_PROFISSIONAL' },
        { to: '/app/configuracoes', label: 'Configurações', icon: 'bx-cog', p: 'configuracoes:gerenciar', modulo: 'NUCLEO' },
      ],
    },
  ];

  const alternarColapso = () => {
    const v = !colapsada;
    setColapsada(v);
    gravar(CHAVE_COLAPSO, v ? '1' : '0');
  };

  return (
    <div className={cn('shell', colapsada && desktop && 'shell--collapsed', aberta && 'shell--open')}>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>

      <aside className="sidebar" aria-label="Menu principal">
        <div className="sidebar__brand">
          {logo ? (
            <img src={logo} alt={empresa.nomeFantasia ?? empresa.nome} className="sidebar__logo-img" />
          ) : (
            <Logo claro compacto={colapsada && desktop} />
          )}
          {!desktop && (
            <button type="button" className="sidebar__close" aria-label="Fechar menu" onClick={() => setAberta(false)}>
              <i className="bx bx-x" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="sidebar__company" title={empresa.nome}>
          <span className="sidebar__company-name">{empresa.nomeFantasia ?? empresa.nome}</span>
          <span className="sidebar__company-role">{PAPEIS[usuario.papel].label}</span>
        </div>

        <nav className="sidebar__nav">
          {grupos.map((g) => {
            const visiveis = g.itens.filter((i) => pode(i.p) || (ehProprietario && !temModulo(i.modulo)));
            if (!visiveis.length) return null;
            return (
              <div key={g.titulo} className="sidebar__group">
                <span className="sidebar__group-title">{g.titulo}</span>
                <ul>
                  {visiveis.map((i, idx) => {
                    const bloqueado = !temModulo(i.modulo);
                    return (
                      <li key={i.to} style={{ '--i': idx } as CSSProperties}>
                        <NavLink
                          to={bloqueado ? `/app/modulo/${i.modulo}` : i.to}
                          end={i.end}
                          className={({ isActive }) => cn('sidebar__link', isActive && 'is-active', bloqueado && 'is-locked')}
                          title={colapsada && desktop ? i.label : undefined}
                        >
                          <i className={cn('bx', i.icon)} aria-hidden="true" />
                          <span className="sidebar__label">{i.label}</span>
                          {bloqueado && <i className="bx bxs-lock-alt sidebar__lock" aria-label="Módulo não contratado" />}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="sidebar__foot">
          {desktop && (
            <button type="button" className="sidebar__collapse" onClick={alternarColapso} aria-pressed={colapsada}>
              <i className={cn('bx', colapsada ? 'bx-chevrons-right' : 'bx-chevrons-left')} aria-hidden="true" />
              <span className="sidebar__label">Recolher menu</span>
            </button>
          )}
          <div className="sidebar__user">
            <Avatar nome={usuario.nome} size={34} cor="var(--secondary)" />
            <div className="sidebar__user-text">
              <strong>{usuario.nome}</strong>
              <span>{usuario.email}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="scrim" onClick={() => setAberta(false)} aria-hidden="true" />

      <div className="shell__main">
        {somenteLeitura && (
          <div className="readonly-banner" role="status">
            <i className="bx bx-lock-alt" aria-hidden="true" />
            <span>
              <strong>Conta em modo somente leitura.</strong> Você pode consultar tudo, mas não criar ou alterar. Regularize a assinatura para voltar ao normal.
            </span>
          </div>
        )}

        <header className="topbar">
          <button type="button" className="topbar__menu" aria-label="Abrir menu" aria-expanded={aberta} onClick={() => setAberta(true)}>
            <i className="bx bx-menu-alt-left" aria-hidden="true" />
          </button>
          <div className="topbar__date">
            <span className="topbar__hello">Olá, {usuario.nome.split(' ')[0]}</span>
            <span className="topbar__today">{fmtDataLonga(new Date().toISOString(), empresa.fusoHorario)}</span>
          </div>
          <div className="topbar__actions">
            {podeEscrever('atendimentos:escrever') && (
              <Button size="sm" icon="bx-plus" onClick={() => nav('/app/agenda?novo=1')} className="topbar__cta">
                <span className="hide-xs">{r.novo(r.atendimento)}</span>
              </Button>
            )}
            <div className="topbar__user" ref={refMenu}>
              <button type="button" className="topbar__avatar" aria-haspopup="menu" aria-expanded={menuUsuario} onClick={() => setMenuUsuario((v) => !v)}>
                <Avatar nome={usuario.nome} size={36} cor="var(--action)" />
                <i className="bx bx-chevron-down" aria-hidden="true" />
              </button>
              {menuUsuario && (
                <div className="menu" role="menu" style={{ right: 0, top: 'calc(100% + 8px)' }}>
                  <div className="menu__head">
                    <strong>{usuario.nome}</strong>
                    <span>{usuario.email}</span>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuUsuario(false);
                      setSenha(true);
                    }}
                  >
                    <i className="bx bx-key" aria-hidden="true" /> Alterar senha
                  </button>
                  {pode('configuracoes:gerenciar') && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuUsuario(false);
                        nav('/app/configuracoes');
                      }}
                    >
                      <i className="bx bx-palette" aria-hidden="true" /> Aparência e dados
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className="is-danger"
                    onClick={async () => {
                      await logout();
                      nav('/login', { replace: true });
                    }}
                  >
                    <i className="bx bx-log-out" aria-hidden="true" /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="conteudo" className="shell__content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <AlterarSenhaModal aberto={senha} onFechar={() => setSenha(false)} />
    </div>
  );
}
