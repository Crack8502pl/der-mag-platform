// src/integrations/symfonia/SymfoniaTypes.ts
// Typy danych dla integracji z Symfonia Handel

export interface SymfoniaProduct {
  id: string;
  indeks: string;
  symbol: string;
  nazwa: string;
  nazwaPelna?: string;
  jm: string;
  cenaZakupu?: number;
  cenaSprzedazy?: number;
  vat?: number;
  grupaTowarowa?: string;
  dostawca?: string;
  kodKreskowy?: string;
  ean?: string;
  stanMinimalny?: number;
  uwagi?: string;
}

export interface SymfoniaStockLevel {
  indeks: string;
  magazyn: string;
  stan: number;
  zarezerwowane?: number;
  dostepne?: number;
}

export interface SymfoniaApiConfig {
  baseUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  timeout?: number;
}

export interface SymfoniaApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
