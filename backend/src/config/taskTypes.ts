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

// Typy zadań wymagające automatycznego zadania KOMPLETACJA_SZAF
export const CABINET_COMPLETION_TYPES = [
  // SMOKIP-A (System Monitorowania Obiektów Kolejowych IP - Wariant A)
  'SMOKIP_A',        // System główny SMOKIP-A
  'PRZEJAZD_KAT_A',  // Przejazd kolejowo-drogowy Kategorii A
  'SKP',             // Stwierdzenie Końca Pociągu

  // SMOKIP-B (System Monitorowania Obiektów Kolejowych IP - Wariant B)
  'SMOKIP_B',        // System główny SMOKIP-B
  'PRZEJAZD_KAT_B',  // Przejazd kolejowo-drogowy Kategorii B/C/E/F

  // Stacje i nastawnie
  'LCS',             // Local Control Station (Lokalna Stacja Kontroli)
  'NASTAWNIA',       // Nastawnia kolejowa
  'ND'               // Nastawnia Dyspozytorska
];

/**
 * Sprawdza czy zadanie wymaga automatycznego utworzenia zadania KOMPLETACJA_SZAF.
 * Obsługuje również warianty PRZEJAZD_KAT_C/E/F generowane przez resolveTaskVariant.
 */
export const requiresCabinetCompletion = (taskType: string): boolean => {
  return CABINET_COMPLETION_TYPES.includes(taskType) || taskType.startsWith('PRZEJAZD_KAT_');
};
