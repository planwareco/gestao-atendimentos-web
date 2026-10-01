import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { agendaApi } from '@/api/endpoints/agenda';
import { clientesApi } from '@/api/endpoints/clientes';
import { dashboardApi } from '@/api/endpoints/dashboard';
import { useSession } from '@/auth/SessionProvider';
import { usePermissao } from '@/auth/usePermissao';
import { LockedModule } from '@/components/LockedModule';
import { Avatar } from '@/components/ui/Avatar';
import { StatusAtendimentoBadge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { PALETA_CATEGORIAS, useCoresGrafico } from '@/lib/chartTheme';
import { fmtDiaMes, fmtHora, hojeISO, localParaIso, MESES, MESES_CURTOS, partesNoFuso, somarDias } from '@/lib/dates';
import { linkWhatsapp } from '@/lib/masks';
import { brl, brlCompacto } from '@/lib/money';
import { useRotulos } from '@/lib/rotulos';

/** Tooltip dos gráficos no estilo do produto. */
function Dica({ active, payload, label, formatar }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string | number; formatar?: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      {label !== undefined && <strong>{label}</strong>}
      {payload.map((p) => (
        <span key={p.name}>
          <i style={{ background: p.color }} />
          {p.name}: <b className="num">{formatar ? formatar(p.value ?? 0) : p.value}</b>
        </span>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { sessao } = useSession();
  const { pode, ehProprietario } = usePermissao();
  const r = useRotulos();
  const navigate = useNavigate();
  const cores = useCoresGrafico();
  const tz = sessao?.empresa.fusoHorario ?? 'America/Sao_Paulo';
  const agora = partesNoFuso(new Date(), tz);
  const [ano, setAno] = useState(agora.ano);
  const [mes, setMes] = useState<number | ''>('');

  const dash = useQuery({ queryKey: ['dashboard', ano, mes], queryFn: () => dashboardApi.obter(ano, mes || undefined), placeholderData: (p) => p });
  const hoje = hojeISO(tz);
  const agendaHoje = useQuery({
    queryKey: ['agenda', 'hoje', hoje],
    queryFn: () => agendaApi.listar({ inicio: localParaIso(hoje, '00:00', tz), fim: localParaIso(somarDias(hoje, 1), '00:00', tz) }),
    enabled: pode('agenda:ler'),
  });
  const aniversariantes = useQuery({ queryKey: ['clientes', 'aniversariantes', 7], queryFn: () => clientesApi.aniversariantes(7), enabled: pode('clientes:ler') });
  const inativos = useQuery({ queryKey: ['clientes', 'inativos', 60], queryFn: () => clientesApi.inativos(60), enabled: pode('clientes:ler') });

  const d = dash.data;
  const ind = d?.indicadores;
  const carregando = dash.isLoading;
  const mesRef = d ? `${MESES[(d.periodo.mesIndicadores ?? 1) - 1]} de ${d.periodo.ano}` : '';

  const serieMensal = useMemo(
    () =>
      (d?.graficos.entradasSaidasPorMes ?? []).map((m) => ({
        mes: MESES_CURTOS[m.mes - 1],
        Entradas: m.entradasCentavos,
        Saídas: m.saidasCentavos,
      })),
    [d],
  );
  const serieAcumulada = useMemo(() => (d?.graficos.evolucaoFaturamento ?? []).map((m) => ({ mes: MESES_CURTOS[m.mes - 1], Acumulado: m.acumuladoCentavos })), [d]);
  const porServico = useMemo(() => [...(d?.graficos.receitaPorServico ?? [])].sort((a, b) => b.receitaCentavos - a.receitaCentavos).slice(0, 6), [d]);
  const porCategoria = d?.graficos.despesasPorCategoria ?? [];
  const totalCategorias = porCategoria.reduce((a, c) => a + c.totalCentavos, 0);
  const anos = Array.from({ length: 5 }, (_, i) => agora.ano - i);

  const proximos = (agendaHoje.data ?? []).filter((a) => a.status !== 'CANCELADO').sort((a, b) => a.inicio.localeCompare(b.inicio));

  return (
    <div className="page">
      <PageHeader
        titulo="Visão geral"
        descricao={mesRef ? `Indicadores de ${mesRef}. Receita considera apenas ${r.atendimentos.toLowerCase()} realizados.` : 'Carregando indicadores...'}
        acoes={
          <div className="row filtros-inline">
            <Select label="Ano" value={ano} onChange={(e) => setAno(Number(e.target.value))} fieldClassName="field--inline">
              {anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
            <Select label="Mês" value={mes} onChange={(e) => setMes(e.target.value ? Number(e.target.value) : '')} fieldClassName="field--inline">
              <option value="">Ano inteiro</option>
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      {dash.error ? (
        <ErrorState erro={dash.error} onTentar={() => dash.refetch()} />
      ) : (
        <>
          <section className="kpis" aria-label="Indicadores do mês">
            <article className="kpi-hero" data-aos="fade-up">
              <div className="kpi-hero__mesh" aria-hidden="true" />
              <span className="kpi-hero__label">Entradas no mês</span>
              <strong className="kpi-hero__valor num">{carregando ? <Skeleton w={180} h={40} style={{ opacity: 0.3 }} /> : brl(ind?.entradasCentavos)}</strong>
              <div className="kpi-hero__linha">
                {d?.financeiroDisponivel ? (
                  <>
                    <span>
                      Saldo <b className="num">{brl(ind?.saldoCentavos)}</b>
                    </span>
                    <span>
                      Despesas <b className="num">{brl(ind?.despesasCentavos)}</b>
                    </span>
                  </>
                ) : (
                  <span>
                    Comissões <b className="num">{brl(ind?.comissoesCentavos)}</b>
                  </span>
                )}
              </div>
            </article>
            <StatCard rotulo="Realizados" icon="bx-check-double" tom="success" valor={ind?.atendimentosRealizados ?? 0} rodape={`${ind?.atendimentosCancelados ?? 0} cancelados`} carregando={carregando} delay={60} />
            <StatCard rotulo="Agendados" icon="bx-calendar-event" tom="info" valor={ind?.atendimentosAgendados ?? 0} rodape="ainda por acontecer" carregando={carregando} delay={120} />
            <StatCard rotulo="Ticket médio" icon="bx-receipt" valor={brl(ind?.ticketMedioCentavos)} rodape={`por ${r.atendimento.toLowerCase()}`} carregando={carregando} delay={180} />
            <StatCard rotulo={`${r.clientes} ativos`} icon="bx-group" tom="warning" valor={ind?.totalClientes ?? 0} rodape={<Link to="/app/clientes">ver lista</Link>} carregando={carregando} delay={240} />
          </section>

          <div className="dash-grid">
            <section className="card dash-grid__wide" data-aos="fade-up" aria-labelledby="g-es">
              <div className="card__head">
                <h2 className="card__title" id="g-es">
                  <i className="bx bx-bar-chart-alt-2" aria-hidden="true" /> Entradas × saídas em {ano}
                </h2>
                <div className="legenda">
                  <span>
                    <i style={{ background: cores.secundaria }} /> Entradas
                  </span>
                  {d?.financeiroDisponivel && (
                    <span>
                      <i style={{ background: cores.primaria }} /> Saídas
                    </span>
                  )}
                </div>
              </div>
              <div className="card__body chart-box">
                {carregando ? (
                  <Skeleton h={260} r={14} />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={serieMensal} barGap={4} margin={{ left: 0, right: 8, top: 8 }}>
                      <CartesianGrid vertical={false} stroke={cores.linha} strokeDasharray="4 4" />
                      <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: cores.texto, fontSize: 12 }} />
                      <YAxis tickLine={false} axisLine={false} width={84} tick={{ fill: cores.texto, fontSize: 11 }} tickFormatter={(v: number) => brlCompacto(v)} />
                      <Tooltip cursor={{ fill: 'rgb(47 107 255 / .06)' }} content={<Dica formatar={brl} />} />
                      <Bar dataKey="Entradas" fill={cores.secundaria} radius={[6, 6, 0, 0]} maxBarSize={26} animationDuration={900} />
                      {d?.financeiroDisponivel && <Bar dataKey="Saídas" fill={cores.primaria} radius={[6, 6, 0, 0]} maxBarSize={26} animationDuration={900} />}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="card" data-aos="fade-up" aria-labelledby="g-hoje">
              <div className="card__head">
                <h2 className="card__title" id="g-hoje">
                  <i className="bx bx-time-five" aria-hidden="true" /> Hoje
                </h2>
                <ButtonLink to="/app/agenda" variant="link" size="sm">
                  Abrir agenda
                </ButtonLink>
              </div>
              <div className="card__body">
                {agendaHoje.isLoading ? (
                  <div className="stack">
                    <Skeleton h={44} />
                    <Skeleton h={44} />
                    <Skeleton h={44} />
                  </div>
                ) : proximos.length ? (
                  <ul className="timeline-hoje">
                    {proximos.slice(0, 6).map((a) => (
                      <li key={a.id}>
                        <button type="button" onClick={() => navigate(`/app/agenda?atendimento=${a.id}`)}>
                          <span className="num timeline-hoje__hora">{fmtHora(a.inicio, tz)}</span>
                          <span className="timeline-hoje__barra" style={{ background: a.profissional?.cor ?? 'var(--secondary)' }} />
                          <span className="grow">
                            <strong>{a.cliente.nome}</strong>
                            <small>{a.itens.map((i) => i.descricao).join(', ')}</small>
                          </span>
                          <StatusAtendimentoBadge status={a.status} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState icon="bx-coffee" titulo="Agenda livre hoje" texto="Nenhum horário marcado para hoje." />
                )}
              </div>
            </section>

            <section className="card" data-aos="fade-up" aria-labelledby="g-acum">
              <div className="card__head">
                <h2 className="card__title" id="g-acum">
                  <i className="bx bx-trending-up" aria-hidden="true" /> Faturamento acumulado
                </h2>
              </div>
              <div className="card__body chart-box">
                {carregando ? (
                  <Skeleton h={220} r={14} />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={serieAcumulada} margin={{ left: 0, right: 8, top: 8 }}>
                      <defs>
                        <linearGradient id="gAcum" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={cores.secundaria} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={cores.secundaria} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke={cores.linha} strokeDasharray="4 4" />
                      <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: cores.texto, fontSize: 12 }} />
                      <YAxis tickLine={false} axisLine={false} width={84} tick={{ fill: cores.texto, fontSize: 11 }} tickFormatter={(v: number) => brlCompacto(v)} />
                      <Tooltip content={<Dica formatar={brl} />} />
                      <Area type="monotone" dataKey="Acumulado" stroke={cores.secundaria} strokeWidth={2.5} fill="url(#gAcum)" animationDuration={1100} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="card" data-aos="fade-up" aria-labelledby="g-serv">
              <div className="card__head">
                <h2 className="card__title" id="g-serv">
                  <i className="bx bx-purchase-tag-alt" aria-hidden="true" /> Receita por {r.servico.toLowerCase()}
                </h2>
              </div>
              <div className="card__body">
                {carregando ? (
                  <Skeleton h={220} r={14} />
                ) : porServico.length ? (
                  <ul className="ranking">
                    {porServico.map((s, i) => {
                      const max = porServico[0]?.receitaCentavos || 1;
                      return (
                        <li key={s.servicoId ?? s.nome}>
                          <div className="ranking__topo">
                            <span className="ranking__nome">{s.nome}</span>
                            <span className="num ranking__valor">{brl(s.receitaCentavos)}</span>
                          </div>
                          <div className="ranking__barra" style={{ ['--w' as string]: `${(s.receitaCentavos / max) * 100}%`, ['--d' as string]: `${i * 80}ms` }} />
                          <span className="ranking__qtd">{s.quantidade}x realizado</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState icon="bx-bar-chart" titulo="Sem receita no período" texto={`Marque ${r.atendimentos.toLowerCase()} como realizados para ver o ranking.`} />
                )}
              </div>
            </section>

            <section className="card" data-aos="fade-up" aria-labelledby="g-desp">
              <div className="card__head">
                <h2 className="card__title" id="g-desp">
                  <i className="bx bx-pie-chart-alt-2" aria-hidden="true" /> Despesas por categoria
                </h2>
              </div>
              <div className="card__body">
                {!d?.financeiroDisponivel && !carregando ? (
                  ehProprietario ? <LockedModule modulo="FINANCEIRO" compacto /> : <EmptyState icon="bx-lock-alt" titulo="Indisponível" />
                ) : carregando ? (
                  <Skeleton h={220} r={14} />
                ) : porCategoria.length ? (
                  <div className="donut">
                    <div className="donut__chart">
                      <ResponsiveContainer width="100%" height={190}>
                        <PieChart>
                          <Pie data={porCategoria} dataKey="totalCentavos" nameKey="nome" innerRadius={58} outerRadius={86} paddingAngle={2} stroke="none" animationDuration={900}>
                            {porCategoria.map((c, i) => (
                              <Cell key={c.categoriaId} fill={c.cor ?? PALETA_CATEGORIAS[i % PALETA_CATEGORIAS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<Dica formatar={brl} />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="donut__centro">
                        <small>Total</small>
                        <strong className="num">{brlCompacto(totalCategorias)}</strong>
                      </div>
                    </div>
                    <ul className="donut__legenda">
                      {porCategoria.slice(0, 6).map((c, i) => (
                        <li key={c.categoriaId}>
                          <i style={{ background: c.cor ?? PALETA_CATEGORIAS[i % PALETA_CATEGORIAS.length] }} />
                          <span className="grow">{c.nome}</span>
                          <span className="num">{Math.round((c.totalCentavos / (totalCategorias || 1)) * 100)}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <EmptyState icon="bx-receipt" titulo="Nenhuma despesa paga" texto="Lance despesas para acompanhar para onde o dinheiro vai." acao={<ButtonLink to="/app/despesas" size="sm" variant="soft">Lançar despesa</ButtonLink>} />
                )}
              </div>
            </section>

            <section className="card" data-aos="fade-up" aria-labelledby="g-aniv">
              <div className="card__head">
                <h2 className="card__title" id="g-aniv">
                  <i className="bx bx-cake" aria-hidden="true" /> Aniversariantes da semana
                </h2>
              </div>
              <div className="card__body">
                {aniversariantes.isLoading ? (
                  <Skeleton h={120} r={14} />
                ) : aniversariantes.data?.length ? (
                  <ul className="pessoas">
                    {aniversariantes.data.slice(0, 6).map((c) => {
                      const wa = linkWhatsapp(c.whatsapp ?? c.telefone, `Olá, ${c.nome.split(' ')[0]}! Feliz aniversário! Que tal comemorar com um horário especial?`);
                      return (
                        <li key={c.id}>
                          <Avatar nome={c.nome} size={34} />
                          <Link to={`/app/clientes/${c.id}`} className="grow pessoas__nome">
                            {c.nome}
                            <small>{fmtDiaMes(c.dataNascimento)}</small>
                          </Link>
                          {wa && (
                            <a className="btn btn--soft btn--sm btn--icon" href={wa} target="_blank" rel="noopener noreferrer" aria-label={`Parabenizar ${c.nome} no WhatsApp`}>
                              <i className="bx bxl-whatsapp" aria-hidden="true" />
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState icon="bx-cake" titulo="Ninguém nesta semana" />
                )}
              </div>
            </section>

            <section className="card" data-aos="fade-up" aria-labelledby="g-reat">
              <div className="card__head">
                <h2 className="card__title" id="g-reat">
                  <i className="bx bx-user-voice" aria-hidden="true" /> Para reativar
                </h2>
                <span className="text-xs muted">sem visita há 60+ dias</span>
              </div>
              <div className="card__body">
                {inativos.isLoading ? (
                  <Skeleton h={120} r={14} />
                ) : inativos.data?.length ? (
                  <ul className="pessoas">
                    {inativos.data.slice(0, 6).map((c) => {
                      const wa = linkWhatsapp(c.whatsapp ?? c.telefone, `Olá, ${c.nome.split(' ')[0]}! Sentimos sua falta. Vamos marcar um horário?`);
                      const dias = Math.round((Date.now() - new Date(c.ultimoAtendimento).getTime()) / 86_400_000);
                      return (
                        <li key={c.id}>
                          <Avatar nome={c.nome} size={34} />
                          <Link to={`/app/clientes/${c.id}`} className="grow pessoas__nome">
                            {c.nome}
                            <small>há {dias} dias</small>
                          </Link>
                          {wa && (
                            <a className="btn btn--soft btn--sm btn--icon" href={wa} target="_blank" rel="noopener noreferrer" aria-label={`Chamar ${c.nome} no WhatsApp`}>
                              <i className="bx bxl-whatsapp" aria-hidden="true" />
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState icon="bx-happy-heart-eyes" titulo="Todos voltando" texto="Nenhum cliente sumido há mais de 60 dias." />
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
