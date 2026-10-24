import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { clientesApi } from '@/api/endpoints/clientes';
import type { StatusAtivo } from '@/api/types';
import { usePermissao } from '@/auth/usePermissao';
import { Avatar } from '@/components/ui/Avatar';
import { AtivoBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Segmented } from '@/components/ui/Tabs';
import { fmtData } from '@/lib/dates';
import { useDebounce } from '@/lib/hooks';
import { linkWhatsapp, maskTelefone } from '@/lib/masks';
import { useRotulos } from '@/lib/rotulos';
import { ClienteFormModal } from './parts/ClienteFormModal';

/** Lista de clientes com busca, filtro de situação e ordenação. */
export default function Clientes() {
  const r = useRotulos();
  const navigate = useNavigate();
  const { podeEscrever } = usePermissao();
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusAtivo | 'TODOS'>('ATIVO');
  const [ordenar, setOrdenar] = useState<'nome' | 'recentes'>('nome');
  const [page, setPage] = useState(1);
  const [novo, setNovo] = useState(false);
  const termo = useDebounce(busca.trim(), 300);

  const filtros = { busca: termo || undefined, status: status === 'TODOS' ? undefined : status, ordenar, page, perPage: 20 };
  const q = useQuery({ queryKey: ['clientes', 'lista', filtros], queryFn: () => clientesApi.listar(filtros), placeholderData: keepPreviousData });

  return (
    <div className="page">
      <PageHeader
        titulo={r.clientes}
        descricao={q.data ? `${q.data.meta.total} ${q.data.meta.total === 1 ? r.cliente.toLowerCase() : r.clientes.toLowerCase()} encontrados` : undefined}
        acoes={
          podeEscrever('clientes:escrever') && (
            <Button icon="bx-user-plus" onClick={() => setNovo(true)} data-tour="cliente-novo">
              {r.novo(r.cliente)}
            </Button>
          )
        }
      />

      <div className="toolbar" data-aos="fade-up" data-tour="clientes-busca">
        <Input
          aria-label={`Buscar ${r.clientes.toLowerCase()}`}
          placeholder="Buscar por nome, e-mail, telefone ou documento"
          icon="bx-search"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPage(1);
          }}
          fieldClassName="toolbar__busca"
        />
        <Segmented
          label="Situação"
          valor={status}
          onChange={(v) => (setStatus(v), setPage(1))}
          opcoes={[
            { valor: 'ATIVO', label: 'Ativos' },
            { valor: 'INATIVO', label: 'Inativos' },
            { valor: 'TODOS', label: 'Todos' },
          ]}
        />
        <Segmented
          label="Ordenar"
          valor={ordenar}
          onChange={(v) => (setOrdenar(v), setPage(1))}
          opcoes={[
            { valor: 'nome', label: 'A-Z' },
            { valor: 'recentes', label: 'Recentes' },
          ]}
        />
      </div>

      <section className="card card--pad" data-aos="fade-up" data-aos-delay="60" data-tour="clientes-lista">
        {q.error ? (
          <ErrorState erro={q.error} onTentar={() => q.refetch()} />
        ) : q.isLoading ? (
          <SkeletonRows />
        ) : !q.data?.items.length ? (
          <EmptyState
            icon="bx-user-plus"
            titulo={termo ? 'Nenhum resultado' : `Nenhum ${r.cliente.toLowerCase()} ainda`}
            texto={termo ? `Nada encontrado para "${termo}".` : `Cadastre ${r.artigo(r.cliente) === 'a' ? 'a primeira' : 'o primeiro'} para começar a montar o histórico.`}
            acao={
              !termo &&
              podeEscrever('clientes:escrever') && (
                <Button icon="bx-user-plus" onClick={() => setNovo(true)}>
                  {r.novo(r.cliente)}
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
                    <th>Nome</th>
                    <th>Contato</th>
                    <th>Nascimento</th>
                    <th>Situação</th>
                    <th className="t-actions">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((c) => {
                    const wa = linkWhatsapp(c.whatsapp ?? c.telefone);
                    return (
                      <tr key={c.id} className="is-clickable" onClick={() => navigate(`/app/clientes/${c.id}`)}>
                        <td className="t-primary">
                          <button type="button" className="cell-pessoa" onClick={(e) => (e.stopPropagation(), navigate(`/app/clientes/${c.id}`))}>
                            <Avatar nome={c.nome} size={32} />
                            <span>
                              {c.nome}
                              {c.email && <small>{c.email}</small>}
                            </span>
                          </button>
                        </td>
                        <td data-label="Contato" className="num">
                          {maskTelefone(c.whatsapp ?? c.telefone) || '-'}
                        </td>
                        <td data-label="Nascimento" className="num">
                          {c.dataNascimento ? fmtData(c.dataNascimento) : '-'}
                        </td>
                        <td data-label="Situação">
                          <AtivoBadge status={c.status} />
                        </td>
                        <td className="t-actions">
                          {wa && (
                            <a className="btn btn--ghost btn--sm btn--icon" href={wa} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} aria-label={`WhatsApp de ${c.nome}`}>
                              <i className="bx bxl-whatsapp" aria-hidden="true" />
                            </a>
                          )}
                          <i className="bx bx-chevron-right muted" aria-hidden="true" style={{ fontSize: '1.3rem', marginLeft: 6 }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination meta={q.data.meta} onPage={setPage} />
          </>
        )}
      </section>

      <ClienteFormModal aberto={novo} onFechar={() => setNovo(false)} onSalvo={(c) => navigate(`/app/clientes/${c.id}`)} />
    </div>
  );
}
