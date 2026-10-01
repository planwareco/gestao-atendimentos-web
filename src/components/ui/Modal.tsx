import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { Button } from './Button';

interface ModalProps {
  aberto: boolean;
  onFechar: () => void;
  titulo: ReactNode;
  subtitulo?: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
  tamanho?: 'sm' | 'md' | 'lg' | 'xl';
  /** Envolve corpo e rodapé num <form>. */
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  bloquearFechar?: boolean;
}

/** Pilha de modais abertos: só o do topo reage a Esc/Tab. */
const pilha: symbol[] = [];

const FOCAVEIS = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Diálogo acessível: foco preso, Esc fecha, foco devolvido ao gatilho. Vira bottom sheet no celular. */
export function Modal({ aberto, onFechar, titulo, subtitulo, children, rodape, tamanho = 'md', onSubmit, bloquearFechar }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tituloId = useId();
  const fecharRef = useRef(onFechar);
  fecharRef.current = onFechar;

  useEffect(() => {
    if (!aberto) return;
    const eu = Symbol('modal');
    pilha.push(eu);
    const anterior = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const primeiro = ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current?.querySelector<HTMLElement>('.modal__body ' + FOCAVEIS);
    (primeiro ?? ref.current)?.focus();

    const tecla = (e: KeyboardEvent) => {
      if (pilha[pilha.length - 1] !== eu) return;
      if (e.key === 'Escape' && !bloquearFechar) {
        e.stopPropagation();
        fecharRef.current();
      }
      if (e.key === 'Tab' && ref.current) {
        const els = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCAVEIS));
        if (!els.length) return;
        const [p, u] = [els[0], els[els.length - 1]];
        if (e.shiftKey && document.activeElement === p) {
          e.preventDefault();
          u.focus();
        } else if (!e.shiftKey && document.activeElement === u) {
          e.preventDefault();
          p.focus();
        }
      }
    };
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('keydown', tecla);
      pilha.splice(pilha.indexOf(eu), 1);
      if (!pilha.length) document.body.style.overflow = '';
      anterior?.focus?.();
    };
  }, [aberto, bloquearFechar]);

  if (!aberto) return null;

  const conteudo = (
    <>
      <div className="modal__head">
        <div>
          <h2 className="modal__title" id={tituloId}>
            {titulo}
          </h2>
          {subtitulo && <p className="modal__subtitle">{subtitulo}</p>}
        </div>
        <Button variant="ghost" size="sm" iconOnly icon="bx-x" aria-label="Fechar" onClick={onFechar} disabled={bloquearFechar} />
      </div>
      <div className="modal__body">{children}</div>
      {rodape && <div className="modal__foot">{rodape}</div>}
    </>
  );

  return createPortal(
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !bloquearFechar) onFechar();
      }}
    >
      <div ref={ref} className={cn('modal', tamanho !== 'md' && `modal--${tamanho}`)} role="dialog" aria-modal="true" aria-labelledby={tituloId} tabIndex={-1}>
        {onSubmit ? (
          <form onSubmit={onSubmit} noValidate style={{ display: 'contents' }}>
            {conteudo}
          </form>
        ) : (
          conteudo
        )}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmProps {
  aberto: boolean;
  onFechar: () => void;
  onConfirmar: () => void;
  titulo: string;
  mensagem: ReactNode;
  confirmar?: string;
  perigo?: boolean;
  carregando?: boolean;
  children?: ReactNode;
}

/** Confirmação para ações destrutivas ou irreversíveis. */
export function ConfirmDialog({ aberto, onFechar, onConfirmar, titulo, mensagem, confirmar = 'Confirmar', perigo, carregando, children }: ConfirmProps) {
  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={titulo}
      tamanho="sm"
      bloquearFechar={carregando}
      rodape={
        <>
          <Button variant="ghost" onClick={onFechar} disabled={carregando}>
            Voltar
          </Button>
          <Button variant={perigo ? 'danger' : 'primary'} onClick={onConfirmar} loading={carregando} data-autofocus>
            {confirmar}
          </Button>
        </>
      }
    >
      <div className="stack" style={{ ['--gap' as string]: '1rem' }}>
        <p className="muted">{mensagem}</p>
        {children}
      </div>
    </Modal>
  );
}
