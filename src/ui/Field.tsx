import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cx } from './cx';

const control =
  'w-full rounded-[6px] border border-[#C9C5BB] bg-paper px-3 py-2.5 text-[16px] text-obsidian placeholder:text-graphite focus:border-obsidian aria-[invalid=true]:border-vermilion';

interface Wrap {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
}

function FieldShell({ id, label, hint, error, className, children }: Wrap & { id: string; children: ReactNode }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-obsidian">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-graphite">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-vermilion">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, hint?: ReactNode, error?: string | null) =>
  [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;

export const Field = forwardRef<HTMLInputElement, Wrap & InputHTMLAttributes<HTMLInputElement>>(function Field(
  { label, hint, error, className, id: given, ...rest },
  ref,
) {
  const auto = useId();
  const id = given ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <input ref={ref} id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} className={control} {...rest} />
    </FieldShell>
  );
});

export const TextArea = forwardRef<HTMLTextAreaElement, Wrap & TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  { label, hint, error, className, id: given, ...rest },
  ref,
) {
  const auto = useId();
  const id = given ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <textarea ref={ref} id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} className={cx(control, 'min-h-24')} {...rest} />
    </FieldShell>
  );
});

export const Select = forwardRef<HTMLSelectElement, Wrap & SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { label, hint, error, className, id: given, children, ...rest },
  ref,
) {
  const auto = useId();
  const id = given ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <select ref={ref} id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} className={control} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
});
