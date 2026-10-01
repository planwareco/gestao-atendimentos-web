import { createSessionClient, paramsSerializer } from './createClient';
import type { SessaoComToken } from './types';

/** Sessão dos usuários das empresas (cookie ga_rt, path /v1/auth). */
export const usuarioClient = createSessionClient<SessaoComToken>({
  refreshPath: '/auth/refresh',
  lockName: 'ga-refresh',
  tokenFrom: (s) => s.accessToken,
});

export const http = usuarioClient.http;
http.defaults.paramsSerializer = { serialize: paramsSerializer };
