// src/services/ContractService.ts
// Serwis zarządzania kontraktami

import { AppDataSource } from '../config/database';
import { Contract, ContractStatus } from '../entities/Contract';
import { User } from '../entities/User';
import { Repository } from 'typeorm';

export class ContractService {
  private contractRepository: Repository<Contract>;

  constructor() {
    this.contractRepository = AppDataSource.getRepository(Contract);
  }

  /**
   * Walidacja numeru kontraktu w formacie RXXXXXXX_Y
   * R = prefix
   * XXXXXXX = 7-cyfrowy numer (0000001-9999999)
   * _Y = suffix (1-9)
   */
  validateContractNumber(contractNumber: string): boolean {
    const regex = /^R\d{7}_\d$/;
    return regex.test(contractNumber);
  }

  /**
   * Generowanie kolejnego numeru kontraktu
   */
  async generateContractNumber(): Promise<string> {
    // Pobierz ostatni numer kontraktu
    const lastContract = await this.contractRepository
      .createQueryBuilder('contract')
      .orderBy('contract.id', 'DESC')
      .limit(1)
      .getOne();

    let nextNumber = 1;
    if (lastContract && lastContract.contractNumber) {
      // Wyciągnij numer z formatu RXXXXXXX_Y
      const match = lastContract.contractNumber.match(/^R(\d{7})_(\d)$/);
      if (match) {
        const baseNumber = parseInt(match[1], 10);
        nextNumber = baseNumber + 1;
      }
    }

    // Format: R0000001_1 (domyślnie suffix = 1)
    const paddedNumber = nextNumber.toString().padStart(7, '0');
    return `R${paddedNumber}_1`;
  }

  /**
   * Utworzenie nowego kontraktu
   */
  async createContract(data: {
    contractNumber?: string;
    customName: string;
    orderDate: Date;
    managerCode: string;
    projectManagerId: number;
    jowiszRef?: string;
  }): Promise<Contract> {
    // Jeśli nie podano numeru, wygeneruj automatycznie
    const contractNumber = data.contractNumber || await this.generateContractNumber();

    // Walidacja numeru
    if (!this.validateContractNumber(contractNumber)) {
      throw new Error('Nieprawidłowy format numeru kontraktu. Oczekiwano: RXXXXXXX_Y');
    }

    // Sprawdź czy numer już istnieje
    const existing = await this.contractRepository.findOne({
      where: { contractNumber }
    });

    if (existing) {
      throw new Error(`Kontrakt o numerze ${contractNumber} już istnieje`);
    }

    // Sprawdź czy kierownik projektu istnieje
    const userRepository = AppDataSource.getRepository(User);
    const manager = await userRepository.findOne({
      where: { id: data.projectManagerId }
    });

    if (!manager) {
      throw new Error('Kierownik projektu nie istnieje');
    }

    // Utworzenie kontraktu
    const contract = this.contractRepository.create({
      contractNumber,
      customName: data.customName,
      orderDate: data.orderDate,
      managerCode: data.managerCode,
      projectManagerId: data.projectManagerId,
      jowiszRef: data.jowiszRef,
      status: ContractStatus.CREATED
    });

    return await this.contractRepository.save(contract);
  }

  /**
   * Pobranie kontraktu po ID
   */
  async getContractById(id: number): Promise<Contract | null> {
    return await this.contractRepository.findOne({
      where: { id },
      relations: ['projectManager', 'subsystems']
    });
  }

  /**
   * Pobranie kontraktu po numerze
   */
  async getContractByNumber(contractNumber: string): Promise<Contract | null> {
    return await this.contractRepository.findOne({
      where: { contractNumber },
      relations: ['projectManager', 'subsystems']
    });
  }

  /**
   * Lista wszystkich kontraktów
   */
  async getAllContracts(filters?: {
    status?: ContractStatus;
    projectManagerId?: number;
  }): Promise<Contract[]> {
    const query = this.contractRepository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.projectManager', 'projectManager')
      .leftJoinAndSelect('contract.subsystems', 'subsystems');

    if (filters?.status) {
      query.andWhere('contract.status = :status', { status: filters.status });
    }

    if (filters?.projectManagerId) {
      query.andWhere('contract.projectManagerId = :projectManagerId', {
        projectManagerId: filters.projectManagerId
      });
    }

    return await query.orderBy('contract.createdAt', 'DESC').getMany();
  }

  /**
   * Aktualizacja kontraktu
   */
  async updateContract(id: number, data: Partial<Contract>): Promise<Contract> {
    const contract = await this.getContractById(id);
    if (!contract) {
      throw new Error('Kontrakt nie znaleziony');
    }

    // Nie pozwól na zmianę numeru kontraktu
    if (data.contractNumber && data.contractNumber !== contract.contractNumber) {
      throw new Error('Nie można zmienić numeru kontraktu');
    }

    Object.assign(contract, data);
    return await this.contractRepository.save(contract);
  }

  /**
   * Zatwierdzenie kontraktu
   */
  async approveContract(id: number): Promise<Contract> {
    const contract = await this.getContractById(id);
    if (!contract) {
      throw new Error('Kontrakt nie znaleziony');
    }

    if (contract.status !== ContractStatus.CREATED) {
      throw new Error('Tylko kontrakty w statusie CREATED mogą być zatwierdzone');
    }

    contract.status = ContractStatus.APPROVED;
    return await this.contractRepository.save(contract);
  }

  /**
   * Usunięcie kontraktu
   */
  async deleteContract(id: number): Promise<void> {
    const contract = await this.getContractById(id);
    if (!contract) {
      throw new Error('Kontrakt nie znaleziony');
    }

    // Sprawdź czy kontrakt ma podsystemy
    if (contract.subsystems && contract.subsystems.length > 0) {
      throw new Error('Nie można usunąć kontraktu posiadającego podsystemy');
    }

    await this.contractRepository.remove(contract);
  }
}
