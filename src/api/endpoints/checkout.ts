import axios from 'axios';
import { API_URL } from '../createClient';
import type { Envelope, ResumoCheckout } from '../types';

/** O token do link identifica a empresa: sem header de autenticação. */
export const checkoutBaseUrl = (token: string) => `${API_URL}/v1/checkout/${encodeURIComponent(token)}`;

export const checkoutApi = {
  resumo: (token: string) => axios.get<Envelope<ResumoCheckout>>(`${checkoutBaseUrl(token)}/resumo`).then((r) => r.data.data),
};
