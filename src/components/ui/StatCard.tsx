import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Skeleton } from './Feedback';

/** Indicador (KPI) com ícone, valor e rodapé opcional. */
export function StatCard({
  rotulo,
  valor,
  icon,
  rodape,
  tom = 'primary',
  carregando,
  destaque,
  delay = 0,
}: {
  rotulo: string;
  valor: ReactNode;
  icon: string;
  rodape?: ReactNode;
  tom?: 'primary' | 'success' | 'danger' | 'warning' | 'info';
  carregando?: boolean;
  destaque?: boolean;
  delay?: number;
}) {
  return (
    <article className={cn('stat', `stat--${tom}`, destaque && 'stat--hero')} data-aos="fade-up" data-aos-delay={delay}>
      <div className="stat__top">
        <span className="stat__label">{rotulo}</span>
        <span className="stat__icon" aria-hidden="true">
          <i className={cn('bx', icon)} />
        </span>
      </div>
      <div className="stat__value num">{carregando ? <Skeleton w="60%" h={28} /> : valor}</div>
      {rodape && <div className="stat__foot">{carregando ? <Skeleton w="40%" h={10} /> : rodape}</div>}
    </article>
  );
}
