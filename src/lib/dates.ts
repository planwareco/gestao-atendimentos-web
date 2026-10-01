/* Datas: instantes em ISO UTC; datas puras em AAAA-MM-DD; exibição no fuso da empresa. */

export const FUSO_PADRAO = 'America/Sao_Paulo';

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = tz + JSON.stringify(opts);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, ...opts });
    cache.set(key, f);
  }
  return f;
}

export const fmtHora = (iso: string, tz = FUSO_PADRAO) => fmt(tz, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
export const fmtDataHora = (iso: string, tz = FUSO_PADRAO) => fmt(tz, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
export const fmtDataLonga = (iso: string, tz = FUSO_PADRAO) => {
  const t = fmt(tz, { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(iso));
  return t.charAt(0).toUpperCase() + t.slice(1);
};
export const fmtDataCurtaInstante = (iso: string, tz = FUSO_PADRAO) => fmt(tz, { day: '2-digit', month: 'short' }).format(new Date(iso));

/** "2026-10-05" -> "05/10/2026" */
export const fmtData = (yyyyMmDd: string | null | undefined): string => (yyyyMmDd ? yyyyMmDd.slice(0, 10).split('-').reverse().join('/') : '-');

/** "2026-10-05" -> "05 out" */
export function fmtDiaMes(yyyyMmDd: string): string {
  const [, m, d] = yyyyMmDd.slice(0, 10).split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MESES_CURTOS[(m ?? 1) - 1]}`;
}

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/** Partes de data no fuso informado. */
export function partesNoFuso(d: Date, tz = FUSO_PADRAO) {
  const parts = fmt(tz, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { ano: get('year'), mes: get('month'), dia: get('day'), hora: get('hour'), minuto: get('minute') };
}

/** Hoje (AAAA-MM-DD) no fuso da empresa. */
export function hojeISO(tz = FUSO_PADRAO): string {
  const p = partesNoFuso(new Date(), tz);
  return `${p.ano}-${pad(p.mes)}-${pad(p.dia)}`;
}

export const pad = (n: number) => String(n).padStart(2, '0');

/** Data pura somando dias. */
export function somarDias(yyyyMmDd: string, dias: number): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

/** Primeiro e último dia do mês (datas puras). */
export function limitesMes(ano: number, mes: number): { inicio: string; fim: string } {
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return { inicio: `${ano}-${pad(mes)}-01`, fim: `${ano}-${pad(mes)}-${pad(ultimo)}` };
}

/** Diferença de minutos entre o fuso e UTC num instante (ex.: São Paulo = -180). */
function offsetMinutos(instante: Date, tz: string): number {
  const p = partesNoFuso(instante, tz);
  const comoUtc = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto);
  return Math.round((comoUtc - Math.floor(instante.getTime() / 60000) * 60000) / 60000);
}

/** Data + hora locais da empresa -> instante ISO UTC. */
export function localParaIso(data: string, hora: string, tz = FUSO_PADRAO): string {
  const [y, m, d] = data.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  const palpite = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const off = offsetMinutos(palpite, tz);
  return new Date(palpite.getTime() - off * 60000).toISOString();
}

/** Instante ISO -> { data: 'AAAA-MM-DD', hora: 'HH:mm' } no fuso da empresa. */
export function isoParaLocal(iso: string, tz = FUSO_PADRAO): { data: string; hora: string } {
  const p = partesNoFuso(new Date(iso), tz);
  return { data: `${p.ano}-${pad(p.mes)}-${pad(p.dia)}`, hora: `${pad(p.hora)}:${pad(p.minuto)}` };
}

export function idade(dataNascimento: string): number {
  const [y, m, d] = dataNascimento.split('-').map(Number);
  const hoje = new Date();
  let anos = hoje.getFullYear() - y;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) anos -= 1;
  return anos;
}

export function relativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (Math.abs(min) < 1) return 'agora';
  if (Math.abs(min) < 60) return min > 0 ? `há ${min} min` : `em ${-min} min`;
  const h = Math.round(min / 60);
  if (Math.abs(h) < 24) return h > 0 ? `há ${h} h` : `em ${-h} h`;
  const dias = Math.round(h / 24);
  return dias > 0 ? `há ${dias} dia${dias > 1 ? 's' : ''}` : `em ${-dias} dia${dias < -1 ? 's' : ''}`;
}
