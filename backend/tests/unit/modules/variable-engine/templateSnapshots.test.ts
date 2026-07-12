/**
 * Snapshot tests – Variable Engine template rendering (PR-9 scope)
 *
 * These tests capture the rendered output of real templates against mock
 * provider data.  Any unexpected rendering change will fail the snapshot
 * assertion, providing a regression net for future refactoring.
 *
 * Run with `--updateSnapshot` / `-u` to refresh snapshots after intentional
 * template/provider changes.
 */

import { VariableEngineFactory } from '../../../../src/modules/variable-engine/factory/VariableEngineFactory';
import { CameraVariableProvider } from '../../../../src/modules/variable-engine/providers/camera/CameraVariableProvider';
import { ContractVariableProvider } from '../../../../src/modules/variable-engine/providers/contract/ContractVariableProvider';
import { FiberVariableProvider } from '../../../../src/modules/variable-engine/providers/fiber/FiberVariableProvider';
import { TaskVariableProvider } from '../../../../src/modules/variable-engine/providers/task/TaskVariableProvider';
import { UserVariableProvider } from '../../../../src/modules/variable-engine/providers/user/UserVariableProvider';
import { HierarchyVariableProvider } from '../../../../src/modules/variable-engine/providers/hierarchy/HierarchyVariableProvider';
import type { VariableContext } from '../../../../src/modules/variable-engine/contracts';
import type { ICameraDataService } from '../../../../src/modules/variable-engine/providers/camera/ICameraDataService';
import type { IContractDataService } from '../../../../src/modules/variable-engine/providers/contract/IContractDataService';
import type { IFiberDataService } from '../../../../src/modules/variable-engine/providers/fiber/IFiberDataService';
import type { ITaskDataService } from '../../../../src/modules/variable-engine/providers/task/ITaskDataService';
import type { IUserDataService } from '../../../../src/modules/variable-engine/providers/user/IUserDataService';
import type { IHierarchyTraversalService } from '../../../../src/modules/variable-engine/providers/hierarchy/IHierarchyTraversalService';

// ─── Mock data fixtures ───────────────────────────────────────────────────────

const CAMERA_DATA = {
  total: 24,
  totalIp: 20,
  totalAnalog: 4,
  storageTb: 12.5,
  recordingDays: 30,
  bitrateMbps: 4,
};

const CONTRACT_DATA = {
  number: 'K/2024/001',
  status: 'active',
  customerName: 'Firma Budowlana Sp. z o.o.',
  customerNip: '1234567890',
  valueNet: 250000,
  valueGross: 307500,
  dateStart: '2024-01-01',
  dateEnd: '2024-12-31',
};

const FIBER_DATA = {
  lengthKm: 3.2,
  strandCount: 48,
  connectionCount: 12,
  duplexCount: 8,
  wdmCount: 4,
};

const TASK_DATA = {
  number: 'ZAD-2024-042',
  status: 'in_progress',
  title: 'Montaż systemu CCTV',
  priority: 'high',
  assigneeName: 'Jan Kowalski',
  dueDate: '2024-06-30',
  progress: 65,
};

const USER_DATA = {
  name: 'Anna Nowak',
  email: 'a.nowak@firma.pl',
  role: 'technician',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCameraService(): ICameraDataService {
  return { getCameraData: jest.fn().mockResolvedValue(CAMERA_DATA) };
}

function makeContractService(): IContractDataService {
  return { getContractData: jest.fn().mockResolvedValue(CONTRACT_DATA) };
}

function makeFiberService(): IFiberDataService {
  return { getFiberData: jest.fn().mockResolvedValue(FIBER_DATA) };
}

function makeTaskService(): ITaskDataService {
  return { getTaskData: jest.fn().mockResolvedValue(TASK_DATA) };
}

function makeUserService(): IUserDataService {
  return { getUserData: jest.fn().mockResolvedValue(USER_DATA) };
}

function makeHierarchyService(): IHierarchyTraversalService {
  return {
    getParentId: jest.fn().mockResolvedValue(1),
    getChildrenIds: jest.fn().mockResolvedValue([2, 3, 4]),
    getDepth: jest.fn().mockResolvedValue(2),
    getAncestorPath: jest.fn().mockResolvedValue([1, 10, 42]),
  };
}

const ctx: VariableContext = { entityId: 42, entityType: 'task' };

// ─── Snapshot tests ───────────────────────────────────────────────────────────

describe('Variable Engine – template snapshot tests', () => {
  // ── Camera templates ─────────────────────────────────────────────────────────

  describe('camera provider', () => {
    it('renders a full camera summary template', async () => {
      const { engine } = new VariableEngineFactory([
        new CameraVariableProvider(makeCameraService()),
      ]).create();

      const result = await engine.evaluate(
        'Kamery: ${camera.total} (IP: ${camera.total.ip}, analog: ${camera.total.analog}). ' +
          'Zapis: ${camera.storage.tb} TB / ${camera.recording.days} dni. ' +
          'Bitrate: ${camera.bitrate.mbps} Mbps.',
        ctx
      );

      expect(result).toMatchSnapshot();
    });

    it('renders partial camera template when some fields are missing from context', async () => {
      const { engine } = new VariableEngineFactory([
        new CameraVariableProvider(makeCameraService()),
      ]).create();

      const noEntityCtx: VariableContext = {};
      const result = await engine.evaluate(
        'Total cameras: ${camera.total}',
        noEntityCtx,
        { fallback: 'N/A' }
      );

      expect(result).toMatchSnapshot();
    });
  });

  // ── Contract templates ────────────────────────────────────────────────────────

  describe('contract provider', () => {
    it('renders a contract header template', async () => {
      const { engine } = new VariableEngineFactory([
        new ContractVariableProvider(makeContractService()),
      ]).create();

      const result = await engine.evaluate(
        'Umowa nr ${contract.number} (${contract.status})\n' +
          'Klient: ${contract.customer.name} NIP: ${contract.customer.nip}\n' +
          'Wartość: ${contract.value.net} PLN netto / ${contract.value.gross} PLN brutto\n' +
          'Okres: ${contract.date.start} – ${contract.date.end}',
        ctx
      );

      expect(result).toMatchSnapshot();
    });
  });

  // ── Task templates ───────────────────────────────────────────────────────────

  describe('task provider', () => {
    it('renders a task status template', async () => {
      const { engine } = new VariableEngineFactory([
        new TaskVariableProvider(makeTaskService()),
      ]).create();

      const result = await engine.evaluate(
        '[${task.number}] ${task.title}\n' +
          'Status: ${task.status} | Priorytet: ${task.priority}\n' +
          'Przypisany: ${task.assignee.name} | Termin: ${task.due.date}\n' +
          'Postęp: ${task.progress}%',
        ctx
      );

      expect(result).toMatchSnapshot();
    });
  });

  // ── Fiber templates ──────────────────────────────────────────────────────────

  describe('fiber provider', () => {
    it('renders a fiber infrastructure summary', async () => {
      const { engine } = new VariableEngineFactory([
        new FiberVariableProvider(makeFiberService()),
      ]).create();

      const result = await engine.evaluate(
        'Kabel: ${fiber.length.total} km, ' +
          '${fiber.strands.total} włókien. ' +
          'Połączenia: ${fiber.connections.total} ' +
          '(duplex: ${fiber.connections.duplex}, WDM: ${fiber.connections.wdm})',
        ctx
      );

      expect(result).toMatchSnapshot();
    });
  });

  // ── User templates ───────────────────────────────────────────────────────────

  describe('user provider', () => {
    it('renders a user info template', async () => {
      const { engine } = new VariableEngineFactory([
        new UserVariableProvider(makeUserService()),
      ]).create();

      const result = await engine.evaluate(
        '${user.name} <${user.email}> – rola: ${user.role}',
        ctx
      );

      expect(result).toMatchSnapshot();
    });
  });

  // ── Multi-provider templates ─────────────────────────────────────────────────

  describe('multi-provider templates', () => {
    it('renders a combined task + contract template', async () => {
      const { engine } = new VariableEngineFactory([
        new TaskVariableProvider(makeTaskService()),
        new ContractVariableProvider(makeContractService()),
        new UserVariableProvider(makeUserService()),
      ]).create();

      const result = await engine.evaluate(
        'Zlecenie ${task.number} dla ${contract.customer.name}\n' +
          'Umowa: ${contract.number} | Wartość: ${contract.value.gross} PLN brutto\n' +
          'Wykonawca: ${user.name} (${user.role})',
        ctx
      );

      expect(result).toMatchSnapshot();
    });

    it('renders a full technical report template', async () => {
      const { engine } = new VariableEngineFactory([
        new CameraVariableProvider(makeCameraService()),
        new FiberVariableProvider(makeFiberService()),
        new ContractVariableProvider(makeContractService()),
      ]).create();

      const result = await engine.evaluate(
        'Raport techniczny – umowa ${contract.number}\n' +
          'CCTV: ${camera.total} kamer (${camera.total.ip} IP)\n' +
          'Magazynowanie: ${camera.storage.tb} TB przez ${camera.recording.days} dni\n' +
          'Infrastruktura: kabel ${fiber.length.total} km, ${fiber.strands.total} włókien',
        ctx
      );

      expect(result).toMatchSnapshot();
    });

    it('renders a hierarchy-aware template', async () => {
      const { engine } = new VariableEngineFactory([
        new HierarchyVariableProvider(makeHierarchyService()),
        new TaskVariableProvider(makeTaskService()),
      ]).create();

      const result = await engine.evaluate(
        'Zadanie ${task.number} – poziom: ${hierarchy.depth}, ' +
          'elementy podrzędne: ${hierarchy.children}, ' +
          'ścieżka: ${hierarchy.path}',
        ctx
      );

      expect(result).toMatchSnapshot();
    });
  });

  // ── Fallback and edge-case templates ─────────────────────────────────────────

  describe('fallback behaviour', () => {
    it('renders missing providers with empty fallback (default)', async () => {
      const { engine } = new VariableEngineFactory([]).create();
      const result = await engine.evaluate(
        'Kamery: ${camera.total}, Umowa: ${contract.number}',
        ctx
      );
      expect(result).toMatchSnapshot();
    });

    it('renders missing providers with custom fallback string', async () => {
      const { engine } = new VariableEngineFactory([]).create();
      const result = await engine.evaluate(
        'Kamery: ${camera.total}, Umowa: ${contract.number}',
        ctx,
        { fallback: '–' }
      );
      expect(result).toMatchSnapshot();
    });

    it('renders a template with no placeholders unchanged', async () => {
      const { engine } = new VariableEngineFactory([]).create();
      const result = await engine.evaluate(
        'Brak zmiennych – tekst statyczny.',
        ctx
      );
      expect(result).toMatchSnapshot();
    });

    it('renders duplicate placeholders correctly (deduplication)', async () => {
      const { engine } = new VariableEngineFactory([
        new ContractVariableProvider(makeContractService()),
      ]).create();

      const result = await engine.evaluate(
        'Umowa ${contract.number} – potwierdzam umowę ${contract.number} z klientem ${contract.customer.name}.',
        ctx
      );

      expect(result).toMatchSnapshot();
    });
  });
});
