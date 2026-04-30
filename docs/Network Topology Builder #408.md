# 📋 Plan Pull Requestów - Network Topology Builder

## Podział na optymalne PR-y dla GitHub Copilot Agent

---

## 🎯 Strategia podziału

*Cel:* Małe, skupione PR-y (~300-800 linii każdy), które można robić równolegle tam gdzie to możliwe.

*Korzyści:*
- ✅ Łatwiejszy code review
- ✅ Mniejsze ryzyko konfliktów
- ✅ Szybsze iteracje
- ✅ Agent ma mniejszy kontekst do zarządzania
- ✅ Łatwiejszy rollback w przypadku problemów

---

## 📦 PR #1: Backend - Database Foundation

*Branch:* feature/topology-backend-database  
*Zależności:* Brak  
*Priorytet:* 🔴 Krytyczny (blokuje PR #2)  
*Szacowany czas:* 2-3 godziny

### Problem Statement dla agenta

markdown
## Zadanie
Utwórz backend entity i migrację bazy danych dla modułu Network Topology.

## Wymagania
1. Utwórz entity `NetworkTopology` w TypeORM z polami:
   - id (uuid, primary key)
   - name (string)
   - version (int, default 1)
   - contractId (int, foreign key do contracts)
   - subsystemIndex (int)
   - subsystemType (string)
   - nodes (jsonb)
   - connections (jsonb)
   - notes (text, nullable)
   - createdAt, updatedAt (timestamps)

2. Utwórz migrację bazy danych:
   - Tabela `network_topologies`
   - Foreign key constraint do `contracts` z CASCADE delete
   - Index na (contractId, subsystemIndex)

3. Dodaj TypeScript interfaces dla nodes i connections w entity

## Pliki do utworzenia
- `backend/src/entities/NetworkTopology.entity.ts`
- `backend/src/migrations/YYYYMMDD_create_network_topologies.ts`

## Acceptance Criteria
- [ ] Entity kompiluje się bez błędów
- [ ] Migracja up/down działa poprawnie
- [ ] Foreign key constraint działa
- [ ] Index został utworzony
- [ ] TypeScript interfaces są dobrze zdefiniowane


### Pliki

*Utworzyć:*
- backend/src/entities/NetworkTopology.entity.ts (80 linii)
- backend/src/migrations/YYYYMMDD_create_network_topologies.ts (90 linii)

*Zmodyfikować:*
- Brak

*Szacowana wielkość:* ~170 linii

---

## 📦 PR #2: Backend - Service & Controller

*Branch:* feature/topology-backend-api  
*Zależności:* PR #1 ✅  
*Priorytet:* 🔴 Krytyczny  
*Szacowany czas:* 3-4 godziny

### Problem Statement dla agenta

markdown
## Zadanie
Zaimplementuj backend service i controller dla Network Topology z CRUD operacjami.

## Wymagania
1. Service (`NetworkTopologyService`):
   - create(data) - walidacja, sprawdzenie duplikatów
   - getById(id)
   - getByContractAndSubsystem(contractId, subsystemIndex)
   - getAllByContract(contractId)
   - update(id, data) - auto-increment version
   - delete(id)
   - getHistory(contractId, subsystemIndex)

2. Controller (`NetworkTopologyController`):
   - Obsługa wszystkich metod z service
   - Proper error handling (404, 409, 500)
   - Validation request body

3. Routes (`networkTopology.routes.ts`):
   - POST /topologies
   - GET /topologies/:id
   - GET /contracts/:contractId/subsystems/:subsystemIndex/topology
   - GET /contracts/:contractId/topologies
   - PUT /topologies/:id
   - DELETE /topologies/:id
   - GET /contracts/:contractId/subsystems/:subsystemIndex/topology/history
   - Middleware: authenticate, checkPermission

4. Integracja w `app.ts`

## Pliki do utworzenia
- `backend/src/services/networkTopology.service.ts`
- `backend/src/controllers/NetworkTopologyController.ts`
- `backend/src/routes/networkTopology.routes.ts`

## Pliki do zmodyfikowania
- `backend/src/app.ts` (dodaj routes)

## Acceptance Criteria
- [ ] Wszystkie endpointy działają poprawnie
- [ ] Error handling dla wszystkich edge cases
- [ ] Permissions są sprawdzane
- [ ] Version auto-increment działa
- [ ] Walidacja duplikatów działa


### Pliki

*Utworzyć:*
- backend/src/services/networkTopology.service.ts (150 linii)
- backend/src/controllers/NetworkTopologyController.ts (180 linii)
- backend/src/routes/networkTopology.routes.ts (80 linii)

*Zmodyfikować:*
- backend/src/app.ts (+2 linie)

*Szacowana wielkość:* ~412 linii

---

## 📦 PR #3: Frontend - Types & Service

*Branch:* feature/topology-frontend-types  
*Zależności:* PR #2 ✅ (dla API calls)  
*Priorytet:* 🟡 Wysoki  
*Szacowany czas:* 2 godziny

### Problem Statement dla agenta

markdown
## Zadanie
Utwórz TypeScript types i API service dla Network Topology w frontendzie.

## Wymagania
1. Types (`network-topology.types.ts`):
   - NetworkTopologyData
   - TopologyNode
   - TopologyConnection
   - NodeType, NodeSourceType (union types)
   - Константы: NODE_ICONS, NODE_TYPE_LABELS, TECHNOLOGY_COLORS, TECHNOLOGY_LABELS

2. Service (`networkTopology.service.ts`):
   - create(data)
   - getById(id)
   - getByContractAndSubsystem(contractId, subsystemIndex)
   - getAllByContract(contractId)
   - update(id, data)
   - delete(id)
   - getHistory(contractId, subsystemIndex)
   - Używaj istniejącego `api` service z axios

## Pliki do utworzenia
- `frontend/src/types/network-topology.types.ts`
- `frontend/src/services/networkTopology.service.ts`

## Acceptance Criteria
- [ ] Wszystkie typy są poprawnie zdefiniowane
- [ ] Service używa istniejącego api client
- [ ] Ikony są zdefiniowane dla wszystkich typów węzłów
- [ ] Kolory technologii są zgodne z wymaganiami (fiber=pomarańczowy, lan=niebieski)


### Pliki

*Utworzyć:*
- frontend/src/types/network-topology.types.ts (90 linii)
- frontend/src/services/networkTopology.service.ts (60 linii)

*Zmodyfikować:*
- Brak

*Szacowana wielkość:* ~150 linii

---

## 📦 PR #4: Frontend - Utility Functions

*Branch:* feature/topology-frontend-utils  
*Zależności:* PR #3 ✅  
*Priorytet:* 🟡 Wysoki  
*Szacowany czas:* 2 godziny

### Problem Statement dla agenta

markdown
## Zadanie
Zaimplementuj utility functions dla Network Topology: kalkulacja odległości, auto-layout, walidacja.

## Wymagania
1. Distance Calculator (`distanceCalculator.ts`):
   - calculateDistance(sourceKm?, targetKm?) - oblicz odległość z kilometrażu
   - formatDistance(distance) - formatuj do "X.XX km"
   - Handle edge cases (undefined, NaN)

2. Auto Layout (`autoLayout.ts`):
   - autoLayoutNodes(nodes, edges) - rozmieść węzły w rzędach
   - Sortuj po kilometrażu
   - Rozmieszczaj w grid (max 4 węzły na rząd)
   - Zwróć zaktualizowane nodes z nowymi positions

3. Validator (`topologyValidator.ts`):
   - validateTopology(nodes, connections)
   - Sprawdź: brak węzłów, nieprawidłowe referencje, self-connections
   - Sprawdź: obiekty pomocnicze mają kilometraż
   - Zwróć { isValid, errors[] }

## Pliki do utworzenia
- `frontend/src/components/network-topology/utils/distanceCalculator.ts`
- `frontend/src/components/network-topology/utils/autoLayout.ts`
- `frontend/src/components/network-topology/utils/topologyValidator.ts`

## Opcjonalnie
- Unit testy w `__tests__/` dla każdego utility

## Acceptance Criteria
- [ ] calculateDistance obsługuje wszystkie edge cases
- [ ] autoLayout sortuje po kilometrażu
- [ ] validateTopology zwraca czytelne komunikaty błędów
- [ ] Wszystkie funkcje mają poprawne TypeScript types


### Pliki

*Utworzyć:*
- frontend/src/components/network-topology/utils/distanceCalculator.ts (25 linii)
- frontend/src/components/network-topology/utils/autoLayout.ts (50 linii)
- frontend/src/components/network-topology/utils/topologyValidator.ts (60 linii)

*Zmodyfikować:*
- Brak

*Szacowana wielkość:* ~135 linii

---

## 📦 PR #5: Frontend - Custom Node Component

*Branch:* feature/topology-custom-node  
*Zależności:* PR #3 ✅  
*Priorytet:* 🟡 Wysoki  
*Szacowany czas:* 2-3 godziny

### Problem Statement dla agenta

markdown
## Zadanie
Utwórz custom node component dla React Flow używany w topologii sieciowej.

## Wymagania
1. Component `CustomNode`:
   - Wyświetla ikonę, typ, label, kilometraż
   - Różne style dla obiektów pomocniczych (dashed border)
   - Status aktywny/pasywny dla obiektów pomocniczych
   - React Flow handles (top=target, bottom=source)
   - Używa CSS variables z grover/husky theme

2. Styling:
   - Grover theme (dark): ciemne tło, pomarańczowe akcenty
   - Husky theme (light): białe tło, niebieskie akcenty
   - Hover effects
   - Auxiliary nodes: dashed border
   - Active auxiliary: solid green border

## Pliki do utworzenia
- `frontend/src/components/network-topology/nodes/CustomNode.tsx`
- `frontend/src/components/network-topology/nodes/CustomNode.css`

## Acceptance Criteria
- [ ] Node wyświetla wszystkie wymagane informacje
- [ ] Hover effect działa
- [ ] Obiekty pomocnicze mają dashed border
- [ ] Status aktywny/pasywny jest widoczny
- [ ] Działa w obu themach (grover/husky)
- [ ] React Flow handles są prawidłowo umieszczone


### Pliki

*Utworzyć:*
- frontend/src/components/network-topology/nodes/CustomNode.tsx (80 linii)
- frontend/src/components/network-topology/nodes/CustomNode.css (120 linii)

*Zmodyfikować:*
- Brak

*Szacowana wielkość:* ~200 linii

---

## 📦 PR #6: Frontend - Modals (Connection & Auxiliary)

*Branch:* feature/topology-modals  
*Zależności:* PR #3 ✅, PR #4 ✅  
*Priorytet:* 🟡 Wysoki  
*Szacowany czas:* 3-4 godziny

### Problem Statement dla agenta

markdown
## Zadanie
Zaimplementuj modalne okna dla tworzenia połączeń i dodawania obiektów pomocniczych.

## Wymagania
1. ConnectionModal:
   - Props: sourceNode, targetNode, onClose, onConfirm
   - Wybór technologii: FIBER (radio) / LAN (radio)
   - Automatyczna kalkulacja odległości z kilometrażu (używaj distanceCalculator)
   - Jeśli brak kilometrażu: input do ręcznego podania
   - Pole notatki (opcjonalne)
   - Walidacja: distance > 0
   - Wyświetl preview połączenia (źródło → cel z ikonami)

2. AuxiliaryNodeModal:
   - Props: onClose, onConfirm
   - Pole nazwa (required)
   - Pole kilometraż (required, number)
   - Checkbox aktywne/pasywne (default: pasywne)
   - Helper text wyjaśniający różnicę
   - Walidacja: nazwa niepusta, kilometraż >= 0

3. Styling:
   - Używaj istniejących klas modal z grover-theme
   - Responsywne
   - Accessible (ARIA labels)

## Pliki do utworzenia
- `frontend/src/components/network-topology/ConnectionModal.tsx`
- `frontend/src/components/network-topology/ConnectionModal.css`
- `frontend/src/components/network-topology/AuxiliaryNodeModal.tsx`
- `frontend/src/components/network-topology/AuxiliaryNodeModal.css`

## Acceptance Criteria
- [ ] ConnectionModal kalkuluje odległość automatycznie
- [ ] ConnectionModal wymusza ręczne podanie jeśli brak kilometrażu
- [ ] AuxiliaryNodeModal waliduje wszystkie pola
- [ ] Checkbox aktywne/pasywne działa
- [ ] Modals zamykają się po potwierdzeniu
- [ ] Działa w obu themach


### Pliki

*Utworzyć:*
- frontend/src/components/network-topology/ConnectionModal.tsx (150 linii)
- frontend/src/components/network-topology/ConnectionModal.css (80 linii)
- frontend/src/components/network-topology/AuxiliaryNodeModal.tsx (120 linii)
- frontend/src/components/network-topology/AuxiliaryNodeModal.css (50 linii)

*Zmodyfikować:*
- Brak

*Szacowana wielkość:* ~400 linii

---

## 📦 PR #7: Frontend - Sidebar & Toolbar

*Branch:* feature/topology-sidebar-toolbar  
*Zależności:* PR #3 ✅  
*Priorytet:* 🟢 Średni  
*Szacowany czas:* 2-3 godziny

### Problem Statement dla agenta

markdown
## Zadanie
Zaimplementuj sidebar z listą obiektów i toolbar z akcjami dla Network Topology.

## Wymagania
1. TopologySidebar:
   - Props: tasks[], onAddAuxiliary, onAddExternal
   - Lista obiektów z kontraktu (draggable)
   - Każdy item: ikona, nazwa, kilometraż
   - Sekcja "Dodaj obiekty" z 2 przyciskami
   - Legenda technologii (fiber=pomarańczowy, lan=niebieski)
   - Drag & drop: setData z JSON node data

2. TopologyToolbar:
   - Props: onAutoLayout, onSave, onExportPDF?, isSaving?, isDirty?, version?
   - Przycisk Auto-Layout (lewy górny róg)
   - Przycisk PDF (opcjonalny)
   - Przycisk Zapisz z wersją (disabled gdy !isDirty)
   - Stan loading podczas zapisywania

3. Styling:
   - Sidebar: 280px szerokość, scrollable
   - Draggable items: hover effect, grab cursor
   - Toolbar: sticky na górze

## Pliki do utworzenia
- `frontend/src/components/network-topology/TopologySidebar.tsx`
- `frontend/src/components/network-topology/TopologySidebar.css`
- `frontend/src/components/network-topology/TopologyToolbar.tsx`
- `frontend/src/components/network-topology/TopologyToolbar.css`

## Acceptance Criteria
- [ ] Sidebar wyświetla wszystkie zadania z kontraktu
- [ ] Drag & drop działa (dataTransfer)
- [ ] Toolbar buttons są właściwie disabled/enabled
- [ ] Legenda jest czytelna
- [ ] Działa w obu themach


### Pliki

*Utworzyć:*
- frontend/src/components/network-topology/TopologySidebar.tsx (100 linii)
- frontend/src/components/network-topology/TopologySidebar.css (120 linii)
- frontend/src/components/network-topology/TopologyToolbar.tsx (60 linii)
- frontend/src/components/network-topology/TopologyToolbar.css (60 linii)

*Zmodyfikować:*
- Brak

*Szacowana wielkość:* ~340 linii

---

## 📦 PR #8: Frontend - Main NetworkTopologyStep

*Branch:* feature/topology-main-component  
*Zależności:* PR #3-7 ✅ (wszystkie poprzednie frontend PR-y)  
*Priorytet:* 🔴 Krytyczny  
*Szacowany czas:* 4-5 godzin

### Problem Statement dla agenta

markdown
## Zadanie
Zaimplementuj główny component NetworkTopologyStep integrujący wszystkie poprzednie części.

## Wymagania
1. Component NetworkTopologyStep:
   - Props: wizardData, onUpdate, subsystemIndex
   - React Flow canvas z custom nodes
   - Inicjalizacja nodes z subsystem.taskDetails
   - Drag & drop z sidebar na canvas
   - Tworzenie połączeń (onConnect)
   - Auto-layout integration
   - Zapis do wizardData.networkTopologies[subsystemIndex]
   - Obsługa modali (connection, auxiliary)
   - Stats display (liczba węzłów, połączeń, dystans)
   - isDirty tracking
   - Error/success alerts

2. React Flow setup:
   - Custom node types
   - Background + Controls + MiniMap
   - Edge styling (colors per technology)
   - Animated edges
   - MarkerEnd (arrows)

3. Instalacja dependencies:
   - reactflow@11.10.4
   - @reactflow/core, @reactflow/background, @reactflow/controls, @reactflow/minimap

## Pliki do utworzenia
- `frontend/src/components/network-topology/NetworkTopologyStep.tsx`
- `frontend/src/components/network-topology/NetworkTopologyStep.css`

## Pliki do zmodyfikowania
- `frontend/package.json` (dodaj reactflow dependencies)

## Acceptance Criteria
- [ ] Canvas renderuje się poprawnie
- [ ] Drag & drop z sidebar działa
- [ ] Połączenia tworzą się poprawnie
- [ ] Auto-layout działa
- [ ] Zapis do wizardData działa
- [ ] Stats są aktualne
- [ ] Wszystkie modals działają
- [ ] React Flow controls działają (zoom, pan, fit view)


### Pliki

*Utworzyć:*
- frontend/src/components/network-topology/NetworkTopologyStep.tsx (350 linii)
- frontend/src/components/network-topology/NetworkTopologyStep.css (100 linii)

*Zmodyfikować:*
- frontend/package.json (+4 linie dependencies)

*Szacowana wielkość:* ~454 linii

---

## 📦 PR #9: Wizard Integration

*Branch:* feature/topology-wizard-integration  
*Zależności:* PR #8 ✅  
*Priorytet:* 🔴 Krytyczny  
*Szacowany czas:* 2-3 godziny

### Problem Statement dla agenta

markdown
## Zadanie
Zintegruj NetworkTopologyStep z contract wizardem jako krok 6 (po TaskRelationshipsStep).

## Wymagania
1. Aktualizacja types:
   - Dodaj `networkTopologies?: NetworkTopologyData[]` do WizardData interface

2. Dodanie kroku do wizarda:
   - Import NetworkTopologyStep
   - Renderuj na kroku 6 TYLKO dla SMOKIP_A i SMOKIP_B
   - Przekaż props: wizardData, onUpdate, subsystemIndex

3. Nawigacja:
   - handleNext: po kroku 5, sprawdź czy SMOKIP → idź do 6, inaczej pomiń do 7
   - handleBack: z kroku 7, sprawdź czy SMOKIP → wróć do 6, inaczej do 5
   - Dodaj przycisk "Pomiń ▷" na kroku 6

4. Helper function:
   - shouldShowTopologyStep(subsystemType) → true dla SMOKIP_A/B

## Pliki do zmodyfikowania
- `frontend/src/components/contracts/wizard/types/wizard.types.ts` (+2 linie)
- `frontend/src/components/contracts/wizard/ContractWizardModal.tsx` (+50 linii)

## Acceptance Criteria
- [ ] Krok topologii pojawia się tylko dla SMOKIP
- [ ] Nawigacja działa prawidłowo (next/back/skip)
- [ ] Przycisk Pomiń działa
- [ ] Dane zapisują się w wizardData
- [ ] Nie psuje istniejących kroków


### Pliki

*Utworzyć:*
- Brak

*Zmodyfikować:*
- frontend/src/components/contracts/wizard/types/wizard.types.ts (+2 linie)
- frontend/src/components/contracts/wizard/ContractWizardModal.tsx (+50 linii)

*Szacowana wielkość:* ~52 linie

---

## 📦 PR #10: Remove Old Fiber Module

*Branch:* feature/remove-fiber-module  
*Zależności:* PR #9 ✅  
*Priorytet:* 🟢 Średni  
*Szacowany czas:* 1 godzina

### Problem Statement dla agenta

markdown
## Zadanie
Usuń stary moduł Fiber, który został zastąpiony przez Network Topology.

## Wymagania
1. Usuń pliki:
   - `frontend/src/components/tasks/FiberSchemaModal.tsx`
   - `frontend/src/types/fiber.types.ts`

2. Znajdź i usuń wszystkie referencje:
   - Importy FiberSchemaModal
   - Importy fiber.types
   - Użycia w TaskDetailModal (jeśli były)

3. Opcjonalnie:
   - Usuń `fiberConfig` z Task.entity metadata (jeśli istnieje)

## Pliki do usunięcia
- `frontend/src/components/tasks/FiberSchemaModal.tsx`
- `frontend/src/types/fiber.types.ts`

## Pliki do zmodyfikowania
- Wszystkie pliki importujące powyższe

## Acceptance Criteria
- [ ] Wszystkie pliki Fiber usunięte
- [ ] Brak importów do nieistniejących plików
- [ ] Build bez błędów
- [ ] Grep nie znajduje referencji do Fiber


### Pliki

*Usunąć:*
- frontend/src/components/tasks/FiberSchemaModal.tsx
- frontend/src/types/fiber.types.ts

*Zmodyfikować:*
- Pliki z referencjami (TBD podczas implementacji)

*Szacowana wielkość:* ~-200 linii (usunięcie)

---

## 📦 PR #11: Documentation

*Branch:* feature/topology-documentation  
*Zależności:* PR #1-10 ✅ (wszystkie)  
*Priorytet:* 🟢 Średni  
*Szacowany czas:* 1-2 godziny

### Problem Statement dla agenta

markdown
## Zadanie
Utwórz kompletną dokumentację dla Network Topology Builder.

## Wymagania
1. Plik główny dokumentacji:
   - Overview funkcjonalności
   - Architektura (high-level diagram)
   - Struktura danych (entities, types)
   - Backend API endpoints
   - Frontend components
   - Integracja z wizardem
   - UI/UX guidelines (kolory, ikony, style)
   - Plan wdrożenia
   - FAQ
   - Roadmap v2

2. Aktualizacja README:
   - Sekcja o Network Topology
   - Link do pełnej dokumentacji

## Pliki do utworzenia
- `docs/NETWORK_TOPOLOGY_IMPLEMENTATION.md`

## Pliki do zmodyfikowania
- `README.md` (+10 linii)

## Acceptance Criteria
- [ ] Dokumentacja jest kompletna i czytelna
- [ ] Zawiera przykłady użycia
- [ ] README ma link do dokumentacji
- [ ] Diagramy są zrozumiałe


### Pliki

*Utworzyć:*
- docs/NETWORK_TOPOLOGY_IMPLEMENTATION.md (800+ linii - użyj części 1 i 2 z tego planu)

*Zmodyfikować:*
- README.md (+10 linii)

*Szacowana wielkość:* ~810 linii

---

## 📊 Podsumowanie PR-ów

| PR | Branch | Zależności | Priorytet | Wielkość | Czas |
|----|--------|-----------|-----------|----------|------|
| #1 | topology-backend-database | - | 🔴 | ~170 | 2-3h |
| #2 | topology-backend-api | #1 | 🔴 | ~412 | 3-4h |
| #3 | topology-frontend-types | #2 | 🟡 | ~150 | 2h |
| #4 | topology-frontend-utils | #3 | 🟡 | ~135 | 2h |
| #5 | topology-custom-node | #3 | 🟡 | ~200 | 2-3h |
| #6 | topology-modals | #3,#4 | 🟡 | ~400 | 3-4h |
| #7 | topology-sidebar-toolbar | #3 | 🟢 | ~340 | 2-3h |
| #8 | topology-main-component | #3-7 | 🔴 | ~454 | 4-5h |
| #9 | topology-wizard-integration | #8 | 🔴 | ~52 | 2-3h |
| #10 | remove-fiber-module | #9 | 🟢 | ~-200 | 1h |
| #11 | topology-documentation | #1-10 | 🟢 | ~810 | 1-2h |

*Łącznie:* ~2,923 linii (bez usunięć) | ~27-32 godziny

---

## 🔄 Kolejność wykonywania

### Faza 1: Backend (równolegle niewykonalne)
1. ✅ PR #1 → PR #2

### Faza 2: Frontend Foundation (równolegle)
2. ✅ PR #3 (wymaga #2)
3. ⚡ PR #4, #5, #7 (równolegle po #3)

### Faza 3: Frontend Advanced (częściowo równolegle)
4. ✅ PR #6 (wymaga #3, #4)
5. ✅ PR #8 (wymaga #3-7)

### Faza 4: Integration & Cleanup
6. ✅ PR #9 (wymaga #8)
7. ✅ PR #10 (wymaga #9)
8. ✅ PR #11 (dokumentacja ostatnia)

### Wizualizacja zależności


PR #1 (Database)
  ↓
PR #2 (Backend API)
  ↓
PR #3 (Types & Service)
  ├→ PR #4 (Utils) ────────┐
  ├→ PR #5 (Custom Node) ──┤
  └→ PR #7 (Sidebar/Toolbar)┘
       ↓                    ↓
     PR #6 (Modals) ←──────┘
       ↓
     PR #8 (Main Component)
       ↓
     PR #9 (Wizard Integration)
       ↓
     PR #10 (Remove Fiber)
       ↓
     PR #11 (Documentation)


---

## 🤖 Instrukcje dla GitHub Copilot Agent

### Format problem statement dla każdego PR

Użyj tego szablonu podczas tworzenia PR:

markdown
## 🎯 Cel
[Krótki opis co implementujemy]

## 📋 Zadania
- [ ] Zadanie 1
- [ ] Zadanie 2
- [ ] Zadanie 3

## 📁 Pliki

### Utworzyć
- `ścieżka/do/pliku1.ts` - [opis]
- `ścieżka/do/pliku2.css` - [opis]

### Zmodyfikować
- `ścieżka/do/pliku3.ts` - [co zmienić]

## ✅ Acceptance Criteria
- [ ] Kryterium 1
- [ ] Kryterium 2
- [ ] Build przechodzi bez błędów
- [ ] Żadne istniejące testy nie są zepsute

## 📚 Kontekst
[Dodatkowe informacje, linki do dokumentacji itp.]

## 🔗 Zależności
- Wymaga PR #X
- Blokuje PR #Y


---

## 🚀 Gotowe do użycia!

Każdy PR ma:
- ✅ Jasny cel
- ✅ Szczegółowy problem statement
- ✅ Listę plików do utworzenia/modyfikacji
- ✅ Acceptance criteria
- ✅ Określone zależności

*Użycie:*
Skopiuj "Problem Statement dla agenta" z wybranego PR i użyj go do utworzenia Pull Requesta przez GitHub Copilot Agent.

Chcesz, żebym teraz rozpoczął implementację od PR #1?