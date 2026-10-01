import { limparParams, unwrap, unwrapPage } from '../createClient';
import { adminHttp } from '../adminHttp';
import type {
  AdminCatalogo,
  AdminEmpresaDetalhe,
  AdminEmpresaLista,
  AdminLoginResposta,
  AdminMetricas,
  AdminPerfil,
  AdminSessao,
  LogAuditoria,
  Papel,
  StatusEmpresa,
} from '../types';

export const adminAuthApi = {
  login: (email: string, senha: string) => unwrap<AdminLoginResposta>(adminHttp.post('/admin/auth/login', { email, senha })),
  verificar2fa: (mfaToken: string, codigo: string) => unwrap<AdminSessao>(adminHttp.post('/admin/auth/2fa/verificar', { mfaToken, codigo })),
  logout: () => adminHttp.post('/admin/auth/logout', {}),
  me: () => unwrap<AdminPerfil>(adminHttp.get('/admin/auth/me')),
  configurar2fa: () => unwrap<{ otpauthUrl: string; segredo: string; instrucoes: string }>(adminHttp.post('/admin/auth/2fa/configurar', {})),
  ativar2fa: (codigo: string) => unwrap<{ totpAtivo: true }>(adminHttp.post('/admin/auth/2fa/ativar', { codigo })),
};

export const adminApi = {
  metricas: () => unwrap<AdminMetricas>(adminHttp.get('/admin/metricas')),
  empresas: (f: { status?: StatusEmpresa; busca?: string; page?: number; perPage?: number }) =>
    unwrapPage<AdminEmpresaLista>(adminHttp.get('/admin/empresas', { params: limparParams(f) })),
  empresa: (id: string) => unwrap<AdminEmpresaDetalhe>(adminHttp.get(`/admin/empresas/${id}`)),
  alterarStatus: (id: string, status: Exclude<StatusEmpresa, 'PENDENTE'>, motivo?: string) =>
    unwrap<unknown>(adminHttp.patch(`/admin/empresas/${id}/status`, limparParams({ status, motivo }))),
  definirModulos: (id: string, modulos: string[], recalcularValor: boolean) =>
    unwrap<unknown>(adminHttp.put(`/admin/empresas/${id}/modulos`, { modulos, recalcularValor })),
  alterarUsuario: (id: string, usuarioId: string, body: { ativo?: boolean; papel?: Papel }) =>
    unwrap<unknown>(adminHttp.patch(`/admin/empresas/${id}/usuarios/${usuarioId}`, body)),
  catalogo: () => unwrap<AdminCatalogo>(adminHttp.get('/admin/catalogo')),
  atualizarPlano: (body: { precoBaseCentavos: number; nome?: string }) => unwrap<unknown>(adminHttp.put('/admin/catalogo/plano', body)),
  atualizarModulo: (codigo: string, body: { nome?: string; descricao?: string | null; precoCentavos?: number; ativo?: boolean; ordem?: number }) =>
    unwrap<unknown>(adminHttp.patch(`/admin/catalogo/modulos/${codigo}`, body)),
  auditoria: (f: { empresaId?: string; acao?: string; page?: number; perPage?: number }) =>
    unwrapPage<LogAuditoria>(adminHttp.get('/admin/auditoria', { params: limparParams(f) })),
};
