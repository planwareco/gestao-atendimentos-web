import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { atendimentosApi } from '@/api/endpoints/atendimentos';
import { profissionaisApi } from '@/api/endpoints/profissionais';
import type { Atendimento, StatusAtendimento } from '@/api/types';
import { useSession } from '@/auth/SessionProvider';
import { usePermissao } from '@/auth/usePermissao';
import { resumoCamposExtras } from '@/components/CamposExtras';
import { ClientePicker, type ClienteEscolhido } from '@/components/ClientePicker';
import { Avatar } from '@/components/ui/Avatar';
import { StatusAtendimentoBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { fmtDataHora, hojeISO, localParaIso, somarDias } from '@/lib/dates';
import { STATUS_ATENDIMENTO } from '@/lib/labels';
import { brl } from '@/lib/money';
import { useRotulos } from '@/lib/rotulos';
import { AtendimentoDetalheModal } from './parts/AtendimentoDetalheModal';
import { AtendimentoFormModal } from './parts/AtendimentoFormModal';

const TODOS: StatusAtendimento[] = ['AGENDADO', 'CONFIRMADO', 'REALIZADO', 'CANCELADO'];

/** Lista filtrável de atendimentos (período, status, cliente, profissional). */
export default function Atendimentos() {
  const r = useRotulos();
  const { sessao } = useSession();
  const { pode, podeEscrever, temModulo } = usePermissao();
  const tz = sessao?.empresa.fusoHorario ?? 'America/Sao_Paulo';
  const defs = sessao?.empresa.camposPersonalizados?.atendimento;
  const hoje = hojeISO(tz);
  const [de, setDe] = useState(somarDias(hoje, -30));
  const [ate, setAte] = useState(somarDias(hoje, 30));
  const [status, setStatus] = useState<StatusAtendimento[]>(['AGENDADO', 'CONFIRMADO', 'REALIZADO']);
  const [cliente, setCliente] = useState<ClienteEscolhido | null>(null);
  const [profissionalId, setProfissionalId] = useState('');
  const [page, setPage] = useState(1);
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [form, setForm] = useState<{ aberto: boolean; atendimento?: Atendimento | null }>({ aberto: false });
  const filtraProf = temModulo('MULTI_PROFISSIONAL') && pode('atendimentos:todos');

  const profs = useQuery({ queryKey: ['profissionais', 'ativos'], queryFn: () => profissionaisApi.listar({ status: 'ATIVO', perPage: 100 }), enabled: filtraProf });
  const filtros = {
    inicio: de ? localParaIso(de, '00:00', tz) : undefined,
    fim: ate ? localParaIso(somarDias(ate, 1), '00:00', tz) : undefined,
    status: status.length && status.length < 4 ? status : undefined,
    clienteId: cliente?.id,
    profissionalId: profissionalId || undefined,
    page,
    perPage: 20,
  };
  const q = useQuery({ queryKey: ['atendimentos', 'lista', filtros], queryFn: () => atendimentosApi.listar(filtros), placeholderData: keepPreviousData });

  const alternar = (s: StatusAtendimento) => {
    setPage(1);
    setStatus((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]));
  };

  return (
    <div className="page">
      <PageHeader
        titulo={r.atendimentos}
        descricao="Todos os horários do período, com filtros por situação, cliente e profissional."
        acoes={
          podeEscrever('atendimentos:escrever') && (
            <Button icon="bx-plus" onClick={() => setForm({ aberto: true })}>
              {r.novo(r.atendimento)}
            </Button>
          )
        }
      />

      <div className="filtros card card--pad" data-aos="fade-up">
        <div className="filtros__grid">
          <Input label="De" type="date" value={de} onChange={(e) => (setDe(e.target.value), setPage(1))} />
          <Input label="Até" type="date" value={ate} onChange={(e) => (setAte(e.target.value), setPage(1))} />
          <ClientePicker valor={cliente} onChange={(c) => (setCliente(c), setPage(1))} label={`Filtrar ${r.cliente.toLowerCase()}`} />
          {filtraProf && (
            <Select label="Profissional" value={profissionalId} onChange={(e) => (setProfissionalId(e.target.value), setPage(1))}>
              <option value="">Todos</option>
              {(profs.data?.items ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          )}
        </div>
        <div className="row" role="group" aria-label="Situação">
          {TODOS.map((s) => (
            <button key={s} type="button" className="chip" aria-pressed={status.includes(s)} onClick={() => alternar(s)}>
              <i className={`bx ${STATUS_ATENDIMENTO[s].icone}`} aria-hidden="true" />
              {STATUS_ATENDIMENTO[s].label}
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
          <EmptyState icon="bx-calendar-x" titulo={`Nenhum ${r.atendimento.toLowerCase()} encontrado`} texto="Ajuste o período ou os filtros acima." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table table--cards">
                <thead>
                  <tr>
                    <th>{r.cliente}</th>
                    <th>Quando</th>
                    <th>{r.servicos}</th>
                    {filtraProf && <th>Profissional</th>}
                    <th>Situação</th>
                    <th className="t-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((a) => {
                    const extra = resumoCamposExtras(defs, a.camposExtras, 1);
                    return (
                      <tr key={a.id} className="is-clickable" onClick={() => setDetalhe(a.id)}>
                        <td className="t-primary">
                          <button type="button" className="cell-pessoa" onClick={(e) => (e.stopPropagation(), setDetalhe(a.id))}>
                            <Avatar nome={a.cliente.nome} size={30} />
                            <span>
                              {a.cliente.nome}
                              {extra && <small>{extra}</small>}
                            </span>
                          </button>
                        </td>
                        <td data-label="Quando" className="num">
                          {fmtDataHora(a.inicio, tz)}
                        </td>
                        <td data-label={r.servicos}>{a.itens.map((i) => i.descricao).join(', ')}</td>
                        {filtraProf && <td data-label="Profissional">{a.profissional?.nome ?? '-'}</td>}
                        <td data-label="Situação">
                          <StatusAtendimentoBadge status={a.status} />
                        </td>
                        <td data-label="Total" className="t-right num t-strong">
                          {brl(a.totalCentavos)}
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

      <AtendimentoDetalheModal
        id={detalhe}
        onFechar={() => setDetalhe(null)}
        onEditar={(a) => {
          setDetalhe(null);
          setForm({ aberto: true, atendimento: a });
        }}
      />
      <AtendimentoFormModal aberto={form.aberto} atendimento={form.atendimento} inicial={cliente ? { cliente } : undefined} onFechar={() => setForm({ aberto: false })} />
    </div>
  );
}
