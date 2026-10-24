import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '@/auth/SessionProvider';
import { usePermissao } from '@/auth/usePermissao';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/notify';
import { useTextoTour } from './texto';
import { TRILHAS, trilhaDaRota, trilhaPorId, type Lado, type Passo, type Trilha } from './trilhas';

interface Contexto {
  /** Trilhas que esta pessoa pode fazer (respeita permissão e módulos contratados). */
  disponiveis: Trilha[];
  concluidas: Set<string>;
  ativa: Trilha | null;
  iniciar: (id: string) => void;
  encerrar: () => void;
  trilhaAtual: Trilha | null;
  ajudaAberta: boolean;
  abrirAjuda: () => void;
  fecharAjuda: () => void;
}

const TourContext = createContext<Contexto | null>(null);

/** Sem provider (ex.: páginas públicas), os botões de ajuda simplesmente não aparecem. */
export const useTour = () => useContext(TourContext);

/** Evento que o layout escuta para abrir/fechar o menu lateral no celular. */
export const EVENTO_MENU = 'simbora:menu';

const chaveConcluidas = (id: string) => `simbora:tour:${id}`;
function lerConcluidas(id: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(chaveConcluidas(id)) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

const visivel = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
};

/** Espera o elemento do passo aparecer (as telas carregam sob demanda). */
function esperarAlvo(alvo: string, limite = 4000): Promise<Element | null> {
  return new Promise((resolve) => {
    const inicio = Date.now();
    const tentar = () => {
      const el = document.querySelector(`[data-tour="${alvo}"]`);
      if (el && visivel(el)) return resolve(el);
      if (Date.now() - inicio > limite) return resolve(null);
      window.setTimeout(tentar, 90);
    };
    tentar();
  });
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { sessao, demo } = useSession();
  const { pode, temModulo } = usePermissao();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const dono = demo ? 'demo' : (sessao?.usuario.id ?? 'anon');
  const [concluidas, setConcluidas] = useState<Set<string>>(() => lerConcluidas(dono));
  const [ativa, setAtiva] = useState<Trilha | null>(null);
  const [indice, setIndice] = useState(0);
  const [ajudaAberta, setAjudaAberta] = useState(false);
  // Devolve o foco para onde a pessoa estava quando o tour terminar
  const focoAnterior = useRef<HTMLElement | null>(null);

  useEffect(() => setConcluidas(lerConcluidas(dono)), [dono]);

  const disponiveis = useMemo(() => TRILHAS.filter((t) => (!t.permissao || pode(t.permissao)) && (!t.modulo || temModulo(t.modulo))), [pode, temModulo]);

  const marcar = useCallback(
    (id: string) =>
      setConcluidas((c) => {
        const n = new Set(c).add(id);
        try {
          localStorage.setItem(chaveConcluidas(dono), JSON.stringify([...n]));
        } catch {
          /* sem armazenamento: o progresso vale só nesta visita */
        }
        return n;
      }),
    [dono],
  );

  const iniciar = useCallback(
    (id: string) => {
      const t = trilhaPorId(id);
      if (!t) return;
      setAjudaAberta(false);
      focoAnterior.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
      const destino = t.passos[0]?.rota ?? t.rota;
      if (`${pathname}${search}` !== destino) navigate(destino);
      setIndice(0);
      setAtiva(t);
    },
    [navigate, pathname, search],
  );

  const encerrar = useCallback(() => {
    setAtiva(null);
    window.dispatchEvent(new CustomEvent(EVENTO_MENU, { detail: false }));
    const alvo = focoAnterior.current;
    window.setTimeout(() => (alvo?.isConnected ? alvo : document.getElementById('conteudo'))?.focus({ preventScroll: true }), 0);
  }, []);

  const texto = useTextoTour();
  const concluir = useCallback(() => {
    if (!ativa) return;
    marcar(ativa.id);
    const proxima = disponiveis.find((t) => t.id !== ativa.id && !concluidas.has(t.id));
    toast.ok(proxima ? `Pronto! Quando quiser, faça "${texto(proxima.titulo)}" pela Ajuda.` : 'Pronto! Você já conhece o sistema todo.');
    encerrar();
  }, [ativa, marcar, disponiveis, concluidas, encerrar, texto]);

  const valor = useMemo<Contexto>(
    () => ({
      disponiveis,
      concluidas,
      ativa,
      iniciar,
      encerrar,
      trilhaAtual: (() => {
        const t = trilhaDaRota(pathname);
        return t && disponiveis.some((d) => d.id === t.id) ? t : null;
      })(),
      ajudaAberta,
      abrirAjuda: () => setAjudaAberta(true),
      fecharAjuda: () => setAjudaAberta(false),
    }),
    [disponiveis, concluidas, ativa, iniciar, encerrar, pathname, ajudaAberta],
  );

  return (
    <TourContext.Provider value={valor}>
      {children}
      {ativa && <Tour trilha={ativa} indice={indice} setIndice={setIndice} onEncerrar={encerrar} onConcluir={concluir} />}
    </TourContext.Provider>
  );
}

/* ── Sobreposição: destaque do elemento + balão com o texto ── */
interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}
const MARGEM = 12;
const FOLGA = 8;

function Tour({ trilha, indice, setIndice, onEncerrar, onConcluir }: { trilha: Trilha; indice: number; setIndice: (n: number) => void; onEncerrar: () => void; onConcluir: () => void }) {
  const navigate = useNavigate();
  const t = useTextoTour();
  const { pathname, search } = useLocation();
  const passo: Passo = trilha.passos[indice];
  const total = trilha.passos.length;
  const [alvo, setAlvo] = useState<Element | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pronto, setPronto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; lado: Lado | 'centro' | 'folha'; seta: number }>({ top: 0, left: 0, lado: 'centro', seta: 0 });
  const balao = useRef<HTMLDivElement>(null);
  const direcao = useRef<1 | -1>(1);
  const celular = typeof window !== 'undefined' && window.innerWidth < 640;
  const menuMovel = typeof window !== 'undefined' && window.innerWidth < 1024;
  const reduzir = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Encontra (ou navega até) o elemento de cada passo
  useEffect(() => {
    let vivo = true;
    setPronto(false);
    const abrirMenu = Boolean(passo.menu && menuMovel);
    window.dispatchEvent(new CustomEvent(EVENTO_MENU, { detail: abrirMenu }));
    const rota = passo.rota ?? trilha.rota;
    if (`${pathname}${search}` !== rota) {
      navigate(rota);
      return;
    }
    if (!passo.alvo) {
      setAlvo(null);
      setRect(null);
      setPronto(true);
      return;
    }
    esperarAlvo(passo.alvo, abrirMenu ? 1500 : 2500).then((el) => {
      if (!vivo) return;
      if (!el) {
        // Elemento não existe para esta pessoa (permissão, tela vazia): pula o passo
        const prox = indice + direcao.current;
        if (prox >= 0 && prox < total) setIndice(prox);
        else if (prox >= total) onConcluir();
        else setPronto(true);
        return;
      }
      const r = el.getBoundingClientRect();
      // Alvo alto (quadro, formulário longo): mostra o começo dele logo abaixo do topo fixo
      if (r.height > window.innerHeight * 0.6 && !passo.menu) window.scrollTo({ top: window.scrollY + r.top - 96, behavior: reduzir ? 'auto' : 'smooth' });
      else el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduzir ? 'auto' : 'smooth' });
      window.setTimeout(
        () => {
          if (!vivo) return;
          setAlvo(el);
          setPronto(true);
        },
        reduzir ? 30 : abrirMenu ? 320 : 260,
      );
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice, trilha.id, pathname, search]);

  // Acompanha o elemento quando a página rola ou muda de tamanho
  useEffect(() => {
    if (!alvo || !passo.alvo) return;
    let raf = 0;
    const medir = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const b = alvo.getBoundingClientRect();
        // O destaque fica dentro da tela, mesmo quando o alvo é maior que ela
        // Alvo alto que passa por baixo do topo fixo: o destaque começa logo abaixo dele
        const barra = document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 0;
        const topo = b.top < barra && b.bottom > barra + 100 ? barra + FOLGA + 2 : Math.max(b.top, 4);
        const base = Math.min(b.bottom, window.innerHeight - 4);
        const r = { top: topo, left: b.left, width: b.width, height: Math.max(0, base - topo) };
        setRect((a) =>
          a && Math.abs(a.top - (r.top - FOLGA)) < 0.5 && Math.abs(a.left - (r.left - FOLGA)) < 0.5 && Math.abs(a.width - (r.width + FOLGA * 2)) < 0.5 && Math.abs(a.height - (r.height + FOLGA * 2)) < 0.5
            ? a
            : { top: r.top - FOLGA, left: r.left - FOLGA, width: r.width + FOLGA * 2, height: r.height + FOLGA * 2 },
        );
      });
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(alvo);
    window.addEventListener('scroll', medir, true);
    window.addEventListener('resize', medir);
    // Conteúdo que carrega depois (listas, imagens) empurra o alvo sem mudar o tamanho dele
    const vigia = window.setInterval(medir, 250);
    return () => {
      window.clearInterval(vigia);
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('scroll', medir, true);
      window.removeEventListener('resize', medir);
    };
  }, [alvo, passo.alvo]);

  // Posiciona o balão no lado com mais espaço
  useLayoutEffect(() => {
    const b = balao.current;
    if (!b || !pronto) return;
    const w = b.offsetWidth;
    const h = b.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!rect || !passo.alvo) {
      setPos({ top: Math.max(MARGEM, (vh - h) / 2), left: Math.max(MARGEM, (vw - w) / 2), lado: 'centro', seta: 0 });
      return;
    }
    if (celular) {
      // No celular o balão vira uma folha presa embaixo (ou em cima, se o alvo estiver na metade de baixo)
      const centro = rect.top + rect.height / 2;
      setPos({ top: centro > vh * 0.55 ? -1 : -2, left: MARGEM, lado: 'folha', seta: 0 });
      return;
    }
    const espaco: Record<Lado, number> = { baixo: vh - (rect.top + rect.height), cima: rect.top, direita: vw - (rect.left + rect.width), esquerda: rect.left };
    const cabe = (l: Lado) => (l === 'baixo' || l === 'cima' ? espaco[l] >= h + 20 : espaco[l] >= w + 20);
    const ordem: Lado[] = [passo.lado ?? 'baixo', 'baixo', 'cima', 'direita', 'esquerda'];
    const lado = ordem.find(cabe) ?? 'baixo';
    const limitar = (v: number, max: number) => Math.min(Math.max(MARGEM, v), max - MARGEM);
    let top: number;
    let left: number;
    if (lado === 'baixo' || lado === 'cima') {
      left = limitar(rect.left + rect.width / 2 - w / 2, vw - w);
      top = lado === 'baixo' ? rect.top + rect.height + 14 : rect.top - h - 14;
      top = limitar(top, vh - h);
    } else {
      top = limitar(rect.top + rect.height / 2 - h / 2, vh - h);
      left = lado === 'direita' ? rect.left + rect.width + 14 : rect.left - w - 14;
    }
    const seta = lado === 'baixo' || lado === 'cima' ? rect.left + rect.width / 2 - left : rect.top + rect.height / 2 - top;
    setPos({ top, left, lado, seta: Math.min(Math.max(seta, 22), (lado === 'baixo' || lado === 'cima' ? w : h) - 22) });
  }, [rect, pronto, passo.alvo, passo.lado, celular, indice]);

  // Foco no balão a cada passo (leitores de tela leem o título e o texto)
  useEffect(() => {
    if (pronto) balao.current?.focus({ preventScroll: true });
  }, [pronto, indice]);

  const avancar = useCallback(() => {
    direcao.current = 1;
    if (indice + 1 >= total) onConcluir();
    else setIndice(indice + 1);
  }, [indice, total, onConcluir, setIndice]);
  const voltar = useCallback(() => {
    direcao.current = -1;
    if (indice > 0) setIndice(indice - 1);
  }, [indice, setIndice]);

  // Teclado: setas avançam/voltam, Esc fecha. Os atalhos da tela ficam pausados.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEncerrar();
      else if (e.key === 'ArrowRight') avancar();
      else if (e.key === 'ArrowLeft') voltar();
      else if (e.key === 'Tab') {
        const foco = balao.current?.querySelectorAll<HTMLElement>('button');
        if (!foco?.length) return;
        const lista = [...foco];
        const i = lista.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        lista[(i + (e.shiftKey ? -1 : 1) + lista.length) % lista.length].focus();
      } else if (/^F\d+$/.test(e.key)) e.preventDefault();
      else return;
      e.stopImmediatePropagation();
    };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, [avancar, voltar, onEncerrar]);

  const tituloId = `tour-titulo-${trilha.id}`;
  return createPortal(
    <div className="tour" role="presentation">
      <div className={cn('tour__veu', (!rect || !passo.alvo) && 'tour__veu--cheio')} onClick={(e) => e.stopPropagation()} aria-hidden="true" />
      {rect && passo.alvo && pronto && <div className="tour__foco" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} aria-hidden="true" />}
      <div
        ref={balao}
        className={cn('tour__balao', `tour__balao--${pos.lado}`, pronto && 'is-visivel')}
        style={
          pos.lado === 'folha'
            ? { left: MARGEM, right: MARGEM, ...(pos.top === -1 ? { top: MARGEM } : { bottom: `calc(${MARGEM}px + env(safe-area-inset-bottom))` }) }
            : { top: pos.top, left: pos.left, ['--seta' as string]: `${pos.seta}px` }
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={`${tituloId}-texto`}
        tabIndex={-1}
      >
        <div className="tour__topo">
          <span className="tour__trilha">
            <i className={cn('bx', trilha.icone)} aria-hidden="true" /> {t(trilha.titulo)}
          </span>
          <button type="button" className="tour__fechar" onClick={onEncerrar} aria-label="Fechar o tour">
            <i className="bx bx-x" aria-hidden="true" />
          </button>
        </div>
        <h2 id={tituloId} className="tour__titulo">
          {t(passo.titulo)}
        </h2>
        <p id={`${tituloId}-texto`} className="tour__texto">
          {t(passo.texto)}
        </p>
        {passo.dica && (
          <p className="tour__dica">
            <i className="bx bx-bulb" aria-hidden="true" /> {t(passo.dica)}
          </p>
        )}
        <div className="tour__rodape">
          <div className="tour__progresso" aria-label={`Passo ${indice + 1} de ${total}`}>
            {trilha.passos.map((_, i) => (
              <span key={i} className={cn(i < indice && 'is-feito', i === indice && 'is-atual')} />
            ))}
          </div>
          <div className="tour__botoes">
            {indice > 0 && (
              <Button size="sm" variant="ghost" onClick={voltar}>
                Voltar
              </Button>
            )}
            <Button size="sm" onClick={avancar} iconRight={indice + 1 >= total ? 'bx-check' : 'bx-right-arrow-alt'}>
              {indice + 1 >= total ? 'Concluir' : indice === 0 && !passo.alvo ? 'Começar' : 'Próximo'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
