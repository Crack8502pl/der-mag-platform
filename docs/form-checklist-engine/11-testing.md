# Form & Checklist Engine — etap 11: testy

## Zakres regresji

Testy backendowe w `backend/tests/unit/services/FormEngineServices.test.ts` pokrywają cykl życia szablonu i wersji, walidację pól i odpowiedzi, conditional visibility/required, blokowanie ukończenia dla `FAIL`, zatwierdzanie i odrzucanie oraz audyt. `backend/tests/integration/forms-api.test.ts` weryfikuje kontrakty HTTP, uwierzytelnianie, RBAC, walidację DTO i zakres dostępu do instancji.

Kluczowy test wersjonowania tworzy instancję na opublikowanej V1, zapisuje odpowiedź, publikuje V2 ze zmienionym typem tego samego pola, a następnie ponownie zapisuje i waliduje instancję. Odpowiedź tekstowa pozostaje prawidłowa, ponieważ usługi pobierają definicję po `instance.templateVersionId`, a nie po najnowszej wersji szablonu.

Frontendowe testy `DynamicFormRenderer`, registry i schematu w `frontend/src/components/forms/` sprawdzają renderowanie konkretnego ID wersji, reguły widoczności i wymagania, walidację odpowiedzi, stany błędów oraz zachowanie odpowiedzi ukrytych pól. Testy API/formularzy nie zastępują kontroli uprawnień wykonywanej przez backend.

## Uruchamianie

Z katalogu repozytorium:

```bash
cd backend
npm test -- --runTestsByPath tests/unit/services/FormEngineServices.test.ts tests/unit/services/FormAssignmentRules.test.ts tests/unit/services/FormInstanceAssignments.test.ts tests/integration/forms-api.test.ts tests/integration/form-engine-migration.test.ts --runInBand
npm run typecheck

cd ../frontend
npx vitest run src/components/forms src/components/admin/FormBuilderPage.test.tsx
```

W razie zmiany logiki formularzy należy uruchamiać odpowiednie testy jednostkowe i integracyjne wraz z frontendowym rendererem; nie ograniczać walidacji do samego builda.
`form-engine-migration.test.ts` wymaga `FORM_ENGINE_TEST_DATABASE_URL`; bez tej zmiennej suite migracji jest pomijany.
