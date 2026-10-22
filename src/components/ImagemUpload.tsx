import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { cn } from '@/lib/cn';
import { ehImagemEnviada, prepararImagem, TIPOS_IMAGEM, type OpcoesImagem } from '@/lib/imagem';

interface Props extends OpcoesImagem {
  label: string;
  hint?: string;
  valor: string;
  onChange: (v: string) => void;
  error?: string;
  /** Formato da área de pré-visualização. */
  formato?: 'largo' | 'quadrado';
}

/**
 * Logo/favicon: envio de arquivo (com redimensionamento no navegador) ou link https.
 * Aceita arrastar e soltar. O valor é sempre uma string: data URL ou https://.
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

  const mensagemErro = erroLocal ?? error;

  return (
    <div className={cn('upload-img', `upload-img--${formato}`)}>
      <span className="field__label" id={`${id}-label`}>
        {label}
      </span>
      <div
        className={cn('upload-img__area', arrastando && 'is-drag', mensagemErro && 'is-erro')}
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
        <div className="upload-img__preview" aria-hidden={!valor}>
          {valor ? <img src={valor} alt={`Pré-visualização: ${label}`} /> : <i className="bx bx-image-add" aria-hidden="true" />}
        </div>
        <div className="upload-img__acoes">
          <div className="row" style={{ ['--gap' as string]: '0.5rem' }}>
            <Button size="sm" variant="soft" icon="bx-upload" loading={processando} onClick={() => input.current?.click()} aria-describedby={`${id}-label`}>
              {valor ? 'Trocar imagem' : 'Enviar imagem'}
            </Button>
            {valor && (
              <Button
                size="sm"
                variant="danger-ghost"
                icon="bx-trash"
                onClick={() => {
                  onChange('');
                  setErroLocal(null);
                }}
              >
                Remover
              </Button>
            )}
          </div>
          <span className="text-xs muted">PNG, JPG, WebP ou SVG, até 5 MB. Você também pode arrastar o arquivo para cá.</span>
          <button type="button" className="upload-img__link" onClick={() => setModoLink((v) => !v)} aria-expanded={modoLink}>
            {modoLink ? 'Fechar link' : 'Prefiro colar um link'}
          </button>
        </div>
        <input ref={input} type="file" accept={TIPOS_IMAGEM.join(',')} hidden onChange={(e) => void receber(e.target.files?.[0])} />
      </div>
      {modoLink && (
        <Input
          label={`Link da imagem (${label.toLowerCase()})`}
          type="url"
          placeholder="https://..."
          value={ehImagemEnviada(valor) ? '' : valor}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {mensagemErro ? (
        <span className="field__error" role="alert">
          {mensagemErro}
        </span>
      ) : (
        hint && <span className="field__hint">{hint}</span>
      )}
    </div>
  );
}
