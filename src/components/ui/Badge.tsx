import type { ReactNode } from 'react';
import type { StatusAtendimento, StatusEmpresa, StatusOrcamento, SituacaoRetorno } from '@/api/types';
import { cn } from '@/lib/cn';
import { SITUACAO_RETORNO, STATUS_ATENDIMENTO, STATUS_EMPRESA, STATUS_ORCAMENTO } from '@/lib/labels';

type Tom = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';

export function Badge({ tom = 'neutral', icon, children, className }: { tom?: Tom; icon?: string; children: ReactNode; className?: string }) {
  return (
    <span className={cn('badge', tom !== 'neutral' && `badge--${tom}`, className)}>
      {icon && <i className={cn('bx', icon)} aria-hidden="true" />}
      {children}
    </span>
  );
}

export const StatusAtendimentoBadge = ({ status }: { status: StatusAtendimento }) => {
  const s = STATUS_ATENDIMENTO[status];
  return (
    <Badge tom={s.tom} icon={s.icone} className={status === 'CANCELADO' ? 'badge--strike' : undefined}>
      {s.label}
    </Badge>
  );
};

export const StatusOrcamentoBadge = ({ status }: { status: StatusOrcamento }) => {
  const s = STATUS_ORCAMENTO[status];
  return (
    <Badge tom={s.tom} icon={s.icone}>
      {s.label}
    </Badge>
  );
};

export const StatusEmpresaBadge = ({ status }: { status: StatusEmpresa }) => {
  const s = STATUS_EMPRESA[status];
  return (
    <Badge tom={s.tom} icon={s.icone}>
      {s.label}
    </Badge>
  );
};

export const RetornoBadge = ({ situacao }: { situacao: SituacaoRetorno | null }) => {
  if (!situacao) return <Badge>Sem histórico</Badge>;
  const s = SITUACAO_RETORNO[situacao];
  return <Badge tom={s.tom}>{s.label}</Badge>;
};

export const AtivoBadge = ({ status }: { status: 'ATIVO' | 'INATIVO' }) =>
  status === 'ATIVO' ? <Badge tom="success">Ativo</Badge> : <Badge>Inativo</Badge>;
