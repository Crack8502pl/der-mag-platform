# Security Dependency Updates

## PR 4.2 — 2026-05-31

### Goal
Aktualizacja zależności z lukami bezpieczeństwa (OWASP A06).

### Backend (`backend/package.json`)

| Pakiet | Przed | Po | CVE/Powód |
|--------|-------|-----|-----------|
| express | ^4.21.0 | ^4.22.2 | Aktualizacja do najnowszej linii 4.x (PATCH/MINOR), utrzymanie wsparcia security bez przejścia na major 5.x |
| helmet | ^7.1.0 | ^7.2.0 | Aktualizacja security-hardening middleware w obrębie major 7 |
| jsonwebtoken | ^9.0.2 | ^9.0.3 | Aktualizacja patch/minor w obrębie major 9 |
| pg | ^8.13.0 | ^8.21.0 | Aktualizacja node-postgres w obrębie major 8 (bugfix/security fixes) |
| cors | ^2.8.5 | ^2.8.6 | Aktualizacja patch |
| express-rate-limit | ^7.1.5 | ^7.5.1 | Aktualizacja minor w obrębie major 7 |
| typeorm | ^0.3.28 | ^0.3.30 | Aktualizacja patch/minor w obrębie linii 0.3.x |

### Frontend (`frontend/package.json`)

| Pakiet | Przed | Po | CVE/Powód |
|--------|-------|-----|-----------|
| axios | ^1.13.2 | ^1.16.1 | HIGH: pakiet podatny w zakresie 1.0.0-1.15.2 (m.in. GHSA-w9j2-pvgh-6h63, GHSA-pmwg-cvhr-8vh7); aktualizacja usuwa luki HIGH |
| react | ^19.2.0 | ^19.2.6 | Aktualizacja PATCH/MINOR w obrębie major 19 |
| react-dom | ^19.2.0 | ^19.2.6 | Aktualizacja PATCH/MINOR w obrębie major 19 |
| @vitejs/plugin-react | ^4.3.4 | ^4.7.0 | Aktualizacja w obrębie major 4 |
| vite | ^6.4.2 | ^6.4.2 | Zweryfikowano: brak HIGH/CRITICAL po audycie; pozostawiono w aktualnej linii 6.x |

### Nie zaktualizowane (wymagają osobnego PR)

- `backend`: `bcrypt` (5.x -> 6.x, MAJOR), `multer` (1.x -> 2.x, MAJOR + wymagane testy), `express` (4.x -> 5.x, MAJOR), `helmet` (7.x -> 8.x, MAJOR), `express-rate-limit` (7.x -> 8.x, MAJOR), `typeorm` (0.3.x -> 1.x, MAJOR), `typescript` (5.x -> 6.x, MAJOR)
- `frontend`: `vite` (6.x -> 7.x, MAJOR), `@vitejs/plugin-react` (4.x -> 5.x, MAJOR)

Dodatkowo wykryte paczki deprecated (nieobjęte automatyczną aktualizacją MAJOR w tym PR):
- `multer@1.x` (backend dependency)
- `supertest@6.x` (backend devDependency)

### Jak uruchomić audyt lokalnie

```bash
cd backend && npm audit
cd frontend && npm audit
```
