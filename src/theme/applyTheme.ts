import type { Aparencia } from '@/api/types';

/** Identidade padrão do produto: azul-marinho + azul de destaque. */
export const MARCA = { primaria: '#0F2557', secundaria: '#2F6BFF' } as const;

/** Padrão gravado pela API em empresas novas. Tratado como "não personalizado". */
const PADRAO_API = { primaria: '#6D5EF8', secundaria: '#14B8A6' };

const HEX = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i;

function luminancia(hex: string): number {
  const m = HEX.exec(hex);
  if (!m) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texto legível sobre a cor (branco em cor escura, marinho em cor clara). */
export const contraste = (hex: string): string => (luminancia(hex) > 0.42 ? '#0B1530' : '#FFFFFF');

/** Cores efetivas: a personalização da empresa ou a marca do produto. */
export function coresEfetivas(a: Partial<Aparencia> | null | undefined) {
  const prim = a?.corPrimaria && HEX.test(a.corPrimaria) && a.corPrimaria.toUpperCase() !== PADRAO_API.primaria ? a.corPrimaria : MARCA.primaria;
  const sec = a?.corSecundaria && HEX.test(a.corSecundaria) && a.corSecundaria.toUpperCase() !== PADRAO_API.secundaria ? a.corSecundaria : MARCA.secundaria;
  return { primaria: prim, secundaria: sec };
}

/** Aplica a aparência da empresa como variáveis CSS (o app inteiro reage). */
export function applyTheme(a: Partial<Aparencia> | null | undefined) {
  const root = document.documentElement;
  const { primaria, secundaria } = coresEfetivas(a);
  root.style.setProperty('--primary-color', primaria);
  root.style.setProperty('--secondary-color', secundaria);
  root.style.setProperty('--primary-contrast', contraste(primaria));
  root.style.setProperty('--secondary-contrast', contraste(secundaria));
  root.dataset.theme = a?.tema === 'escuro' ? 'dark' : 'light';

  const meta = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
  if (meta) meta.content = primaria;
  const icon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (icon) icon.href = a?.faviconUrl ?? '/favicon.svg';
}

/** Volta à identidade do produto (áreas públicas e admin). */
export function resetTheme() {
  applyTheme(null);
}
