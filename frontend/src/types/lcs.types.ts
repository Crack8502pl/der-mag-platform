// src/types/lcs.types.ts
// Type definitions for LCS (Lokalne Centrum Sterowania) configuration

export interface LCSConfigSmokA {
  obserwowanePrzejazdy: number[];  // IDs of crossings managed by this LCS
  iloscStanowisk: number;
  stanowiska: LCSStanowisko[];
  iloscMonitorow: number;
  monitory: LCSMonitor[];
  funkcjonalnosci: {
    obserwacja: boolean;
    lacznoscAudio: boolean;
    zapisObrazu: boolean;
    zapisAudio: boolean;
    obslugaLPR: boolean;
  };
  serwerLPR?: {
    ip: string;
    port: number;
    maxTablicNaMinute: number;
  };
  hasCUID: boolean;
  cuidConfig?: CUIDConfig;
}

export interface LCSConfigSmokB {
  obserwowanePrzejazdy: number[];  // Only observation function for SMOK-B
  serwerObrazu: {
    ip: string;
    maxKamer: number;
    protokol: 'RTSP' | 'ONVIF';
  };
  stacjeOperatorskie: StacjaOperatorska[];
  hasCUID: boolean;
  cuidConfig?: CUIDConfig;
}

export interface LCSStanowisko {
  id: number;
  nazwa: string;
  typ: 'OPERATORSKIE' | 'ZGRYWANIE';
  przypisaneMonitory: number[];
  przypisanePrzejazdy: number[];
}

export interface LCSMonitor {
  id: number;
  nazwa: string;
  rozdzielczosc: '1080p' | '4K';
  przekatna: number;  // in inches
}

export interface StacjaOperatorska {
  id: number;
  nazwa: string;
  iloscMonitorow: number;
  przypisaneKamery: number[];
}

export interface CUIDConfig {
  stanowiskoZgran: string;
  typNosnika: 'USB' | 'DVD' | 'HDD';
  formatWyjsciowy: 'AVI' | 'MP4' | 'MKV';
}
