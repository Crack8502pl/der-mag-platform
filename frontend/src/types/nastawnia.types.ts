// src/types/nastawnia.types.ts
// Type definitions for Nastawnia (signalling box) configuration

export interface NastawniaSamodzielnaConfig {
  // Full functionality (no LCS above it)
  obserwowanePrzejazdy: number[];
  iloscStanowisk: number;
  iloscMonitorow: number;
  funkcjonalnosci: {
    obserwacja: boolean;
    lacznoscAudio: boolean;
    zapisObrazu: boolean;
    zapisAudio: boolean;
    obslugaLPR: boolean;
  };
  serwerLokalny: {
    ip: string;
    typ: 'NVR' | 'VMS';
  };
  telefonSystemowy: {
    numerWewnetrzny: string;
    typ: 'SIP' | 'ANALOG';
  };
  systemPodtrzymania: {
    typ: 'UPS' | 'AKUMULATOR';
    czasPodtrzymania: number;  // in minutes
  };
  switchTransmisji: {
    typ: 'ZARZADZALNY' | 'NIEZARZADZALNY';
    iloscPortow: number;
    iloscPortowSFP: number;
  };
}

export interface NastawniaPodleglaConfig {
  // Limited functionality (subordinate to LCS)
  nadrzedneLCSId: number;  // reference to the parent LCS task id
  serwerWyswietlania: {
    ip: string;
    maxMonitorow: number;
  };
  stacjaOperatorska: {
    iloscMonitorow: number;
    przypisaneKamery: number[];
  };
  telefonSystemowy: {
    numerWewnetrzny: string;
    typ: 'SIP' | 'ANALOG';
  };
  infrastruktura: {
    systemPodtrzymania: {
      typ: 'UPS';
      mocVA: number;
    };
    switchTransmisji: {
      model: string;
      iloscPortow: number;
    };
  };
}
