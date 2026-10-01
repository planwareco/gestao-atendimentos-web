import type { AxiosResponse } from 'axios';
import { limparParams, unwrap } from '../createClient';
import { http } from '../http';
import type { CategoriaDespesa, Despesa, DespesaPayload, Envelope, Paginacao } from '../types';

export interface FiltroDespesas {
  inicio?: string;
  fim?: string;
  categoriaId?: string;
  status?: 'PENDENTE' | 'PAGA';
  busca?: string;
  page?: number;
  perPage?: number;
}
export interface PaginaDespesas {
  items: Despesa[];
  meta: Paginacao & { totalValorCentavos?: number };
}

export const despesasApi = {
  listar: (f: FiltroDespesas): Promise<PaginaDespesas> =>
    http
      .get('/despesas', { params: limparParams(f) })
      .then((r: AxiosResponse<Envelope<Despesa[], Paginacao & { totalValorCentavos?: number }>>) => ({ items: r.data.data, meta: r.data.meta })),
  obter: (id: string) => unwrap<Despesa>(http.get(`/despesas/${id}`)),
  criar: (body: DespesaPayload) => unwrap<Despesa>(http.post('/despesas', body)),
  atualizar: (id: string, body: DespesaPayload) => unwrap<Despesa>(http.put(`/despesas/${id}`, body)),
  remover: (id: string) => http.delete(`/despesas/${id}`),
  categorias: (incluirInativas = false) => unwrap<CategoriaDespesa[]>(http.get('/despesas/categorias', { params: { incluirInativas } })),
  criarCategoria: (body: { nome: string; cor?: string | null }) => unwrap<CategoriaDespesa>(http.post('/despesas/categorias', body)),
  atualizarCategoria: (id: string, body: { nome?: string; cor?: string | null; ativo?: boolean }) =>
    unwrap<CategoriaDespesa>(http.put(`/despesas/categorias/${id}`, body)),
  removerCategoria: (id: string) => http.delete(`/despesas/categorias/${id}`),
};
