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
