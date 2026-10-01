import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Permissao } from '@/api/types';
import { PageLoader } from '@/components/ui/Feedback';
import { useSession } from './SessionProvider';
import { usePermissao } from './usePermissao';

/** Exige sessão. Guarda a rota de origem para voltar após o login. */
export function RequireAuth() {
  const { sessao, carregando } = useSession();
  const loc = useLocation();
  if (carregando) return <PageLoader />;
  if (!sessao) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <Outlet />;
}

/** Empresa PENDENTE sempre vai para o checkout. */
export function StatusGate({ children }: { children: ReactNode }) {
  const { sessao } = useSession();
  if (sessao?.empresa.status === 'PENDENTE') return <Navigate to="/pendente" replace />;
  if (sessao?.empresa.status === 'DESATIVADO') return <Navigate to="/conta-desativada" replace />;
  return <>{children}</>;
}

/** Bloqueia a rota sem a permissão (ou módulo não contratado). */
export function RequirePermissao({ p, fallback, children }: { p: Permissao; fallback?: string; children: ReactNode }) {
  const { pode } = usePermissao();
  if (pode(p)) return <>{children}</>;
  if (fallback) return <Navigate to={fallback} replace />;
  return <Navigate to="/app/sem-acesso" replace state={{ permissao: p }} />;
}

/** Página inicial depende do papel: profissional não tem dashboard. */
export function rotaInicial(permissoes: readonly Permissao[]): string {
  if (permissoes.includes('dashboard:ver')) return '/app';
  if (permissoes.includes('agenda:ler')) return '/app/agenda';
  return '/app/clientes';
}
