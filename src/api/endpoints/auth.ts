import { unwrap } from '../createClient';
import { http } from '../http';
import type { LinkCheckout, Sessao, SessaoComToken } from '../types';

export const authApi = {
  login: (email: string, senha: string) => unwrap<SessaoComToken>(http.post('/auth/login', { email, senha })),
  logout: () => http.post('/auth/logout', {}),
  me: () => unwrap<Sessao>(http.get('/auth/me')),
  alterarSenha: (senhaAtual: string, novaSenha: string) => unwrap<{ message: string }>(http.put('/auth/senha', { senhaAtual, novaSenha })),
  checkoutLink: () => unwrap<LinkCheckout>(http.post('/auth/checkout-link', {})),
};
