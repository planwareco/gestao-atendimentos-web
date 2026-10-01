import { limparParams, unwrap, unwrapPage } from '../createClient';
import { http } from '../http';
import type { Profissional, ProfissionalPayload, StatusAtivo } from '../types';

export const profissionaisApi = {
  listar: (f: { status?: StatusAtivo; servicoId?: string; page?: number; perPage?: number }) =>
    unwrapPage<Profissional>(http.get('/profissionais', { params: limparParams(f) })),
  obter: (id: string) => unwrap<Profissional>(http.get(`/profissionais/${id}`)),
  criar: (body: ProfissionalPayload) => unwrap<Profissional>(http.post('/profissionais', body)),
  atualizar: (id: string, body: ProfissionalPayload) => unwrap<Profissional>(http.put(`/profissionais/${id}`, body)),
  remover: (id: string) => http.delete(`/profissionais/${id}`),
};
