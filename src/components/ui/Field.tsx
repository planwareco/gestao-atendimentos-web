import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  icon?: string;
  className?: string;
  suffix?: ReactNode;
  htmlFor?: string;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

/** Envelope de campo: rótulo acima, ajuda e erro abaixo (nunca placeholder como rótulo). */
export function Field({ label, hint, error, required, icon, className, suffix, htmlFor, children }: FieldProps) {
  const auto = useId();
  const id = htmlFor ?? auto;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('field', className)}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
          {required && (
            <span className="req" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <div className="field__control">
        {icon && <i className={cn('bx field__icon', icon)} aria-hidden="true" />}
        {children({ id, describedBy, invalid: Boolean(error) })}
        {suffix && <div className="field__suffix">{suffix}</div>}
      </div>
      {hint && !error && (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field__error" id={errId} role="alert">
          <i className="bx bx-error-circle" aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  );
}

type Comum = { label?: ReactNode; hint?: ReactNode; error?: string; icon?: string; fieldClassName?: string; suffix?: ReactNode };

export const Input = forwardRef<HTMLInputElement, Comum & InputHTMLAttributes<HTMLInputElement>>(function Input(
  { label, hint, error, icon, fieldClassName, suffix, required, className, id, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} icon={icon} required={required} className={fieldClassName} suffix={suffix} htmlFor={id}>
      {(f) => (
        <input
          ref={ref}
          id={f.id}
          className={cn('input', className)}
          aria-invalid={f.invalid || undefined}
          aria-describedby={f.describedBy}
          aria-required={required || undefined}
          {...rest}
        />
      )}
    </Field>
  );
});

export const Select = forwardRef<HTMLSelectElement, Comum & SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { label, hint, error, icon, fieldClassName, required, className, children, id, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} icon={icon} required={required} className={fieldClassName} htmlFor={id}>
      {(f) => (
        <select
          ref={ref}
          id={f.id}
          className={cn('select', className)}
          aria-invalid={f.invalid || undefined}
          aria-describedby={f.describedBy}
          aria-required={required || undefined}
          {...rest}
        >
          {children}
        </select>
      )}
    </Field>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, Comum & TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { label, hint, error, fieldClassName, required, className, id, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={fieldClassName} htmlFor={id}>
      {(f) => (
        <textarea
          ref={ref}
          id={f.id}
          className={cn('textarea', className)}
          aria-invalid={f.invalid || undefined}
          aria-describedby={f.describedBy}
          {...rest}
        />
      )}
    </Field>
  );
});

/** Checkbox estilizado. */
export const Checkbox = forwardRef<HTMLInputElement, { label: ReactNode } & InputHTMLAttributes<HTMLInputElement>>(function Checkbox(
  { label, className, ...rest },
  ref,
) {
  return (
    <label className={cn('check', className)}>
      <input ref={ref} type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
});
