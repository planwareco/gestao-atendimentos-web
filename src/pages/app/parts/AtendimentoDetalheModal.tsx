import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { atendimentosApi } from '@/api/endpoints/atendimentos';
import type { Atendimento, FormaPagamento, MudancaStatusAtendimento } from '@/api/types';
import { useSession } from '@/auth/SessionProvider';
import { usePermissao } from '@/auth/usePermissao';
import { Avatar } from '@/components/ui/Avatar';
import { StatusAtendimentoBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { fmtDataHora, fmtDataLonga, fmtHora } from '@/lib/dates';
import { tratarErro } from '@/lib/errors';
import { FORMAS_PAGAMENTO, labelForma } from '@/lib/labels';
import { linkWhatsapp } from '@/lib/masks';
import { brl } from '@/lib/money';
import { toast } from '@/lib/notify';
import { useRotulos } from '@/lib/rotulos';
import { useInvalidarAtendimentos } from './AtendimentoFormModal';

type Acao = 'REALIZAR' | 'CANCELAR' | null;

/** Detalhe do atendimento com as ações permitidas pelo status (máquina de estados da API). */
export function AtendimentoDetalheModal({ id, onFechar, onEditar }: { id: string | null; onFechar: () => void; onEditar: (a: Atendimento) => void }) {
  const r = useRotulos();
  const { sessao } = useSession();
  const { podeEscrever } = usePermissao();
  const tz = sessao?.empresa.fusoHorario ?? 'America/Sao_Paulo';
  const defs = sessao?.empresa.camposPersonalizados?.atendimento ?? [];
  const invalidar = useInvalidarAtendimentos();
  const [acao, setAcao] = useState<Acao>(null);
  const [forma, setForma] = useState<FormaPagamento | ''>('');
  const [motivo, setMotivo] = useState('');
  const [erroForma, setErroForma] = useState<string>();

  const q = useQuery({ queryKey: ['atendimentos', id], queryFn: () => atendimentosApi.obter(id!), enabled: Boolean(id) });
  const a = q.data;

  const mudar = useMutation({
    mutationFn: (body: MudancaStatusAtendimento) => atendimentosApi.status(id!, body),
    onSuccess: (novo) => {
      invalidar();
      setAcao(null);
      const msg: Record<string, string> = {
        CONFIRMADO: `${r.atendimento} confirmado.`,
        REALIZADO: `${r.atendimento} realizado. Comissões calculadas.`,
        CANCELADO: `${r.atendimento} cancelado. O horário foi liberado.`,
        AGENDADO: `${r.atendimento} voltou para agendado.`,
      };
      toast.ok(msg[novo.status] ?? 'Status atualizado.');
    },
    onError: (err) =>
      tratarErro(err, {
        on: {
          TRANSICAO_INVALIDA: () => void q.refetch(),
          CONFLITO_CONCORRENCIA: () => void q.refetch(),
        },
      }),
  });

  const fechar = () => {
    setAcao(null);
    setForma('');
    setMotivo('');
    setErroForma(undefined);
    onFechar();
  };

  const podeAgir = podeEscrever('atendimentos:escrever') && a && (a.status === 'AGENDADO' || a.status === 'CONFIRMADO');
  const wa = a && linkWhatsapp(a.cliente.whatsapp ?? a.cliente.telefone, `Olá, ${a.cliente.nome.split(' ')[0]}! Confirmando seu horário em ${fmtDataHora(a.inicio, tz)}.`);

  return (
    <>
      <Modal
        aberto={Boolean(id) && !acao}
        onFechar={fechar}
        titulo={a ? a.cliente.nome : r.atendimento}
        subtitulo={a ? `${fmtDataLonga(a.inicio, tz)}, ${fmtHora(a.inicio, tz)} às ${fmtHora(a.fim, tz)}` : undefined}
        rodape={
          a && (
            <div className="acoes-status">
              {wa && (
                <a className="btn btn--ghost btn--sm" href={wa} target="_blank" rel="noopener noreferrer">
                  <i className="bx bxl-whatsapp" aria-hidden="true" /> WhatsApp
                </a>
              )}
              {podeAgir && (
                <>
                  <Button variant="ghost" size="sm" icon="bx-edit-alt" onClick={() => onEditar(a)}>
                    Editar
                  </Button>
                  <Button variant="danger-ghost" size="sm" icon="bx-x" onClick={() => setAcao('CANCELAR')}>
                    Cancelar
                  </Button>
                  {a.status === 'CONFIRMADO' && (
                    <Button variant="ghost" size="sm" icon="bx-undo" loading={mudar.isPending && mudar.variables?.status === 'AGENDADO'} onClick={() => mudar.mutate({ status: 'AGENDADO' })}>
                      Voltar para agendado
                    </Button>
                  )}
                  {a.status === 'AGENDADO' && (
                    <Button variant="soft" size="sm" icon="bx-check" loading={mudar.isPending && mudar.variables?.status === 'CONFIRMADO'} onClick={() => mudar.mutate({ status: 'CONFIRMADO' })}>
                      Confirmar
                    </Button>
                  )}
                  <Button size="sm" icon="bx-check-double" onClick={() => setAcao('REALIZAR')}>
                    Realizado
                  </Button>
                </>
              )}
            </div>
          )
        }
      >
        {q.isLoading && (
          <div className="stack">
            <Skeleton h={20} w="50%" />
            <Skeleton h={80} />
            <Skeleton h={40} />
          </div>
        )}
        {q.error && <ErrorState erro={q.error} onTentar={() => q.refetch()} />}
        {a && <Resumo a={a} defs={defs} tz={tz} />}
      </Modal>

      <Modal
        aberto={acao === 'REALIZAR'}
        onFechar={() => setAcao(null)}
        tamanho="sm"
        titulo="Marcar como realizado"
        subtitulo="Entra no faturamento e congela as comissões."
        bloquearFechar={mudar.isPending}
        rodape={
          <>
            <Button variant="ghost" onClick={() => setAcao(null)} disabled={mudar.isPending}>
              Voltar
            </Button>
            <Button
              icon="bx-check-double"
              loading={mudar.isPending}
              onClick={() => {
                if (!forma) return setErroForma('Informe a forma de pagamento.');
                mudar.mutate({ status: 'REALIZADO', formaPagamento: forma });
              }}
            >
              Confirmar {a ? brl(a.totalCentavos) : ''}
            </Button>
          </>
        }
      >
        <div className="formas" role="radiogroup" aria-label="Forma de pagamento">
          {Object.entries(FORMAS_PAGAMENTO).map(([k, f]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={forma === k}
              className="formas__op"
              onClick={() => {
                setForma(k as FormaPagamento);
                setErroForma(undefined);
              }}
            >
              <i className={`bx ${f.icone}`} aria-hidden="true" />
              {f.label}
            </button>
          ))}
        </div>
        {erroForma && (
          <span className="field__error" role="alert" style={{ marginTop: '0.6rem' }}>
            <i className="bx bx-error-circle" aria-hidden="true" />
            {erroForma}
          </span>
        )}
      </Modal>

      <Modal
        aberto={acao === 'CANCELAR'}
        onFechar={() => setAcao(null)}
        tamanho="sm"
        titulo={`Cancelar ${r.atendimento.toLowerCase()}`}
        subtitulo="O horário fica livre para outra marcação. Esta ação não pode ser desfeita."
        bloquearFechar={mudar.isPending}
        rodape={
          <>
            <Button variant="ghost" onClick={() => setAcao(null)} disabled={mudar.isPending}>
              Voltar
            </Button>
            <Button variant="danger" icon="bx-x" loading={mudar.isPending} onClick={() => mudar.mutate({ status: 'CANCELADO', motivo: motivo.trim() || undefined })}>
              Cancelar {r.atendimento.toLowerCase()}
            </Button>
          </>
        }
      >
        <Textarea label="Motivo" hint="Opcional. Fica no histórico." maxLength={300} rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} data-autofocus />
      </Modal>
    </>
  );
}

/** Corpo do detalhe: status, itens, valores e campos do segmento. */
function Resumo({ a, defs, tz }: { a: Atendimento; defs: { chave: string; rotulo: string }[]; tz: string }) {
  const r = useRotulos();
  const extras = defs.filter((d) => a.camposExtras?.[d.chave] !== undefined && a.camposExtras?.[d.chave] !== null && a.camposExtras?.[d.chave] !== '');
  return (
    <div className="detalhe">
      <div className="detalhe__topo">
        <StatusAtendimentoBadge status={a.status} />
        {a.encaixe && (
          <span className="badge badge--warning">
            <i className="bx bx-layer-plus" aria-hidden="true" /> Encaixe
          </span>
        )}
        {a.profissional && (
          <span className="detalhe__prof">
            <Avatar nome={a.profissional.nome} size={24} cor={a.profissional.cor} />
            {a.profissional.nome}
          </span>
        )}
        <Link to={`/app/clientes/${a.cliente.id}`} className="btn btn--link btn--sm" style={{ marginLeft: 'auto' }}>
          Ver {r.cliente.toLowerCase()}
        </Link>
      </div>

      <ul className="detalhe__itens">
        {a.itens.map((i) => (
          <li key={i.id}>
            <span className="grow">
              <strong>{i.descricao}</strong>
              <small>
                {i.quantidade}x {brl(i.valorUnitarioCentavos)} · {i.duracaoMinutos} min
              </small>
            </span>
            <span className="num">{brl(i.totalCentavos)}</span>
          </li>
        ))}
      </ul>

      <dl className="detalhe__valores">
        <div>
          <dt>Subtotal</dt>
          <dd className="num">{brl(a.subtotalCentavos)}</dd>
        </div>
        {a.descontoCentavos > 0 && (
          <div>
            <dt>Desconto</dt>
            <dd className="num">- {brl(a.descontoCentavos)}</dd>
          </div>
        )}
        {a.acrescimoCentavos > 0 && (
          <div>
            <dt>Acréscimo</dt>
            <dd className="num">+ {brl(a.acrescimoCentavos)}</dd>
          </div>
        )}
        <div className="detalhe__total">
          <dt>Total</dt>
          <dd className="num">{brl(a.totalCentavos)}</dd>
        </div>
        {a.status === 'REALIZADO' && (
          <>
            <div>
              <dt>Pagamento</dt>
              <dd>{labelForma(a.formaPagamento)}</dd>
            </div>
            {a.comissaoTotalCentavos > 0 && (
              <div>
                <dt>Comissão</dt>
                <dd className="num">{brl(a.comissaoTotalCentavos)}</dd>
              </div>
            )}
          </>
        )}
      </dl>

      {extras.length > 0 && (
        <dl className="detalhe__extras">
          {extras.map((d) => (
            <div key={d.chave}>
              <dt>{d.rotulo}</dt>
              <dd>{String(a.camposExtras?.[d.chave] === true ? 'Sim' : a.camposExtras?.[d.chave] === false ? 'Não' : a.camposExtras?.[d.chave])}</dd>
            </div>
          ))}
        </dl>
      )}

      {a.observacoes && <p className="detalhe__obs">{a.observacoes}</p>}
      {a.status === 'CANCELADO' && (
        <div className="callout callout--warning">
          <i className="bx bx-info-circle" aria-hidden="true" />
          <span>
            Cancelado em {a.canceladoEm ? fmtDataHora(a.canceladoEm, tz) : '-'}
            {a.motivoCancelamento ? `. Motivo: ${a.motivoCancelamento}` : '.'}
          </span>
        </div>
      )}
      {a.orcamentoId && (
        <Link to={`/app/orcamentos/${a.orcamentoId}`} className="btn btn--link btn--sm">
          <i className="bx bx-file" aria-hidden="true" /> Veio de um orçamento
        </Link>
      )}
    </div>
  );
}
