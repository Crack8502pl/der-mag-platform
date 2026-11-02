import { describe, expect, it } from 'vitest';
import type { AutomationActionDefinition } from '../../types/automation.types';
import {
  buildSavedParams,
  chainSignature,
  formatRunDate,
  groupActionsByCategory,
  groupDataSources,
  humanizeVariables,
  isParamRequired,
  isParamVisible,
  lookupKey,
  matchActions,
  missingParamLabels,
  moveStep,
  normalizeText,
  readAutomationError,
  stripStepPrefix,
  summarizeParams,
  toChainSteps,
  toDataSources,
  toEditableSteps,
} from './automationHelpers';

const pdf: AutomationActionDefinition = {
  key: 'generate_form_pdf',
  label: 'Zapisz PDF formularza w dokumentach zadania',
  description: 'Generuje PDF formularza i zapisuje go jako dokument zadania.',
  category: 'Dokumenty',
  params: [{ key: 'name', label: 'Nazwa dokumentu', type: 'text', required: false }],
};

const email: AutomationActionDefinition = {
  key: 'send_email',
  label: 'Wyślij e-mail',
  description: 'Wysyła wiadomość do osoby, roli, funkcji lub osoby przypisanej do zadania.',
  category: 'Powiadomienia',
  params: [
    {
      key: 'recipientType',
      label: 'Do kogo',
      type: 'select',
      required: true,
      options: [
        { value: 'user', label: 'Wybrana osoba' },
        { value: 'role', label: 'Wszyscy z wybraną rolą' },
        { value: 'assignee', label: 'Osoba przypisana do zadania' },
      ],
    },
    { key: 'user', label: 'Osoba', type: 'user', required: false, showWhen: { param: 'recipientType', equals: 'user' } },
    { key: 'role', label: 'Rola', type: 'role', required: false, showWhen: { param: 'recipientType', equals: 'role' } },
    { key: 'subject', label: 'Temat', type: 'text', required: true },
    { key: 'body', label: 'Treść', type: 'longText', required: true },
  ],
};

const notify: AutomationActionDefinition = {
  key: 'notify_slack',
  label: 'Powiadom zespół',
  description: 'Wysyła krótką wiadomość do zespołu.',
  category: 'Powiadomienia',
  params: [
    { key: 'urgent', label: 'Pilne', type: 'boolean', required: true },
    { key: 'count', label: 'Liczba', type: 'number', required: false },
  ],
};

const catalog = [pdf, email, notify];
const byKey = new Map(catalog.map(action => [action.key, action]));

describe('automationHelpers', () => {
  describe('wyszukiwanie klocków', () => {
    it('normalizuje polskie znaki, wielkość liter i myślniki', () => {
      expect(normalizeText('  Wyślij E-MAIL ')).toBe('wyslij email');
      expect(normalizeText('Łódź')).toBe('lodz');
    });

    it('znajduje „Wyślij e-mail” po fragmencie „mail” i po polskich znakach', () => {
      expect(matchActions(catalog, 'mail').map(action => action.key)).toEqual(['send_email']);
      expect(matchActions(catalog, 'wyslij mail').map(action => action.key)).toEqual(['send_email']);
      expect(matchActions(catalog, 'WYŚLIJ').map(action => action.key)).toEqual(['send_email']);
    });

    it('szuka też w opisie i kategorii, a trafienia w nazwie są pierwsze', () => {
      expect(matchActions(catalog, 'zadania').map(action => action.key)).toEqual(['generate_form_pdf', 'send_email']);
      expect(matchActions(catalog, 'powiadomienia').map(action => action.key)).toEqual(['send_email', 'notify_slack']);
      expect(matchActions(catalog, 'zespol').map(action => action.key)).toEqual(['notify_slack']);
    });

    it('nie zwraca niczego dla pustego lub niepasującego tekstu', () => {
      expect(matchActions(catalog, '')).toEqual([]);
      expect(matchActions(catalog, '   ')).toEqual([]);
      expect(matchActions(catalog, 'xyz')).toEqual([]);
    });

    it('grupuje klocki według kategorii w kolejności katalogu', () => {
      expect(groupActionsByCategory(catalog)).toEqual([
        { category: 'Dokumenty', actions: [pdf] },
        { category: 'Powiadomienia', actions: [email, notify] },
      ]);
      expect(groupActionsByCategory([{ ...pdf, category: '' }])[0].category).toBe('Inne');
    });
  });

  describe('ustawienia kroku', () => {
    it('pokazuje pola zależne tylko po wybraniu odpowiedniej wartości', () => {
      const user = email.params[1];
      expect(isParamVisible(user, {})).toBe(false);
      expect(isParamVisible(user, { recipientType: 'role' })).toBe(false);
      expect(isParamVisible(user, { recipientType: 'user' })).toBe(true);
      expect(isParamVisible(email.params[0], {})).toBe(true);
    });

    it('uznaje widoczne pole zależne za wymagane', () => {
      expect(isParamRequired(email.params[1])).toBe(true);
      expect(isParamRequired(pdf.params[0])).toBe(false);
      expect(isParamRequired(email.params[3])).toBe(true);
    });

    it('wylicza brakujące wymagane ustawienia po polsku', () => {
      expect(missingParamLabels(email, {})).toEqual(['Do kogo', 'Temat', 'Treść']);
      expect(missingParamLabels(email, { recipientType: 'user', subject: ' ', body: 'Treść' })).toEqual(['Osoba', 'Temat']);
      expect(missingParamLabels(email, { recipientType: 'assignee', subject: 'Temat', body: 'Treść' })).toEqual([]);
      expect(missingParamLabels(pdf, {})).toEqual([]);
    });

    it('nie traktuje przełącznika tak/nie jako brakującego', () => {
      expect(missingParamLabels(notify, {})).toEqual([]);
    });

    it('wysyła tylko widoczne i niepuste ustawienia', () => {
      expect(buildSavedParams(email, {
        recipientType: 'role',
        user: 7,
        role: 3,
        subject: 'Temat',
        body: '',
      })).toEqual({ recipientType: 'role', role: 3, subject: 'Temat' });
    });

    it('zapisuje wymagany przełącznik jako nie, gdy nie został ruszony', () => {
      expect(buildSavedParams(notify, {})).toEqual({ urgent: false });
      expect(buildSavedParams(notify, { urgent: true, count: 0 })).toEqual({ urgent: true, count: 0 });
    });

    it('przekazuje kroki nieznanych klocków bez zmian', () => {
      const steps = toEditableSteps([
        { action: 'generate_form_pdf', params: { name: 'Raport' } },
        { action: 'removed_action', params: { x: 'y' } },
      ]);
      expect(new Set(steps.map(step => step.id)).size).toBe(2);
      expect(toChainSteps(steps, byKey)).toEqual([
        { action: 'generate_form_pdf', params: { name: 'Raport' } },
        { action: 'removed_action', params: { x: 'y' } },
      ]);
    });

    it('wykrywa zmiany łańcucha niezależnie od kolejności kluczy i ukrytych pól', () => {
      const base = chainSignature([{ action: 'send_email', params: { recipientType: 'assignee', subject: 'A', body: 'B' } }], 'STOP', byKey);
      expect(chainSignature([{ action: 'send_email', params: { body: 'B', subject: 'A', recipientType: 'assignee', user: 4 } }], 'STOP', byKey)).toBe(base);
      expect(chainSignature([{ action: 'send_email', params: { recipientType: 'assignee', subject: 'A', body: 'C' } }], 'STOP', byKey)).not.toBe(base);
      expect(chainSignature([{ action: 'send_email', params: { recipientType: 'assignee', subject: 'A', body: 'B' } }], 'CONTINUE', byKey)).not.toBe(base);
      expect(chainSignature([], 'STOP', byKey)).not.toBe(base);
    });
  });

  describe('podsumowanie kafelka', () => {
    const context = {
      lookupLabels: { [lookupKey('user', 7)]: 'Jan Kowalski' },
      sources: [{ expression: 'task.number', label: 'Numer zadania', group: 'Zadanie' }],
    };

    it('pokazuje czytelne nazwy zamiast kluczy i pomija długie treści', () => {
      expect(summarizeParams(email, {
        recipientType: 'user', user: 7, subject: 'Zadanie {task.number}', body: 'Bardzo długa treść',
      }, context)).toBe('Do kogo: Wybrana osoba · Osoba: Jan Kowalski · Temat: Zadanie [Numer zadania]');
    });

    it('pokazuje wielokropek, dopóki nazwa pozycji z listy nie zostanie wczytana', () => {
      expect(summarizeParams(email, { recipientType: 'role', role: 3 }, context)).toBe('Do kogo: Wszyscy z wybraną rolą · Rola: …');
    });

    it('skraca bardzo długie teksty i pokazuje przełączniki jako tak/nie', () => {
      const long = summarizeParams(pdf, { name: 'x'.repeat(200) }, context);
      expect(long.length).toBeLessThan(110);
      expect(long.endsWith('…')).toBe(true);
      expect(summarizeParams(notify, { urgent: true }, context)).toBe('Pilne: tak');
      expect(summarizeParams(notify, { urgent: false }, context)).toBe('Pilne: nie');
    });

    it('zamienia znane zmienne na nazwy, a nieznane zostawia bez zmian', () => {
      expect(humanizeVariables('Nr {task.number} / {unknown.value}', context.sources)).toBe('Nr [Numer zadania] / {unknown.value}');
    });
  });

  describe('dane z systemu', () => {
    const variables = [
      { expression: 'task.number', description: 'Numer zadania', label: 'Numer', group: 'Zadanie', usableInForms: true },
      { expression: 'task.title', description: 'Tytuł zadania', usableInForms: true },
      { expression: 'bom.total', description: 'Suma BOM', group: 'BOM', usableInForms: false },
      { expression: 'contract.name', description: '', group: 'Kontrakt', usableInForms: true },
    ];

    it('zostawia tylko dane dostępne w formularzach i nadaje im czytelne nazwy', () => {
      expect(toDataSources(variables)).toEqual([
        { expression: 'task.number', label: 'Numer', group: 'Zadanie' },
        { expression: 'task.title', label: 'Tytuł zadania', group: 'Inne' },
        { expression: 'contract.name', label: 'contract.name', group: 'Kontrakt' },
      ]);
    });

    it('grupuje dane według grup w kolejności występowania', () => {
      expect(groupDataSources(toDataSources(variables)).map(group => [group.group, group.items.length])).toEqual([
        ['Zadanie', 1], ['Inne', 1], ['Kontrakt', 1],
      ]);
    });
  });

  describe('błędy API', () => {
    it('usuwa przedrostek „Krok N (Nazwa):” i zaczyna komunikat wielką literą', () => {
      expect(stripStepPrefix('Krok 2 (Wyślij e-mail): temat jest wymagany')).toBe('Temat jest wymagany');
      expect(stripStepPrefix('Krok 1: wybierz osobę')).toBe('Wybierz osobę');
      expect(stripStepPrefix('Zbyt wiele kroków')).toBe('Zbyt wiele kroków');
    });

    it('przypisuje komunikaty do kroków, których dotyczą', () => {
      const error = {
        response: {
          data: {
            code: 'VALIDATION_FAILED',
            message: 'Łańcuch zawiera błędy',
            details: [
              { stepIndex: 1, message: 'Krok 2 (Wyślij e-mail): temat jest wymagany' },
              { stepIndex: 0, message: 'Krok 1 (Zapisz PDF): nazwa jest za długa' },
            ],
          },
        },
      };
      expect(readAutomationError(error, 'Błąd')).toEqual({
        message: '',
        steps: [
          { stepIndex: 1, message: 'Temat jest wymagany' },
          { stepIndex: 0, message: 'Nazwa jest za długa' },
        ],
      });
    });

    it('obsługuje szczegóły podane jako pojedynczy obiekt i bez własnego komunikatu', () => {
      const error = {
        response: { data: { message: 'Brak uprawnień do tego kroku', details: { stepIndex: 2, required: { module: 'x' } } } },
      };
      expect(readAutomationError(error, 'Błąd')).toEqual({
        message: '',
        steps: [{ stepIndex: 2, message: 'Brak uprawnień do tego kroku' }],
      });
    });

    it('zwraca ogólny komunikat, gdy błąd nie dotyczy konkretnego kroku', () => {
      expect(readAutomationError({ response: { data: { message: 'Za dużo kroków' } } }, 'Błąd'))
        .toEqual({ message: 'Za dużo kroków', steps: [] });
      expect(readAutomationError({ response: { data: { details: [{ message: 'bez numeru' }] } } }, 'Błąd'))
        .toEqual({ message: 'Błąd', steps: [] });
      expect(readAutomationError(new Error('Network Error'), 'Nie udało się zapisać.'))
        .toEqual({ message: 'Nie udało się zapisać.', steps: [] });
    });
  });

  describe('pozostałe', () => {
    it('zmienia kolejność kroków bez modyfikowania oryginału', () => {
      const items = ['a', 'b', 'c'];
      expect(moveStep(items, 0, 2)).toEqual(['b', 'c', 'a']);
      expect(moveStep(items, 2, 0)).toEqual(['c', 'a', 'b']);
      expect(items).toEqual(['a', 'b', 'c']);
    });

    it('formatuje datę uruchomienia po polsku i toleruje brak daty', () => {
      expect(formatRunDate(null)).toBe('—');
      expect(formatRunDate('nie-data')).toBe('—');
      expect(formatRunDate('2026-10-02T08:15:00.000Z')).not.toBe('—');
    });
  });
});
