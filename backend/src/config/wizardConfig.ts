// src/config/wizardConfig.ts
// Konfiguracja kreatora zadań dla podsystemów

import { SystemType } from '../entities/Subsystem';
import { DeviceCategory } from '../entities/DeviceIPAssignment';

/**
 * Parametr kreatora dla podsystemu
 */
export interface WizardParameter {
  name: string;
  label: string;
  type: 'number' | 'text' | 'boolean';
  required: boolean;
  defaultValue?: any;
  min?: number;
  max?: number;
  description?: string;
}

/**
 * Grupa parametrów kreatora
 */
export interface WizardParameterGroup {
  systemTypes: SystemType[];
  parameters: WizardParameter[];
}

/**
 * Wzorzec wykrywania urządzenia sieciowego
 */
export interface DeviceDetectionPattern {
  pattern: RegExp;
  deviceCategory: DeviceCategory;
  description: string;
}

/**
 * Grupy parametrów dla różnych typów systemów
 */
export const WIZARD_PARAMETER_GROUPS: WizardParameterGroup[] = [
  // Grupa 1.x - SMOKIP/CMOKIP
  {
    systemTypes: [SystemType.SMOKIP_A, SystemType.SMOKIP_B],
    parameters: [
      {
        name: 'iloscPrzejazdowKatA',
        label: 'Ilość przejazdów Kat A',
        type: 'number',
        required: true,
        min: 0,
        defaultValue: 0,
        description: 'Liczba przejazdów kolejowych kategorii A'
      },
      {
        name: 'iloscSKP',
        label: 'Ilość SKP',
        type: 'number',
        required: true,
        min: 0,
        defaultValue: 0,
        description: 'Liczba skrzyżowań kolejowo-drogowych z pełną sygnalizacją'
      },
      {
        name: 'iloscNastawni',
        label: 'Ilość Nastawni',
        type: 'number',
        required: true,
        min: 0,
        defaultValue: 0,
        description: 'Liczba nastawni kolejowych'
      },
      {
        name: 'lcs',
        label: 'LCS',
        type: 'text',
        required: false,
        description: 'Local Control Station'
      },
      {
        name: 'cuid',
        label: 'CUID',
        type: 'text',
        required: false,
        description: 'Central Unit Identifier'
      }
    ]
  },
  // Grupa 2.x - SKD
  {
    systemTypes: [SystemType.SKD],
    parameters: [
      {
        name: 'iloscbudynkow',
        label: 'Ilość budynków',
        type: 'number',
        required: true,
        min: 0,
        defaultValue: 0,
        description: 'Liczba budynków do zabezpieczenia'
      },
      {
        name: 'iloscKontenerow',
        label: 'Ilość kontenerów',
        type: 'number',
        required: true,
        min: 0,
        defaultValue: 0,
        description: 'Liczba kontenerów technicznych'
      },
      {
        name: 'iloscPrzejsc',
        label: 'Ilość przejść',
        type: 'number',
        required: true,
        min: 0,
        defaultValue: 0,
        description: 'Liczba przejść kontrolowanych'
      }
    ]
  },
  // Grupa 3.x - SSWiN
  {
    systemTypes: [SystemType.SSWIN],
    parameters: [
      {
        name: 'iloscBudynkow',
        label: 'Ilość budynków',
        type: 'number',
        required: true,
        min: 0,
        defaultValue: 0,
        description: 'Liczba budynków do monitorowania'
      },
      {
        name: 'iloscPomieszczen',
        label: 'Ilość pomieszczeń',
        type: 'number',
        required: true,
        min: 0,
        defaultValue: 0,
        description: 'Liczba pomieszczeń z czujnikami'
      },
      {
        name: 'iloscKontenerow',
        label: 'Ilość kontenerów',
        type: 'number',
        required: true,
        min: 0,
        defaultValue: 0,
        description: 'Liczba kontenerów technicznych'
      }
    ]
  }
];

/**
 * Wzorce wykrywania urządzeń sieciowych z nazwy
 * (case-insensitive matching)
 */
export const DEVICE_DETECTION_PATTERNS: DeviceDetectionPattern[] = [
  {
    pattern: /kamera/i,
    deviceCategory: DeviceCategory.CAMERA,
    description: 'Kamera IP'
  },
  {
    pattern: /switch/i,
    deviceCategory: DeviceCategory.SWITCH,
    description: 'Switch sieciowy'
  },
  {
    pattern: /router/i,
    deviceCategory: DeviceCategory.ROUTER,
    description: 'Router'
  },
  {
    pattern: /rejestrator|nvr/i,
    deviceCategory: DeviceCategory.NVR,
    description: 'Rejestrator NVR'
  },
  {
    pattern: /serwer|komputer|mini\s*pc|pc/i,
    deviceCategory: DeviceCategory.SERVER,
    description: 'Serwer lub komputer'
  },
  {
    pattern: /telefon\s*ip/i,
    deviceCategory: DeviceCategory.OTHER,
    description: 'Telefon IP'
  },
  {
    pattern: /centrala/i,
    deviceCategory: DeviceCategory.OTHER,
    description: 'Centrala telefoniczna (PBX)'
  },
  {
    pattern: /ups/i,
    deviceCategory: DeviceCategory.OTHER,
    description: 'UPS (bez IP)'
  },
  {
    pattern: /moduł\s*(pet|io)|i\/o\s*module/i,
    deviceCategory: DeviceCategory.IOT,
    description: 'Moduł I/O'
  },
  {
    pattern: /głośnik\s*ip|kolumna\s*ip|speaker/i,
    deviceCategory: DeviceCategory.OTHER,
    description: 'Głośnik IP'
  },
  {
    pattern: /access\s*point|ap\s/i,
    deviceCategory: DeviceCategory.ACCESS_POINT,
    description: 'Access Point'
  }
];

/**
 * Pobiera parametry kreatora dla danego typu systemu
 */
export function getWizardParametersForSystemType(systemType: SystemType): WizardParameter[] {
  const group = WIZARD_PARAMETER_GROUPS.find(g => 
    g.systemTypes.includes(systemType)
  );
  
  return group?.parameters || [];
}

/**
 * Wykrywa typ urządzenia sieciowego na podstawie nazwy
 */
export function detectDeviceCategoryFromName(name: string): DeviceCategory | null {
  for (const pattern of DEVICE_DETECTION_PATTERNS) {
    if (pattern.pattern.test(name)) {
      return pattern.deviceCategory;
    }
  }
  
  return null;
}

/**
 * Sprawdza czy urządzenie jest typu sieciowego (wymaga IP)
 */
export function isNetworkDevice(deviceCategory: DeviceCategory | null): boolean {
  if (!deviceCategory) return false;
  
  // UPS zazwyczaj nie wymaga IP (chyba że jest z kartą sieciową)
  const networkCategories = [
    DeviceCategory.CAMERA,
    DeviceCategory.SWITCH,
    DeviceCategory.ROUTER,
    DeviceCategory.NVR,
    DeviceCategory.SERVER,
    DeviceCategory.ACCESS_POINT,
    DeviceCategory.IOT
  ];
  
  return networkCategories.includes(deviceCategory);
}
