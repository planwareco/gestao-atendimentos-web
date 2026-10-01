import { useMemo } from 'react';
import type { Modulo, Permissao } from '@/api/types';
import { useSession } from './SessionProvider';

/** Perguntas de autorização: as permissões já vêm filtradas pelos módulos contratados. */
export function usePermissao() {
  const { sessao } = useSession();
  return useMemo(() => {
    const set = new Set<Permissao>(sessao?.permissoes ?? []);
    const leitura = sessao?.empresa.status === 'SOMENTE_LEITURA';
    const modulos = new Set<Modulo>(sessao?.empresa.modulos ?? []);
    return {
      pode: (p: Permissao) => set.has(p),
      /** Use nos botões de criar/editar/excluir. */
      podeEscrever: (p: Permissao) => set.has(p) && !leitura,
      temModulo: (m: Modulo) => modulos.has(m),
      somenteLeitura: leitura,
      ehProprietario: sessao?.usuario.papel === 'PROPRIETARIO',
    };
  }, [sessao]);
}
