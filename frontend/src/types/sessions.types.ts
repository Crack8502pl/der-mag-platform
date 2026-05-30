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
  currentIpAddress: string | null;
  currentUserAgent: string | null;
  ipChanged: boolean;
  uaChanged: boolean;
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

export interface SessionHistoryEntry {
  id: number;
  loginAt: string;
  logoutAt: string | null;
  durationSeconds: number | null;
  loginIpAddress: string | null;
  currentIpAddress: string | null;
  loginUserAgent: string | null;
  currentUserAgent: string | null;
  ipChanged: boolean;
  uaChanged: boolean;
  logoutType: 'manual' | 'admin_forced' | 'token_expired' | 'token_reuse' | null;
  isActive: boolean;
}

export interface UserSessionSummary {
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  totalDurationSeconds: number;
  sessionCount: number;
  lastActiveAt: string | null;
  isCurrentlyActive: boolean;
  sessions: SessionHistoryEntry[];
}

export interface SessionHistoryResponse {
  users: UserSessionSummary[];
}
