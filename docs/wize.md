📋 KOMPLETNY PLAN IMPLEMENTACJI
✅ Korekta: OTK = Optical Technical Kabel

❌ Błędnie: OTK - Odbiór Techniczny Kontrolny
✅ POPRAWNIE: OTK - Optical Technical Kabel (pl: Światłowodowy kabel techniczny)
🎯 CELE IMPLEMENTACJI
CEL 1: Automatyczna kompletacja szaf w Kreatorze Kontraktu

    Wzorowane na mechanizmie z ShipmentWizard
    Automatyczne tworzenie zadania KOMPLETACJA_SZAF dla zadań z szafą

CEL 2: Adresy e-mail dla zamówień

    Konfiguracja adresów e-mail dla różnych kategorii zamówień
    Adres dla osoby obsługującej magazyn (nie występuje w systemie)

📚 ETAP 0: Dokumentacja i Konfiguracja
0.1. Utworzenie plików konfiguracyjnych
frontend/src/config/taskTypes.ts (NOWY)
TypeScript

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
 * 
 * Zadania wymagające kompletacji szafy:
 * - SMOKIP_A - System Monitorowania Obiektów Kolejowych IP - Wariant A
 * - PRZEJAZD_KAT_A - Przejazd kolejowo-drogowy Kategorii A
 * - SKP - Stwierdzenie Końca Pociągu
 * - SMOKIP_B - System Monitorowania Obiektów Kolejowych IP - Wariant B
 * - PRZEJAZD_KAT_B - Przejazd kolejowo-drogowy Kategorii B/C/E/F
 * - LCS - Local Control Station
 * - NASTAWNIA - Nastawnia kolejowa
 * - ND - Nastawnia Dyspozytorska
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
  'SMW',      // System Monitoringu Wizyjnego
  'SKD',      // System Kontroli Dostępu
  'CSDIP',    // Cyfrowe Systemy Dźwiękowego Informowania Pasażerów
  'SSWiN',    // System Sygnalizacji Włamania i Napadu
  'SSP',      // System Sygnalizacji Pożaru
  'SUG',      // Stałe Urządzenie Gaśnicze
  'LAN',      // Sieci LAN PKP PLK
  'OTK',      // Optical Technical Kabel (Światłowodowy kabel techniczny)
  'ZASILANIE', // Zasilanie UPS/agregaty
  'CUID'      // Centrum Utrzymania i Diagnostyki
] as const;

backend/src/config/taskTypes.ts (NOWY)
TypeScript

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

// Typy zadań wymagające automatycznego zadania KOMPLETACJA_SZAF
export const CABINET_COMPLETION_TYPES = [
  // SMOKIP-A (System Monitorowania Obiektów Kolejowych IP - Wariant A)
  'SMOKIP_A',        // System główny SMOKIP-A
  'PRZEJAZD_KAT_A',  // Przejazd kolejowo-drogowy Kategorii A
  'SKP',             // Stwierdzenie Końca Pociągu
  
  // SMOKIP-B (System Monitorowania Obiektów Kolejowych IP - Wariant B)
  'SMOKIP_B',        // System główny SMOKIP-B
  'PRZEJAZD_KAT_B',  // Przejazd kolejowo-drogowy Kategorii B/C/E/F
  
  // Stacje i nastawnie
  'LCS',             // Local Control Station (Lokalna Stacja Kontroli)
  'NASTAWNIA',       // Nastawnia kolejowa
  'ND'               // Nastawnia Dyspozytorska
];

/**
 * Sprawdza czy zadanie wymaga automatycznego utworzenia zadania KOMPLETACJA_SZAF
 */
export const requiresCabinetCompletion = (taskType: string): boolean => {
  return CABINET_COMPLETION_TYPES.includes(taskType);
};

docs/TASK_TYPES_DICTIONARY.md (NOWY)
Markdown

# 📖 Słownik Typów Zadań - Skróty i Pełne Nazwy

> Dokumentacja wszystkich skrótów używanych w systemie der-mag-platform

---

## 🚂 SMOKIP - System Monitorowania Obiektów Kolejowych IP

### SMOKIP-A (Wariant A)
| Skrót | Pełna nazwa |
|-------|-------------|
| **SMOKIP_A** | System Monitorowania Obiektów Kolejowych IP - Wariant A |
| **PRZEJAZD_KAT_A** | Przejazd kolejowo-drogowy Kategorii A |
| **SKP** | **Stwierdzenie Końca Pociągu** |

### SMOKIP-B (Wariant B)
| Skrót | Pełna nazwa |
|-------|-------------|
| **SMOKIP_B** | System Monitorowania Obiektów Kolejowych IP - Wariant B |
| **PRZEJAZD_KAT_B** | Przejazd kolejowo-drogowy Kategorii B/C/E/F |

---

## 🏢 Stacje i Nastawnie

| Skrót | Pełna nazwa |
|-------|-------------|
| **LCS** | Local Control Station (Lokalna Stacja Kontroli) |
| **CUID** | Centrum Utrzymania i Diagnostyki |
| **NASTAWNIA** | Nastawnia kolejowa |
| **ND** | Nastawnia Dyspozytorska |

---

## 📹 Systemy Monitoringu i Bezpieczeństwa

| Skrót | Pełna nazwa |
|-------|-------------|
| **SMW** | System Monitoringu Wizyjnego |
| **SKD** | System Kontroli Dostępu |
| **SSWiN** | System Sygnalizacji Włamania i Napadu |
| **SSP** | System Sygnalizacji Pożaru |
| **SUG** | Stałe Urządzenie Gaśnicze |

---

## 📡 Systemy Komunikacji i Infrastruktury

| Skrót | Pełna nazwa |
|-------|-------------|
| **CSDIP** | Cyfrowe Systemy Dźwiękowego Informowania Pasażerów |
| **LAN PKP PLK** | Sieci LAN PKP PLK |
| **OTK** | **Optical Technical Kabel (pl: Światłowodowy kabel techniczny)** |
| **ZASILANIE** | Zasilanie (UPS/agregaty) |

---

## 🛠️ Typy Zadań Kompletacyjnych

| Skrót | Pełna nazwa |
|-------|-------------|
| **KOMPLETACJA_SZAF** | Kompletacja szafy sterowniczej |
| **KOMPLETACJA_WYSYLKI** | Kompletacja wysyłki materiałów |

---

## ⚙️ Kategorie Przejazdów

| Kategoria | Opis |
|-----------|------|
| **KAT A** | Przejazd kategorii A - z pełną automatyką |
| **KAT B** | Przejazd kategorii B - półautomatyczny |
| **KAT C** | Przejazd kategorii C - z sygnalizacją świetlną |
| **KAT E** | Przejazd kategorii E - bez zabezpieczeń |
| **KAT F** | Przejazd kategorii F - w miejscu niebezpiecznym |

---

## 🔄 Zadania Wymagające Automatycznej Kompletacji Szafy

Następujące typy zadań automatycznie generują zadanie **KOMPLETACJA_SZAF**:

✅ **SMOKIP_A** - System Monitorowania Obiektów Kolejowych IP - Wariant A  
✅ **PRZEJAZD_KAT_A** - Przejazd kolejowo-drogowy Kategorii A  
✅ **SKP** - Stwierdzenie Końca Pociągu  
✅ **SMOKIP_B** - System Monitorowania Obiektów Kolejowych IP - Wariant B  
✅ **PRZEJAZD_KAT_B** - Przejazd kolejowo-drogowy Kategorii B/C/E/F  
✅ **LCS** - Local Control Station  
✅ **NASTAWNIA** - Nastawnia kolejowa  
✅ **ND** - Nastawnia Dyspozytorska  

---

## 📝 Uwagi

- Wszystkie skróty są używane konsekwentnie w całym systemie (frontend + backend)
- Dokumentacja jest synchronizowana między kodem a dokumentacją
- Przy dodawaniu nowych typów zadań należy zaktualizować ten słownik

---

**Ostatnia aktualizacja:** 2026-04-17  
**Wersja dokumentu:** 1.1 (dodano poprawkę OTK)

🎯 ETAP 1: Automatyczna Kompletacja Szaf w Kreatorze Kontraktu
1.1. Frontend - InfrastructureStep.tsx

Plik: frontend/src/components/contracts/wizard/steps/InfrastructureStep.tsx
Zmiany:
TypeScript

import { requiresCabinetCompletion } from '../../../config/taskTypes';

// W komponencie InfrastructureStep:
const handlePerTaskChange = (taskKey: string, data: Partial<TaskInfrastructure>) => {
  // Aktualizuj dane infrastruktury
  onUpdateTaskInfrastructure(taskKey, data);
  
  // Sprawdź czy wybrano szafę i zadanie wymaga kompletacji
  if (data.cabinetType) {
    const task = infrastructureTasks.find(t => `${t.subsystemType}-${infrastructureTasks.indexOf(t)}` === taskKey);
    if (task && requiresCabinetCompletion(task.type)) {
      // Dodaj flagę do metadanych
      onUpdateTaskInfrastructure(taskKey, {
        ...data,
        generateCabinetCompletion: true
      });
    }
  }
};

Wskaźnik wizualny:
TSX

{/* W renderze per-task card */}
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

1.2. Frontend - wizard.types.ts

Plik: frontend/src/components/contracts/wizard/types/wizard.types.ts
TypeScript

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

1.3. Backend - SubsystemController.ts

Plik: backend/src/controllers/SubsystemController.ts
W metodzie createSubsystem (po utworzeniu zadań):
TypeScript

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
        `✅ Automatycznie utworzono zadanie KOMPLETACJA_SZAF (${cabinetTaskNumber}) dla ${createdTask.taskNumber} (${createdTask.taskType})`
      );
      
      // Dodaj do listy utworzonych zadań (opcjonalnie)
      createdMainTasks.push(cabinetTask);
      
    } catch (cabinetTaskError) {
      serverLogger.error(
        `❌ Błąd tworzenia automatycznego zadania KOMPLETACJA_SZAF dla ${createdTask.taskNumber}:`,
        cabinetTaskError
      );
      // Nie przerywamy procesu - zadanie główne jest już utworzone
    }
  }
}

1.4. Backend - Aktualizacja TaskController.ts

Plik: backend/src/controllers/TaskController.ts

Zaktualizować stałą CABINET_COMPLETION_TYPES:
TypeScript

import { CABINET_COMPLETION_TYPES, requiresCabinetCompletion } from '../config/taskTypes';

// Zamiast lokalnej definicji, użyć importowanej:
// const CABINET_COMPLETION_TYPES: string[] = ['SKP', 'NASTAWNIA', 'LCS']; // ❌ USUNĄĆ

// W requestShipment:
const needsCabinetTask = requiresCabinetCompletion(sourceTask.taskType);

🎯 ETAP 2: Adresy E-mail dla Zamówień
2.1. Frontend - wizard.types.ts

Plik: frontend/src/components/contracts/wizard/types/wizard.types.ts
TypeScript

/**
 * Konfiguracja adresów e-mail dla zamówień
 */
export interface OrderEmailsConfig {
  cameras?: string;      // E-mail dla zamówień kamer
  switches?: string;     // E-mail dla zamówień switchy/urządzeń sieciowych
  recorders?: string;    // E-mail dla zamówień rejestratorów
  general?: string;      // E-mail ogólny dla pozostałych elementów
  warehouse?: string;    // E-mail osoby obsługującej magazyn (nie występuje w systemie)
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

2.2. Frontend - LogisticsStep.tsx

Plik: frontend/src/components/contracts/wizard/steps/LogisticsStep.tsx
Rozszerzyć UI o sekcję e-maili:
TSX

{/* Nowa sekcja - Adresy e-mail dla zamówień */}
<div className="logistics-section" style={{ marginTop: '32px' }}>
  <div className="section-header" style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '2px solid var(--border-color, #333)'
  }}>
    <span style={{ fontSize: '24px' }}>📧</span>
    <div>
      <h4 style={{ margin: 0 }}>Adresy e-mail dla zamówień</h4>
      <p style={{ 
        margin: '4px 0 0 0', 
        fontSize: '13px', 
        color: 'var(--text-secondary)',
        fontWeight: 'normal'
      }}>
        Opcjonalnie: Określ adresy e-mail dla automatycznych powiadomień o zamówieniach
      </p>
    </div>
  </div>
  
  <div className="email-config-grid" style={{ 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px'
  }}>
    {/* E-mail dla zamówień kamer */}
    <div className="form-group">
      <label htmlFor="email-cameras">
        📹 Zamówienia kamer
      </label>
      <input
        id="email-cameras"
        type="email"
        value={data.orderEmails?.cameras || ''}
        onChange={(e) => onChange({
          orderEmails: { 
            ...data.orderEmails, 
            cameras: e.target.value 
          }
        })}
        placeholder="kamery@firma.pl"
        pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
      />
      <small className="form-help">
        Powiadomienia o zamówieniach kamer IP, analogowych, akcesoriów kamerowych
      </small>
    </div>
    
    {/* E-mail dla zamówień switchy */}
    <div className="form-group">
      <label htmlFor="email-switches">
        🔌 Zamówienia switchy/urządzeń sieciowych
      </label>
      <input
        id="email-switches"
        type="email"
        value={data.orderEmails?.switches || ''}
        onChange={(e) => onChange({
          orderEmails: { 
            ...data.orderEmails, 
            switches: e.target.value 
          }
        })}
        placeholder="siec@firma.pl"
        pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
      />
      <small className="form-help">
        Powiadomienia o zamówieniach switchy, routerów, konwerterów, SFP
      </small>
    </div>
    
    {/* E-mail dla zamówień rejestratorów */}
    <div className="form-group">
      <label htmlFor="email-recorders">
        💾 Zamówienia rejestratorów
      </label>
      <input
        id="email-recorders"
        type="email"
        value={data.orderEmails?.recorders || ''}
        onChange={(e) => onChange({
          orderEmails: { 
            ...data.orderEmails, 
            recorders: e.target.value 
          }
        })}
        placeholder="rejestratory@firma.pl"
        pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
      />
      <small className="form-help">
        Powiadomienia o zamówieniach rejestratorów NVR, DVR, dysków
      </small>
    </div>
    
    {/* E-mail ogólny */}
    <div className="form-group">
      <label htmlFor="email-general">
        📦 Zamówienia ogólne
      </label>
      <input
        id="email-general"
        type="email"
        value={data.orderEmails?.general || ''}
        onChange={(e) => onChange({
          orderEmails: { 
            ...data.orderEmails, 
            general: e.target.value 
          }
        })}
        placeholder="zamowienia@firma.pl"
        pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
      />
      <small className="form-help">
        Powiadomienia o pozostałych zamówieniach (kable, akcesoria, elementy montażowe)
      </small>
    </div>
  </div>
  
  {/* Specjalna sekcja dla magazynu */}
  <div 
    className="warehouse-email-section" 
    style={{ 
      marginTop: '24px',
      padding: '16px',
      background: 'rgba(255, 193, 7, 0.1)',
      border: '1px solid rgba(255, 193, 7, 0.3)',
      borderRadius: '8px'
    }}
  >
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label htmlFor="email-warehouse" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }}>🏭</span>
        <span>Osoba obsługująca magazyn</span>
      </label>
      <input
        id="email-warehouse"
        type="email"
        value={data.orderEmails?.warehouse || ''}
        onChange={(e) => onChange({
          orderEmails: { 
            ...data.orderEmails, 
            warehouse: e.target.value 
          }
        })}
        placeholder="magazyn@firma.pl"
        pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
      />
      <small className="form-help" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span>⚠️</span>
        <span>
          <strong>Uwaga:</strong> Osoba nie występuje w systemie - otrzyma tylko powiadomienia e-mail o wydaniach i rezerwacjach
        </span>
      </small>
    </div>
  </div>
  
  {/* Uwagi dodatkowe */}
  <div className="form-group" style={{ marginTop: '16px' }}>
    <label htmlFor="email-notes">
      📝 Uwagi dotyczące powiadomień
    </label>
    <textarea
      id="email-notes"
      value={data.orderEmails?.notes || ''}
      onChange={(e) => onChange({
        orderEmails: { 
          ...data.orderEmails, 
          notes: e.target.value 
        }
      })}
      placeholder="Dodatkowe informacje o harmonogramach powiadomień, preferencjach kontaktu..."
      rows={3}
    />
  </div>
</div>

2.3. Backend - Contract.ts (opcjonalnie)

Plik: backend/src/entities/Contract.ts

Dodać kolumnę dla e-maili (jeśli chcemy persystować w dedykowanym polu):
TypeScript

@Column({ type: 'jsonb', nullable: true })
orderEmails?: {
  cameras?: string;
  switches?: string;
  recorders?: string;
  general?: string;
  warehouse?: string;
  notes?: string;
};

ALBO - zapisywać w istniejącej kolumnie metadata:
TypeScript

// Bez zmian w encji - użyć istniejącej kolumny metadata
// W ContractController zapisywać jako metadata.logistics.orderEmails

2.4. Backend - ContractController.ts

Plik: backend/src/controllers/ContractController.ts

W metodzie createContract i updateContract:
TypeScript

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

// Walidacja e-maili (opcjonalna)
if (logistics?.orderEmails) {
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  const emails = Object.values(logistics.orderEmails).filter(e => typeof e === 'string' && e);
  
  for (const email of emails) {
    if (email && !emailRegex.test(email)) {
      throw new Error(`Nieprawidłowy format adresu e-mail: ${email}`);
    }
  }
}

📊 ETAP 3: Style CSS
3.1. InfrastructureStep.css

Plik: frontend/src/components/contracts/wizard/steps/InfrastructureStep.css
CSS

/* Wskaźnik automatycznej kompletacji */
.alert.alert-info {
  margin-top: 12px;
  padding: 10px 12px;
  font-size: 13px;
  background: rgba(46, 160, 67, 0.1);
  border: 1px solid rgba(46, 160, 67, 0.3);
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert.alert-info strong {
  color: var(--success-color, #3fb950);
}

.alert.alert-info code {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

3.2. LogisticsStep.css

Plik: frontend/src/components/contracts/wizard/steps/LogisticsStep.css
CSS

/* Sekcja e-maili */
.logistics-section {
  margin-top: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border-color, #333);
}

.section-header h4 {
  margin: 0;
  color: var(--text-primary, #f0f0f0);
}

.email-config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.warehouse-email-section {
  margin-top: 24px;
  padding: 16px;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 8px;
}

.warehouse-email-section .form-group {
  margin-bottom: 0;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary, #f0f0f0);
}

.form-help {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary, #a0a0a0);
}

/* Walidacja e-mail */
input[type="email"]:invalid:not(:placeholder-shown) {
  border-color: var(--danger-color, #f85149);
}

input[type="email"]:valid:not(:placeholder-shown) {
  border-color: var(--success-color, #3fb950);
}

🔄 ETAP 4: Workflow i Testy
4.1. Workflow po implementacji:
Code

┌─────────────────────────────────────────────────────────────┐
│  KREATOR KONTRAKTU - Krok 4: Szczegóły zadań (SmokipA/B)   │
│  ✅ Użytkownik definiuje zadania                            │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  KREATOR KONTRAKTU - Krok 5: Infrastruktura                 │
│                                                               │
│  Per-zadanie:                                                │
│  ┌───────────────────────────────────────────────┐          │
│  │ ☑ Z0001 - PRZEJAZD_KAT_A                     │          │
│  │   Typ szafy: SZAFA_TERENOWA ✅               │          │
│  │   Słupy: 2x STALOWY                          │          │
│  │                                                │          │
│  │   ✅ Zostanie utworzone zadanie               │          │
│  │      KOMPLETACJA_SZAF                         │          │
│  │                                                │          │
│  │ ☑ Z0002 - LCS                                │          │
│  │   Typ szafy: 42U ✅                           │          │
│  │                                                │          │
│  │   ✅ Zostanie utworzone zadanie               │          │
│  │      KOMPLETACJA_SZAF                         │          │
│  └─────────────────────────────���─────────────────┘          │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  KREATOR KONTRAKTU - Krok 6: Logistyka                      │
│                                                               │
│  📦 Adresy dostawy (wielokrotne):                           │
│  ┌───────────────────────────────────────────────┐          │
│  │ Adres #1: ul. Kolejowa 1, Warszawa           │          │
│  │ Dotyczy: ☑ Z0001  ☑ Z0002                    │          │
│  └───────────────────────────────────────────────┘          │
│                                                               │
│  📧 Adresy e-mail dla zamówień:                             │
│  ┌───────────────────────────────────────────────┐          │
│  │ 📹 Kamery: kamery@firma.pl                   │          │
│  │ 🔌 Switche: siec@firma.pl                    │          │
│  │ 💾 Rejestratory: rejestratory@firma.pl       │          │
│  │ 📦 Ogólne: zamowienia@firma.pl               │          │
│  │ 🏭 Magazyn: magazyn@firma.pl ⚠️              │          │
│  └───────────────────────────────────────────────┘          │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  ZAPIS DO BAZY DANYCH                                        │
│                                                               │
│  Zadania utworzone:                                          │
│  • Z0001.04 - PRZEJAZD_KAT_A                                 │
│  • Z0002.04 - KOMPLETACJA_SZAF (dla PRZEJAZD_KAT_A) ✅      │
│  • Z0003.04 - LCS                                            │
│  • Z0004.04 - KOMPLETACJA_SZAF (dla LCS) ✅                 │
│                                                               │
│  Metadata kontraktu:                                         │
│  {                                                            │
│    logistics: {                                              │
│      deliveryAddresses: [...],                               │
│      orderEmails: {                                          │
│        cameras: "kamery@firma.pl",                           │
│        switches: "siec@firma.pl",                            │
│        recorders: "rejestratory@firma.pl",                   │
│        general: "zamowienia@firma.pl",                       │
│        warehouse: "magazyn@firma.pl"                         │
│      }                                                        │
│    }                                                          │
│  }                                                            │
└─────────────────────────────────────────────────────────────┘

4.2. Przypadki testowe:
Test 1: Automatyczna kompletacja dla SKP

    Utwórz kontrakt z podsystemem SMOKIP-A
    W kroku 4 dodaj zadanie SKP
    W kroku 5 wybierz dla SKP szafę SZAFA_TERENOWA
    ✅ Sprawdź pojawienie się wskaźnika "Zostanie utworzone zadanie KOMPLETACJA_SZAF"
    Zapisz kontrakt
    ✅ Sprawdź w bazie czy utworzono 2 zadania:
        SKP (główne)
        KOMPLETACJA_SZAF (automatyczne)

Test 2: Brak kompletacji dla CUID

    Utwórz kontrakt z CUID
    W kroku 5 NIE POJAWIA SIĘ konfiguracja szafy dla CUID
    ✅ Sprawdź że NIE utworzono zadania KOMPLETACJA_SZAF

Test 3: Walidacja e-maili

    W kroku 6 wpisz nieprawidłowy e-mail (bez @)
    ✅ Sprawdź czerwoną ramkę walidacji
    Wpisz prawidłowy e-mail
    ✅ Sprawdź zieloną ramkę walidacji

Test 4: E-maile opcjonalne

    Pomiń wszystkie pola e-mail (pozostaw puste)
    ✅ Sprawdź że kontrakt zapisuje się bez błędu
    ✅ Sprawdź że metadata.logistics.orderEmails jest null/undefined lub pustym obiektem

📁 PEŁNA LISTA PLIKÓW DO MODYFIKACJI
Nowe pliki (UTWORZYĆ):

    ✅ frontend/src/config/taskTypes.ts - konfiguracja typów zadań
    ✅ backend/src/config/taskTypes.ts - konfiguracja typów zadań (backend)
    ✅ docs/TASK_TYPES_DICTIONARY.md - dokumentacja słownika

Modyfikacje istniejących plików:
Frontend:

    frontend/src/components/contracts/wizard/steps/InfrastructureStep.tsx
        Import requiresCabinetCompletion
        Logika handlePerTaskChange
        Wskaźnik wizualny dla automatycznej kompletacji

    frontend/src/components/contracts/wizard/steps/LogisticsStep.tsx
        Nowa sekcja "Adresy e-mail dla zamówień"
        Formularze z walidacją

    frontend/src/components/contracts/wizard/types/wizard.types.ts
        Rozszerzenie TaskInfrastructure o generateCabinetCompletion
        Dodanie OrderEmailsConfig
        Rozszerzenie LogisticsData o orderEmails

    frontend/src/components/contracts/wizard/steps/InfrastructureStep.css (NOWY lub rozszerzenie)
        Style dla wskaźnika automatycznej kompletacji

    frontend/src/components/contracts/wizard/steps/LogisticsStep.css (NOWY lub rozszerzenie)
        Style dla sekcji e-maili

Backend:

    backend/src/controllers/SubsystemController.ts
        Import requiresCabinetCompletion
        Logika automatycznego tworzenia KOMPLETACJA_SZAF w createSubsystem

    backend/src/controllers/TaskController.ts
        Zamiana lokalnej stałej na import z taskTypes.ts
        Użycie requiresCabinetCompletion()

    backend/src/controllers/ContractController.ts
        Zapisywanie logistics.orderEmails
        Walidacja e-maili

    backend/src/entities/Contract.ts (OPCJONALNIE)
        Dedykowana kolumna orderEmails (jeśli nie używamy metadata)

⏱️ HARMONOGRAM IMPLEMENTACJI
Faza 0: Dokumentacja (30 min)

    ✅ Utworzenie plików konfiguracyjnych z komentarzami
    ✅ Dokumentacja TASK_TYPES_DICTIONARY.md
    ✅ Commit: "docs: Add task types dictionary with SKP and OTK corrections"

Faza 1: Automatyczna kompletacja szaf (2-3h)
1A. Frontend (1-1.5h)

    ✅ Utworzenie frontend/src/config/taskTypes.ts
    ✅ Modyfikacja InfrastructureStep.tsx (logika + UI)
    ✅ Rozszerzenie wizard.types.ts
    ✅ Style CSS

Commit: "feat(wizard): Add automatic cabinet completion task generation in InfrastructureStep"
1B. Backend (1-1.5h)

    ✅ Utworzenie backend/src/config/taskTypes.ts
    ✅ Modyfikacja SubsystemController.ts (logika tworzenia zadań)
    ✅ Aktualizacja TaskController.ts (użycie wspólnej konfiguracji)

Commit: "feat(backend): Implement automatic KOMPLETACJA_SZAF task creation for cabinet-requiring tasks"
1C. Testy (30 min)

    ✅ Testy manualne przypadków 1-2
    ✅ Weryfikacja logów backendu

Commit: "test: Verify automatic cabinet completion task generation"
Faza 2: Adresy e-mail (1.5-2h)
2A. Frontend (1h)

    ✅ Rozszerzenie wizard.types.ts (OrderEmailsConfig)
    ✅ Modyfikacja LogisticsStep.tsx (nowa sekcja)
    ✅ Style CSS

Commit: "feat(wizard): Add order emails configuration in LogisticsStep"
2B. Backend (30 min)

    ✅ Modyfikacja ContractController.ts (zapisywanie + walidacja)
    ✅ Opcjonalnie: kolumna w Contract.ts

Commit: "feat(backend): Add order emails persistence and validation"
2C. Testy (30 min)

    ✅ Testy walidacji e-mail (przypadki 3-4)
    ✅ Weryfikacja zapisu w bazie

Commit: "test: Verify email validation and persistence"
Faza 3: Dokumentacja końcowa i code review (30 min)

    ✅ Aktualizacja README (jeśli potrzeba)
    ✅ Przegląd kodu (self-review)
    ✅ Cleanup i optymalizacja

Commit: "docs: Update documentation after cabinet completion and email features"
✅ PODSUMOWANIE PLANU
Nowe funkcjonalności:

    ✅ Automatyczne zadanie KOMPLETACJA_SZAF dla typów:
        SMOKIP_A, PRZEJAZD_KAT_A, SKP
        SMOKIP_B, PRZEJAZD_KAT_B
        LCS, NASTAWNIA, ND

    ✅ Konfiguracja e-maili dla zamówień:
        Kamery
        Switche/urządzenia sieciowe
        Rejestratory
        Ogólne
        Magazyn (osoba bez konta w systemie)

Dokumentacja:

    ✅ Słownik typów zadań w kodzie (komentarze)
    ✅ Plik konfiguracyjny taskTypes.ts (F + B)
    ✅ Markdown documentation TASK_TYPES_DICTIONARY.md
    ✅ SKP = Stwierdzenie Końca Pociągu (poprawione)
    ✅ OTK = Optical Technical Kabel (poprawione)

Szacowany czas implementacji:

    Faza 0 (Dokumentacja): 30 min
    Faza 1 (Kompletacja szaf): 2-3h
    Faza 2 (E-maile): 1.5-2h
    Faza 3 (Dokumentacja końcowa): 30 min

SUMA: ~5-6 godzin (włącznie z testami)
🚀 GOTOWE DO URUCHOMIENIA!

Plan jest kompletny i gotowy do przekazania agentowi po zakończeniu obecnego zadania (kroki 4, 5, 6 - UI fixes
