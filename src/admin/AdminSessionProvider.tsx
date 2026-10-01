import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { adminClient } from '@/api/adminHttp';
import { adminAuthApi } from '@/api/endpoints/admin';
import type { AdminPerfil, AdminSessao } from '@/api/types';
import { PageLoader } from '@/components/ui/Feedback';
import { resetTheme } from '@/theme/applyTheme';

interface Contexto {
  admin: AdminPerfil | null;
  mfaPendente: boolean;
  carregando: boolean;
  abrir: (s: AdminSessao) => void;
  marcar2faAtivo: () => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<Contexto | null>(null);

/** Sessão do super admin: token, refresh e cookie próprios (nunca mistura com a empresa). */
export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminPerfil | null>(null);
  const [mfaPendente, setMfaPendente] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    resetTheme();
    adminClient.onSessionLost(() => setAdmin(null));
    adminClient.refreshSession().then((s) => {
      if (s) {
        setAdmin(s.admin);
        setMfaPendente(s.mfaConfiguracaoObrigatoria);
      }
      setCarregando(false);
    });
  }, []);

  const abrir = useCallback((s: AdminSessao) => {
    adminClient.setAccessToken(s.accessToken);
    setAdmin(s.admin);
    setMfaPendente(s.mfaConfiguracaoObrigatoria);
  }, []);

  const marcar2faAtivo = useCallback(() => {
    setMfaPendente(false);
    setAdmin((a) => (a ? { ...a, totpAtivo: true } : a));
  }, []);

  const logout = useCallback(async () => {
    await adminAuthApi.logout().catch(() => undefined);
    adminClient.setAccessToken(null);
    setAdmin(null);
  }, []);

  const valor = useMemo(() => ({ admin, mfaPendente, carregando, abrir, marcar2faAtivo, logout }), [admin, mfaPendente, carregando, abrir, marcar2faAtivo, logout]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useAdminSession(): Contexto {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAdminSession precisa estar dentro de <AdminSessionProvider>.');
  return c;
}

/** Exige admin logado com 2FA configurado. */
export function RequireAdmin() {
  const { admin, mfaPendente, carregando } = useAdminSession();
  const loc = useLocation();
  if (carregando) return <PageLoader />;
  if (!admin) return <Navigate to="/admin/login" replace />;
  if (mfaPendente && loc.pathname !== '/admin/configurar-2fa') return <Navigate to="/admin/configurar-2fa" replace />;
  return <Outlet />;
}
