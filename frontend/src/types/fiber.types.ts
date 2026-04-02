// src/types/fiber.types.ts
// Type definitions for fiber optic transmission configuration

export interface FiberTransmissionConfig {
  schematLacznosci: FiberConnection[];
  obliczenia: {
    calkowitaDlugoscKm: number;
    wymaganychWlokien: number;
    typPolaczenia: 'DUPLEX' | 'WDM';
  };
}

export interface FiberConnection {
  id: number;
  obiektStartowy: FiberEndpoint;
  obiektKoncowy: FiberEndpoint;
  odleglosc: number;  // in metres, auto-calculated
  typWkladki: 'DUPLEX' | 'WDM';
  iloscWlokien: number;  // 2 for DUPLEX, 1 for WDM
}

export interface FiberEndpoint {
  id: number;
  nazwa: string;
  typ: 'LCS' | 'NASTAWNIA' | 'PRZEJAZD' | 'SKP';
  kilometraz?: number;
  gps?: { lat: number; lng: number };
}
