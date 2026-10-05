# Etap 9 — FormInstance + wykonanie

## Cykl życia
`DRAFT` → `IN_PROGRESS` (pierwszy zapis wartości) → `SUBMITTED` (completion) → `APPROVED` / `REJECTED` (etap 10; `REJECTED` jest ponownie edytowalny).

## Traceability
Instancja wiąże: `templateVersionId` (obowiązkowo, tylko wersja `PUBLISHED`), `contractId`, `taskId`, `subsystemTaskId`, `objectId`, `deviceId`, jeden element BOM (`bomItemId` albo `workflowBomItemId`), `assignedUserId`, `assignedTeamId`.
Gdy podano `taskId` i `contractId`, backend sprawdza, że zadanie należy do kontraktu (`INVALID_INSTANCE_CONTEXT`).

## Zasady
- Definicja pochodzi wyłącznie z zapisanej wersji (`templateVersionId`); payload frontendu zawiera tylko odpowiedzi.
- Publikacja nowej wersji nie zmienia istniejących instancji (wersje opublikowane są niemutowalne, FK `RESTRICT`).
- Zapis wartości aktualizuje tylko wartości danej instancji i jest wyłącznie przed zatwierdzeniem; każda zmiana trafia do audit logu (poprzednia/nowa wartość).
- Completion jest blokowane przez brakujące pola wymagane, odpowiedzi `FAIL` i reguły blokujące (`INVALID_RESPONSES`).
- PRECONFIGURATION ≠ ASSEMBLY: `DEVICE_PRECONFIGURATION` nie tworzy relacji `installedIn` (`assertRelationAllowed`); relacja powstaje dopiero w `FIELD_INSTALLATION`.
- Dostęp: RBAC i zakres rekordu sprawdzane przez `FormInstanceAccessGuard` po zablokowaniu wiersza.

## Ryzyka
Approval flow i rozszerzony audyt pozostają w etapie 10.
