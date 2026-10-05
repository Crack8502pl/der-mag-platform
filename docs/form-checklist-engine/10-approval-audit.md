# Form & Checklist Engine — etap 10: Approval + Audit

## Audyt
Wszystkie operacje krytyczne zapisują się w istniejącej tabeli `audit_logs` przez `FormAuditService.record`
(w tej samej transakcji co zmiana). `details` (JSON) zawiera `targetType`, `targetId`, `changes[]`
(`field`, `previousValue`, `newValue`) i metadane; kto – `user_id`, kiedy – `created_at`.

| Operacja | event_type |
|---|---|
| publikacja wersji | `FORM_VERSION_PUBLISHED` |
| wykonanie (completion) | `FORM_INSTANCE_COMPLETED` |
| odpowiedź FAIL (PASS_FAIL) | `FORM_FAIL_RECORDED` (`failedFields`) |
| override | `FORM_OVERRIDE` |
| approval | `FORM_APPROVED` |
| rejection | `FORM_REJECTED` |

## Approval
`POST /api/forms/instances/:id/approve` (`{ comment?, override? }`) i `POST /api/forms/instances/:id/reject`
(`{ comment }`, wymagany) – uprawnienie `forms.approve`; tylko instancje `SUBMITTED`.
Decyzje trafiają do `form_approvals` (`stepKey`, `stepOrder`, `round`), co pozwala dodać kolejne kroki
(wielostopniowe zatwierdzanie) bez zmiany modelu; obecnie jeden krok `approval`.
Rejection bez komentarza → `REJECTION_COMMENT_REQUIRED` (400). Odrzucona instancja wraca do edycji,
a kolejna decyzja zwiększa `round`.

## Override
Approval z `override: true` wymaga komentarza (`OVERRIDE_COMMENT_REQUIRED`), zapisuje `metadata.override`
i dodatkowy wpis audytu `FORM_OVERRIDE`.

## Ryzyka
Błędna próba completion z FAIL jest blokowana i wycofuje transakcję, więc audytowany jest moment zapisu odpowiedzi FAIL.
