import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { usuarioClient } from '@/api/http';
import { authApi } from '@/api/endpoints/auth';
import type { Sessao, SessaoComToken } from '@/api/types';
import { applyTheme, resetTheme } from '@/theme/applyTheme';

interface Contexto {
  sessao: Sessao | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<Sessao>;
  logout: () => Promise<void>;
  recarregar: () => Promise<Sessao | null>;
  /** Abre a sessão a partir de uma resposta que já traz o token (ex.: cadastro). */
  abrirSessao: (s: SessaoComToken) => void;
}

const SessionContext = createContext<Contexto | null>(null);

const semToken = ({ accessToken: _a, tokenType: _t, expiresIn: _e, ...s }: SessaoComToken): Sessao => s;

/** Sessão da empresa: access token em memória, restaurada via cookie de refresh. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const qc = useQueryClient();
  const { pathname } = useLocation();
  const naAreaDaEmpresa = pathname.startsWith('/app');

  useEffect(() => {
    usuarioClient.onSessionLost(() => {
      setSessao(null);
      qc.clear();
    });
    let vivo = true;
    usuarioClient.refreshSession().then((s) => {
      if (!vivo) return;
      if (s) setSessao(semToken(s));
      setCarregando(false);
    });
    return () => {
      vivo = false;
    };
  }, [qc]);

  // Tema da empresa só na área dela; landing, checkout e admin mantêm a identidade do produto.
  useEffect(() => {
    if (sessao && naAreaDaEmpresa) applyTheme(sessao.empresa.aparencia);
    else resetTheme();
  }, [sessao, naAreaDaEmpresa]);

  const abrirSessao = useCallback((s: SessaoComToken) => {
    usuarioClient.setAccessToken(s.accessToken);
    setSessao(semToken(s));
  }, []);

  const login = useCallback(
    async (email: string, senha: string) => {
      const s = await authApi.login(email, senha);
      qc.clear();
      abrirSessao(s);
      return semToken(s);
    },
    [abrirSessao, qc],
  );

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    usuarioClient.setAccessToken(null);
    setSessao(null);
    qc.clear();
  }, [qc]);

  const recarregar = useCallback(async () => {
    try {
      const s = await authApi.me();
      setSessao(s);
      return s;
    } catch {
      return null;
    }
  }, []);

  const valor = useMemo(() => ({ sessao, carregando, login, logout, recarregar, abrirSessao }), [sessao, carregando, login, logout, recarregar, abrirSessao]);
  return <SessionContext.Provider value={valor}>{children}</SessionContext.Provider>;
}

export function useSession(): Contexto {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession precisa estar dentro de <SessionProvider>.');
  return ctx;
}
