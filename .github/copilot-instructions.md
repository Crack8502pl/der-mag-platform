# Zasady dla Copilota w der-mag-platform

- Interfejs, komunikaty i dokumentacja po polsku; nazwy w kodzie po angielsku.
- Nie zmieniaj niczego poza zakresem zgłoszenia. Bez refaktoryzacji "przy okazji".
- Zmiany schematu bazy tylko przez nową migrację TypeORM w backend/src/migrations,
  dopisaną do listy w backend/src/config/database.ts. Nigdy synchronize.
- Każda zmiana zachowania = test (backend: jest w backend/tests, frontend: vitest).
- Przed zakończeniem uruchom i napraw:
  - backend: npm run typecheck && npm test
  - frontend: npm run build && npm test && npm run lint
- Formularze mają być obsługiwane przez osobę bez wiedzy programistycznej:
  żadnego wpisywania JSON, nazw tabel ani wyrażeń w interfejsie.
- W opisie PR: co zmieniono, jak to sprawdzić ręcznie, zrzut ekranu dla zmian w UI.

## Etap 2

- Nowe moduły twórz w `backend/src/modules/<nazwa>/`, stosując wzór z `backend/src/modules/variable-engine/`.
- Wszystkie nowe kolumny dat zapisuj jako `timestamp with time zone`.
- Od W1 decyzje o uprawnieniach opieraj wyłącznie na `EffectivePermissionsService`.
- Od W2a zdarzenia domenowe obsługuj wyłącznie przez `DomainEventBus`.
- Reguł przeglądu i dziennika audytowego nie wolno omijać żadną ścieżką, także dla roli admin.
- Każda nowa funkcja dopisuje punkt do `docs/etap-2/REGRESJA.md` i test do `backend/tests/regression` (od W0b).
- Testy nie korzystają z internetu.
