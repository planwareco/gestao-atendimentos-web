import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import AOS from 'aos';
import { AdminSessionProvider, RequireAdmin } from '@/admin/AdminSessionProvider';
import { RequireAuth, RequirePermissao, StatusGate } from '@/auth/guards';
import { SessionProvider } from '@/auth/SessionProvider';
import { PageLoader } from '@/components/ui/Feedback';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { PublicLayout } from '@/layouts/PublicLayout';
import { registrarNavigate } from '@/lib/navigation';

/* Páginas carregadas sob demanda: a landing não baixa agenda, gráficos nem checkout. */
const Landing = lazy(() => import('@/pages/publico/Landing'));
const Cadastro = lazy(() => import('@/pages/publico/Cadastro'));
const Checkout = lazy(() => import('@/pages/publico/Checkout'));
const Login = lazy(() => import('@/pages/publico/Login'));
const Pendente = lazy(() => import('@/pages/publico/Pendente'));
const ContaDesativada = lazy(() => import('@/pages/publico/ContaDesativada'));
const NaoEncontrada = lazy(() => import('@/pages/publico/NaoEncontrada'));

const Dashboard = lazy(() => import('@/pages/app/Dashboard'));
const Agenda = lazy(() => import('@/pages/app/Agenda'));
const Atendimentos = lazy(() => import('@/pages/app/Atendimentos'));
const Clientes = lazy(() => import('@/pages/app/Clientes'));
const ClienteDetalhe = lazy(() => import('@/pages/app/ClienteDetalhe'));
const Historico = lazy(() => import('@/pages/app/Historico'));
const Servicos = lazy(() => import('@/pages/app/Servicos'));
const Orcamentos = lazy(() => import('@/pages/app/Orcamentos'));
const OrcamentoEditor = lazy(() => import('@/pages/app/OrcamentoEditor'));
const OrcamentoDetalhe = lazy(() => import('@/pages/app/OrcamentoDetalhe'));
const Despesas = lazy(() => import('@/pages/app/Despesas'));
const Financeiro = lazy(() => import('@/pages/app/Financeiro'));
const Profissionais = lazy(() => import('@/pages/app/Profissionais'));
const Equipe = lazy(() => import('@/pages/app/Equipe'));
const Configuracoes = lazy(() => import('@/pages/app/Configuracoes'));
const SemAcesso = lazy(() => import('@/pages/app/SemAcesso'));
const ModuloBloqueado = lazy(() => import('@/pages/app/ModuloBloqueado'));

const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'));
const Configurar2fa = lazy(() => import('@/pages/admin/Configurar2fa'));
const AdminVisaoGeral = lazy(() => import('@/pages/admin/AdminVisaoGeral'));
const AdminEmpresas = lazy(() => import('@/pages/admin/AdminEmpresas'));
const AdminEmpresaDetalhe = lazy(() => import('@/pages/admin/AdminEmpresaDetalhe'));
const AdminCatalogo = lazy(() => import('@/pages/admin/AdminCatalogo'));
const AdminAuditoria = lazy(() => import('@/pages/admin/AdminAuditoria'));

/** Efeitos globais de navegação: AOS, rolagem ao topo e navegação fora de componentes. */
function Efeitos() {
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();

  useEffect(() => registrarNavigate(navigate), [navigate]);

  useEffect(() => {
    AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 40, disable: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches });
  }, []);

  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } else {
      window.scrollTo({ top: 0 });
    }
    const t = window.setTimeout(() => AOS.refreshHard(), 120);
    return () => window.clearTimeout(t);
  }, [pathname, hash]);

  return null;
}

const P = ({ children }: { children: ReactNode }) => <Suspense fallback={<PageLoader />}>{children}</Suspense>;

export function App() {
  return (
    <SessionProvider>
      <Efeitos />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<P><Landing /></P>} />
            <Route path="/cadastro" element={<P><Cadastro /></P>} />
            <Route path="/checkout/:token" element={<P><Checkout /></P>} />
            <Route path="/conta-desativada" element={<P><ContaDesativada /></P>} />
            <Route element={<RequireAuth />}>
              <Route path="/pendente" element={<P><Pendente /></P>} />
            </Route>
          </Route>
          <Route path="/login" element={<P><Login /></P>} />

          <Route element={<RequireAuth />}>
            <Route
              element={
                <StatusGate>
                  <AppLayout />
                </StatusGate>
              }
            >
              <Route path="/app" element={<RequirePermissao p="dashboard:ver" fallback="/app/agenda"><P><Dashboard /></P></RequirePermissao>} />
              <Route path="/app/agenda" element={<RequirePermissao p="agenda:ler"><P><Agenda /></P></RequirePermissao>} />
              <Route path="/app/atendimentos" element={<RequirePermissao p="atendimentos:ler"><P><Atendimentos /></P></RequirePermissao>} />
              <Route path="/app/clientes" element={<RequirePermissao p="clientes:ler"><P><Clientes /></P></RequirePermissao>} />
              <Route path="/app/clientes/:id" element={<RequirePermissao p="clientes:ler"><P><ClienteDetalhe /></P></RequirePermissao>} />
              <Route path="/app/historico" element={<RequirePermissao p="clientes:ler"><P><Historico /></P></RequirePermissao>} />
              <Route path="/app/servicos" element={<RequirePermissao p="servicos:ler"><P><Servicos /></P></RequirePermissao>} />
              <Route path="/app/orcamentos" element={<RequirePermissao p="orcamentos:ler"><P><Orcamentos /></P></RequirePermissao>} />
              <Route path="/app/orcamentos/novo" element={<RequirePermissao p="orcamentos:escrever"><P><OrcamentoEditor /></P></RequirePermissao>} />
              <Route path="/app/orcamentos/:id" element={<RequirePermissao p="orcamentos:ler"><P><OrcamentoDetalhe /></P></RequirePermissao>} />
              <Route path="/app/orcamentos/:id/editar" element={<RequirePermissao p="orcamentos:escrever"><P><OrcamentoEditor /></P></RequirePermissao>} />
              <Route path="/app/despesas" element={<RequirePermissao p="despesas:ler"><P><Despesas /></P></RequirePermissao>} />
              <Route path="/app/financeiro" element={<RequirePermissao p="financeiro:ver"><P><Financeiro /></P></RequirePermissao>} />
              <Route path="/app/profissionais" element={<RequirePermissao p="profissionais:ler"><P><Profissionais /></P></RequirePermissao>} />
              <Route path="/app/equipe" element={<RequirePermissao p="usuarios:gerenciar"><P><Equipe /></P></RequirePermissao>} />
              <Route path="/app/configuracoes" element={<RequirePermissao p="configuracoes:gerenciar"><P><Configuracoes /></P></RequirePermissao>} />
              <Route path="/app/modulo/:codigo" element={<P><ModuloBloqueado /></P>} />
              <Route path="/app/sem-acesso" element={<P><SemAcesso /></P>} />
              <Route path="/app/*" element={<Navigate to="/app" replace />} />
            </Route>
          </Route>

          <Route
            path="/admin/*"
            element={
              <AdminSessionProvider>
                <Routes>
                  <Route path="login" element={<P><AdminLogin /></P>} />
                  <Route element={<RequireAdmin />}>
                    <Route path="configurar-2fa" element={<P><Configurar2fa /></P>} />
                    <Route element={<AdminLayout />}>
                      <Route index element={<P><AdminVisaoGeral /></P>} />
                      <Route path="empresas" element={<P><AdminEmpresas /></P>} />
                      <Route path="empresas/:id" element={<P><AdminEmpresaDetalhe /></P>} />
                      <Route path="catalogo" element={<P><AdminCatalogo /></P>} />
                      <Route path="auditoria" element={<P><AdminAuditoria /></P>} />
                    </Route>
                  </Route>
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
              </AdminSessionProvider>
            }
          />

          <Route element={<PublicLayout />}>
            <Route path="*" element={<P><NaoEncontrada /></P>} />
          </Route>
        </Routes>
      </Suspense>
    </SessionProvider>
  );
}
