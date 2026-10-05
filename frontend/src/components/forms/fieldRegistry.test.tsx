import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fieldRegistry } from './fieldRegistry';
import type { FieldComponentProps } from './fieldRegistry';

afterEach(cleanup);

function makeProps(fieldType: string, overrides: Partial<FieldComponentProps> = {}): FieldComponentProps {
  return {
    field: {
      key: 'answer',
      label: 'Odpowiedź',
      fieldType,
      required: false,
      sortOrder: 0,
      validation: {},
      options: { values: ['One', 'Two'] },
      conditions: {},
    },
    value: null,
    onChange: vi.fn(),
    onBlur: vi.fn(),
    inputRef: vi.fn(),
    id: 'answer-control',
    required: false,
    disabled: false,
    ...overrides,
  };
}

function renderField(props: FieldComponentProps) {
  const Component = fieldRegistry[props.field.fieldType];
  return render(<><label htmlFor={props.id}>{props.field.label}</label><Component {...props} /></>);
}

describe('fieldRegistry', () => {
  it('registers only the supported persisted types', () => {
    expect(Object.keys(fieldRegistry).sort()).toEqual([
      'TEXT', 'STRING', 'TEXTAREA', 'EMAIL', 'DATE', 'SELECT', 'RADIO',
      'NUMBER', 'PASS_FAIL', 'CHECKBOX', 'MULTI_SELECT',
    ].sort());
  });

  it.each([
    ['TEXT', 'INPUT', 'text', 'hello'],
    ['STRING', 'INPUT', 'text', 'hello'],
    ['TEXTAREA', 'TEXTAREA', null, 'hello\nworld'],
    ['EMAIL', 'INPUT', 'email', 'hello@example.com'],
    ['DATE', 'INPUT', 'date', '2026-10-05'],
  ])('renders controlled %s inputs with change, blur and ref', (type, tagName, inputType, value) => {
    const props = makeProps(type, { value });
    const view = renderField(props);
    const input = screen.getByLabelText('Odpowiedź');
    expect(input.tagName).toBe(tagName);
    if (inputType) expect(input).toHaveAttribute('type', inputType);
    expect(input).toHaveValue(value);
    expect(props.inputRef).toHaveBeenCalledWith(input);
    fireEvent.change(input, { target: { value: type === 'DATE' ? '2026-10-06' : 'changed' } });
    expect(props.onChange).toHaveBeenCalledWith(type === 'DATE' ? '2026-10-06' : 'changed');
    fireEvent.blur(input);
    expect(props.onBlur).toHaveBeenCalledOnce();
    view.unmount();
    expect(vi.mocked(props.inputRef).mock.calls.at(-1)?.[0]).toBeNull();
  });

  it.each(Object.keys(fieldRegistry))('passes accessibility, required, disabled and ref attributes for %s', type => {
    const props = makeProps(type, { required: true, disabled: true, errorId: 'answer-error' });
    renderField(props);
    const input = document.getElementById(props.id)!;
    expect(input).toHaveAttribute('required');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'answer-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('name', props.field.key);
    expect(props.inputRef).toHaveBeenCalledWith(input);
    fireEvent.blur(input);
    expect(props.onBlur).toHaveBeenCalledOnce();
    if (type === 'RADIO') {
      const group = screen.getByRole('radiogroup', { name: props.field.label });
      expect(group).toHaveAttribute('aria-required', 'true');
      expect(group).toHaveAttribute('aria-describedby', props.errorId);
      screen.getAllByRole('radio').forEach(radio => expect(radio).toBeDisabled());
    }
    if (type === 'MULTI_SELECT') expect(screen.getByRole('listbox', { name: props.field.label })).toBe(input);
  });

  it('does not add validation constraints from the definition', () => {
    const props = makeProps('NUMBER');
    props.field.validation = { min: 1, max: 2 };
    renderField(props);
    const input = screen.getByRole('spinbutton');
    expect(input).not.toHaveAttribute('min');
    expect(input).not.toHaveAttribute('max');
    expect(input).not.toHaveAttribute('required');
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('emits finite numbers and null when cleared, preserving zero', () => {
    const props = makeProps('NUMBER', { value: 0 });
    renderField(props);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(0);
    fireEvent.change(input, { target: { value: '12.5' } });
    expect(props.onChange).toHaveBeenLastCalledWith(12.5);
    fireEvent.change(input, { target: { value: '' } });
    expect(props.onChange).toHaveBeenLastCalledWith(null);
  });

  it.each([null, undefined, NaN, Infinity])('renders %s number as empty without uncontrolled defaults', value => {
    renderField(makeProps('NUMBER', { value }));
    expect(screen.getByRole('spinbutton')).toHaveValue(null);
  });

  it('uses string options for SELECT and retains saved options no longer in the definition', () => {
    const props = makeProps('SELECT', { value: 'Archived' });
    props.field.options.values = ['One', 'Two', 'One', 123, { label: 'Ignored' }];
    renderField(props);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('Archived');
    expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(['Wybierz…', 'One', 'Two', 'Archived']);
    fireEvent.change(select, { target: { value: 'Two' } });
    expect(props.onChange).toHaveBeenLastCalledWith('Two');
    fireEvent.change(select, { target: { value: '' } });
    expect(props.onChange).toHaveBeenLastCalledWith('');
  });

  it('renders RADIO as a named group with string values and retains saved options', () => {
    const props = makeProps('RADIO', { value: 'Archived' });
    renderField(props);
    expect(screen.getByRole('radiogroup', { name: props.field.label })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Archived' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Two' }));
    expect(props.onChange).toHaveBeenLastCalledWith('Two');
    expect(screen.getByRole('radio', { name: 'Archived' })).toBeChecked();
  });

  it('preserves multiple saved string values and emits selected arrays', () => {
    const props = makeProps('MULTI_SELECT', { value: ['One', 'Archived'] });
    renderField(props);
    const select = screen.getByRole('listbox', { name: props.field.label }) as HTMLSelectElement;
    expect(select).toHaveValue(['One', 'Archived']);
    for (const option of select.options) option.selected = option.value === 'Two' || option.value === 'Archived';
    fireEvent.change(select);
    expect(props.onChange).toHaveBeenLastCalledWith(['Two', 'Archived']);
    for (const option of select.options) option.selected = false;
    fireEvent.change(select);
    expect(props.onChange).toHaveBeenLastCalledWith([]);
  });

  it.each(['SELECT', 'RADIO', 'MULTI_SELECT'])('retains saved %s choices even with no configured options', type => {
    const props = makeProps(type, { value: type === 'MULTI_SELECT' ? ['Archived'] : 'Archived' });
    props.field.options = {};
    renderField(props);
    expect(screen.getByRole(type === 'RADIO' ? 'radio' : 'option', { name: 'Archived' })).toBeInTheDocument();
  });

  it.each([null, undefined, true, false])('represents CHECKBOX %s without defaulting an unanswered value to false', value => {
    const props = makeProps('CHECKBOX', { value });
    renderField(props);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue(typeof value === 'boolean' ? String(value) : '');
    expect(props.onChange).not.toHaveBeenCalled();
    fireEvent.change(select, { target: { value: value === true ? 'false' : 'true' } });
    expect(props.onChange).toHaveBeenLastCalledWith(value !== true);
    fireEvent.change(select, { target: { value: 'false' } });
    expect(props.onChange).toHaveBeenLastCalledWith(false);
    fireEvent.change(select, { target: { value: '' } });
    expect(props.onChange).toHaveBeenLastCalledWith(null);
  });

  it.each([null, 'PASS', 'FAIL'])('renders PASS_FAIL %s and emits persisted tokens or empty string', value => {
    const props = makeProps('PASS_FAIL', { value });
    renderField(props);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue(value ?? '');
    expect(screen.getAllByRole('option').map(option => (option as HTMLOptionElement).value)).toEqual(['', 'PASS', 'FAIL']);
    fireEvent.change(select, { target: { value: value === 'PASS' ? 'FAIL' : 'PASS' } });
    expect(props.onChange).toHaveBeenLastCalledWith(value === 'PASS' ? 'FAIL' : 'PASS');
    fireEvent.change(select, { target: { value: '' } });
    expect(props.onChange).toHaveBeenLastCalledWith('');
  });
});
