import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientesApi } from '@/api/endpoints/clientes';
import { useSession } from '@/auth/SessionProvider';
import { usePermissao } from '@/auth/usePermissao';
import { Avatar } from '@/components/ui/Avatar';
import { AtivoBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { fmtData, idade } from '@/lib/dates';
import { codigoErro, tratarErro } from '@/lib/errors';
import { linkWhatsapp, maskCep, maskDocumento, maskTelefone } from '@/lib/masks';
import { toast } from '@/lib/notify';
import { useRotulos } from '@/lib/rotulos';
import { AtendimentoFormModal } from './parts/AtendimentoFormModal';
import { ClienteFormModal } from './parts/ClienteFormModal';
import { ClientePainel } from './parts/ClientePainel';

/** Página do cliente: dados, campos do segmento, resumo comercial e histórico. */
export default function ClienteDetalhe() {
  const { id = '' } = useParams();
  const r = useRotulos();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { sessao } = useSession();
  const { podeEscrever, pode } = usePermissao();
  const [editar, setEditar] = useState(false);
  const [novoAt, setNovoAt] = useState(false);
  const [excluir, setExcluir] = useState(false);
  const [sugerirInativar, setSugerirInativar] = useState(false);
  const defs = sessao?.empresa.camposPersonalizados?.cliente ?? [];

  const q = useQuery({ queryKey: ['clientes', id], queryFn: () => clientesApi.obter(id) });
  const c = q.data;

  const remover = useMutation({
    mutationFn: () => clientesApi.remover(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      toast.ok(`${r.cliente} excluído.`);
      navigate('/app/clientes', { replace: true });
    },
    onError: (err) => {
      if (codigoErro(err) === 'CLIENTE_COM_HISTORICO') {
        setExcluir(false);
        setSugerirInativar(true);
        return;
      }
      tratarErro(err);
    },
  });
  const inativar = useMutation({
    mutationFn: () => clientesApi.atualizar(id, { status: 'INATIVO' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      setSugerirInativar(false);
      toast.ok(`${r.cliente} inativado. O histórico foi mantido.`);
    },
    onError: (e) => tratarErro(e),
  });

  if (q.error) return <ErrorState erro={q.error} onTentar={() => q.refetch()} />;

  const wa = c && linkWhatsapp(c.whatsapp ?? c.telefone, `Olá, ${c.nome.split(' ')[0]}!`);
  const endereco = c && [c.logradouro && `${c.logradouro}${c.numero ? `, ${c.numero}` : ''}`, c.complemento, c.bairro, c.cidade && `${c.cidade}${c.estado ? `/${c.estado}` : ''}`, c.cep && maskCep(c.cep)].filter(Boolean).join(' · ');
  const extras = c ? defs.filter((d) => c.camposExtras?.[d.chave] !== undefined && c.camposExtras?.[d.chave] !== null && c.camposExtras?.[d.chave] !== '') : [];

  return (
    <div className="page">
      <PageHeader
        titulo={c?.nome ?? r.cliente}
        voltar={
          <Link to="/app/clientes" className="voltar">
            <i className="bx bx-left-arrow-alt" aria-hidden="true" /> {r.clientes}
          </Link>
        }
        acoes={
          c && (
            <div className="row">
              {wa && (
                <a className="btn btn--ghost" href={wa} target="_blank" rel="noopener noreferrer">
                  <i className="bx bxl-whatsapp" aria-hidden="true" /> WhatsApp
                </a>
              )}
              {pode('orcamentos:escrever') && podeEscrever('orcamentos:escrever') && (
                <Button variant="ghost" icon="bx-file" onClick={() => navigate(`/app/orcamentos/novo?clienteId=${c.id}&clienteNome=${encodeURIComponent(c.nome)}`)}>
                  Orçamento
                </Button>
              )}
              {podeEscrever('atendimentos:escrever') && c.status === 'ATIVO' && (
                <Button icon="bx-calendar-plus" onClick={() => setNovoAt(true)}>
                  {r.novo(r.atendimento)}
                </Button>
              )}
            </div>
          )
        }
      />

      <div className="perfil" data-aos="fade-up">
        <aside className="perfil__card card card--pad">
          {!c ? (
            <div className="stack">
              <Skeleton w={64} h={64} r={32} />
              <Skeleton w="70%" h={16} />
              <Skeleton h={80} />
            </div>
          ) : (
            <>
              <div className="perfil__id">
                <Avatar nome={c.nome} size={64} />
                <div>
                  <AtivoBadge status={c.status} />
                  {c.dataNascimento && (
                    <p className="text-sm muted" style={{ marginTop: 6 }}>
                      {fmtData(c.dataNascimento)} · {idade(c.dataNascimento)} anos
                    </p>
                  )}
                </div>
              </div>
              <dl className="perfil__dados">
                <div>
                  <dt>WhatsApp</dt>
                  <dd className="num">{maskTelefone(c.whatsapp) || '-'}</dd>
                </div>
                <div>
                  <dt>Telefone</dt>
                  <dd className="num">{maskTelefone(c.telefone) || '-'}</dd>
                </div>
                <div>
                  <dt>E-mail</dt>
                  <dd>{c.email ?? '-'}</dd>
                </div>
                <div>
                  <dt>Documento</dt>
                  <dd className="num">{c.documento ? maskDocumento(c.documento) : '-'}</dd>
                </div>
                {endereco && (
                  <div className="perfil__full">
                    <dt>Endereço</dt>
                    <dd>{endereco}</dd>
                  </div>
                )}
                {extras.map((d) => (
                  <div key={d.chave}>
                    <dt>{d.rotulo}</dt>
                    <dd>{String(c.camposExtras?.[d.chave] === true ? 'Sim' : c.camposExtras?.[d.chave] === false ? 'Não' : c.camposExtras?.[d.chave])}</dd>
                  </div>
                ))}
              </dl>
              {c.observacoes && <p className="detalhe__obs">{c.observacoes}</p>}
              {podeEscrever('clientes:escrever') && (
                <div className="row perfil__acoes">
                  <Button variant="soft" size="sm" icon="bx-edit-alt" onClick={() => setEditar(true)}>
                    Editar
                  </Button>
                  <Button variant="danger-ghost" size="sm" icon="bx-trash" onClick={() => setExcluir(true)}>
                    Excluir
                  </Button>
                </div>
              )}
            </>
          )}
        </aside>
        <div className="perfil__main">
          <ClientePainel clienteId={id} />
        </div>
      </div>

      <ClienteFormModal aberto={editar} onFechar={() => setEditar(false)} cliente={c} />
      {c && <AtendimentoFormModal aberto={novoAt} onFechar={() => setNovoAt(false)} inicial={{ cliente: { id: c.id, nome: c.nome } }} />}
      <ConfirmDialog
        aberto={excluir}
        onFechar={() => setExcluir(false)}
        onConfirmar={() => remover.mutate()}
        carregando={remover.isPending}
        perigo
        titulo={`Excluir ${r.cliente.toLowerCase()}`}
        confirmar="Excluir"
        mensagem={`Só é possível excluir quem não tem ${r.atendimentos.toLowerCase()} registrados. Esta ação não pode ser desfeita.`}
      />
      <ConfirmDialog
        aberto={sugerirInativar}
        onFechar={() => setSugerirInativar(false)}
        onConfirmar={() => inativar.mutate()}
        carregando={inativar.isPending}
        titulo="Inativar em vez de excluir?"
        confirmar="Inativar"
        mensagem={`Este ${r.cliente.toLowerCase()} tem histórico, então não pode ser apagado. Inativando, ele some das buscas e o histórico continua guardado.`}
      />
    </div>
  );
}
