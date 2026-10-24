import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { orcamentosApi } from '@/api/endpoints/orcamentos';
import type { StatusOrcamento } from '@/api/types';
import { usePermissao } from '@/auth/usePermissao';
import { ClientePicker, type ClienteEscolhido } from '@/components/ClientePicker';
import { StatusOrcamentoBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { fmtData } from '@/lib/dates';
import { STATUS_ORCAMENTO } from '@/lib/labels';
import { brl } from '@/lib/money';
import { useRotulos } from '@/lib/rotulos';

export const numeroOrcamento = (n: number) => `#${String(n).padStart(5, '0')}`;

/** Lista de orçamentos com filtro por status, cliente e número. */
export default function Orcamentos() {
  const r = useRotulos();
  const navigate = useNavigate();
  const { podeEscrever } = usePermissao();
  const [status, setStatus] = useState<StatusOrcamento | ''>('');
  const [cliente, setCliente] = useState<ClienteEscolhido | null>(null);
  const [numero, setNumero] = useState('');
  const [page, setPage] = useState(1);
  const filtros = { status: status || undefined, clienteId: cliente?.id, numero: numero ? Number(numero) : undefined, page, perPage: 20 };
  const q = useQuery({ queryKey: ['orcamentos', 'lista', filtros], queryFn: () => orcamentosApi.listar(filtros), placeholderData: keepPreviousData });

  return (
    <div className="page">
      <PageHeader
        titulo="Orçamentos"
        descricao="Do rascunho ao agendamento: envie em PDF, aprove e converta em horário."
        acoes={
          podeEscrever('orcamentos:escrever') && (
            <Button icon="bx-plus" onClick={() => navigate('/app/orcamentos/novo')} data-tour="orcamento-novo">
              Novo orçamento
            </Button>
          )
        }
      />

      <div className="filtros card card--pad" data-aos="fade-up" data-tour="orcamentos-filtros">
        <div className="filtros__grid">
          <ClientePicker valor={cliente} onChange={(c) => (setCliente(c), setPage(1))} label={`Filtrar ${r.cliente.toLowerCase()}`} />
          <Input label="Número" inputMode="numeric" placeholder="Ex.: 42" value={numero} onChange={(e) => (setNumero(e.target.value.replace(/\D/g, '')), setPage(1))} />
        </div>
        <div className="row" role="group" aria-label="Status">
          <button type="button" className="chip" aria-pressed={!status} onClick={() => (setStatus(''), setPage(1))}>
            Todos
          </button>
          {(Object.keys(STATUS_ORCAMENTO) as StatusOrcamento[]).map((s) => (
            <button key={s} type="button" className="chip" aria-pressed={status === s} onClick={() => (setStatus(s), setPage(1))}>
              <i className={`bx ${STATUS_ORCAMENTO[s].icone}`} aria-hidden="true" />
              {STATUS_ORCAMENTO[s].label}
            </button>
          ))}
        </div>
      </div>

      <section className="card card--pad" data-aos="fade-up" data-aos-delay="60" data-tour="orcamentos-lista">
        {q.error ? (
          <ErrorState erro={q.error} onTentar={() => q.refetch()} />
        ) : q.isLoading ? (
          <SkeletonRows />
        ) : !q.data?.items.length ? (
          <EmptyState
            icon="bx-file"
            titulo="Nenhum orçamento"
            texto="Monte um orçamento com itens do catálogo ou avulsos e envie em PDF."
            acao={
              podeEscrever('orcamentos:escrever') && (
                <Button icon="bx-plus" onClick={() => navigate('/app/orcamentos/novo')}>
                  Novo orçamento
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table table--cards">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>{r.cliente}</th>
                    <th>Data</th>
                    <th>Validade</th>
                    <th>Status</th>
                    <th className="t-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((o) => (
                    <tr key={o.id} className="is-clickable" onClick={() => navigate(`/app/orcamentos/${o.id}`)}>
                      <td className="t-primary num">
                        <button type="button" className="cell-link" onClick={(e) => (e.stopPropagation(), navigate(`/app/orcamentos/${o.id}`))}>
                          {numeroOrcamento(o.numero)}
                        </button>
                      </td>
                      <td data-label={r.cliente}>{o.cliente.nome}</td>
                      <td data-label="Data" className="num">
                        {fmtData(o.data)}
                      </td>
                      <td data-label="Validade" className="num">
                        {o.validade ? fmtData(o.validade) : '-'}
                      </td>
                      <td data-label="Status">
                        <StatusOrcamentoBadge status={o.status} />
                      </td>
                      <td data-label="Total" className="t-right num t-strong">
                        {brl(o.totalCentavos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={q.data.meta} onPage={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
