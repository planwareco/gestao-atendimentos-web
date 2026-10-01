import type { ReactNode } from 'react';
import { brl, digitosParaCentavos } from '@/lib/money';
import { Input } from './Field';

interface Base {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  fieldClassName?: string;
  id?: string;
  placeholder?: string;
}

/** Dinheiro estilo caixa registradora: digitar 1 2 3 4 vira R$ 12,34. Valor sempre em centavos. */
export function MoneyInput({ value, onChange, ...rest }: Base & { value: number | null | undefined; onChange: (centavos: number) => void }) {
  return (
    <Input
      {...rest}
      inputMode="numeric"
      autoComplete="off"
      className="num"
      value={brl(value ?? 0)}
      onChange={(e) => onChange(digitosParaCentavos(e.target.value))}
      onFocus={(e) => requestAnimationFrame(() => e.target.setSelectionRange(e.target.value.length, e.target.value.length))}
    />
  );
}

/** Campo com máscara: exibe formatado, devolve só dígitos. */
export function MaskedInput({
  value,
  onChange,
  mask,
  icon,
  inputMode = 'numeric',
  ...rest
}: Base & { value: string | null | undefined; onChange: (digitos: string) => void; mask: (v: string) => string; icon?: string; inputMode?: 'numeric' | 'tel' }) {
  return (
    <Input
      {...rest}
      icon={icon}
      inputMode={inputMode}
      value={mask(value ?? '')}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
    />
  );
}
