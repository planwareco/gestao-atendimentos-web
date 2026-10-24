import type { AxiosAdapter, AxiosInstance } from 'axios';
import { ehDemo } from '@/demo/modo';
import { createSessionClient, paramsSerializer } from './createClient';
import type { SessaoComToken } from './types';

/** No modo demonstração as requisições não saem do navegador: o backend simulado responde. */
const adapterDemo: AxiosAdapter = async (cfg) => (await import('@/demo/backend')).adapterDemo(cfg);
export function usarDemoQuandoAtiva(cliente: AxiosInstance) {
  cliente.interceptors.request.use((cfg) => {
    if (ehDemo()) cfg.adapter = adapterDemo;
    return cfg;
  });
}

/** Sessão dos usuários das empresas (cookie ga_rt, path /v1/auth). */
export const usuarioClient = createSessionClient<SessaoComToken>({
  refreshPath: '/auth/refresh',
  lockName: 'ga-refresh',
  tokenFrom: (s) => s.accessToken,
  refreshPeloCliente: ehDemo,
});

export const http = usuarioClient.http;
http.defaults.paramsSerializer = { serialize: paramsSerializer };
usarDemoQuandoAtiva(http);
