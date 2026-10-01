import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints/admin';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { fmtDataHora } from '@/lib/dates';
import { ACOES_AUDITORIA, labelAcao } from '@/lib/labels';

/** Log de auditoria: ações sensíveis de admins e usuários. */
export default function AdminAuditoria() {
  const [acao, setAcao] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [page, setPage] = useState(1);
  const valido = !empresaId || /^[0-9a-f-]{36}$/i.test(empresaId.trim());
  const filtros = { acao: acao || undefined, empresaId: valido && empresaId.trim() ? empresaId.trim() : undefined, page, perPage: 30 };
  const q = useQuery({ queryKey: ['admin', 'auditoria', filtros], queryFn: () => adminApi.auditoria(filtros), placeholderData: keepPreviousData });

  return (
    <div className="page">
      <PageHeader titulo="Auditoria" descricao="Logins de admin, falhas de 2FA, mudanças de status e módulos, ativações e mais." />
      <div className="toolbar" data-aos="fade-up">
        <Select aria-label="Ação" value={acao} onChange={(e) => (setAcao(e.target.value), setPage(1))} fieldClassName="field--inline">
          <option value="">Todas as ações</option>
          {Object.entries(ACOES_AUDITORIA).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Input aria-label="ID da empresa" placeholder="ID da empresa (uuid)" icon="bx-buildings" value={empresaId} onChange={(e) => (setEmpresaId(e.target.value), setPage(1))} error={valido ? undefined : 'UUID inválido'} fieldClassName="toolbar__busca" />
      </div>
      <section className="card card--pad" data-aos="fade-up" data-aos-delay="60">
        {q.error ? (
          <ErrorState erro={q.error} onTentar={() => q.refetch()} />
        ) : q.isLoading ? (
          <SkeletonRows />
        ) : !q.data?.items.length ? (
          <EmptyState icon="bx-shield-quarter" titulo="Nenhum registro" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table table--cards">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Ação</th>
                    <th>Entidade</th>
                    <th>Autor</th>
                    <th>IP</th>
                    <th>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((l) => (
                    <tr key={l.id}>
                      <td className="t-primary num">{fmtDataHora(l.criadoEm)}</td>
                      <td data-label="Ação">
                        <strong>{labelAcao(l.acao)}</strong>
                      </td>
                      <td data-label="Entidade">
                        {l.empresaId ? <Link to={`/admin/empresas/${l.empresaId}`} className="btn btn--link btn--sm">{l.entidade ?? 'Empresa'}</Link> : (l.entidade ?? '-')}
                      </td>
                      <td data-label="Autor">{l.adminId ? 'Admin' : l.usuarioId ? 'Usuário' : 'Sistema'}</td>
                      <td data-label="IP" className="num">
                        {l.ip ?? '-'}
                      </td>
                      <td data-label="Detalhes">
                        {l.dados ? (
                          <details className="audit-dados">
                            <summary>ver</summary>
                            <pre>{JSON.stringify(l.dados, null, 2)}</pre>
                          </details>
                        ) : (
                          '-'
                        )}
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
