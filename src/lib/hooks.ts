import { useCallback, useEffect, useRef, useState } from 'react';

/** Valor com atraso (busca com debounce). */
export function useDebounce<T>(valor: T, ms = 300): T {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = window.setTimeout(() => setV(valor), ms);
    return () => window.clearTimeout(t);
  }, [valor, ms]);
  return v;
}

/** Estado aberto/fechado com payload opcional (modais). */
export function useDisclosure<T = undefined>() {
  const [estado, setEstado] = useState<{ aberto: boolean; dado?: T }>({ aberto: false });
  const abrir = useCallback((dado?: T) => setEstado({ aberto: true, dado }), []);
  const fechar = useCallback(() => setEstado({ aberto: false }), []);
  return { aberto: estado.aberto, dado: estado.dado, abrir, fechar };
}

/** Fecha ao clicar fora / Esc. */
export function useClickFora<T extends HTMLElement>(ativo: boolean, onFora: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!ativo) return;
    const clique = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onFora();
    };
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onFora();
    document.addEventListener('mousedown', clique);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', clique);
      document.removeEventListener('keydown', tecla);
    };
  }, [ativo, onFora]);
  return ref;
}

/** Media query reativa. */
export function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const fn = () => setMatch(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [query]);
  return match;
}

/** Título da aba do navegador. */
export function useTitulo(titulo: string) {
  useEffect(() => {
    const anterior = document.title;
    document.title = `${titulo} · Atendo`;
    return () => {
      document.title = anterior;
    };
  }, [titulo]);
}
