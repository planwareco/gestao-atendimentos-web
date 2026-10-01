import type { AxiosResponse } from 'axios';
import { limparParams, unwrap, unwrapPage } from '../createClient';
import { http } from '../http';
import type { Atendimento, Orcamento, OrcamentoPayload, StatusOrcamento } from '../types';

export interface FiltroOrcamentos {
  status?: StatusOrcamento;
  clienteId?: string;
  numero?: number;
  page?: number;
  perPage?: number;
}

export const orcamentosApi = {
  listar: (f: FiltroOrcamentos) => unwrapPage<Orcamento>(http.get('/orcamentos', { params: limparParams(f) })),
  obter: (id: string) => unwrap<Orcamento>(http.get(`/orcamentos/${id}`)),
  criar: (body: OrcamentoPayload) => unwrap<Orcamento>(http.post('/orcamentos', body)),
  atualizar: (id: string, body: OrcamentoPayload) => unwrap<Orcamento>(http.put(`/orcamentos/${id}`, body)),
  status: (id: string, status: Exclude<StatusOrcamento, 'EXPIRADO'>) => unwrap<Orcamento>(http.patch(`/orcamentos/${id}/status`, { status })),
  remover: (id: string) => http.delete(`/orcamentos/${id}`),
  converter: (id: string, body: { inicio: string; profissionalId?: string | null; encaixe?: boolean; observacoes?: string | null }) =>
    unwrap<Atendimento>(http.post(`/orcamentos/${id}/converter`, body)),
  /** 202 enquanto gera (fila), 200 com o PDF. */
  pdf: (id: string): Promise<AxiosResponse<Blob>> =>
    http.get(`/orcamentos/${id}/pdf`, { responseType: 'blob', validateStatus: (s) => s === 200 || s === 202 }),
};
