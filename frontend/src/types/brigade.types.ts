// src/types/brigade.types.ts
// Types for Brigade module

export interface Brigade {
  id: number;
  code: string; // Vehicle registration number (e.g., WA12345)
  name: string;
  description?: string;
  active: boolean;
  members?: BrigadeMember[];
  serviceTasks?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface BrigadeMember {
  id: number;
  brigadeId: number;
  brigade?: Brigade;
  userId: number;
  user?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    role?: {
      name: string;
    };
  };
  workDays: number[]; // [1,2,3,4,5] = Mon-Fri
  validFrom: string;
  validTo?: string;
  active: boolean;
  createdAt: string;
}

export interface CreateBrigadeDto {
  code: string;
  name: string;
  description?: string;
  active?: boolean;
}

export interface UpdateBrigadeDto {
  code?: string;
  name?: string;
  description?: string;
  active?: boolean;
}

export interface AddMemberDto {
  userId: number;
  workDays: number[];
  validFrom: string;
  validTo?: string;
  active?: boolean;
}

export interface UpdateMemberDto {
  workDays?: number[];
  validFrom?: string;
  validTo?: string;
  active?: boolean;
}

export interface BrigadeStats {
  totalMembers: number;
  activeMembers: number;
  tasksCount: number;
}

export interface BrigadeFilters {
  active?: boolean;
  page?: number;
  limit?: number;
}

export interface BrigadesResponse {
  brigades: Brigade[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
