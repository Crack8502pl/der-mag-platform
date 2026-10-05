# Etap 8 — Rules / Trigger integration

Warstwa reguł: `backend/src/services/FormRules.ts`. Reguły są deklaratywnymi danymi JSON w zapisanej wersji formularza (nigdy z payloadu draftu z frontendu). Backend jest jedynym źródłem prawdy; UI tylko odczytuje wynik.

## Obsługiwane reguły
| Reguła | Gdzie | Klucz |
|---|---|---|
| widoczność sekcji / pola | `conditions` sekcji i pola | `visibleWhen` |
| warunkowa wymagalność (OR ze statycznym `required`) | pole | `requiredWhen` |
| blokada completion (checklisty: `PASS_FAIL` = `FAIL` blokuje zawsze) | pole | `blockCompletionWhen` |
| reguły przypisania | `FormAssignmentRule.conditions` | `when` |

## Warunki
- Liść: `{ field, operator, value }`; operatory: `equals, notEquals, gt, gte, lt, lte, in, notIn, isEmpty, isNotEmpty`.
- Grupy: `{ all: [...] }`, `{ any: [...] }`, `{ not: {...} }` — max głębokość 3, max 20 elementów w grupie.
- Referencje `${form.<fieldKey>}` w `value` są parsowane istniejącym `VariableParser` (Variable Engine) i rozwiązywane z zapisanych odpowiedzi. Inne przestrzenie nazw, wyrażenia i tekst mieszany są odrzucane przy walidacji definicji.
- Brak `eval()`/`Function()`, brak własnego języka skryptowego.

## Przypisanie
`resolveAssignment(rules, responses)` wybiera pierwszą aktywną regułę wg `priority`, następnie `id`, której `when` pasuje (brak `when` = zawsze).

## PRECONFIGURATION ≠ ASSEMBLY
`assertRelationAllowed(procedureType, relationType)` odrzuca `installedIn` dla `DEVICE_PRECONFIGURATION`.

## Trigger / dependency rules
Reguły formularzy nie wywołują Trigger Engine i nie współdzielą jego stanu (unikamy sprzężenia); `FormTrigger` pozostaje osobnym mechanizmem, a `FormAssignmentRule.triggerId` wiąże tylko regułę z triggerem tej samej wersji.

## Ryzyka
- Błędna reguła `blockCompletionWhen` może zablokować completion — walidacja definicji przy publikacji ogranicza to do znanych pól.
- Brak duplikowania logiki: frontend (`formSchema.ts`) powinien tylko odzwierciedlać wynik backendu; nowe operatory/grupy wymagają aktualizacji obu stron.
- Zmiana formatu `assignment rule` (`when`) — wcześniejsze klucze `visibleWhen` itp. w regułach przypisania nie są już dozwolone.
