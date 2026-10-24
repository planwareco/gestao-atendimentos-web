import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicoApi } from '@/api/endpoints/publico';
import type { ModuloCatalogo, Segmento, SegmentoPublico } from '@/api/types';
import { Badge, StatusAtendimentoBadge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { SEGMENTOS_DEMO } from '@/demo/modo';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { cn } from '@/lib/cn';
import { useDebounce, useTitulo } from '@/lib/hooks';
import { iconeModulo, SEGMENTOS_ICONE } from '@/lib/labels';
import { brl } from '@/lib/money';
import { plural } from '@/lib/rotulos';

/* ────────────────────────────────────────────────────────────
   Landing page: hero com agenda viva, faixa de segmentos, bento de
   recursos, demonstração por segmento, configurador de preço e FAQ.
   ──────────────────────────────────────────────────────────── */

export default function Landing() {
  useTitulo('Sistema de agendamento para serviços');
  return (
    <div className="landing">
      <Hero />
      <FaixaSegmentos />
      <Recursos />
      <DemoSegmento />
      <ComoFunciona />
      <Precos />
      <Confianca />
      <Duvidas />
      <ChamadaFinal />
    </div>
  );
}

/* ── Hero: mensagem à esquerda, agenda viva à direita (momento assinatura) ── */
function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-titulo">
      <div className="hero__mesh" aria-hidden="true" />
      <div className="hero__grid container">
        <div className="hero__copy">
          <h1 id="hero-titulo" className="h-display" data-aos="fade-up">
            O sistema de agendamento que coloca o seu <em>negócio</em> em ordem.
          </h1>
          <p className="hero__sub" data-aos="fade-up" data-aos-delay="80">
            Horários sem conflito, histórico de cada cliente, orçamentos com a sua marca e o resultado do mês em um só lugar.
          </p>
          <div className="hero__ctas" data-aos="fade-up" data-aos-delay="160">
            <ButtonLink to="/cadastro" size="lg" iconRight="bx-right-arrow-alt">
              Começar agora
            </ButtonLink>
            <ButtonLink to="/demo" size="lg" variant="ghost" icon="bx-play-circle">
              Testar grátis
            </ButtonLink>
          </div>
          <p className="hero__nota" data-aos="fade-up" data-aos-delay="200">
            <i className="bx bx-check-shield" aria-hidden="true" /> Teste com uma empresa de exemplo, sem cadastro e sem cartão.
          </p>
        </div>
        <AgendaViva />
      </div>
    </section>
  );
}

/** Prévia real de componentes do produto: agenda do dia com detecção de conflito animada. */
function AgendaViva() {
  const slots = [
    { hora: '09:00', cliente: 'Marina Albuquerque', servico: 'Corte e escova', prof: 'Lívia', cor: '#2F6BFF', status: 'CONFIRMADO' as const },
    { hora: '10:30', cliente: 'Rafael Tenório', servico: 'Barba completa', prof: 'Caio', cor: '#0F2557', status: 'AGENDADO' as const },
    { hora: '13:00', cliente: 'Dona Celina Farias', servico: 'Coloração', prof: 'Lívia', cor: '#2F6BFF', status: 'REALIZADO' as const },
  ];
  return (
    <div className="viva" data-aos="fade-left" data-aos-delay="120" aria-label="Exemplo da agenda do dia" role="img">
      <div className="viva__card">
        <div className="viva__head">
          <div>
            <span className="viva__dia">Quinta, 8 de outubro</span>
            <strong className="viva__titulo">Agenda de hoje</strong>
          </div>
          <span className="viva__total num">R$ 386,00</span>
        </div>
        <ul className="viva__lista">
          {slots.map((s, i) => (
            <li key={s.hora} className="viva__item" style={{ '--d': `${i * 120}ms`, '--c': s.cor } as CSSProperties}>
              <span className="viva__hora num">{s.hora}</span>
              <span className="viva__bar" />
              <span className="viva__info">
                <strong>{s.cliente}</strong>
                <small>
                  {s.servico} com {s.prof}
                </small>
              </span>
              <StatusAtendimentoBadge status={s.status} />
            </li>
          ))}
        </ul>
        <div className="viva__conflito">
          <div className="viva__tentativa">
            <i className="bx bx-error-circle" aria-hidden="true" />
            <span>
              <strong>10:30 já está ocupado</strong>
              <small>com Caio</small>
            </span>
          </div>
          <div className="viva__sugestoes">
            <span className="viva__sug-titulo">Horários livres</span>
            <span className="chip">11:15</span>
            <span className="chip chip--hot">14:30</span>
            <span className="chip">16:00</span>
          </div>
        </div>
      </div>
      <div className="viva__float viva__float--a">
        <i className="bx bxs-cake" aria-hidden="true" />
        <span>
          <strong>3 aniversariantes</strong>
          <small>nesta semana</small>
        </span>
      </div>
      <div className="viva__float viva__float--b">
        <span className="viva__ring" aria-hidden="true" />
        <span>
          <strong className="num">+18%</strong>
          <small>de faturamento no mês</small>
        </span>
      </div>
    </div>
  );
}

/* ── Faixa contínua de segmentos (único marquee da página) ── */
const SEGMENTOS_FAIXA: { nome: string; icone: string }[] = [
  { nome: 'Salões de beleza', icone: 'bx-spa' },
  { nome: 'Barbearias', icone: 'bx-cut' },
  { nome: 'Pet shops', icone: 'bxs-dog' },
  { nome: 'Clínicas de estética', icone: 'bx-face' },
  { nome: 'Fisioterapia', icone: 'bx-body' },
  { nome: 'Consultorias', icone: 'bx-briefcase-alt-2' },
  { nome: 'Studios de unha', icone: 'bx-palette' },
  { nome: 'Personal trainers', icone: 'bx-dumbbell' },
];
function FaixaSegmentos() {
  const itens = [...SEGMENTOS_FAIXA, ...SEGMENTOS_FAIXA];
  return (
    <div className="faixa" aria-label="Segmentos atendidos">
      <div className="faixa__trilho">
        {itens.map((s, i) => (
          <span key={i} className="faixa__item" aria-hidden={i >= SEGMENTOS_FAIXA.length || undefined}>
            <i className={cn('bx', s.icone)} aria-hidden="true" />
            {s.nome}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Recursos em bento assimétrico (5 itens, 5 células) ── */
function Recursos() {
  return (
    <section id="recursos" className="secao container" aria-labelledby="recursos-titulo">
      <div className="secao__head" data-aos="fade-up">
        <span className="eyebrow">Recursos</span>
        <h2 id="recursos-titulo" className="secao__titulo">
          Tudo que acontece entre o agendamento e o caixa.
        </h2>
      </div>

      <div className="bento">
        <article className="bento__cell bento__cell--agenda" data-aos="fade-up">
          <div className="bento__text">
            <i className="bx bx-calendar-check bento__icon" aria-hidden="true" />
            <h3>Agenda que não deixa marcar em cima</h3>
            <p>Dia, semana ou mês. Se o horário está ocupado, o sistema avisa e sugere os livres do profissional.</p>
          </div>
          <div className="mini-grade" aria-hidden="true">
            {['08', '09', '10', '11', '12', '13'].map((h, i) => (
              <div key={h} className="mini-grade__linha">
                <span className="num">{h}h</span>
                <div className="mini-grade__faixa">
                  {i === 1 && <span className="mini-ev" style={{ left: '4%', width: '46%' }} />}
                  {i === 2 && <span className="mini-ev mini-ev--b" style={{ left: '30%', width: '60%' }} />}
                  {i === 4 && <span className="mini-ev mini-ev--free" style={{ left: '10%', width: '40%' }}>livre</span>}
                  {i === 5 && <span className="mini-ev" style={{ left: '50%', width: '45%' }} />}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="bento__cell bento__cell--navy" data-aos="fade-up" data-aos-delay="60">
          <i className="bx bx-user-voice bento__icon" aria-hidden="true" />
          <h3>Cada cliente com histórico e alerta de retorno</h3>
          <p>Total gasto, ticket médio, frequência e quem está sumido há mais tempo que o normal.</p>
          <div className="retornos" aria-hidden="true">
            <span className="badge badge--success">Em dia</span>
            <span className="badge badge--warning">Provável retorno</span>
            <span className="badge badge--danger">Retorno atrasado</span>
          </div>
        </article>

        <article className="bento__cell bento__cell--doc" data-aos="fade-up" data-aos-delay="120">
          <div className="mini-doc" aria-hidden="true">
            <span className="mini-doc__num">Orçamento 0042</span>
            <span className="mini-doc__linha" />
            <span className="mini-doc__linha mini-doc__linha--curta" />
            <span className="mini-doc__total num">R$ 1.240,00</span>
            <span className="mini-doc__selo">
              <i className="bx bx-like" /> Aprovado
            </span>
          </div>
          <div>
            <i className="bx bx-file bento__icon" aria-hidden="true" />
            <h3>Orçamento em PDF com a sua marca</h3>
            <p>Aprovou? Vira agendamento com um clique.</p>
          </div>
        </article>

        <article className="bento__cell bento__cell--fin" data-aos="fade-up" data-aos-delay="60">
          <i className="bx bx-line-chart bento__icon" aria-hidden="true" />
          <h3>Resultado real do mês</h3>
          <p>Faturamento menos despesas e comissões. Só entra o que foi realizado.</p>
          <div className="mini-barras" aria-hidden="true">
            {[38, 52, 44, 66, 58, 81, 74].map((v, i) => (
              <span key={i} style={{ '--h': `${v}%`, '--d': `${i * 70}ms` } as CSSProperties} />
            ))}
          </div>
        </article>

        <article className="bento__cell bento__cell--pattern" data-aos="fade-up" data-aos-delay="120">
          <i className="bx bx-customize bento__icon" aria-hidden="true" />
          <h3>Fala a língua do seu segmento</h3>
          <p>Tutor e nome do pet, paciente e evolução da sessão, reunião e pauta. Os campos se ajustam ao seu negócio.</p>
          <div className="row" style={{ ['--gap' as string]: '0.4rem' }} aria-hidden="true">
            <span className="chip">Tutor</span>
            <span className="chip">Paciente</span>
            <span className="chip">Convênio</span>
            <span className="chip">Nome do pet</span>
          </div>
        </article>
      </div>
    </section>
  );
}

/* ── Demonstração: os rótulos e campos mudam conforme o segmento ── */
const CAMPOS_DEMO: Partial<Record<Segmento, string[]>> = {
  PETSHOP: ['Nome do pet', 'Espécie', 'Raça', 'Porte'],
  FISIOTERAPIA: ['Convênio', 'Queixa principal', 'Evolução da sessão'],
  ESTETICA: ['Tipo de pele', 'Alergias e contraindicações'],
  CONSULTORIA: ['Pessoa de contato', 'Pauta'],
};
const SEGMENTOS_FALLBACK: SegmentoPublico[] = [
  { codigo: 'SALAO_BELEZA', nome: 'Salão de beleza', rotulos: { cliente: 'Cliente', servico: 'Serviço', atendimento: 'Atendimento' } },
  { codigo: 'BARBEARIA', nome: 'Barbearia', rotulos: { cliente: 'Cliente', servico: 'Serviço', atendimento: 'Atendimento' } },
  { codigo: 'PETSHOP', nome: 'Pet shop', rotulos: { cliente: 'Tutor', servico: 'Serviço', atendimento: 'Atendimento' } },
  { codigo: 'ESTETICA', nome: 'Estética', rotulos: { cliente: 'Cliente', servico: 'Procedimento', atendimento: 'Sessão' } },
  { codigo: 'FISIOTERAPIA', nome: 'Fisioterapia', rotulos: { cliente: 'Paciente', servico: 'Procedimento', atendimento: 'Sessão' } },
  { codigo: 'CONSULTORIA', nome: 'Consultoria', rotulos: { cliente: 'Cliente', servico: 'Serviço', atendimento: 'Reunião' } },
];

function DemoSegmento() {
  const { data } = useQuery({ queryKey: ['public', 'segmentos'], queryFn: publicoApi.segmentos, staleTime: 3_600_000 });
  const lista = (data ?? SEGMENTOS_FALLBACK).filter((s) => s.codigo !== 'OUTRO');
  const [atual, setAtual] = useState<Segmento>('PETSHOP');
  const seg = lista.find((s) => s.codigo === atual) ?? lista[0];
  const campos = CAMPOS_DEMO[atual] ?? [];

  return (
    <section id="segmentos" className="secao secao--tint" aria-labelledby="seg-titulo">
      <div className="container demo">
        <div className="demo__lado" data-aos="fade-right">
          <h2 id="seg-titulo" className="secao__titulo">
            Um sistema, o vocabulário do seu negócio.
          </h2>
          <p className="secao__sub">Escolha o segmento no cadastro. Menus, botões e formulários passam a usar os seus termos.</p>
          <div className="demo__opcoes" role="tablist" aria-label="Segmentos">
            {lista.map((s) => (
              <button
                key={s.codigo}
                type="button"
                role="tab"
                aria-selected={s.codigo === atual}
                className="demo__opcao"
                onClick={() => setAtual(s.codigo)}
              >
                <i className={cn('bx', SEGMENTOS_ICONE[s.codigo])} aria-hidden="true" />
                {s.nome}
              </button>
            ))}
          </div>
          {seg && SEGMENTOS_DEMO.includes(seg.codigo) && (
            <ButtonLink to={`/demo?segmento=${seg.codigo.toLowerCase()}`} variant="soft" icon="bx-play-circle" className="demo__testar">
              Testar como {seg.nome.toLowerCase()}
            </ButtonLink>
          )}
        </div>

        {seg && (
          <div className="demo__preview" data-aos="fade-left" key={seg.codigo} role="tabpanel" aria-label={`Exemplo para ${seg.nome}`}>
            <div className="demo__janela">
              <div className="demo__barra" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="demo__corpo">
                <div className="demo__menu">
                  <span className="is-on">
                    <i className="bx bx-calendar" /> Agenda
                  </span>
                  <span>
                    <i className="bx bx-user" /> {plural(seg.rotulos.cliente ?? 'Cliente')}
                  </span>
                  <span>
                    <i className="bx bx-purchase-tag-alt" /> {plural(seg.rotulos.servico ?? 'Serviço')}
                  </span>
                </div>
                <div className="demo__form">
                  <strong className="demo__form-titulo">
                    {/(ão|a)$/i.test(seg.rotulos.atendimento ?? '') ? 'Nova' : 'Novo'} {(seg.rotulos.atendimento ?? 'atendimento').toLowerCase()}
                  </strong>
                  <label className="demo__campo">
                    <span>{seg.rotulos.cliente}</span>
                    <span className="demo__input">Buscar {seg.rotulos.cliente?.toLowerCase()}...</span>
                  </label>
                  <label className="demo__campo">
                    <span>{seg.rotulos.servico}</span>
                    <span className="demo__input">Selecione</span>
                  </label>
                  {campos.map((c, i) => (
                    <label key={c} className="demo__campo demo__campo--extra" style={{ '--d': `${i * 80}ms` } as CSSProperties}>
                      <span>
                        {c} <Badge tom="info">do segmento</Badge>
                      </span>
                      <span className="demo__input" />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Como funciona: três verbos, uma linha do tempo ── */
function ComoFunciona() {
  const passos = [
    { icone: 'bx-select-multiple', titulo: 'Monte o seu plano', texto: 'Parta do Start e ligue só os módulos que fazem sentido hoje.' },
    { icone: 'bx-qr-scan', titulo: 'Pague a adesão', texto: 'Pix, cartão ou boleto. Com Pix, a conta libera em segundos.' },
    { icone: 'bx-rocket', titulo: 'Comece a atender', texto: 'Cadastre serviços, importe clientes e abra a agenda da semana.' },
  ];
  return (
    <section className="secao container" aria-labelledby="como-titulo">
      <h2 id="como-titulo" className="secao__titulo secao__titulo--center" data-aos="fade-up">
        Do cadastro à primeira marcação em poucos minutos.
      </h2>
      <ol className="trilha">
        {passos.map((p, i) => (
          <li key={p.titulo} className="trilha__passo" data-aos="fade-up" data-aos-delay={i * 100}>
            <span className="trilha__icone" aria-hidden="true">
              <i className={cn('bx', p.icone)} />
            </span>
            <h3>{p.titulo}</h3>
            <p>{p.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── Preços: configurador do plano Start (valor oficial vem da API) ── */
function Precos() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['public', 'plano'], queryFn: publicoApi.plano, staleTime: 300_000 });
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const opcionais = useMemo(() => (data?.modulos ?? []).filter((m) => !m.obrigatorio), [data]);
  const obrigatorios = useMemo(() => (data?.modulos ?? []).filter((m) => m.obrigatorio), [data]);

  // Total instantâneo no front + confirmação oficial pela API (debounce 300 ms)
  const totalLocal = (data?.plano.precoBaseCentavos ?? 0) + (data?.modulos ?? []).filter((m) => m.obrigatorio || escolhidos.includes(m.codigo)).reduce((a, m) => a + m.precoCentavos, 0);
  const chave = useDebounce([...escolhidos].sort().join(','), 300);
  const { data: oficial, isFetching } = useQuery({
    queryKey: ['public', 'preco', chave],
    queryFn: () => publicoApi.preco(chave ? chave.split(',') : []),
    enabled: Boolean(data),
    placeholderData: (p) => p,
    staleTime: 300_000,
  });
  const total = oficial && oficial.totalCentavos !== undefined && chave === [...escolhidos].sort().join(',') ? oficial.totalCentavos : totalLocal;

  const alternar = (m: ModuloCatalogo) => setEscolhidos((e) => (e.includes(m.codigo) ? e.filter((x) => x !== m.codigo) : [...e, m.codigo]));

  return (
    <section id="precos" className="secao container" aria-labelledby="precos-titulo">
      <div className="secao__head" data-aos="fade-up">
        <span className="eyebrow">Plano Start</span>
        <h2 id="precos-titulo" className="secao__titulo">
          Pague pelo que usa. Adicione módulos quando crescer.
        </h2>
      </div>

      {error ? (
        <ErrorState erro={error} onTentar={() => refetch()} />
      ) : (
        <div className="precos">
          <div className="precos__modulos">
            {isLoading &&
              Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="modulo-card">
                  <Skeleton w={44} h={44} r={14} />
                  <div className="grow stack" style={{ ['--gap' as string]: '0.5rem' }}>
                    <Skeleton w="40%" h={14} />
                    <Skeleton w="80%" h={10} />
                  </div>
                </div>
              ))}
            {obrigatorios.map((m) => (
              <ModuloCard key={m.codigo} m={m} ligado obrigatorio />
            ))}
            {opcionais.map((m, i) => (
              <ModuloCard key={m.codigo} m={m} ligado={escolhidos.includes(m.codigo)} onToggle={() => alternar(m)} delay={i * 60} />
            ))}
          </div>

          <aside className="resumo-plano" data-aos="fade-left" aria-live="polite">
            <span className="resumo-plano__label">Seu plano Start</span>
            <div className="resumo-plano__total">
              <span className="num">{data ? brl(total) : <Skeleton w={140} h={36} />}</span>
              <small>/mês</small>
              {isFetching && <span className="resumo-plano__sync" aria-label="Confirmando valor" />}
            </div>
            <ul className="resumo-plano__linhas">
              <li>
                <span>Plano base</span>
                <span className="num">{brl(data?.plano.precoBaseCentavos ?? 0)}</span>
              </li>
              {(data?.modulos ?? [])
                .filter((m) => m.obrigatorio || escolhidos.includes(m.codigo))
                .map((m) => (
                  <li key={m.codigo}>
                    <span>{m.nome}</span>
                    <span className="num">{m.precoCentavos ? brl(m.precoCentavos) : 'incluso'}</span>
                  </li>
                ))}
            </ul>
            <Button
              size="lg"
              block
              variant="accent"
              iconRight="bx-right-arrow-alt"
              disabled={!data}
              onClick={() => navigate(`/cadastro${escolhidos.length ? `?modulos=${escolhidos.join(',')}` : ''}`)}
            >
              Começar agora
            </Button>
            <p className="resumo-plano__nota">
              <i className="bx bx-lock-alt" aria-hidden="true" /> Valor confirmado pelo servidor no checkout.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}

/** Card de módulo com interruptor. */
function ModuloCard({ m, ligado, obrigatorio, onToggle, delay = 0 }: { m: ModuloCatalogo; ligado: boolean; obrigatorio?: boolean; onToggle?: () => void; delay?: number }) {
  return (
    <button
      type="button"
      className={cn('modulo-card', ligado && 'is-on', obrigatorio && 'is-fixed')}
      onClick={onToggle}
      disabled={obrigatorio}
      aria-pressed={ligado}
      data-aos-delay={delay}
    >
      <span className="modulo-card__icon" aria-hidden="true">
        <i className={cn('bx', iconeModulo(m.codigo))} />
      </span>
      <span className="modulo-card__text">
        <strong>
          {m.nome} {obrigatorio && <Badge tom="primary">incluso</Badge>}
        </strong>
        {m.descricao && <small>{m.descricao}</small>}
      </span>
      <span className="modulo-card__preco num">{m.precoCentavos ? `+ ${brl(m.precoCentavos)}` : 'R$ 0'}</span>
      <span className="modulo-card__toggle" aria-hidden="true" />
    </button>
  );
}

/* ── Confiança: o que o sistema garante, em lista com ícones ── */
function Confianca() {
  const itens = [
    { icone: 'bx-shield-quarter', titulo: 'Cada empresa isolada', texto: 'Seus dados nunca aparecem para outra conta.' },
    { icone: 'bx-credit-card-front', titulo: 'Pagamento pelo Mercado Pago', texto: 'O valor é calculado no servidor, nunca no navegador.' },
    { icone: 'bx-archive', titulo: 'Nada é apagado', texto: 'Clientes com histórico são inativados, não excluídos.' },
    { icone: 'bx-user-check', titulo: 'Cada pessoa vê o que precisa', texto: 'Recepção, profissional e proprietário com acessos diferentes.' },
  ];
  return (
    <section className="secao container confianca" aria-labelledby="conf-titulo">
      <div className="confianca__lado" data-aos="fade-up">
        <h2 id="conf-titulo" className="secao__titulo">
          Feito para durar anos de agenda.
        </h2>
        <p className="secao__sub">Segurança e organização que você não precisa configurar.</p>
      </div>
      <ul className="confianca__lista">
        {itens.map((it, i) => (
          <li key={it.titulo} data-aos="fade-up" data-aos-delay={i * 70}>
            <span className="confianca__icone" aria-hidden="true">
              <i className={cn('bx', it.icone)} />
            </span>
            <div>
              <h3>{it.titulo}</h3>
              <p>{it.texto}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Dúvidas frequentes (details/summary nativo, acessível) ── */
function Duvidas() {
  const faq = [
    { p: 'Preciso contratar todos os módulos?', r: 'Não. O Núcleo já vem no plano Start com agenda, clientes, serviços, histórico e dashboard. Orçamentos, Financeiro e Multi-profissional são opcionais.' },
    { p: 'Quais formas de pagamento posso usar na adesão?', r: 'Pix, cartão de crédito e boleto, processados pelo Mercado Pago. No Pix a confirmação costuma sair na hora.' },
    { p: 'Funciona no celular?', r: 'Sim. O sistema se adapta a qualquer tela; no celular a agenda vira uma lista do dia.' },
    { p: 'Posso usar com a minha equipe?', r: 'Com o módulo Multi-profissional você cria usuários de recepção e de profissionais, cada um com a própria agenda e comissão.' },
    { p: 'Posso personalizar as cores e a logo?', r: 'Sim. Em Configurações você define as cores, o tema claro ou escuro e envia a logo, e o sistema inteiro se ajusta.' },
  ];
  const [aberto, setAberto] = useState<number>(0);
  return (
    <section id="duvidas" className="secao container duvidas" aria-labelledby="faq-titulo">
      <h2 id="faq-titulo" className="secao__titulo" data-aos="fade-up">
        Perguntas frequentes
      </h2>
      <div className="duvidas__lista">
        {faq.map((f, i) => (
          <details
            key={f.p}
            open={aberto === i}
            onToggle={(e) => {
              if ((e.currentTarget as HTMLDetailsElement).open) setAberto(i);
            }}
            data-aos="fade-up"
            data-aos-delay={i * 50}
          >
            <summary>
              {f.p}
              <i className="bx bx-plus" aria-hidden="true" />
            </summary>
            <p>{f.r}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ── Chamada final ── */
function ChamadaFinal() {
  const [hora, setHora] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setHora(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const saudacao = hora.getHours() < 12 ? 'manhã' : hora.getHours() < 18 ? 'tarde' : 'noite';
  return (
    <section className="container" aria-labelledby="cta-titulo">
      <div className="cta-final" data-aos="zoom-in-up">
        <div className="cta-final__mesh" aria-hidden="true" />
        <h2 id="cta-titulo">Organize a agenda ainda nesta {saudacao}.</h2>
        <p>Crie a conta, escolha os módulos e pague a adesão. O resto a gente deixa pronto.</p>
        <div className="cta-final__botoes">
          <ButtonLink to="/cadastro" size="lg" variant="accent" iconRight="bx-right-arrow-alt">
            Começar agora
          </ButtonLink>
          <ButtonLink to="/demo" size="lg" variant="ghost" icon="bx-play-circle" className="cta-final__demo">
            Testar grátis
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
