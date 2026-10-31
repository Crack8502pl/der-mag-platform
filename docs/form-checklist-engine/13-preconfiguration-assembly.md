# Preconfiguration ≠ assembly — etap 13

Workflow odrębnie zapisuje gotowość urządzenia po zatwierdzeniu formularza `DEVICE_PRECONFIGURATION`, jego fizyczny montaż oraz kontrolę po montażu. `CABINET_PREFABRICATION` i `DEVICE_PRECONFIGURATION` nie tworzą relacji urządzenia z obiektem; przypisanie jest dozwolone dopiero przez zatwierdzony `FIELD_INSTALLATION`.

## Cykl życia

1. `READY_FOR_FIELD_INSTALLATION`: zatwierdzony formularz prekonfiguracji musi wskazywać urządzenie, które nie jest już zamontowane ani wycofane z eksploatacji.
2. `INSTALLED`: zatwierdzony formularz `FIELD_INSTALLATION` musi wskazywać to samo urządzenie, zadanie montażowe i docelowy obiekt. Dopiero wtedy urządzenie otrzymuje `installedAssetId`, status `installed` i datę montażu.
3. `VERIFIED`: wymagany jest osobny, zatwierdzony formularz `FIELD_INSTALLATION` dla tego samego urządzenia, zadania i obiektu.
4. `COMMISSIONED`: dopuszczalne po weryfikacji; przed zmianą system ponownie potwierdza powiązanie urządzenia z obiektem.

Każda zmiana stanu jest transakcyjna, blokuje aktualizowany workflow/urządzenie i zapisuje zdarzenie w `audit_logs`. Unikalne indeksy uniemożliwiają równoległy aktywny workflow dla urządzenia oraz ponowne użycie formularza prekonfiguracji, montażu lub weryfikacji. Workflow i formularze dowodowe są dostępne tylko wtedy, gdy użytkownik ma dostęp do powiązanych instancji formularzy zgodnie z regułami scope Form API.

## API

- `POST /api/forms/installation-workflows/readiness` — `{ "preconfigurationInstanceId": 123 }`
- `GET /api/forms/installation-workflows/:id`
- `POST /api/forms/installation-workflows/:id/field-installation` — `{ "taskId": 456, "installationInstanceId": 789 }`
- `POST /api/forms/installation-workflows/:id/verification` — `{ "verificationInstanceId": 790 }`
- `POST /api/forms/installation-workflows/:id/commission` — `{}`

Endpointy zapisu wymagają `forms.complete`; odczyt wymaga `forms.read`. Kontrole uprawnień obejmują instancję prekonfiguracji i odpowiednie formularze montażowe/weryfikacyjne, nie tylko samą rolę modułu.

## Migracja i zakres

Tabela `device_installation_workflows` jest tworzona przez datowaną migrację `20261031_create_device_installation_workflows.ts`. Ręczny endpoint `POST /api/assets/:id/devices` odrzuca próbę powiązania HTTP 409, a tworzenie obiektu z numerami seryjnymi zwraca ostrzeżenie zamiast ustawiać `installedAssetId`. Tworzenie obiektu może zachować BOM, a urządzenia do niego przypisuje się dopiero po dowodzie montażu terenowego.
