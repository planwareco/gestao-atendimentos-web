import axios from 'axios';
import { API_URL } from '../createClient';
import { http } from '../http';
import type { CadastroPayload, CadastroResposta, Envelope, PlanoPublico, PrecoSimulado, SegmentoPublico } from '../types';

const pub = axios.create({ baseURL: `${API_URL}/v1/public` });

export const publicoApi = {
  plano: () => pub.get<Envelope<PlanoPublico | null>>('/plano').then((r) => r.data.data),
  segmentos: () => pub.get<Envelope<SegmentoPublico[]>>('/segmentos').then((r) => r.data.data),
  preco: (modulos: string[]) => pub.post<Envelope<PrecoSimulado>>('/plano/preco', { modulos }).then((r) => r.data.data),
  /** Usa o cliente com credenciais: a resposta grava o cookie de refresh. */
  cadastro: (body: CadastroPayload) => http.post<Envelope<CadastroResposta>>('/public/cadastro', body).then((r) => r.data.data),
};
