import type { Paginacao } from '@/api/types';
import { Button } from './Button';

/** Paginação compacta com contagem total. */
export function Pagination({ meta, onPage }: { meta: Paginacao | undefined; onPage: (p: number) => void }) {
  if (!meta || meta.total === 0) return null;
  const { page, totalPages, total, perPage } = meta;
  const de = (page - 1) * perPage + 1;
  const ate = Math.min(page * perPage, total);
  return (
    <nav className="pagination" aria-label="Paginação">
      <span className="num">
        {de}-{ate} de {total}
      </span>
      <div className="pagination__pages">
        <Button size="sm" variant="ghost" iconOnly icon="bx-chevron-left" aria-label="Página anterior" disabled={page <= 1} onClick={() => onPage(page - 1)} />
        <span className="num" aria-current="page">
          {page} / {totalPages}
        </span>
        <Button size="sm" variant="ghost" iconOnly icon="bx-chevron-right" aria-label="Próxima página" disabled={page >= totalPages} onClick={() => onPage(page + 1)} />
      </div>
    </nav>
  );
}
