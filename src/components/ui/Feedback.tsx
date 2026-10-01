import type { CSSProperties, ReactNode } from 'react';
import { erroApi } from '@/lib/errors';
import { Button } from './Button';

export function Spinner({ label = 'Carregando' }: { label?: string }) {
  return <span className="spinner" role="status" aria-label={label} />;
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <Spinner />
    </div>
  );
}

export function Skeleton({ w = '100%', h = 14, r, style }: { w?: number | string; h?: number | string; r?: number; style?: CSSProperties }) {
  return <span className="skeleton" aria-hidden="true" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

/** Linhas de esqueleto no formato de uma lista/tabela. */
export function SkeletonRows({ linhas = 6 }: { linhas?: number }) {
  return (
    <div className="stack" style={{ ['--gap' as string]: '0.9rem', padding: '0.5rem 0' }} aria-busy="true" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="row" style={{ ['--gap' as string]: '1rem' }}>
          <Skeleton w={36} h={36} r={18} />
          <div className="grow stack" style={{ ['--gap' as string]: '0.45rem' }}>
            <Skeleton w={`${55 + ((i * 13) % 30)}%`} h={12} />
            <Skeleton w={`${25 + ((i * 7) % 20)}%`} h={10} />
          </div>
          <Skeleton w={70} h={22} r={11} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = 'bx-folder-open', titulo, texto, acao }: { icon?: string; titulo: string; texto?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__art" aria-hidden="true">
        <i className={`bx ${icon}`} />
      </div>
      <p className="empty__title">{titulo}</p>
      {texto && <p className="empty__text">{texto}</p>}
      {acao && <div style={{ marginTop: '0.6rem' }}>{acao}</div>}
    </div>
  );
}

/** Erro com requestId visível para o suporte. */
export function ErrorState({ erro, onTentar }: { erro: unknown; onTentar?: () => void }) {
  const body = erroApi(erro);
  return (
    <div className="error-box" role="alert">
      <i className="bx bx-error" aria-hidden="true" />
      <div className="stack grow" style={{ ['--gap' as string]: '0.4rem' }}>
        <strong>{body?.message ?? 'Não foi possível carregar os dados.'}</strong>
        {body?.requestId && (
          <span className="text-xs">
            Código para o suporte: <code>{body.requestId}</code>
          </span>
        )}
        {onTentar && (
          <div>
            <Button size="sm" variant="danger-ghost" icon="bx-refresh" onClick={onTentar}>
              Tentar de novo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
