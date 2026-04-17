# 📋 PLAN IMPLEMENTACJI - Automatyczna kompletacja szaf + Adresy e-mail

> **Data utworzenia:** 2026-04-17  
> **Status:** Oczekuje na implementację  
> **Priorytet:** Wysoki  
> **Szacowany czas:** 5-6 godzin

---

## 📑 Spis treści

1. [Cele implementacji](#-cele-implementacji)
2. [Etap 0: Dokumentacja i Konfiguracja](#-etap-0-dokumentacja-i-konfiguracja)
3. [Etap 1: Automatyczna Kompletacja Szaf](#-etap-1-automatyczna-kompletacja-szaf)
4. [Etap 2: Adresy E-mail](#-etap-2-adresy-e-mail)
5. [Etap 3: Workflow i Testy](#-etap-3-workflow-i-testy)
6. [Harmonogram](#-harmonogram-implementacji)
7. [Lista plików](#-pełna-lista-plików)

---

## 🎯 Cele implementacji

### CEL 1: Automatyczne tworzenie zadania `KOMPLETACJA_SZAF`

Gdy użytkownik w **Kroku 5 (Infrastruktura)** wybierze szafę dla zadania określonego typu, system automatycznie generuje zadanie `KOMPLETACJA_SZAF` powiązane z zadaniem źródłowym.

**Typy zadań wyzwalające automatyczną kompletację:**

| Grupa | Typy zadań |
|-------|-----------|
| SMOKIP-A | `SMOKIP_A`, `PRZEJAZD_KAT_A`, `SKP` |
| SMOKIP-B | `SMOKIP_B`, `PRZEJAZD_KAT_B` |
| Stacje i Nastawnie | `LCS`, `NASTAWNIA`, `ND` |

Mechanizm wzorowany na istniejącym `ShipmentWizard`.

### CEL 2: Konfiguracja adresów e-mail dla zamówień

Konfiguracja w **Kroku 6 (Logistyka)** Kreatora Kontraktu.

**Kategorie e-maili:**

| Ikona | Kategoria | Pole |
|-------|-----------|------|
| 📹 | Kamery | `cameras` |
| 🔌 | Switche/urządzenia sieciowe | `switches` |
| 💾 | Rejestratory | `recorders` |
| 📦 | Zamówienia ogólne | `general` |
| 🏭 | Osoba magazynowa *(nie tworzyć użytkownika w systemie)* | `warehouse` |

---

## 🔧 Etap 0: Dokumentacja i Konfiguracja

### 0.1 Pliki konfiguracyjne `taskTypes.ts`

#### `frontend/src/config/taskTypes.ts`

```typescript
/**
 * ═══════════════════════════════════════════════════════════════════
 *  TYPY ZADAŃ - SŁOWNIK SKRÓTÓW
 * ═══════════════════════════════════════════════════════════════════
 * 
 * SMOKIP - System Monitorowania Obiektów Kolejowych IP
 * SKP - Stwierdzenie Końca Pociągu
 * LCS - Local Control Station
 * CUID - Centrum Utrzymania i Diagnostyki
 * ND - Nastawnia Dyspozytorska
 * SMW - System Monitoringu Wizyjnego
 * SKD - System Kontroli Dostępu
 * CSDIP - Cyfrowe Systemy Dźwiękowego Informowania Pasażerów
 * SSWiN - System Sygnalizacji Włamania i Napadu
 * SSP - System Sygnalizacji Pożaru
 * SUG - Stałe Urządzenie Gaśnicze
 * LAN PKP PLK - Sieci LAN PKP PLK
 * OTK - Optical Technical Kabel (pl: Światłowodowy kabel techniczny)
 * ZASILANIE - Zasilanie UPS/agregaty
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════
//  PRZEJAZDY SMOKIP-A (System Monitorowania Obiektów Kolejowych IP - Wariant A)
// ═══════════════════════════════════════════════════════════════════
export const PRZEJAZD_SMOKIP_A_TYPES = [
  'SMOKIP_A',        // System Monitorowania Obiektów Kolejowych IP - Wariant A
  'PRZEJAZD_KAT_A',  // Przejazd kolejowo-drogowy Kategorii A
  'SKP'              // Stwierdzenie Końca Pociągu
] as const;

// ═══════════════════════════════════════════════════════════════════
//  PRZEJAZDY SMOKIP-B (System Monitorowania Obiektów Kolejowych IP - Wariant B)
// ═══════════════════════════════════════════════════════════════════
export const PRZEJAZD_SMOKIP_B_TYPES = [
  'SMOKIP_B',        // System Monitorowania Obiektów Kolejowych IP - Wariant B
  'PRZEJAZD_KAT_B'   // Przejazd kolejowo-drogowy Kategorii B/C/E/F
] as const;

// ═══════════════════════════════════════════════════════════════════
//  STACJE I NASTAWNIE
// ═══════════════════════════════════════════════════════════════════
export const STATION_TYPES = [
  'LCS',        // Local Control Station (Lokalna Stacja Kontroli)
  'NASTAWNIA',  // Nastawnia kolejowa
  'ND'          // Nastawnia Dyspozytorska
] as const;

// ═══════════════════════════════════════════════════════════════════
//  TYPY ZADAŃ WYMAGAJĄCE AUTOMATYCZNEGO ZADANIA KOMPLETACJA_SZAF
// ═══════════════════════════════════════════════════════════════════
export const CABINET_COMPLETION_TYPES = [
  ...PRZEJAZD_SMOKIP_A_TYPES,  // SMOKIP_A, PRZEJAZD_KAT_A, SKP
  ...PRZEJAZD_SMOKIP_B_TYPES,  // SMOKIP_B, PRZEJAZD_KAT_B
  ...STATION_TYPES             // LCS, NASTAWNIA, ND
] as const;

export type CabinetCompletionType = typeof CABINET_COMPLETION_TYPES[number];

/**
 * Sprawdza czy zadanie wymaga automatycznego utworzenia zadania KOMPLETACJA_SZAF
 */
export const requiresCabinetCompletion = (taskType: string): boolean => {
  return CABINET_COMPLETION_TYPES.includes(taskType as CabinetCompletionType);
};

export const isSmokipATask = (taskType: string): boolean => {
  return PRZEJAZD_SMOKIP_A_TYPES.includes(taskType as any);
};

export const isSmokipBTask = (taskType: string): boolean => {
  return PRZEJAZD_SMOKIP_B_TYPES.includes(taskType as any);
};

export const isStationTask = (taskType: string): boolean => {
  return STATION_TYPES.includes(taskType as any);
};

// ═══════════════════════════════════════════════════════════════════
//  INNE PODSYSTEMY (bez automatycznej kompletacji szafy)
// ═══════════════════════════════════════════════════════════════════
export const OTHER_SUBSYSTEM_TYPES = [
  'SMW',       // System Monitoringu Wizyjnego
  'SKD',       // System Kontroli Dostępu
  'CSDIP',     // Cyfrowe Systemy Dźwiękowego Informowania Pasażerów
  'SSWiN',     // System Sygnalizacji Włamania i Napadu
  'SSP',       // System Sygnalizacji Pożaru
  'SUG',       // Stałe Urządzenie Gaśnicze
  'LAN',       // Sieci LAN PKP PLK
  'OTK',       // Optical Technical Kabel (Światłowodowy kabel techniczny)
  'ZASILANIE', // Zasilanie UPS/agregaty
  'CUID'       // Centrum Utrzymania i Diagnostyki
] as const;
```

#### `backend/src/config/taskTypes.ts`

```typescript
// Typy zadań wymagające automatycznego zadania KOMPLETACJA_SZAF
export const CABINET_COMPLETION_TYPES = [
  // SMOKIP-A
  'SMOKIP_A', 'PRZEJAZD_KAT_A', 'SKP',
  // SMOKIP-B
  'SMOKIP_B', 'PRZEJAZD_KAT_B',
  // Stacje i nastawnie
  'LCS', 'NASTAWNIA', 'ND'
];

export const requiresCabinetCompletion = (taskType: string): boolean => {
  return CABINET_COMPLETION_TYPES.includes(taskType);
};
```

---

## 🏗️ Etap 1: Automatyczna Kompletacja Szaf

### 1.1 Frontend - `InfrastructureStep.tsx`

**Import z `config/taskTypes.ts`:**

```typescript
import { requiresCabinetCompletion } from '../../../../config/taskTypes';
```

**Funkcja `handlePerTaskChange` z logiką flagi:**

```typescript
const handlePerTaskChange = (taskId: number, field: string, value: any) => {
  setPerTaskInfra(prev => {
    const taskInfra = prev[taskId] || {};
    const updatedTaskInfra = { ...taskInfra, [field]: value };
    
    // Automatycznie ustaw flagę generateCabinetCompletion gdy:
    // 1. Zadanie jest typem wymagającym kompletacji szafy
    // 2. Wybrano typ szafy (cabinetType)
    if (field === 'cabinetType') {
      const task = tasks.find(t => t.id === taskId);
      if (task && requiresCabinetCompletion(task.type)) {
        updatedTaskInfra.generateCabinetCompletion = !!value;
      }
    }
    
    return { ...prev, [taskId]: updatedTaskInfra };
  });
};
```

**UI - wizualny wskaźnik kompletacji:**

```tsx
{requiresCabinetCompletion(task.type) && taskInfra.cabinetType && (
  <div 
    className="alert alert-info" 
    style={{ 
      marginTop: '12px',
      padding: '10px 12px',
      fontSize: '13px',
      background: 'rgba(46, 160, 67, 0.1)',
      border: '1px solid rgba(46, 160, 67, 0.3)',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}
  >
    <span style={{ fontSize: '16px' }}>✅</span>
    <div>
      <strong>Automatyczna kompletacja szafy</strong>
      <br />
      <small style={{ opacity: 0.9 }}>
        Zostanie utworzone zadanie <code>KOMPLETACJA_SZAF</code> dla {task.type}
      </small>
    </div>
  </div>
)}
```

### 1.2 Frontend - `wizard.types.ts`

**Rozszerzenie interfejsu `TaskInfrastructure`:**

```typescript
export interface TaskInfrastructure {
  taskNumber?: string;
  cabinetType?: CabinetOption;
  cabinetInstallLocation?: string;
  poleQuantity?: number;
  poleType?: PoleType;
  poleProductInfo?: string;
  terrainNotes?: string;
  
  // NOWE - flaga dla automatycznego tworzenia KOMPLETACJA_SZAF
  generateCabinetCompletion?: boolean;
}
```

### 1.3 Backend - `SubsystemController.ts`

**Import i logika tworzenia zadania KOMPLETACJA_SZAF:**

```typescript
import { requiresCabinetCompletion } from '../config/taskTypes';
import { TaskNumberGenerator } from '../services/TaskNumberGenerator';

// Po utworzeniu głównych zadań podsystemu
for (const createdTask of createdMainTasks) {
  const taskData = subsystemTasks.find(t => t.name === createdTask.title);
  const infrastructure = taskData?.metadata?.infrastructure;
  
  // Sprawdź czy zadanie wymaga automatycznej kompletacji szafy
  if (
    infrastructure?.generateCabinetCompletion && 
    infrastructure?.cabinetType &&
    requiresCabinetCompletion(createdTask.taskType)
  ) {
    try {
      // Wygeneruj numer zadania dla kompletacji szafy
      const cabinetTaskNumber = await TaskNumberGenerator.generate();
      
      // Utwórz zadanie KOMPLETACJA_SZAF
      const cabinetTask = taskRepository.create({
        subsystemId: subsystem.id,
        taskNumber: cabinetTaskNumber,
        taskName: `Kompletacja szafy - ${createdTask.taskType}`,
        taskType: 'KOMPLETACJA_SZAF',
        status: TaskWorkflowStatus.CREATED,
        substatus: null,
        metadata: {
          sourceTaskNumber: createdTask.taskNumber,
          sourceTaskType: createdTask.taskType,
          cabinetType: infrastructure.cabinetType,
          cabinetInstallLocation: infrastructure.cabinetInstallLocation,
          autoGenerated: true,
          generatedAt: new Date().toISOString()
        },
        taskTypeId,
        bomGenerated: false,
        bomId: null,
        completionOrderId: null,
        prefabricationTaskId: null,
        contractId: contract?.id || null
      });
      
      await taskRepository.save(cabinetTask);
      
      serverLogger.info(
        `✅ Automatycznie utworzono zadanie KOMPLETACJA_SZAF (${cabinetTaskNumber}) ` +
        `dla ${createdTask.taskNumber} (${createdTask.taskType})`
      );
      
    } catch (cabinetTaskError) {
      serverLogger.error(
        `❌ Błąd tworzenia automatycznego zadania KOMPLETACJA_SZAF dla ${createdTask.taskNumber}:`,
        cabinetTaskError
      );
      // Nie przerywamy procesu - zadanie główne jest już utworzone
    }
  }
}
```

### 1.4 Backend - `TaskController.ts`

**Aktualizacja importu - zamiana lokalnej definicji na import z konfiguracji:**

```typescript
import { CABINET_COMPLETION_TYPES, requiresCabinetCompletion } from '../config/taskTypes';

// W metodzie requestShipment - zamiana lokalnej definicji tablicy na import:
// PRZED:
// const CABINET_TYPES = ['SMOKIP_A', 'PRZEJAZD_KAT_A', ...];
// const needsCabinetTask = CABINET_TYPES.includes(sourceTask.taskType);

// PO:
const needsCabinetTask = requiresCabinetCompletion(sourceTask.taskType);
```

---

## 📧 Etap 2: Adresy E-mail

### 2.1 Frontend - `wizard.types.ts`

**Nowe interfejsy:**

```typescript
/**
 * Konfiguracja adresów e-mail dla zamówień
 */
export interface OrderEmailsConfig {
  cameras?: string;      // E-mail dla zamówień kamer
  switches?: string;     // E-mail dla zamówień switchy/urządzeń sieciowych
  recorders?: string;    // E-mail dla zamówień rejestratorów
  general?: string;      // E-mail ogólny dla pozostałych elementów
  warehouse?: string;    // E-mail osoby obsługującej magazyn (nie tworzyć użytkownika w systemie)
  notes?: string;        // Dodatkowe uwagi
}

/**
 * Logistics/Shipping data
 */
export interface LogisticsData {
  deliveryAddress: string;
  deliveryAddresses?: Array<{
    address: string;
    taskIds: number[];
  }>;
  contactPhone: string;
  contactPerson?: string;
  shippingNotes?: string;
  preferredDeliveryDate?: string;
  
  // NOWE - Adresy e-mail dla zamówień
  orderEmails?: OrderEmailsConfig;
}
```

### 2.2 Frontend - `LogisticsStep.tsx`

**Sekcja UI adresów e-mail:**

```tsx
{/* ═══════════════════════════════════════════════════════
    SEKCJA: Adresy e-mail dla zamówień
═══════════════════════════════════════════════════════ */}
<div className="logistics-section">
  <h4 className="section-title">
    <span>📧</span> Adresy e-mail dla zamówień
  </h4>
  <p className="section-description">
    Podaj adresy e-mail, na które będą wysyłane zamówienia poszczególnych kategorii.
    Wszystkie pola są opcjonalne.
  </p>
  
  <div className="email-grid">
    {/* Kamery */}
    <div className="form-group">
      <label htmlFor="email-cameras">
        <span>📹</span> Kamery
      </label>
      <input
        id="email-cameras"
        type="email"
        className="form-control"
        placeholder="np. kamery@firma.pl"
        value={logistics.orderEmails?.cameras || ''}
        onChange={e => handleEmailChange('cameras', e.target.value)}
      />
    </div>
    
    {/* Switche / urządzenia sieciowe */}
    <div className="form-group">
      <label htmlFor="email-switches">
        <span>🔌</span> Switche / urządzenia sieciowe
      </label>
      <input
        id="email-switches"
        type="email"
        className="form-control"
        placeholder="np. siec@firma.pl"
        value={logistics.orderEmails?.switches || ''}
        onChange={e => handleEmailChange('switches', e.target.value)}
      />
    </div>
    
    {/* Rejestratory */}
    <div className="form-group">
      <label htmlFor="email-recorders">
        <span>💾</span> Rejestratory
      </label>
      <input
        id="email-recorders"
        type="email"
        className="form-control"
        placeholder="np. rejestratory@firma.pl"
        value={logistics.orderEmails?.recorders || ''}
        onChange={e => handleEmailChange('recorders', e.target.value)}
      />
    </div>
    
    {/* Zamówienia ogólne */}
    <div className="form-group">
      <label htmlFor="email-general">
        <span>📦</span> Zamówienia ogólne
      </label>
      <input
        id="email-general"
        type="email"
        className="form-control"
        placeholder="np. zamowienia@firma.pl"
        value={logistics.orderEmails?.general || ''}
        onChange={e => handleEmailChange('general', e.target.value)}
      />
    </div>
    
    {/* Osoba magazynowa */}
    <div className="form-group">
      <label htmlFor="email-warehouse">
        <span>🏭</span> Osoba magazynowa
        <span className="badge badge-warning" style={{ marginLeft: '8px', fontSize: '10px' }}>
          ⚠️ Nie tworzyć w systemie
        </span>
      </label>
      <input
        id="email-warehouse"
        type="email"
        className="form-control"
        placeholder="np. magazyn@firma.pl"
        value={logistics.orderEmails?.warehouse || ''}
        onChange={e => handleEmailChange('warehouse', e.target.value)}
      />
      <small className="form-text text-muted">
        Adres używany tylko do powiadomień e-mail — nie jest kontem w systemie.
      </small>
    </div>
    
    {/* Uwagi */}
    <div className="form-group form-group--full-width">
      <label htmlFor="email-notes">
        <span>📝</span> Uwagi do zamówień e-mail
      </label>
      <textarea
        id="email-notes"
        className="form-control"
        placeholder="Opcjonalne uwagi dotyczące zamówień e-mail..."
        rows={2}
        value={logistics.orderEmails?.notes || ''}
        onChange={e => handleEmailChange('notes', e.target.value)}
      />
    </div>
  </div>
</div>
```

**Handler zmiany:**

```typescript
const handleEmailChange = (field: keyof OrderEmailsConfig, value: string) => {
  setLogistics(prev => ({
    ...prev,
    orderEmails: {
      ...prev.orderEmails,
      [field]: value || undefined
    }
  }));
};
```

### 2.3 Backend - `ContractController.ts`

**Zapisywanie logistics z e-mailami i walidacja:**

```typescript
// Zapisywanie logistics z e-mailami
if (logistics) {
  contract.metadata = {
    ...contract.metadata,
    logistics: {
      deliveryAddress: logistics.deliveryAddress,
      deliveryAddresses: logistics.deliveryAddresses,
      contactPhone: logistics.contactPhone,
      contactPerson: logistics.contactPerson,
      shippingNotes: logistics.shippingNotes,
      preferredDeliveryDate: logistics.preferredDeliveryDate,
      orderEmails: logistics.orderEmails // ✅ Nowe pole
    }
  };
}

// Walidacja e-maili (defense in depth - frontend też waliduje)
if (logistics?.orderEmails) {
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  const emailFields = Object.entries(logistics.orderEmails)
    .filter(([key, val]) => key !== 'notes' && typeof val === 'string' && val);
  
  for (const [field, email] of emailFields) {
    if (email && !emailRegex.test(email as string)) {
      throw new Error(`Nieprawidłowy format adresu e-mail (${field}): ${email}`);
    }
  }
}
```

---

## 🔄 Etap 3: Workflow i Testy

### 3.1 Workflow po implementacji

```
┌─────────────────────────────────────────────────────────────┐
│  KREATOR KONTRAKTU - Krok 5: Infrastruktura                 │
│  Per-zadanie:                                                │
│  ┌───────────────────────────────────────────────┐          │
│  │ ☑ Z0001 - PRZEJAZD_KAT_A                     │          │
│  │   Typ szafy: SZAFA_TERENOWA ✅               │          │
│  │   ✅ Zostanie utworzone zadanie               │          │
│  │      KOMPLETACJA_SZAF                         │          │
│  └───────────────────────────────────────────────┘          │
└───────────────────┬─────────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  KREATOR KONTRAKTU - Krok 6: Logistyka                      │
│  📧 Adresy e-mail dla zamówień:                             │
│  ┌───────────────────────────────────────────────┐          │
│  │ 📹 Kamery: kamery@firma.pl                   │          │
│  │ 🔌 Switche: siec@firma.pl                    │          │
│  │ 🏭 Magazyn: magazyn@firma.pl ⚠️              │          │
│  └───────────────────────────────────────────────┘          │
└───────────────────┬─────────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  ZAPIS DO BAZY DANYCH                                        │
│  Zadania: Z0001.04 - PRZEJAZD_KAT_A                          │
│           Z0002.04 - KOMPLETACJA_SZAF (auto) ✅              │
│  Metadata: logistics.orderEmails {...}                       │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Przypadki testowe

#### Test 1: Automatyczna kompletacja dla SKP ✅

```
Wejście:
  - Zadanie: SKP
  - cabinetType: 'SZAFA_TERENOWA'
  - generateCabinetCompletion: true

Oczekiwany wynik:
  - Zostaje utworzone zadanie KOMPLETACJA_SZAF
  - taskType = 'KOMPLETACJA_SZAF'
  - metadata.sourceTaskType = 'SKP'
  - metadata.autoGenerated = true
```

#### Test 2: Brak kompletacji dla CUID ❌

```
Wejście:
  - Zadanie: CUID
  - cabinetType: 'SZAFA_TERENOWA'

Oczekiwany wynik:
  - NIE jest tworzone zadanie KOMPLETACJA_SZAF
  - requiresCabinetCompletion('CUID') === false
```

#### Test 3: Walidacja e-maili ✅

```
Wejście:
  - orderEmails.cameras = 'nieprawidlowy-email'

Oczekiwany wynik:
  - Backend zwraca błąd 400: "Nieprawidłowy format adresu e-mail"
  - Frontend wyświetla komunikat walidacji
```

#### Test 4: Opcjonalność pól e-mail ✅

```
Wejście:
  - Kontrakt bez pola orderEmails

Oczekiwany wynik:
  - System działa normalnie (backward compatibility)
  - Brak błędów przy odczycie kontraktu
```

---

## 📅 Harmonogram implementacji

| Faza | Zadanie | Czas | Pliki |
|------|---------|------|-------|
| **0** | Dokumentacja i konfiguracja | 30 min | `taskTypes.ts` (F+B), `TASK_TYPES_DICTIONARY.md` |
| **1A** | Frontend - kompletacja szaf | 1–1.5h | `InfrastructureStep.tsx`, `wizard.types.ts`, CSS |
| **1B** | Backend - kompletacja szaf | 1–1.5h | `SubsystemController.ts`, `TaskController.ts` |
| **1C** | Testy kompletacji | 30 min | Testy manualne + przypadki testowe |
| **2A** | Frontend - e-maile | 1h | `LogisticsStep.tsx`, `wizard.types.ts`, CSS |
| **2B** | Backend - e-maile | 30 min | `ContractController.ts` |
| **2C** | Testy e-maili | 30 min | Testy walidacji, backward compatibility |
| **3** | Dokumentacja końcowa | 30 min | README, code review |

**SUMA: 5–6 godzin**

---

## 📁 Pełna lista plików

| # | Plik | Status | Opis |
|---|------|--------|------|
| 1 | `frontend/src/config/taskTypes.ts` | ✅ NOWY | Konfiguracja typów zadań (frontend) |
| 2 | `backend/src/config/taskTypes.ts` | ✅ NOWY | Konfiguracja typów zadań (backend) |
| 3 | `docs/TASK_TYPES_DICTIONARY.md` | ✅ NOWY | Słownik skrótów typów zadań |
| 4 | `frontend/src/components/contracts/wizard/steps/InfrastructureStep.tsx` | 🔄 MODYFIKACJA | Logika automatycznej kompletacji + UI wskaźnika |
| 5 | `frontend/src/components/contracts/wizard/steps/LogisticsStep.tsx` | 🔄 MODYFIKACJA | Sekcja konfiguracji adresów e-mail |
| 6 | `frontend/src/components/contracts/wizard/types/wizard.types.ts` | 🔄 MODYFIKACJA | Interfejsy: `TaskInfrastructure`, `OrderEmailsConfig`, `LogisticsData` |
| 7 | `frontend/src/components/contracts/wizard/steps/InfrastructureStep.css` | 🔄 MODYFIKACJA/NOWY | Style wskaźnika automatycznej kompletacji |
| 8 | `frontend/src/components/contracts/wizard/steps/LogisticsStep.css` | 🔄 MODYFIKACJA/NOWY | Style sekcji e-maili |
| 9 | `backend/src/controllers/SubsystemController.ts` | 🔄 MODYFIKACJA | Automatyczne tworzenie zadania `KOMPLETACJA_SZAF` |
| 10 | `backend/src/controllers/TaskController.ts` | 🔄 MODYFIKACJA | Refaktoryzacja — import z `taskTypes.ts` |
| 11 | `backend/src/controllers/ContractController.ts` | 🔄 MODYFIKACJA | Zapisywanie i walidacja adresów e-mail |

---

## ⚠️ Uwagi i ryzyka

- **Backward compatibility:** Istniejące kontrakty bez pola `orderEmails` — system działa normalnie. Pole jest opcjonalne (`?`).
- **Numeracja zadań:** Zawsze używać `TaskNumberGenerator.generate()` dla nowych zadań `KOMPLETACJA_SZAF`, nigdy nie generować ręcznie.
- **Walidacja e-mail:** Stosować podwójną walidację — frontend (UX) + backend (bezpieczeństwo). Regex: `/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i`.
- **Osoba magazynowa:** Pole `warehouse` w `OrderEmailsConfig` służy wyłącznie do wysyłania powiadomień e-mail. **NIE tworzyć** konta użytkownika w systemie dla tej osoby.
- **Nieprzerywanie procesu:** Błąd tworzenia `KOMPLETACJA_SZAF` nie może przerywać tworzenia głównego zadania — stosować `try/catch` i logowanie błędu.
- **Idempotentność:** Sprawdzić czy zadanie `KOMPLETACJA_SZAF` nie zostało już wcześniej utworzone dla danego zadania źródłowego (pole `metadata.sourceTaskNumber`).
