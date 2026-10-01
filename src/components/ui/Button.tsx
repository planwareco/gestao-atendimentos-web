import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/cn';

type Variante = 'primary' | 'accent' | 'ghost' | 'soft' | 'danger' | 'danger-ghost' | 'link';
type Tamanho = 'sm' | 'md' | 'lg';

interface Base {
  variant?: Variante;
  size?: Tamanho;
  icon?: string;
  iconRight?: string;
  block?: boolean;
  /** Botão só com ícone: exige rótulo acessível. */
  iconOnly?: boolean;
}

export interface ButtonProps extends Base, ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children?: ReactNode;
}

const classes = ({ variant = 'primary', size = 'md', block, iconOnly }: Base, extra?: string) =>
  cn('btn', `btn--${variant}`, size !== 'md' && `btn--${size}`, block && 'btn--block', iconOnly && 'btn--icon', extra);

/** Botão base: variantes, ícone Boxicons e estado de carregamento acessível. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, icon, iconRight, block, iconOnly, loading, className, children, type = 'button', disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classes({ variant, size, block, iconOnly }, cn(loading && 'is-loading', className))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {icon && <i className={cn('bx', icon)} aria-hidden="true" />}
      {children}
      {iconRight && <i className={cn('bx', iconRight)} aria-hidden="true" />}
    </button>
  );
});

/** Link com aparência de botão (navegação interna). */
export function ButtonLink({ variant, size, icon, iconRight, block, iconOnly, className, children, ...rest }: Base & LinkProps) {
  return (
    <Link className={classes({ variant, size, block, iconOnly }, className)} {...rest}>
      {icon && <i className={cn('bx', icon)} aria-hidden="true" />}
      {children}
      {iconRight && <i className={cn('bx', iconRight)} aria-hidden="true" />}
    </Link>
  );
}
