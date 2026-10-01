import { limparParams, unwrap } from '../createClient';
import { http } from '../http';
import type { Atendimento, HorariosLivres } from '../types';

export const agendaApi = {
  listar: (f: { inicio: string; fim: string; profissionalId?: string; incluirCancelados?: boolean }) =>
    unwrap<Atendimento[]>(http.get('/agenda', { params: limparParams(f) })),
  horariosLivres: (f: { data: string; servicoIds?: string[]; profissionalId?: string; duracaoMinutos?: number; passoMinutos?: number }) =>
    unwrap<HorariosLivres>(http.get('/agenda/horarios-livres', { params: limparParams(f) })),
};
