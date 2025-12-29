// src/integrations/symfonia/SymfoniaConfig.ts
// Konfiguracja połączenia z Symfonia Handel WebAPI

import { SymfoniaApiConfig } from './SymfoniaTypes';

export class SymfoniaConfig {
  private static config: SymfoniaApiConfig | null = null;

  static initialize(config: SymfoniaApiConfig): void {
    this.config = config;
  }

  static getConfig(): SymfoniaApiConfig | null {
    return this.config;
  }

  static isConfigured(): boolean {
    return this.config !== null && 
           this.config.baseUrl !== undefined &&
           this.config.baseUrl.length > 0;
  }

  static loadFromEnv(): void {
    const baseUrl = process.env.SYMFONIA_API_URL;
    const apiKey = process.env.SYMFONIA_API_KEY;
    const username = process.env.SYMFONIA_USERNAME;
    const password = process.env.SYMFONIA_PASSWORD;

    if (baseUrl) {
      this.initialize({
        baseUrl,
        apiKey,
        username,
        password,
        timeout: 30000
      });
    }
  }
}

// Załaduj konfigurację z zmiennych środowiskowych przy starcie
SymfoniaConfig.loadFromEnv();
