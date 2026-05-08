# WIZARD TASK CONFIGURATION STEP

## Cel
Krok 8 dodaje konfigurację BOM per zadanie w obu kreatorach kontraktów. Kreator automatycznie pobiera aktywny szablon BOM na podstawie typu podsystemu i wariantu zadania, przelicza ilości oraz pozwala operatorowi skorygować wybór i ilości materiałów.

## Struktura danych

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
  configParams?: Record<string, any>;
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

## Workflow
1. Kreator buduje listę wszystkich zadań dla bieżącej sesji.
2. Dla każdego zadania pobiera aktywny template przez `bomSubsystemTemplateService.getTemplateFor(subsystemType, taskVariant)`.
3. Ilości materiałów są rozwiązywane na podstawie parametrów podsystemu.
4. Operator może:
   - wybrać aktywne zadanie z lewego sidebara,
   - edytować ilości,
   - zaznaczać/odznaczać pozycje opcjonalne,
   - odświeżyć template,
   - zapisać lub zastosować BOM.
5. Konfiguracja jest utrzymywana w `wizardData.taskConfigurations`.
6. Przy zapisie kontraktu konfiguracja BOM jest przekazywana w metadanych zadania i automatycznie stosowana dla nowo tworzonych zadań.

## UI Components
- **Left Sidebar (380px)**  
  Lista zadań grupowana po podsystemach, status konfiguracji, wyszukiwarka i checkbox `Zamówienia niestandardowe`.
- **Right Workspace**  
  Nagłówek aktywnego zadania, statystyki BOM, grupy materiałów, edycja ilości i przycisk zastosowania BOM.

## API Integration
- `GET /api/bom-subsystem-templates/for/:subsystemType/:taskVariant`
- `POST /api/bom-subsystem-templates/:templateId/apply/:taskId`

Nowe zadania tworzone przez wizard przekazują również snapshot BOM w metadanych, aby backend mógł automatycznie zastosować template po utworzeniu zadania.

## Permissions & Validation
- krok jest wymagany przed przejściem do podglądu,
- każde zadanie musi mieć wpis w `taskConfigurations`,
- brak template nie blokuje wizarda, ale zapisuje zadanie bez materiałów,
- walidacja kroku 9 zależy od checkboxa `customOrdersEnabled`.
