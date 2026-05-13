// src/types/camera-point.types.ts
// Typy dla punktów kamerowych (słupów) w zadaniach SKP/PRZEJAZD

export type PoleType = 'STALOWY' | 'KOMPOZYT' | 'INNY';

export interface AssignedDevice {
  /** Indeks urządzenia (1-based, np. kamera 1, kamera 2) */
  deviceIndex: number;
  /** Czytelna etykieta, np. "Kamera 1 (LPR)" */
  label: string;
  /** Typ kamery */
  cameraType?: 'Ogólna' | 'LPR' | 'SKP';
}

export interface CameraPoint {
  id: number;
  /** Etykieta słupa: "PK-1" | "S-KP-1" */
  name: string;

  // ROLA 1: Dane słupa (infrastruktura)
  poleType: PoleType | null;
  /** Czy słup wymaga uziemienia — pochodzi z WarehouseStock.requiresGrounding */
  hasUziom: boolean;
  /** Numer katalogowy / nazwa produktu słupa ("catalogNumber | materialName") */
  poleProductInfo?: string | null;

  // ROLA 2: Lokacja urządzeń (przypisanie)
  /** Urządzenia zamontowane na tym słupie */
  assignedDevices: AssignedDevice[];
}
