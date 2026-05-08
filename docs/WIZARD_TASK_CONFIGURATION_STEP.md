# Wizard — Krok 8: Konfiguracja Zadań (BOM Integration)

## Przegląd

Krok Konfiguracji Zadań umożliwia **automatyczne zaciąganie szablonów BOM** dla każdego zadania
w kontrakcie oraz ich edycję (ilości, selekcja materiałów).

## Layout

```
┌─────────────────────┬────────────────────────────────────────────────┐
│   SIDEBAR (320px)   │   WORKSPACE (flex: 1)                          │
│                     │                                                │
│ 📋 Lista Zadań      │  📦 BOM SMOKIP-A – Przejazd Kat A   v1.02     │
│                     │                                                │
│ ☑️ Zamówienia       │  ┌─────────────────────────────────────────┐   │
│   Niestandardowe    │  │ 🖥️ Urządzenia (8)                        │   │
│                     │  │ #│Materiał     │Ilość│J.│Źródło│IP│✓   │   │
│ ⏳ SMOKIP_A-0       │  │ 1│Sterownik   │  1  │sz│FIXED │🌐│☑   │   │
│ ✅ SMOKIP_A-1       │  └─────────────────────────────────────────┘   │
│ ⏳ SMOKIP_A-2       │                                                │
│                     │  [✅ Zastosuj BOM do zadania]                  │
└─────────────────────┴────────────────────────────────────────────────┘
```

## Kluczowe Funkcjonalności

### 1. Automatyczne ładowanie szablonu BOM
Po wybraniu zadania z listy, komponent automatycznie wywołuje:
```typescript
bomSubsystemTemplateService.getTemplateFor(subsystemType, taskVariant)
```
Jeśli szablon istnieje, materiały są rozwiązywane (ilości) i wyświetlane.

### 2. Rozwiązywanie ilości materiałów
| Źródło        | Opis                                                     |
|---------------|----------------------------------------------------------|
| `FIXED`       | Stała wartość z szablonu                                |
| `FROM_CONFIG` | Wartość z `configParams[configParamName]`               |
| `PER_UNIT`    | `defaultQuantity × configParams[configParamName]`       |
| `DEPENDENT`   | Formuła (frontend: fallback do `defaultQuantity`)       |

### 3. Checkbox "Zamówienia Niestandardowe"
Widoczny w nagłówku sidebar'a. Ustawia `wizardData.customOrdersEnabled = true`,
co powoduje wyświetlenie Kroku 9 (Zamówienia Dodatkowe) w nawigacji.

### 4. Status wizualny zadań
- **⏳** — oczekuje na konfigurację
- **✅** — BOM zastosowany (po kliknięciu "Zastosuj BOM do zadania")
- **Active** — aktualnie wybrany (niebieski border)
- Skonfigurowane zadania mają zielony `border-left`

### 5. Edycja materiałów
- Pole ilości (input number) — edytowalne
- Checkbox selekcji — do odznaczania opcjonalnych materiałów
- Grupowanie materiałów po `groupName`

## Typy TypeScript

```typescript
interface TaskConfiguration {
  taskId: string;
  taskNumber: string;
  taskName: string;
  taskType: string;
  subsystemType: string;
  taskVariant?: string | null;
  bomTemplateId?: number;
  bomTemplateVersion?: number;
  materials: ResolvedMaterial[];
  configParams?: Record<string, unknown>;
  isConfigured: boolean;
  lastModified?: Date;
}

interface ResolvedMaterial {
  id: number;
  materialName: string;
  catalogNumber?: string;
  quantity: number;
  unit: string;
  quantitySource: 'FIXED' | 'FROM_CONFIG' | 'PER_UNIT' | 'DEPENDENT';
  groupName: string;
  requiresIp: boolean;
  isSelected: boolean;
}
```

## Dane w WizardData

```typescript
wizardData.taskConfigurations  // Record<taskKey, TaskConfiguration>
wizardData.customOrdersEnabled // boolean
```

## Klucze Zadań

Zadania identyfikowane są kluczem `{subsystemType}-{globalTaskIdx}`,
np. `SMOKIP_A-0`, `SMOKIP_B-2`.

## API Integration

- `GET /api/bom-subsystem-templates/for/{subsystemType}/{taskVariant}` — pobiera aktywny szablon
- Serwis: `frontend/src/services/bomSubsystemTemplate.service.ts`

## Pliki Komponentu

- `frontend/src/components/contracts/wizard/steps/TaskConfigurationStep.tsx`
- `frontend/src/components/contracts/wizard/steps/TaskConfigurationStep.css`
