/**
 * Prepara uma imagem escolhida pelo usuário para ser salva junto da configuração:
 * redimensiona no navegador e devolve um data URL (WebP, ou PNG quando o navegador
 * não gera WebP). Mantém a transparência e respeita o limite aceito pela API.
 */
export const TIPOS_IMAGEM = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_ARQUIVO = 5 * 1024 * 1024; // 5 MB antes de redimensionar

export interface OpcoesImagem {
  /** Caixa máxima em px; a imagem é reduzida proporcionalmente para caber. */
  maxLargura: number;
  maxAltura: number;
  /** Tamanho máximo do data URL em caracteres (o mesmo limite da API). */
  limite: number;
}

function carregar(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler essa imagem.'));
    };
    img.src = url;
  });
}

export async function prepararImagem(arquivo: File, { maxLargura, maxAltura, limite }: OpcoesImagem): Promise<string> {
  if (!TIPOS_IMAGEM.includes(arquivo.type)) throw new Error('Use uma imagem PNG, JPG, WebP ou SVG.');
  if (arquivo.size > MAX_ARQUIVO) throw new Error('A imagem passa de 5 MB. Escolha um arquivo menor.');

  const img = await carregar(arquivo);
  const largura = img.naturalWidth || 512;
  const altura = img.naturalHeight || 512;

  // Tenta qualidade alta primeiro; se passar do limite, reduz qualidade e depois tamanho
  for (const escala of [1, 0.75, 0.5]) {
    const fator = Math.min(1, (maxLargura * escala) / largura, (maxAltura * escala) / altura);
    const w = Math.max(1, Math.round(largura * fator));
    const h = Math.max(1, Math.round(altura * fator));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    for (const qualidade of [0.92, 0.8, 0.65]) {
      const dataUrl = canvas.toDataURL('image/webp', qualidade);
      if (dataUrl.length <= limite) return dataUrl;
    }
  }
  throw new Error('Não deu para deixar a imagem leve o bastante. Tente um arquivo mais simples.');
}

export const ehImagemEnviada = (v: string | null | undefined) => !!v && v.startsWith('data:image/');
