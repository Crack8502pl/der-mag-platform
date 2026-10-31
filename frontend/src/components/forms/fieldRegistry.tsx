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

const DataField = (props: FieldComponentProps) => {
  const source = typeof props.field.options.source === 'string' ? props.field.options.source : '';
  if (props.field.options.mode === 'readonly') {
    const hasValue = props.value !== null && props.value !== undefined && props.value !== '';
    return (
      <div className="dynamic-form__system-data">
        <span id={props.id} role="textbox" aria-readonly="true" aria-label={props.field.label}>
          {hasValue ? String(props.value) : 'brak danych w zadaniu'}
        </span>
        <small><span aria-hidden="true">↗</span> Źródło: {source}</small>
      </div>
    );
  }

  const fieldType = props.field.options.valueType === 'number'
    ? 'NUMBER'
    : props.field.options.valueType === 'boolean' ? 'CHECKBOX' : 'TEXT';
  const editableField = { ...props.field, fieldType };
  const Component = fieldType === 'NUMBER' ? NumberField : fieldType === 'CHECKBOX' ? CheckboxField : TextField;
  return <Component {...props} field={editableField} />;
};

interface BomTableRow {
  bomItemId: number;
  name: string;
  unit: string;
  plannedQty: number;
  installedQty: number | null;
  installed: boolean;
  note: string;
}

const BOM_COLUMNS = ['plannedQty', 'installedQty', 'installed', 'note'] as const;
const BOM_COLUMN_LABELS: Record<typeof BOM_COLUMNS[number], string> = {
  plannedQty: 'Plan',
  installedQty: 'Zamontowano',
  installed: 'Zainstalowane',
  note: 'Uwagi',
};

const BomTableField = (props: FieldComponentProps) => {
  const rows = Array.isArray(props.value) ? props.value as BomTableRow[] : [];
  const configured = Array.isArray(props.field.options.columns)
    ? props.field.options.columns.filter((column): column is typeof BOM_COLUMNS[number] =>
      typeof column === 'string' && BOM_COLUMNS.includes(column as typeof BOM_COLUMNS[number]))
    : [...BOM_COLUMNS];
  const updateRow = (index: number, patch: Partial<BomTableRow>) => {
    props.onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  };
  const markAllAsPlanned = () => props.onChange(rows.map(row => ({
    ...row,
    installedQty: row.plannedQty,
    installed: row.plannedQty > 0,
  })));
  return (
    <div
      id={props.id}
      className="dynamic-form__bom"
      role="group"
      aria-label={props.field.label}
      aria-labelledby={`${props.id}-label`}
      aria-required={props.required}
      aria-describedby={props.errorId}
      aria-invalid={props.errorId ? true : undefined}
    >
      {configured.includes('installedQty') && configured.includes('installed') && (
        <button type="button" className="btn btn-secondary" disabled={props.disabled || rows.length === 0} onClick={markAllAsPlanned}>
          Wszystko zgodnie z planem
        </button>
      )}
      <table className="dynamic-form__bom-table">
        <thead><tr>
          <th scope="col">Materiał</th>
          <th scope="col">j.m.</th>
          {configured.map(column => <th scope="col" key={column}>{BOM_COLUMN_LABELS[column]}</th>)}
        </tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.bomItemId} data-testid="bom-table-row">
              <th scope="row" data-label="Materiał">{row.name}</th>
              <td data-label="j.m.">{row.unit || '—'}</td>
              {configured.map(column => <td data-label={BOM_COLUMN_LABELS[column]} key={column}>
                {column === 'plannedQty' && row.plannedQty}
                {column === 'installedQty' && <input
                  type="number"
                  min="0"
                  step="any"
                  aria-label={`${row.name}: zamontowano`}
                  disabled={props.disabled}
                  value={row.installedQty ?? ''}
                  onChange={event => {
                    const quantity = event.target.valueAsNumber;
                    updateRow(index, { installedQty: Number.isFinite(quantity) ? quantity : null });
                  }}
                />}
                {column === 'installed' && <input
                  type="checkbox"
                  aria-label={`${row.name}: zainstalowane`}
                  disabled={props.disabled}
                  checked={row.installed}
                  onChange={event => updateRow(index, { installed: event.target.checked })}
                />}
                {column === 'note' && <textarea
                  aria-label={`${row.name}: uwagi`}
                  disabled={props.disabled}
                  value={row.note}
                  onChange={event => updateRow(index, { note: event.target.value })}
                />}
              </td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.map(row => row.installedQty !== null && row.installedQty > 0 && !row.installed && (
        <p className="dynamic-form__bom-warning" role="status" key={`partial-${row.bomItemId}`}>
          {row.name}: częściowy montaż — pozycja nie została oznaczona jako zainstalowana.
        </p>
      ))}
      {rows.map(row => row.installedQty !== null && row.installedQty > row.plannedQty && row.note.trim() === '' && (
        <p className="dynamic-form__bom-warning" role="alert" key={`note-${row.bomItemId}`}>
          {row.name}: dodaj uwagi, gdy ilość przekracza plan.
        </p>
      ))}
      {rows.length === 0 && <p role="status">Brak pozycji BOM dla tego zadania.</p>}
    </div>
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
  DATA: DataField,
  BOM_TABLE: BomTableField,
};
