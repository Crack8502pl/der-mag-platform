/* eslint-disable react-refresh/only-export-components -- Field components are exported through the registry, not individually. */
import type { ComponentType } from 'react';
import type { FormField } from '../../types/forms.types';

export interface FieldComponentProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  inputRef: (instance: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null) => void;
  id: string;
  required: boolean;
  disabled: boolean;
  errorId?: string;
}

const controlProps = (props: FieldComponentProps) => ({
  id: props.id,
  name: props.field.key,
  ref: props.inputRef,
  onBlur: props.onBlur,
  required: props.required,
  disabled: props.disabled,
  'aria-required': props.required,
  'aria-describedby': props.errorId,
  'aria-invalid': props.errorId ? true : undefined,
});

const stringValue = (value: unknown): string => typeof value === 'string' ? value : '';

function optionsWithSavedValues(field: FormField, savedValues: string[]): string[] {
  const values = Array.isArray(field.options.values)
    ? field.options.values.filter((value): value is string => typeof value === 'string')
    : [];
  return [...new Set([...values, ...savedValues])];
}

const TextField = (props: FieldComponentProps) => (
  <input
    {...controlProps(props)}
    type={props.field.fieldType.toUpperCase() === 'EMAIL' ? 'email' : props.field.fieldType.toUpperCase() === 'DATE' ? 'date' : 'text'}
    value={stringValue(props.value)}
    onChange={event => props.onChange(event.target.value)}
  />
);

const TextareaField = (props: FieldComponentProps) => (
  <textarea
    {...controlProps(props)}
    value={stringValue(props.value)}
    onChange={event => props.onChange(event.target.value)}
  />
);

const NumberField = (props: FieldComponentProps) => (
  <input
    {...controlProps(props)}
    type="number"
    step="any"
    value={typeof props.value === 'number' && Number.isFinite(props.value) ? props.value : ''}
    onChange={event => {
      const value = event.target.valueAsNumber;
      props.onChange(Number.isFinite(value) ? value : null);
    }}
  />
);

const SelectField = (props: FieldComponentProps) => {
  const value = stringValue(props.value);
  const options = optionsWithSavedValues(props.field, value ? [value] : []);
  return (
    <select {...controlProps(props)} value={value} onChange={event => props.onChange(event.target.value)}>
      <option value="">Wybierz…</option>
      {options.filter(option => option !== '').map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  );
};

const PassFailField = (props: FieldComponentProps) => (
  <select {...controlProps(props)} value={stringValue(props.value)} onChange={event => props.onChange(event.target.value)}>
    <option value="">Wybierz…</option>
    <option value="PASS">PASS</option>
    <option value="FAIL">FAIL</option>
  </select>
);

const CheckboxField = (props: FieldComponentProps) => (
  <select
    {...controlProps(props)}
    value={typeof props.value === 'boolean' ? String(props.value) : ''}
    onChange={event => props.onChange(event.target.value === '' ? null : event.target.value === 'true')}
  >
    <option value="">Wybierz…</option>
    <option value="true">Tak</option>
    <option value="false">Nie</option>
  </select>
);

const RadioField = (props: FieldComponentProps) => {
  const value = stringValue(props.value);
  const options = optionsWithSavedValues(props.field, value ? [value] : []);
  return (
    <div role="radiogroup" aria-label={props.field.label} aria-required={props.required} aria-describedby={props.errorId} aria-invalid={props.errorId ? true : undefined}>
      {options.map((option, index) => (
        <label key={option} htmlFor={index === 0 ? props.id : `${props.id}-${index}`}>
          <input
            {...controlProps(props)}
            id={index === 0 ? props.id : `${props.id}-${index}`}
            ref={index === 0 ? props.inputRef : undefined}
            type="radio"
            aria-label={option}
            value={option}
            checked={value === option}
            onChange={event => props.onChange(event.target.value)}
          />
          {option}
        </label>
      ))}
    </div>
  );
};

const MultiSelectField = (props: FieldComponentProps) => {
  const values = Array.isArray(props.value) ? props.value.filter((value): value is string => typeof value === 'string') : [];
  const options = optionsWithSavedValues(props.field, values);
  return (
    <select
      {...controlProps(props)}
      multiple
      aria-label={props.field.label}
      value={values}
      onChange={event => props.onChange(Array.from(event.target.selectedOptions, option => option.value))}
    >
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  );
};

export const fieldRegistry: Readonly<Record<string, ComponentType<FieldComponentProps>>> = {
  TEXT: TextField,
  STRING: TextField,
  TEXTAREA: TextareaField,
  EMAIL: TextField,
  DATE: TextField,
  SELECT: SelectField,
  RADIO: RadioField,
  NUMBER: NumberField,
  PASS_FAIL: PassFailField,
  CHECKBOX: CheckboxField,
  MULTI_SELECT: MultiSelectField,
};
