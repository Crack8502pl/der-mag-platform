import {
  conditionFieldKeys,
  validateWorkflowVersion,
  type ValidationStep,
  type ValidationTransition,
  type WorkflowValidationLookups,
} from '../../../../src/modules/workflow/validation/validateWorkflowVersion';
import type { WorkflowIssue } from '../../../../src/modules/workflow/contracts';

const lookups = (): WorkflowValidationLookups => ({
  forms: new Map([
    [10, { name: 'Protokół weryfikacji', publishedFieldKeys: new Set(['obraz', 'uwagi']) }],
    [11, { name: 'Szkic odbioru', publishedFieldKeys: null }],
  ]),
  roles: new Map([[2, { name: 'manager' }]]),
  functionGroups: new Map([
    ['PROCESS_BUILDERS', { name: 'Budowniczowie procesów', active: true }],
    ['PROCESS_AUDITORS', { name: 'Audytorzy procesów', active: true }],
    ['TECHNICAL_REVIEW', { name: 'Dział techniczny', active: true }],
    ['STARA_FUNKCJA', { name: 'Stara funkcja', active: false }],
  ]),
  brigades: new Map([
    [5, { name: 'Brygada A', active: true }],
    [6, { name: 'Brygada rozwiązana', active: false }],
  ]),
  users: new Map([
    [7, { name: 'Jan Kowalski', active: true }],
    [8, { name: 'Anna Nowak', active: false }],
  ]),
});

const step = (key: string, name: string, extra: Partial<ValidationStep> = {}): ValidationStep => ({
  key,
  name,
  assigneeType: 'SUBJECT_ASSIGNEE',
  assigneeRef: null,
  formTemplateId: null,
  ...extra,
});

/** Proces 3-etapowy z regułą powrotu: weryfikacja „NIE_OK” wraca do montażu. */
const validSteps = (): ValidationStep[] => [
  step('montaz', 'Montaż', { assigneeType: 'BRIGADE', assigneeRef: '5' }),
  step('weryfikacja', 'Weryfikacja', { assigneeType: 'FUNCTION_GROUP', assigneeRef: 'PROCESS_BUILDERS', formTemplateId: 10 }),
  step('odbior', 'Odbiór', { assigneeType: 'ROLE', assigneeRef: '2' }),
];
const returnRule = (): ValidationTransition => ({
  fromStepKey: 'weryfikacja',
  toStepKey: 'montaz',
  condition: { field: 'obraz', operator: 'equals', value: 'NIE_OK' },
  priority: 1,
});
const reviewConfig = () => ({
  purpose: { functionKey: 'PROCESS_AUDITORS', minApprovals: 1 },
  technical: { functionKey: 'TECHNICAL_REVIEW', minApprovals: 2 },
});

function validate(overrides: Partial<{ steps: ValidationStep[]; transitions: ValidationTransition[]; reviewConfig: unknown }> = {}): WorkflowIssue[] {
  return validateWorkflowVersion({
    steps: overrides.steps ?? validSteps(),
    transitions: overrides.transitions ?? [returnRule()],
    reviewConfig: 'reviewConfig' in overrides ? overrides.reviewConfig : reviewConfig(),
    lookups: lookups(),
  });
}

const codes = (issues: WorkflowIssue[]) => issues.map(issue => issue.code);

describe('validateWorkflowVersion – walidacja przed publikacją (W3a pkt 9)', () => {
  it('poprawny proces 3-etapowy z regułą powrotu nie ma problemów', () => {
    expect(validate()).toEqual([]);
  });

  it('wymaga co najmniej jednego etapu', () => {
    const issues = validate({ steps: [], transitions: [] });
    expect(codes(issues)).toEqual(['NO_STEPS']);
    expect(issues[0].message).toBe('Proces musi mieć co najmniej jeden etap.');
  });

  it('wymaga unikalnych kluczy etapów', () => {
    const steps = [...validSteps(), step('montaz', 'Montaż poprawkowy')];
    const issues = validate({ steps });
    expect(codes(issues)).toEqual(['DUPLICATE_STEP_KEY']);
    expect(issues[0]).toMatchObject({ stepKey: 'montaz', stepIndex: 3 });
    expect(issues[0].message).toBe('Etapy „Montaż”, „Montaż poprawkowy” mają ten sam identyfikator „montaz” – każdy etap musi mieć własny.');
  });

  it('przejścia muszą wskazywać istniejące etapy (skąd i dokąd)', () => {
    const transitions = [
      returnRule(),
      { fromStepKey: 'nie_ma', toStepKey: 'odbior', condition: null, priority: 2 },
      { fromStepKey: 'montaz', toStepKey: 'zniknal', condition: null, priority: 3 },
    ];
    const issues = validate({ transitions });
    expect(codes(issues)).toEqual(['TRANSITION_UNKNOWN_STEP', 'TRANSITION_UNKNOWN_STEP']);
    expect(issues[0]).toMatchObject({ transitionIndex: 1, field: 'fromStepKey' });
    expect(issues[0].message).toBe('Reguła przejścia nr 2 zaczyna się w etapie „nie_ma”, którego nie ma w procesie.');
    expect(issues[1]).toMatchObject({ transitionIndex: 2, field: 'toStepKey' });
    expect(issues[1].message).toBe('Reguła przejścia nr 3 prowadzi do etapu „zniknal”, którego nie ma w procesie.');
  });

  it('każdy etap musi być osiągalny od pierwszego', () => {
    // Montaż bezwarunkowo przeskakuje do odbioru – do weryfikacji nie prowadzi żadna droga.
    const transitions = [{ fromStepKey: 'montaz', toStepKey: 'odbior', condition: null, priority: 1 }, returnRule()];
    const issues = validate({ transitions });
    expect(codes(issues)).toEqual(['STEP_UNREACHABLE']);
    expect(issues[0]).toMatchObject({ stepKey: 'weryfikacja', stepIndex: 1 });
    expect(issues[0].message).toBe('Etap „Weryfikacja” jest nieosiągalny – nie prowadzi do niego żadna droga od pierwszego etapu „Montaż”.');
  });

  it('z każdego etapu musi istnieć droga do końca procesu', () => {
    // Weryfikacja zawsze wraca do montażu, a montaż zawsze idzie do weryfikacji – pętla bez wyjścia.
    const transitions = [{ fromStepKey: 'weryfikacja', toStepKey: 'montaz', condition: null, priority: 1 }];
    const issues = validate({ transitions });
    expect(codes(issues)).toEqual(['NO_PATH_TO_END', 'NO_PATH_TO_END', 'STEP_UNREACHABLE']);
    expect(issues.filter(issue => issue.code === 'NO_PATH_TO_END').map(issue => issue.stepKey)).toEqual(['montaz', 'weryfikacja']);
    expect(issues[0].message).toBe('Z etapu „Montaż” nie da się dojść do końca procesu – reguły przejść tworzą pętlę bez wyjścia.');
    expect(issues[2]).toMatchObject({ stepKey: 'odbior' });
  });

  it('reguła warunkowa nie zamyka drogi – bez reguły bezwarunkowej etap przechodzi do następnego', () => {
    const transitions = [
      returnRule(),
      { fromStepKey: 'weryfikacja', toStepKey: 'odbior', condition: { field: 'obraz', operator: 'equals', value: 'OK' }, priority: 2 },
    ];
    expect(validate({ transitions })).toEqual([]);
  });

  it('warunek przejścia musi dotyczyć pól formularza etapu źródłowego', () => {
    const transitions = [
      { ...returnRule(), condition: { all: [{ field: 'obraz', operator: 'equals', value: 'NIE_OK' }, { field: 'temperatura', operator: 'gt', value: 30 }] } },
      { fromStepKey: 'montaz', toStepKey: 'weryfikacja', condition: { field: 'obraz', operator: 'equals', value: 'OK' }, priority: 1 },
    ];
    const issues = validate({ transitions });
    expect(codes(issues)).toEqual(['CONDITION_UNKNOWN_FIELD', 'CONDITION_WITHOUT_FORM']);
    expect(issues[0]).toMatchObject({ transitionIndex: 0, stepKey: 'weryfikacja', field: 'condition' });
    expect(issues[0].message).toBe(
      'Warunek reguły przejścia z „Weryfikacja” do „Montaż” odnosi się do pola „temperatura”, którego nie ma w formularzu „Protokół weryfikacji” etapu „Weryfikacja”.',
    );
    expect(issues[1]).toMatchObject({ transitionIndex: 1, stepKey: 'montaz' });
    expect(issues[1].message).toContain('wymaga formularza w etapie „Montaż”');
  });

  it('pole wskazane odwołaniem ${form.klucz} w wartości też musi istnieć w formularzu', () => {
    const transitions = [{ ...returnRule(), condition: { field: 'obraz', operator: 'notEquals', value: '${ form.wzorzec }' } }];
    const issues = validate({ transitions });
    expect(codes(issues)).toEqual(['CONDITION_UNKNOWN_FIELD']);
    expect(issues[0].message).toContain('do pola „wzorzec”');
  });

  it('warunek w złym formacie (np. nieznany operator) jest odrzucany po polsku', () => {
    const transitions = [{ ...returnRule(), condition: { field: 'obraz', operator: 'zawiera', value: 'X' } }];
    const issues = validate({ transitions });
    expect(codes(issues)).toEqual(['CONDITION_INVALID']);
    expect(issues[0].message).toBe('Warunek reguły przejścia z „Weryfikacja” do „Montaż” jest niepoprawny – ustaw go ponownie w edytorze warunków.');
  });

  it('formularz etapu musi istnieć i mieć opublikowaną wersję', () => {
    const steps = validSteps();
    steps[0].formTemplateId = 99;
    steps[2].formTemplateId = 11;
    const issues = validate({ steps });
    expect(codes(issues)).toEqual(['FORM_NOT_FOUND', 'FORM_NOT_PUBLISHED']);
    expect(issues[0]).toMatchObject({ stepKey: 'montaz', field: 'formTemplateId', message: 'Etap „Montaż”: wybrany formularz nie istnieje.' });
    expect(issues[1].message).toBe('Etap „Odbiór”: formularz „Szkic odbioru” nie ma opublikowanej wersji – opublikuj go w edytorze formularzy.');
  });

  it('wykonawca etapu musi istnieć', () => {
    const steps = [
      step('a', 'Rola', { assigneeType: 'ROLE', assigneeRef: '404' }),
      step('b', 'Funkcja', { assigneeType: 'FUNCTION_GROUP', assigneeRef: 'NIE_MA' }),
      step('c', 'Brygada', { assigneeType: 'BRIGADE', assigneeRef: '404' }),
      step('d', 'Osoba', { assigneeType: 'USER', assigneeRef: 'abc' }),
      step('e', 'Bez wykonawcy', { assigneeType: null }),
      step('f', 'Bez wskazania', { assigneeType: 'USER', assigneeRef: null }),
    ];
    const issues = validate({ steps, transitions: [] });
    expect(codes(issues)).toEqual([
      'ASSIGNEE_NOT_FOUND', 'ASSIGNEE_NOT_FOUND', 'ASSIGNEE_NOT_FOUND', 'ASSIGNEE_NOT_FOUND', 'ASSIGNEE_MISSING', 'ASSIGNEE_MISSING',
    ]);
    expect(issues.map(issue => issue.message)).toEqual([
      'Etap „Rola”: wybrana rola nie istnieje.',
      'Etap „Funkcja”: wybrana funkcja nie istnieje.',
      'Etap „Brygada”: wybrana brygada nie istnieje.',
      'Etap „Osoba”: wybrana osoba nie istnieje.',
      'Etap „Bez wykonawcy”: wybierz, kto wykonuje etap.',
      'Etap „Bez wskazania”: wybierz osobę, która wykonuje etap.',
    ]);
  });

  it('wykonawca etapu musi być aktywny', () => {
    const steps = [
      step('a', 'Funkcja', { assigneeType: 'FUNCTION_GROUP', assigneeRef: 'STARA_FUNKCJA' }),
      step('b', 'Brygada', { assigneeType: 'BRIGADE', assigneeRef: '6' }),
      step('c', 'Osoba', { assigneeType: 'USER', assigneeRef: '8' }),
      step('d', 'Osoba aktywna', { assigneeType: 'USER', assigneeRef: '7' }),
    ];
    const issues = validate({ steps, transitions: [] });
    expect(codes(issues)).toEqual(['ASSIGNEE_INACTIVE', 'ASSIGNEE_INACTIVE', 'ASSIGNEE_INACTIVE']);
    expect(issues.map(issue => issue.message)).toEqual([
      'Etap „Funkcja”: funkcja „Stara funkcja” jest nieaktywna.',
      'Etap „Brygada”: brygada „Brygada rozwiązana” jest nieaktywna.',
      'Etap „Osoba”: osoba „Anna Nowak” ma nieaktywne konto.',
    ]);
  });

  it('ustawienia przeglądu: minApprovals >= 1 (0 odrzucone)', () => {
    const config = reviewConfig();
    config.purpose.minApprovals = 0;
    const issues = validate({ reviewConfig: config });
    expect(codes(issues)).toEqual(['REVIEW_MIN_APPROVALS']);
    expect(issues[0]).toMatchObject({ area: 'REVIEW', stage: 'purpose', field: 'minApprovals' });
    expect(issues[0].message).toBe('Audyt celowości: minimalna liczba akceptacji musi wynosić co najmniej 1.');
  });

  it('ustawienia przeglądu: funkcja zatwierdzająca musi istnieć (i być aktywna)', () => {
    const issues = validate({
      reviewConfig: {
        purpose: { functionKey: 'NIE_MA', minApprovals: 1 },
        technical: { functionKey: 'STARA_FUNKCJA', minApprovals: 1 },
      },
    });
    expect(codes(issues)).toEqual(['REVIEW_FUNCTION_NOT_FOUND', 'REVIEW_FUNCTION_INACTIVE']);
    expect(issues[0].message).toBe('Audyt celowości: funkcja „NIE_MA” nie istnieje.');
    expect(issues[1].message).toBe('Przegląd techniczny: funkcja „Stara funkcja” jest nieaktywna.');
  });

  it('zła definicja zwraca wszystkie problemy naraz', () => {
    const steps = [
      step('a', 'Pierwszy', { assigneeType: 'ROLE', assigneeRef: '404', formTemplateId: 11 }),
      step('a', 'Drugi'),
      step('c', 'Trzeci'),
    ];
    const transitions = [
      { fromStepKey: 'a', toStepKey: 'x', condition: null, priority: 1 },
      { fromStepKey: 'c', toStepKey: 'a', condition: null, priority: 1 },
      { fromStepKey: 'a', toStepKey: 'a', condition: null, priority: 2 },
    ];
    const issues = validate({ steps, transitions, reviewConfig: { purpose: { functionKey: '', minApprovals: 0 } } });
    expect(new Set(codes(issues))).toEqual(new Set([
      'DUPLICATE_STEP_KEY', 'FORM_NOT_PUBLISHED', 'ASSIGNEE_NOT_FOUND', 'TRANSITION_UNKNOWN_STEP', 'STEP_UNREACHABLE',
      'NO_PATH_TO_END', 'REVIEW_MIN_APPROVALS', 'REVIEW_FUNCTION_NOT_FOUND',
    ]));
    expect(issues.length).toBeGreaterThanOrEqual(10);
    issues.forEach(issue => expect(issue.message).not.toMatch(/Invalid|condition|undefined|null/));
  });
});

describe('conditionFieldKeys', () => {
  it('zbiera pola z grup all/any/not i z odwołań ${form.klucz}', () => {
    const keys = conditionFieldKeys({
      any: [
        { field: 'a', operator: 'equals', value: 1 },
        { not: { field: 'b', operator: 'isEmpty' } },
        { all: [{ field: 'c', operator: 'equals', value: '${form.d}' }] },
      ],
    });
    expect([...keys].sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});
