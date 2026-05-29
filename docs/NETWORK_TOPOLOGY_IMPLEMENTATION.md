# 🌐 Network Topology Builder — Kompletna Dokumentacja Implementacji

> **Data utworzenia:** 2026-04-30  
> **Autor:** @Crack8502pl  
> **Wersja:** 1.0  
> **Issue:** [#408 Network Topology Builder](https://github.com/Crack8502pl/der-mag-platform/issues/408)  
> **Repozytorium:** `Crack8502pl/der-mag-platform`

---

## 📑 SPIS TREŚCI

1. [Overview — Przegląd modułu](#1-overview--przegląd-modułu)
2. [Architektura systemu](#2-architektura-systemu)
3. [Struktura danych](#3-struktura-danych)
4. [Backend — Entity, Migracja, DTO](#4-backend--entity-migracja-dto)
5. [Backend API — Service & Controller](#5-backend-api--service--controller)
6. [Frontend — Typy i serwis](#6-frontend--typy-i-serwis)
7. [Frontend — Komponenty edytora](#7-frontend--komponenty-edytora)
8. [Frontend — Utilities](#8-frontend--utilities)
9. [Frontend — Modals i Sidebar](#9-frontend--modals-i-sidebar)
10. [Integracja z wizardem kontraktu (nowy kontrakt)](#10-integracja-z-wizardem-kontraktu)
11. [Integracja z Extend Contract Wizard (rozszerzanie kontraktu)](#11-integracja-z-extend-contract-wizard-rozszerzanie-kontraktu)
12. [Network Page — zakładka Topologia](#12-network-page--zakładka-topologia)
13. [UI/UX Guidelines](#13-uiux-guidelines)
14. [API Endpoints — Specyfikacja](#14-api-endpoints--specyfikacja)
15. [Przykłady użycia (Code Snippets)](#15-przykłady-użycia-code-snippets)
16. [Plan wdrożenia (PR #1–#11)](#16-plan-wdrożenia-pr-1-11)
17. [FAQ — Najczęstsze pytania](#17-faq--najczęstsze-pytania)
18. [Roadmap v2 — Planowane rozszerzenia](#18-roadmap-v2--planowane-rozszerzenia)

---

## 1. Overview — Przegląd modułu

### 1.1 Czym jest Network Topology Builder?

**Network Topology Builder** to wbudowany moduł wizualnego projektowania topologii sieciowych, dedykowany podsystemom **SMOKIP_A** i **SMOKIP_B** w platformie Grover. Umożliwia managerom i koordynatorom graficzne ułożenie węzłów zadań oraz połączeń (kablowych lub sieciowych) w postaci interaktywnego diagramu.

### 1.2 Główne możliwości

| Funkcja | Opis |
|---------|------|
| 🖱️ Drag & Drop węzłów | Przeciąganie węzłów po canvas (SVG + React) |
| 🔗 Łączenie węzłów | Tryb łączenia — kliknij source → kliknij target |
| 🟠 Technologie połączeń | Światłowód (fiber) i LAN — wizualnie rozróżnione |
| 📏 Auto-kalkulacja odległości | Na podstawie kilometrażu zadań |
| ⚡ Auto-Layout | Automatyczne rozmieszczenie węzłów w siatce |
| 🕐 Historia wersji | Każdy zapis tworzy nową wersję (niemodyfikowalną) |
| 📄 Export PDF | Eksport diagramu do PDF |
| 🔄 Przywracanie wersji | Wczytanie dowolnej historycznej wersji topologii |

### 1.3 Kiedy moduł jest dostępny?

Moduł jest aktywowany **wyłącznie** dla podsystemów:
- `SMOKIP_A` — SMOK-IP/CMOK-IP Wariant A/SKP
- `SMOKIP_B` — SMOK-IP/CMOK-IP Wariant B

Dla wszystkich innych podsystemów (SMW, CSDIP, LAN PKP PLK, SSWiN, SSP, SUG, itp.) krok topologii jest **ukryty** i pomijany w nawigacji wizarda.

### 1.4 Kontekst w kreatorze kontraktu

Network Topology Builder jest zintegrowany jako **krok 6** (opcjonalny) w Kreatorze Kontraktu (`ContractWizardModal`). Użytkownik może:
- ✅ Zaprojektować topologię dla każdego podsystemu SMOKIP
- ⏭️ Pominąć krok i przejść bezpośrednio do `infrastructure`
- 🔄 Wrócić do kroku i edytować topologię

---

## 2. Architektura systemu

### 2.1 Diagram architektury (Mermaid)

```mermaid
graph TD
    subgraph Frontend
        WZ[ContractWizardModal] -->|krok topology| NTS[NetworkTopologyStep]
        NTS --> NTE[NetworkTopologyEditor]
        NTE --> SB[TopologySidebar]
        NTE --> TB[TopologyToolbar]
        NTE --> CM[ConnectionModal]
        NTE --> ANM[AddNodeModal]
        NTE --> THM[TopologyHistoryModal]
        NTE --> CN[CustomNode]
        NP[NetworkPage] -->|zakładka Topologia| NTE
    end

    subgraph Services
        NTE --> NS[networkTopology.service.ts]
        NS -->|axios| API
    end

    subgraph Backend
        API[/api/network-topology] --> NTC[NetworkTopologyController]
        NTC --> NTSC[NetworkTopologyService]
        NTSC --> NTR[(network_topologies)]
        NTR -->|FK CASCADE| CR[(contracts)]
    end
```

### 2.2 Architektura komponentów (ASCII)

```
ContractWizardModal
│
├─ (krok topology, tylko SMOKIP_A/B)
│   └─ NetworkTopologyStep
│       ├─ TopologyToolbar        [Pasek narzędzi: Auto-Layout, Zapisz, PDF]
│       ├─ TopologySidebar        [Lista zadań do przeciągania + Legenda]
│       └─ NetworkTopologyEditor  [Główny canvas SVG]
│           ├─ CustomNode[]       [Węzły: task | auxiliary | external]
│           ├─ <SVG lines>        [Połączenia fiber🟠 / LAN🔵]
│           ├─ ConnectionModal    [Wybór technologii + kalkulacja odległości]
│           ├─ AddNodeModal       [Dodawanie węzłów manualnych]
│           └─ TopologyHistoryModal [Historia wersji]
│
└─ (inne kroki: basic, config, details, infrastructure, logistics...)

NetworkPage (zakładka "Topologia")
└─ NetworkTopologyEditor  [Standalone editor poza wizardem]
```

### 2.3 Przepływ danych

```
[Wizard] subsystems[i].taskDetails
        │
        ▼
NetworkTopologyStep (inicjalizacja węzłów)
        │  lokalny stan (nodes[], connections[])
        ▼
TopologySidebar ──drag──► canvas (drop → addNode)
                                    │
                          [edycja: drag węzłów, łączenie]
                                    │
                          TopologyToolbar [Zapisz]
                                    │
                          networkTopology.service.ts
                                    │
                              POST/PUT /api/network-topology
                                    │
                          NetworkTopologyService (backend)
                                    │
                          network_topologies (PostgreSQL)
```

---

## 3. Struktura danych

### 3.1 TypeScript Interfaces (frontend)

Plik: `frontend/src/types/network-topology.types.ts`

```typescript
// Typ węzła topologii
export type NodeType = 'task' | 'auxiliary' | 'external';

// Źródło danych węzła
export type NodeSourceType = 'contract' | 'manual';

// Technologia połączenia
export type ConnectionTechnology = 'fiber' | 'lan';

// Węzeł topologii
export interface TopologyNode {
  id: string;                         // UUID
  type: NodeType;                     // task | auxiliary | external
  label: string;                      // Wyświetlana etykieta
  position: { x: number; y: number }; // Pozycja na canvas
  data: {
    taskId?: number;                  // ID zadania (tylko type='task')
    km?: number;                      // Kilometraż (do kalkulacji odległości)
    technology?: ConnectionTechnology;// Domyślna technologia
    icon?: string;                    // Emoji ikona
    [key: string]: unknown;           // Rozszerzalne metadane
  };
}

// Połączenie między węzłami
export interface TopologyConnection {
  id: string;             // UUID
  source: string;         // ID węzła źródłowego
  target: string;         // ID węzła docelowego
  label?: string;         // Opcjonalna etykieta (np. odległość)
  technology?: ConnectionTechnology; // fiber | lan
}

// Pełny obiekt topologii (response z API)
export interface NetworkTopologyData {
  id: string;
  name: string;
  version: number;
  contractId: number;
  subsystemIndex: number;
  subsystemType: string;
  nodes: TopologyNode[];
  connections: TopologyConnection[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 Stałe i mapowania

```typescript
// Ikony dla typów węzłów
export const NODE_ICONS: Record<NodeType, string> = {
  task: '📦',
  auxiliary: '🔧',
  external: '🌐',
};

// Etykiety typów węzłów (po polsku)
export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  task: 'Zadanie',
  auxiliary: 'Obiekt pomocniczy',
  external: 'Zewnętrzny',
};

// Kolory linii połączeń
export const TECHNOLOGY_COLORS: Record<ConnectionTechnology, string> = {
  fiber: '#FF8C00',   // Pomarańczowy — światłowód
  lan: '#1E90FF',     // Niebieski — LAN
};
```

### 3.3 Encja bazy danych (backend)

Plik: `backend/src/entities/NetworkTopology.entity.ts`

| Kolumna | Typ PostgreSQL | Opis |
|---------|---------------|------|
| `id` | `uuid` | Klucz główny (auto-generowany) |
| `name` | `varchar` | Nazwa topologii |
| `version` | `integer` | Numer wersji (auto-increment) |
| `contractId` | `integer` | FK → `contracts.id` (CASCADE delete) |
| `subsystemIndex` | `integer` | Indeks podsystemu w kontrakcie |
| `subsystemType` | `varchar` | Typ podsystemu (np. `SMOKIP_A`) |
| `nodes` | `jsonb` | Tablica węzłów (JSON) |
| `connections` | `jsonb` | Tablica połączeń (JSON) |
| `notes` | `text` | Opcjonalne notatki |
| `deletedAt` | `timestamp` | Soft delete |
| `createdAt` | `timestamp` | Data utworzenia |
| `updatedAt` | `timestamp` | Data ostatniej aktualizacji |

### 3.4 Schemat bazy danych (DDL)

```sql
CREATE TABLE network_topologies (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR NOT NULL,
    version     INTEGER NOT NULL DEFAULT 1,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    subsystem_index INTEGER NOT NULL,
    subsystem_type  VARCHAR NOT NULL,
    nodes       JSONB NOT NULL DEFAULT '[]',
    connections JSONB NOT NULL DEFAULT '[]',
    notes       TEXT,
    deleted_at  TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index dla szybkiego wyszukiwania po kontrakcie i podsystemie
CREATE INDEX idx_network_topologies_contract_subsystem
    ON network_topologies (contract_id, subsystem_index);
```

---

## 4. Backend — Entity, Migracja, DTO

### 4.1 NetworkTopology Entity

Plik: `backend/src/entities/NetworkTopology.entity.ts`

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm';
import { Contract } from './Contract.entity';

export interface TopologyNode {
  id: string;
  type: 'task' | 'auxiliary' | 'external';
  label: string;
  position: { x: number; y: number };
  data: {
    taskId?: number;
    km?: number;
    technology?: 'fiber' | 'lan';
    icon?: string;
    [key: string]: unknown;
  };
}

export interface TopologyConnection {
  id: string;
  source: string;
  target: string;
  label?: string;
  technology?: 'fiber' | 'lan';
}

@Entity('network_topologies')
@Index(['contractId', 'subsystemIndex'])
export class NetworkTopology {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: 1 })
  version: number;

  @Column({ name: 'contract_id' })
  contractId: number;

  @ManyToOne(() => Contract, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ name: 'subsystem_index' })
  subsystemIndex: number;

  @Column({ name: 'subsystem_type' })
  subsystemType: string;

  @Column({ type: 'jsonb', default: [] })
  nodes: TopologyNode[];

  @Column({ type: 'jsonb', default: [] })
  connections: TopologyConnection[];

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### 4.2 DTO (Data Transfer Objects)

Plik: `backend/src/dto/network-topology.dto.ts`

```typescript
import {
  IsString, IsInt, IsOptional, IsArray,
  ValidateNested, IsIn, IsNumber, IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNetworkTopologyDto {
  @IsString()
  name: string;

  @IsInt()
  contractId: number;

  @IsInt()
  subsystemIndex: number;

  @IsString()
  subsystemType: string;

  @IsArray()
  nodes: TopologyNodeDto[];

  @IsArray()
  connections: TopologyConnectionDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateNetworkTopologyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  nodes?: TopologyNodeDto[];

  @IsOptional()
  @IsArray()
  connections?: TopologyConnectionDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

class TopologyNodeDto {
  @IsUUID()
  id: string;

  @IsIn(['task', 'auxiliary', 'external'])
  type: string;

  @IsString()
  label: string;

  // position, data — walidowane przez @ValidateNested
}

class TopologyConnectionDto {
  @IsUUID()
  id: string;

  @IsUUID()
  source: string;

  @IsUUID()
  target: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsIn(['fiber', 'lan'])
  technology?: string;
}
```

---

## 5. Backend API — Service & Controller

### 5.1 NetworkTopologyService

Plik: `backend/src/services/networkTopology.service.ts`

#### Metody serwisu

| Metoda | Parametry | Opis |
|--------|-----------|------|
| `create(dto)` | `CreateNetworkTopologyDto` | Tworzy nową topologię; version = 1 |
| `getByContractAndSubsystem(contractId, subsystemIndex)` | `number, number` | Zwraca ostatnią wersję |
| `getAllByContract(contractId)` | `number` | Zwraca wszystkie topologie kontraktu |
| `getHistory(contractId, subsystemIndex)` | `number, number` | Historia wersji (desc) |
| `update(id, dto)` | `string, UpdateNetworkTopologyDto` | Tworzy nową wersję (+1) |
| `delete(id)` | `string` | Soft delete |

```typescript
// Przykład — metoda create
async create(dto: CreateNetworkTopologyDto): Promise<NetworkTopology> {
  const topology = this.repo.create({
    ...dto,
    version: 1,
  });
  return this.repo.save(topology);
}

// Przykład — metoda update (auto-increment version)
async update(id: string, dto: UpdateNetworkTopologyDto): Promise<NetworkTopology> {
  const existing = await this.repo.findOneOrFail({ where: { id } });
  const newTopology = this.repo.create({
    ...existing,
    ...dto,
    id: undefined,      // nowy rekord
    version: existing.version + 1,
    createdAt: undefined,
    updatedAt: undefined,
  });
  return this.repo.save(newTopology);
}
```

### 5.2 NetworkTopologyController

Plik: `backend/src/controllers/NetworkTopologyController.ts`

```typescript
@Controller('/api/network-topology')
export class NetworkTopologyController {
  constructor(private readonly service: NetworkTopologyService) {}

  @Post('/')
  async create(@Body() dto: CreateNetworkTopologyDto) {
    return this.service.create(dto);
  }

  @Get('/:contractId/:subsystemIndex')
  async getByContractAndSubsystem(
    @Param('contractId') contractId: number,
    @Param('subsystemIndex') subsystemIndex: number,
  ) {
    return this.service.getByContractAndSubsystem(contractId, subsystemIndex);
  }

  @Get('/:contractId')
  async getAllByContract(@Param('contractId') contractId: number) {
    return this.service.getAllByContract(contractId);
  }

  @Get('/:contractId/:subsystemIndex/history')
  async getHistory(
    @Param('contractId') contractId: number,
    @Param('subsystemIndex') subsystemIndex: number,
  ) {
    return this.service.getHistory(contractId, subsystemIndex);
  }

  @Put('/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateNetworkTopologyDto) {
    return this.service.update(id, dto);
  }

  @Delete('/:id')
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
```

### 5.3 Rejestracja tras

Plik: `backend/src/routes/networkTopology.routes.ts`

```typescript
import { Router } from 'express';
import { NetworkTopologyController } from '../controllers/NetworkTopologyController';

const router = Router();
const controller = new NetworkTopologyController();

router.post('/', (req, res) => controller.create(req, res));
router.get('/:contractId', (req, res) => controller.getAllByContract(req, res));
router.get('/:contractId/:subsystemIndex', (req, res) =>
  controller.getByContractAndSubsystem(req, res));
router.get('/:contractId/:subsystemIndex/history', (req, res) =>
  controller.getHistory(req, res));
router.put('/:id', (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));

export default router;
```

Rejestracja w `backend/src/app.ts`:
```typescript
import networkTopologyRoutes from './routes/networkTopology.routes';
app.use('/api/network-topology', networkTopologyRoutes);
```

---

## 6. Frontend — Typy i serwis

### 6.1 Frontend Service (axios)

Plik: `frontend/src/services/networkTopology.service.ts`

```typescript
import axios from '../utils/axios';
import type {
  NetworkTopologyData,
  CreateNetworkTopologyPayload,
  UpdateNetworkTopologyPayload,
} from '../types/network-topology.types';

const BASE = '/api/network-topology';

export const networkTopologyService = {
  // Utwórz nową topologię
  async create(data: CreateNetworkTopologyPayload): Promise<NetworkTopologyData> {
    const res = await axios.post<NetworkTopologyData>(BASE, data);
    return res.data;
  },

  // Pobierz aktualną topologię dla kontraktu i podsystemu
  async getByContractAndSubsystem(
    contractId: number,
    subsystemIndex: number,
  ): Promise<NetworkTopologyData | null> {
    const res = await axios.get<NetworkTopologyData>(
      `${BASE}/${contractId}/${subsystemIndex}`,
    );
    return res.data;
  },

  // Pobierz wszystkie topologie dla kontraktu
  async getAllByContract(contractId: number): Promise<NetworkTopologyData[]> {
    const res = await axios.get<NetworkTopologyData[]>(`${BASE}/${contractId}`);
    return res.data;
  },

  // Pobierz historię wersji
  async getHistory(
    contractId: number,
    subsystemIndex: number,
  ): Promise<NetworkTopologyData[]> {
    const res = await axios.get<NetworkTopologyData[]>(
      `${BASE}/${contractId}/${subsystemIndex}/history`,
    );
    return res.data;
  },

  // Aktualizuj topologię (tworzy nową wersję)
  async update(
    id: string,
    data: UpdateNetworkTopologyPayload,
  ): Promise<NetworkTopologyData> {
    const res = await axios.put<NetworkTopologyData>(`${BASE}/${id}`, data);
    return res.data;
  },

  // Usuń topologię (soft delete)
  async delete(id: string): Promise<void> {
    await axios.delete(`${BASE}/${id}`);
  },
};
```

---

## 7. Frontend — Komponenty edytora

### 7.1 NetworkTopologyEditor — Główny edytor

Plik: `frontend/src/components/network/topology/NetworkTopologyEditor.tsx`

Główny komponent canvas-based oparty na **czystym React + HTML/SVG** (zero zewnętrznych bibliotek do rysowania). Zarządza:

- Stanem węzłów (`nodes: TopologyNode[]`) i połączeń (`connections: TopologyConnection[]`)
- Trybem łączenia węzłów (`connectingMode: boolean`)
- Historią wersji
- Persystencją do API

#### Kluczowe mechanizmy

**Drag & Drop węzłów:**
```typescript
// Ref do śledzenia stanu przeciągania (unika re-renderów)
const dragState = useRef<{
  isDragging: boolean;
  nodeId: string | null;
  startX: number;
  startY: number;
  startNodeX: number;
  startNodeY: number;
} | null>(null);

const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
  dragState.current = {
    isDragging: true,
    nodeId,
    startX: e.clientX,
    startY: e.clientY,
    startNodeX: nodes.find(n => n.id === nodeId)!.position.x,
    startNodeY: nodes.find(n => n.id === nodeId)!.position.y,
  };
};

const handleMouseMove = (e: React.MouseEvent) => {
  if (!dragState.current?.isDragging) return;
  const { nodeId, startX, startY, startNodeX, startNodeY } = dragState.current;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  setNodes(prev => prev.map(n =>
    n.id === nodeId
      ? { ...n, position: { x: startNodeX + dx, y: startNodeY + dy } }
      : n,
  ));
};
```

**Tryb łączenia:**
```typescript
const [connectingMode, setConnectingMode] = useState(false);
const [pendingSource, setPendingSource] = useState<string | null>(null);

const handleNodeClick = (nodeId: string) => {
  if (!connectingMode) return;
  if (!pendingSource) {
    setPendingSource(nodeId);      // 1. klik: wybierz source
  } else if (pendingSource !== nodeId) {
    // 2. klik: otwórz ConnectionModal
    setConnectionModalData({ source: pendingSource, target: nodeId });
    setPendingSource(null);
    setConnectingMode(false);
  }
};
```

**Renderowanie połączeń SVG (routing bezpośredni + wykrywanie krzyżowań):**
```tsx
// Wykrywanie krzyżowań aktualizowane przy każdej zmianie węzłów/połączeń
const [crossingConnections, setCrossingConnections] = useState<Set<string>>(new Set());

useEffect(() => {
  const connectionLines = connections.map(conn => {
    const { sourcePoint, targetPoint } = getConnectionEndpoints(src, tgt);
    return { id: conn.id, sourceId: conn.source, targetId: conn.target,
             start: sourcePoint, end: targetPoint };
  }).filter(Boolean);
  const crossings = findCrossingConnections(connectionLines);
  const ids = new Set<string>();
  crossings.forEach(([a, b]) => { ids.add(a); ids.add(b); });
  setCrossingConnections(ids);
}, [nodes, connections]);

// Renderowanie — linie zaczynają/kończą się na krawędziach węzłów
<svg className="topology-connections-svg">
  {connections.map(conn => {
    const { sourcePoint, targetPoint } = getConnectionEndpoints(src, tgt);
    const isCrossing = crossingConnections.has(conn.id);
    return (
      <g key={conn.id}>
        {/* Przezroczysta szeroka linia ułatwiająca kliknięcie */}
        <line x1={sourcePoint.x} y1={sourcePoint.y}
              x2={targetPoint.x} y2={targetPoint.y}
              stroke="transparent" strokeWidth="16"
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }} />
        {/* Widoczna linia — czerwona dla krzyżujących się */}
        <line x1={sourcePoint.x} y1={sourcePoint.y}
              x2={targetPoint.x} y2={targetPoint.y}
              className={`topology-conn topology-conn--${tech}
                ${isSelected ? 'topology-conn--selected' : ''}
                ${isCrossing ? 'topology-conn--crossing' : ''}`} />
      </g>
    );
  })}
</svg>
```

### 7.2 CustomNode — Węzeł topologii

Plik: `frontend/src/components/network/topology/CustomNode.tsx`

Wizualizacja pojedynczego węzła. Różnicuje wygląd na podstawie `type`:

| Typ | Kolor ramki | Ikona | Opis |
|-----|------------|-------|------|
| `task` | `#4a9eff` (niebieski) | 📦 | Zadanie kontraktowe |
| `auxiliary` | `#ff8c00` (pomarańczowy) | 🔧 | Obiekt pomocniczy |
| `external` | `#28a745` (zielony) | 🌐 | Węzeł zewnętrzny |

```tsx
interface CustomNodeProps {
  node: TopologyNode;
  isSelected: boolean;
  isConnecting: boolean;
  isPendingSource: boolean;
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onClick: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
}

const CustomNode: React.FC<CustomNodeProps> = ({
  node, isSelected, isConnecting, isPendingSource,
  onMouseDown, onClick, onDelete,
}) => {
  const icon = NODE_ICONS[node.type];
  const borderColor = node.type === 'task'
    ? '#4a9eff'
    : node.type === 'auxiliary'
    ? '#ff8c00'
    : '#28a745';

  return (
    <div
      className={`topology-node ${node.type} ${isSelected ? 'selected' : ''} ${isPendingSource ? 'pending-source' : ''}`}
      style={{
        left: node.position.x,
        top: node.position.y,
        borderColor,
        cursor: isConnecting ? 'crosshair' : 'grab',
      }}
      onMouseDown={e => onMouseDown(e, node.id)}
      onClick={() => onClick(node.id)}
    >
      <span className="node-icon">{icon}</span>
      <span className="node-label">{node.label}</span>
      {node.data.km !== undefined && (
        <span className="node-km">km {node.data.km}</span>
      )}
      <button
        className="node-delete"
        onClick={e => { e.stopPropagation(); onDelete(node.id); }}
      >
        ✕
      </button>
    </div>
  );
};
```

### 7.3 AddNodeModal

Plik: `frontend/src/components/network/topology/AddNodeModal.tsx`

Modal do ręcznego dodawania węzłów. Obsługuje 3 typy:

```tsx
interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (node: Omit<TopologyNode, 'id' | 'position'>) => void;
}

// Pola formularza
const [nodeType, setNodeType] = useState<NodeType>('auxiliary');
const [label, setLabel] = useState('');
const [km, setKm] = useState<number | undefined>(undefined);
```

### 7.4 TopologyHistoryModal

Plik: `frontend/src/components/network/topology/TopologyHistoryModal.tsx`

Modal historii wersji z paginacją. Każda pozycja pokazuje:
- Numer wersji
- Data i godzina zapisu
- Liczba węzłów / połączeń
- Przycisk "Przywróć"

```tsx
interface TopologyHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: number;
  subsystemIndex: number;
  onRestore: (topology: NetworkTopologyData) => void;
}
```

---

## 8. Frontend — Utilities

### 8.1 distanceCalculator

Plik: `frontend/src/components/network-topology/utils/distanceCalculator.ts`

```typescript
/**
 * Oblicza odległość między dwoma węzłami na podstawie kilometrażu.
 * @param sourceKm  - Kilometraż węzła źródłowego
 * @param targetKm  - Kilometraż węzła docelowego
 * @returns Odległość w kilometrach (zawsze dodatnia) lub undefined
 */
export function calculateDistance(
  sourceKm?: number,
  targetKm?: number,
): number | undefined {
  if (sourceKm === undefined || targetKm === undefined) return undefined;
  return Math.abs(targetKm - sourceKm);
}

/**
 * Formatuje odległość do wyświetlenia na połączeniu.
 * @example formatDistance(1.234) → "1.234 km"
 */
export function formatDistance(distance: number | undefined): string {
  if (distance === undefined) return '';
  return `${distance.toFixed(3)} km`;
}
```

### 8.2 autoLayout

Plik: `frontend/src/components/network-topology/utils/autoLayout.ts`

Implementacja auto-rozmieszczenia węzłów w siatce prostokątnej. Sortuje węzły po kilometrażu, max 4 na rząd.

```typescript
const GRID_COLS = 4;
const NODE_WIDTH = 160;
const NODE_HEIGHT = 80;
const GAP_X = 60;
const GAP_Y = 60;
const OFFSET_X = 40;
const OFFSET_Y = 40;

/**
 * Automatycznie rozmieszcza węzły w siatce.
 * Węzły typu 'task' sortowane są rosnąco wg data.km.
 */
export function autoLayoutNodes(
  nodes: TopologyNode[],
  _edges: TopologyConnection[],  // Zarezerwowane dla przyszłych algorytmów
): TopologyNode[] {
  const sorted = [...nodes].sort((a, b) => {
    const aKm = a.data.km ?? Infinity;
    const bKm = b.data.km ?? Infinity;
    return aKm - bKm;
  });

  return sorted.map((node, idx) => ({
    ...node,
    position: {
      x: OFFSET_X + (idx % GRID_COLS) * (NODE_WIDTH + GAP_X),
      y: OFFSET_Y + Math.floor(idx / GRID_COLS) * (NODE_HEIGHT + GAP_Y),
    },
  }));
}
```

### 8.3 topologyValidator

Plik: `frontend/src/components/network-topology/utils/topologyValidator.ts`

```typescript
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Waliduje topologię przed zapisem do API.
 * Sprawdza:
 * - Brak węzłów sierocych (bez połączeń)
 * - Brak duplikatów połączeń
 * - Poprawność technologii
 * - Brak self-loop
 */
export function validateTopology(
  nodes: TopologyNode[],
  connections: TopologyConnection[],
): ValidationResult {
  const errors: string[] = [];
  const nodeIds = new Set(nodes.map(n => n.id));

  // Walidacja połączeń
  connections.forEach(conn => {
    if (!nodeIds.has(conn.source)) {
      errors.push(`Połączenie ${conn.id}: nieznany węzeł źródłowy ${conn.source}`);
    }
    if (!nodeIds.has(conn.target)) {
      errors.push(`Połączenie ${conn.id}: nieznany węzeł docelowy ${conn.target}`);
    }
    if (conn.source === conn.target) {
      errors.push(`Połączenie ${conn.id}: pętla własna (self-loop) jest niedozwolona`);
    }
  });

  return { isValid: errors.length === 0, errors };
}
```

### 8.4 lineIntersection — Wykrywanie krzyżowań

Plik: `frontend/src/components/network-topology/utils/lineIntersection.ts`

Moduł geometryczny do wykrywania przecięć linii połączeń. Używany zarówno przez edytor (wizualizacja) jak i przez algorytm force-directed (optymalizacja).

```typescript
export interface Point {
  x: number;
  y: number;
}

export interface LineSegment {
  start: Point;
  end: Point;
}

/**
 * Oblicza odległość euklidesową między dwoma punktami.
 */
export function pointDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Sprawdza czy dwa odcinki się przecinają (algorytm CCW).
 * Ignoruje edge cases z liniami równoległymi i pokrywającymi się
 * (nie są traktowane jako przecięcie).
 * @returns true jeśli linie się przecinają
 */
export function doLinesIntersect(line1: LineSegment, line2: LineSegment): boolean { ... }

/**
 * Znajduje wszystkie krzyżujące się połączenia w topologii.
 * Używa nodeId do wykrywania wspólnych węzłów (połączenia dzielące węzeł
 * nie są traktowane jako krzyżowanie).
 * @returns Tablica par [connId1, connId2] krzyżujących się połączeń
 */
export function findCrossingConnections(
  connections: Array<{ id: string; sourceId: string; targetId: string; start: Point; end: Point }>
): Array<[string, string]> { ... }
```

#### Użycie w komponentach

```typescript
// Wykrywanie krzyżowań po każdej zmianie węzłów lub połączeń
useEffect(() => {
  const connectionLines = connections.map(conn => {
    const { sourcePoint, targetPoint } = getConnectionEndpoints(src, tgt);
    return { id: conn.id, sourceId: conn.source, targetId: conn.target,
             start: sourcePoint, end: targetPoint };
  }).filter(Boolean);

  const crossings = findCrossingConnections(connectionLines);
  const crossingIds = new Set<string>();
  crossings.forEach(([id1, id2]) => { crossingIds.add(id1); crossingIds.add(id2); });
  setCrossingConnections(crossingIds);
}, [nodes, connections]);
```

### 8.5 edgeRouting — Routing do krawędzi węzłów

Plik: `frontend/src/components/network-topology/utils/edgeRouting.ts`

Implementacja routingu bezpośredniego: linie połączeń zaczynają się i kończą na **krawędziach prostokątów** węzłów, nie w ich środkach.

```typescript
const NODE_WIDTH = 140;
const NODE_HEIGHT = 60;

/**
 * Oblicza punkt zaczepienia linii na krawędzi węzła.
 * Promień z centrum węzła w kierunku celu przecina krawędź prostokąta.
 */
export function getEdgeConnectionPoint(
  node: TopologyNode,
  targetX: number,
  targetY: number
): EdgePoint {
  const nodeCenterX = node.position.x + NODE_WIDTH / 2;
  const nodeCenterY = node.position.y + NODE_HEIGHT / 2;
  const dx = targetX - nodeCenterX;
  const dy = targetY - nodeCenterY;
  // Oblicza parametr t dla przecięcia z każdą krawędzią i wybiera najmniejszy
  let t = Infinity;
  if (dirX > 0) t = Math.min(t, halfWidth / dirX);
  if (dirX < 0) t = Math.min(t, -halfWidth / dirX);
  if (dirY > 0) t = Math.min(t, halfHeight / dirY);
  if (dirY < 0) t = Math.min(t, -halfHeight / dirY);
  return { x: nodeCenterX + dirX * t, y: nodeCenterY + dirY * t };
}

/**
 * Oblicza punkty zaczepienia obu końców połączenia.
 * Linia zaczyna się na krawędzi węzła źródłowego i kończy
 * na krawędzi węzła docelowego.
 */
export function getConnectionEndpoints(
  sourceNode: TopologyNode,
  targetNode: TopologyNode
): { sourcePoint: EdgePoint; targetPoint: EdgePoint } { ... }
```

### 8.6 forceDirectedLayout — Algorytm optymalizacji układu

Plik: `frontend/src/components/network-topology/utils/forceDirectedLayout.ts`

Algorytm siłowy (force-directed) minimalizujący krzyżowania połączeń. Uruchamiany **manualnie** przyciskiem "Optymalizuj układ" — węzły nie przesuwają się automatycznie.

#### Parametry algorytmu

| Stała | Wartość | Opis |
|-------|---------|------|
| `REPULSION_STRENGTH` | 5000 | Siła odpychania Coulomba między węzłami |
| `SPRING_STRENGTH` | 0.05 | Stała sprężyny Hooke'a dla połączonych węzłów |
| `SPRING_LENGTH` | 200 | Naturalna długość sprężyny (px) |
| `CROSSING_PENALTY` | 8000 | Kara za krzyżujące się linie (odpychanie) |
| `DAMPING` | 0.85 | Tłumienie prędkości (zbieżność algorytmu) |
| `MAX_ITERATIONS` | 300 | Maksymalna liczba iteracji |
| `MIN_ENERGY` | 0.5 | Próg energii dla wczesnego zakończenia |

#### Kolejność sił w każdej iteracji

1. **Odpychanie Coulomba** — każda para węzłów odpycha się (proporcjonalnie do 1/d²)
2. **Sprężyna Hooke'a** — połączone węzły przyciągają się do odległości `SPRING_LENGTH`
3. **Kara za krzyżowania** — węzły połączeń krzyżujących się są odpychane
4. **Aktualizacja pozycji** — prędkości i pozycje aktualizowane z tłumieniem; węzły ograniczone do obszaru canvasu

```typescript
export function optimizeLayout(
  nodes: TopologyNode[],
  connections: TopologyConnection[]
): TopologyNode[] {
  // Iteracje force-directed...
  // Wczesne zakończenie gdy totalEnergy < MIN_ENERGY
  return updatedNodes;
}
```

#### Integracja z edytorem

```typescript
// NetworkTopologyStep.tsx / NetworkTopologyEditor.tsx
const handleOptimizeLayout = useCallback(() => {
  const optimized = optimizeLayout(nodes, connections);
  setNodes(optimized);
  setIsDirty(true);
}, [nodes, connections]);
```

#### Porównanie: autoLayoutNodes() vs optimizeLayout()

| Cecha | `autoLayoutNodes()` (grid) | `optimizeLayout()` (force-directed) |
|-------|---------------------------|--------------------------------------|
| **Algorytm** | Siatka prostokątna | Symulacja fizyczna (siły) |
| **Cel** | Porządkowanie węzłów | Minimalizacja krzyżowań |
| **Czas działania** | Natychmiastowy | ~1–2 s dla 15+ węzłów (szacowane) |
| **Determinizm** | Tak (zawsze ten sam wynik) | Tak (deterministyczny dla tej samej pozycji startowej) |
| **Sortowanie** | Rosnąco wg kilometrażu | Według topologii połączeń |
| **Krzyżowania** | Mogą wystąpić | Aktywnie redukowane |
| **Kiedy użyć** | Na początku, by zainicjować układ | Po dodaniu wielu połączeń z krzyżowaniami |
| **Przycisk** | 📊 Auto-układ | ⚡ Optymalizuj / ⚡ Optymalizuj (N) |

**Zalecany workflow:**
1. Kliknij **📊 Auto-układ** — węzły ułożą się w czytelnej siatce
2. Dodaj połączenia między węzłami
3. Jeśli pojawią się krzyżowania (linie czerwone), kliknij **⚡ Optymalizuj** — algorytm force-directed zredukuje krzyżowania

---

## 9. Frontend — Modals i Sidebar

### 9.1 ConnectionModal

Plik: `frontend/src/components/network-topology/ConnectionModal.tsx`

Modal tworzenia połączenia między dwoma węzłami. Pokazuje:
- Wybór technologii (FIBER / LAN)
- Auto-kalkulowaną odległość na podstawie `data.km`
- Opcjonalne pole etykiety

```tsx
interface ConnectionModalProps {
  isOpen: boolean;
  sourceNode: TopologyNode;
  targetNode: TopologyNode;
  onConfirm: (technology: ConnectionTechnology, label: string) => void;
  onCancel: () => void;
}

// Odległość jest auto-kalkulowana w useEffect
useEffect(() => {
  const dist = calculateDistance(sourceNode.data.km, targetNode.data.km);
  setAutoLabel(formatDistance(dist));
}, [sourceNode, targetNode]);
```

Style pliku: `frontend/src/components/network-topology/ConnectionModal.css`

### 9.2 AuxiliaryNodeModal

Plik: `frontend/src/components/network-topology/AuxiliaryNodeModal.tsx`

Modal dodawania obiektów pomocniczych (szafy, repeatory, itp.):

```tsx
interface AuxiliaryNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { label: string; km?: number; active: boolean }) => void;
}

// Pola:
// - Nazwa obiektu (label) — wymagane
// - Kilometraż (km) — opcjonalne
// - Aktywny/Pasywny — toggle (wpływa na styl węzła)
```

Style pliku: `frontend/src/components/network-topology/AuxiliaryNodeModal.css`

### 9.3 TopologySidebar

Plik: `frontend/src/components/network-topology/TopologySidebar.tsx`

Boczny panel z listą zadań kontraktowych i opcjami dodawania węzłów. Wspiera **drag & drop** do canvas.

```tsx
interface TopologySidebarProps {
  tasks: Array<{ id: number; label: string; km?: number }>;
  onAddAuxiliary: () => void;
  onAddExternal: () => void;
}

// Drag handler — przekazuje dane przez dataTransfer
const handleDragStart = (e: React.DragEvent, task: TaskItem) => {
  e.dataTransfer.setData('application/json', JSON.stringify({
    type: 'task',
    taskId: task.id,
    label: task.label,
    km: task.km,
  }));
  e.dataTransfer.effectAllowed = 'copy';
};
```

#### Struktura sidebaru

```
┌─────────────────────────┐
│ 📋 Zadania (drag →)     │
├─────────────────────────┤
│ 📦 Zadanie 1  km 12.3   │
│ 📦 Zadanie 2  km 18.7   │
│ 📦 Zadanie 3  km 24.1   │
│ ...                     │
├─────────────────────────┤
│ ➕ Dodaj obiekt         │
│   pomocniczy 🔧         │
├─────────────────────────┤
│ ➕ Dodaj węzeł          │
│   zewnętrzny 🌐         │
├─────────────────────────┤
│ 🎨 Legenda              │
│ ━━ Światłowód 🟠        │
│ ━━ LAN 🔵               │
└─────────────────────────┘
```

Style pliku: `frontend/src/components/network-topology/TopologySidebar.css`

### 9.4 TopologyToolbar

Plik: `frontend/src/components/network-topology/TopologyToolbar.tsx`

Pasek narzędzi na górze edytora:

```tsx
interface TopologyToolbarProps {
  onAutoLayout: () => void;
  onOptimizeLayout?: () => void;  // Uruchamia force-directed layout
  onSave: () => void;
  onExportPDF?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  version?: number;
  crossingCount?: number;         // Liczba wykrytych krzyżowań
}
```

| Przycisk | Stan | Opis |
|---------|------|------|
| 📊 Auto-układ | zawsze | Rozmieszcza węzły w siatce wg kilometrażu |
| ⚡ Optymalizuj (N) | gdy `onOptimizeLayout` przekazany | Uruchamia force-directed layout; liczba krzyżowań w nawiasie; pomarańczowy gdy krzyżowania > 0 |
| 📄 PDF | gdy `onExportPDF` przekazany | Eksport do PDF |
| 💾 Zapisz (vN) | gdy `isDirty` | Zapisuje jako nową wersję |

Gdy `crossingCount > 0`, wyświetla się dodatkowo ostrzeżenie: `⚠️ Wykryto N krzyżujących się połączeń`.

Style pliku: `frontend/src/components/network-topology/TopologyToolbar.css`

### 9.5 Barrel exports

Plik: `frontend/src/components/network/topology/index.ts`

```typescript
export { default as NetworkTopologyEditor } from './NetworkTopologyEditor';
export { default as CustomNode } from './CustomNode';
export { default as AddNodeModal } from './AddNodeModal';
export { default as TopologyHistoryModal } from './TopologyHistoryModal';
```

---

## 10. Integracja z wizardem kontraktu (nowy kontrakt)

### 10.1 NetworkTopologyStep — Krok 6 wizarda

Plik: `frontend/src/components/network-topology/NetworkTopologyStep.tsx`

Główny kontener łączący wszystkie komponenty edytora w krok wizarda:

```tsx
interface NetworkTopologyStepProps {
  wizardData: WizardData;
  subsystemIndex: number;
  onUpdate: (nodes: TopologyNode[], connections: TopologyConnection[]) => void;
}
```

**Inicjalizacja węzłów** z `taskDetails` podsystemu:
```typescript
useEffect(() => {
  const subsystem = wizardData.subsystems[subsystemIndex];
  const saved = wizardData.networkTopologies?.[subsystemIndex];

  if (saved) {
    // Wczytaj wcześniej zapisany stan
    setNodes(saved.nodes);
    setConnections(saved.connections);
  } else if (subsystem?.taskDetails) {
    // Inicjalizacja z zadań podsystemu
    const initialNodes: TopologyNode[] = subsystem.taskDetails
      .filter(td => td.taskType === 'LCS')
      .map((td, idx) => ({
        id: crypto.randomUUID(),
        type: 'task',
        label: td.label ?? `Zadanie ${idx + 1}`,
        position: {
          x: OFFSET_X + (idx % GRID_COLS) * (NODE_WIDTH + GAP_X),
          y: OFFSET_Y + Math.floor(idx / GRID_COLS) * (NODE_HEIGHT + GAP_Y),
        },
        data: {
          taskId: td.taskWizardId,
          km: td.km,
          icon: NODE_ICONS.task,
        },
      }));
    setNodes(initialNodes);
  }
}, [subsystemIndex]);
```

**Lokalne przechowywanie stanu** (przed zapisem do API):
```typescript
const handleUpdate = (newNodes: TopologyNode[], newConnections: TopologyConnection[]) => {
  setNodes(newNodes);
  setConnections(newConnections);
  onUpdate(newNodes, newConnections);  // → wizardData.networkTopologies[subsystemIndex]
};
```

### 10.2 Modyfikacje wizard.types.ts

Plik: `frontend/src/components/contracts/wizard/types/wizard.types.ts`

Dodane pole do `WizardData`:
```typescript
export interface WizardData {
  // ... istniejące pola ...

  // Dane topologii sieciowych (per podsystem)
  networkTopologies?: Record<number, {
    nodes: TopologyNode[];
    connections: TopologyConnection[];
  }>;
}
```

### 10.3 Modyfikacje ContractWizardModal.tsx

Plik: `frontend/src/components/contracts/wizard/ContractWizardModal.tsx`

#### Helper: shouldShowTopologyStep

```typescript
/**
 * Zwraca true tylko dla podsystemów SMOKIP_A i SMOKIP_B.
 * Krok topologii jest opcjonalny i ma przycisk "Pomiń".
 */
export function shouldShowTopologyStep(subsystemType: string): boolean {
  return subsystemType === 'SMOKIP_A' || subsystemType === 'SMOKIP_B';
}
```

#### Dodanie do getStepInfo

```typescript
// W getStepInfo() — po kroku 'relationships', przed 'infrastructure'
if (shouldShowTopologyStep(currentSubsystem?.type)) {
  steps.push({
    type: 'topology',
    label: 'Topologia sieci',
    subsystemIndex: currentSubsystemIndex,
  });
}
```

#### Modyfikacja handleNext / handleBack

```typescript
// Nawigacja respektuje krok topology
const handleNext = () => {
  if (currentStep.type === 'relationships') {
    const subsystem = wizardData.subsystems[currentStep.subsystemIndex];
    if (shouldShowTopologyStep(subsystem.type)) {
      goTo('topology', currentStep.subsystemIndex);
    } else {
      goTo('infrastructure');
    }
  } else if (currentStep.type === 'topology') {
    goTo('infrastructure');
  }
  // ... inne kroki
};

const handleBack = () => {
  if (currentStep.type === 'infrastructure') {
    const lastSmokipIdx = findLastSmokipSubsystemIndex(wizardData);
    if (lastSmokipIdx >= 0) {
      goTo('topology', lastSmokipIdx);
    } else {
      goTo('relationships', lastSubsystemIndex);
    }
  } else if (currentStep.type === 'topology') {
    goTo('relationships', currentStep.subsystemIndex);
  }
  // ... inne kroki
};
```

#### Przycisk "Pomiń ▷"

```tsx
{currentStep.type === 'topology' && (
  <button
    className="btn btn-secondary skip-topology-btn"
    onClick={() => goTo('infrastructure')}
  >
    Pomiń ▷
  </button>
)}
```

### 10.4 Diagram nawigacji

```
[relationships]
      │
      ├─ SMOKIP_A/B? ──YES──► [topology] ──► [infrastructure]
      │                                            ▲
      └─ NIE ─────────────────────────────────────┘

[infrastructure]
      │
      ├─ SMOKIP_A/B? ──YES──► [topology] ──► [relationships]
      │                                            ▲
      └─ NIE ─────────────────────────────────────┘
```

---

## 11. Integracja z Extend Contract Wizard (rozszerzanie kontraktu)

### 11.1 Przegląd ExtendWizardModal

`ExtendWizardModal` pozwala rozszerzyć **istniejący** kontrakt (w statusie `CREATED` lub `IN_PROGRESS`) o:
- Nowe podsystemy (w tym SMOKIP_A / SMOKIP_B)
- Nowe zadania w istniejących podsystemach

Plik: `frontend/src/components/contracts/wizard/ExtendWizardModal.tsx`

### 11.2 Typy danych — extend-wizard.types.ts

Plik: `frontend/src/components/contracts/wizard/types/extend-wizard.types.ts`

```typescript
import type {
  SubsystemWizardData, TaskDetail,
  WizardTaskRelationships, InfrastructureData, LogisticsData
} from './wizard.types';
import type { SubsystemType } from '../../../../config/subsystemWizardConfig';

/** Istniejący podsystem kontraktu (wczytany z API) */
export interface ExistingSubsystem {
  id: number;                       // ID podsystemu w bazie
  type: SubsystemType;              // np. 'SMOKIP_A', 'SMOKIP_B'
  taskCount: number;                // liczba istniejących zadań
  existingTasks: TaskDetail[];      // aktualne zadania (read-only)
  newTasks: TaskDetail[];           // nowe zadania do dodania
  addingNewTasks: boolean;          // czy tryb dodawania jest aktywny
  ipPool?: string;                  // opcjonalna pula IP
}

/** Globalny stan wizard rozszerzania kontraktu */
export interface ExtendWizardData {
  contractId: number;
  contractNumber: string;
  customName: string;
  orderDate: string;
  projectManagerId: string;
  managerCode: string;
  liniaKolejowa?: string;
  existingSubsystems: ExistingSubsystem[];  // podsystemy już w kontrakcie
  newSubsystems: SubsystemWizardData[];      // zupełnie nowe podsystemy
  taskRelationships?: WizardTaskRelationships;
  infrastructure?: InfrastructureData;
  logistics?: Partial<LogisticsData>;
}

/** Kroki nawigacji extend wizarda */
export interface ExtendStepInfo {
  type:
    | 'review'             // Przegląd kontraktu
    | 'subsystems-overview'// Lista podsystemów
    | 'config'             // Konfiguracja nowego podsystemu
    | 'details'            // Szczegóły zadań nowego podsystemu (SMOKIP)
    | 'add-tasks'          // Dodawanie zadań do istniejącego podsystemu
    | 'relationships'      // Relacje LCS–NASTAWNIA (opcjonalny)
    | 'infrastructure'     // Infrastruktura
    | 'logistics'          // Logistyka
    | 'preview'            // Podgląd przed wysłaniem
    | 'success';           // Potwierdzenie sukcesu
  subsystemIndex?: number;
  isNew?: boolean;         // true = nowy podsystem, false = istniejący
}
```

> ⚠️ **Uwaga:** Typ `ExtendStepInfo.type` **nie zawiera** kroku `'topology'` — integracja topologii z extend wizard jest planowana w Roadmap v2 (patrz sekcja [18](#18-roadmap-v2--planowane-rozszerzenia)).

### 11.3 Sekwencja kroków extend wizarda

```
buildStepSequence() → ExtendStepInfo[]

[review]
  └─► [subsystems-overview]
        ├─► [add-tasks] × N  (dla każdego istniejącego sub z addingNewTasks=true)
        ├─► [config] → [details?]  × M  (dla każdego nowego sub; details tylko dla SMOKIP)
        ├─► [relationships]?  (tylko gdy SMOKIP ma LCS/NASTAWNIA)
        └─► [infrastructure] → [logistics] → [preview] → [success]
```

Kluczowy fragment kodu z `ExtendWizardModal.tsx`:

```typescript
const buildStepSequence = (): ExtendStepInfo[] => {
  const steps: ExtendStepInfo[] = [
    { type: 'review' },
    { type: 'subsystems-overview' },
  ];

  // Kroki dodawania zadań do istniejących podsystemów
  extendData.existingSubsystems
    .filter((s) => s.addingNewTasks)
    .forEach((_, idx) => {
      steps.push({ type: 'add-tasks', subsystemIndex: idx, isNew: false });
    });

  // Konfiguracja + opcjonalnie szczegóły dla nowych podsystemów
  extendData.newSubsystems.forEach((sub, idx) => {
    steps.push({ type: 'config', subsystemIndex: idx, isNew: true });
    if (sub.type === 'SMOKIP_A' || sub.type === 'SMOKIP_B') {
      steps.push({ type: 'details', subsystemIndex: idx, isNew: true });
    }
  });

  // Krok relationships — tylko gdy SMOKIP ma LCS lub NASTAWNIA
  const hasRelationships =
    extendData.existingSubsystems.some(
      (s) =>
        (s.type === 'SMOKIP_A' || s.type === 'SMOKIP_B') &&
        (s.existingTasks.some((t) => t.taskType === 'LCS' || t.taskType === 'NASTAWNIA') ||
          (s.addingNewTasks &&
            s.newTasks.some((t) => t.taskType === 'LCS' || t.taskType === 'NASTAWNIA')))
    ) ||
    extendData.newSubsystems.some(
      (s) =>
        (s.type === 'SMOKIP_A' || s.type === 'SMOKIP_B') &&
        s.taskDetails?.some((t) => t.taskType === 'LCS' || t.taskType === 'NASTAWNIA')
    );

  if (hasRelationships) steps.push({ type: 'relationships' });

  steps.push({ type: 'infrastructure' });
  steps.push({ type: 'logistics' });
  steps.push({ type: 'preview' });
  steps.push({ type: 'success' });

  return steps;
};
```

### 11.4 Różnice między ContractWizardModal a ExtendWizardModal

| Aspekt | ContractWizardModal (nowy kontrakt) | ExtendWizardModal (rozszerzanie) |
|--------|-------------------------------------|----------------------------------|
| Typ danych | `WizardData` | `ExtendWizardData` |
| Krok topologii | ✅ `'topology'` (opcjonalny, SMOKIP) | ❌ Brak (planowany w v2) |
| Krok details SMOKIP | ✅ Dla nowych podsystemów | ✅ Dla nowych podsystemów (`isNew: true`) |
| Istniejące podsystemy | Nie dotyczy | `ExistingSubsystem[]` (wczytane z API) |
| Nowe podsystemy | `SubsystemWizardData[]` | `SubsystemWizardData[]` |
| Przycisk "Pomiń ▷" | ✅ Na kroku topology | Nie dotyczy (brak kroku topology) |
| State hook | `useWizardState` | `useExtendWizardState` |
| Submit endpoint | `POST /api/contracts` | `POST /api/contracts/:id/extend` |

### 11.5 Zarządzanie topologią przy rozszerzaniu kontraktu — podejście bieżące

Ponieważ `ExtendWizardModal` **nie zawiera kroku topologii**, zarządzanie topologiami dla rozszerzanych kontraktów odbywa się poza wizardem — przez **NetworkPage** (zakładka "Topologia"):

```
Użytkownik rozszerza kontrakt (ExtendWizardModal)
  └─► Kontrakt zapisany z nowymi podsystemami / zadaniami
        └─► Użytkownik przechodzi do NetworkPage
              └─► Wybiera kontrakt → zakładka "Topologia"
                    └─► NetworkTopologyEditor (pełny edytor)
                          ├─► Tworzy/edytuje topologię dla istniejących SMOKIP
                          └─► Tworzy topologię dla nowych SMOKIP
```

Przykład nawigacji:
```tsx
// W ContractDetailPage lub podobnym:
<button onClick={() => navigate(`/network?contractId=${contractId}`)}>
  Edytuj topologię sieci
</button>
```

### 11.6 Planowane zmiany — integracja topologii z ExtendWizardModal (Roadmap v2)

Aby w pełni zintegrować krok topologii z `ExtendWizardModal`, wymagane są następujące zmiany:

#### 11.6.1 Rozszerzenie `extend-wizard.types.ts`

```typescript
import type { TopologyNode, TopologyConnection } from '../../../../types/network-topology.types';

export interface ExtendWizardData {
  // ... istniejące pola ...

  /** Dane topologii per podsystem (index istniejącego lub nowego) */
  networkTopologies?: {
    existing: Record<number, { nodes: TopologyNode[]; connections: TopologyConnection[] }>;
    new: Record<number, { nodes: TopologyNode[]; connections: TopologyConnection[] }>;
  };
}
```

#### 11.6.2 Rozszerzenie `ExtendStepInfo`

```typescript
export interface ExtendStepInfo {
  type:
    | 'review'
    | 'subsystems-overview'
    | 'config'
    | 'details'
    | 'add-tasks'
    | 'relationships'
    | 'topology'        // ← NOWY krok
    | 'infrastructure'
    | 'logistics'
    | 'preview'
    | 'success';
  subsystemIndex?: number;
  isNew?: boolean;
}
```

#### 11.6.3 Modyfikacja `buildStepSequence` w `ExtendWizardModal`

```typescript
// Po istniejących krokach config/details, dodaj topology dla SMOKIP:
extendData.newSubsystems.forEach((sub, idx) => {
  steps.push({ type: 'config', subsystemIndex: idx, isNew: true });
  if (sub.type === 'SMOKIP_A' || sub.type === 'SMOKIP_B') {
    steps.push({ type: 'details', subsystemIndex: idx, isNew: true });
    steps.push({ type: 'topology', subsystemIndex: idx, isNew: true }); // ← NOWY
  }
});

// Dla istniejących SMOKIP z nowymi zadaniami:
extendData.existingSubsystems
  .filter((s) => s.addingNewTasks && (s.type === 'SMOKIP_A' || s.type === 'SMOKIP_B'))
  .forEach((_, idx) => {
    steps.push({ type: 'topology', subsystemIndex: idx, isNew: false }); // ← NOWY
  });
```

#### 11.6.4 Renderowanie kroku topology w `ExtendWizardModal`

```tsx
{currentStepInfo.type === 'topology' && currentStepInfo.subsystemIndex !== undefined && (
  <NetworkTopologyStep
    wizardData={extendData as unknown as WizardData}
    subsystemIndex={currentStepInfo.subsystemIndex}
    onUpdate={(nodes, connections) => {
      const key = currentStepInfo.isNew ? 'new' : 'existing';
      updateExtendData({
        networkTopologies: {
          ...extendData.networkTopologies,
          [key]: {
            ...(extendData.networkTopologies?.[key] ?? {}),
            [currentStepInfo.subsystemIndex!]: { nodes, connections },
          },
        },
      });
    }}
  />
)}
```

### 11.7 Diagram przepływu — porównanie nowy vs rozszerzanie

```
╔══════════════════════════════════════════════════════════════════════╗
║              NOWY KONTRAKT (ContractWizardModal)                     ║
╠══════════════════════════════════════════════════════════════════════╣
║  details → [relationships?] → [topology? SMOKIP] → infrastructure   ║
║                                      ↑                               ║
║                                 Krok 6 (opcjonalny)                  ║
║                                 Przycisk "Pomiń ▷"                   ║
╠══════════════════════════════════════════════════════════════════════╣
║           ROZSZERZANIE KONTRAKTU (ExtendWizardModal)                 ║
╠══════════════════════════════════════════════════════════════════════╣
║  review → subsystems-overview → [add-tasks?] → [config+details?]    ║
║       → [relationships?] → infrastructure → logistics → preview      ║
║                                                                      ║
║  ⚠️  Brak kroku topology — zarządzanie przez NetworkPage             ║
╚══════════════════════════════════════════════════════════════════════╝
```

### 11.8 Aktualne ograniczenia i zalecenia

| Ograniczenie | Zalecany workaround |
|---|---|
| Brak kroku topology w extend wizard | Użyj NetworkPage po zakończeniu extend |
| Brak automatycznego przeniesienia topologii przy extend | Topologie nie są kopiowane — edytuj ręcznie przez NetworkPage |
| `ExtendWizardData` nie ma pola `networkTopologies` | W Roadmap v2 — dodanie pola do interfejsu |
| Nowe SMOKIP z extend nie mają topologii | Tworzenie przez NetworkPage po merge extend |

---

## 12. Network Page — zakładka Topologia

### 12.1 NetworkPage

Plik: `frontend/src/components/modules/NetworkPage.tsx`

Standalone strona z zakładką "Topologia" dostępna poza wizardem — umożliwia przeglądanie i edycję istniejących topologii:

```tsx
const NetworkPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pools' | 'topology'>('pools');

  return (
    <div className="network-page">
      <div className="tabs">
        <button onClick={() => setActiveTab('pools')}>Pule IP</button>
        <button onClick={() => setActiveTab('topology')}>Topologia</button>
      </div>

      {activeTab === 'topology' && (
        <NetworkTopologyEditor
          contractId={selectedContractId}
          subsystemIndex={selectedSubsystemIndex}
        />
      )}
    </div>
  );
};
```

---

## 13. UI/UX Guidelines

### 13.1 Paleta kolorów

| Element | Kolor | Hex |
|---------|-------|-----|
| Węzeł task | Niebieska ramka | `#4a9eff` |
| Węzeł auxiliary | Pomarańczowa ramka | `#ff8c00` |
| Węzeł external | Zielona ramka | `#28a745` |
| Połączenie fiber | Pomarańczowa linia | `#FF8C00` |
| Połączenie LAN | Niebieska linia | `#1E90FF` |
| Canvas tło | Ciemnoszare | `#1a1a2e` (dark theme) |
| Węzeł zaznaczony | Biała ramka | `#ffffff` |
| Węzeł pending-source | Żółta ramka | `#ffd700` |

### 13.2 Rozmiary węzłów

```css
.topology-node {
  width: 160px;
  min-height: 80px;
  border-radius: 8px;
  border: 2px solid;
  padding: 8px 12px;
  position: absolute;
  user-select: none;
}

.topology-node.auxiliary {
  border-style: dashed;      /* Obiekty pomocnicze mają linię przerywaną */
}
```

### 13.3 Tryby kursora

| Stan | Kursor |
|------|--------|
| Normalny | `grab` |
| Przeciąganie | `grabbing` |
| Tryb łączenia | `crosshair` |
| Hover na węźle | `pointer` |

### 13.4 Skróty klawiszowe (zalecane w Roadmap v2)

| Klawisz | Akcja |
|---------|-------|
| `Ctrl+Z` | Cofnij ostatnią zmianę |
| `Ctrl+S` | Zapisz (planowane) |
| `Delete` | Usuń zaznaczony węzeł |
| `Escape` | Anuluj tryb łączenia |

### 13.5 Responsywność

Canvas edytora jest **scrollowalny**, nie skaluje się — jest przeznaczony dla ekranów desktop (min. 1280px szerokości). Na mniejszych ekranach pojawia się ostrzeżenie o zalecanej rozdzielczości.

---

## 14. API Endpoints — Specyfikacja

### 14.1 Tabela endpointów

| Metoda | URL | Opis | Body | Response |
|--------|-----|------|------|----------|
| `POST` | `/api/network-topology` | Utwórz nową topologię | `CreateNetworkTopologyDto` | `NetworkTopology` |
| `GET` | `/api/network-topology/:contractId` | Wszystkie topologie kontraktu | — | `NetworkTopology[]` |
| `GET` | `/api/network-topology/:contractId/:subsystemIndex` | Aktualna topologia | — | `NetworkTopology \| null` |
| `GET` | `/api/network-topology/:contractId/:subsystemIndex/history` | Historia wersji | — | `NetworkTopology[]` |
| `PUT` | `/api/network-topology/:id` | Zaktualizuj (nowa wersja) | `UpdateNetworkTopologyDto` | `NetworkTopology` |
| `DELETE` | `/api/network-topology/:id` | Soft delete | — | `{ success: true }` |

### 14.2 Przykładowe requesty / responses

**POST /api/network-topology:**
```json
{
  "name": "Topologia SMOKIP_A - Kontrakt 42",
  "contractId": 42,
  "subsystemIndex": 0,
  "subsystemType": "SMOKIP_A",
  "nodes": [
    {
      "id": "a1b2c3d4-...",
      "type": "task",
      "label": "LCS Warszawa Centralna",
      "position": { "x": 40, "y": 40 },
      "data": { "taskId": 101, "km": 0.0, "icon": "📦" }
    },
    {
      "id": "e5f6g7h8-...",
      "type": "task",
      "label": "LCS Praga",
      "position": { "x": 260, "y": 40 },
      "data": { "taskId": 102, "km": 2.4, "icon": "📦" }
    }
  ],
  "connections": [
    {
      "id": "c1o2n3n4-...",
      "source": "a1b2c3d4-...",
      "target": "e5f6g7h8-...",
      "label": "2.400 km",
      "technology": "fiber"
    }
  ],
  "notes": "Odcinek wzdłuż toru nr 1"
}
```

**Response (201 Created):**
```json
{
  "id": "t0p0l0g1-...",
  "name": "Topologia SMOKIP_A - Kontrakt 42",
  "version": 1,
  "contractId": 42,
  "subsystemIndex": 0,
  "subsystemType": "SMOKIP_A",
  "nodes": [...],
  "connections": [...],
  "notes": "Odcinek wzdłuż toru nr 1",
  "deletedAt": null,
  "createdAt": "2026-04-30T20:00:00.000Z",
  "updatedAt": "2026-04-30T20:00:00.000Z"
}
```

**GET /api/network-topology/42/0/history:**
```json
[
  {
    "id": "v3...",
    "version": 3,
    "createdAt": "2026-04-30T22:00:00.000Z",
    "nodes": [...],
    "connections": [...]
  },
  {
    "id": "v2...",
    "version": 2,
    "createdAt": "2026-04-30T21:00:00.000Z",
    "nodes": [...],
    "connections": [...]
  },
  {
    "id": "v1...",
    "version": 1,
    "createdAt": "2026-04-30T20:00:00.000Z",
    "nodes": [...],
    "connections": [...]
  }
]
```

### 14.3 Kody błędów

| Kod HTTP | Sytuacja |
|----------|---------|
| `400 Bad Request` | Nieprawidłowe dane wejściowe (DTO validation) |
| `404 Not Found` | Topologia / kontrakt nie istnieje |
| `409 Conflict` | Próba utworzenia duplikatu (edge case) |
| `500 Internal Server Error` | Błąd bazy danych |

---

## 15. Przykłady użycia (Code Snippets)

### 15.1 Tworzenie topologii z kodu

```typescript
import { networkTopologyService } from '../services/networkTopology.service';
import { autoLayoutNodes } from '../components/network-topology/utils/autoLayout';
import type { TopologyNode, TopologyConnection } from '../types/network-topology.types';

// 1. Przygotowanie węzłów z zadań
const rawNodes: TopologyNode[] = tasks.map((task, idx) => ({
  id: crypto.randomUUID(),
  type: 'task',
  label: task.name,
  position: { x: 0, y: 0 },  // zostanie nadpisane przez autoLayout
  data: { taskId: task.id, km: task.km, icon: '📦' },
}));

// 2. Auto-layout
const positionedNodes = autoLayoutNodes(rawNodes, []);

// 3. Zapis do API
const saved = await networkTopologyService.create({
  name: `Topologia - ${contract.name}`,
  contractId: contract.id,
  subsystemIndex: 0,
  subsystemType: 'SMOKIP_A',
  nodes: positionedNodes,
  connections: [],
});

console.log(`Utworzono topologię v${saved.version} (id: ${saved.id})`);
```

### 15.2 Pobieranie i wyświetlanie topologii

```typescript
import { networkTopologyService } from '../services/networkTopology.service';

// Pobierz aktualną topologię (ostatnia wersja)
const topology = await networkTopologyService.getByContractAndSubsystem(
  contractId,
  subsystemIndex,
);

if (!topology) {
  console.log('Brak topologii — brak zapisanych danych');
} else {
  console.log(`Wersja: ${topology.version}`);
  console.log(`Węzły: ${topology.nodes.length}`);
  console.log(`Połączenia: ${topology.connections.length}`);
}
```

### 15.3 Aktualizacja topologii (nowa wersja)

```typescript
// Aktualizacja (backend auto-incrementuje version)
const updated = await networkTopologyService.update(topology.id, {
  nodes: updatedNodes,
  connections: updatedConnections,
  notes: 'Zaktualizowano po weryfikacji terenowej',
});

console.log(`Zapisano jako wersja ${updated.version}`);
```

### 15.4 Historia wersji i przywracanie

```typescript
// Pobierz historię
const history = await networkTopologyService.getHistory(contractId, subsystemIndex);
console.log(`Dostępne wersje: ${history.map(h => h.version).join(', ')}`);

// Przywróć wybraną wersję (utwórz nową jako kopię starej)
const versionToRestore = history.find(h => h.version === 2)!;
const restored = await networkTopologyService.create({
  name: versionToRestore.name,
  contractId: versionToRestore.contractId,
  subsystemIndex: versionToRestore.subsystemIndex,
  subsystemType: versionToRestore.subsystemType,
  nodes: versionToRestore.nodes,
  connections: versionToRestore.connections,
  notes: `Przywrócona z wersji ${versionToRestore.version}`,
});

console.log(`Topologia przywrócona jako wersja ${restored.version}`);
```

### 15.5 Walidacja przed zapisem

```typescript
import { validateTopology } from '../components/network-topology/utils/topologyValidator';

const result = validateTopology(nodes, connections);

if (!result.isValid) {
  console.error('Błędy walidacji topologii:');
  result.errors.forEach(e => console.error('  -', e));
  // Pokaż użytkownikowi listę błędów
} else {
  await networkTopologyService.create({ ... });
}
```

### 15.6 Użycie w komponencie React

```tsx
import React, { useState, useEffect } from 'react';
import { NetworkTopologyEditor } from '../components/network/topology';
import { networkTopologyService } from '../services/networkTopology.service';
import type { TopologyNode, TopologyConnection } from '../types/network-topology.types';

const TopologyPage: React.FC<{ contractId: number; subsystemIndex: number }> = ({
  contractId,
  subsystemIndex,
}) => {
  const [nodes, setNodes] = useState<TopologyNode[]>([]);
  const [connections, setConnections] = useState<TopologyConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    networkTopologyService
      .getByContractAndSubsystem(contractId, subsystemIndex)
      .then(data => {
        if (data) {
          setNodes(data.nodes);
          setConnections(data.connections);
        }
      })
      .finally(() => setLoading(false));
  }, [contractId, subsystemIndex]);

  if (loading) return <div>Ładowanie topologii...</div>;

  return (
    <NetworkTopologyEditor
      contractId={contractId}
      subsystemIndex={subsystemIndex}
      initialNodes={nodes}
      initialConnections={connections}
    />
  );
};
```

---

## 16. Plan wdrożenia (PR #1–#11)

### 16.1 Przegląd PR-ów

| PR | Branch | Opis | Linii | Status |
|----|--------|------|-------|--------|
| #1 | `topology-backend-database` | Entity + migracja bazy | ~170 | ✅ |
| #2 | `topology-backend-api` | Service + Controller + Routes + DTO | ~400 | ✅ |
| #3 | `topology-frontend-types` | Types + frontend service | ~120 | ✅ |
| #4 | `topology-frontend-utils` | autoLayout + distanceCalculator + validator | ~150 | ✅ |
| #5 | `topology-custom-node` | CustomNode + AddNodeModal + TopologyHistoryModal + CSS | ~300 | ✅ |
| #6 | `topology-modals` | ConnectionModal + AuxiliaryNodeModal + CSS | ~250 | ✅ |
| #7 | `topology-sidebar-toolbar` | TopologySidebar + TopologyToolbar + CSS | ~340 | ✅ |
| #8 | `topology-main-component` | NetworkTopologyEditor + NetworkTopologyStep + CSS | ~450 | ✅ |
| #9 | `topology-wizard-integration` | Integracja z ContractWizardModal | ~52 | ✅ |
| #10 | `remove-fiber-module` | Usunięcie starego FiberSchemaModal | ~-200 | ✅ |
| #11 | `topology-documentation` | Ta dokumentacja + aktualizacja README | ~810 | ✅ |

### 16.2 Diagram zależności PR-ów

```
PR #1 (DB)
  └─► PR #2 (Backend API)
        └─► PR #3 (Frontend Types)
              └─► PR #4 (Utils)
                    ├─► PR #5 (Custom Node)
                    │         └─► PR #6 (Modals)
                    │                   └─► PR #7 (Sidebar & Toolbar)
                    │                               └─► PR #8 (Main Component)
                    │                                         └─► PR #9 (Wizard)
                    │                                                   └─► PR #10 (Cleanup)
                    └─────────────────────────────────────────────────────────► PR #11 (Docs)
```

### 16.3 Strategia wdrożenia

1. **PR #1–#4** — Infrastruktura (backend + typy + utils): bez UI, zero ryzyka regresji
2. **PR #5–#7** — Komponenty izolowane: każdy PR zawiera samodzielne, testowalne komponenty
3. **PR #8** — Główny komponent: integruje wszystkie poprzednie komponenty
4. **PR #9** — Wizard integration: minimalne zmiany w istniejącym kodzie (2 pliki)
5. **PR #10** — Cleanup: usunięcie starego kodu
6. **PR #11** — Dokumentacja: zamknięcie issue #408

---

## 17. FAQ — Najczęstsze pytania

### Q: Dlaczego nie użyto React Flow ani żadnej biblioteki do rysowania grafów?

**A:** Decyzja projektowa: brak zewnętrznych zależności dla utrzymania prostego drzewa zależności. Implementacja w czystym React + HTML/SVG zapewnia:
- ✅ Pełną kontrolę nad wyglądem i zachowaniem
- ✅ Brak ryzyka konfliktu licencji lub breaking changes biblioteki
- ✅ Mniejszy bundle size
- ✅ Łatwiejsze dostosowanie do Grover Theme (ciemny motyw)

---

### Q: Jak działa wersjonowanie topologii?

**A:** Każdy `PUT /api/network-topology/:id` tworzy **nowy rekord** w bazie z `version = poprzednia + 1`. Stare wersje nie są usuwane (soft delete przy jawnym DELETE). Endpoint `history` zwraca wszystkie wersje posortowane malejąco. Dzięki temu możliwe jest:
- Przywrócenie dowolnej wersji
- Pełny audit log zmian
- Porównanie wersji (planowane w Roadmap v2)

---

### Q: Co się stanie z topologiami gdy kontrakt zostanie usunięty?

**A:** Tabela `network_topologies` ma `ON DELETE CASCADE` na `contractId`. Usunięcie kontraktu automatycznie usuwa wszystkie powiązane topologie (hard delete na poziomie bazy).

---

### Q: Czy można mieć wiele topologii dla jednego podsystemu?

**A:** Tak — każdy `PUT` tworzy nową wersję. Endpoint `getByContractAndSubsystem` zawsze zwraca **ostatnią** wersję (najwyższy `version`). Pełna historia jest dostępna przez endpoint `history`.

---

### Q: Jak topologia jest przechowywana podczas wypełniania wizarda (przed pierwszym zapisem)?

**A:** Stan topologii jest przechowywany **lokalnie w `wizardData.networkTopologies[subsystemIndex]`** (Zustand store). Do API (`POST /api/network-topology`) jest zapisywana dopiero po kliknięciu przycisku "Zapisz" w `TopologyToolbar`. Wizard nie wymaga zapisania topologii do przejścia do następnego kroku (można kliknąć "Pomiń ▷").

---

### Q: Jak dodać nowy typ węzła?

**A:** 
1. Dodaj nowy string do `NodeType` w `frontend/src/types/network-topology.types.ts`
2. Dodaj ikonę do `NODE_ICONS`
3. Dodaj etykietę do `NODE_TYPE_LABELS`
4. Dodaj styl w `NetworkTopologyEditor.css`
5. Zaktualizuj `CustomNode.tsx` z nowym kolorem ramki
6. Zaktualizuj `AddNodeModal.tsx` z nową opcją wyboru
7. Zaktualizuj walidację DTO backend (`@IsIn`)

---

### Q: Jak działa drag & drop z sidebaru na canvas?

**A:**
1. `TopologySidebar` ustawia dane węzła przez `dataTransfer.setData('application/json', ...)`
2. Canvas (`NetworkTopologyEditor`) ma handler `onDrop` który:
   - Odczytuje dane przez `e.dataTransfer.getData('application/json')`
   - Oblicza pozycję drop na podstawie `e.clientX/Y - canvasRect.left/top`
   - Tworzy nowy węzeł i dodaje do `nodes[]`

---

### Q: Czy topologia jest synchronizowana z BOM?

**A:** Nie w wersji 1.0. Węzły `type: 'task'` mają `data.taskId` który referuje zadanie, ale brak jest automatycznej synchronizacji dwukierunkowej. Zmiany w zadaniach po zapisaniu topologii nie aktualizują automatycznie węzłów. Ta funkcjonalność jest zaplanowana w **Roadmap v2** jako "Auto-sync z zadaniami".

---

### Q: Jak debugować problemy z połączeniami SVG?

**A:** Użyj DevTools → Elements i sprawdź `<svg class="topology-connections-layer">`. Każde połączenie to `<line>` i opcjonalny `<text>`. Jeśli linia nie jest widoczna:
- Sprawdź czy `source` i `target` ID istnieją w `nodes[]`
- Sprawdź `stroke` i `strokeWidth` atrybuty linii
- Sprawdź czy canvas ma `position: relative` (węzły są `position: absolute`)

---

## 18. Roadmap v2 — Planowane rozszerzenia

### 18.1 Funkcjonalności priorytetowe

| Feature | Opis | Priorytet |
|---------|------|-----------|
| 🔍 Minimap | Podgląd całej topologii w miniaturze | 🔴 Wysoki |
| ✂️ Undo/Redo | Historia zmian w edytorze (Ctrl+Z/Y) | 🔴 Wysoki |
| 📐 Grid Snap | Przyciąganie węzłów do siatki | 🟡 Średni |
| 🔎 Zoom | Powiększanie/pomniejszanie canvas | 🟡 Średni |
| 📊 Porównanie wersji | Diff między dwoma wersjami topologii | 🟡 Średni |
| 🔄 Auto-sync | Synchronizacja węzłów z aktualnymi zadaniami | 🟡 Średni |
| 📤 Import | Import topologii z pliku JSON/CSV | 🟢 Niski |
| 🏷️ Grupowanie | Grupowanie węzłów w logiczne klastry | 🟢 Niski |
| 💬 Komentarze | Adnotacje na połączeniach i węzłach | 🟢 Niski |
| 📱 Responsive | Tryb read-only na urządzeniach mobilnych | 🟢 Niski |

### 18.2 Ulepszenia techniczne

```
v2.0 — Zaplanowane:
├─ Migracja do React Flow (reconsider gdy funkcjonalność wzrośnie)
├─ Testy jednostkowe (Jest + React Testing Library)
├─ E2E testy (Playwright)
├─ WebSocket — real-time collaboration (wiele osób edytuje)
├─ Canvas Pan — przesuwanie widoku przy dużych topologiach
└─ Performance — wirtualizacja węzłów (react-window) dla 100+ węzłów

v2.1 — Opcjonalne:
├─ 3D visualization (Three.js) dla złożonych topologii
├─ AI-assisted layout (optymalizacja układu na podstawie kilometrażu)
└─ Integration z GIS / mapami (Leaflet.js — nakładka na mapę kolejową)
```

### 18.3 Planowane API v2

```
POST   /api/network-topology/:id/clone          — Klonuj topologię
GET    /api/network-topology/:id/diff/:otherId  — Porównaj wersje
POST   /api/network-topology/import             — Import z JSON
GET    /api/network-topology/:id/export         — Export do JSON
POST   /api/network-topology/:id/validate       — Walidacja server-side
WS     /ws/network-topology/:id                 — Real-time collaboration
```

---

## 📝 Changelog

| Wersja | Data | Zmiany |
|--------|------|--------|
| 1.0.0 | 2026-04-30 | Pierwsza wersja dokumentacji — zamknięcie issue #408 |
| 1.1.0 | 2026-05-12 | Normalizacja danych zadań (`taskDataNormalizer.ts`), eksport PDF (A3, wysoka rozdzielczość), endpoint backend `POST /:id/topology/export-pdf` |

---

## 19. Normalizacja danych zadań (taskDataNormalizer)

### 19.1 Plik

`frontend/src/components/contracts/wizard/utils/taskDataNormalizer.ts`

### 19.2 Cel

Zapewnia **jednorodną reprezentację** `TaskDetail` stosowaną w obu wizardach
(`ContractWizardModal` i `ExtendWizardModal`) przy budowaniu listy bocznej sidebaru
i węzłów canvas topologii.

### 19.3 Interfejs `NormalizedTaskData`

```typescript
export interface NormalizedTaskData {
  id: string;               // Stabilny ID: taskWizardId > task.id > `task-{index}`
  label: string;            // Etykieta — wynik generateTaskName (ta sama co pole `nazwa`)
  kilometraz?: string;      // Sformatowany jako "XXX,XXX"
  kilometrazNumeric?: number; // Wartość numeryczna km (do obliczeń)
  type: TaskDetail['taskType'];
  isExisting: boolean;      // true gdy task.id istnieje w DB
}
```

### 19.4 Funkcja `normalizeTaskData`

```typescript
export const normalizeTaskData = (
  task: TaskDetail,
  index: number,
  liniaKolejowa?: string
): NormalizedTaskData
```

Kolejność priorytetu dla `id`:
1. `task.taskWizardId` (UUID z sesji wizarda)
2. `String(task.id)` (numeryczne ID z bazy)
3. `` `task-${index}` `` (awaryjny fallback — tylko gdy brak obu powyższych)

### 19.5 Zastosowanie w `NetworkTopologyStep`

| Miejsce użycia | Przed | Po |
|---|---|---|
| Inicjalizacja węzłów (useEffect) | `task.nazwa \|\| task.taskType \|\| \`Zadanie ${idx+1}\`` | `normalizeTaskData(task, idx, lk).label` |
| Sidebar (`sidebarTasks`) | `t.nazwa \|\| t.taskType \|\| \`Zadanie ${i+1}\`` | `normalizeTaskData(t, i, lk).label` |
| Canvas drop (`handleCanvasDrop`) | `data.label \|\| \`Zadanie ${data.taskId}\`` | `normalizeTaskData(taskDetail, taskId, lk).label` |
| Blokada duplikatów | tylko `taskWizardId` | stabilne `normalized.id` (obejmuje też `task.id`) |

---

## 20. Eksport topologii do PDF

### 20.1 Format

| Parametr | Wartość |
|---|---|
| Rozmiar papieru | A3 poziomo (420 × 297 mm) |
| Orientacja | landscape |
| Podział stron | poziomy (lewa→prawa), gdy szerokość > 400 mm |
| Zakładka przerywanej linii | 2 mm od prawej krawędzi strefy treści |
| Napis kontynuacji | `kontynuacja – strona X+1`, pionowy, 6 pt, szary |
| Stopka | `Strona X / N`, wyśrodkowana, 8 pt |
| Skala html2canvas | `devicePixelRatio × 2` |

### 20.2 Flow frontend → backend → download

```
Użytkownik klika "📄 PDF"
  └─► html2canvas renderuje canvasRef.current do obrazu
        └─► jsPDF tworzy dokument A3 landscape
              ├─► (gdy wizardData.contractId istnieje)
              │     └─► POST /api/contracts/:id/topology/export-pdf
              │           body: { pdfBase64, subsystemIndex }
              │           └─► Backend zapisuje PDF do
              │                 uploads/contracts/{contractNumber}/topology_{idx}_{ts}.pdf
              │               Backend streamuje plik jako attachment
              │               Frontend pobiera blob → URL.createObjectURL → <a>.click()
              └─► (gdy brak contractId — nowy kontrakt w kreatorze)
                    └─► pdf.save(filename) — pobiera bezpośrednio przez przeglądarkę
```

### 20.3 Backend — endpoint

`POST /api/contracts/:id/topology/export-pdf`

Wymagane uprawnienie: `contracts.read`

Body:

```json
{
  "pdfBase64": "<base64-encoded PDF>",
  "subsystemIndex": 0
}
```

Odpowiedź: plik binarny `application/pdf` z nagłówkiem
`Content-Disposition: attachment; filename="topology_0_2026-05-12T...pdf"`.

### 20.4 Ścieżka zapisu na backendzie

```
uploads/
└── contracts/
    └── {safeContractNumber}/     ← tworzone automatycznie jeśli nie istnieje
        └── topology_{subsystemIndex}_{ISO-timestamp}.pdf
```

`safeContractNumber` = `contractNumber.replace(/[^a-zA-Z0-9_-]/g, '_')`

### 20.5 Nowe zależności frontendowe

| Pakiet | Wersja | Rola |
|---|---|---|
| `html2canvas` | `^1.4.1` | Renderuje canvas DOM do obrazu |
| `jspdf` | `^4.2.1` | Generuje dokument PDF z obrazu |

Oba pakiety są **importowane dynamicznie** (`import(...)`) — nie trafiają do głównego
bundle aplikacji, lecz są ładowane tylko gdy użytkownik kliknie "📄 PDF".

## 21. Canvas — interakcja i ograniczenia

### 21.1 Granice canvasa
| Krawędź | Ograniczenie |
|---|---|
| Lewa | 8 px (stała) |
| Górna | 8 px (stała) |
| Dolna | clientHeight − NODE_HEIGHT − 8 px |
| Prawa | brak — canvas scrolluje poziomo |

### 21.2 Zoom
- Zakres: 25% – 200%, krok 10%
- Ctrl+Scroll na viewporcie
- Przyciski: 🔍− 🔍+ 1:1 ⊡ Fit
- Reset do 1.0 przed eksportem PDF

### 21.3 Auto-fit
Wywoływany po: mount z węzłami, Auto-układ, Optymalizuj, przycisk Fit.
NIE wywoływany podczas drag.

### 21.4 Kolizje
- Minimalny odstęp: 12 px
- Drag: hard stop przy nachodzeniu
- Drop/add: spiral search wolnej pozycji (max 10 okręgów)
- forceDirectedLayout: hard overlap resolution po każdej iteracji

### 21.5 Style połączeń
| Technologia | Linia | Grubość |
|---|---|---|
| FIBER | solidna | 2.5 px |
| LAN | przerywana (10 5) | 2 px |
Etykieta technologii + dystans wyświetlana przy środku linii.

---

## 🔗 Powiązane pliki w repozytorium

### Backend
- `backend/src/entities/NetworkTopology.entity.ts`
- `backend/src/services/networkTopology.service.ts`
- `backend/src/controllers/NetworkTopologyController.ts`
- `backend/src/routes/networkTopology.routes.ts`
- `backend/src/dto/network-topology.dto.ts`
- `backend/src/migrations/*_create_network_topologies.ts`

### Frontend — Typy i serwis
- `frontend/src/types/network-topology.types.ts`
- `frontend/src/services/networkTopology.service.ts`

### Frontend — Edytor (network/topology/)
- `frontend/src/components/network/topology/NetworkTopologyEditor.tsx`
- `frontend/src/components/network/topology/NetworkTopologyEditor.css`
- `frontend/src/components/network/topology/CustomNode.tsx`
- `frontend/src/components/network/topology/AddNodeModal.tsx`
- `frontend/src/components/network/topology/TopologyHistoryModal.tsx`
- `frontend/src/components/network/topology/index.ts`

### Frontend — Utilities
- `frontend/src/components/network-topology/utils/distanceCalculator.ts`
- `frontend/src/components/network-topology/utils/autoLayout.ts`
- `frontend/src/components/network-topology/utils/topologyValidator.ts`

### Frontend — Modals i Sidebar
- `frontend/src/components/network-topology/ConnectionModal.tsx`
- `frontend/src/components/network-topology/ConnectionModal.css`
- `frontend/src/components/network-topology/AuxiliaryNodeModal.tsx`
- `frontend/src/components/network-topology/AuxiliaryNodeModal.css`
- `frontend/src/components/network-topology/TopologySidebar.tsx`
- `frontend/src/components/network-topology/TopologySidebar.css`
- `frontend/src/components/network-topology/TopologyToolbar.tsx`
- `frontend/src/components/network-topology/TopologyToolbar.css`

### Frontend — Integracja z wizardem
- `frontend/src/components/network-topology/NetworkTopologyStep.tsx`
- `frontend/src/components/network-topology/NetworkTopologyStep.css`
- `frontend/src/components/contracts/wizard/ContractWizardModal.tsx`
- `frontend/src/components/contracts/wizard/types/wizard.types.ts`

### Frontend — Network Page
- `frontend/src/components/modules/NetworkPage.tsx`

### Dokumentacja
- `docs/NETWORK_TOPOLOGY_IMPLEMENTATION.md` ← **ten plik**
- `docs/Network Topology Builder #408.md` — plan PR-ów

---

*Dokumentacja wygenerowana dla issue [#408 Network Topology Builder](https://github.com/Crack8502pl/der-mag-platform/issues/408) — Grover Platform © 2026 Cr@ck8502PL*
