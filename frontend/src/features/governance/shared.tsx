'use client';
import { useId, useState, type ReactNode, type FormEvent } from 'react';
import { Info } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { useGovernance } from './store';
import { outcomes, outcomeLabels } from './model';
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="page-actions">{action}</div>}
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <Info size={16} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
export function useOutcomeFilter() {
  const { text, t } = useGovernance();
  return {
    label: t('All outcomes', 'Tous les résultats'),
    options: outcomes.map((value) => ({ value, label: text(outcomeLabels[value]) })),
  };
}
export type FormField = {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'email' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  defaultValue?: string;
  optional?: boolean;
  hint?: string;
};
export function RecordForm({
  title,
  description,
  fields,
  onClose,
  onSave,
  submitLabel,
}: {
  title: string;
  description?: string;
  fields: FormField[];
  onClose: () => void;
  onSave: (values: Record<string, string>) => void;
  submitLabel?: string;
}) {
  const { t } = useGovernance();
  const id = useId();
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<
      string,
      string
    >;
    for (const key of Object.keys(values)) values[key] = values[key].trim();
    if (fields.some((f) => !f.optional && !values[f.key])) {
      setError(t('Complete all required fields.', 'Remplissez tous les champs obligatoires.'));
      return;
    }
    onSave(values);
    onClose();
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={onClose}>{t('Cancel', 'Annuler')}</Button>
          <Button variant="primary" type="submit" form={id}>
            {submitLabel || t('Save', 'Enregistrer')}
          </Button>
        </>
      }
    >
      <form id={id} onSubmit={submit}>
        {fields.map((f, i) => (
          <div className="field" key={f.key}>
            <label htmlFor={`${id}-${f.key}`}>
              {f.label}
              {f.optional ? ` (${t('optional', 'facultatif')})` : ''}
            </label>
            {f.type === 'select' ? (
              <Select
                id={`${id}-${f.key}`}
                name={f.key}
                required={!f.optional}
                defaultValue={f.defaultValue || f.options?.[0]?.value}
              >
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ) : f.type === 'textarea' ? (
              <textarea
                className="textarea"
                id={`${id}-${f.key}`}
                name={f.key}
                required={!f.optional}
                defaultValue={f.defaultValue}
                maxLength={2000}
              />
            ) : (
              <Input
                id={`${id}-${f.key}`}
                name={f.key}
                type={f.type || 'text'}
                required={!f.optional}
                defaultValue={f.defaultValue}
                maxLength={150}
                autoFocus={i === 0}
              />
            )}
            {f.hint && <p className="small muted">{f.hint}</p>}
          </div>
        ))}
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
export function DateText({ value }: { value: string }) {
  const { lang } = useGovernance();
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return (
    <time dateTime={value}>
      {date.toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      })}
    </time>
  );
}
