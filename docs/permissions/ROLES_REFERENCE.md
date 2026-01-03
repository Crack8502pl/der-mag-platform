# Przewodnik ról i uprawnień w systemie Grover

## Przegląd ról

System Grover zawiera **10 ról** użytkowników z granularnym systemem uprawnień RBAC (Role-Based Access Control).

## Lista ról

| ID | Kod | Nazwa | Poziom | Admin? | Opis |
|----|-----|-------|--------|--------|------|
| 1 | `admin` | Administrator Systemu | 100 | **TAK** | Pełny dostęp do wszystkich funkcji |
| 2 | `management_board` | Zarząd | 90 | NIE | Zarządzanie menadżerami i projektami |
| 3 | `manager` | Menedżer | 80 | NIE | Zarządzanie projektami i zespołami |
| 4 | `coordinator` | Koordynator | 60 | NIE | Koordynacja zadań serwisowych |
| 5 | `bom_editor` | Edytor BOM-ów | 50 | NIE | Zarządzanie materiałami |
| 6 | `prefabricator` | Prefabrykant | 40 | NIE | Prefabrykacja urządzeń |
| 7 | `order_picking` | Pracownik przygotowania | 40 | NIE | Kompletacja materiałów |
| 8 | `worker` | Pracownik | 20 | NIE | Realizacja zadań terenowych |
| 9 | `integrator` | System (API) | 90 | NIE | Integracje zewnętrzne |
| 10 | `viewer` | Podgląd | 10 | NIE | Tylko odczyt |

---

## 1. Administrator Systemu (`admin`)

### Opis
Pełny dostęp do wszystkich funkcji systemu, w tym panelu administracyjnego.

### Uprawnienia
```json
{
  "all": true
}
```

### Dostępne moduły
- ✅ Wszystkie moduły systemu
- ✅ Panel administracyjny
- ✅ Zarządzanie użytkownikami
- ✅ Konfiguracja systemu
- ✅ Wszystkie operacje CRUD

---

## 2. Zarząd (`management_board`)

### Opis
Zarządzanie menadżerami, przydzielanie projektów, raporty dobowe.

### Uprawnienia
- **Dashboard:** odczyt
- **Kontrakty:** odczyt, tworzenie, edycja, zatwierdzanie, import
- **Podsystemy:** odczyt, tworzenie, edycja, generowanie BOM, alokacja sieci
- **Zadania:** odczyt, tworzenie, edycja, przypisywanie
- **Kompletacja:** odczyt, decyzja o kontynuacji
- **Prefabrykacja:** odczyt
- **Sieć/IP:** odczyt, tworzenie puli, edycja, alokacja, macierze
- **BOM:** odczyt, tworzenie, edycja
- **Urządzenia:** odczyt, tworzenie, edycja
- **Użytkownicy:** odczyt, tworzenie, edycja
- **Raporty:** odczyt, tworzenie, export
- **Ustawienia:** odczyt, edycja
- **Zdjęcia:** odczyt, zatwierdzanie
- **Dokumenty:** odczyt, tworzenie, usuwanie
- **Powiadomienia:** otrzymywanie alertów, wysyłanie manualne

---

## 3. Menedżer (`manager`)

### Opis
Zarządzanie projektami, użytkownikami i raportami.

### Uprawnienia
Podobne do Zarządu, ale:
- **Użytkownicy:** tylko odczyt (bez tworzenia/edycji)

### Różnice względem Zarządu
- Nie może zarządzać użytkownikami
- Nie ma uprawnień do tworzenia nowych użytkowników

---

## 4. Koordynator (`coordinator`)

### Opis
Koordynacja zadań serwisowych, przypisywanie pracowników.

### Uprawnienia
- **Dashboard:** odczyt
- **Kontrakty:** odczyt
- **Podsystemy:** odczyt
- **Zadania:** odczyt, tworzenie zadań SERWIS, edycja, przypisywanie
- **Kompletacja:** odczyt
- **Prefabrykacja:** odczyt
- **Sieć/IP:** odczyt, macierze
- **BOM:** odczyt
- **Urządzenia:** odczyt
- **Użytkownicy:** odczyt
- **Raporty:** odczyt, export
- **Ustawienia:** odczyt, edycja
- **Zdjęcia:** odczyt
- **Dokumenty:** odczyt, tworzenie
- **Powiadomienia:** otrzymywanie alertów

### Ograniczenia
- Może tworzyć tylko zadania typu **SERWIS**
- Nie może tworzyć kontraktów ani podsystemów

---

## 5. Edytor BOM-ów (`bom_editor`)

### Opis
Zarządzanie materiałami i szablonami BOM.

### Uprawnienia
- **Dashboard:** odczyt
- **Podsystemy:** odczyt, generowanie BOM, alokacja sieci
- **Zadania:** odczyt
- **Sieć/IP:** odczyt, alokacja, macierze
- **BOM:** odczyt, tworzenie, edycja, usuwanie
- **Urządzenia:** odczyt
- **Raporty:** odczyt
- **Ustawienia:** odczyt, edycja
- **Dokumenty:** odczyt
- **Powiadomienia:** otrzymywanie alertów, konfiguracja triggerów

### Specjalizacja
- Pełne zarządzanie materiałami i szablonami BOM
- Dostęp do panelu BOM Builder w panelu admin

---

## 6. Prefabrykant (`prefabricator`)

### Opis
Prefabrykacja urządzeń, weryfikacja numerów seryjnych.

### Uprawnienia
- **Dashboard:** odczyt
- **Zadania:** odczyt
- **Kompletacja:** skanowanie
- **Prefabrykacja:** odczyt, przyjmowanie zamówień, konfiguracja, weryfikacja, przypisywanie SN, zakończenie
- **Sieć/IP:** odczyt, macierze
- **BOM:** odczyt
- **Urządzenia:** odczyt, tworzenie, edycja, weryfikacja
- **Ustawienia:** odczyt, edycja
- **Dokumenty:** odczyt
- **Powiadomienia:** otrzymywanie alertów

### Specjalizacja
- Konfiguracja i przygotowanie urządzeń
- Weryfikacja numerów seryjnych
- Przypisywanie urządzeń do zadań

---

## 7. Pracownik przygotowania (`order_picking`)

### Opis
Kompletacja podzespołów, dodawanie numerów seryjnych.

### Uprawnienia
- **Dashboard:** odczyt
- **Zadania:** odczyt
- **Kompletacja:** odczyt, skanowanie, przypisywanie palet, zgłaszanie braków, zakończenie
- **BOM:** odczyt
- **Urządzenia:** odczyt, weryfikacja
- **Raporty:** odczyt
- **Ustawienia:** odczyt, edycja
- **Zdjęcia:** odczyt, tworzenie
- **Dokumenty:** odczyt
- **Powiadomienia:** otrzymywanie alertów, wysyłanie manualne

### Specjalizacja
- Kompletacja materiałów
- Weryfikacja dostępności
- Przygotowanie wysyłek

---

## 8. Pracownik (`worker`)

### Opis
Realizacja zadań, kompletacja, upload zdjęć.

### Uprawnienia
- **Dashboard:** odczyt
- **Zadania:** odczyt, edycja własnych zadań
- **Kompletacja:** odczyt, skanowanie, przypisywanie palet, zgłaszanie braków, zakończenie
- **Sieć/IP:** macierze
- **BOM:** odczyt
- **Urządzenia:** odczyt, edycja
- **Ustawienia:** odczyt, edycja
- **Zdjęcia:** odczyt, tworzenie
- **Dokumenty:** odczyt
- **Powiadomienia:** otrzymywanie alertów

### Ograniczenia
- Może edytować tylko **własne** zadania
- Nie ma dostępu do tworzenia nowych zadań

---

## 9. System/Integrator (`integrator`)

### Opis
Konto systemowe do integracji z platformami zewnętrznymi (API).

### Uprawnienia
- **Kontrakty:** odczyt, tworzenie, edycja, import
- **BOM:** odczyt, edycja
- **Urządzenia:** odczyt, tworzenie, edycja, weryfikacja

### Specjalizacja
- Integracje z systemami zewnętrznymi
- Import danych
- Automatyczne aktualizacje

---

## 10. Podgląd (`viewer`) ⭐ NOWA ROLA

### Opis
Rola tylko do odczytu - brak możliwości edycji, tworzenia lub usuwania danych.

### Uprawnienia
```json
{
  "dashboard": { "read": true },
  "contracts": { "read": true },
  "subsystems": { "read": true },
  "tasks": { "read": true },
  "completion": { "read": true },
  "prefabrication": { "read": true },
  "network": { "read": true, "viewMatrix": true },
  "bom": { "read": true },
  "devices": { "read": true },
  "users": { "read": true },
  "reports": { "read": true },
  "settings": { "read": true },
  "photos": { "read": true },
  "documents": { "read": true },
  "notifications": { "receiveAlerts": true }
}
```

### Zastosowanie
- Audytorzy
- Klienci
- Obserwatorzy projektu
- Praktykanci
- Konsultanci zewnętrzni

### Ograniczenia
- ❌ Brak możliwości tworzenia
- ❌ Brak możliwości edycji
- ❌ Brak możliwości usuwania
- ✅ Tylko odczyt wszystkich modułów

---

## Macierz uprawnień

| Moduł | Admin | Zarząd | Manager | Koordynator | BOM Editor | Prefabricator | Order Picking | Worker | Integrator | Viewer |
|-------|-------|--------|---------|-------------|------------|---------------|---------------|--------|------------|--------|
| **Dashboard** | ✅ ALL | ✅ R | ✅ R | ✅ R | ✅ R | ✅ R | ✅ R | ✅ R | ❌ | ✅ R |
| **Kontrakty** | ✅ ALL | ✅ CRUD+A+I | ✅ CRUD+A+I | ✅ R | ❌ | ❌ | ❌ | ❌ | ✅ CRU+I | ✅ R |
| **Podsystemy** | ✅ ALL | ✅ CRUD+BOM+IP | ✅ CRUD+BOM+IP | ✅ R | ✅ R+BOM+IP | ❌ | ❌ | ❌ | ❌ | ✅ R |
| **Zadania** | ✅ ALL | ✅ CRUD+A | ✅ CRUD+A | ✅ CR(SERWIS)+U+A | ✅ R | ✅ R | ✅ R | ✅ R+U(OWN) | ❌ | ✅ R |
| **Kompletacja** | ✅ ALL | ✅ R+D | ✅ R+D | ✅ R | ❌ | ✅ SCAN | ✅ FULL | ✅ FULL | ❌ | ✅ R |
| **Prefabrykacja** | ✅ ALL | ✅ R | ✅ R | ✅ R | ❌ | ✅ FULL | ❌ | ❌ | ❌ | ✅ R |
| **Sieć/IP** | ✅ ALL | ✅ CRUD+M | ✅ CRUD+M | ✅ R+M | ✅ R+A+M | ✅ R+M | ❌ | ✅ M | ❌ | ✅ R+M |
| **BOM** | ✅ ALL | ✅ CRU | ✅ CRU | ✅ R | ✅ CRUD | ✅ R | ✅ R | ✅ R | ✅ RU | ✅ R |
| **Urządzenia** | ✅ ALL | ✅ CRU | ✅ CRU | ✅ R | ✅ R | ✅ CRU+V | ✅ R+V | ✅ RU | ✅ CRU+V | ✅ R |
| **Użytkownicy** | ✅ ALL | ✅ CRU | ✅ R | ✅ R | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ R |
| **Raporty** | ✅ ALL | ✅ CR+E | ✅ CR+E | ✅ R+E | ✅ R | ❌ | ✅ R | ❌ | ❌ | ✅ R |
| **Dokumenty** | ✅ ALL | ✅ CRD | ✅ CRD | ✅ CR | ✅ R | ✅ R | ✅ R | ✅ R | ❌ | ✅ R |
| **Zdjęcia** | ✅ ALL | ✅ R+A | ✅ R+A | ✅ R | ❌ | ❌ | ✅ CR | ✅ CR | ❌ | ✅ R |
| **Powiadomienia** | ✅ ALL | ✅ RECV+SEND | ✅ RECV+SEND | ✅ RECV | ✅ RECV+CFG | ✅ RECV | ✅ RECV+SEND | ✅ RECV | ❌ | ✅ RECV |

**Legenda:**
- **R** = Read (odczyt)
- **C** = Create (tworzenie)
- **U** = Update (edycja)
- **D** = Delete (usuwanie)
- **A** = Approve/Assign (zatwierdzanie/przypisywanie)
- **I** = Import
- **E** = Export
- **V** = Verify (weryfikacja)
- **M** = Matrix (macierze IP)
- **BOM** = Generowanie BOM
- **IP** = Alokacja IP
- **SCAN** = Skanowanie
- **RECV** = Receiving (otrzymywanie)
- **SEND** = Sending (wysyłanie)
- **CFG** = Configure (konfiguracja)
- **OWN** = Own only (tylko własne)

---

## Jak przypisać rolę użytkownikowi

### Przez panel administracyjny
1. Przejdź do **Panel Admin → Zarządzanie użytkownikami**
2. Kliknij na użytkownika
3. Wybierz rolę z listy rozwijanej
4. Zapisz zmiany

### Przez API
```bash
PATCH /api/users/:id
{
  "role": "viewer"
}
```

---

## Najlepsze praktyki

### 1. Zasada najmniejszych uprawnień
Przypisuj użytkownikom tylko te uprawnienia, które są niezbędne do wykonywania ich obowiązków.

### 2. Regularne przeglądy
Przeglądaj uprawnienia użytkowników co 3 miesiące.

### 3. Rola viewer dla gości
Używaj roli `viewer` dla:
- Audytorów
- Klientów
- Praktykantów
- Konsultantów

### 4. Dokumentacja zmian
Dokumentuj zmiany w rolach użytkowników w systemie.

---

**Wersja dokumentu:** 1.0  
**Data ostatniej aktualizacji:** 2026-01-03  
**Autor:** System Grover
