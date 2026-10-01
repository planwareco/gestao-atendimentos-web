import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { clientesApi } from '@/api/endpoints/clientes';
import type { StatusAtendimento } from '@/api/types';
import { useSession } from '@/auth/SessionProvider';
import { RetornoBadge, StatusAtendimentoBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, Skeleton, SkeletonRows } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';
import { Segmented } from '@/components/ui/Tabs';
import { StatCard } from '@/components/ui/StatCard';
import { cn } from '@/lib/cn';
import { fmtDataHora, fmtDataLonga } from '@/lib/dates';
import { labelForma } from '@/lib/labels';
import { brl } from '@/lib/money';
import { useRotulos } from '@/lib/rotulos';
import { AtendimentoDetalheModal } from './AtendimentoDetalheModal';
import { AtendimentoFormModal } from './AtendimentoFormModal';
import type { Atendimento } from '@/api/types';

/** Resumo comercial + linha do tempo do cliente (usado na página do cliente e no Histórico). */
export function ClientePainel({ clienteId }: { clienteId: string }) {
  const r = useRotulos();
  const { sessao } = useSession();
  const tz = sessao?.empresa.fusoHorario ?? 'America/Sao_Paulo';
  const [status, setStatus] = useState<StatusAtendimento | 'TODOS'>('TODOS');
  const [page, setPage] = useState(1);
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [editar, setEditar] = useState<Atendimento | null>(null);

  const resumo = useQuery({ queryKey: ['clientes', clienteId, 'resumo'], queryFn: () => clientesApi.resumo(clienteId) });
  const hist = useQuery({
    queryKey: ['clientes', clienteId, 'historico', status, page],
    queryFn: () => clientesApi.historico(clienteId, { status: status === 'TODOS' ? undefined : status, page, perPage: 10 }),
    placeholderData: keepPreviousData,
  });
  const s = resumo.data;

  return (
    <div className="stack" style={{ ['--gap' as string]: '1.25rem' }}>
      {resumo.error ? (
        <ErrorState erro={resumo.error} onTentar={() => resumo.refetch()} />
      ) : (
        <div className="kpis kpis--cliente">
          <StatCard rotulo="Total gasto" icon="bx-wallet" valor={brl(s?.totalGastoCentavos)} rodape={`${s?.atendimentosRealizados ?? 0} realizados`} carregando={resumo.isLoading} tom="success" />
          <StatCard rotulo="Ticket médio" icon="bx-receipt" valor={brl(s?.ticketMedioCentavos)} carregando={resumo.isLoading} delay={60} />
          <StatCard
            rotulo="Frequência"
            icon="bx-repeat"
            valor={s?.frequenciaMediaDias ? `${s.frequenciaMediaDias} dias` : '-'}
            rodape={s?.diasDesdeUltimo != null ? `última visita há ${s.diasDesdeUltimo} dias` : 'sem visitas ainda'}
            carregando={resumo.isLoading}
            tom="info"
            delay={120}
          />
          <article className="stat stat--warning" data-aos="fade-up" data-aos-delay="180">
            <div className="stat__top">
              <span className="stat__label">Retorno</span>
              <span className="stat__icon" aria-hidden="true">
                <i className="bx bx-bell" />
              </span>
            </div>
            <div className="stat__value">{resumo.isLoading ? <Skeleton w="60%" h={24} /> : <RetornoBadge situacao={s?.situacaoRetorno ?? null} />}</div>
            <div className="stat__foot">
              {s?.proximoAtendimento ? (
                <button type="button" className="btn btn--link btn--sm" onClick={() => setDetalhe(s.proximoAtendimento!.id)}>
                  Próximo: {fmtDataLonga(s.proximoAtendimento.inicio, tz)}
                </button>
              ) : (
                'Nenhum horário futuro'
              )}
            </div>
          </article>
        </div>
      )}

      <section className="card" aria-labelledby="hist-tit">
        <div className="card__head">
          <h2 className="card__title" id="hist-tit">
            <i className="bx bx-history" aria-hidden="true" /> Histórico de {r.atendimentos.toLowerCase()}
          </h2>
          <Segmented
            label="Filtrar histórico"
            valor={status}
            onChange={(v) => (setStatus(v), setPage(1))}
            opcoes={[
              { valor: 'TODOS', label: 'Todos' },
              { valor: 'REALIZADO', label: 'Realizados' },
              { valor: 'AGENDADO', label: 'Agendados' },
              { valor: 'CANCELADO', label: 'Cancelados' },
            ]}
          />
        </div>
        <div className="card__body">
          {hist.error ? (
            <ErrorState erro={hist.error} onTentar={() => hist.refetch()} />
          ) : hist.isLoading ? (
            <SkeletonRows linhas={4} />
          ) : !hist.data?.items.length ? (
            <EmptyState icon="bx-calendar" titulo="Sem histórico" texto={`Os ${r.atendimentos.toLowerCase()} deste ${r.cliente.toLowerCase()} aparecem aqui.`} />
          ) : (
            <>
              <ol className="timeline">
                {hist.data.items.map((a) => (
                  <li key={a.id} className={cn('timeline__item', `is-${a.status.toLowerCase()}`)}>
                    <span className="timeline__ponto" aria-hidden="true" />
                    <button type="button" className="timeline__card" onClick={() => setDetalhe(a.id)}>
                      <div className="timeline__topo">
                        <span className="num timeline__data">{fmtDataHora(a.inicio, tz)}</span>
                        <StatusAtendimentoBadge status={a.status} />
                      </div>
                      <strong className={a.status === 'CANCELADO' ? 'is-strike' : undefined}>{a.itens.map((i) => i.descricao).join(', ')}</strong>
                      <div className="timeline__rodape">
                        <span className="num">{brl(a.totalCentavos)}</span>
                        {a.profissional && <span>com {a.profissional.nome}</span>}
                        {a.status === 'REALIZADO' && <span>{labelForma(a.formaPagamento)}</span>}
                      </div>
                    </button>
                  </li>
                ))}
              </ol>
              <Pagination meta={hist.data.meta} onPage={setPage} />
            </>
          )}
        </div>
      </section>

      <AtendimentoDetalheModal
        id={detalhe}
        onFechar={() => setDetalhe(null)}
        onEditar={(a) => {
          setDetalhe(null);
          setEditar(a);
        }}
      />
      <AtendimentoFormModal aberto={Boolean(editar)} atendimento={editar} onFechar={() => setEditar(null)} />
    </div>
  );
}
