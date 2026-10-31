export type FormDataValueType = 'string' | 'number' | 'boolean';

export interface FormDataSource {
  expression: string;
  type: FormDataValueType;
  group: string;
  label: string;
}

export const FORM_DATA_SOURCES: FormDataSource[] = [
  { expression: 'task.number', type: 'string', group: 'Zadanie', label: 'Numer zadania' },
  { expression: 'task.status', type: 'string', group: 'Zadanie', label: 'Status zadania' },
  { expression: 'task.title', type: 'string', group: 'Zadanie', label: 'Tytuł zadania' },
  { expression: 'task.priority', type: 'string', group: 'Zadanie', label: 'Priorytet zadania' },
  { expression: 'task.assignee.name', type: 'string', group: 'Zadanie', label: 'Przypisana osoba' },
  { expression: 'task.due.date', type: 'string', group: 'Zadanie', label: 'Termin zadania' },
  { expression: 'task.progress', type: 'number', group: 'Zadanie', label: 'Postęp zadania (%)' },
  { expression: 'task.location', type: 'string', group: 'Zadanie', label: 'Lokalizacja' },
  { expression: 'task.type.name', type: 'string', group: 'Zadanie', label: 'Typ zadania' },
  { expression: 'task.contract.number', type: 'string', group: 'Zadanie', label: 'Numer kontraktu' },
  { expression: 'task.subsystem.name', type: 'string', group: 'Zadanie', label: 'Typ systemu podsystemu' },
  { expression: 'task.brigade.name', type: 'string', group: 'Zadanie', label: 'Brygada' },
  { expression: 'contract.number', type: 'string', group: 'Kontrakt', label: 'Numer kontraktu' },
  { expression: 'contract.status', type: 'string', group: 'Kontrakt', label: 'Status kontraktu' },
  { expression: 'contract.customer.name', type: 'string', group: 'Kontrakt', label: 'Klient' },
  { expression: 'user.name', type: 'string', group: 'Użytkownik', label: 'Imię i nazwisko przypisanej osoby' },
  { expression: 'user.email', type: 'string', group: 'Użytkownik', label: 'E-mail przypisanej osoby' },
  { expression: 'user.role', type: 'string', group: 'Użytkownik', label: 'Rola przypisanej osoby' },
];

export function getFormDataSource(expression: string): FormDataSource | undefined {
  return FORM_DATA_SOURCES.find(source => source.expression === expression);
}
