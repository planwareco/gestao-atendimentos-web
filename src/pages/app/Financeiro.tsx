import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { financeiroApi } from '@/api/endpoints/dashboard';
import { useSession } from '@/auth/SessionProvider';
import { usePermissao } from '@/auth/usePermissao';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented, Tabs } from '@/components/ui/Tabs';
import { PALETA_CATEGORIAS, useCoresGrafico } from '@/lib/chartTheme';
import { cn } from '@/lib/cn';
import { fmtData, limitesMes, partesNoFuso, somarDias } from '@/lib/dates';
import { labelForma } from '@/lib/labels';
import { brl, brlCompacto } from '@/lib/money';
import { useRotulos } from '@/lib/rotulos';

type Atalho = 'mes' | 'anterior' | 'trimestre' | 'ano' | 'livre';
type Aba = 'resultado' | 'comissoes';

/** Resultado do período (DRE simples) e comissões por profissional. */
export default function Financeiro() {
  const { sessao } = useSession();
  const { pode } = usePermissao();
  const tz = sessao?.empresa.fusoHorario ?? 'America/Sao_Paulo';
  const agora = partesNoFuso(new Date(), tz);
  const [atalho, setAtalho] = useState<Atalho>('mes');
  const [livre, setLivre] = useState(limitesMes(agora.ano, agora.mes));
  const [aba, setAba] = useState<Aba>('resultado');

  const periodo = useMemo(() => {
    switch (atalho) {
      case 'anterior': {
        const m = agora.mes === 1 ? 12 : agora.mes - 1;
        return limitesMes(agora.mes === 1 ? agora.ano - 1 : agora.ano, m);
      }
      case 'trimestre': {
        const fim = limitesMes(agora.ano, agora.mes).fim;
        const ini = limitesMes(agora.mes <= 2 ? agora.ano - 1 : agora.ano, ((agora.mes - 3 + 12) % 12) + 1).inicio;
        return { inicio: ini, fim };
      }
      case 'ano':
        return { inicio: `${agora.ano}-01-01`, fim: `${agora.ano}-12-31` };
      case 'livre':
        return livre;
      default:
        return limitesMes(agora.ano, agora.mes);
    }
  }, [atalho, livre, agora.ano, agora.mes]);

  return (
    <div className="page">
      <PageHeader titulo="Financeiro" descricao={`De ${fmtData(periodo.inicio)} a ${fmtData(periodo.fim)}. Só entram atendimentos realizados e despesas pagas.`} />
      <div className="toolbar" data-aos="fade-up">
        <Segmented<Atalho>
          tour="financeiro-periodo"
          label="Período"
          valor={atalho}
          onChange={setAtalho}
          opcoes={[
            { valor: 'mes', label: 'Este mês' },
            { valor: 'anterior', label: 'Mês passado' },
            { valor: 'trimestre', label: 'Trimestre' },
            { valor: 'ano', label: 'Ano' },
            { valor: 'livre', label: 'Personalizado' },
          ]}
        />
        {atalho === 'livre' && (
          <div className="row">
            <Input aria-label="Início" type="date" value={livre.inicio} onChange={(e) => setLivre({ ...livre, inicio: e.target.value })} fieldClassName="field--inline" />
            <Input aria-label="Fim" type="date" value={livre.fim} min={livre.inicio} max={somarDias(livre.inicio, 366)} onChange={(e) => setLivre({ ...livre, fim: e.target.value })} fieldClassName="field--inline" />
          </div>
        )}
      </div>
      {pode('comissoes:ver') && (
        <Tabs<Aba>
          tour="financeiro-abas"
          label="Seções do financeiro"
          valor={aba}
          onChange={setAba}
          abas={[
            { valor: 'resultado', label: 'Resultado', icon: 'bx-line-chart' },
            { valor: 'comissoes', label: 'Comissões', icon: 'bx-coin-stack' },
          ]}
        />
      )}
      {aba === 'resultado' ? <Resultado inicio={periodo.inicio} fim={periodo.fim} /> : <ComissoesTab inicio={periodo.inicio} fim={periodo.fim} />}
    </div>
  );
}

function Resultado({ inicio, fim }: { inicio: string; fim: string }) {
  const r = useRotulos();
  const cores = useCoresGrafico();
  const q = useQuery({ queryKey: ['financeiro', 'resultado', inicio, fim], queryFn: () => financeiroApi.resultado(inicio, fim), enabled: inicio <= fim });
  const d = q.data;
  if (q.error) return <ErrorState erro={q.error} onTentar={() => q.refetch()} />;

  const linhas = [
    { rotulo: 'Faturamento bruto', valor: d?.faturamentoBrutoCentavos ?? 0, sinal: '', tom: 'pos', icone: 'bx-trending-up' },
    { rotulo: 'Despesas', valor: d?.despesasCentavos ?? 0, sinal: '-', tom: 'neg', icone: 'bx-receipt' },
    { rotulo: 'Comissões', valor: d?.comissoesCentavos ?? 0, sinal: '-', tom: 'neg', icone: 'bx-coin-stack' },
  ];
  const margem = d && d.faturamentoBrutoCentavos ? Math.round((d.resultadoCentavos / d.faturamentoBrutoCentavos) * 1000) / 10 : null;
  const formas = (d?.receitaPorFormaPagamento ?? []).map((f) => ({ nome: labelForma(f.formaPagamento), total: f.totalCentavos, qtd: f.quantidade }));

  return (
    <div className="fin-grid">
      <section className="dre card card--pad" data-aos="fade-up" aria-labelledby="dre-t" data-tour="financeiro-resultado">
        <h2 className="card__title" id="dre-t">
          <i className="bx bx-spreadsheet" aria-hidden="true" /> Demonstrativo
        </h2>
        <ul className="dre__linhas">
          {linhas.map((l) => (
            <li key={l.rotulo} className={`dre__linha dre__linha--${l.tom}`}>
              <i className={`bx ${l.icone}`} aria-hidden="true" />
              <span className="grow">{l.rotulo}</span>
              <span className="num">{q.isLoading ? <Skeleton w={90} h={14} /> : `${l.sinal ? '- ' : ''}${brl(l.valor)}`}</span>
            </li>
          ))}
        </ul>
        <div className={cn('dre__resultado', (d?.resultadoCentavos ?? 0) < 0 && 'is-neg')}>
          <span>Resultado</span>
          <strong className="num">{q.isLoading ? <Skeleton w={140} h={30} /> : brl(d?.resultadoCentavos)}</strong>
          {margem !== null && <small>margem de {margem.toLocaleString('pt-BR')}%</small>}
        </div>
        <p className="text-xs muted">
          {d?.atendimentosRealizados ?? 0} {r.atendimentos.toLowerCase()} realizados no período.
        </p>
      </section>

      <section className="card" data-aos="fade-up" data-aos-delay="60" aria-labelledby="formas-t">
        <div className="card__head">
          <h2 className="card__title" id="formas-t">
            <i className="bx bx-wallet" aria-hidden="true" /> Receita por forma de pagamento
          </h2>
        </div>
        <div className="card__body">
          {q.isLoading ? (
            <Skeleton h={220} r={14} />
          ) : formas.length ? (
            <ResponsiveContainer width="100%" height={Math.max(160, formas.length * 46)}>
              <BarChart data={formas} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nome" width={120} tickLine={false} axisLine={false} tick={{ fill: cores.texto, fontSize: 12 }} />
                <Tooltip formatter={(v) => brl(Number(v))} cursor={{ fill: 'rgb(47 107 255 / .06)' }} contentStyle={{ borderRadius: 12, border: `1px solid ${cores.linha}`, background: cores.superficie }} />
                <Bar dataKey="total" name="Receita" fill={cores.secundaria} radius={[0, 8, 8, 0]} barSize={20} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="bx-wallet" titulo="Sem receita no período" />
          )}
        </div>
      </section>

      <section className="card" data-aos="fade-up" data-aos-delay="120" aria-labelledby="cat-t">
        <div className="card__head">
          <h2 className="card__title" id="cat-t">
            <i className="bx bx-category" aria-hidden="true" /> Despesas por categoria
          </h2>
        </div>
        <div className="card__body">
          {q.isLoading ? (
            <Skeleton h={220} r={14} />
          ) : d?.despesasPorCategoria.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={d.despesasPorCategoria} margin={{ left: 0, right: 8 }}>
                <XAxis dataKey="nome" tickLine={false} axisLine={false} tick={{ fill: cores.texto, fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={56} />
                <YAxis tickLine={false} axisLine={false} width={72} tick={{ fill: cores.texto, fontSize: 11 }} tickFormatter={(v: number) => brlCompacto(v)} />
                <Tooltip formatter={(v) => brl(Number(v))} cursor={{ fill: 'rgb(47 107 255 / .06)' }} contentStyle={{ borderRadius: 12, border: `1px solid ${cores.linha}`, background: cores.superficie }} />
                <Bar dataKey="totalCentavos" name="Total" radius={[8, 8, 0, 0]} maxBarSize={34} animationDuration={900}>
                  {d.despesasPorCategoria.map((c, i) => (
                    <Cell key={c.categoriaId} fill={c.cor ?? PALETA_CATEGORIAS[i % PALETA_CATEGORIAS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="bx-receipt" titulo="Nenhuma despesa paga no período" />
          )}
        </div>
      </section>
    </div>
  );
}

function ComissoesTab({ inicio, fim }: { inicio: string; fim: string }) {
  const r = useRotulos();
  const q = useQuery({ queryKey: ['financeiro', 'comissoes', inicio, fim], queryFn: () => financeiroApi.comissoes(inicio, fim), enabled: inicio <= fim });
  if (q.error) return <ErrorState erro={q.error} onTentar={() => q.refetch()} />;
  const d = q.data;
  return (
    <section className="card card--pad" data-aos="fade-up">
      <div className="row row--between" style={{ marginBottom: '1rem' }}>
        <p className="muted text-sm">Calculadas e congeladas no momento em que cada {r.atendimento.toLowerCase()} foi marcado como realizado.</p>
        <div className="total-pill">
          <span>A pagar</span>
          <strong className="num">{brl(d?.totalComissoesCentavos)}</strong>
        </div>
      </div>
      {q.isLoading ? (
        <Skeleton h={160} r={14} />
      ) : !d?.profissionais.length ? (
        <EmptyState icon="bx-coin-stack" titulo="Sem comissões no período" texto="Cadastre profissionais com percentual de comissão e marque os atendimentos como realizados." />
      ) : (
        <div className="table-wrap">
          <table className="table table--cards">
            <thead>
              <tr>
                <th>Profissional</th>
                <th className="t-right">{r.atendimentos}</th>
                <th className="t-right">Faturamento</th>
                <th className="t-right">Comissão</th>
                <th className="t-right">A pagar</th>
              </tr>
            </thead>
            <tbody>
              {d.profissionais.map((p) => (
                <tr key={p.profissionalId}>
                  <td className="t-primary">
                    <span className="cell-pessoa">
                      <Avatar nome={p.nome} size={30} />
                      <span>{p.nome}</span>
                    </span>
                  </td>
                  <td data-label={r.atendimentos} className="t-right num">
                    {p.atendimentos}
                  </td>
                  <td data-label="Faturamento" className="t-right num">
                    {brl(p.faturamentoCentavos)}
                  </td>
                  <td data-label="Comissão" className="t-right num">
                    {(p.comissaoBps / 100).toLocaleString('pt-BR')}%
                  </td>
                  <td data-label="A pagar" className="t-right num t-strong">
                    {brl(p.comissaoCentavos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
