import { useId, useRef, useState } from 'react';
import { Input } from '@/components/ui/Field';
import { cn } from '@/lib/cn';
import { ehImagemEnviada, prepararImagem, TIPOS_IMAGEM, type OpcoesImagem } from '@/lib/imagem';

interface Props extends OpcoesImagem {
  label: string;
  hint?: string;
  valor: string;
  onChange: (v: string) => void;
  error?: string;
  /** `largo` para logo; `icone` para favicon (mostra como aba do navegador). */
  formato?: 'largo' | 'icone';
}

const tamanho = (dataUrl: string) => {
  const kb = Math.round(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4 / 1024);
  return `${Math.max(1, kb)} KB`;
};

/**
 * Logo/favicon: a pré-visualização é a própria área de envio (clique ou arraste).
 * Redimensiona no navegador; o valor é sempre string (data URL ou https://).
 */
export function ImagemUpload({ label, hint, valor, onChange, error, formato = 'largo', ...opcoes }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [modoLink, setModoLink] = useState(() => !!valor && !ehImagemEnviada(valor));
  const [arrastando, setArrastando] = useState(false);

  const receber = async (arquivo?: File | null) => {
    if (!arquivo) return;
    setErroLocal(null);
    setProcessando(true);
    try {
      onChange(await prepararImagem(arquivo, opcoes));
      setModoLink(false);
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : 'Não foi possível usar essa imagem.');
    } finally {
      setProcessando(false);
      if (input.current) input.current.value = '';
    }
  };

  const abrir = () => input.current?.click();
  const erro = erroLocal ?? error;
  const enviada = ehImagemEnviada(valor);

  return (
    <div className={cn('upimg', `upimg--${formato}`, erro && 'upimg--erro')}>
      <span className="field__label" id={`${id}-l`}>
        {label}
      </span>

      <div className="upimg__box">
        <button
          type="button"
          className={cn('upimg__drop', arrastando && 'is-drag', !valor && 'is-vazio')}
          onClick={abrir}
          aria-labelledby={`${id}-l`}
          aria-describedby={`${id}-d`}
          aria-busy={processando || undefined}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            void receber(e.dataTransfer.files?.[0]);
          }}
        >
          {processando ? (
            <span className="spinner" aria-label="Processando imagem" />
          ) : valor ? (
            formato === 'icone' ? (
              <span className="upimg__aba" aria-hidden="true">
                <img src={valor} alt="" />
                <span>Seu sistema</span>
                <i className="bx bx-x" />
              </span>
            ) : (
              <img src={valor} alt={`${label} atual`} className="upimg__img" />
            )
          ) : (
            <span className="upimg__vazio">
              <i className="bx bx-cloud-upload" aria-hidden="true" />
              <strong>Clique ou arraste</strong>
              <small>PNG, JPG, WebP ou SVG</small>
            </span>
          )}
          {valor && !processando && (
            <span className="upimg__trocar" aria-hidden="true">
              <i className="bx bx-refresh" /> Trocar
            </span>
          )}
        </button>

        <div className="upimg__barra">
          <span className="upimg__meta" id={`${id}-d`}>
            {valor ? (
              <>
                <i className={cn('bx', enviada ? 'bx-check-circle' : 'bx-link')} aria-hidden="true" />
                {enviada ? `Imagem enviada · ${tamanho(valor)}` : 'Usando link externo'}
              </>
            ) : (
              'Nenhuma imagem'
            )}
          </span>
          <button type="button" className="upimg__acao" onClick={() => setModoLink((v) => !v)} aria-expanded={modoLink}>
            <i className="bx bx-link" aria-hidden="true" /> Link
          </button>
          {valor && (
            <button
              type="button"
              className="upimg__acao upimg__acao--perigo"
              onClick={() => {
                onChange('');
                setErroLocal(null);
              }}
              aria-label={`Remover ${label.toLowerCase()}`}
            >
              <i className="bx bx-trash" aria-hidden="true" />
            </button>
          )}
        </div>
        <input ref={input} type="file" accept={TIPOS_IMAGEM.join(',')} hidden onChange={(e) => void receber(e.target.files?.[0])} />
      </div>

      {modoLink && (
        <Input
          label="Link da imagem"
          type="url"
          placeholder="https://..."
          value={enviada ? '' : valor}
          onChange={(e) => onChange(e.target.value)}
          fieldClassName="upimg__link"
        />
      )}
      {erro ? (
        <span className="field__error" role="alert">
          {erro}
        </span>
      ) : (
        hint && <span className="field__hint">{hint}</span>
      )}
    </div>
  );
}
