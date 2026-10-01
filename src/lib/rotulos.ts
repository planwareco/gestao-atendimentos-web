import { useMemo } from 'react';
import { useSession } from '@/auth/SessionProvider';

/** Plural simples em pt-BR para os rótulos do segmento. */
export function plural(p: string): string {
  if (/ão$/i.test(p)) return p.replace(/ão$/i, 'ões');
  if (/[rsz]$/i.test(p)) return `${p}es`;
  if (/l$/i.test(p)) return p.replace(/l$/i, 'is');
  return `${p}s`;
}

const artigo = (p: string) => (/(a|ão|ade|gem)$/i.test(p) && !/(dia|ma)$/i.test(p) ? 'a' : 'o');

/** Rótulos do segmento da empresa ("Tutor", "Paciente", "Sessão"...). */
export function useRotulos() {
  const { sessao } = useSession();
  const r = sessao?.empresa.camposPersonalizados?.rotulos;
  return useMemo(() => {
    const cliente = r?.cliente || 'Cliente';
    const servico = r?.servico || 'Serviço';
    const atendimento = r?.atendimento || 'Atendimento';
    return {
      cliente,
      clientes: plural(cliente),
      servico,
      servicos: plural(servico),
      atendimento,
      atendimentos: plural(atendimento),
      novo: (p: string) => `${artigo(p) === 'a' ? 'Nova' : 'Novo'} ${p.toLowerCase()}`,
      artigo,
    };
  }, [r?.cliente, r?.servico, r?.atendimento]);
}
