import { limparParams, unwrap, unwrapPage } from '../createClient';
import { http } from '../http';
import type { Servico, ServicoPayload, StatusAtivo } from '../types';

export interface FiltroServicos {
  busca?: string;
  status?: StatusAtivo;
  categoria?: string;
  page?: number;
  perPage?: number;
}

export const servicosApi = {
  listar: (f: FiltroServicos) => unwrapPage<Servico>(http.get('/servicos', { params: limparParams(f) })),
  categorias: () => unwrap<string[]>(http.get('/servicos/categorias')),
  obter: (id: string) => unwrap<Servico>(http.get(`/servicos/${id}`)),
  criar: (body: ServicoPayload) => unwrap<Servico>(http.post('/servicos', body)),
  atualizar: (id: string, body: ServicoPayload) => unwrap<Servico>(http.put(`/servicos/${id}`, body)),
  remover: (id: string) => http.delete(`/servicos/${id}`),
};
