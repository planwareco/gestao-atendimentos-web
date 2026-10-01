import { unwrap } from '../createClient';
import { http } from '../http';
import type { Configuracoes, ConfiguracoesPayload } from '../types';

export const configuracoesApi = {
  obter: () => unwrap<Configuracoes>(http.get('/configuracoes')),
  atualizar: (body: ConfiguracoesPayload) => unwrap<unknown>(http.put('/configuracoes', body)),
};
