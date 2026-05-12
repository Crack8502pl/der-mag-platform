// src/types/camera-point.types.ts
// Typ punktu kamerowego (słupa) generowanego przy zleceniu wysyłki

export type PoleType = 'STALOWY' | 'KOMPOZYT' | 'INNY';

/**
 * Punkt kamerowy — reprezentuje jeden słup w zadaniu wysyłkowym.
 * Generowany przez backend (TaskController.generateCameraPoints) i zapisywany
 * w SubsystemTask.metadata.cameraPoints[].
 *
 * hasUziom pochodzi z WarehouseStock.requiresGrounding pozycji wybranej
 * w kreatorze wysyłki — nie jest hardcoded.
 */
export interface CameraPoint {
  /** Kolejny numer porządkowy (1-based) */
  id: number;
  /** Etykieta słupa: "PK-1" (przejazd) lub "S-KP-1" (SKP) */
  name: string;
  /** Materiał słupa */
  poleType: PoleType | null;
  /** Czy słup wymaga uziomowania — pochodzi z WarehouseStock.requiresGrounding */
  hasUziom: boolean;
}
