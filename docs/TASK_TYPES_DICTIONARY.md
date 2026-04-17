# 📖 Słownik typów zadań - DER MAG Platform

> **Data aktualizacji:** 2026-04-17  
> **Status:** Aktualny

---

## 📑 Spis treści

1. [SMOKIP-A](#smokip-a)
2. [SMOKIP-B](#smokip-b)
3. [Stacje i Nastawnie](#stacje-i-nastawnie)
4. [Systemy Monitoringu i Bezpieczeństwa](#systemy-monitoringu-i-bezpieczeństwa)
5. [Infrastruktura](#infrastruktura)
6. [Typy kompletacyjne](#typy-kompletacyjne)
7. [Kategorie przejazdów kolejowo-drogowych](#kategorie-przejazdów-kolejowo-drogowych)
8. [Zadania wymagające automatycznej kompletacji szafy](#zadania-wymagające-automatycznej-kompletacji-szafy)

---

## SMOKIP-A

*System Monitorowania Obiektów Kolejowych IP - Wariant A*

| Skrót | Pełna nazwa | Opis |
|-------|------------|------|
| `SMOKIP_A` | System Monitorowania Obiektów Kolejowych IP - Wariant A | System główny SMOKIP wariant A |
| `PRZEJAZD_KAT_A` | Przejazd kolejowo-drogowy Kategorii A | Przejazd z rogatkami i sygnalizacją świetlną |
| `SKP` | Stwierdzenie Końca Pociągu | Urządzenie weryfikujące kompletność składu pociągu |

---

## SMOKIP-B

*System Monitorowania Obiektów Kolejowych IP - Wariant B*

| Skrót | Pełna nazwa | Opis |
|-------|------------|------|
| `SMOKIP_B` | System Monitorowania Obiektów Kolejowych IP - Wariant B | System główny SMOKIP wariant B |
| `PRZEJAZD_KAT_B` | Przejazd kolejowo-drogowy Kategorii B/C/E/F | Przejazd bez rogatek (kategorie B, C, E, F) |

---

## Stacje i Nastawnie

| Skrót | Pełna nazwa | Opis |
|-------|------------|------|
| `LCS` | Local Control Station | Lokalna Stacja Kontroli - punkt sterowania lokalnego |
| `CUID` | Centrum Utrzymania i Diagnostyki | Centrum zarządzania i diagnostyki systemu |
| `NASTAWNIA` | Nastawnia kolejowa | Posterunek nastawniczy zarządzający ruchem |
| `ND` | Nastawnia Dyspozytorska | Nastawnia z funkcjami dyspozytorskimi |

---

## Systemy Monitoringu i Bezpieczeństwa

| Skrót | Pełna nazwa | Opis |
|-------|------------|------|
| `SMW` | System Monitoringu Wizyjnego | Kamery CCTV, rejestratory, monitoring wizyjny |
| `SKD` | System Kontroli Dostępu | Kontrola dostępu do pomieszczeń/obszarów |
| `SSWiN` | System Sygnalizacji Włamania i Napadu | Alarmy antywłamaniowe i napadowe |
| `SSP` | System Sygnalizacji Pożaru | Czujniki i alarmy przeciwpożarowe |
| `SUG` | Stałe Urządzenie Gaśnicze | Automatyczny system gaszenia pożarów |

---

## Infrastruktura

| Skrót | Pełna nazwa | Opis |
|-------|------------|------|
| `CSDIP` | Cyfrowe Systemy Dźwiękowego Informowania Pasażerów | Głośniki, wzmacniacze, systemy DSP dla pasażerów |
| `LAN` | Sieci LAN PKP PLK | Infrastruktura sieci lokalnych PKP PLK |
| `OTK` | Optical Technical Kabel | Światłowodowy kabel techniczny (od ang. *Optical Technical Kabel*) |
| `ZASILANIE` | Zasilanie UPS/agregaty | Systemy zasilania awaryjnego UPS i agregatów prądotwórczych |

---

## Typy kompletacyjne

| Skrót | Pełna nazwa | Opis |
|-------|------------|------|
| `KOMPLETACJA_SZAF` | Kompletacja szaf | Zadanie kompletowania szaf sterowniczych/teletechnicznych |
| `KOMPLETACJA_WYSYLKI` | Kompletacja wysyłki | Zadanie kompletowania zestawu elementów do wysyłki |

---

## Kategorie przejazdów kolejowo-drogowych

| Kategoria | Charakterystyka |
|-----------|----------------|
| **A** | Rogatki + sygnalizacja świetlna + czuwak |
| **B** | Tylko sygnalizacja świetlna (bez rogatek) |
| **C** | Tylko rogatki (bez sygnalizacji świetlnej) |
| **E** | Przejazd z zaporami |
| **F** | Przejście dla pieszych przy przejeździe |

---

## Zadania wymagające automatycznej kompletacji szafy

Gdy użytkownik w **Kroku 5 (Infrastruktura)** Kreatora Kontraktu wybierze typ szafy dla poniższych zadań, system automatycznie wygeneruje zadanie `KOMPLETACJA_SZAF`:

| Typ zadania | Nazwa | Grupa |
|-------------|-------|-------|
| ✅ `SMOKIP_A` | System Monitorowania Obiektów Kolejowych IP - Wariant A | SMOKIP-A |
| ✅ `PRZEJAZD_KAT_A` | Przejazd kolejowo-drogowy Kategorii A | SMOKIP-A |
| ✅ `SKP` | Stwierdzenie Końca Pociągu | SMOKIP-A |
| ✅ `SMOKIP_B` | System Monitorowania Obiektów Kolejowych IP - Wariant B | SMOKIP-B |
| ✅ `PRZEJAZD_KAT_B` | Przejazd kolejowo-drogowy Kategorii B/C/E/F | SMOKIP-B |
| ✅ `LCS` | Local Control Station | Stacje i Nastawnie |
| ✅ `NASTAWNIA` | Nastawnia kolejowa | Stacje i Nastawnie |
| ✅ `ND` | Nastawnia Dyspozytorska | Stacje i Nastawnie |

Zadania **NIE wymagające** automatycznej kompletacji szafy: `SMW`, `SKD`, `CSDIP`, `SSWiN`, `SSP`, `SUG`, `LAN`, `OTK`, `ZASILANIE`, `CUID`.

---

> **Uwaga:** Plik konfiguracyjny z typami zadań: `frontend/src/config/taskTypes.ts` i `backend/src/config/taskTypes.ts`
