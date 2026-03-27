// src/services/honeypot.service.ts
// Serwis komunikacji z API honeypota

import api from './api';
import type {
  HoneypotStats,
  SuspiciousIP,
  HoneypotLog,
  ThreatLevel,
  CheckIPResult,
  CleanupResult,
} from '../types/honeypot.types';

class HoneypotServiceClass {
  /**
   * Pobiera statystyki honeypota
   */
  async getStats(days: number = 30): Promise<HoneypotStats> {
    const response = await api.get('/admin/honeypot/stats', { params: { days } });
    return response.data.data;
  }

  /**
   * Pobiera listę podejrzanych IP
   */
  async getSuspiciousIPs(minHits: number = 5): Promise<SuspiciousIP[]> {
    const response = await api.get('/admin/honeypot/suspicious-ips', { params: { minHits } });
    return response.data.data;
  }

  /**
   * Pobiera ostatnie logi honeypota
   */
  async getLogs(limit: number = 50, threatLevel?: ThreatLevel): Promise<HoneypotLog[]> {
    const params: Record<string, string | number> = { limit };
    if (threatLevel) params.threatLevel = threatLevel;
    const response = await api.get('/admin/honeypot/logs', { params });
    return response.data.data;
  }

  /**
   * Eksportuje logi do pliku (wywołuje pobieranie pliku)
   */
  async exportLogs(format: 'json' | 'csv', days: number = 30): Promise<void> {
    const response = await api.get('/admin/honeypot/export', {
      params: { format, days },
      responseType: 'blob',
    });
    const filename = `honeypot-logs-${new Date().toISOString().slice(0, 10)}.${format}`;
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Czyści stare logi honeypota
   */
  async cleanupLogs(olderThanDays: number = 90): Promise<CleanupResult> {
    const response = await api.delete('/admin/honeypot/cleanup', {
      params: { olderThanDays },
    });
    return response.data.data;
  }

  /**
   * Sprawdza czy dane IP jest podejrzane
   */
  async checkIP(ip: string, threshold: number = 5): Promise<CheckIPResult> {
    const response = await api.get(`/admin/honeypot/check-ip/${ip}`, {
      params: { threshold },
    });
    return response.data.data;
  }
}

const honeypotService = new HoneypotServiceClass();
export default honeypotService;
