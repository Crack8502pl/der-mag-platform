// src/services/SubsystemService.ts
// Serwis zarządzania podsystemami

import { AppDataSource } from '../config/database';
import { Subsystem, SystemType, SubsystemStatus } from '../entities/Subsystem';
import { Contract } from '../entities/Contract';
import { Repository } from 'typeorm';

export class SubsystemService {
  private subsystemRepository: Repository<Subsystem>;
  private contractRepository: Repository<Contract>;

  constructor() {
    this.subsystemRepository = AppDataSource.getRepository(Subsystem);
    this.contractRepository = AppDataSource.getRepository(Contract);
  }

  /**
   * Generator numeru podsystemu w formacie PXXXXXYYZZ
   * XXXXX = kolejny numer (00001-99999)
   * YY = dzień założenia (01-31)
   * ZZ = rok (np. 25 dla 2025)
   */
  async generateSubsystemNumber(): Promise<string> {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0'); // YY
    const year = now.getFullYear().toString().slice(-2); // ZZ (ostatnie 2 cyfry roku)

    // Pobierz ostatni numer podsystemu dla tego dnia i roku
    const pattern = `P_____${day}${year}`;
    
    const lastSubsystem = await this.subsystemRepository
      .createQueryBuilder('subsystem')
      .where('subsystem.subsystemNumber LIKE :pattern', { 
        pattern: `P%${day}${year}` 
      })
      .orderBy('subsystem.subsystemNumber', 'DESC')
      .limit(1)
      .getOne();

    let nextNumber = 1;
    if (lastSubsystem && lastSubsystem.subsystemNumber) {
      // Wyciągnij numer z formatu PXXXXXYYZZ
      const match = lastSubsystem.subsystemNumber.match(/^P(\d{5})(\d{2})(\d{2})$/);
      if (match && match[2] === day && match[3] === year) {
        const currentNumber = parseInt(match[1], 10);
        nextNumber = currentNumber + 1;
      }
    }

    if (nextNumber > 99999) {
      throw new Error('Osiągnięto maksymalną liczbę podsystemów dla tego dnia');
    }

    // Format: P00001DDYY
    const paddedNumber = nextNumber.toString().padStart(5, '0');
    return `P${paddedNumber}${day}${year}`;
  }

  /**
   * Walidacja numeru podsystemu
   */
  validateSubsystemNumber(subsystemNumber: string): boolean {
    const regex = /^P\d{5}\d{2}\d{2}$/;
    return regex.test(subsystemNumber);
  }

  /**
   * Utworzenie nowego podsystemu
   */
  async createSubsystem(data: {
    contractId: number;
    systemType: SystemType;
    quantity?: number;
    subsystemNumber?: string;
    ipPool?: string | null;
  }): Promise<Subsystem> {
    // Sprawdź czy kontrakt istnieje
    const contract = await this.contractRepository.findOne({
      where: { id: data.contractId }
    });

    if (!contract) {
      throw new Error('Kontrakt nie znaleziony');
    }

    // Generuj numer jeśli nie podano
    const subsystemNumber = data.subsystemNumber || await this.generateSubsystemNumber();

    // Walidacja numeru
    if (!this.validateSubsystemNumber(subsystemNumber)) {
      throw new Error('Nieprawidłowy format numeru podsystemu. Oczekiwano: PXXXXXYYZZ');
    }

    // Sprawdź czy numer już istnieje
    const existing = await this.subsystemRepository.findOne({
      where: { subsystemNumber }
    });

    if (existing) {
      throw new Error(`Podsystem o numerze ${subsystemNumber} już istnieje`);
    }

    // Utworzenie podsystemu
    const subsystem = this.subsystemRepository.create({
      subsystemNumber,
      systemType: data.systemType,
      quantity: data.quantity || 1,
      contractId: data.contractId,
      status: SubsystemStatus.CREATED,
      ipPool: data.ipPool
    });

    return await this.subsystemRepository.save(subsystem);
  }

  /**
   * Pobranie podsystemu po ID
   */
  async getSubsystemById(id: number): Promise<Subsystem | null> {
    return await this.subsystemRepository.findOne({
      where: { id },
      relations: ['contract', 'contract.projectManager', 'networkAllocation']
    });
  }

  /**
   * Pobranie podsystemu po numerze
   */
  async getSubsystemByNumber(subsystemNumber: string): Promise<Subsystem | null> {
    return await this.subsystemRepository.findOne({
      where: { subsystemNumber },
      relations: ['contract', 'contract.projectManager', 'networkAllocation']
    });
  }

  /**
   * Lista podsystemów dla kontraktu
   */
  async getSubsystemsByContract(contractId: number): Promise<Subsystem[]> {
    return await this.subsystemRepository.find({
      where: { contractId },
      relations: ['networkAllocation'],
      order: { createdAt: 'ASC' }
    });
  }

  /**
   * Lista wszystkich podsystemów
   */
  async getAllSubsystems(filters?: {
    status?: SubsystemStatus;
    systemType?: SystemType;
    contractId?: number;
  }): Promise<Subsystem[]> {
    const query = this.subsystemRepository
      .createQueryBuilder('subsystem')
      .leftJoinAndSelect('subsystem.contract', 'contract')
      .leftJoinAndSelect('contract.projectManager', 'projectManager')
      .leftJoinAndSelect('subsystem.networkAllocation', 'networkAllocation');

    if (filters?.status) {
      query.andWhere('subsystem.status = :status', { status: filters.status });
    }

    if (filters?.systemType) {
      query.andWhere('subsystem.systemType = :systemType', { 
        systemType: filters.systemType 
      });
    }

    if (filters?.contractId) {
      query.andWhere('subsystem.contractId = :contractId', {
        contractId: filters.contractId
      });
    }

    return await query.orderBy('subsystem.createdAt', 'DESC').getMany();
  }

  /**
   * Aktualizacja podsystemu
   */
  async updateSubsystem(id: number, data: Partial<Subsystem>): Promise<Subsystem> {
    const subsystem = await this.getSubsystemById(id);
    if (!subsystem) {
      throw new Error('Podsystem nie znaleziony');
    }

    // Nie pozwól na zmianę numeru podsystemu
    if (data.subsystemNumber && data.subsystemNumber !== subsystem.subsystemNumber) {
      throw new Error('Nie można zmienić numeru podsystemu');
    }

    Object.assign(subsystem, data);
    return await this.subsystemRepository.save(subsystem);
  }

  /**
   * Usunięcie podsystemu
   */
  async deleteSubsystem(id: number): Promise<void> {
    const subsystem = await this.getSubsystemById(id);
    if (!subsystem) {
      throw new Error('Podsystem nie znaleziony');
    }

    // Sprawdź czy można usunąć (np. czy nie ma wygenerowanego BOM)
    if (subsystem.status !== SubsystemStatus.CREATED) {
      throw new Error('Można usunąć tylko podsystemy w statusie CREATED');
    }

    await this.subsystemRepository.remove(subsystem);
  }

  /**
   * Aktualizacja statusu podsystemu
   */
  async updateStatus(id: number, status: SubsystemStatus): Promise<Subsystem> {
    const subsystem = await this.getSubsystemById(id);
    if (!subsystem) {
      throw new Error('Podsystem nie znaleziony');
    }

    subsystem.status = status;
    return await this.subsystemRepository.save(subsystem);
  }
}
