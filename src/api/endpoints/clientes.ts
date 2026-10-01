import { limparParams, unwrap, unwrapPage } from '../createClient';
import { http } from '../http';
import type { Aniversariante, Atendimento, Cliente, ClienteInativo, ClientePayload, ClienteResumo, StatusAtendimento, StatusAtivo } from '../types';

export interface FiltroClientes {
  busca?: string;
  status?: StatusAtivo;
  ordenar?: 'nome' | 'recentes';
  page?: number;
  perPage?: number;
}

export const clientesApi = {
  listar: (f: FiltroClientes) => unwrapPage<Cliente>(http.get('/clientes', { params: limparParams(f) })),
  obter: (id: string) => unwrap<Cliente>(http.get(`/clientes/${id}`)),
  criar: (body: ClientePayload) => unwrap<Cliente>(http.post('/clientes', body)),
  atualizar: (id: string, body: ClientePayload) => unwrap<Cliente>(http.put(`/clientes/${id}`, body)),
  remover: (id: string) => http.delete(`/clientes/${id}`),
  resumo: (id: string) => unwrap<ClienteResumo>(http.get(`/clientes/${id}/resumo`)),
  historico: (id: string, f: { status?: StatusAtendimento; page?: number; perPage?: number }) =>
    unwrapPage<Atendimento>(http.get(`/clientes/${id}/historico`, { params: limparParams(f) })),
  aniversariantes: (dias = 7) => unwrap<Aniversariante[]>(http.get('/clientes/aniversariantes', { params: { dias } })),
  inativos: (dias = 60) => unwrap<ClienteInativo[]>(http.get('/clientes/inativos', { params: { dias } })),
};
