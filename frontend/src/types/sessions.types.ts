// src/types/sessions.types.ts
// Types for admin sessions management

export interface AdminSession {
  tokenId: string;
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
  loginAt: string;
  expiresAt: string;
  currentSessionSeconds: number;
  totalSessionTimeSeconds: number;
  lastLogin: string | null;
  isCurrentSession: boolean;
}

export interface SessionStats {
  activeSessions: number;
  loggedTodayCount: number;
  totalUsersCount: number;
  avgSessionMinutes: number;
}
