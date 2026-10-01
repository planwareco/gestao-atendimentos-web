import { limparParams, unwrap } from '../createClient';
import { http } from '../http';
import type { Comissoes, Dashboard, ResultadoFinanceiro } from '../types';

export const dashboardApi = {
  obter: (ano: number, mes?: number) => unwrap<Dashboard>(http.get('/dashboard', { params: limparParams({ ano, mes }) })),
};

export const financeiroApi = {
  resultado: (inicio: string, fim: string) => unwrap<ResultadoFinanceiro>(http.get('/financeiro/resultado', { params: { inicio, fim } })),
  comissoes: (inicio: string, fim: string, profissionalId?: string) =>
    unwrap<Comissoes>(http.get('/financeiro/comissoes', { params: limparParams({ inicio, fim, profissionalId }) })),
};
