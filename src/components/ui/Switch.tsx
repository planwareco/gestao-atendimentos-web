import { useId, type ReactNode } from 'react';

/** Interruptor acessível (role="switch"). */
export function Switch({
  checked,
  onChange,
  label,
  descricao,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  descricao?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="switch-row">
      <div className="switch-row__text">
        <span id={id} className="switch-row__label">
          {label}
        </span>
        {descricao && <span className="switch-row__desc">{descricao}</span>}
      </div>
      <button type="button" role="switch" className="switch" aria-checked={checked} aria-labelledby={id} disabled={disabled} onClick={() => onChange(!checked)} />
    </div>
  );
}
