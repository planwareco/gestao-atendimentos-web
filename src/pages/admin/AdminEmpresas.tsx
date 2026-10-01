import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints/admin';
import type { StatusEmpresa } from '@/api/types';
import { StatusEmpresaBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { fmtDataCurtaInstante } from '@/lib/dates';
import { useDebounce } from '@/lib/hooks';
import { iconeModulo, STATUS_EMPRESA } from '@/lib/labels';
import { brl } from '@/lib/money';

/** Empresas da plataforma com busca e filtro por status. */
export default function AdminEmpresas() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as StatusEmpresa | null) ?? undefined;
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const termo = useDebounce(busca.trim(), 300);
  const filtros = { status, busca: termo || undefined, page, perPage: 20 };
  const q = useQuery({ queryKey: ['admin', 'empresas', filtros], queryFn: () => adminApi.empresas(filtros), placeholderData: keepPreviousData });

  const setStatus = (s?: StatusEmpresa) => {
    setPage(1);
    if (s) params.set('status', s);
    else params.delete('status');
    setParams(params, { replace: true });
  };

  return (
    <div className="page">
      <PageHeader titulo="Empresas" descricao="Mensalidade atrasada? Coloque em somente leitura com o motivo. Pagou, reative. Nada é apagado." />
      <div className="toolbar" data-aos="fade-up">
        <Input aria-label="Buscar" placeholder="Nome, e-mail ou documento" icon="bx-search" value={busca} onChange={(e) => (setBusca(e.target.value), setPage(1))} fieldClassName="toolbar__busca" />
        <div className="row" role="group" aria-label="Status">
          <button type="button" className="chip" aria-pressed={!status} onClick={() => setStatus()}>
            Todas
          </button>
          {(Object.keys(STATUS_EMPRESA) as StatusEmpresa[]).map((s) => (
            <button key={s} type="button" className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
              {STATUS_EMPRESA[s].label}
            </button>
          ))}
        </div>
      </div>
      <section className="card card--pad" data-aos="fade-up" data-aos-delay="60">
        {q.error ? (
          <ErrorState erro={q.error} onTentar={() => q.refetch()} />
        ) : q.isLoading ? (
          <SkeletonRows />
        ) : !q.data?.items.length ? (
          <EmptyState icon="bx-buildings" titulo="Nenhuma empresa encontrada" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table table--cards">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Status</th>
                    <th>Módulos</th>
                    <th className="t-right">Mensal</th>
                    <th className="t-right">Usuários</th>
                    <th className="t-right">Clientes</th>
                    <th>Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((e) => (
                    <tr key={e.id} className="is-clickable" onClick={() => navigate(`/admin/empresas/${e.id}`)}>
                      <td className="t-primary">
                        <button type="button" className="cell-link cell-link--stack" onClick={(ev) => (ev.stopPropagation(), navigate(`/admin/empresas/${e.id}`))}>
                          {e.nomeFantasia ?? e.nome}
                          <small>{e.email}</small>
                        </button>
                      </td>
                      <td data-label="Status">
                        <StatusEmpresaBadge status={e.status} />
                      </td>
                      <td data-label="Módulos">
                        <span className="modulos-icones">
                          {e.modulos.map((m) => (
                            <i key={m} className={`bx ${iconeModulo(m)}`} title={m} aria-label={m} />
                          ))}
                        </span>
                      </td>
                      <td data-label="Mensal" className="t-right num t-strong">
                        {brl(e.valorMensalCentavos)}
                      </td>
                      <td data-label="Usuários" className="t-right num">
                        {e.totais.usuarios}
                      </td>
                      <td data-label="Clientes" className="t-right num">
                        {e.totais.clientes}
                      </td>
                      <td data-label="Cadastro" className="num">
                        {fmtDataCurtaInstante(e.criadoEm)}
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
