import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints/admin';
import type { StatusEmpresa } from '@/api/types';
import { StatusEmpresaBadge } from '@/components/ui/Badge';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { fmtDataCurtaInstante } from '@/lib/dates';
import { STATUS_EMPRESA } from '@/lib/labels';
import { brl } from '@/lib/money';

/** Métricas da plataforma: empresas por status, receita contratada e novos cadastros. */
export default function AdminVisaoGeral() {
  const m = useQuery({ queryKey: ['admin', 'metricas'], queryFn: adminApi.metricas });
  const recentes = useQuery({ queryKey: ['admin', 'empresas', 'recentes'], queryFn: () => adminApi.empresas({ perPage: 6 }) });
  const total = Object.values(m.data?.empresasPorStatus ?? {}).reduce((a, b) => a + (b ?? 0), 0);

  if (m.error) return <ErrorState erro={m.error} onTentar={() => m.refetch()} />;
  return (
    <div className="page">
      <PageHeader titulo="Visão geral" descricao="Saúde da base de clientes da plataforma." />
      <section className="kpis kpis--4">
        <article className="kpi-hero" data-aos="fade-up">
          <div className="kpi-hero__mesh" aria-hidden="true" />
          <span className="kpi-hero__label">Receita mensal contratada</span>
          <strong className="kpi-hero__valor num">{m.isLoading ? <Skeleton w={160} h={40} style={{ opacity: 0.3 }} /> : brl(m.data?.receitaMensalContratadaCentavos)}</strong>
          <div className="kpi-hero__linha">
            <span>Empresas ativas e em somente leitura</span>
          </div>
        </article>
        <StatCard rotulo="Empresas" icon="bx-buildings" valor={total} carregando={m.isLoading} rodape="no total" delay={60} />
        <StatCard rotulo="Novos cadastros" icon="bx-user-plus" tom="success" valor={m.data?.cadastrosUltimos30Dias ?? 0} rodape="últimos 30 dias" carregando={m.isLoading} delay={120} />
        <StatCard rotulo="Pendentes" icon="bx-time" tom="warning" valor={m.data?.empresasPorStatus.PENDENTE ?? 0} rodape="aguardando pagamento" carregando={m.isLoading} delay={180} />
      </section>

      <div className="dash-grid dash-grid--admin">
        <section className="card" data-aos="fade-up">
          <div className="card__head">
            <h2 className="card__title">
              <i className="bx bx-pie-chart-alt" aria-hidden="true" /> Por status
            </h2>
          </div>
          <div className="card__body">
            <ul className="status-barras">
              {(Object.keys(STATUS_EMPRESA) as StatusEmpresa[]).map((s) => {
                const n = m.data?.empresasPorStatus[s] ?? 0;
                return (
                  <li key={s}>
                    <Link to={`/admin/empresas?status=${s}`} className="status-barras__linha">
                      <StatusEmpresaBadge status={s} />
                      <span className="status-barras__barra" style={{ ['--w' as string]: `${total ? (n / total) * 100 : 0}%` }} data-tom={STATUS_EMPRESA[s].tom} />
                      <strong className="num">{n}</strong>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
        <section className="card" data-aos="fade-up" data-aos-delay="60">
          <div className="card__head">
            <h2 className="card__title">
              <i className="bx bx-time-five" aria-hidden="true" /> Cadastros recentes
            </h2>
            <Link to="/admin/empresas" className="btn btn--link btn--sm">
              Ver todas
            </Link>
          </div>
          <div className="card__body">
            <ul className="pessoas">
              {(recentes.data?.items ?? []).map((e) => (
                <li key={e.id}>
                  <Link to={`/admin/empresas/${e.id}`} className="grow pessoas__nome">
                    {e.nomeFantasia ?? e.nome}
                    <small>
                      {fmtDataCurtaInstante(e.criadoEm)} · {brl(e.valorMensalCentavos)}/mês
                    </small>
                  </Link>
                  <StatusEmpresaBadge status={e.status} />
                </li>
              ))}
              {recentes.isLoading && <Skeleton h={120} />}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
