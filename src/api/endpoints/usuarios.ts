import { limparParams, unwrap, unwrapPage } from '../createClient';
import { http } from '../http';
import type { Papel, UsuarioEquipe } from '../types';

export const usuariosApi = {
  listar: (f: { papel?: Papel; ativo?: boolean; page?: number; perPage?: number }) =>
    unwrapPage<UsuarioEquipe>(http.get('/usuarios', { params: limparParams(f) })),
  obter: (id: string) => unwrap<UsuarioEquipe>(http.get(`/usuarios/${id}`)),
  criar: (body: { nome: string; email: string; senha: string; papel: Papel; profissionalId?: string }) =>
    unwrap<UsuarioEquipe>(http.post('/usuarios', body)),
  atualizar: (id: string, body: { nome?: string; papel?: Papel; ativo?: boolean; novaSenha?: string }) =>
    unwrap<UsuarioEquipe>(http.patch(`/usuarios/${id}`, body)),
};
