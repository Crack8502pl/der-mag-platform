// src/services/BrigadeService.ts
// Service for managing brigades and their members

import { AppDataSource } from '../config/database';
import { Brigade } from '../entities/Brigade';
import { BrigadeMember } from '../entities/BrigadeMember';
import { User } from '../entities/User';

export class BrigadeService {
  private brigadeRepository = AppDataSource.getRepository(Brigade);
  private memberRepository = AppDataSource.getRepository(BrigadeMember);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Create a new brigade
   */
  async createBrigade(data: {
    code: string;
    name: string;
    description?: string;
    active?: boolean;
  }): Promise<Brigade> {
    // Check if code already exists
    const existing = await this.brigadeRepository.findOne({
      where: { code: data.code },
    });

    if (existing) {
      throw new Error('Brygada z tym kodem już istnieje');
    }

    const brigade = this.brigadeRepository.create({
      code: data.code,
      name: data.name,
      description: data.description,
      active: data.active !== undefined ? data.active : true,
    });

    return await this.brigadeRepository.save(brigade);
  }

  /**
   * Get brigade by ID
   */
  async getBrigadeById(id: number): Promise<Brigade | null> {
    return await this.brigadeRepository.findOne({
      where: { id },
      relations: ['members', 'members.user'],
    });
  }

  /**
   * Get all brigades with optional filters
   */
  async getBrigades(filters?: {
    active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ brigades: Brigade[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.brigadeRepository
      .createQueryBuilder('brigade')
      .leftJoinAndSelect('brigade.members', 'members')
      .leftJoinAndSelect('members.user', 'user');

    if (filters?.active !== undefined) {
      queryBuilder.andWhere('brigade.active = :active', {
        active: filters.active,
      });
    }

    queryBuilder
      .orderBy('brigade.name', 'ASC')
      .skip(skip)
      .take(limit);

    const [brigades, total] = await queryBuilder.getManyAndCount();

    return { brigades, total };
  }

  /**
   * Update brigade
   */
  async updateBrigade(
    id: number,
    data: Partial<Brigade>
  ): Promise<Brigade | null> {
    const brigade = await this.getBrigadeById(id);
    if (!brigade) {
      throw new Error('Brygada nie znaleziona');
    }

    // Check code uniqueness if changing code
    if (data.code && data.code !== brigade.code) {
      const existing = await this.brigadeRepository.findOne({
        where: { code: data.code },
      });
      if (existing) {
        throw new Error('Brygada z tym kodem już istnieje');
      }
    }

    Object.assign(brigade, data);
    return await this.brigadeRepository.save(brigade);
  }

  /**
   * Delete brigade
   */
  async deleteBrigade(id: number): Promise<void> {
    const brigade = await this.getBrigadeById(id);
    if (!brigade) {
      throw new Error('Brygada nie znaleziona');
    }

    await this.brigadeRepository.remove(brigade);
  }

  /**
   * Add member to brigade
   */
  async addMember(data: {
    brigadeId: number;
    userId: number;
    workDays: number[];
    validFrom: Date;
    validTo?: Date;
    active?: boolean;
  }): Promise<BrigadeMember> {
    // Validate brigade exists
    const brigade = await this.getBrigadeById(data.brigadeId);
    if (!brigade) {
      throw new Error('Brygada nie znaleziona');
    }

    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: data.userId },
    });
    if (!user) {
      throw new Error('Użytkownik nie znaleziony');
    }

    // Check for overlapping time periods
    const queryBuilder = this.memberRepository
      .createQueryBuilder('member')
      .where('member.brigadeId = :brigadeId', { brigadeId: data.brigadeId })
      .andWhere('member.userId = :userId', { userId: data.userId })
      .andWhere('member.active = :active', { active: true });

    // Check for overlaps: new period overlaps if:
    // 1. New start is before existing end (or existing has no end)
    // 2. New end (or no end) is after existing start
    queryBuilder.andWhere(
      '(member.validFrom <= :validTo OR :validTo IS NULL)',
      { validTo: data.validTo }
    );
    queryBuilder.andWhere(
      '(member.validTo IS NULL OR member.validTo >= :validFrom)',
      { validFrom: data.validFrom }
    );

    const overlapping = await queryBuilder.getOne();

    if (overlapping) {
      throw new Error(
        'Użytkownik jest już przypisany do tej brygady w nakładającym się okresie czasu'
      );
    }

    const member = this.memberRepository.create({
      brigadeId: data.brigadeId,
      userId: data.userId,
      workDays: data.workDays,
      validFrom: data.validFrom,
      validTo: data.validTo,
      active: data.active !== undefined ? data.active : true,
    });

    const savedMember = await this.memberRepository.save(member);

    // NOWE: Powiadom nowego członka jeśli brygada ma zadania
    const BrigadeNotificationService = (await import('./BrigadeNotificationService')).default;
    await BrigadeNotificationService.notifyMemberAdded(data.brigadeId, data.userId);

    return savedMember;
  }

  /**
   * Update brigade member
   */
  async updateMember(
    id: number,
    data: Partial<BrigadeMember>
  ): Promise<BrigadeMember | null> {
    const member = await this.memberRepository.findOne({
      where: { id },
      relations: ['brigade', 'user'],
    });

    if (!member) {
      throw new Error('Członek brygady nie znaleziony');
    }

    Object.assign(member, data);
    return await this.memberRepository.save(member);
  }

  /**
   * Remove member from brigade
   */
  async removeMember(id: number): Promise<void> {
    const member = await this.memberRepository.findOne({ 
      where: { id },
      relations: ['brigade', 'brigade.serviceTasks']
    });
    if (!member) {
      throw new Error('Członek brygady nie znaleziony');
    }

    const tasksCount = member.brigade?.serviceTasks?.length || 0;
    const userId = member.userId;
    const brigadeId = member.brigadeId;

    await this.memberRepository.remove(member);

    // NOWE: Powiadom usuniętego członka
    if (userId && tasksCount > 0) {
      const BrigadeNotificationService = (await import('./BrigadeNotificationService')).default;
      await BrigadeNotificationService.notifyMemberRemoved(brigadeId, userId, tasksCount);
    }
  }

  /**
   * Get brigade members
   */
  async getBrigadeMembers(
    brigadeId: number,
    filters?: { active?: boolean }
  ): Promise<BrigadeMember[]> {
    const queryBuilder = this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('user.role', 'role')
      .where('member.brigadeId = :brigadeId', { brigadeId });

    if (filters?.active !== undefined) {
      queryBuilder.andWhere('member.active = :active', {
        active: filters.active,
      });
    }

    queryBuilder.orderBy('user.lastName', 'ASC');

    return await queryBuilder.getMany();
  }

  /**
   * Get user's brigade assignments
   */
  async getUserBrigades(userId: number): Promise<BrigadeMember[]> {
    return await this.memberRepository.find({
      where: { userId, active: true },
      relations: ['brigade'],
      order: { validFrom: 'DESC' },
    });
  }

  /**
   * Get brigade members for a specific date
   */
  async getBrigadeMembersForDate(
    brigadeId: number,
    date: Date
  ): Promise<BrigadeMember[]> {
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // Convert Sunday from 0 to 7

    const members = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('member.brigadeId = :brigadeId', { brigadeId })
      .andWhere('member.active = :active', { active: true })
      .andWhere('member.validFrom <= :date', { date })
      .andWhere('(member.validTo IS NULL OR member.validTo >= :date)', { date })
      .getMany();

    // Filter by work days
    return members.filter((member) =>
      member.workDays.includes(dayOfWeek)
    );
  }

  /**
   * Get brigade statistics
   */
  async getBrigadeStatistics(brigadeId: number): Promise<{
    totalMembers: number;
    activeMembers: number;
    tasksCount: number;
  }> {
    const brigade = await this.brigadeRepository.findOne({
      where: { id: brigadeId },
      relations: ['members', 'serviceTasks'],
    });

    if (!brigade) {
      throw new Error('Brygada nie znaleziona');
    }

    const totalMembers = brigade.members?.length || 0;
    const activeMembers =
      brigade.members?.filter((m) => m.active).length || 0;
    const tasksCount = brigade.serviceTasks?.length || 0;

    return {
      totalMembers,
      activeMembers,
      tasksCount,
    };
  }
}

export default new BrigadeService();
