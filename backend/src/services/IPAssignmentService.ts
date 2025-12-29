// src/services/IPAssignmentService.ts
// Serwis przydzielania IP urządzeniom

import { AppDataSource } from '../config/database';
import { DeviceIPAssignment, DeviceCategory, DeviceIPStatus } from '../entities/DeviceIPAssignment';
import { NetworkAllocation } from '../entities/NetworkAllocation';
import { Repository } from 'typeorm';

export class IPAssignmentService {
  private assignmentRepository: Repository<DeviceIPAssignment>;
  private allocationRepository: Repository<NetworkAllocation>;

  constructor() {
    this.assignmentRepository = AppDataSource.getRepository(DeviceIPAssignment);
    this.allocationRepository = AppDataSource.getRepository(NetworkAllocation);
  }

  /**
   * Przydzielenie IP urządzeniu
   */
  async assignIP(data: {
    allocationId: number;
    deviceCategory: DeviceCategory;
    deviceType: string;
    hostname: string;
    description?: string;
    serialNumber?: string;
  }): Promise<DeviceIPAssignment> {
    const allocation = await this.allocationRepository.findOne({
      where: { id: data.allocationId },
      relations: ['deviceAssignments']
    });

    if (!allocation) {
      throw new Error('Alokacja nie znaleziona');
    }

    // Znajdź następny dostępny IP
    const nextIP = await this.getNextAvailableIP(allocation);

    const assignment = this.assignmentRepository.create({
      allocationId: data.allocationId,
      ipAddress: nextIP,
      deviceCategory: data.deviceCategory,
      deviceType: data.deviceType,
      hostname: data.hostname,
      description: data.description,
      serialNumber: data.serialNumber,
      status: DeviceIPStatus.PLANNED
    });

    const saved = await this.assignmentRepository.save(assignment);

    // Aktualizuj licznik użytych hostów
    allocation.usedHosts = (allocation.usedHosts || 0) + 1;
    await this.allocationRepository.save(allocation);

    return saved;
  }

  /**
   * Znajdź następny dostępny IP w alokacji
   */
  private async getNextAvailableIP(allocation: NetworkAllocation): Promise<string> {
    const existingIPs = allocation.deviceAssignments?.map(a => a.ipAddress) || [];
    
    // Parse first usable IP
    const octets = allocation.firstUsableIP.split('.').map(Number);
    const lastOctets = allocation.lastUsableIP.split('.').map(Number);
    
    // Iterate through available IPs
    let currentOctet4 = octets[3];
    
    while (currentOctet4 <= lastOctets[3]) {
      const candidateIP = `${octets[0]}.${octets[1]}.${octets[2]}.${currentOctet4}`;
      
      if (!existingIPs.includes(candidateIP)) {
        return candidateIP;
      }
      
      currentOctet4++;
    }
    
    throw new Error('Brak dostępnych adresów IP w alokacji');
  }

  /**
   * Pobranie przypisania po ID
   */
  async getAssignmentById(id: number): Promise<DeviceIPAssignment | null> {
    return await this.assignmentRepository.findOne({
      where: { id },
      relations: ['allocation']
    });
  }

  /**
   * Lista przypisań dla alokacji
   */
  async getAssignmentsByAllocation(allocationId: number): Promise<DeviceIPAssignment[]> {
    return await this.assignmentRepository.find({
      where: { allocationId },
      order: { ipAddress: 'ASC' }
    });
  }

  /**
   * Aktualizacja przypisania
   */
  async updateAssignment(id: number, data: Partial<DeviceIPAssignment>): Promise<DeviceIPAssignment> {
    const assignment = await this.getAssignmentById(id);
    if (!assignment) {
      throw new Error('Przypisanie nie znalezione');
    }

    Object.assign(assignment, data);
    return await this.assignmentRepository.save(assignment);
  }

  /**
   * Konfiguracja urządzenia
   */
  async configureDevice(id: number, userId: number, firmwareVersion?: string): Promise<DeviceIPAssignment> {
    const assignment = await this.getAssignmentById(id);
    if (!assignment) {
      throw new Error('Przypisanie nie znalezione');
    }

    assignment.status = DeviceIPStatus.CONFIGURED;
    assignment.configuredBy = userId;
    assignment.configuredAt = new Date();
    if (firmwareVersion) {
      assignment.firmwareVersion = firmwareVersion;
    }

    return await this.assignmentRepository.save(assignment);
  }

  /**
   * Weryfikacja urządzenia
   */
  async verifyDevice(id: number, userId: number, testResults: any): Promise<DeviceIPAssignment> {
    const assignment = await this.getAssignmentById(id);
    if (!assignment) {
      throw new Error('Przypisanie nie znalezione');
    }

    assignment.status = DeviceIPStatus.VERIFIED;
    assignment.verifiedBy = userId;
    assignment.verifiedAt = new Date();
    assignment.testResults = testResults;

    return await this.assignmentRepository.save(assignment);
  }
}
