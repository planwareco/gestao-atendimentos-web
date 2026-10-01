import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profissionaisApi } from '@/api/endpoints/profissionais';
import { usuariosApi } from '@/api/endpoints/usuarios';
import type { Papel, UsuarioEquipe } from '@/api/types';
import { useSession } from '@/auth/SessionProvider';
import { usePermissao } from '@/auth/usePermissao';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/cn';
import { relativo } from '@/lib/dates';
import { tratarErro } from '@/lib/errors';
import { PAPEIS } from '@/lib/labels';
import { toast } from '@/lib/notify';

const SENHA_OK = (s: string) => s.length >= 8 && s.length <= 72 && /[A-Za-z]/.test(s) && /\d/.test(s);

/** Usuários da empresa: papéis, ativação e vínculo com profissional. */
export default function Equipe() {
  const { sessao } = useSession();
  const { podeEscrever } = usePermissao();
  const escrever = podeEscrever('usuarios:gerenciar');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ aberto: boolean; u?: UsuarioEquipe }>({ aberto: false });
  const q = useQuery({ queryKey: ['usuarios', page], queryFn: () => usuariosApi.listar({ page, perPage: 20 }), placeholderData: keepPreviousData });

  return (
    <div className="page">
      <PageHeader
        titulo="Equipe"
        descricao="Quem acessa o sistema e o que cada pessoa pode ver."
        acoes={
          escrever && (
            <Button icon="bx-user-plus" onClick={() => setForm({ aberto: true })}>
              Convidar pessoa
            </Button>
          )
        }
      />

      <div className="papeis" data-aos="fade-up">
        {(Object.keys(PAPEIS) as Papel[]).map((p) => (
          <div key={p} className="papeis__item">
            <i className={`bx ${PAPEIS[p].icone}`} aria-hidden="true" />
            <div>
              <strong>{PAPEIS[p].label}</strong>
              <p>{PAPEIS[p].descricao}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="card card--pad" data-aos="fade-up" data-aos-delay="60">
        {q.error ? (
          <ErrorState erro={q.error} onTentar={() => q.refetch()} />
        ) : q.isLoading ? (
          <SkeletonRows linhas={4} />
        ) : !q.data?.items.length ? (
          <EmptyState icon="bx-group" titulo="Só você por aqui" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table table--cards">
                <thead>
                  <tr>
                    <th>Pessoa</th>
                    <th>Papel</th>
                    <th>Profissional</th>
                    <th>Último acesso</th>
                    <th>Situação</th>
                    {escrever && (
                      <th className="t-actions">
                        <span className="sr-only">Ações</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((u) => (
                    <tr key={u.id} className={cn(!u.ativo && 'is-muted')}>
                      <td className="t-primary">
                        <span className="cell-pessoa">
                          <Avatar nome={u.nome} size={32} />
                          <span>
                            {u.nome} {u.id === sessao?.usuario.id && <Badge tom="primary">você</Badge>}
                            <small>{u.email}</small>
                          </span>
                        </span>
                      </td>
                      <td data-label="Papel">
                        <Badge icon={PAPEIS[u.papel].icone}>{PAPEIS[u.papel].label}</Badge>
                      </td>
                      <td data-label="Profissional">{u.profissional?.nome ?? '-'}</td>
                      <td data-label="Último acesso">{u.ultimoLoginEm ? relativo(u.ultimoLoginEm) : 'Nunca'}</td>
                      <td data-label="Situação">{u.ativo ? <Badge tom="success">Ativo</Badge> : <Badge tom="danger">Desativado</Badge>}</td>
                      {escrever && (
                        <td className="t-actions">
                          <Button size="sm" variant="ghost" icon="bx-edit-alt" onClick={() => setForm({ aberto: true, u })}>
                            Gerenciar
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={q.data.meta} onPage={setPage} />
          </>
        )}
      </section>

      <UsuarioModal aberto={form.aberto} usuario={form.u} onFechar={() => setForm({ aberto: false })} proprio={form.u?.id === sessao?.usuario.id} />
    </div>
  );
}

function UsuarioModal({ aberto, usuario, onFechar, proprio }: { aberto: boolean; usuario?: UsuarioEquipe; onFechar: () => void; proprio: boolean }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [papel, setPapel] = useState<Papel>('RECEPCIONISTA');
  const [profissionalId, setProfissionalId] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [erros, setErros] = useState<Record<string, string>>({});
  const profs = useQuery({ queryKey: ['profissionais', 'ativos'], queryFn: () => profissionaisApi.listar({ status: 'ATIVO', perPage: 100 }), enabled: aberto && !usuario });
  const livres = (profs.data?.items ?? []).filter((p) => !p.usuarioId);

  useEffect(() => {
    if (!aberto) return;
    setNome(usuario?.nome ?? '');
    setEmail(usuario?.email ?? '');
    setSenha('');
    setPapel(usuario?.papel ?? 'RECEPCIONISTA');
    setProfissionalId('');
    setAtivo(usuario?.ativo ?? true);
    setErros({});
  }, [aberto, usuario]);

  const salvar = useMutation({
    mutationFn: () => {
      if (usuario) {
        const body: { nome?: string; papel?: Papel; ativo?: boolean; novaSenha?: string } = {};
        if (nome.trim() !== usuario.nome) body.nome = nome.trim();
        if (papel !== usuario.papel) body.papel = papel;
        if (ativo !== usuario.ativo) body.ativo = ativo;
        if (senha) body.novaSenha = senha;
        return usuariosApi.atualizar(usuario.id, body);
      }
      return usuariosApi.criar({ nome: nome.trim(), email: email.trim().toLowerCase(), senha, papel, profissionalId: papel === 'PROFISSIONAL' && profissionalId ? profissionalId : undefined });
    },
    onSuccess: () => {
      ['usuarios', 'profissionais'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.ok(usuario ? 'Acesso atualizado.' : 'Pessoa adicionada. Envie a ela o e-mail e a senha de acesso.');
      onFechar();
    },
    onError: (e) =>
      tratarErro(e, {
        on: {
          EMAIL_EM_USO: () => (setErros({ email: 'Este e-mail já tem acesso ao sistema.' }), true),
          ALTERACAO_PROPRIA_PROIBIDA: (b) => (setErros({ geral: b.message }), true),
          ULTIMO_PROPRIETARIO: (b) => (setErros({ geral: b.message }), true),
        },
      }),
  });

  const enviar = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (nome.trim().length < 2) e.nome = 'Informe o nome.';
    if (!usuario && !/^\S+@\S+\.\S+$/.test(email)) e.email = 'E-mail inválido.';
    if ((!usuario || senha) && !SENHA_OK(senha)) e.senha = '8 a 72 caracteres, com letras e números.';
    if (!usuario && papel === 'PROFISSIONAL' && !profissionalId) e.prof = 'Vincule a um profissional cadastrado.';
    setErros(e);
    if (Object.keys(e).length) return;
    if (usuario && !(nome.trim() !== usuario.nome || papel !== usuario.papel || ativo !== usuario.ativo || senha)) return onFechar();
    salvar.mutate();
  };

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={usuario ? `Gerenciar ${usuario.nome}` : 'Convidar pessoa'}
      subtitulo={usuario ? usuario.email : 'Ela entra com o e-mail e a senha que você definir aqui.'}
      onSubmit={enviar}
      bloquearFechar={salvar.isPending}
      rodape={
        <>
          <Button variant="ghost" onClick={onFechar} disabled={salvar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" icon="bx-check" loading={salvar.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="stack">
        {erros.geral && (
          <div className="callout callout--warning" role="alert">
            <i className="bx bx-error" aria-hidden="true" />
            <span>{erros.geral}</span>
          </div>
        )}
        <div className="form-grid">
          <Input label="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} error={erros.nome} fieldClassName="span-2" data-autofocus />
          {!usuario && <Input label="E-mail de login" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={erros.email} fieldClassName="span-2" />}
          <Input
            label={usuario ? 'Redefinir senha' : 'Senha inicial'}
            type="password"
            autoComplete="new-password"
            required={!usuario}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            error={erros.senha}
            hint={usuario ? 'Deixe em branco para manter a atual.' : '8 a 72 caracteres, com letras e números.'}
            fieldClassName="span-2"
          />
        </div>
        <div className="field">
          <span className="field__label">Papel</span>
          <div className="papel-opcoes" role="radiogroup" aria-label="Papel">
            {(Object.keys(PAPEIS) as Papel[]).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={papel === p} className="papel-opcao" disabled={proprio} onClick={() => setPapel(p)}>
                <i className={`bx ${PAPEIS[p].icone}`} aria-hidden="true" />
                <strong>{PAPEIS[p].label}</strong>
                <small>{PAPEIS[p].descricao}</small>
              </button>
            ))}
          </div>
        </div>
        {!usuario && papel === 'PROFISSIONAL' && (
          <Select label="Profissional vinculado" required value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)} error={erros.prof} hint={livres.length ? 'O login verá só a agenda deste profissional.' : 'Cadastre o profissional antes em Profissionais.'}>
            <option value="">Selecione</option>
            {livres.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
        )}
        {usuario && !proprio && <Switch checked={ativo} onChange={setAtivo} label="Acesso ativo" descricao="Desativar encerra as sessões abertas desta pessoa." />}
      </div>
    </Modal>
  );
}
