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
}

export interface SubsystemConfig {
  label: string;
  icon: string;
  fields: WizardField[];
}

export const SUBSYSTEM_WIZARD_CONFIG: Record<SubsystemType | 'DEFAULT', SubsystemConfig> = {
  'SMOKIP_A': {
    label: '🔵 SMOK-A',
    icon: '🔵',
    fields: [
      { name: 'przejazdyKatA', label: '1.1 Ilość przejazdów Kat A', type: 'number' },
      { name: 'iloscSKP', label: '1.2 Ilość SKP', type: 'number' },
      { name: 'iloscNastawni', label: '1.3 Ilość Nastawni', type: 'number' },
      { name: 'hasLCS', label: '1.4 LCS', type: 'checkbox' },
      { name: 'lcsMonitory', label: 'Ilość monitorów LCS', type: 'number', dependsOn: 'hasLCS' },
      { name: 'lcsStanowiska', label: 'Ilość stanowisk LCS', type: 'number', dependsOn: 'hasLCS' },
      { name: 'hasCUID', label: '1.5 CUID (obecny/nieobecny)', type: 'checkbox' }
    ]
  },
  'SMOKIP_B': {
    label: '🟢 SMOK-B',
    icon: '🟢',
    fields: [
      { name: 'przejazdyKatB', label: '1.1 Ilość przejazdów Kat B', type: 'number' },
      { name: 'iloscNastawni', label: '1.3 Ilość Nastawni', type: 'number' },
      { name: 'hasLCS', label: '1.4 LCS', type: 'checkbox' },
      { name: 'lcsMonitory', label: 'Ilość monitorów LCS', type: 'number', dependsOn: 'hasLCS' },
      { name: 'lcsStanowiska', label: 'Ilość stanowisk LCS', type: 'number', dependsOn: 'hasLCS' },
      { name: 'hasCUID', label: '1.5 CUID (obecny/nieobecny)', type: 'checkbox' }
    ]
  },
  'SKD': {
    label: '🔐 SKD',
    icon: '🔐',
    fields: [
      { name: 'iloscBudynkow', label: '2.1 Ilość budynków', type: 'number' },
      { name: 'iloscKontenerow', label: '2.2 Ilość kontenerów', type: 'number' },
      { name: 'iloscPrzejsc', label: '2.3 Ilość przejść', type: 'number' }
    ]
  },
  'SSWIN': {
    label: '🚨 SSWiN',
    icon: '🚨',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  },
  'CCTV': {
    label: '📹 CCTV',
    icon: '📹',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  },
  'SMW': {
    label: '📺 SMW',
    icon: '📺',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  },
  'SDIP': {
    label: '📢 SDIP',
    icon: '📢',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  },
  'SUG': {
    label: '🔥 SUG',
    icon: '🔥',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  },
  'SSP': {
    label: '🚒 SSP',
    icon: '🚒',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  },
  'LAN': {
    label: '🌐 LAN',
    icon: '🌐',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  },
  'OTK': {
    label: '📡 OTK',
    icon: '📡',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  },
  'ZASILANIE': {
    label: '⚡ Zasilanie',
    icon: '⚡',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  },
  'DEFAULT': {
    label: 'Standardowy',
    icon: '📋',
    fields: [
      { name: 'iloscBudynkow', label: '3.1 Ilość budynków', type: 'number' },
      { name: 'iloscPomieszczen', label: '3.2 Ilość pomieszczeń', type: 'number' },
      { name: 'iloscKontenerow', label: '3.3 Ilość kontenerów', type: 'number' }
    ]
  }
};

// Detect subsystem type from contract name
export const detectSubsystemType = (name: string): SubsystemType | null => {
  const upperName = name.toUpperCase();
  
  if (upperName.includes('SMOK-A') || upperName.includes('SMOKIP-A') || upperName.includes('CMOKIP-A')) {
    return 'SMOKIP_A';
  }
  if (upperName.includes('SMOK-B') || upperName.includes('SMOKIP-B') || upperName.includes('CMOKIP-B')) {
    return 'SMOKIP_B';
  }
  if (upperName.includes('SKD') || upperName.includes('KONTROLI DOSTĘPU')) {
    return 'SKD';
  }
  if (upperName.includes('SSWIN') || upperName.includes('WŁAMANIA')) {
    return 'SSWIN';
  }
  if (upperName.includes('CCTV') || upperName.includes('TELEWIZJI PRZEMYSŁOWEJ')) {
    return 'CCTV';
  }
  if (upperName.includes('SMW') || upperName.includes('MONITORINGU WIZYJNEGO')) {
    return 'SMW';
  }
  if (upperName.includes('SDIP') || upperName.includes('CSDIP') || upperName.includes('INFORMACJI PASAŻERSKIEJ')) {
    return 'SDIP';
  }
  if (upperName.includes('SUG') || upperName.includes('GAŚNIC')) {
    return 'SUG';
  }
  if (upperName.includes('SSP') || upperName.includes('POŻAR')) {
    return 'SSP';
  }
  if (upperName.includes('LAN') || upperName.includes('OKABLOWANIE')) {
    return 'LAN';
  }
  if (upperName.includes('OTK')) {
    return 'OTK';
  }
  if (upperName.includes('ZASILANIE') || upperName.includes('ZAS')) {
    return 'ZASILANIE';
  }
  
  return null;
};
