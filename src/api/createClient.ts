import axios, { AxiosError, type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { ApiErro, Envelope, Pagina, Paginacao } from './types';

export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:3000';

const CODIGOS_SESSAO_PERDIDA = new Set(['SESSAO_INVALIDA', 'REFRESH_INVALIDO', 'REFRESH_REUTILIZADO', 'TOKEN_AUSENTE']);

interface Opcoes<S> {
  /** Caminho do refresh relativo a /v1 (ex.: "/auth/refresh"). */
  refreshPath: string;
  /** Nome do lock (Web Locks) que serializa o refresh entre abas. */
  lockName: string;
  /** Extrai o access token da resposta de refresh. */
  tokenFrom: (s: S) => string;
}

type ConfigRetry = InternalAxiosRequestConfig & { _retry?: boolean };

export interface SessionClient<S> {
  http: AxiosInstance;
  setAccessToken: (t: string | null) => void;
  getAccessToken: () => string | null;
  refreshSession: () => Promise<S | null>;
  onSessionLost: (fn: () => void) => void;
}

/**
 * Cliente HTTP com access token em memória e refresh rotativo.
 * O refresh é deduplicado na aba (uma única Promise) e serializado entre abas
 * (Web Locks): a API derruba a sessão se o mesmo refresh token for reutilizado.
 */
export function createSessionClient<S>({ refreshPath, lockName, tokenFrom }: Opcoes<S>): SessionClient<S> {
  let accessToken: string | null = null;
  let emAndamento: Promise<S | null> | null = null;
  let perdeuSessao: () => void = () => {};

  const http = axios.create({ baseURL: `${API_URL}/v1`, withCredentials: true, timeout: 30_000 });

  http.interceptors.request.use((cfg) => {
    if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
    return cfg;
  });

  const refreshSession = (): Promise<S | null> => {
    emAndamento ??= (async () => {
      const executar = async (): Promise<S | null> => {
        try {
          const r = await axios.post<Envelope<S>>(`${API_URL}/v1${refreshPath}`, {}, { withCredentials: true });
          accessToken = tokenFrom(r.data.data);
          return r.data.data;
        } catch {
          accessToken = null;
          return null;
        }
      };
      return 'locks' in navigator ? navigator.locks.request(lockName, executar) : executar();
    })().finally(() => {
      emAndamento = null;
    });
    return emAndamento;
  };

  http.interceptors.response.use(
    (r) => r,
    async (error: AxiosError<ApiErro>) => {
      const original = error.config as ConfigRetry | undefined;
      const status = error.response?.status;
      const code = error.response?.data?.code;

      if (original && status === 401 && code === 'TOKEN_EXPIRADO' && !original._retry) {
        original._retry = true;
        const sessao = await refreshSession();
        if (sessao) return http(original);
        perdeuSessao();
      } else if (status === 401 && code && CODIGOS_SESSAO_PERDIDA.has(code)) {
        perdeuSessao();
      }
      return Promise.reject(error);
    },
  );

  return {
    http,
    setAccessToken: (t) => {
      accessToken = t;
    },
    getAccessToken: () => accessToken,
    refreshSession,
    onSessionLost: (fn) => {
      perdeuSessao = fn;
    },
  };
}

/** Desembrulha o envelope { success, data }. */
export const unwrap = <T>(p: Promise<AxiosResponse<Envelope<T>>>): Promise<T> => p.then((r) => r.data.data);

/** Desembrulha listas paginadas ({ data: T[], meta }). */
export const unwrapPage = <T>(p: Promise<AxiosResponse<Envelope<T[], Paginacao>>>): Promise<Pagina<T>> =>
  p.then((r) => ({
    items: r.data.data,
    meta: r.data.meta ?? { total: r.data.data.length, page: 1, perPage: r.data.data.length, totalPages: 1 },
  }));

/** Remove chaves undefined/'' dos query params (a API valida estritamente). */
export function limparParams<T extends object>(p: T): Partial<T> {
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== '' && v !== null)) as Partial<T>;
}

/** Serializa arrays como ?a=1&a=2 (formato aceito pelo Joi). */
export function paramsSerializer(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else sp.append(k, String(v));
  });
  return sp.toString();
}
