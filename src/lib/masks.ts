/* Máscaras de exibição/entrada. A API recebe sempre só dígitos. */

export const soDigitos = (v: string | null | undefined): string => (v ?? '').replace(/\D/g, '');

export function maskTelefone(v: string | null | undefined): string {
  const d = soDigitos(v).slice(0, 13);
  if (d.length > 11) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskDocumento(v: string | null | undefined): string {
  const d = soDigitos(v).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskCep(v: string | null | undefined): string {
  const d = soDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function maskHora(v: string): string {
  const d = soDigitos(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}

/** Link do WhatsApp com DDI 55 quando o número vier só com DDD. */
export function linkWhatsapp(numero: string | null | undefined, texto?: string): string | null {
  const d = soDigitos(numero);
  if (d.length < 10) return null;
  const completo = d.length <= 11 ? `55${d}` : d;
  return `https://wa.me/${completo}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

/** Cor estável a partir de um texto (avatares). Tons dentro da família marinho/azul. */
export function corDoTexto(txt: string): string {
  const paleta = ['#0f2557', '#2f6bff', '#1d4ed8', '#0e7490', '#4338ca', '#0369a1', '#155e75', '#1e3a8a'];
  let h = 0;
  for (const c of txt) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return paleta[h % paleta.length];
}
