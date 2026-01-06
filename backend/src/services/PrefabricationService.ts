// src/services/PrefabricationService.ts
// Serwis zarządzania prefabrykacją urządzeń

import { AppDataSource } from '../config/database';
import { PrefabricationTask, PrefabricationTaskStatus } from '../entities/PrefabricationTask';
import { PrefabricationDevice, PrefabricationDeviceStatus } from '../entities/PrefabricationDevice';
import { DeviceIPAssignment, DeviceIPStatus } from '../entities/DeviceIPAssignment';
import { NetworkAllocation } from '../entities/NetworkAllocation';
import { Subsystem, SubsystemStatus } from '../entities/Subsystem';

export interface DeviceConfigurationParams {
  prefabTaskId: number;
  ipAssignmentId: number;
  serialNumber: string;
  userId: number;
}

export interface DeviceVerificationParams {
  prefabTaskId: number;
  deviceId: number;
  userId: number;
  notes?: string;
}

export interface DeviceTableRow {
  lp: number;
  nazwa: string;
  model: string;
  typ: string;
  sn: string | null;
  ip: string;
  maska: string;
  brama: string;
  ntp: string;
  opisProjektowy: string;
  deviceId?: number;
  ipAssignmentId: number;
  status: PrefabricationDeviceStatus;
}

export class PrefabricationService {
  /**
   * Pobiera tabelę urządzeń do konfiguracji
   * Kolumny: LP, Nazwa, Model, TYP, SN, IP, Maska, Brama, NTP, Opis projektowy
   * WAŻNE: NTP = zawsze adres bramy (gateway)
   */
  async getDevicesTable(prefabTaskId: number): Promise<DeviceTableRow[]> {
    const prefabTaskRepo = AppDataSource.getRepository(PrefabricationTask);
    const deviceRepo = AppDataSource.getRepository(PrefabricationDevice);
    const ipAssignmentRepo = AppDataSource.getRepository(DeviceIPAssignment);
    const networkAllocationRepo = AppDataSource.getRepository(NetworkAllocation);

    const task = await prefabTaskRepo.findOne({
      where: { id: prefabTaskId },
      relations: ['subsystem', 'devices', 'devices.ipAssignment']
    });

    if (!task) {
      throw new Error('Zadanie prefabrykacji nie znalezione');
    }

    // Pobierz alokację sieci dla podsystemu
    const allocation = await networkAllocationRepo.findOne({
      where: { subsystemId: task.subsystemId },
      relations: ['deviceAssignments']
    });

    if (!allocation) {
      throw new Error('Brak alokacji sieci dla podsystemu');
    }

    // Przygotuj tabelę urządzeń
    const tableRows: DeviceTableRow[] = [];

    for (let i = 0; i < allocation.deviceAssignments.length; i++) {
      const ipAssignment = allocation.deviceAssignments[i];
      
      // Znajdź urządzenie prefabrykacyjne jeśli istnieje
      const prefabDevice = task.devices.find(d => d.ipAssignmentId === ipAssignment.id);

      tableRows.push({
        lp: i + 1,
        nazwa: ipAssignment.deviceType,
        model: ipAssignment.deviceType,
        typ: ipAssignment.deviceCategory,
        sn: ipAssignment.serialNumber || null,
        ip: ipAssignment.ipAddress,
        maska: allocation.subnetMask,
        brama: allocation.gateway,
        ntp: allocation.gateway, // NTP = zawsze adres bramy
        opisProjektowy: ipAssignment.description || ipAssignment.hostname,
        deviceId: prefabDevice?.id,
        ipAssignmentId: ipAssignment.id,
        status: prefabDevice?.status || PrefabricationDeviceStatus.PENDING
      });
    }

    return tableRows;
  }

  /**
   * Konfiguracja urządzenia i przypisanie numeru seryjnego (krok 3.2, 3.3)
   */
  async configureDevice(params: DeviceConfigurationParams): Promise<PrefabricationDevice> {
    const prefabTaskRepo = AppDataSource.getRepository(PrefabricationTask);
    const deviceRepo = AppDataSource.getRepository(PrefabricationDevice);
    const ipAssignmentRepo = AppDataSource.getRepository(DeviceIPAssignment);

    const task = await prefabTaskRepo.findOne({
      where: { id: params.prefabTaskId }
    });

    if (!task) {
      throw new Error('Zadanie prefabrykacji nie znalezione');
    }

    const ipAssignment = await ipAssignmentRepo.findOne({
      where: { id: params.ipAssignmentId }
    });

    if (!ipAssignment) {
      throw new Error('Przypisanie IP nie znalezione');
    }

    // Walidacja unikalności numeru seryjnego
    const existingSerial = await ipAssignmentRepo.findOne({
      where: { serialNumber: params.serialNumber }
    });

    if (existingSerial && existingSerial.id !== params.ipAssignmentId) {
      throw new Error(`Numer seryjny ${params.serialNumber} już został użyty`);
    }

    // Uaktualnij przypisanie IP
    ipAssignment.serialNumber = params.serialNumber;
    ipAssignment.status = DeviceIPStatus.CONFIGURED;
    ipAssignment.configuredBy = params.userId;
    ipAssignment.configuredAt = new Date();
    await ipAssignmentRepo.save(ipAssignment);

    // Utwórz lub zaktualizuj urządzenie prefabrykacyjne
    let prefabDevice = await deviceRepo.findOne({
      where: { 
        prefabTaskId: params.prefabTaskId,
        ipAssignmentId: params.ipAssignmentId
      }
    });

    if (!prefabDevice) {
      prefabDevice = deviceRepo.create({
        prefabTaskId: params.prefabTaskId,
        ipAssignmentId: params.ipAssignmentId,
        status: PrefabricationDeviceStatus.CONFIGURED
      });
    } else {
      prefabDevice.status = PrefabricationDeviceStatus.CONFIGURED;
    }

    prefabDevice.configuredAt = new Date();
    await deviceRepo.save(prefabDevice);

    // Aktualizuj status zadania
    if (task.status === PrefabricationTaskStatus.CREATED) {
      task.status = PrefabricationTaskStatus.IN_PROGRESS;
      await prefabTaskRepo.save(task);
    }

    console.log(`✅ Skonfigurowano urządzenie: ${ipAssignment.hostname} (SN: ${params.serialNumber})`);

    return prefabDevice;
  }

  /**
   * Weryfikacja urządzenia (krok 3.3)
   */
  async verifyDevice(params: DeviceVerificationParams): Promise<PrefabricationDevice> {
    const deviceRepo = AppDataSource.getRepository(PrefabricationDevice);
    const ipAssignmentRepo = AppDataSource.getRepository(DeviceIPAssignment);

    const device = await deviceRepo.findOne({
      where: { 
        id: params.deviceId,
        prefabTaskId: params.prefabTaskId
      },
      relations: ['ipAssignment']
    });

    if (!device) {
      throw new Error('Urządzenie prefabrykacyjne nie znalezione');
    }

    if (device.status !== PrefabricationDeviceStatus.CONFIGURED) {
      throw new Error('Urządzenie nie jest skonfigurowane');
    }

    // Zaktualizuj status
    device.status = PrefabricationDeviceStatus.VERIFIED;
    device.verifiedAt = new Date();
    device.notes = params.notes || device.notes;
    await deviceRepo.save(device);

    // Zaktualizuj status w przypisaniu IP
    const ipAssignment = await ipAssignmentRepo.findOne({
      where: { id: device.ipAssignmentId }
    });

    if (ipAssignment) {
      ipAssignment.status = DeviceIPStatus.VERIFIED;
      ipAssignment.verifiedBy = params.userId;
      ipAssignment.verifiedAt = new Date();
      await ipAssignmentRepo.save(ipAssignment);
    }

    console.log(`✅ Zweryfikowano urządzenie #${device.id}`);

    return device;
  }

  /**
   * Zakończenie prefabrykacji (krok 3.4)
   */
  async completeTask(prefabTaskId: number): Promise<PrefabricationTask> {
    const taskRepo = AppDataSource.getRepository(PrefabricationTask);
    const subsystemRepo = AppDataSource.getRepository(Subsystem);

    const task = await taskRepo.findOne({
      where: { id: prefabTaskId },
      relations: ['devices', 'subsystem']
    });

    if (!task) {
      throw new Error('Zadanie prefabrykacji nie znalezione');
    }

    // Sprawdź czy wszystkie urządzenia są zweryfikowane
    const allVerified = task.devices.every(
      device => device.status === PrefabricationDeviceStatus.VERIFIED
    );

    if (!allVerified) {
      throw new Error('Nie wszystkie urządzenia zostały zweryfikowane');
    }

    // Zaktualizuj status zadania
    task.status = PrefabricationTaskStatus.COMPLETED;
    task.completedAt = new Date();
    await taskRepo.save(task);

    // Zaktualizuj status podsystemu
    if (task.subsystem) {
      task.subsystem.status = SubsystemStatus.READY_FOR_DEPLOYMENT;
      await subsystemRepo.save(task.subsystem);
    }

    console.log(`✅ Zakończono prefabrykację zadania #${prefabTaskId}`);

    return task;
  }

  /**
   * Generowanie danych do etykiety urządzenia
   */
  async getDeviceLabelData(prefabTaskId: number, deviceId: number) {
    const deviceRepo = AppDataSource.getRepository(PrefabricationDevice);
    const networkAllocationRepo = AppDataSource.getRepository(NetworkAllocation);

    const device = await deviceRepo.findOne({
      where: { 
        id: deviceId,
        prefabTaskId
      },
      relations: ['ipAssignment', 'prefabTask', 'prefabTask.subsystem']
    });

    if (!device) {
      throw new Error('Urządzenie nie znalezione');
    }

    const allocation = await networkAllocationRepo.findOne({
      where: { subsystemId: device.prefabTask.subsystemId }
    });

    if (!allocation) {
      throw new Error('Alokacja sieci nie znaleziona');
    }

    return {
      serialNumber: device.ipAssignment.serialNumber,
      ipAddress: device.ipAssignment.ipAddress,
      hostname: device.ipAssignment.hostname,
      description: device.ipAssignment.description,
      deviceType: device.ipAssignment.deviceType,
      subnetMask: allocation.subnetMask,
      gateway: allocation.gateway,
      ntp: allocation.gateway, // NTP = gateway
      subsystemNumber: device.prefabTask.subsystem.subsystemNumber
    };
  }

  /**
   * Pobiera szczegóły zadania prefabrykacji
   */
  async getTask(prefabTaskId: number) {
    const taskRepo = AppDataSource.getRepository(PrefabricationTask);

    const task = await taskRepo.findOne({
      where: { id: prefabTaskId },
      relations: [
        'subsystem',
        'subsystem.contract',
        'completionOrder',
        'assignedTo',
        'devices',
        'devices.ipAssignment'
      ]
    });

    if (!task) {
      throw new Error('Zadanie prefabrykacji nie znalezione');
    }

    return task;
  }

  /**
   * Pobiera listę zadań prefabrykacji
   */
  async listTasks(filters?: {
    status?: PrefabricationTaskStatus;
    assignedToId?: number;
    subsystemId?: number;
  }) {
    const taskRepo = AppDataSource.getRepository(PrefabricationTask);

    const queryBuilder = taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.subsystem', 'subsystem')
      .leftJoinAndSelect('task.assignedTo', 'assignedTo')
      .leftJoinAndSelect('task.devices', 'devices')
      .orderBy('task.createdAt', 'DESC');

    if (filters?.status) {
      queryBuilder.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters?.assignedToId) {
      queryBuilder.andWhere('task.assignedToId = :assignedToId', { assignedToId: filters.assignedToId });
    }

    if (filters?.subsystemId) {
      queryBuilder.andWhere('task.subsystemId = :subsystemId', { subsystemId: filters.subsystemId });
    }

    return await queryBuilder.getMany();
  }
}

export default new PrefabricationService();
