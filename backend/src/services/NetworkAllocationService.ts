// src/services/NetworkAllocationService.ts
// Serwis alokacji sieci dla podsystemów

import { AppDataSource } from '../config/database';
import { NetworkAllocation } from '../entities/NetworkAllocation';
import { NetworkPool } from '../entities/NetworkPool';
import { Subsystem } from '../entities/Subsystem';
import { Contract } from '../entities/Contract';
import { Repository } from 'typeorm';

export class NetworkAllocationService {
  private allocationRepository: Repository<NetworkAllocation>;
  private poolRepository: Repository<NetworkPool>;
  private subsystemRepository: Repository<Subsystem>;
  private contractRepository: Repository<Contract>;

  constructor() {
    this.allocationRepository = AppDataSource.getRepository(NetworkAllocation);
    this.poolRepository = AppDataSource.getRepository(NetworkPool);
    this.subsystemRepository = AppDataSource.getRepository(Subsystem);
    this.contractRepository = AppDataSource.getRepository(Contract);
  }

  /**
   * Alokacja sieci dla podsystemu
   * Algorytm:
   * 1. Priorytet pul: 172.16.0.0/12 → 192.168.0.0/16 → 10.0.0.0/8
   * 2. Identyczne typy systemów w kontrakcie = współdzielona sieć
   * 3. Automatyczne obliczanie bramy (pierwszy użyteczny IP)
   */
  async allocateNetwork(subsystemId: number): Promise<NetworkAllocation> {
    const subsystem = await this.subsystemRepository.findOne({
      where: { id: subsystemId },
      relations: ['contract']
    });

    if (!subsystem) {
      throw new Error('Podsystem nie znaleziony');
    }

    // Sprawdź czy już ma alokację
    const existingAllocation = await this.allocationRepository.findOne({
      where: { subsystemId }
    });

    if (existingAllocation) {
      throw new Error('Podsystem już ma przydzieloną sieć');
    }

    // Sprawdź czy inne podsystemy tego samego typu w kontrakcie mają już sieć
    const siblingSubsystems = await this.subsystemRepository.find({
      where: {
        contractId: subsystem.contractId,
        systemType: subsystem.systemType
      },
      relations: ['networkAllocation']
    });

    // Jeśli jest podsystem tego samego typu z siecią, współdziel ją
    const sharedSubsystem = siblingSubsystems.find(
      s => s.id !== subsystemId && s.networkAllocation
    );

    if (sharedSubsystem && sharedSubsystem.networkAllocation) {
      // Współdzielona sieć - użyj tej samej puli i parametrów
      const sharedAllocation = sharedSubsystem.networkAllocation;
      const allocation = this.allocationRepository.create({
        subsystemId,
        contractId: subsystem.contractId,
        poolId: sharedAllocation.poolId,
        systemType: subsystem.systemType,
        allocatedRange: sharedAllocation.allocatedRange,
        gateway: sharedAllocation.gateway,
        subnetMask: sharedAllocation.subnetMask,
        ntpServer: sharedAllocation.ntpServer,
        firstUsableIP: sharedAllocation.firstUsableIP,
        lastUsableIP: sharedAllocation.lastUsableIP,
        totalHosts: sharedAllocation.totalHosts,
        usedHosts: 0
      });

      return await this.allocationRepository.save(allocation);
    }

    // Nowa alokacja - wybierz pulę według priorytetu
    const pools = await this.poolRepository.find({
      where: { isActive: true },
      order: { priority: 'ASC' }
    });

    if (pools.length === 0) {
      throw new Error('Brak aktywnych pul IP');
    }

    // Wybierz pierwszą dostępną pulę (uproszczona logika)
    const pool = pools[0];

    // Przykładowa alokacja /24 (254 hosty)
    // W rzeczywistej implementacji trzeba by śledzić zajęte zakresy
    const allocationCidr = await this.getNextAvailableSubnet(pool);
    const networkCalc = this.calculateNetwork(allocationCidr);

    const allocation = this.allocationRepository.create({
      subsystemId,
      contractId: subsystem.contractId,
      poolId: pool.id,
      systemType: subsystem.systemType,
      allocatedRange: allocationCidr,
      gateway: networkCalc.gateway,
      subnetMask: networkCalc.subnetMask,
      ntpServer: networkCalc.ntpServer,
      firstUsableIP: networkCalc.firstUsableIP,
      lastUsableIP: networkCalc.lastUsableIP,
      totalHosts: networkCalc.totalHosts,
      usedHosts: 0
    });

    return await this.allocationRepository.save(allocation);
  }

  /**
   * Pobierz następny dostępny subnet z puli (uproszczona wersja)
   */
  private async getNextAvailableSubnet(pool: NetworkPool): Promise<string> {
    // Uproszczona logika - w rzeczywistości trzeba by śledzić zajęte zakresy
    // Dla przykładu zwróćmy statyczny subnet z zakresu puli
    const poolBase = pool.cidrRange.split('/')[0];
    const octets = poolBase.split('.');
    
    // Znajdź istniejące alokacje dla tej puli
    const existingAllocations = await this.allocationRepository.find({
      where: { poolId: pool.id }
    });

    // Prosty licznik - w rzeczywistości potrzebna pełna logika CIDR
    const nextSubnet = existingAllocations.length;
    
    // Dla 172.16.0.0/12 alokuj /24
    octets[2] = String(parseInt(octets[2]) + nextSubnet);
    octets[3] = '0';
    
    return `${octets.join('.')}/24`;
  }

  /**
   * Obliczenia parametrów sieci dla danego CIDR
   */
  private calculateNetwork(cidr: string): {
    gateway: string;
    subnetMask: string;
    ntpServer: string;
    firstUsableIP: string;
    lastUsableIP: string;
    totalHosts: number;
  } {
    const [network, prefix] = cidr.split('/');
    const octets = network.split('.').map(Number);
    
    // Dla /24 mamy 254 użyteczne hosty
    const prefixNum = parseInt(prefix);
    const totalHosts = Math.pow(2, 32 - prefixNum) - 2;
    
    // Gateway = pierwszy użyteczny IP
    const gateway = `${octets[0]}.${octets[1]}.${octets[2]}.1`;
    
    // NTP server = drugi użyteczny IP
    const ntpServer = `${octets[0]}.${octets[1]}.${octets[2]}.2`;
    
    // Pierwszy użyteczny IP dla urządzeń = trzeci IP
    const firstUsableIP = `${octets[0]}.${octets[1]}.${octets[2]}.3`;
    
    // Ostatni użyteczny IP
    const lastOctet = Math.pow(2, 32 - prefixNum) - 1;
    const lastUsableIP = `${octets[0]}.${octets[1]}.${octets[2]}.${lastOctet - 1}`;
    
    // Maska podsieci
    const maskValue = ~((1 << (32 - prefixNum)) - 1) >>> 0;
    const subnetMask = [
      (maskValue >>> 24) & 255,
      (maskValue >>> 16) & 255,
      (maskValue >>> 8) & 255,
      maskValue & 255
    ].join('.');

    return {
      gateway,
      subnetMask,
      ntpServer,
      firstUsableIP,
      lastUsableIP,
      totalHosts
    };
  }

  /**
   * Pobranie alokacji po ID
   */
  async getAllocationById(id: number): Promise<NetworkAllocation | null> {
    return await this.allocationRepository.findOne({
      where: { id },
      relations: ['subsystem', 'contract', 'pool', 'deviceAssignments']
    });
  }

  /**
   * Pobranie alokacji dla podsystemu
   */
  async getAllocationBySubsystem(subsystemId: number): Promise<NetworkAllocation | null> {
    return await this.allocationRepository.findOne({
      where: { subsystemId },
      relations: ['pool', 'deviceAssignments']
    });
  }

  /**
   * Lista wszystkich alokacji
   */
  async getAllAllocations(contractId?: number): Promise<NetworkAllocation[]> {
    const query = this.allocationRepository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.subsystem', 'subsystem')
      .leftJoinAndSelect('allocation.contract', 'contract')
      .leftJoinAndSelect('allocation.pool', 'pool');

    if (contractId) {
      query.where('allocation.contractId = :contractId', { contractId });
    }

    return await query.getMany();
  }
}
