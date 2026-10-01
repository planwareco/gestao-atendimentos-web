const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtCompacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

/** Centavos inteiros -> "R$ 1.234,56". A API trabalha só com centavos. */
export const brl = (centavos: number | null | undefined): string => fmtBRL.format((centavos ?? 0) / 100);

/** Para eixos de gráfico: "R$ 12,4 mil". */
export const brlCompacto = (centavos: number): string => `R$ ${fmtCompacto.format(centavos / 100)}`;

/** Basis points <-> porcentagem (4000 bps = 40%). */
export const bpsParaPct = (bps: number): number => bps / 100;
export const pctParaBps = (pct: number): number => Math.round(pct * 100);

/** Converte texto digitado em centavos no estilo caixa registradora: "1234" -> 1234 (R$ 12,34). */
export const digitosParaCentavos = (txt: string): number => Number(txt.replace(/\D/g, '').slice(0, 11)) || 0;
