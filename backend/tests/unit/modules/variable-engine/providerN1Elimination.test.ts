/**
 * Unit tests – Provider N+1 elimination (PR-9 scope)
 *
 * Verifies that each concrete provider uses the DataFetchDeduplicator so that
 * concurrent resolution of multiple fields for the same entity triggers only
 * one data-service call (eliminating N+1 queries in Promise.all scenarios).
 */

import { CameraVariableProvider } from '../../../../src/modules/variable-engine/providers/camera/CameraVariableProvider';
import { FiberVariableProvider } from '../../../../src/modules/variable-engine/providers/fiber/FiberVariableProvider';
import { SwitchVariableProvider } from '../../../../src/modules/variable-engine/providers/switch/SwitchVariableProvider';
import { IpVariableProvider } from '../../../../src/modules/variable-engine/providers/ip/IpVariableProvider';
import { ContractVariableProvider } from '../../../../src/modules/variable-engine/providers/contract/ContractVariableProvider';
import { WarehouseVariableProvider } from '../../../../src/modules/variable-engine/providers/warehouse/WarehouseVariableProvider';
import { TaskVariableProvider } from '../../../../src/modules/variable-engine/providers/task/TaskVariableProvider';
import { AiVariableProvider } from '../../../../src/modules/variable-engine/providers/ai/AiVariableProvider';
import { UserVariableProvider } from '../../../../src/modules/variable-engine/providers/user/UserVariableProvider';
import type { VariableContext } from '../../../../src/modules/variable-engine/contracts';
import type { ICameraDataService, CameraData } from '../../../../src/modules/variable-engine/providers/camera/ICameraDataService';
import type { IFiberDataService } from '../../../../src/modules/variable-engine/providers/fiber/IFiberDataService';
import type { ISwitchDataService } from '../../../../src/modules/variable-engine/providers/switch/ISwitchDataService';
import type { IIpDataService } from '../../../../src/modules/variable-engine/providers/ip/IIpDataService';
import type { IContractDataService } from '../../../../src/modules/variable-engine/providers/contract/IContractDataService';
import type { IWarehouseDataService } from '../../../../src/modules/variable-engine/providers/warehouse/IWarehouseDataService';
import type { ITaskDataService } from '../../../../src/modules/variable-engine/providers/task/ITaskDataService';
import type { IAiDataService } from '../../../../src/modules/variable-engine/providers/ai/IAiDataService';
import type { IUserDataService } from '../../../../src/modules/variable-engine/providers/user/IUserDataService';

const ctx: VariableContext = { entityId: 10, entityType: 'subsystem' };

describe('Provider N+1 elimination', () => {
  // ── CameraVariableProvider ────────────────────────────────────────────────────

  it('CameraVariableProvider: concurrent field resolution issues ONE data-service call', async () => {
    let resolveData!: (v: CameraData) => void;
    const pending = new Promise<CameraData>((r) => { resolveData = r; });
    const svc: ICameraDataService = { getCameraData: jest.fn().mockReturnValue(pending) };
    const provider = new CameraVariableProvider(svc);

    const p1 = provider.resolve('camera.total', ctx);
    const p2 = provider.resolve('camera.total.ip', ctx);
    const p3 = provider.resolve('camera.storage.tb', ctx);

    // Only one call before data resolves.
    expect(svc.getCameraData).toHaveBeenCalledTimes(1);

    resolveData({ total: 5, totalIp: 3, totalAnalog: 2, storageTb: 4.0, recordingDays: 14, bitrateMbps: 2 });
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(r1).toBe(5);
    expect(r2).toBe(3);
    expect(r3).toBe(4.0);
    expect(svc.getCameraData).toHaveBeenCalledTimes(1);
  });

  // ── FiberVariableProvider ─────────────────────────────────────────────────────

  it('FiberVariableProvider: concurrent field resolution issues ONE data-service call', async () => {
    const fiberData = { lengthKm: 2.5, strandCount: 24, connectionCount: 6, duplexCount: 4, wdmCount: 2 };
    const svc: IFiberDataService = { getFiberData: jest.fn().mockResolvedValue(fiberData) };
    const provider = new FiberVariableProvider(svc);

    const [r1, r2, r3] = await Promise.all([
      provider.resolve('fiber.length.total', ctx),
      provider.resolve('fiber.strands.total', ctx),
      provider.resolve('fiber.connections.total', ctx),
    ]);

    expect(r1).toBe(2.5);
    expect(r2).toBe(24);
    expect(r3).toBe(6);
    // All three concurrent resolutions should share one fetch.
    expect(svc.getFiberData).toHaveBeenCalledTimes(1);
  });

  // ── SwitchVariableProvider ────────────────────────────────────────────────────

  it('SwitchVariableProvider: concurrent field resolution issues ONE data-service call', async () => {
    const switchData = { total: 8, totalPoe: 4, managed: 6, totalPorts: 192, totalPoePorts: 96 };
    const svc: ISwitchDataService = { getSwitchData: jest.fn().mockResolvedValue(switchData) };
    const provider = new SwitchVariableProvider(svc);

    await Promise.all([
      provider.resolve('switch.total', ctx),
      provider.resolve('switch.total.poe', ctx),
      provider.resolve('switch.ports.total', ctx),
    ]);

    expect(svc.getSwitchData).toHaveBeenCalledTimes(1);
  });

  // ── IpVariableProvider ────────────────────────────────────────────────────────

  it('IpVariableProvider: concurrent field resolution issues ONE data-service call', async () => {
    const ipData = {
      allocatedRange: '192.168.1.0/24',
      gateway: '192.168.1.1',
      subnetMask: '255.255.255.0',
      totalHosts: 254,
      usedHosts: 42,
      freeHosts: 212,
      firstUsableIp: '192.168.1.1',
      lastUsableIp: '192.168.1.254',
    };
    const svc: IIpDataService = { getIpData: jest.fn().mockResolvedValue(ipData) };
    const provider = new IpVariableProvider(svc);

    await Promise.all([
      provider.resolve('ip.range', ctx),
      provider.resolve('ip.hosts.total', ctx),
      provider.resolve('ip.hosts.free', ctx),
    ]);

    expect(svc.getIpData).toHaveBeenCalledTimes(1);
  });

  // ── ContractVariableProvider ──────────────────────────────────────────────────

  it('ContractVariableProvider: concurrent field resolution issues ONE data-service call', async () => {
    const contractData = {
      number: 'K/001',
      status: 'active',
      customerName: 'Klient A',
      customerNip: '000',
      valueNet: 1000,
      valueGross: 1230,
      dateStart: '2024-01-01',
      dateEnd: '2024-12-31',
    };
    const svc: IContractDataService = { getContractData: jest.fn().mockResolvedValue(contractData) };
    const provider = new ContractVariableProvider(svc);

    await Promise.all([
      provider.resolve('contract.number', ctx),
      provider.resolve('contract.customer.name', ctx),
      provider.resolve('contract.value.gross', ctx),
    ]);

    expect(svc.getContractData).toHaveBeenCalledTimes(1);
  });

  // ── WarehouseVariableProvider ─────────────────────────────────────────────────

  it('WarehouseVariableProvider: concurrent field resolution issues ONE data-service call', async () => {
    const warehouseData = {
      itemsTotal: 200,
      itemsReserved: 50,
      itemsAvailable: 150,
      valueTotal: 75000,
      location: 'Magazyn A',
    };
    const svc: IWarehouseDataService = { getWarehouseData: jest.fn().mockResolvedValue(warehouseData) };
    const provider = new WarehouseVariableProvider(svc);

    await Promise.all([
      provider.resolve('warehouse.items.total', ctx),
      provider.resolve('warehouse.items.available', ctx),
      provider.resolve('warehouse.location', ctx),
    ]);

    expect(svc.getWarehouseData).toHaveBeenCalledTimes(1);
  });

  // ── TaskVariableProvider ──────────────────────────────────────────────────────

  it('TaskVariableProvider: concurrent field resolution issues ONE data-service call', async () => {
    const taskData = {
      number: 'ZAD-001',
      status: 'open',
      title: 'Test',
      priority: 'normal',
      assigneeName: 'Pracownik',
      dueDate: '2024-06-30',
      progress: 10,
    };
    const svc: ITaskDataService = { getTaskData: jest.fn().mockResolvedValue(taskData) };
    const provider = new TaskVariableProvider(svc);

    await Promise.all([
      provider.resolve('task.number', ctx),
      provider.resolve('task.status', ctx),
      provider.resolve('task.progress', ctx),
    ]);

    expect(svc.getTaskData).toHaveBeenCalledTimes(1);
  });

  // ── AiVariableProvider ────────────────────────────────────────────────────────

  it('AiVariableProvider: concurrent field resolution issues ONE data-service call', async () => {
    const aiData = { summary: 'OK', recommendation: 'Proceed', riskLevel: 'low', riskScore: 10 };
    const svc: IAiDataService = { getAiData: jest.fn().mockResolvedValue(aiData) };
    const provider = new AiVariableProvider(svc);

    await Promise.all([
      provider.resolve('ai.summary', ctx),
      provider.resolve('ai.risk.level', ctx),
      provider.resolve('ai.risk.score', ctx),
    ]);

    expect(svc.getAiData).toHaveBeenCalledTimes(1);
  });

  // ── UserVariableProvider ──────────────────────────────────────────────────────

  it('UserVariableProvider: concurrent field resolution issues ONE data-service call', async () => {
    const userData = { name: 'Jan', email: 'jan@test.pl', role: 'admin' };
    const svc: IUserDataService = { getUserData: jest.fn().mockResolvedValue(userData) };
    const provider = new UserVariableProvider(svc);

    await Promise.all([
      provider.resolve('user.name', ctx),
      provider.resolve('user.email', ctx),
      provider.resolve('user.role', ctx),
    ]);

    expect(svc.getUserData).toHaveBeenCalledTimes(1);
  });

  // ── Different entities are NOT deduplicated ───────────────────────────────────

  it('separate entity contexts each trigger their own data-service call', async () => {
    const cameraData: CameraData = { total: 5, totalIp: 3, totalAnalog: 2, storageTb: 4.0, recordingDays: 14, bitrateMbps: 2 };
    const svc: ICameraDataService = { getCameraData: jest.fn().mockResolvedValue(cameraData) };
    const provider = new CameraVariableProvider(svc);

    const ctx1: VariableContext = { entityId: 1, entityType: 'task' };
    const ctx2: VariableContext = { entityId: 2, entityType: 'task' };

    await Promise.all([
      provider.resolve('camera.total', ctx1),
      provider.resolve('camera.total', ctx2),
    ]);

    // Two different entities → two separate fetches.
    expect(svc.getCameraData).toHaveBeenCalledTimes(2);
  });

  // ── Sequential calls after settle start fresh ─────────────────────────────────

  it('sequential calls after first settles issue a second data-service call', async () => {
    const cameraData: CameraData = { total: 5, totalIp: 3, totalAnalog: 2, storageTb: 4.0, recordingDays: 14, bitrateMbps: 2 };
    const svc: ICameraDataService = { getCameraData: jest.fn().mockResolvedValue(cameraData) };
    const provider = new CameraVariableProvider(svc);

    await provider.resolve('camera.total', ctx);
    await provider.resolve('camera.storage.tb', ctx);

    // Sequential (not concurrent) → the deduplicator's pending entry was
    // cleaned up after the first settle, so a second fetch is issued.
    expect(svc.getCameraData).toHaveBeenCalledTimes(2);
  });
});
