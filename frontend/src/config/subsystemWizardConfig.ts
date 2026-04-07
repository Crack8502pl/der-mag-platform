// src/config/subsystemWizardConfig.ts
// Configuration for subsystem wizard fields

export type SubsystemType = 
  | 'SMOKIP_A' 
  | 'SMOKIP_B' 
  | 'SKD' 
  | 'SSWIN' 
  | 'CCTV' 
  | 'SMW' 
  | 'SDIP' 
  | 'SUG' 
  | 'SSP' 
  | 'LAN' 
  | 'OTK' 
  | 'ZASILANIE';

export interface WizardField {
  name: string;
  label: string;
  type: 'number' | 'text' | 'checkbox';
  dependsOn?: string;
  optional?: boolean;
}

export interface SubsystemConfig {
  label: string;  // Contains emoji icon, e.g. "🔵 SMOK-A"
  fields: WizardField[];
  isMultiStep?: boolean;  // NEW - indicates this subsystem uses custom multi-step wizard
}

// SMW specific types for multi-step wizard
export interface SmwCabinet {
  type: 'S1' | 'S2' | 'S3' | 'S4';
  name: string;
}

export interface SmwStation {
  name: string;
  platforms: number;
  elevators: number;
  tunnels: number;
  platformCabinets: Array<{
    platformNumber: number;
    cabinets: SmwCabinet[];
  }>;
}

export interface SmwSokConfig {
  enabled: boolean;
  nameAddress: string;
  cabinets: SmwCabinet[];
}

export interface SmwExtraViewingStation {
  enabled: boolean;
  nameAddress: string;
  cabinets: SmwCabinet[];
}

export interface SmwLcsConfig {
  cabinets: SmwCabinet[];
}

export interface SmwWizardData {
  // Step 1 - Basic
  iloscStacji: number;  // Number of stations
  iloscKontenerow: number;  // Number of containers
  sokEnabled: boolean;
  extraViewingEnabled: boolean;
  
  // Step 2+ - Dynamic based on counts
  stations: SmwStation[];
  sokConfig?: {
    nameAddress: string;
    cabinets: SmwCabinet[];
  };
  extraViewingConfig?: {
    nameAddress: string;
    cabinets: SmwCabinet[];
  };
  lcsConfig: {
    cabinets: SmwCabinet[];
  };
}

export const SUBSYSTEM_WIZARD_CONFIG: Record<SubsystemType, SubsystemConfig> = {
  'SMOKIP_A': {
    label: '🔵 SMOK-A',
    fields: [
      { name: 'przejazdyKatA', label: '1.1 Ilość przejazdów Kat A', type: 'number' },
      { name: 'iloscSKP', label: '1.2 Ilość SKP', type: 'number' },
      { name: 'iloscNastawni', label: '1.3 Ilość Nastawni', type: 'number' },
      { name: 'hasLCS', label: '1.4 LCS', type: 'number' },
      { name: 'gatewayIP', label: 'Brama Domyślna', type: 'text', optional: true },
      { name: 'subnetMask', label: 'Maska Podsieci', type: 'text', optional: true }
    ]
  },
  'SMOKIP_B': {
    label: '🟢 SMOK-B',
    fields: [
      { name: 'przejazdyKatB', label: '1.1 Ilość przejazdów Kat B', type: 'number' },
      { name: 'iloscNastawni', label: '1.3 Ilość Nastawni', type: 'number' },
      { name: 'hasLCS', label: '1.4 LCS', type: 'number' },
      { name: 'gatewayIP', label: 'Brama Domyślna', type: 'text', optional: true },
      { name: 'subnetMask', label: 'Maska Podsieci', type: 'text', optional: true }
    ]
  },
  'SKD': {
    label: '🔐 SKD',
    fields: [
      { name: 'iloscBudynkow', label: '2.1 Ilość budynków', type: 'number' },
      { name: 'iloscDrzwi', label: '2.2 Ilość drzwi', type: 'number' },
      { name: 'iloscCzytelnikow', label: '2.3 Ilość czytników', type: 'number' },
      { name: 'gatewayIP', label: 'Gateway IP', type: 'text' },
      { name: 'subnetMask', label: 'Subnet Mask', type: 'text' }
    ]
  },
  'SSWIN': {
    label: '🎤 SSWIN',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  },
  'CCTV': {
    label: '📹 CCTV',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  },
  'SMW': {
    label: '📺 📺 SMW',
    fields: [
      // All SMW configuration on a single page
      { name: 'iloscStacji', label: 'Ilość Stacji', type: 'number' },
      { name: 'iloscKontenerow', label: 'Ilość kontenerów', type: 'number' },
      { name: 'sokEnabled', label: 'SOK', type: 'checkbox' },
      { name: 'extraViewingEnabled', label: 'Dodatkowe stanowisko Oglądowe', type: 'checkbox' }
    ]
  },
  'SDIP': {
    label: '🌊 SDIP',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  },
  'SUG': {
    label: '🔊 SUG',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  },
  'SSP': {
    label: '📡 SSP',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  },
  'LAN': {
    label: '🌐 LAN',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  },
  'OTK': {
    label: '🚆 OTK',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  },
  'ZASILANIE': {
    label: '⚡ Zasilanie',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  }
};

// Detect subsystem types from contract name (returns array)
export const detectSubsystemTypes = (name: string): SubsystemType[] => {
  const upperName = name.toUpperCase();
  const detected: SubsystemType[] = [];
  
  // SPECIAL CASE: SMOK without letter → SMOK-A + SMOK-B
  // Must check this BEFORE checking for specific SMOK-A/SMOK-B
  const hasGenericSmok = (upperName.includes('SMOK') || upperName.includes('CMOK')) && 
                         !upperName.includes('SMOK-A') && 
                         !upperName.includes('SMOK-B') &&
                         !upperName.includes('SMOKIP-A') && 
                         !upperName.includes('SMOKIP-B') &&
                         !upperName.includes('CMOKIP-A') && 
                         !upperName.includes('CMOKIP-B');
  
  if (hasGenericSmok) {
    return ['SMOKIP_A', 'SMOKIP_B'];
  }
  
  // Detect individual systems
  if (
    upperName.includes('SMOK-A') || upperName.includes('SMOKIP-A') || upperName.includes('CMOKIP-A') ||
    upperName.includes('KAT A') || upperName.includes('SKP') || upperName.includes('TVU')
  ) {
    detected.push('SMOKIP_A');
  }
  if (
    upperName.includes('SMOK-B') || upperName.includes('SMOKIP-B') || upperName.includes('CMOKIP-B') ||
    upperName.includes('KAT B') || upperName.includes('TVP')
  ) {
    detected.push('SMOKIP_B');
  }
  if (upperName.includes('SKD') || upperName.includes('KONTROLI DOSTĘPU')) {
    detected.push('SKD');
  }
  if (upperName.includes('SSWIN') || upperName.includes('WŁAMANIA')) {
    detected.push('SSWIN');
  }
  if (upperName.includes('CCTV') || upperName.includes('TELEWIZJI PRZEMYSŁOWEJ')) {
    detected.push('CCTV');
  }
  if (upperName.includes('SMW') || upperName.includes('MONITORINGU WIZYJNEGO')) {
    detected.push('SMW');
  }
  if (upperName.includes('SDIP') || upperName.includes('CSDIP') || upperName.includes('INFORMACJI PASAŻERSKIEJ')) {
    detected.push('SDIP');
  }
  if (upperName.includes('SUG') || upperName.includes('GAŚNIC')) {
    detected.push('SUG');
  }
  if (upperName.includes('SSP') || upperName.includes('POŻAR')) {
    detected.push('SSP');
  }
  if (upperName.includes('LAN') || upperName.includes('OKABLOWANIE')) {
    detected.push('LAN');
  }
  if (upperName.includes('OTK')) {
    detected.push('OTK');
  }
  if (upperName.includes('ZASILANIE') || upperName.includes('ZAS')) {
    detected.push('ZASILANIE');
  }
  
  return detected;
};

// Legacy function for backwards compatibility (returns first detected or null)
export const detectSubsystemType = (name: string): SubsystemType | null => {
  const types = detectSubsystemTypes(name);
  return types.length > 0 ? types[0] : null;
};

// Detect railway line (LK followed by 1-3 digits) from contract name
export const detectRailwayLine = (name: string): string | null => {
  // Allow optional separator (dash or space) between LK and digits.
  // Use a non-digit boundary (?!\d) to prevent matching LK1234 as LK123.
  const match = name.match(/LK[-\s]?(\d{1,3})(?!\d)/i);
  if (match) {
    return `LK${match[1]}`;
  }
  return null;
};
