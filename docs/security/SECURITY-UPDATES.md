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

## PR — 2026-08-08

### Goal
Usunięcie wszystkich pozostałych podatności `npm audit` (backend + frontend), w tym CRITICAL `tar`, HIGH `react-router`/`react-router-dom` oraz kilku HIGH/MODERATE/LOW pakietów.

### Backend (`backend/package.json`)

| Pakiet / Override | Przed | Po | CVE/GHSA |
|-------------------|-------|-----|----------|
| overrides `tar` | `^7.5.3` | `^7.5.21` | CRITICAL: GHSA-vmf3-w455-68vh, GHSA-w8wr-v893-vjvp, GHSA-23hp-3jrh-7fpw, GHSA-8x88-c5mf-7j5w, GHSA-gvwx-54wh-qm9j, GHSA-r292-9mhp-454m |
| overrides `brace-expansion` | `^5.0.5` | `^5.0.9` | HIGH: GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895 |
| `body-parser` (via npm audit fix) | <1.20.6 | >=1.20.6 | LOW: GHSA-v422-hmwv-36x6 |
| `esbuild` (via npm audit fix) | 0.27.3–0.28.0 | >=0.28.1 | LOW: GHSA-g7r4-m6w7-qqqr |
| `form-data` (via npm audit fix) | 4.0.0–4.0.5 | >=4.0.6 | HIGH: GHSA-hmw2-7cc7-3qxx |
| `js-yaml` (via npm audit fix) | <=3.15.0 | >=3.15.1 | HIGH: GHSA-h67p-54hq-rp68, GHSA-52cp-r559-cp3m, GHSA-5p4m-2wfm-xmqj |
| `morgan` (via npm audit fix) | 1.2.0–1.10.1 | >=1.10.2 | MODERATE: GHSA-4vj7-5mj6-jm8m |
| `typeorm` (via npm audit fix) | <0.3.31 | >=0.3.31 | MODERATE: GHSA-2rp8-mm9q-fp49 |

**Wynik po aktualizacji:** `found 0 vulnerabilities`

### Frontend (`frontend/package.json`)

| Pakiet / Override | Przed | Po | CVE/GHSA |
|-------------------|-------|-----|----------|
| `react-router-dom` | `^7.11.0` | `^7.18.2` | HIGH: GHSA-49rj-9fvp-4h2h, GHSA-8x6r-g9mw-2r78, GHSA-rxv8-25v2-qmq8, GHSA-84g9-w2xq-vcv6, GHSA-wrjc-x8rr-h8h6, GHSA-h8fp-f39c-q6mh, GHSA-337j-9hxr-rhxg, GHSA-chx6-hx7r-mcp5, GHSA-2j2x-hqr9-3h42, GHSA-qwww-vcr4-c8h2 |
| overrides `brace-expansion` | `^5.0.5` | `^5.0.9` | HIGH: GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895 |
| `axios` (via npm audit fix) | 1.0.0–1.17.0 | >=1.17.1 | HIGH: GHSA-42h9-826w-cgv3, GHSA-pmv8-rq9r-6j72, GHSA-jqh4-m9w3-8hp9, GHSA-mmx7-hfxf-jppx, GHSA-f4gw-2p7v-4548 i inne |
| `@babel/core` (via npm audit fix) | <=7.29.0 | >=7.26.10 (patched build) | LOW: GHSA-4x5r-pxfx-6jf8 — resolved via `@vitejs/plugin-react` update |
| `dompurify` (via npm audit fix) | <=3.4.12 | >=3.4.13 | MODERATE: GHSA-hpcv-96wg-7vj8, GHSA-r47g-fvhr-h676, GHSA-rp9w-3fw7-7cwq i inne |
| `js-yaml` (via npm audit fix) | <=3.15.0 | >=3.15.1 | HIGH: GHSA-h67p-54hq-rp68, GHSA-52cp-r559-cp3m, GHSA-5p4m-2wfm-xmqj |
| `nanoid` (via npm audit fix) | <=3.3.16 | >=3.3.17 | HIGH: GHSA-28wg-ghj8-5hjv, GHSA-2v37-7h3g-55p8 |
| `postcss` (via npm audit fix) | <=8.5.22 | >=8.5.23 | HIGH: GHSA-r28c-9q8g-f849, GHSA-fxqj-rqcc-2cmp |
| `vite` (via npm audit fix) | <=6.4.2 | >=6.4.3 | HIGH: GHSA-v6wh-96g9-6wx3, GHSA-fx2h-pf6j-xcff |

**Wynik po aktualizacji:** `found 0 vulnerabilities`

### Breaking changes i migracja

#### `react-router-dom` 7.11.0 → 7.18.2 (patch/minor w obrębie 7.x)
- Brak breaking changes w publicznym API.
- Wszystkie importy i hooki (`useNavigate`, `useParams`, `RouterProvider`, `createBrowserRouter`) pozostają kompatybilne.
- Build TypeScript przechodzi bez błędów.

#### `tar` override 7.5.3 → 7.5.21 (patch w obrębie 7.x)
- Brak breaking changes. `@mapbox/node-pre-gyp` (bcrypt) nadal działa poprawnie.

### Weryfikacja

```bash
# Backend
cd backend && npm audit     # found 0 vulnerabilities
./node_modules/.bin/tsc --noEmit  # exit 0

# Frontend
cd frontend && npm audit    # found 0 vulnerabilities
npm run build               # ✓ built successfully
```

