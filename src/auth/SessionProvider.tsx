import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { usuarioClient } from '@/api/http';
import { authApi } from '@/api/endpoints/auth';
import type { Papel, Segmento, Sessao, SessaoComToken } from '@/api/types';
import { desligarDemo, ehDemo, ligarDemo } from '@/demo/modo';
import { applyTheme, resetTheme } from '@/theme/applyTheme';

interface Contexto {
  sessao: Sessao | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<Sessao>;
  logout: () => Promise<void>;
  recarregar: () => Promise<Sessao | null>;
  /** Abre a sessão a partir de uma resposta que já traz o token (ex.: cadastro). */
  abrirSessao: (s: SessaoComToken) => void;
  /** Modo demonstração: empresa fictícia que roda inteira no navegador. */
  demo: boolean;
  entrarDemo: (segmento: Segmento) => Promise<Sessao | null>;
  sairDemo: () => Promise<void>;
  /** Na demonstração, troca a pessoa logada para ver o sistema com outro papel. */
  verComoDemo: (papel: Papel) => Promise<void>;
}

const SessionContext = createContext<Contexto | null>(null);

const semToken = ({ accessToken: _a, tokenType: _t, expiresIn: _e, ...s }: SessaoComToken): Sessao => s;

/** Sessão da empresa: access token em memória, restaurada via cookie de refresh. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [demo, setDemo] = useState(ehDemo);
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
      if (ehDemo()) {
        desligarDemo();
        setDemo(false);
      }
      const s = await authApi.login(email, senha);
      qc.clear();
      abrirSessao(s);
      return semToken(s);
    },
    [abrirSessao, qc],
  );

  const entrarDemo = useCallback(
    async (segmento: Segmento) => {
      ligarDemo(segmento);
      (await import('@/demo/db')).descartarDB();
      qc.clear();
      setDemo(true);
      const s = await usuarioClient.refreshSession();
      setSessao(s ? semToken(s) : null);
      return s ? semToken(s) : null;
    },
    [qc],
  );

  const sairDemo = useCallback(async () => {
    desligarDemo();
    (await import('@/demo/db')).descartarDB();
    usuarioClient.setAccessToken(null);
    setDemo(false);
    qc.clear();
    // Quem já tinha conta volta para ela (o cookie de refresh continua valendo)
    const s = await usuarioClient.refreshSession();
    setSessao(s ? semToken(s) : null);
  }, [qc]);

  const verComoDemo = useCallback(
    async (papel: Papel) => {
      (await import('@/demo/backend')).entrarComo(papel);
      qc.clear();
      const s = await authApi.me();
      setSessao(s);
    },
    [qc],
  );

  const logout = useCallback(async () => {
    if (ehDemo()) return sairDemo();
    await authApi.logout().catch(() => undefined);
    usuarioClient.setAccessToken(null);
    setSessao(null);
    qc.clear();
  }, [qc, sairDemo]);

  // Ir para login, cadastro, checkout ou admin encerra a demonstração (lá é a conta de verdade)
  useEffect(() => {
    if (demo && /^\/(login|cadastro|checkout|admin)/.test(pathname)) void sairDemo();
  }, [demo, pathname, sairDemo]);

  const recarregar = useCallback(async () => {
    try {
      const s = await authApi.me();
      setSessao(s);
      return s;
    } catch {
      return null;
    }
  }, []);

  const valor = useMemo(
    () => ({ sessao, carregando, login, logout, recarregar, abrirSessao, demo, entrarDemo, sairDemo, verComoDemo }),
    [sessao, carregando, login, logout, recarregar, abrirSessao, demo, entrarDemo, sairDemo, verComoDemo],
  );
  return <SessionContext.Provider value={valor}>{children}</SessionContext.Provider>;
}

export function useSession(): Contexto {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession precisa estar dentro de <SessionProvider>.');
  return ctx;
}
