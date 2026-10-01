import { limparParams, unwrap, unwrapPage } from '../createClient';
import { http } from '../http';
import type { Atendimento, AtendimentoPayload, MudancaStatusAtendimento, StatusAtendimento } from '../types';

export interface FiltroAtendimentos {
  inicio?: string;
  fim?: string;
  status?: StatusAtendimento[];
  clienteId?: string;
  profissionalId?: string;
  page?: number;
  perPage?: number;
}

export const atendimentosApi = {
  listar: (f: FiltroAtendimentos) => unwrapPage<Atendimento>(http.get('/atendimentos', { params: limparParams(f) })),
  obter: (id: string) => unwrap<Atendimento>(http.get(`/atendimentos/${id}`)),
  criar: (body: AtendimentoPayload) => unwrap<Atendimento>(http.post('/atendimentos', body)),
  atualizar: (id: string, body: AtendimentoPayload) => unwrap<Atendimento>(http.put(`/atendimentos/${id}`, body)),
  status: (id: string, body: MudancaStatusAtendimento) => unwrap<Atendimento>(http.patch(`/atendimentos/${id}/status`, body)),
};
