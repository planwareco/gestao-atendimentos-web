import { useEffect, useState } from 'react';

/** Lê as cores atuais do tema (incluindo a personalização da empresa) para os gráficos. */
export function useCoresGrafico() {
  const ler = () => {
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
    return {
      primaria: v('--primary-color', '#0f2557'),
      secundaria: v('--secondary-color', '#2f6bff'),
      texto: v('--muted-color', '#56637f'),
      linha: v('--line', '#e2e8f3'),
      superficie: v('--surface-color', '#ffffff'),
      perigo: '#c4314b',
      sucesso: '#12805c',
      escuro: document.documentElement.dataset.theme === 'dark',
    };
  };
  const [cores, setCores] = useState(ler);
  useEffect(() => {
    const mo = new MutationObserver(() => setCores(ler()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-theme'] });
    return () => mo.disconnect();
  }, []);
  return cores;
}

/** Paleta categórica derivada da marca (marinho → azul → ciano), para séries sem cor própria. */
export const PALETA_CATEGORIAS = ['#2f6bff', '#0f2557', '#0e9fb8', '#6c8fd9', '#1d4ed8', '#5b6b8c', '#38bdf8', '#334a7d', '#94a3c4', '#0369a1', '#7c9cf5', '#1e293b'];
