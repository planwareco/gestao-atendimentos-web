import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orcamentosApi } from '@/api/endpoints/orcamentos';
import { profissionaisApi } from '@/api/endpoints/profissionais';
import type { StatusOrcamento } from '@/api/types';
import { useSession } from '@/auth/SessionProvider';
import { usePermissao } from '@/auth/usePermissao';
import { Avatar } from '@/components/ui/Avatar';
import { StatusAtendimentoBadge, StatusOrcamentoBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Field';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { fmtData, fmtDataHora, hojeISO, localParaIso, somarDias } from '@/lib/dates';
import { codigoErro, tratarErro } from '@/lib/errors';
import { linkWhatsapp, maskTelefone } from '@/lib/masks';
import { brl } from '@/lib/money';
import { toast } from '@/lib/notify';
import { useRotulos } from '@/lib/rotulos';
import { numeroOrcamento } from './Orcamentos';

/** Baixa o PDF com polling: 202 enquanto a fila gera, 200 quando fica pronto. */
async function abrirPdf(id: string, numero: number, aoProgresso: (t: number) => void): Promise<boolean> {
  for (let tentativa = 0; tentativa < 15; tentativa++) {
    aoProgresso(tentativa);
    const r = await orcamentosApi.pdf(id);
    if (r.status === 200) {
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const janela = window.open(url, '_blank');
      if (!janela) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `orcamento-${numero}.pdf`;
        a.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return true;
    }
    await new Promise((res) => window.setTimeout(res, 2000));
  }
  return false;
}

/** Detalhe do orçamento com ações por status, PDF assíncrono e conversão em agendamento. */
export default function OrcamentoDetalhe() {
  const { id = '' } = useParams();
  const r = useRotulos();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { sessao } = useSession();
  const { podeEscrever, temModulo, pode } = usePermissao();
  const tz = sessao?.empresa.fusoHorario ?? 'America/Sao_Paulo';
  const escrever = podeEscrever('orcamentos:escrever');
  const [gerandoPdf, setGerandoPdf] = useState<number | null>(null);
  const [converter, setConverter] = useState(false);
  const [excluir, setExcluir] = useState(false);
  const [conv, setConv] = useState({ data: somarDias(hojeISO(tz), 1), hora: '09:00', profissionalId: '', encaixe: false });
  const [erroConv, setErroConv] = useState<string | null>(null);

  const q = useQuery({ queryKey: ['orcamentos', id], queryFn: () => orcamentosApi.obter(id) });
  const o = q.data;
  const multi = temModulo('MULTI_PROFISSIONAL') && pode('atendimentos:todos');
  const profs = useQuery({ queryKey: ['profissionais', 'ativos'], queryFn: () => profissionaisApi.listar({ status: 'ATIVO', perPage: 100 }), enabled: converter && multi });

  const invalidar = () => qc.invalidateQueries({ queryKey: ['orcamentos'] });

  const mudar = useMutation({
    mutationFn: (s: Exclude<StatusOrcamento, 'EXPIRADO'>) => orcamentosApi.status(id, s),
    onSuccess: (n) => {
      invalidar();
      toast.ok({ ENVIADO: 'Orçamento marcado como enviado.', APROVADO: 'Orçamento aprovado. Já pode agendar.', RECUSADO: 'Orçamento marcado como recusado.', RASCUNHO: 'Orçamento voltou para rascunho.' }[n.status as 'ENVIADO'] ?? 'Status atualizado.');
    },
    onError: (e) => tratarErro(e, { on: { TRANSICAO_INVALIDA: () => void q.refetch() } }),
  });

  const remover = useMutation({
    mutationFn: () => orcamentosApi.remover(id),
    onSuccess: () => {
      invalidar();
      toast.ok('Rascunho excluído.');
      navigate('/app/orcamentos', { replace: true });
    },
    onError: (e) => tratarErro(e),
  });

  const converterM = useMutation({
    mutationFn: () => orcamentosApi.converter(id, { inicio: localParaIso(conv.data, conv.hora, tz), profissionalId: multi ? conv.profissionalId || null : undefined, encaixe: conv.encaixe || undefined }),
    onSuccess: (a) => {
      ['orcamentos', 'agenda', 'atendimentos', 'dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.ok(`Agendado para ${fmtDataHora(a.inicio, tz)}.`);
      setConverter(false);
      navigate(`/app/agenda?atendimento=${a.id}`);
    },
    onError: (e) => {
      const c = codigoErro(e);
      if (c === 'AGENDA_CONFLITO') return setErroConv('Este horário já está ocupado. Escolha outro ou marque como encaixe.');
      if (c === 'ORCAMENTO_ITEM_SEM_SERVICO') return setErroConv(`Há itens avulsos. Edite o orçamento e vincule cada item a um ${r.servico.toLowerCase()} antes de agendar.`);
      if (c === 'ORCAMENTO_JA_CONVERTIDO') {
        setConverter(false);
        void q.refetch();
      }
      tratarErro(e);
    },
  });

  const pdf = async () => {
    if (!o) return;
    try {
      const ok = await abrirPdf(o.id, o.numero, setGerandoPdf);
      if (!ok) toast.erro('O PDF está demorando. Tente novamente em instantes.');
    } catch (e) {
      tratarErro(e);
    } finally {
      setGerandoPdf(null);
    }
  };

  if (q.isLoading) return <PageLoader />;
  if (q.error || !o) return <ErrorState erro={q.error} onTentar={() => q.refetch()} />;

  const nomeEmpresa = sessao?.empresa.nomeFantasia ?? sessao?.empresa.nome ?? '';
  const wa = linkWhatsapp(o.cliente.whatsapp ?? o.cliente.telefone, `Olá, ${o.cliente.nome.split(' ')[0]}! Segue o orçamento ${numeroOrcamento(o.numero)} da ${nomeEmpresa}, no valor de ${brl(o.totalCentavos)}. Vou te enviar o PDF aqui.`);
  const editavel = o.status === 'RASCUNHO' || o.status === 'ENVIADO';

  return (
    <div className="page">
      <PageHeader
        titulo={`Orçamento ${numeroOrcamento(o.numero)}`}
        voltar={
          <Link to="/app/orcamentos" className="voltar">
            <i className="bx bx-left-arrow-alt" aria-hidden="true" /> Orçamentos
          </Link>
        }
        acoes={
          <div className="row">
            <Button variant="ghost" icon="bx-file-blank" loading={gerandoPdf !== null} onClick={pdf}>
              PDF
            </Button>
            {wa && (o.status === 'ENVIADO' || o.status === 'RASCUNHO') && (
              <a className="btn btn--ghost" href={wa} target="_blank" rel="noopener noreferrer">
                <i className="bx bxl-whatsapp" aria-hidden="true" /> WhatsApp
              </a>
            )}
            {escrever && editavel && (
              <Button variant="ghost" icon="bx-edit-alt" onClick={() => navigate(`/app/orcamentos/${o.id}/editar`)}>
                Editar
              </Button>
            )}
            {escrever && o.status === 'EXPIRADO' && (
              <Button variant="ghost" icon="bx-revision" onClick={() => navigate(`/app/orcamentos/${o.id}/editar`)}>
                Reenviar
              </Button>
            )}
          </div>
        }
      />

      {gerandoPdf !== null && (
        <div className="callout" role="status">
          <span className="spinner" style={{ width: 18, height: 18 }} />
          <span>Gerando o PDF com a identidade da sua empresa... {gerandoPdf > 2 ? 'quase lá.' : ''}</span>
        </div>
      )}

      <div className="orc-detalhe">
        <section className="orc-folha card" data-aos="fade-up" aria-label="Conteúdo do orçamento">
          <div className="orc-folha__topo">
            <div>
              <span className="text-xs muted">Para</span>
              <div className="row" style={{ ['--gap' as string]: '0.6rem', marginTop: 6 }}>
                <Avatar nome={o.cliente.nome} size={36} />
                <div>
                  <Link to={`/app/clientes/${o.cliente.id}`} className="t-strong">
                    {o.cliente.nome}
                  </Link>
                  <p className="text-sm muted">{maskTelefone(o.cliente.whatsapp ?? o.cliente.telefone) || o.cliente.email || ''}</p>
                </div>
              </div>
            </div>
            <dl className="orc-folha__meta">
              <div>
                <dt>Emissão</dt>
                <dd className="num">{fmtData(o.data)}</dd>
              </div>
              <div>
                <dt>Validade</dt>
                <dd className="num">{o.validade ? fmtData(o.validade) : '-'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusOrcamentoBadge status={o.status} />
                </dd>
              </div>
            </dl>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="t-right">Qtd.</th>
                  <th className="t-right">Unitário</th>
                  <th className="t-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {o.itens.map((i) => (
                  <tr key={i.id}>
                    <td>
                      {i.descricao}
                      {!i.servicoId && <span className="badge" style={{ marginLeft: 8 }}>avulso</span>}
                    </td>
                    <td className="t-right num">{i.quantidade}</td>
                    <td className="t-right num">{brl(i.valorUnitarioCentavos)}</td>
                    <td className="t-right num t-strong">{brl(i.totalCentavos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="detalhe__valores orc-folha__totais">
            <div>
              <dt>Subtotal</dt>
              <dd className="num">{brl(o.subtotalCentavos)}</dd>
            </div>
            {o.descontoCentavos > 0 && (
              <div>
                <dt>Desconto</dt>
                <dd className="num">- {brl(o.descontoCentavos)}</dd>
              </div>
            )}
            {o.acrescimoCentavos > 0 && (
              <div>
                <dt>Acréscimo</dt>
                <dd className="num">+ {brl(o.acrescimoCentavos)}</dd>
              </div>
            )}
            <div className="detalhe__total">
              <dt>Total</dt>
              <dd className="num">{brl(o.totalCentavos)}</dd>
            </div>
          </dl>
          {o.observacoes && <p className="detalhe__obs">{o.observacoes}</p>}
        </section>

        <aside className="orc-acoes card card--pad" data-aos="fade-left">
          <h2 className="card__title">Próximo passo</h2>
          {o.atendimento ? (
            <div className="stack" style={{ ['--gap' as string]: '0.6rem' }}>
              <p className="text-sm">Convertido em {r.atendimento.toLowerCase()}:</p>
              <Link to={`/app/agenda?atendimento=${o.atendimento.id}`} className="orc-acoes__link">
                <i className="bx bx-calendar-check" aria-hidden="true" />
                <span className="grow num">{fmtDataHora(o.atendimento.inicio, tz)}</span>
                <StatusAtendimentoBadge status={o.atendimento.status} />
              </Link>
            </div>
          ) : !escrever ? (
            <p className="text-sm muted">Você pode consultar e baixar o PDF.</p>
          ) : (
            <div className="stack" style={{ ['--gap' as string]: '0.6rem' }}>
              {o.status === 'RASCUNHO' && (
                <>
                  <Button block icon="bx-send" loading={mudar.isPending && mudar.variables === 'ENVIADO'} onClick={() => mudar.mutate('ENVIADO')}>
                    Marcar como enviado
                  </Button>
                  <Button block variant="soft" icon="bx-like" loading={mudar.isPending && mudar.variables === 'APROVADO'} onClick={() => mudar.mutate('APROVADO')}>
                    Aprovar
                  </Button>
                  <Button block variant="danger-ghost" icon="bx-trash" onClick={() => setExcluir(true)}>
                    Excluir rascunho
                  </Button>
                </>
              )}
              {o.status === 'ENVIADO' && (
                <>
                  <Button block icon="bx-like" loading={mudar.isPending && mudar.variables === 'APROVADO'} onClick={() => mudar.mutate('APROVADO')}>
                    Cliente aprovou
                  </Button>
                  <Button block variant="danger-ghost" icon="bx-dislike" loading={mudar.isPending && mudar.variables === 'RECUSADO'} onClick={() => mudar.mutate('RECUSADO')}>
                    Cliente recusou
                  </Button>
                </>
              )}
              {o.status === 'APROVADO' && (
                <Button block variant="accent" icon="bx-calendar-plus" onClick={() => (setErroConv(null), setConverter(true))}>
                  Agendar
                </Button>
              )}
              {(o.status === 'RECUSADO' || o.status === 'EXPIRADO') && <p className="text-sm muted">Este orçamento foi encerrado. Você ainda pode baixar o PDF.</p>}
            </div>
          )}
          <ul className="orc-acoes__linha">
            {o.enviadoEm && (
              <li>
                <i className="bx bx-send" aria-hidden="true" /> Enviado em {fmtDataHora(o.enviadoEm, tz)}
              </li>
            )}
            {o.aprovadoEm && (
              <li>
                <i className="bx bx-like" aria-hidden="true" /> Aprovado em {fmtDataHora(o.aprovadoEm, tz)}
              </li>
            )}
            {o.recusadoEm && (
              <li>
                <i className="bx bx-dislike" aria-hidden="true" /> Recusado em {fmtDataHora(o.recusadoEm, tz)}
              </li>
            )}
          </ul>
        </aside>
      </div>

      <Modal
        aberto={converter}
        onFechar={() => setConverter(false)}
        tamanho="sm"
        titulo="Agendar orçamento"
        subtitulo={`Cria ${r.artigo(r.atendimento) === 'a' ? 'uma' : 'um'} ${r.atendimento.toLowerCase()} com os itens do orçamento.`}
        bloquearFechar={converterM.isPending}
        rodape={
          <>
            <Button variant="ghost" onClick={() => setConverter(false)} disabled={converterM.isPending}>
              Cancelar
            </Button>
            <Button icon="bx-calendar-check" loading={converterM.isPending} onClick={() => converterM.mutate()}>
              Agendar
            </Button>
          </>
        }
      >
        <div className="stack">
          <div className="form-grid">
            <Input label="Data" type="date" value={conv.data} onChange={(e) => setConv({ ...conv, data: e.target.value })} />
            <Input label="Hora" type="time" step={300} value={conv.hora} onChange={(e) => setConv({ ...conv, hora: e.target.value })} />
            {multi && (
              <Select label="Profissional" value={conv.profissionalId} onChange={(e) => setConv({ ...conv, profissionalId: e.target.value })} fieldClassName="span-2">
                <option value="">Sem profissional</option>
                {(profs.data?.items ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <label className="check">
            <input type="checkbox" checked={conv.encaixe} onChange={(e) => setConv({ ...conv, encaixe: e.target.checked })} />
            <span>Permitir encaixe se o horário estiver ocupado</span>
          </label>
          {erroConv && (
            <div className="callout callout--warning" role="alert">
              <i className="bx bx-error" aria-hidden="true" />
              <span>{erroConv}</span>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog aberto={excluir} onFechar={() => setExcluir(false)} onConfirmar={() => remover.mutate()} carregando={remover.isPending} perigo titulo="Excluir rascunho" confirmar="Excluir" mensagem="O rascunho será apagado. Esta ação não pode ser desfeita." />
    </div>
  );
}
