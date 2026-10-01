import { createSessionClient, paramsSerializer } from './createClient';
import type { AdminSessao } from './types';

/** Sessão do super admin: segredo, cookie (ga_art) e token totalmente separados. */
export const adminClient = createSessionClient<AdminSessao>({
  refreshPath: '/admin/auth/refresh',
  lockName: 'ga-admin-refresh',
  tokenFrom: (s) => s.accessToken,
});

export const adminHttp = adminClient.http;
adminHttp.defaults.paramsSerializer = { serialize: paramsSerializer };
