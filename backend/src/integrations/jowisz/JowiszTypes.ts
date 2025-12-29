// src/integrations/jowisz/JowiszTypes.ts
// Typy danych dla integracji z API Jowisz (placeholder)

/**
 * Konfiguracja klienta Jowisz API
 */
export interface JowiszConfig {
  baseUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  timeout: number;
}

/**
 * Reprezentacja kontraktu z systemu Jowisz
 */
export interface JowiszContract {
  id: string;
  contractNumber: string;
  name: string;
  client: string;
  startDate: string;
  endDate?: string;
  status: string;
  value?: number;
  currency?: string;
  projectManager?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Wynik wyszukiwania kontraktów
 */
export interface JowiszSearchResult {
  contracts: JowiszContract[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Status połączenia z API
 */
export interface JowiszConnectionStatus {
  connected: boolean;
  message: string;
  lastChecked: Date;
  apiVersion?: string;
}
