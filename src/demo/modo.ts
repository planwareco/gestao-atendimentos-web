import type { Segmento } from '@/api/types';

/**
 * Modo demonstração: o sistema inteiro roda no navegador, com uma empresa fictícia.
 * Nenhuma requisição sai para a API; os dados ficam nesta aba (sessionStorage)
 * e somem quando ela é fechada ou quando a pessoa sai da demonstração.
 */
const CHAVE_ATIVO = 'simbora:demo';
export const CHAVE_DB = 'simbora:demo:db';

export const SEGMENTOS_DEMO: Segmento[] = ['SALAO_BELEZA', 'BARBEARIA', 'ESTETICA', 'PETSHOP', 'FISIOTERAPIA', 'CONSULTORIA'];

// Reserva em memória para navegadores que bloqueiam o sessionStorage
let ativoEmMemoria: string | null = null;

function ler(chave: string): string | null {
  try {
    return sessionStorage.getItem(chave) ?? (chave === CHAVE_ATIVO ? ativoEmMemoria : null);
  } catch {
    return chave === CHAVE_ATIVO ? ativoEmMemoria : null;
  }
}

/** Avaliado a cada requisição: a demonstração liga e desliga sem recarregar a página. */
export function ehDemo(): boolean {
  return ler(CHAVE_ATIVO) !== null;
}

export function segmentoDemo(): Segmento | null {
  const s = ler(CHAVE_ATIVO);
  return s && (SEGMENTOS_DEMO as string[]).includes(s) ? (s as Segmento) : null;
}

export function ligarDemo(segmento: Segmento) {
  ativoEmMemoria = segmento;
  try {
    sessionStorage.setItem(CHAVE_ATIVO, segmento);
    sessionStorage.removeItem(CHAVE_DB);
  } catch {
    /* modo anônimo restrito: a demo funciona, mas não sobrevive a um F5 */
  }
}

export function desligarDemo() {
  ativoEmMemoria = null;
  try {
    sessionStorage.removeItem(CHAVE_ATIVO);
    sessionStorage.removeItem(CHAVE_DB);
  } catch {
    /* nada a fazer */
  }
}
