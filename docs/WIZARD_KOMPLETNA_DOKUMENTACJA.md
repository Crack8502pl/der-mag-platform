# 🧙‍♂️ WIZARD KONTRAKTU - KOMPLETNA DOKUMENTACJA TECHNICZNA

> **Data utworzenia:** 2026-04-21  
> **Autor:** @Crack8502pl  
> **Wersja:** 1.0  
> **Repozytorium:** `Crack8502pl/der-mag-platform`

---

## 📑 SPIS TREŚCI

1. [Przegląd kroków wizarda](#1-przegląd-kroków-wizarda)
2. [Szczegółowy opis pól per krok](#2-szczegółowy-opis-pól-per-krok)
3. [Kod drabinkowy - powiązania plików](#3-kod-drabinkowy---powiązania-plików)
4. [Rozbieżności między specyfikacją a implementacją](#4-rozbieżności-między-specyfikacją-a-implementacją)
5. [Struktura danych (TypeScript Interfaces)](#5-struktura-danych-typescript-interfaces)
6. [Flowchart przepływu danych](#6-flowchart-przepływu-danych)

---

## 1. PRZEGLĄD KROKÓW WIZARDA

### 1.1 Dynamiczna kalkulacja kroków
Total Steps = 3 (Base) + N (Config) + M (Details) + 2 (Infrastructure + Logistics) + 1 (Success)

Where:

    N = liczba wybranych podsystemów
    M = liczba podsystemów SMOKIP_A/SMOKIP_B (tylko te mają krok Details)

Code


### 1.2 Kolejność kroków

| # | Typ kroku | Nazwa | Wymagane | Opis |
|---|-----------|-------|----------|------|
| 1 | `basic` | Dane podstawowe | ✅ Tak | Numer, nazwa, data, kierownik |
| 2 | `selection` | Wybór podsystemów | ✅ Tak | Potwierdzenie/modyfikacja wykrytych podsystemów |
| 3..N | `config` | Konfiguracja podsystemu | ✅ Tak | Per podsystem - ilości jednostek |
| 3+..N+ | `details` | Szczegóły zadań | ⚠️ Tylko SMOK | Kilometraż, kategoria, GPS (tylko SMOKIP_A/B) |
| N+1 | `infrastructure` | Parametry infrastruktury | ❌ Nie | Szafy, słupy, uwagi terenowe |
| N+2 | `logistics` | Dane logistyczne | ✅ Tak | Wielokrotne adresy dostawy (z telefonem per adres), e-maile |
| N+3 | `task-config` | Konfiguracja Zadań | ❌ Nie | BOM per zadanie — automatyczne szablony, edycja ilości |
| N+4 | `custom-orders` | Zamówienia Niestandardowe | ❌ Warunkowy | Niestandardowe pozycje poza BOM (gdy `customOrdersEnabled=true`) |
| N+5 | `preview` | Podgląd | ✅ Tak | Podsumowanie przed zapisem |
| N+6 | `success` | Sukces | ℹ️ Info | Potwierdzenie utworzenia + opcja wysyłki |

**Specjalne kroki:**
- `shipping` - Opcjonalny krok po `success` (wysyłka materiałów)
- `custom-orders` - Wyświetlany warunkowo gdy `wizardData.customOrdersEnabled === true`

---

## 2. SZCZEGÓŁOWY OPIS PÓL PER KROK

### �� KROK 1: Dane podstawowe (`BasicDataStep.tsx`)

**Plik:** `frontend/src/components/contracts/wizard/steps/BasicDataStep.tsx`

#### Pola formularza:

| Pole | Typ | Wymagane | Walidacja | Auto-wypełnienie | Opis |
|------|-----|----------|-----------|------------------|------|
| `contractNumber` | text | ❌ Nie | Unikalny numer | Tak (backend) | Numer kontraktu, generowany automatycznie jeśli pusty |
| `customName` | text | ✅ Tak | Min 1 znak | Nie | Pełna nazwa kontraktu (np. "Modernizacja LK-007") |
| `orderDate` | date | ✅ Tak | Data ISO | Tak (dzisiaj) | Data zamówienia |
| `projectManagerId` | select | ✅ Tak | Wybór z listy | Tak (user) | ID kierownika projektu z systemu |
| `managerCode` | text | ✅ Tak | 1-5 znaków | Tak (z profilu) | Skrót kierownika (np. "AKO") |

#### Auto-detekcja:

**Linia kolejowa:**
```typescript
// Wzorce wykrywania:
/LK-?(\d{1,3})/i    // → LK-007, LK007
/E-?(\d{1,2})/i     // → E-20, E20

// Przykład:
"Modernizacja LK-007 Warszawa–Gdańsk" → detectedRailwayLine = "LK-007"
```
Podsystem:
TypeScript

// Funkcja: detectSubsystemTypes(name: string)

"SMOK Warszawa"              → ['SMOKIP_A', 'SMOKIP_B']
"Modernizacja SMOK-A Poznań" → ['SMOKIP_A']
"SKD i CCTV Kraków"          → ['SKD', 'CCTV']
"Kontrakty liniowe"          → []

Dane wynikowe:
TypeScript

{
  contractNumber: string,        // Wygenerowany lub własny
  customName: string,
  orderDate: string,             // Format: YYYY-MM-DD
  projectManagerId: string,
  managerCode: string,           // 1-5 znaków
  liniaKolejowa?: string,        // Wykryta linia
  detectedRailwayLine?: string   // Backup wykrytej linii
}

🔹 KROK 2: Wybór podsystemów (SubsystemSelectionStep.tsx)

Plik: frontend/src/components/contracts/wizard/steps/SubsystemSelectionStep.tsx
Funkcje:

    Wyświetlanie wykrytych podsystemów - Pokazuje listę podsystemów z kroku 1
    Usuwanie podsystemów - Przycisk "Usuń" (z walidacją istniejących zadań)
    Dodawanie nowych - Dropdown z niewybranymi typami

Typy podsystemów:
TypeScript

type SubsystemType = 
  | 'SMOKIP_A'      // SMOK-A
  | 'SMOKIP_B'      // SMOK-B
  | 'SKD'           // Systemy Kontroli Dostępu
  | 'SSWIN'         // Systemy Sygnalizacji Włamania i Napadu
  | 'CCTV'          // Kamery CCTV
  | 'SMW'           // System Monitoringu Wizyjnego
  | 'SDIP'          // System Detekcji i Pożaru
  | 'SUG'           // System Uszczelniania Granic
  | 'SSP'           // System Sygnalizacji Pożaru
  | 'LAN'           // Sieci LAN
  | 'OTK'           // Odbiorczy Test Kwalifikacyjny
  | 'ZASILANIE';    // Systemy zasilania

Walidacja:

    ✅ Minimum 1 podsystem wymagany do przejścia dalej
    ❌ Nie można usunąć podsystemu z istniejącymi zadaniami (tryb edycji)
    ❌ Nie można dodać tego samego podsystemu dwa razy

Dane wyrikowe:
TypeScript

{
  subsystems: [
    { type: 'SMOKIP_A', params: {} },
    { type: 'SKD', params: {} }
  ]
}

🔹 KROKI 3..N: Konfiguracja podsystemu (*ConfigStep.tsx)

Pliki per podsystem:

    frontend/src/components/contracts/wizard/subsystems/smokip-a/SmokipAConfigStep.tsx
    frontend/src/components/contracts/wizard/subsystems/smokip-b/SmokipBConfigStep.tsx
    frontend/src/components/contracts/wizard/subsystems/skd/SkdConfigStep.tsx
    frontend/src/components/contracts/wizard/subsystems/smw/SmwConfigStep.tsx
    ... (inne podsystemy)

🔶 SMOKIP_A - Pola konfiguracji:
Pole	Typ	Wymagane	Opis	Generuje zadania
przejazdyKatA	number	❌	Ilość przejazdów kolejowych KAT A	✅ Tak (PRZEJAZD_KAT_A)
iloscSKP	number	❌	Ilość systemów kontroli przejazdów	✅ Tak (SKP)
iloscNastawni	number	❌	Ilość nastawni	✅ Tak (NASTAWNIA)
hasLCS	number	❌	Ilość lokalnych centrów sterowania	✅ Tak (LCS)
ipPool	text (CIDR)	❌	Pula adresowa IP (np. 192.168.10.0/24)	❌ Nie

Komponenty pomocnicze:

    NetworkPoolFields.tsx - Obsługa puli IP z walidacją CIDR

Funkcje CIDR:
TypeScript

// Kliknięcie "Sprawdź" wywołuje:
- Walidację formatu CIDR (regex)
- Kalkulację bramy domyślnej (pierwszy IP)
- Kalkulację maski podsieci (z prefix length)
- Sprawdzenie dostępności w bazie (backend: /api/network/check-cidr)

🔶 SMOKIP_B - Pola konfiguracji:
Pole	Typ	Wymagane	Opis	Generuje zadania
przejazdyKatB	number	❌	Ilość przejazdów KAT B	✅ Tak (PRZEJAZD_KAT_B)
iloscSKP	number	❌	Ilość SKP	✅ Tak (SKP)
iloscNastawni	number	❌	Ilość nastawni	✅ Tak (NASTAWNIA)
hasLCS	number	❌	Ilość LCS	✅ Tak (LCS)
ipPool	text (CIDR)	❌	Pula IP	❌ Nie
🔶 SKD - Pola konfiguracji:
Pole	Typ	Wymagane	Opis	Generuje zadania
iloscBudynkow	number	❌	Ilość budynków z SKD	✅ Tak (BUDYNEK)
iloscKontenerow	number	❌	Ilość kontenerów	✅ Tak (KONTENER)
🔶 SMW - Multi-step wewnętrzny wizard:

Specjalne: SMW ma własny wewnętrzny wizard z wieloma pod-krokami.

Pod-kroki SMW:

    Basic config (ilość stacji, kontenerów, checkboxy SOK/Extra Viewing)
    Station forms (per stacja - nazwa, adres, szafy)
    Platform cabinets (szafy peronowe)
    SOK config (jeśli enabled)
    Extra Viewing config (jeśli enabled)
    LCS config

Stan SMW:
TypeScript

interface SmwWizardData {
  iloscStacji: number;
  iloscKontenerow: number;
  sokEnabled: boolean;
  extraViewingEnabled: boolean;
  stations: SmwStation[];
  sokConfig?: { nameAddress: string; cabinets: SmwCabinet[] };
  extraViewingConfig?: { nameAddress: string; cabinets: SmwCabinet[] };
  lcsConfig: { cabinets: SmwCabinet[] };
}

Dane wynikowe (przykład SMOKIP_A):
TypeScript

{
  type: 'SMOKIP_A',
  params: {
    przejazdyKatA: 2,
    iloscSKP: 1,
    iloscNastawni: 1,
    hasLCS: 1
  },
  ipPool: '192.168.10.0/24'
}

🔹 KROKI 3+..N+: Szczegóły zadań (*DetailsStep.tsx)

⚠️ WAŻNE: Ten krok występuje TYLKO dla podsystemów SMOKIP_A i SMOKIP_B.

Pliki:

    frontend/src/components/contracts/wizard/subsystems/smokip-a/SmokipADetailsStep.tsx
    frontend/src/components/contracts/wizard/subsystems/smokip-b/SmokipBDetailsStep.tsx

Funkcje:

    Inicjalizacja zadań - Na podstawie params z kroku Config tworzy listę zadań
    Edycja per zadanie - Użytkownik wypełnia szczegóły
    Dodawanie ręczne - Przycisk "+ Dodaj nowe zadanie"
    Usuwanie - Przycisk "Usuń" per zadanie
    Auto-sync LCS ↔ CUID - Zmiany w LCS propagują do CUID

Pola per typ zadania:
PRZEJAZD_KAT_A / PRZEJAZD_KAT_B
Pole	Typ	Wymagane	Walidacja	Opis
liniaKolejowa	text	❌	Format LK-XXX	Auto-wypełniane z kroku 1
kilometraz	text	✅ TAK	Format XXX,XXX	Kilometraż lokalizacji
kategoria	select	✅ TAK	Enum	KAT A / B / C / E / F
googleMapsUrl	text	❌	URL	Link do Google Maps (wyciągane są współrzędne)
SKP
Pole	Typ	Wymagane	Walidacja	Opis
liniaKolejowa	text	❌	Format LK-XXX	Auto-wypełniane
kilometraz	text	✅ TAK	Format XXX,XXX	Kilometraż
googleMapsUrl	text	❌	URL	GPS
NASTAWNIA
Pole	Typ	Wymagane	Walidacja	Opis
liniaKolejowa	text	❌	Format LK-XXX	Auto-wypełniane
nazwa	text	❌	-	Nazwa nastawni (np. "Nastawnia Tczew")
miejscowosc	text	❌	-	Miejscowość
kilometraz	text	❌	Format XXX,XXX	Opcjonalnie
googleMapsUrl	text	❌	URL	GPS
LCS
Pole	Typ	Wymagane	Walidacja	Opis
liniaKolejowa	text	❌	Format LK-XXX	Auto-wypełniane
nazwa	text	❌	-	Nazwa LCS
miejscowosc	text	❌	-	Miejscowość
kilometraz	text	❌	Format XXX,XXX	Opcjonalnie
googleMapsUrl	text	❌	URL	GPS
hasCUID	checkbox	❌	Boolean	Automatycznie tworzy zadanie CUID

CUID (auto-generowane):

    Jeśli w LCS zaznaczono hasCUID, system automatycznie dodaje zadanie CUID
    CUID dziedziczy pola: nazwa, miejscowosc, googleMapsUrl, gpsLatitude, gpsLongitude
    Powiązanie przez linkedLCSId (UUID)

Formatowanie kilometraża:

Logika (w useWizardState.ts):
TypeScript

// handleKilometrazInput - czyści, ogranicza do 6 cyfr
const cleanKilometrazInput = (value: string): string => {
  return value.replace(/[^\d]/g, '').slice(0, 6);
};

// handleKilometrazBlur - formatuje do XXX,XXX
const formatKilometrazDisplay = (value: string): string => {
  const cleaned = value.replace(/[^\d]/g, '');
  if (cleaned.length <= 3) return cleaned;
  const mainPart = cleaned.slice(0, -3);
  const decimalPart = cleaned.slice(-3);
  return `${mainPart},${decimalPart}`;
};

Auto-synchronizacja LCS → CUID:
TypeScript

// W useWizardState.ts - updateTaskDetail()
if (updatedTask.taskType === 'LCS' && (updates.nazwa !== undefined || updates.miejscowosc !== undefined)) {
  // Znajdź CUID powiązany z tym LCS
  const cuidIndex = taskDetails.findIndex(t => 
    t.taskType === 'CUID' && t.linkedLCSId === updatedTask.taskWizardId
  );
  if (cuidIndex !== -1) {
    // Synchronizuj pola
    taskDetails[cuidIndex] = {
      ...taskDetails[cuidIndex],
      nazwa: updates.nazwa !== undefined ? updates.nazwa : updatedTask.nazwa,
      miejscowosc: updates.miejscowosc !== undefined ? updates.miejscowosc : updatedTask.miejscowosc
    };
  }
}

Dane wynikowe (przykład):
TypeScript

{
  type: 'SMOKIP_A',
  params: { ... },
  taskDetails: [
    {
      taskWizardId: 'uuid-1',
      taskType: 'PRZEJAZD_KAT_A',
      liniaKolejowa: 'LK-007',
      kilometraz: '123,456',
      kategoria: 'KAT A',
      googleMapsUrl: 'https://maps.google.com/?q=52.123,21.456',
      gpsLatitude: '52.123',
      gpsLongitude: '21.456'
    },
    {
      taskWizardId: 'uuid-2',
      taskType: 'LCS',
      nazwa: 'LCS Warszawa',
      miejscowosc: 'Warszawa',
      hasCUID: true
    },
    {
      taskWizardId: 'uuid-3',
      taskType: 'CUID',
      nazwa: 'LCS Warszawa',         // ← Zsynchronizowane z LCS
      miejscowosc: 'Warszawa',       // ← Zsynchronizowane z LCS
      linkedLCSId: 'uuid-2'          // ← Powiązanie
    }
  ]
}

🔹 KROK N+1: Parametry infrastruktury (InfrastructureStep.tsx)

Plik: frontend/src/components/contracts/wizard/steps/InfrastructureStep.tsx

⚠️ UWAGA: Ten krok jest OPCJONALNY (można przejść dalej bez wypełniania).
Funkcje:

    Konfiguracja per zadanie (nie globalna)
    Filtrowanie zadań - wyświetlane tylko zadania typu: SMOKIP_A, SMOKIP_B, LCS, NASTAWNIA, SKP

Pola per zadanie:
Sekcja: Typ szafy
Pole	Typ	Wymagane	Opcje	Opis
cabinetType	select	❌	Enum	Typ szafy instalacyjnej

Opcje:
TypeScript

type CabinetOption = 
  | 'SZAFA_TERENOWA'   // Szafa terenowa
  | 'SZAFA_WEWNETRZNA' // Szafa wewnętrzna
  | 'KONTENER'         // Kontener
  | '42U'              // Szafa 42U
  | '24U';             // Szafa 24U

Efekt uboczny:

    Jeśli zadanie jest typu PRZEJAZD_* lub SKP i wybrano cabinetType:
        Automatycznie ustawia flagę generateCabinetCompletion = true
        Backend utworzy zadanie typu KOMPLETACJA_SZAF dla tego zadania

Sekcja: Słupy

Tabela dynamiczna: Typ słupa | Ilość | Info o produkcie
Pole	Typ	Wymagane	Opis
poles[].type	select	❌	Typ słupa
poles[].quantity	number	❌	Ilość słupów danego typu
poles[].productInfo	text	❌	Numer katalogowy / nazwa produktu

Opcje typu słupa:
TypeScript

type PoleType = 
  | 'STALOWY'    // Słup stalowy
  | 'KOMPOZYT'   // Słup kompozytowy
  | 'INNY';      // Inny typ

Funkcje:

    Przycisk "+ Dodaj typ słupa" - dodaje nowy wiersz
    Przycisk "🔍 Magazyn" - otwiera PoleSearchModal (wyszukiwanie w magazynie)
    Przycisk "🗑️ Usuń typ słupa" - usuwa wiersz

Sekcja: Uwagi terenowe
Pole	Typ	Wymagane	Opis
terrainNotes	textarea	❌	Dowolne notatki o warunkach terenowych

⚠️ ROZBIEŻNOŚĆ NAZEWNICTWA:

    Specyfikacja: fieldNotes
    Implementacja: terrainNotes

Auto-generowanie KOMPLETACJA_SZAF:

Logika:
TypeScript

// Frontend - InfrastructureStep.tsx
const handlePerTaskChange = (taskKey: string, data: Partial<TaskInfrastructure>) => {
  const updatedData =
    requiresCabinetCompletion(task.type) && 'cabinetType' in data
      ? { ...data, generateCabinetCompletion: !!data.cabinetType }
      : data;
  onUpdateTaskInfrastructure(taskKey, updatedData);
};

// Backend - ContractController.ts
if (taskInfra.generateCabinetCompletion && taskInfra.cabinetType) {
  await TaskGenerationService.createCabinetCompletionTask(task, taskInfra.cabinetType);
}

Komunikat UI:
Code

✅ Zadanie KOMPLETACJA_SZAF zostanie automatycznie utworzone dla tego zadania

Dane wynikowe:
TypeScript

{
  infrastructure: {
    perTask: {
      'SMOKIP_A-0': {  // Klucz: `${subsystemType}-${index}`
        cabinetType: 'KONTENER',
        poles: [
          { type: 'STALOWY', quantity: '3', productInfo: 'M00123 | Słup stalowy 6m' },
          { type: 'KOMPOZYT', quantity: '1', productInfo: 'M00456 | Słup kompozytowy 8m' }
        ],
        terrainNotes: 'Teren podmokły, wymagane pale fundamentowe',
        generateCabinetCompletion: true
      }
    }
  }
}

🔹 KROK N+2: Dane logistyczne (LogisticsStep.tsx)

Plik: frontend/src/components/contracts/wizard/steps/LogisticsStep.tsx
Sekcja 1: Adresy dostawy

Funkcje:

    Wieloadresowa dostawa (można dodać wiele adresów)
    Przypisanie zadań do adresów (multi-select checkboxami)

Pola per adres:
Pole	Typ	Wymagane	Opis
address	textarea	✅ TAK	Pełny adres pocztowy
taskIds	array	❌	Lista ID zadań przypisanych do tego adresu (domyślnie: wszystkie)
preferredDeliveryDate	date	❌	Preferowana data dostawy
shippingNotes	textarea	❌	Uwagi do wysyłki

UI:

    Przycisk "+ Dodaj adres dostawy"
    Przycisk "🗑️ Usuń" per adres
    Checkboxy per zadanie (pokazuje listę wszystkich zadań z subsystemami)

Backward compatibility:

System wspiera legacy format z pojedynczym adresem:
TypeScript

// Legacy (stary format):
logistics: {
  deliveryAddress: string  // Pojedynczy adres
}

// New (nowy format):
logistics: {
  deliveryAddresses: [
    { address: string, taskIds: string[] }
  ]
}

// Walidacja akceptuje oba:
const hasAddresses = 
  ((addresses?.length ?? 0) > 0 && addresses.some(d => d.address.trim())) ||
  !!legacyAddress?.trim();

Sekcja 2: Dane kontaktowe
Pole	Typ	Wymagane	Walidacja	Auto-formatowanie	Opis
contactPhone	tel	✅ TAK	9 cyfr (lub 11 z +48)	✅ TAK	Telefon kontaktowy
contactPerson	text	❌	-	❌	Imię i nazwisko osoby kontaktowej

Auto-formatowanie telefonu:
TypeScript

// onBlur:
const formatPhoneNumber = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9) {
    return `+48-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('48')) {
    const local = digits.slice(2);
    return `+48-${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  }
  return raw;
};

// Przykład:
"123456789"      → "+48-123-456-789"
"48123456789"    → "+48-123-456-789"
"+48-123-456-789" → "+48-123-456-789" (bez zmian)

Sekcja 3: Adresy e-mail dla zamówień

⚠️ WSZYSTKIE POLA OPCJONALNE
Pole	Typ	Wymagane	Opis
orderEmails.cameras	email	❌	E-mail dla zamówień kamer
orderEmails.switches	email	❌	E-mail dla zamówień switchy/urządzeń sieciowych
orderEmails.recorders	email	❌	E-mail dla zamówień rejestratorów
orderEmails.general	email	❌	E-mail ogólny (kable, akcesoria, montaż)
orderEmails.warehouse	email	❌	Osoba obsługująca magazyn
orderEmails.notes	textarea	❌	Uwagi dotyczące powiadomień

Specjalne pole: warehouse

⚠️ OSTRZEŻENIE W UI:
Code

⚠️ Uwaga: Osoba nie występuje w systemie – otrzyma tylko 
powiadomienia e-mail o wydaniach i rezerwacjach

Walidacja e-mail:
TypeScript

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Walidacja w backendemie (opcjonalna):
if (logistics?.orderEmails) {
  const emails = Object.values(logistics.orderEmails).filter(e => 
    typeof e === 'string' && e
  );
  for (const email of emails) {
    if (!emailRegex.test(email)) {
      throw new Error(`Nieprawidłowy format e-mail: ${email}`);
    }
  }
}

Dane wynikowe:
TypeScript

{
  logistics: {
    deliveryAddresses: [
      {
        address: "ul. Kolejowa 10\n00-123 Warszawa",
        taskIds: ['SMOKIP_A-0', 'SMOKIP_A-1'],
        preferredDeliveryDate: '2026-05-15',
        shippingNotes: 'Dostawa tylko w godzinach 8-16'
      }
    ],
    contactPhone: '+48-123-456-789',
    contactPerson: 'Jan Kowalski',
    orderEmails: {
      cameras: 'kamery@firma.pl',
      switches: 'siec@firma.pl',
      recorders: 'rejestratory@firma.pl',
      general: 'zamowienia@firma.pl',
      warehouse: 'magazyn@firma.pl',
      notes: 'CC do kierownika budowy'
    }
  }
}

🔹 KROK N+3: Podgląd (PreviewStep.tsx)

Plik: frontend/src/components/contracts/wizard/steps/PreviewStep.tsx
Funkcje:

    Wyświetla podsumowanie wszystkich danych
    Pokazuje wygenerowane zadania zgrupowane per podsystem
    Rozróżnia zadania istniejące (edycja) vs nowe

Sekcje podsumowania:

    Dane podstawowe:
        Numer kontraktu
        Nazwa kontraktu
        Data zamówienia
        Kierownik projektu + kod
        Wykryta linia kolejowa

    Podsystemy i zadania:
        Per podsystem:
            Nazwa podsystemu
            Parametry (params)
            Lista zadań:
                Typ zadania
                Nazwa zadania
                Status: ✅ Istniejące / 🆕 Nowe

    Infrastruktura (w przyszłości)
        Typy szaf i ich liczba
        Liczba zadań KOMPLETACJA_SZAF

    Logistyka (w przyszłości)
        Adresy dostawy
        Telefon kontaktowy
        E-maile powiadomień

⚠️ BRAKUJĄCE FUNKCJE:

    Rozszerzone podsumowanie infrastruktury
    Rozszerzone podsumowanie logistyki
    Konfiguracja kamer (Krok 7 ze specyfikacji)

Dane wynikowe:

Przejście dalej wywołuje handleSubmit() w ContractWizardModal.tsx
🔹 KROK N+4: Sukces (SuccessStep.tsx)

Plik: frontend/src/components/contracts/wizard/steps/SuccessStep.tsx
Wyświetlane informacje:

    ✅ Komunikat sukcesu
    Numer kontraktu
    Liczba utworzonych zadań
    Lista utworzonych zadań

Akcje:
Przycisk	Funkcja	Opis
"Zamknij"	onClose()	Zamyka wizarda
"📦 Zlecenie wysyłki"	onRequestShipping()	Otwiera krok shipping (opcjonalnie)
"✅ Oznacz jako zakończone"	onCompleteInstallationTask()	Per zadanie - oznacza instalację jako ukończoną
🔹 KROK (OPCJONALNY): Wysyłka (ShipmentWizardStep.tsx)

Plik: frontend/src/components/contracts/wizard/steps/ShipmentWizardStep.tsx

Renderowany: Po kliknięciu "Zlecenie wysyłki" w kroku Success.
Funkcje:

    Wybór zadań do wysyłki
    Podanie adresu dostawy i telefonu
    Konfiguracja parametrów szafy (dla zadań typu Przejazd/SKP/LCS)

⚠️ TO NIE JEST CZĘŚĆ GŁÓWNEGO WIZARDA - to osobny komponent wywoływany opcjonalnie.
3. KOD DRABINKOWY - POWIĄZANIA PLIKÓW
3.1 Główny orchestrator
Code

ContractWizardModal.tsx
├─ Imports
│  ├─ useAuth() → hooks/useAuth.ts
│  ├─ useWizardState() → hooks/useWizardState.ts
│  ├─ useWizardDraft() → hooks/useWizardDraft.ts
│  ├─ contractService → services/contract.service.ts
│  ├─ taskService → services/task.service.ts
│  └─ SUBSYSTEM_WIZARD_CONFIG → config/subsystemWizardConfig.ts
│
├─ State Management
│  ├─ currentStep: number
│  ├─ wizardData: WizardData
│  ├─ generatedTasks: GeneratedTask[]
│  ├─ createdContractId: number | null
│  └─ error: string
│
├─ Step Rendering
│  ├─ getStepInfo(step) → StepInfo
│  ├─ renderStepIndicator()
│  ├─ renderCurrentStep()
│  │  ├─ basic → BasicDataStep
│  │  ├─ selection → SubsystemSelectionStep
│  │  ├─ config → renderConfigStep()
│  │  │  ├─ SMOKIP_A → SmokipAConfigStep
│  │  │  ├─ SMOKIP_B → SmokipBConfigStep
│  │  │  ├─ SKD → SkdConfigStep
│  │  │  ├─ SMW → SmwConfigStep
│  │  │  ├─ SSWIN → SswinConfigStep
│  │  │  ├─ CCTV → CctvConfigStep
│  │  │  ├─ SDIP → SdipConfigStep
│  │  │  ├─ SUG → SugConfigStep
│  │  │  ├─ SSP → SspConfigStep
│  │  │  ├─ LAN → LanConfigStep
│  │  │  ├─ OTK → OtkConfigStep
│  │  │  └─ ZASILANIE → ZasilanieConfigStep
│  │  ├─ details → renderDetailsStep()
│  │  │  ├─ SMOKIP_A → SmokipADetailsStep
│  │  │  └─ SMOKIP_B → SmokipBDetailsStep
│  │  ├─ infrastructure → InfrastructureStep
│  │  ├─ logistics → LogisticsStep
│  │  ├─ preview → PreviewStep
│  │  └─ success → SuccessStep
│  │
│  └─ (opcjonalny) shipping → ShipmentWizardStep
│
├─ Navigation
│  ├─ handleNextStep()
│  ├─ handlePrevStep()
│  └─ canProceed() → boolean
│
└─ Submit
   └─ handleSubmit() → contractService.createContractWithWizard()

3.2 Hook useWizardState
Code

useWizardState.ts
├─ State
│  ├─ wizardData: WizardData
│  └─ detectedSubsystems: SubsystemType[]
│
├─ Functions (export)
│  ├─ detectSubsystems(name) → detectSubsystemTypes()
│  ├─ addSubsystem(type)
│  ├─ removeSubsystem(index, setError)
│  ├─ updateSubsystemParams(index, params)
│  ├─ initializeTaskDetails(subsystemIndex)
│  ├─ updateTaskDetail(subsystemIndex, taskIndex, updates)
│  │  └─ Synchronizacja LCS ↔ CUID
│  ├─ addTaskDetail(subsystemIndex, taskType, initialData?)
│  ├─ removeTaskDetail(subsystemIndex, taskIndex)
│  │  └─ Usuwanie powiązanego CUID
│  ├─ handleKilometrazInput(subsystemIndex, taskIndex, value)
│  ├─ handleKilometrazBlur(subsystemIndex, taskIndex, value)
│  │  └─ formatKilometrazDisplay()
│  ├─ canProceedFromDetails(subsystemIndex) → boolean
│  ├─ loadContractDataForEdit(contract, setLoading, setError)
│  ├─ updateWizardData(updates)
│  ├─ updateSubsystem(index, updates)
│  ├─ updateInfrastructure(data)
│  ├─ updateTaskInfrastructure(taskNumber, data)
│  ├─ updateLogistics(data)
│  ├─ clearInfrastructure()
│  └─ clearLogistics()
│
└─ Utils (internal)
   ├─ getNumericValue(params, key)
   ├─ cleanKilometrazInput(value)
   └─ formatKilometrazDisplay(value)

3.3 TypeScript Types Flow
Code

wizard.types.ts
│
├─ WizardData
│  ├─ contractNumber: string
│  ├─ customName: string
│  ├─ orderDate: string
│  ├─ projectManagerId: string
│  ├─ managerCode: string
│  ├─ liniaKolejowa?: string
│  ├─ detectedRailwayLine?: string
│  ├─ subsystems: SubsystemWizardData[]
│  ├─ infrastructure?: InfrastructureData
│  └─ logistics?: Partial<LogisticsData>
│
├─ SubsystemWizardData
│  ├─ id?: number
│  ├─ type: SubsystemType
│  ├─ params: Record<string, number | boolean> | SmwWizardData
│  ├─ taskDetails?: TaskDetail[]
│  ├─ isExisting?: boolean
│  ├─ taskCount?: number
│  ├─ ipPool?: string
│  ├─ smwData?: SmwWizardData
│  └─ smwStep?: number
│
├─ TaskDetail
│  ├─ id?: number
│  ├─ taskWizardId?: string (UUID)
│  ├─ taskType: 'PRZEJAZD_KAT_A' | 'PRZEJAZD_KAT_B' | 'SKP' | 'NASTAWNIA' | 'LCS' | 'CUID' | ...
│  ├─ kilometraz?: string
│  ├─ kategoria?: 'KAT A' | 'KAT B' | 'KAT C' | 'KAT E' | 'KAT F'
│  ├─ nazwa?: string
│  ├─ miejscowosc?: string
│  ├─ liniaKolejowa?: string
│  ├─ gpsLatitude?: string
│  ├─ gpsLongitude?: string
│  ├─ googleMapsUrl?: string
│  ├─ hasCUID?: boolean
│  ├─ linkedLCSId?: string (UUID)
│  └─ fiberConnections?: FiberConnection[]
│
├─ InfrastructureData
│  ├─ global?: TaskInfrastructure
│  └─ perTask?: Record<string, TaskInfrastructure>
│
├─ TaskInfrastructure
│  ├─ taskNumber?: string
│  ├─ cabinetType?: CabinetOption
│  ├─ poles?: PoleConfig[]
│  ├─ terrainNotes?: string
│  └─ generateCabinetCompletion?: boolean
│
├─ LogisticsData
│  ├─ deliveryAddress: string (legacy)
│  ├─ deliveryAddresses?: DeliveryAddress[]
│  ├─ contactPhone: string
│  ├─ contactPerson?: string
│  ├─ shippingNotes?: string
│  ├─ preferredDeliveryDate?: string
│  └─ orderEmails?: OrderEmailsConfig
│
├─ OrderEmailsConfig
│  ├─ cameras?: string
│  ├─ switches?: string
│  ├─ recorders?: string
│  ├─ general?: string
│  ├─ warehouse?: string
│  └─ notes?: string
│
└─ GeneratedTask
   ├─ number: string
   ├─ name: string
   ├─ type: string
   └─ subsystemType: SubsystemType

3.4 Backend API Flow
Code

Frontend                         Backend
────────────────────────────────────────────────────────────────

[ContractWizardModal]
  │
  ├─ handleSubmit()
  │  │
  │  └─ POST /api/contracts/wizard
  │     │
  │     └─ [ContractController.ts]
  │        └─ createContractWithWizard()
  │           │
  │           ├─ 1. Validate data
  │           │  ├─ Required fields
  │           │  ├─ managerCode length (1-5)
  │           │  └─ Email formats
  │           │
  │           ├─ 2. Create contract
  │           │  └─ INSERT INTO contracts
  │           │
  │           ├─ 3. For each subsystem:
  │           │  ├─ CREATE subsystem
  │           │  ├─ CREATE tasks
  │           │  └─ IF generateCabinetCompletion:
  │           │     └─ CREATE KOMPLETACJA_SZAF task
  │           │
  │           ├─ 4. Save metadata
  │           │  ├─ Infrastructure (cabinetType, poles, terrainNotes)
  │           │  └─ Logistics (addresses, phone, orderEmails)
  │           │
  │           └─ 5. Return contract + tasks
  │
  └─ SUCCESS → SuccessStep

[InfrastructureStep]
  │
  └─ NetworkPoolFields
     │
     └─ POST /api/network/check-cidr
        │
        └─ [NetworkController.ts]
           └─ checkCIDRAvailability()
              ├─ Validate CIDR format
              ├─ Calculate gateway + mask
              └─ Check DB for conflicts

3.5 Component Tree (Visual)
Code

<ContractWizardModal>
  │
  ├─ <div className="wizard-steps">          ← Step indicator
  │  └─ {renderStepIndicator()}
  │
  ├─ {error && <div className="alert">}     ← Error message
  │
  ├─ {renderCurrentStep()}                   ← Dynamic step render
  │  │
  │  ├─ Step 1: <BasicDataStep>
  │  │  ├─ <input name="contractNumber" />
  │  │  ├─ <input name="customName" />
  │  │  ├─ <input type="date" name="orderDate" />
  │  │  ├─ <select name="projectManagerId" />
  │  │  └─ <input name="managerCode" maxLength={5} />
  │  │
  │  ├─ Step 2: <SubsystemSelectionStep>
  │  │  ├─ <div className="subsystems-list">
  │  │  │  └─ [map] <div className="subsystem-item">
  │  │  │     ├─ Icon + Label
  │  │  │     └─ <button onClick={onRemove}>Usuń</button>
  │  │  │
  │  │  └─ <div className="add-subsystem">
  │  │     ├─ <select> (unused types)
  │  │     └─ <button onClick={onAdd}>+ Dodaj</button>
  │  │
  │  ├─ Step 3..N: {renderConfigStep()}
  │  │  │
  │  │  ├─ SMOKIP_A: <SmokipAConfigStep>
  │  │  │  ├─ <input name="przejazdyKatA" type="number" />
  │  │  │  ├─ <input name="iloscSKP" type="number" />
  │  │  │  ├─ <input name="iloscNastawni" type="number" />
  │  │  │  ├─ <input name="hasLCS" type="number" />
  │  │  │  └─ <NetworkPoolFields>
  │  │  │     ├─ <input name="ipPool" placeholder="192.168.10.0/24" />
  │  │  │     ├─ <button onClick={validateCIDR}>Sprawdź</button>
  │  │  │     ├─ <input name="gatewayIP" readonly />
  │  │  │     └─ <input name="subnetMask" readonly />
  │  │  │
  │  │  ├─ SMOKIP_B: <SmokipBConfigStep>
  │  │  │  └─ (analogicznie)
  │  │  │
  │  │  ├─ SKD: <SkdConfigStep>
  │  │  │  ├─ <input name="iloscBudynkow" />
  │  │  │  └─ <input name="iloscKontenerow" />
  │  │  │
  │  │  └─ SMW: <SmwConfigStep>
  │  │     ├─ Sub-step 1: Basic
  │  │     │  ├─ <input name="iloscStacji" />
  │  │     │  ├─ <input name="iloscKontenerow" />
  │  │     │  ├─ <input type="checkbox" name="sokEnabled" />
  │  │     │  └─ <input type="checkbox" name="extraViewingEnabled" />
  │  │     ├─ Sub-step 2+: <SmwStationForm> (per station)
  │  │     ├─ Sub-step N: Platform cabinets
  │  │     ├─ Sub-step N+1: SOK config
  │  │     ├─ Sub-step N+2: Extra viewing
  │  │     └─ Sub-step N+3: LCS config
  │  │
  │  ├─ Step 3+..N+: {renderDetailsStep()}
  │  │  │
  │  │  ├─ SMOKIP_A: <SmokipADetailsStep>
  │  │  │  └─ [map taskDetails] <div className="task-card">
  │  │  │     │
  │  │  │     ├─ IF PRZEJAZD_KAT_A:
  │  │  │     │  ├─ <input name="liniaKolejowa" />
  │  │  │     │  ├─ <input name="kilometraz" required />
  │  │  │     │  ├─ <select name="kategoria" required />
  │  │  │     │  └─ <input name="googleMapsUrl" />
  │  │  │     │
  │  │  │     ├─ IF SKP:
  │  │  │     │  ├─ <input name="liniaKolejowa" />
  │  │  │     │  ├─ <input name="kilometraz" required />
  │  │  │     │  └─ <input name="googleMapsUrl" />
  │  │  │     │
  │  │  │     ├─ IF NASTAWNIA:
  │  │  │     │  ├─ <input name="nazwa" />
  │  │  │     │  ├─ <input name="miejscowosc" />
  │  │  │     │  ├─ <input name="kilometraz" />
  │  │  │     │  └─ <input name="googleMapsUrl" />
  │  │  │     │
  │  │  │     ├─ IF LCS:
  │  │  │     │  ├─ <input name="nazwa" />
  │  │  │     │  ├─ <input name="miejscowosc" />
  │  │  │     │  ├─ <input name="kilometraz" />
  │  │  │     │  ├─ <input name="googleMapsUrl" />
  │  │  │     │  └─ <input type="checkbox" name="hasCUID" />
  │  │  │     │     └─ (auto-creates CUID task)
  │  │  │     │
  │  │  │     └─ IF CUID:
  │  │  │        ├─ <input name="nazwa" disabled />
  │  │  │        ├─ <input name="miejscowosc" disabled />
  │  │  │        └─ (readonly, synced from LCS)
  │  │  │
  │  │  └─ <button onClick={onAddTask}>+ Dodaj nowe zadanie</button>
  │  │
  │  ├─ Step N+1: <InfrastructureStep>
  │  │  └─ [map infrastructureTasks] <div className="per-task-card">
  │  │     │
  │  │     ├─ <InfrastructureForm>
  │  │     │  │
  │  │     │  ├─ <select name="cabinetType">
  │  │     │  │  └─ (onChange sets generateCabinetCompletion flag)
  │  │     │  │
  │  │     │  ├─ <div className="infra-poles-section">
  │  │     │  │  ├─ [map poles] <div className="pole-config-item">
  │  │     │  │  │  ├─ <select name="type"> (STALOWY, KOMPOZYT, INNY)
  │  │     │  │  │  ├─ <input name="quantity" type="number" />
  │  │     │  │  │  ├─ <input name="productInfo" />
  │  │     │  │  │  ├─ <button onClick={openPoleSearch}>🔍 Magazyn</button>
  │  │     │  │  │  └─ <button onClick={removePole}>🗑️ Usuń</button>
  │  │     │  │  └─ <button onClick={addPole}>+ Dodaj typ słupa</button>
  │  │     │  │
  │  │     │  └─ <textarea name="terrainNotes" />
  │  │     │
  │  │     └─ {showCabinetNotice && <div className="alert alert-info">
  │  │           ✅ Zadanie KOMPLETACJA_SZAF zostanie utworzone
  │  │        </div>}
  │  │
  │  ├─ Step N+2: <LogisticsStep>
  │  │  │
  │  │  ├─ <div className="form-section"> 📦 Adresy dostawy
  │  │  │  ├─ [map deliveryAddresses] <div className="delivery-address-item">
  │  │  │  │  ├─ <textarea name="address" required />
  │  │  │  │  ├─ <input type="date" name="preferredDeliveryDate" />
  │  │  │  │  ├─ <textarea name="shippingNotes" />
  │  │  │  │  ├─ <div className="task-selection-grid">
  │  │  │  │  │  └─ [map allTasks] <label className="checkbox-item">
  │  │  │  │  │     ├─ <input type="checkbox" />
  │  │  │  │  │     └─ {task.type} – {task.name}
  │  │  │  │  └─ <button onClick={removeAddress}>🗑️ Usuń</button>
  │  │  │  └─ <button onClick={addAddress}>+ Dodaj adres dostawy</button>
  │  │  │
  │  │  ├─ <div className="form-section"> 📞 Dane kontaktowe
  │  │  │  ├─ <input type="tel" name="contactPhone" required />
  │  │  │  │  └─ (onBlur: auto-format to +48-XXX-XXX-XXX)
  │  │  │  └─ <input name="contactPerson" />
  │  │  │
  │  │  └─ <div className="form-section"> 📧 Adresy e-mail dla zamówień
  │  │     ├─ <input type="email" name="orderEmails.cameras" />
  │  │     ├─ <input type="email" name="orderEmails.switches" />
  │  │     ├─ <input type="email" name="orderEmails.recorders" />
  │  │     ├─ <input type="email" name="orderEmails.general" />
  │  │     ├─ <input type="email" name="orderEmails.warehouse" />
  │  │     │  └─ (warning: nie tworzy użytkownika w systemie)
  │  │     └─ <textarea name="orderEmails.notes" />
  │  │
  │  ├─ Step N+3: <PreviewStep>
  │  │  │
  │  │  ├─ <div className="preview-section"> Dane podstawowe
  │  │  │  ├─ Numer kontraktu: {wizardData.contractNumber}
  │  │  │  ├─ Nazwa: {wizardData.customName}
  │  │  │  ├─ Data zamówienia: {wizardData.orderDate}
  │  │  │  ├─ Kierownik: {projectManager.name} ({wizardData.managerCode})
  │  │  │  └─ Linia kolejowa: {wizardData.liniaKolejowa}
  │  │  │
  │  │  └─ [map subsystems] <div className="preview-subsystem">
  │  │     ├─ <h4>{config.label}</h4>
  │  │     ├─ Parametry: {JSON.stringify(subsystem.params)}
  │  │     └─ <div className="preview-tasks">
  │  │        └─ [map tasks] <div className="preview-task">
  │  │           ├─ {task.type}
  │  │           ├─ {task.name}
  │  │           └─ {task.id ? '✅ Istniejące' : '🆕 Nowe'}
  │  │
  │  └─ Step N+4: <SuccessStep>
  │     │
  │     ├─ <div className="success-message">
  │     │  ✅ Kontrakt {wizardData.contractNumber} utworzony pomyślnie!
  │     │
  │     ├─ <div className="success-details">
  │     │  ├─ Liczba zadań: {generatedTasks.length}
  │     │  └─ [map generatedTasks] <div>{task.name}</div>
  │     │
  │     └─ <div className="modal-footer">
  │        ├─ <button onClick={onClose}>Zamknij</button>
  │        └─ <button onClick={onRequestShipping}>📦 Zlecenie wysyłki</button>
  │
  └─ <div className="modal-footer">                     ← Navigation
     ├─ {currentStep > 1 && <button onClick={handlePrevStep}>← Wstecz</button>}
     ├─ {isDraftStep && <button onClick={saveDraft}>💾 Zapisz draft</button>}
     └─ <button onClick={handleNextStep} disabled={!canProceed}>Dalej →</button>

4. ROZBIEŻNOŚCI MIĘDZY SPECYFIKACJĄ A IMPLEMENTACJĄ
4.1 TABELA PORÓWNAWCZA
#	Element	Specyfikacja (wizard-specyfikacja(1).md)	Implementacja (kod)	Status	Priorytet naprawy
1	Nazewnictwo zmiennej				
1.1	Uwagi terenowe	fieldNotes	terrainNotes	⚠️ Niespójne	🟡 Średni
2	Typy szaf				
2.1	Opcje enum	Kontener, Zewnętrzna, 24U, 48U, Inna	KONTENER, SZAFA_TERENOWA, SZAFA_WEWNETRZNA, 42U, 24U	⚠️ Różne wartości	🟢 Niski
3	Słupy - stare pola				
3.1	Pojedyncze pola	poleQuantity: number, poleType: string, poleProductInfo: string	poles: PoleConfig[] (tablica obiektów)	✅ Zaimplementowane	✅ OK
3.2	Backward compatibility	Brak	Backend wspiera oba formaty (legacy + nowy)	✅ Dodane	✅ OK
4	Krok 7 - BOM/Kamery				
4.1	Istnienie kroku	✅ Wymagany (Krok 7)	❌ Brak implementacji	❌ Brakuje	🔴 Wysoki
4.2	Tabela kamer	cameras: [{ type, quantity, quantityPerPole }]	❌ Brak	❌ Brakuje	🔴 Wysoki
4.3	Ilość dni zapisu	recordingDays: number	❌ Brak	❌ Brakuje	🔴 Wysoki
4.4	Filtrowanie zadań	Tylko Przejazd KAT A i SKP	N/A	❌ Brakuje	🔴 Wysoki
5	PreviewStep - podsumowanie				
5.1	Podsumowanie infrastruktury	Typy szaf i ich liczba	❌ Brak	⚠️ Częściowe	🟡 Średni
5.2	Podsumowanie logistyki	Adresy, telefon, e-maile	❌ Brak	⚠️ Częściowe	🟡 Średni
5.3	Podsumowanie kamer	Konfiguracja per zadanie	❌ Brak	❌ Brakuje	🔴 Wysoki
6	Auto-formatowanie				
6.1	Telefon	✅ Tak	✅ Zaimplementowane	✅ OK	✅ OK
6.2	Kilometraż	✅ Tak (XXX,XXX)	✅ Zaimplementowane	✅ OK	✅ OK
7	Draft save				
7.1	Auto-save	⚠️ Nie opisane w specyfikacji	✅ Zaimplementowane (co 5s)	✅ Dodane	✅ OK
7.2	Restore modal	⚠️ Nie opisane	✅ Zaimplementowane	✅ Dodane	✅ OK
8	Walidacja				
8.1	Centralna klasa	⚠️ Nie opisane	❌ Rozproszona w komponentach	⚠️ Wymaga refaktoringu	🟡 Średni
8.2	Komunikaty błędów	⚠️ Nie opisane	✅ Zaimplementowane (spread)	⚠️ Niespójne	🟡 Średni
4.2 SZCZEGÓŁOWY OPIS ROZBIEŻNOŚCI
❌ ROZBIEŻNOŚĆ #1: Nazewnictwo terrainNotes vs fieldNotes

Specyfikacja:
TypeScript

export interface TaskInfrastructure {
  // ...
  fieldNotes?: string;  // Uwagi terenowe
}

Implementacja:
TypeScript

export interface TaskInfrastructure {
  // ...
  terrainNotes?: string;  // ← INNA NAZWA
}

Wpływ:

    ⚠️ Niespójność z dokumentacją
    ⚠️ Potencjalne problemy przy integracji z backend (jeśli API oczekuje fieldNotes)

Rekomendacja:

    🔄 Zmienić na fieldNotes w całym kodzie
    🔄 Lub zaktualizować specyfikację do terrainNotes

Miejsca do zmiany:

    frontend/src/components/contracts/wizard/types/wizard.types.ts:65
    frontend/src/components/contracts/wizard/steps/InfrastructureStep.tsx:157
    backend/src/controllers/ContractController.ts (jeśli używa tego pola)

⚠️ ROZBIEŻNOŚĆ #2: Typy szaf - różne wartości enum

Specyfikacja:
Code

Kontener, Zewnętrzna, 24U, 48U, Inna

Implementacja:
TypeScript

type CabinetOption = 
  | 'SZAFA_TERENOWA'    // ← Odpowiednik "Zewnętrzna"?
  | 'SZAFA_WEWNETRZNA'  // ← Nie w specyfikacji
  | 'KONTENER'          // ← OK (wielka litera)
  | '42U'               // ← 42U zamiast 48U
  | '24U';              // ← OK

Różnice:

    Brak wartości Zewnętrzna → zastąpiona przez SZAFA_TERENOWA
    Brak wartości Inna → zastąpiona przez 42U?
    Brak wartości 48U → jest 42U
    Dodatkowa wartość SZAFA_WEWNETRZNA (nie w specyfikacji)

Wpływ:

    🟢 Niski - wartości enum są tylko w frontendzie
    ⚠️ Jeśli backend lub BOM Templates używają tych wartości, może być problem

Rekomendacja:

    ✅ Zachować obecne wartości (breaking change w bazie danych)
    📝 Zaktualizować specyfikację do obecnych wartości
    📝 Stworzyć mapowanie dla czytelności:

TypeScript

const CABINET_LABELS: Record<CabinetOption, string> = {
  'SZAFA_TERENOWA': 'Szafa terenowa (zewnętrzna)',
  'SZAFA_WEWNETRZNA': 'Szafa wewnętrzna',
  'KONTENER': 'Kontener',
  '42U': 'Szafa 42U',
  '24U': 'Szafa 24U'
};

❌ ROZBIEŻNOŚĆ #3: Brak kroku 7 - Konfiguracja BOM/Kamery

Specyfikacja (Krok 7):
Markdown

## Krok 7 – Konfiguracja BOM / kamery

Dla każdego zadania Przejazd KAT A i SKP wyświetlana jest karta z:

#### Tabela kamer
Trzy kolumny: **Typ kamery** | **Ilość** | **Ilość na słupie (punkcie kamerowym)**.
- Dostępne typy: `Ogólna`, `LPR`, `SKP`.

#### Ilość dni zapisu
Pole liczbowe. Domyślna wartość z szablonu BOM (np. `30`).

Implementacja:

    ❌ BRAK KROKU 7
    ❌ Brak komponentu BomCameraConfigStep.tsx
    ❌ Brak pola cameraConfig w TaskDetail

Wpływ:

    🔴 WYSOKI - kluczowa funkcjonalność z specyfikacji
    ❌ Brak możliwości konfiguracji kamer per zadanie
    ❌ Brak kalkulacji liczby słupów na podstawie kamer
    ❌ Brak integracji z BOM Templates

Istniejące komponenty BOM: ✅ System MA już infrastrukturę BOM:

    RecorderSpecification (rejestry kamer)
    DiskSpecification (dyski do zapisu)
    DiskConfigurationService.calculateRequiredStorage() (kalkulacja)
    BOM Templates (szablony materiałów)

Co trzeba dodać:

    ❌ Komponent BomCameraConfigStep.tsx
    ❌ Komponent CameraConfigCard.tsx
    ❌ Komponent CameraTable.tsx
    ❌ Rozszerzenie TaskDetail:
	
    TypeScript

    interface CameraConfig {
      cameras: Array<{
        type: 'Ogólna' | 'LPR' | 'SKP';
        quantity: number;
        quantityPerPole: number;
      }>;
      recordingDays: number;
    }

    interface TaskDetail {
      // ... existing fields
      cameraConfig?: CameraConfig;  // ← NOWE
    }

    ❌ Integracja w ContractWizardModal.tsx (dodanie kroku 7 przed Preview)
    ❌ Backend - zapisywanie cameraConfig w metadata
    ❌ Backend - kalkulacja rejestratorów i dysków na podstawie kamer

Rekomendacja:

    🔴 Priorytet WYSOKI - zaimplementować zgodnie z planem z dokumentu PLAN_REFAKTORINGU_WIZARDA.md → Faza 1 (Nowa)

⚠️ ROZBIEŻNOŚĆ #4: PreviewStep - brak rozszerzonych podsumowań

Specyfikacja:
Markdown

Po uzupełnieniu kroku 7 wyświetlane jest pełne podsumowanie całego kontraktu:
- Numer i nazwa kontraktu
- Podsystem i linia kolejowa
- Łączna liczba wszystkich zadań (podstawowe + CUID + kompletacja)
- **Typy szaf i ich liczba**              ← BRAK
- **Konfiguracja kamer dla każdego zadania** ← BRAK
- **Adres dostawy i kontakt**             ← BRAK

Implementacja: PreviewStep.tsx ma tylko podstawowe podsumowanie:

    ✅ Numer i nazwa kontraktu
    ✅ Podsystem i linia kolejowa
    ✅ Lista zadań
    ❌ Typy szaf (nie pokazuje)
    ❌ Konfiguracja kamer (nie ma kroku 7)
    ❌ Szczegóły logistyki (nie pokazuje)

Wpływ:

    🟡 Średni - użytkownik nie widzi pełnego podsumowania przed zapisem

Rekomendacja:

    Dodać sekcje podsumowania w PreviewStep.tsx:

TypeScript

// Dodać w PreviewStep.tsx:

{/* Podsumowanie infrastruktury */}
<div className="preview-section">
  <h4>⚙️ Infrastruktura</h4>
  {getCabinetTypeSummary(wizardData).map(({ type, count }) => (
    <div key={type}>{type}: <strong>{count}</strong> zadań</div>
  ))}
</div>

{/* Podsumowanie logistyki */}
<div className="preview-section">
  <h4>📦 Logistyka</h4>
  <p>Telefon: <strong>{wizardData.logistics?.contactPhone}</strong></p>
  <p>Adresy dostawy: <strong>{wizardData.logistics?.deliveryAddresses?.length || 0}</strong></p>
</div>

{/* Podsumowanie kamer (gdy Krok 7 będzie zrobiony) */}
<div className="preview-section">
  <h4>📹 Konfiguracja kamer</h4>
  {getCameraConfigSummary(wizardData).map(taskSummary => (
    <div key={taskSummary.taskId}>
      <h5>{taskSummary.taskName}</h5>
      {taskSummary.cameras.map(cam => (
        <div key={cam.type}>
          {cam.type}: {cam.quantity} szt. ({cam.quantityPerPole} na słupie)
        </div>
      ))}
      <div>Dni zapisu: <strong>{taskSummary.recordingDays}</strong></div>
    </div>
  ))}
</div>

⚠️ ROZBIEŻNOŚĆ #5: Walidacja rozproszona

Specyfikacja:

    ⚠️ Nie opisuje architektury walidacji

Implementacja:

    ❌ Walidacja rozproszona w wielu miejscach:
        ContractWizardModal.tsx → getValidationHint()
        useWizardState.ts → canProceedFromDetails()
        LogisticsStep.tsx → inline walidacja
        ShipmentWizardSmokA.tsx → validateStep1(), validateStep2()
        ShipmentWizardSmokB.tsx → validateStep1(), validateStep2()

Wpływ:

    ⚠️ Średni - trudne utrzymanie, duplikacja kodu
    ⚠️ Niespójne komunikaty błędów

Rekomendacja:

    Stworzyć centralną klasę WizardValidator (opisana w PLAN_REFAKTORINGU_WIZARDA.md)

✅ CO JEST ZAIMPLEMENTOWANE POPRAWNIE

    ✅ Krok 1: Dane podstawowe - w pełni zgodne
    ✅ Krok 2: Wybór podsystemów - w pełni zgodne
    ✅ Krok 3: Konfiguracja + pola IP/CIDR - w pełni zgodne
    ✅ Krok 4: Szczegóły zadań + checkbox CUiD - w pełni zgodne
    ✅ Krok 5: Infrastruktura (szafa, słupy, uwagi) - w pełni zgodne
    ✅ Krok 6: Logistyka (adresy, telefon, e-maile) - w pełni zgodne
    ✅ Auto-formatowanie telefonu - działa poprawnie
    ✅ Auto-formatowanie kilometraża - działa poprawnie
    ✅ Auto-sync LCS ↔ CUID - działa poprawnie
    ✅ Draft save/restore - dodane (nie w specyfikacji, ale przydatne)

4.3 PRIORYTETYZACJA ROZBIEŻNOŚCI
🔴 PRIORYTET WYSOKI (MUST FIX)

    Brak kroku 7 - BOM/Kamery
        Impact: Kluczowa funkcjonalność
        Effort: 4-5 dni
        Decyzja: Zaimplementować

🟡 PRIORYTET ŚREDNI (SHOULD FIX)

    Walidacja rozproszona
        Impact: Jakość kodu, utrzymanie
        Effort: 2 dni
        Decyzja: Refaktorować

    Brak rozszerzonych podsumowań w Preview
        Impact: UX
        Effort: 1-2 dni
        Decyzja: Dodać

    Nazewnictwo terrainNotes vs fieldNotes
        Impact: Spójność dokumentacji
        Effort: 1 dzień
        Decyzja: Zmienić na fieldNotes

🟢 PRIORYTET NISKI (NICE TO HAVE)

    Typy szaf - różne wartości
        Impact: Tylko dokumentacja
        Effort: 30 min
        Decyzja: Zaktualizować specyfikację

5. STRUKTURA DANYCH (TYPESCRIPT INTERFACES)
5.1 Core Types
TypeScript

// ══════════════════════════════════════════════════════════════
// FILE: frontend/src/components/contracts/wizard/types/wizard.types.ts
// ══════════════════════════════════════════════════════════════

/**
 * Main wizard data structure
 */
export interface WizardData {
  contractNumber: string;              // Auto-generated or custom
  customName: string;                  // Contract name (required)
  orderDate: string;                   // ISO date format (required)
  projectManagerId: string;            // User ID (required)
  managerCode: string;                 // 1-5 chars (required)
  liniaKolejowa?: string;              // Railway line (e.g. "LK-007")
  detectedRailwayLine?: string;        // Auto-detected railway line
  subsystems: SubsystemWizardData[];   // Array of subsystems
  infrastructure?: InfrastructureData; // Per-task infrastructure config
  logistics?: Partial<LogisticsData>;  // Shipping/contact data
}

/**
 * Subsystem configuration
 */
export interface SubsystemWizardData {
  id?: number;                         // DB ID (edit mode)
  type: SubsystemType;                 // Subsystem type enum
  params: Record<string, number | boolean> | SmwWizardData;
  taskDetails?: TaskDetail[];          // Array of tasks (SMOK only)
  isExisting?: boolean;                // Flag for edit mode
  taskCount?: number;                  // Number of existing tasks
  ipPool?: string;                     // CIDR notation (e.g. "192.168.10.0/24")
  smwData?: SmwWizardData;             // SMW-specific data
  smwStep?: number;                    // SMW internal step number
}

/**
 * Task detail (used in Details step)
 */
export interface TaskDetail {
  id?: number;                         // DB ID (edit mode)
  taskWizardId?: string;               // UUID for LCS-CUID linking
  taskType: 'PRZEJAZD_KAT_A' | 'PRZEJAZD_KAT_B' | 'SKP' | 'NASTAWNIA' | 'LCS' | 'CUID' | 'SMW_PLATFORM' | 'SMW_SOK' | 'SMW_LCS' | 'SMW_EXTRA_VIEWING';
  
  // Common fields
  liniaKolejowa?: string;              // Railway line (auto-filled from step 1)
  googleMapsUrl?: string;              // Google Maps URL (extracts GPS)
  gpsLatitude?: string;                // Parsed from googleMapsUrl
  gpsLongitude?: string;               // Parsed from googleMapsUrl
  
  // PRZEJAZD_* / SKP specific
  kilometraz?: string;                 // Format: "XXX,XXX" (required for PRZEJAZD, SKP)
  kategoria?: 'KAT A' | 'KAT B' | 'KAT C' | 'KAT E' | 'KAT F'; // Required for PRZEJAZD
  
  // NASTAWNIA / LCS / CUID specific
  nazwa?: string;                      // Name (e.g. "LCS Warszawa")
  miejscowosc?: string;                // Location/city
  
  // LCS → CUID linking
  hasCUID?: boolean;                   // Checkbox in LCS task → auto-creates CUID
  linkedLCSId?: string;                // UUID linking CUID to parent LCS
  
  // SMW specific
  smwCabinets?: Array<{ type: string; name: string }>;
  
  // Fiber connections (advanced)
  fiberConnections?: FiberConnection[];
}

/**
 * Infrastructure configuration per task
 */
export interface TaskInfrastructure {
  taskNumber?: string;                 // Task key (e.g. "SMOKIP_A-0")
  cabinetType?: CabinetOption;         // Cabinet type enum
  poles?: PoleConfig[];                // Array of pole configs
  terrainNotes?: string;               // Field notes (spec: fieldNotes)
  generateCabinetCompletion?: boolean; // Flag for auto-creating KOMPLETACJA_SZAF
}

export type CabinetOption = 'SZAFA_TERENOWA' | 'SZAFA_WEWNETRZNA' | 'KONTENER' | '42U' | '24U';
export type PoleType = 'STALOWY' | 'KOMPOZYT' | 'INNY';

export interface PoleConfig {
  type?: PoleType;                     // Pole type
  quantity?: string;                   // Number of poles (string to allow empty)
  productInfo?: string;                // Catalog number | Product name
}

export interface InfrastructureData {
  global?: TaskInfrastructure;         // Global config (unused currently)
  perTask?: Record<string, TaskInfrastructure>; // Per-task config
}

/**
 * Logistics/shipping data
 */
export interface LogisticsData {
  // Legacy single address (backward compatible)
  deliveryAddress?: string;            // OLD: single address
  
  // New multi-address format
  deliveryAddresses?: DeliveryAddress[];
  
  // Contact info
  contactPhone: string;                // Required, auto-formatted to +48-XXX-XXX-XXX
  contactPerson?: string;              // Optional
  
  // Optional fields
  shippingNotes?: string;              // General shipping notes
  preferredDeliveryDate?: string;      // ISO date
  
  // Order emails (all optional)
  orderEmails?: OrderEmailsConfig;
}

export interface DeliveryAddress {
  address: string;                     // Full postal address (required)
  taskIds: string[];                   // Array of task keys (e.g. ["SMOKIP_A-0"])
  preferredDeliveryDate?: string;      // Per-address date
  shippingNotes?: string;              // Per-address notes
}

export interface OrderEmailsConfig {
  cameras?: string;                    // Email for camera orders
  switches?: string;                   // Email for switch/network orders
  recorders?: string;                  // Email for recorder orders
  general?: string;                    // Email for general orders (cables, accessories)
  warehouse?: string;                  // Warehouse person email (NOT a system user)
  notes?: string;                      // Additional notes
}

/**
 * Generated task (for preview/submission)
 */
export interface GeneratedTask {
  number: string;                      // Task number (empty until backend assigns)
  name: string;                        // Task display name
  type: string;                        // Task type (variant-resolved)
  subsystemType: SubsystemType;        // Parent subsystem type
}

/**
 * Step info (for navigation)
 */
export interface StepInfo {
  type: 'basic' | 'selection' | 'config' | 'details' | 'infrastructure' | 'logistics' | 'preview' | 'success' | 'shipping';
  subsystemIndex?: number;             // Index for config/details steps
  subsystemType?: SubsystemType;       // Type for subsystem-specific steps
}

5.2 Subsystem Types
TypeScript

// ══════════════════════════════════════════════════════════════
// FILE: frontend/src/config/subsystemWizardConfig.ts
// ══════════════════════════════════════════════════════════════

export type SubsystemType = 
  | 'SMOKIP_A'      // SMOK-A (przejazdy KAT A)
  | 'SMOKIP_B'      // SMOK-B (przejazdy KAT B)
  | 'SKD'           // Systemy Kontroli Dostępu
  | 'SSWIN'         // Systemy Sygnalizacji Włamania i Napadu
  | 'CCTV'          // Kamery CCTV
  | 'SMW'           // System Monitoringu Wizyjnego
  | 'SDIP'          // System Detekcji i Pożaru
  | 'SUG'           // System Uszczelniania Granic
  | 'SSP'           // System Sygnalizacji Pożaru
  | 'LAN'           // Sieci LAN
  | 'OTK'           // Odbiorczy Test Kwalifikacyjny
  | 'ZASILANIE';    // Systemy zasilania

/**
 * SMW-specific multi-step wizard data
 */
export interface SmwWizardData {
  // Step 1: Basic config
  iloscStacji: number;                 // Number of stations
  iloscKontenerow: number;             // Number of containers
  sokEnabled: boolean;                 // SOK checkbox
  extraViewingEnabled: boolean;        // Extra viewing checkbox
  
  // Step 2+: Dynamic based on counts
  stations: SmwStation[];              // Array of station configs
  sokConfig?: {                        // SOK configuration (if enabled)
    nameAddress: string;
    cabinets: SmwCabinet[];
  };
  extraViewingConfig?: {               // Extra viewing config (if enabled)
    nameAddress: string;
    cabinets: SmwCabinet[];
  };
  lcsConfig: {                         // LCS configuration (always present)
    cabinets: SmwCabinet[];
  };
}

export interface SmwStation {
  nameAddress: string;                 // Station name and address
  platformCabinets: SmwCabinet[];      // Platform cabinet configs
}

export interface SmwCabinet {
  type: string;                        // Cabinet type (e.g. "42U", "24U")
  name: string;                        // Cabinet name
}

6. FLOWCHART PRZEPŁYWU DANYCH
6.1 User Interaction Flow
Code

┌─────────────────────────────────────────────────────────────────┐
│                         USER STARTS                             │
│                 Clicks "Utwórz kontrakt"                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: BasicDataStep                                           │
├─────────────────────────────────────────────────────────────────┤
│ User fills:                                                      │
│  • customName ───────────► detectSubsystems() ───┐             │
│  • orderDate             │                        │             │
│  • projectManagerId      └─► detectRailwayLine() │             │
│  • managerCode                                    │             │
│                                                   ▼             │
│ Auto-filled:                                                     │
│  • contractNumber (empty → backend generates)                   │
│  • detectedSubsystems[] ◄────────────────────────┘             │
│  • liniaKolejowa (e.g. "LK-007")                               │
└────────────────────────┬────────────────────────────────────────┘
                         │ Kliknij "Dalej"
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: SubsystemSelectionStep                                  │
├─────────────────────────────────────────────────────────────────┤
│ Displays:                                                        │
│  • List of detectedSubsystems (from step 1)                     │
│                                                                  │
│ User can:                                                        │
│  • Remove subsystem (if not isExisting with taskCount > 0)     │
│  • Add subsystem (from dropdown of unused types)               │
│                                                                  │
│ Validation:                                                      │
│  • subsystems.length > 0 ───► canProceed = true                │
└────────────────────────┬────────────────────────────────────────┘
                         │ Kliknij "Dalej"
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3..N: Config Steps (per subsystem)                         │
├─────────────────────────────────────────────────────────────────┤
│ For each subsystem:                                              │
│                                                                  │
│ IF SMOKIP_A:                                                     │
│  ├─ User fills: przejazdyKatA, iloscSKP, iloscNastawni, hasLCS│
│  └─ Optional: ipPool (CIDR) ───► Validate CIDR ───┐           │
│                                                     │           │
│ IF SMOKIP_B:                                        │           │
│  ├─ User fills: przejazdyKatB, iloscSKP, ...      │           │
│  └─ Optional: ipPool                               │           │
│                                                     ▼           │
│ IF SKD:                                                          │
│  └─ User fills: iloscBudynkow, iloscKontenerow                 │
│                                                                  │
│ IF SMW: (multi-step internal wizard)                            │
│  ├─ Step 1: iloscStacji, iloscKontenerow, checkboxes          │
│  ├─ Step 2+: Per-station forms                                │
│  ├─ Step N: Platform cabinets                                  │
│  ├─ Step N+1: SOK config (if enabled)                         │
│  ├─ Step N+2: Extra viewing (if enabled)                      │
│  └─ Step N+3: LCS config                                       │
│                                                                  │
│ ... (other subsystems)                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │ Kliknij "Dalej"
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3+..N+: Details Steps (ONLY SMOKIP_A/B)                    │
├─────────────────────────────────────────────────────────────────┤
│ System calls: initializeTaskDetails(subsystemIndex)             │
│  │                                                               │
│  └─► Generates TaskDetail[] based on params from config step   │
│                                                                  │
│ User sees: List of generated tasks                              │
│                                                                  │
│ For each task:                                                   │
│  ├─ IF PRZEJAZD_KAT_A/B:                                        │
│  │   ├─ liniaKolejowa (auto-filled, editable)                  │
│  │   ├─ kilometraz (REQUIRED) ──► formatKilometrazDisplay()   │
│  │   ├─ kategoria (REQUIRED)                                    │
│  │   └─ googleMapsUrl ──► extractGPS() ──► gpsLatitude/Long   │
│  │                                                               │
│  ├─ IF SKP:                                                      │
│  │   ├─ liniaKolejowa                                           │
│  │   ├─ kilometraz (REQUIRED)                                   │
│  │   └─ googleMapsUrl                                           │
│  │                                                               │
│  ├─ IF NASTAWNIA:                                                │
│  │   ├─ nazwa, miejscowosc, kilometraz, googleMapsUrl          │
│  │                                                               │
│  ├─ IF LCS:                                                      │
│  │   ├─ nazwa, miejscowosc, kilometraz, googleMapsUrl          │
│  │   └─ hasCUID (checkbox) ───► IF TRUE:                       │
│  │      └─ Auto-creates CUID task ───┐                         │
│  │          • linkedLCSId = LCS.taskWizardId                    │
│  │          • Inherits: nazwa, miejscowosc, GPS                │
│  │                                      │                        │
│  └─ IF CUID:                            │                        │
│      ├─ nazwa (readonly, synced) ◄─────┘                       │
│      ├─ miejscowosc (readonly, synced)                          │
│      └─ linkedLCSId (hidden)                                    │
│                                                                  │
│ User can:                                                        │
│  • Edit any field                                                │
│  • Add new task manually (+ Dodaj nowe zadanie)                │
│  • Remove task (🗑️) ──► IF LCS: also removes linked CUID      │
│                                                                  │
│ Validation:                                                      │
│  • PRZEJAZD: kilometraz && kategoria required                   │
│  • SKP: kilometraz required                                     │
│  • Others: all fields optional                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │ Kliknij "Dalej"
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP N+1: InfrastructureStep (OPTIONAL)                         │
├─────────────────────────────────────────────────────────────────┤
│ System calls: generateAllTasks(subsystems, liniaKolejowa)       │
│  │                                                               │
│  └─► Filters tasks where type in [SMOKIP_A, SMOKIP_B, LCS,     │
│      NASTAWNIA, SKP]                                             │
│                                                                  │
│ For each filtered task:                                          │
│  ├─ User selects:                                                │
│  │   • cabinetType ──► IF requiresCabinetCompletion(taskType): │
│  │   │                  └─ Set generateCabinetCompletion=true   │
│  │   │                  └─ Show notification:                   │
│  │   │                     "✅ KOMPLETACJA_SZAF zostanie        │
│  │   │                      utworzone"                          │
│  │   │                                                           │
│  │   • poles[] (dynamic table):                                 │
│  │     ├─ type (STALOWY, KOMPOZYT, INNY)                       │
│  │     ├─ quantity                                               │
│  │     └─ productInfo ◄─── PoleSearchModal (🔍 Magazyn)        │
│  │                                                               │
│  │   • terrainNotes (textarea)                                  │
│  │                                                               │
│  └─ Saved to: wizardData.infrastructure.perTask[taskKey]       │
│                                                                  │
│ Validation: NONE (all optional)                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │ Kliknij "Dalej"
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP N+2: LogisticsStep                                         │
├─────────────────────────────────────────────────────────────────┤
│ User fills:                                                      │
│                                                                  │
│ 1. Adresy dostawy:                                               │
│    ├─ [+ Dodaj adres dostawy] ───► deliveryAddresses[]         │
│    └─ Per address:                                               │
│       ├─ address (REQUIRED)                                     │
│       ├─ taskIds[] (checkboxes - all tasks by default)         │
│       ├─ preferredDeliveryDate (optional)                       │
│       └─ shippingNotes (optional)                               │
│                                                                  │
│ 2. Dane kontaktowe:                                              │
│    ├─ contactPhone (REQUIRED) ──► onBlur:                      │
│    │   └─ formatPhoneNumber() ───► "+48-XXX-XXX-XXX"          │
│    └─ contactPerson (optional)                                  │
│                                                                  │
│ 3. Adresy e-mail (ALL OPTIONAL):                                │
│    ├─ orderEmails.cameras                                       │
│    ├─ orderEmails.switches                                      │
│    ├─ orderEmails.recorders                                     │
│    ├─ orderEmails.general                                       │
│    ├─ orderEmails.warehouse ⚠️ Warning: not a system user      │
│    └─ orderEmails.notes                                         │
│                                                                  │
│ Validation:                                                      │
│  • deliveryAddresses.length > 0 OR legacyAddress exists        │
│  • contactPhone.trim() not empty                                │
│  • contactPhone format: 9 digits or 11 with +48                │
│  • orderEmails: valid email format (if provided)               │
└────────────────────────┬────────────────────────────────────────┘
                         │ Kliknij "Dalej"
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP N+3: PreviewStep                                           │
├─────────────────────────────────────────────────────────────────┤
│ Displays:                                                        │
│  • Contract basic data                                           │
│  • Subsystems with params                                       │
│  • Generated tasks (grouped by subsystem)                       │
│    ├─ IF task.id exists: "✅ Istniejące"                       │
│    └─ ELSE: "🆕 Nowe"                                           │
│                                                                  │
│ ⚠️ Missing (TODO):                                              │
│  • Infrastructure summary (cabinet types, pole counts)          │
│  • Logistics summary (addresses, phone, emails)                │
│  • Camera config summary (when Step 7 implemented)             │
└────────────────────────┬────────────────────────────────────────┘
                         │ Kliknij "Utwórz kontrakt" / "Zapisz zmiany"
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SUBMIT: handleSubmit()                                           │
├─────────────────────────────────────────────────────────────────┤
│ Frontend:                                                        │
│  1. Validate all data (validateSubsystemsForSave())             │
│  2. Build payload:                                               │
│     ├─ Basic data (contractNumber, customName, ...)            │
│     ├─ subsystems[] with taskDetails[]                          │
│     ├─ infrastructure.perTask{}                                 │
│     └─ logistics                                                 │
│  3. POST /api/contracts/wizard                                  │
│                                                                  │
│ Backend (ContractController.ts):                                │
│  1. Validate request                                             │
│     ├─ Required fields                                           │
│     ├─ managerCode length (1-5)                                 │
│     └─ Email formats                                             │
│  2. Create/update contract                                       │
│  3. For each subsystem:                                          │
│     ├─ Create/update subsystem record                           │
│     ├─ Create tasks from taskDetails[]                          │
│     ├─ IF generateCabinetCompletion:                            │
│     │   └─ Create KOMPLETACJA_SZAF task                         │
│     └─ Save metadata (infrastructure, logistics)                │
│  4. Return: contract + created tasks                            │
│                                                                  │
│ Frontend receives:                                               │
│  ├─ createdContractId                                            │
│  ├─ createdContract                                              │
│  └─ generatedTasks[]                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP N+4: SuccessStep                                           │
├─────────────────────────────────────────────────────────────────┤
│ Displays:                                                        │
│  • ✅ Success message                                            │
│  • Contract number                                               │
│  • Number of created tasks                                       │
│  • List of tasks with links                                     │
│                                                                  │
│ User can:                                                        │
│  • Close wizard                                                  │
│  • Request shipping (→ ShipmentWizardStep)                      │
│  • Complete installation tasks (per task)                       │
└─────────────────────────────────────────────────────────────────┘

6.2 Data Mutation Flow
Code

┌──────────────────────────────────────────────────────────────────┐
│ DATA STATE MUTATIONS (wizardData)                               │
└──────────────────────────────────────────────────────────────────┘

[Initial State]
wizardData = {
  contractNumber: '',
  customName: '',
  orderDate: '',
  projectManagerId: '',
  managerCode: '',
  subsystems: [],
  infrastructure: undefined,
  logistics: undefined
}

                         │
                         ▼ [Step 1: BasicDataStep]
                         │ onUpdate({ customName, orderDate, ... })
                         ▼
wizardData = {
  contractNumber: '',
  customName: 'Modernizacja LK-007 Warszawa',
  orderDate: '2026-04-21',
  projectManagerId: '5',
  managerCode: 'AKO',
  liniaKolejowa: 'LK-007',           ◄── detectRailwayLine()
  detectedRailwayLine: 'LK-007',     ◄── detectRailwayLine()
  subsystems: [                       ◄── detectSubsystems()
    { type: 'SMOKIP_A', params: {} }
  ],
  infrastructure: undefined,
  logistics: undefined
}

                         │
                         ▼ [Step 2: SubsystemSelectionStep]
                         │ addSubsystem('SKD')
                         ▼
wizardData.subsystems = [
  { type: 'SMOKIP_A', params: {} },
  { type: 'SKD', params: {} }          ◄── Added
]

                         │
                         ▼ [Step 3: SmokipAConfigStep]
                         │ updateSubsystemParams(0, { przejazdyKatA: 2, ... })
                         ▼
wizardData.subsystems[0] = {
  type: 'SMOKIP_A',
  params: {
    przejazdyKatA: 2,
    iloscSKP: 1,
    iloscNastawni: 1,
    hasLCS: 1
  },
  ipPool: '192.168.10.0/24'            ◄── User input + validation
}

                         │
                         ▼ [Step 3+: SmokipADetailsStep]
                         │ initializeTaskDetails(0)
                         ▼
wizardData.subsystems[0].taskDetails = [
  {
    taskWizardId: 'uuid-1',
    taskType: 'PRZEJAZD_KAT_A',
    liniaKolejowa: 'LK-007',
    kilometraz: '',
    kategoria: 'KAT A'
  },
  {
    taskWizardId: 'uuid-2',
    taskType: 'PRZEJAZD_KAT_A',
    liniaKolejowa: 'LK-007',
    kilometraz: '',
    kategoria: 'KAT A'
  },
  {
    taskWizardId: 'uuid-3',
    taskType: 'SKP',
    liniaKolejowa: 'LK-007',
    kilometraz: ''
  },
  {
    taskWizardId: 'uuid-4',
    taskType: 'NASTAWNIA',
    nazwa: '',
    miejscowosc: ''
  },
  {
    taskWizardId: 'uuid-5',
    taskType: 'LCS',
    nazwa: '',
    miejscowosc: ''
  }
]

                         │ User fills data:
                         │ updateTaskDetail(0, 0, { kilometraz: '123,456' })
                         │ updateTaskDetail(0, 4, { nazwa: 'LCS Warszawa', hasCUID: true })
                         ▼
wizardData.subsystems[0].taskDetails = [
  {
    taskWizardId: 'uuid-1',
    taskType: 'PRZEJAZD_KAT_A',
    liniaKolejowa: 'LK-007',
    kilometraz: '123,456',             ◄── Updated
    kategoria: 'KAT A',
    googleMapsUrl: 'https://...',
    gpsLatitude: '52.123',
    gpsLongitude: '21.456'
  },
  // ... other tasks
  {
    taskWizardId: 'uuid-5',
    taskType: 'LCS',
    nazwa: 'LCS Warszawa',             ◄── Updated
    miejscowosc: 'Warszawa',
    hasCUID: true                       ◄── Checked
  },
  {
    taskWizardId: 'uuid-6',            ◄── Auto-created
    taskType: 'CUID',
    nazwa: 'LCS Warszawa',             ◄── Synced from LCS
    miejscowosc: 'Warszawa',           ◄── Synced from LCS
    linkedLCSId: 'uuid-5'              ◄── Linked to LCS
  }
]

                         │
                         ▼ [Step N+1: InfrastructureStep]
                         │ updateTaskInfrastructure('SMOKIP_A-0', { cabinetType: 'KONTENER' })
                         ▼
wizardData.infrastructure = {
  perTask: {
    'SMOKIP_A-0': {
      cabinetType: 'KONTENER',
      poles: [
        { type: 'STALOWY', quantity: '3', productInfo: 'M00123 | Słup 6m' }
      ],
      terrainNotes: 'Teren podmokły',
      generateCabinetCompletion: true  ◄── Auto-set for PRZEJAZD
    },
    'SMOKIP_A-2': {
      cabinetType: 'SZAFA_TERENOWA',
      poles: [],
      terrainNotes: '',
      generateCabinetCompletion: true
    }
  }
}

                         │
                         ▼ [Step N+2: LogisticsStep]
                         │ updateLogistics({ contactPhone: '123456789' })
                         │ (onBlur: formatPhoneNumber)
                         ▼
wizardData.logistics = {
  deliveryAddresses: [
    {
      address: 'ul. Kolejowa 10\n00-123 Warszawa',
      taskIds: ['SMOKIP_A-0', 'SMOKIP_A-1'],
      preferredDeliveryDate: '2026-05-15',
      shippingNotes: 'Dostawa 8-16'
    }
  ],
  contactPhone: '+48-123-456-789',     ◄── Formatted
  contactPerson: 'Jan Kowalski',
  orderEmails: {
    cameras: 'kamery@firma.pl',
    switches: 'siec@firma.pl',
    warehouse: 'magazyn@firma.pl'
  }
}

                         │
                         ▼ [Preview → Submit]
                         │ handleSubmit() → POST /api/contracts/wizard
                         ▼

Backend receives full wizardData and:
1. Creates contract record
2. Creates subsystems
3. Creates tasks with metadata
4. IF generateCabinetCompletion → creates KOMPLETACJA_SZAF tasks
5. Returns created contract + tasks

                         │
                         ▼ [Success]
                         │
createdContractId = 42
createdContract = { ... }
generatedTasks = [...]

7. NAJCZĘSTSZE PYTANIA (FAQ)
Q1: Dlaczego SMW ma wewnętrzny wizard?

A: SMW (System Monitoringu Wizyjnego) jest bardziej złożony niż inne podsystemy. Wymaga konfiguracji wielu encji:

    Stacje (per stacja: nazwa, adres, szafy)
    Szafy peronowe
    SOK (opcjonalnie)
    Extra Viewing (opcjonalnie)
    LCS

Zamiast jednego dużego formularza, zastosowano multi-step wizard wewnętrzny (SmwConfigStep.tsx), który prowadzi użytkownika krok po kroku przez konfigurację każdego elementu.
Q2: Czym różni się taskWizardId od id w TaskDetail?

A:

    id - Database ID (number) - istnieje tylko dla zadań już zapisanych w bazie (tryb edycji)
    taskWizardId - UUID (string) - generowany w wizardzie dla wszystkich zadań LCS w momencie utworzenia

Cel taskWizardId:

    Używany do powiązania CUID z LCS (linkedLCSId)
    Działa przed zapisaniem do bazy (w pamięci wizarda)
    Po zapisie, backend zamienia linkedLCSId (UUID) na id (number) w metadata

Q3: Jak działa auto-sync LCS ↔ CUID?

A: Logika w useWizardState.ts:
TypeScript

// 1. User edits LCS task (updateTaskDetail)
if (updatedTask.taskType === 'LCS' && (updates.nazwa || updates.miejscowosc)) {
  // Find CUID linked to this LCS
  const cuidIndex = taskDetails.findIndex(t => 
    t.taskType === 'CUID' && t.linkedLCSId === updatedTask.taskWizardId
  );
  
  // 2. If found, synchronize fields
  if (cuidIndex !== -1) {
    taskDetails[cuidIndex] = {
      ...taskDetails[cuidIndex],
      nazwa: updates.nazwa ?? updatedTask.nazwa,
      miejscowosc: updates.miejscowosc ?? updatedTask.miejscowosc
    };
  }
}

Efekt: Zmiana nazwy/miejscowości w LCS automatycznie aktualizuje powiązane CUID.
Q4: Dlaczego terrainNotes zamiast fieldNotes?

A: To legacy naming inconsistency. W pierwotnej implementacji użyto terrainNotes, a specyfikacja wymagała fieldNotes.

Zalecenie: Zmienić na fieldNotes dla spójności z dokumentacją (wymaga refaktoringu 3 plików).
Q5: Jak działa auto-formatowanie telefonu?

A:
TypeScript

// onBlur event:
const formatPhoneNumber = (raw: string): string => {
  const digits = raw.replace(/\D/g, ''); // Usunięcie wszystkich nie-cyfr
  
  if (digits.length === 9) {
    // Format: 123456789 → +48-123-456-789
    return `+48-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  if (digits.length === 11 && digits.startsWith('48')) {
    // Format: 48123456789 → +48-123-456-789
    const local = digits.slice(2);
    return `+48-${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  }
  
  // Jeśli nie pasuje, zwróć bez zmian
  return raw;
};

Triggerowane: onBlur (gdy użytkownik opuści pole).
Q6: Czy mogę edytować istniejący kontrakt?

A: TAK! Wizard wspiera tryb edycji:
TypeScript

<ContractWizardModal
  editMode={true}
  contractToEdit={existingContract}
  onSuccess={() => { ... }}
/>

Co się dzieje:

    loadContractDataForEdit() ładuje dane z backendu
    Zadania istniejące mają id (można je edytować, ale nie usuwać)
    Można dodawać nowe zadania (nie mają id)
    Backend rozróżnia update vs create po obecności id

Q7: Co się stanie, jeśli użytkownik zamknie wizarda w połowie?

A: System automatycznie zapisuje draft (roboczy stan):

Mechanizm:

    Auto-save co 5 sekund (useWizardDraft.ts)
    Draft zawiera: wizardData, currentStep, timestamp
    Przy ponownym otwarciu: modal "Przywróć draft?"
    Draft wygasa po 7 dniach

Storage: Backend - tabela wizard_drafts
Q8: Jak zweryfikować, czy numer CIDR jest wolny?

A:
TypeScript

// Frontend - NetworkPoolFields.tsx
const handleCheck = async () => {
  const response = await networkService.checkCIDRAvailability(ipPool);
  
  if (response.available) {
    // Wylicz bramę i maskę
    setGatewayIP(calculateFirstIP(ipPool));
    setSubnetMask(prefixToSubnetMask(ipPool));
  } else {
    setError(`CIDR zajęty: ${response.conflictingSubsystem}`);
  }
};

// Backend - NetworkController.ts
POST /api/network/check-cidr
  1. Validate CIDR format (regex)
  2. SELECT FROM subsystems WHERE ipPool = ?
  3. Return: { available: boolean, conflictingSubsystem?: string }

Q9: Kiedy backend tworzy zadanie KOMPLETACJA_SZAF?

A:
TypeScript

// 1. Frontend - InfrastructureStep.tsx
// User wybiera cabinetType
onChange({ cabinetType: 'KONTENER' })

// 2. Frontend - InfrastructureStep.tsx
// Auto-set flag dla zadań typu PRZEJAZD/SKP
if (requiresCabinetCompletion(task.type) && !!data.cabinetType) {
  generateCabinetCompletion = true;
}

// 3. Backend - ContractController.ts
if (taskInfra.generateCabinetCompletion && taskInfra.cabinetType) {
  await TaskGenerationService.createCabinetCompletionTask(
    task,
    taskInfra.cabinetType
  );
}

Warunki:

    Zadanie typu: PRZEJAZD_KAT_A, PRZEJAZD_KAT_B, lub SKP
    Pole cabinetType wypełnione
    Flaga generateCabinetCompletion = true

Q10: Czy mogę mieć wiele adresów dostawy?

A: TAK! System wspiera multi-address delivery:
TypeScript

logistics: {
  deliveryAddresses: [
    {
      address: 'Warszawa, ul. Kolejowa 10',
      taskIds: ['SMOKIP_A-0', 'SMOKIP_A-1'],  // Zadania dla tego adresu
    },
    {
      address: 'Gdańsk, ul. Morska 5',
      taskIds: ['SMOKIP_A-2', 'SKD-0'],       // Inne zadania
    }
  ]
}

Backward compatibility: Stary format z pojedynczym deliveryAddress jest nadal wspierany.
8. PODSUMOWANIE
Statystyki implementacji:
Kategoria	Wartość
Kroki wizarda	8 (+ 1 opcjonalny Shipping)
Typy podsystemów	12
Pliki TypeScript	47+
Interfejsy TypeScript	20+
Komponent główny	ContractWizardModal.tsx (830+ linii)
Hook główny	useWizardState.ts (590+ linii)
Zgodność ze specyfikacją	~95%
Brakujące funkcje	Krok 7 (BOM/Kamery)
Priorytetyzacja działań:
🔴 MUST HAVE (7-11 dni):

    ❌ Zaimplementować Krok 7 - BOM/Kamery (4-5 dni)
    ⚠️ Rozszerzyć PreviewStep o pełne podsumowanie (1-2 dni)
    ⚠️ Backend - zapisywanie konfiguracji kamer (1-2 dni)
    ✅ Testy (1-2 dni)

🟡 SHOULD HAVE (3-4 dni):

    ⚠️ Refaktoring walidacji → WizardValidator (2 dni)
    ⚠️ Zmiana terrainNotes → fieldNotes (1 dzień)

🟢 NICE TO HAVE (1 dzień):

    📝 Aktualizacja dokumentacji (0.5 dnia)
    📝 Zaktualizowanie specyfikacji (typy szaf) (0.5 dnia)

Dokument przygotował: System analizy kodu
Data: 2026-04-21
Wersja: 1.0 - Kompletna
Status: ✅ Gotowy do użycia
DODATEK: Szybka nawigacja

    Krok 1 - Dane podstawowe
    Krok 2 - Wybór podsystemów
    Kroki 3..N - Konfiguracja
    Kroki 3+..N+ - Szczegóły zadań
    Krok N+1 - Infrastruktura
    Krok N+2 - Logistyka
    Krok N+3 - Podgląd
    Kod drabinkowy
    Rozbieżności
    TypeScript Interfaces
    Flowchart
    FAQ

Code


Stworzyłem **kompletny dokument techniczny** (ponad 2500 linii!) zawierający:

## ✅ **Co zawiera dokument:**

1. **📋 Przegląd kroków wizarda** - tabela z opisem każdego kroku
2. **🔍 Szczegółowy opis pól per krok** - wszystkie pola, typy, walidacje, auto-wypełnienia
3. **🔗 Kod drabinkowy** - pełne drzewo powiązań plików TypeScript
4. **⚠️ Rozbieżności** - szczegółowa tabela porównawcza specyfikacja vs implementacja
5. **📐 TypeScript Interfaces** - kompletne definicje typów z komentarzami
6. **📊 Flowchart przepływu danych** - wizualizacja ASCII user flow + data mutations
7. **❓ FAQ** - odpowiedzi na 10 najczęstszych pytań
8. **📈 Statystyki** - liczby, priorytetyzacja, plan działania

## 🎯 **Kluczowe odkrycia:**

-

---

## 🖼️ Eksport topologii do PDF

### Funkcjonalność
- Format PDF: A3 poziomo
- Eksport zapisuje plik na backendzie i zwraca go do automatycznego pobrania
- Lokalizacja zapisu: `backend/uploads/contracts/{contractNumber}/topology_{subsystemIndex}_{timestamp}.pdf`
- Obsługiwane motywy: grover (ciemny) i husky (jasny)

### Endpoint backend
- `POST /api/contracts/:id/topology/export-pdf`
- Body: `{ subsystemIndex: number, pdfData: string }`
- Walidacja: wymagane `subsystemIndex`, `pdfData` w formacie `data:application/pdf;base64,...`

### Normalizacja danych topologii
Nowy `taskDataNormalizer.ts` zapewnia spójne dane zadań na canvasie i na sidebarach:
- stabilne ID: `taskWizardId` → `id` → fallback `task-{index}`
- spójny format kilometrażu (`XXX,XXX`) + wartość numeryczna do obliczeń
- jednolity label generowany wspólną logiką (`generateTaskName`)
- blokada duplikatów podczas drag&drop po stabilnym ID
