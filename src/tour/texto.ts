import { useCallback } from 'react';
import { useRotulos } from '@/lib/rotulos';

/**
 * Troca {cliente}, {o_cliente}, {um_atendimento}, {os_servicos}, {Novo_atendimento}...
 * pelos nomes que a empresa usa ("tutor", "a sessão", "uma reunião").
 * Chave com inicial maiúscula devolve o texto com inicial maiúscula.
 */
export function useTextoTour() {
  const r = useRotulos();
  return useCallback(
    (texto: string) =>
      texto.replace(/\{(\w+)\}/g, (original, chave: string) => {
        const k = chave.toLowerCase();
        const [prefixo, nome] = k.includes('_') ? (k.split('_') as [string, string]) : ['', k];
        const singular = { cliente: r.cliente, servico: r.servico, atendimento: r.atendimento }[nome.replace(/s$/, '') as 'cliente' | 'servico' | 'atendimento'];
        if (!singular) return original;
        const plural = nome.endsWith('s');
        const base = (plural ? { cliente: r.clientes, servico: r.servicos, atendimento: r.atendimentos }[nome.replace(/s$/, '') as 'cliente'] : singular).toLowerCase();
        const fem = r.artigo(singular) === 'a';
        let out = base;
        if (prefixo === 'o' || prefixo === 'os') out = `${fem ? 'a' : 'o'}${plural ? 's' : ''} ${base}`;
        else if (prefixo === 'um') out = `${fem ? 'uma' : 'um'} ${base}`;
        else if (prefixo === 'novo') out = r.novo(singular);
        return chave[0] === chave[0].toUpperCase() ? out.charAt(0).toUpperCase() + out.slice(1) : out;
      }),
    [r],
  );
}
