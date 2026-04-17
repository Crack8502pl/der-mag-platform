/**
 * ═══════════════════════════════════════════════════════════════════
 *  TYPY ZADAŃ - SŁOWNIK SKRÓTÓW
 * ═══════════════════════════════════════════════════════════════════
 * 
 * SMOKIP - System Monitorowania Obiektów Kolejowych IP
 * SKP - Stwierdzenie Końca Pociągu
 * LCS - Local Control Station
 * CUID - Centrum Utrzymania i Diagnostyki
 * ND - Nastawnia Dyspozytorska
 * SMW - System Monitoringu Wizyjnego
 * SKD - System Kontroli Dostępu
 * CSDIP - Cyfrowe Systemy Dźwiękowego Informowania Pasażerów
 * SSWiN - System Sygnalizacji Włamania i Napadu
 * SSP - System Sygnalizacji Pożaru
 * SUG - Stałe Urządzenie Gaśnicze
 * LAN PKP PLK - Sieci LAN PKP PLK
 * OTK - Optical Technical Kabel (pl: Światłowodowy kabel techniczny)
 * ZASILANIE - Zasilanie UPS/agregaty
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════
//  PRZEJAZDY SMOKIP-A (System Monitorowania Obiektów Kolejowych IP - Wariant A)
// ═══════════════════════════════════════════════════════════════════
export const PRZEJAZD_SMOKIP_A_TYPES = [
  'SMOKIP_A',        // System Monitorowania Obiektów Kolejowych IP - Wariant A
  'PRZEJAZD_KAT_A',  // Przejazd kolejowo-drogowy Kategorii A
  'SKP'              // Stwierdzenie Końca Pociągu
] as const;

// ═══════════════════════════════════════════════════════════════════
//  PRZEJAZDY SMOKIP-B (System Monitorowania Obiektów Kolejowych IP - Wariant B)
// ═══════════════════════════════════════════════════════════════════
export const PRZEJAZD_SMOKIP_B_TYPES = [
  'SMOKIP_B',        // System Monitorowania Obiektów Kolejowych IP - Wariant B
  'PRZEJAZD_KAT_B'   // Przejazd kolejowo-drogowy Kategorii B/C/E/F
] as const;

// ═══════════════════════════════════════════════════════════════════
//  STACJE I NASTAWNIE
// ═══════════════════════════════════════════════════════════════════
export const STATION_TYPES = [
  'LCS',        // Local Control Station (Lokalna Stacja Kontroli)
  'NASTAWNIA',  // Nastawnia kolejowa
  'ND'          // Nastawnia Dyspozytorska
] as const;

// ═══════════════════════════════════════════════════════════════════
//  TYPY ZADAŃ WYMAGAJĄCE AUTOMATYCZNEGO ZADANIA KOMPLETACJA_SZAF
// ═══════════════════════════════════════════════════════════════════
export const CABINET_COMPLETION_TYPES = [
  ...PRZEJAZD_SMOKIP_A_TYPES,  // SMOKIP_A, PRZEJAZD_KAT_A, SKP
  ...PRZEJAZD_SMOKIP_B_TYPES,  // SMOKIP_B, PRZEJAZD_KAT_B
  ...STATION_TYPES             // LCS, NASTAWNIA, ND
] as const;

export type CabinetCompletionType = typeof CABINET_COMPLETION_TYPES[number];

/**
 * Sprawdza czy zadanie wymaga automatycznego utworzenia zadania KOMPLETACJA_SZAF
 * 
 * Zadania wymagające kompletacji szafy:
 * - SMOKIP_A - System Monitorowania Obiektów Kolejowych IP - Wariant A
 * - PRZEJAZD_KAT_A - Przejazd kolejowo-drogowy Kategorii A
 * - SKP - Stwierdzenie Końca Pociągu
 * - SMOKIP_B - System Monitorowania Obiektów Kolejowych IP - Wariant B
 * - PRZEJAZD_KAT_B - Przejazd kolejowo-drogowy Kategorii B/C/E/F
 * - LCS - Local Control Station
 * - NASTAWNIA - Nastawnia kolejowa
 * - ND - Nastawnia Dyspozytorska
 */
export const requiresCabinetCompletion = (taskType: string): boolean => {
  return CABINET_COMPLETION_TYPES.includes(taskType as CabinetCompletionType);
};

export const isSmokipATask = (taskType: string): boolean => {
  return PRZEJAZD_SMOKIP_A_TYPES.includes(taskType as any);
};

export const isSmokipBTask = (taskType: string): boolean => {
  return PRZEJAZD_SMOKIP_B_TYPES.includes(taskType as any);
};

export const isStationTask = (taskType: string): boolean => {
  return STATION_TYPES.includes(taskType as any);
};

// ═══════════════════════════════════════════════════════════════════
//  INNE PODSYSTEMY (bez automatycznej kompletacji szafy)
// ═══════════════════════════════════════════════════════════════════
export const OTHER_SUBSYSTEM_TYPES = [
  'SMW',       // System Monitoringu Wizyjnego
  'SKD',       // System Kontroli Dostępu
  'CSDIP',     // Cyfrowe Systemy Dźwiękowego Informowania Pasażerów
  'SSWiN',     // System Sygnalizacji Włamania i Napadu
  'SSP',       // System Sygnalizacji Pożaru
  'SUG',       // Stałe Urządzenie Gaśnicze
  'LAN',       // Sieci LAN PKP PLK
  'OTK',       // Optical Technical Kabel (Światłowodowy kabel techniczny)
  'ZASILANIE', // Zasilanie UPS/agregaty
  'CUID'       // Centrum Utrzymania i Diagnostyki
] as const;
