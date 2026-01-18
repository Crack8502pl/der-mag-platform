// src/components/contracts/wizard/utils/taskGenerator.ts
// Task generation logic for contract wizard

import { SUBSYSTEM_WIZARD_CONFIG, type SmwWizardData } from '../../../../config/subsystemWizardConfig';
import type { SubsystemWizardData, GeneratedTask } from '../types/wizard.types';

/**
 * Helper to get numeric value from params
 */
const getNumericValue = (params: Record<string, number | boolean>, key: string): number => {
  const value = params[key];
  return typeof value === 'number' ? value : 0;
};

/**
 * Helper to get boolean value from params
 */
const getBooleanValue = (params: Record<string, number | boolean>, key: string): boolean => {
  const value = params[key];
  return typeof value === 'boolean' ? value : false;
};

/**
 * Generate tasks for SMOKIP_A subsystem
 */
const generateSmokipATasks = (subsystem: SubsystemWizardData): GeneratedTask[] => {
  const tasks: GeneratedTask[] = [];
  
  // Use task details if available
  if (subsystem.taskDetails && subsystem.taskDetails.length > 0) {
    subsystem.taskDetails.forEach((detail) => {
      let name = '';
      if (detail.taskType === 'PRZEJAZD_KAT_A' && detail.kilometraz && detail.kategoria) {
        name = `${detail.kilometraz} Km ${detail.kategoria}`;
      } else if (detail.taskType === 'SKP' && detail.kilometraz) {
        name = `${detail.kilometraz} Km SKP`;
      } else if (detail.taskType === 'NASTAWNIA') {
        name = detail.nazwa || 'Nastawnia';
        if (detail.miejscowosc) name = `Nastawnia ${detail.miejscowosc}`;
        if (detail.kilometraz) name += ` ${detail.kilometraz} Km`;
      } else if (detail.taskType === 'LCS') {
        name = detail.nazwa || 'LCS';
        if (detail.miejscowosc) name = `LCS ${detail.miejscowosc}`;
        if (detail.kilometraz) name += ` ${detail.kilometraz} Km`;
      } else if (detail.taskType === 'CUID') {
        name = detail.nazwa || 'CUID';
        if (detail.miejscowosc) name = `CUID ${detail.miejscowosc}`;
      } else {
        name = detail.taskType;
      }
      
      tasks.push({
        number: '',
        name,
        type: detail.taskType,
        subsystemType: subsystem.type
      });
    });
  } else {
    // Generic task generation from params
    const params = subsystem.params as Record<string, number | boolean>;
    
    for (let i = 0; i < getNumericValue(params, 'przejazdyKatA'); i++) {
      tasks.push({
        number: '',
        name: `Przejazd Kat A #${i + 1}`,
        type: 'PRZEJAZD_KAT_A',
        subsystemType: subsystem.type
      });
    }
    for (let i = 0; i < getNumericValue(params, 'iloscSKP'); i++) {
      tasks.push({
        number: '',
        name: `SKP #${i + 1}`,
        type: 'SKP',
        subsystemType: subsystem.type
      });
    }
    for (let i = 0; i < getNumericValue(params, 'iloscNastawni'); i++) {
      tasks.push({
        number: '',
        name: `Nastawnia #${i + 1}`,
        type: 'NASTAWNIA',
        subsystemType: subsystem.type
      });
    }
    if (getBooleanValue(params, 'hasLCS')) {
      tasks.push({
        number: '',
        name: `LCS (${getNumericValue(params, 'lcsMonitory')} monitorów, ${getNumericValue(params, 'lcsStanowiska')} stanowisk)`,
        type: 'LCS',
        subsystemType: subsystem.type
      });
    }
    if (getBooleanValue(params, 'hasCUID')) {
      tasks.push({
        number: '',
        name: 'CUID',
        type: 'CUID',
        subsystemType: subsystem.type
      });
    }
  }
  
  return tasks;
};

/**
 * Generate tasks for SMOKIP_B subsystem
 */
const generateSmokipBTasks = (subsystem: SubsystemWizardData): GeneratedTask[] => {
  const tasks: GeneratedTask[] = [];
  
  if (subsystem.taskDetails && subsystem.taskDetails.length > 0) {
    subsystem.taskDetails.forEach((detail) => {
      let name = '';
      if (detail.taskType === 'PRZEJAZD_KAT_B' && detail.kilometraz && detail.kategoria) {
        name = `${detail.kilometraz} Km ${detail.kategoria}`;
      } else if (detail.taskType === 'NASTAWNIA') {
        name = detail.nazwa || 'Nastawnia';
        if (detail.miejscowosc) name = `Nastawnia ${detail.miejscowosc}`;
        if (detail.kilometraz) name += ` ${detail.kilometraz} Km`;
      } else if (detail.taskType === 'LCS') {
        name = detail.nazwa || 'LCS';
        if (detail.miejscowosc) name = `LCS ${detail.miejscowosc}`;
        if (detail.kilometraz) name += ` ${detail.kilometraz} Km`;
      } else if (detail.taskType === 'CUID') {
        name = detail.nazwa || 'CUID';
        if (detail.miejscowosc) name = `CUID ${detail.miejscowosc}`;
      } else {
        name = detail.taskType;
      }
      
      tasks.push({
        number: '',
        name,
        type: detail.taskType,
        subsystemType: subsystem.type
      });
    });
  } else {
    const params = subsystem.params as Record<string, number | boolean>;
    
    for (let i = 0; i < getNumericValue(params, 'przejazdyKatB'); i++) {
      tasks.push({
        number: '',
        name: `Przejazd Kat B #${i + 1}`,
        type: 'PRZEJAZD_KAT_B',
        subsystemType: subsystem.type
      });
    }
    for (let i = 0; i < getNumericValue(params, 'iloscNastawni'); i++) {
      tasks.push({
        number: '',
        name: `Nastawnia #${i + 1}`,
        type: 'NASTAWNIA',
        subsystemType: subsystem.type
      });
    }
    if (getBooleanValue(params, 'hasLCS')) {
      tasks.push({
        number: '',
        name: `LCS (${getNumericValue(params, 'lcsMonitory')} monitorów, ${getNumericValue(params, 'lcsStanowiska')} stanowisk)`,
        type: 'LCS',
        subsystemType: subsystem.type
      });
    }
    if (getBooleanValue(params, 'hasCUID')) {
      tasks.push({
        number: '',
        name: 'CUID',
        type: 'CUID',
        subsystemType: subsystem.type
      });
    }
  }
  
  return tasks;
};

/**
 * Generate tasks for SMW subsystem
 */
const generateSmwTasks = (subsystem: SubsystemWizardData): GeneratedTask[] => {
  const tasks: GeneratedTask[] = [];
  const smwData = (subsystem.smwData || subsystem.params) as SmwWizardData;
  
  // Tasks for each platform of each station
  if (smwData.stations && Array.isArray(smwData.stations)) {
    smwData.stations.forEach((station, stationIdx: number) => {
      if (station.platformCabinets && Array.isArray(station.platformCabinets)) {
        station.platformCabinets.forEach((platform) => {
          const cabinetInfo = platform.cabinets && platform.cabinets.length > 0
            ? ` (${platform.cabinets.length} szaf)`
            : '';
          tasks.push({
            number: '',
            name: `${station.name || `Stacja ${stationIdx + 1}`} - Peron ${platform.platformNumber}${cabinetInfo}`,
            type: 'SMW_PLATFORM',
            subsystemType: subsystem.type
          });
        });
      }
    });
  }
  
  // Task for SOK if enabled
  if (smwData.sokEnabled && smwData.sokConfig) {
    const sokCabinets = smwData.sokConfig.cabinets || [];
    const cabinetInfo = sokCabinets.length > 0 ? ` (${sokCabinets.length} szaf)` : '';
    tasks.push({
      number: '',
      name: `SOK${smwData.sokConfig.nameAddress ? ` - ${smwData.sokConfig.nameAddress}` : ''}${cabinetInfo}`,
      type: 'SMW_SOK',
      subsystemType: subsystem.type
    });
  }
  
  // Task for Extra Viewing Station if enabled
  if (smwData.extraViewingEnabled && smwData.extraViewingConfig) {
    const extraCabinets = smwData.extraViewingConfig.cabinets || [];
    const cabinetInfo = extraCabinets.length > 0 ? ` (${extraCabinets.length} szaf)` : '';
    tasks.push({
      number: '',
      name: `Stanowisko Oglądowe${smwData.extraViewingConfig.nameAddress ? ` - ${smwData.extraViewingConfig.nameAddress}` : ''}${cabinetInfo}`,
      type: 'SMW_EXTRA_VIEWING',
      subsystemType: subsystem.type
    });
  }
  
  // Task for LCS
  if (smwData.lcsConfig) {
    const lcsCabinets = smwData.lcsConfig.cabinets || [];
    const cabinetInfo = lcsCabinets.length > 0 ? ` (${lcsCabinets.length} szaf)` : '';
    tasks.push({
      number: '',
      name: `LCS${cabinetInfo}`,
      type: 'SMW_LCS',
      subsystemType: subsystem.type
    });
  }
  
  // Fallback: If no smwData, generate generic tasks based on simple params
  if (tasks.length === 0 && 'iloscKontenerow' in smwData) {
    for (let i = 0; i < (smwData.iloscKontenerow || 0); i++) {
      tasks.push({
        number: '',
        name: `SMW - Kontener #${i + 1}`,
        type: 'KONTENER',
        subsystemType: subsystem.type
      });
    }
  }
  
  return tasks;
};

/**
 * Generate tasks for SKD subsystem
 */
const generateSkdTasks = (subsystem: SubsystemWizardData): GeneratedTask[] => {
  const tasks: GeneratedTask[] = [];
  const params = subsystem.params as Record<string, number | boolean>;
  
  for (let i = 0; i < getNumericValue(params, 'iloscBudynkow'); i++) {
    tasks.push({
      number: '',
      name: `Budynek SKD #${i + 1}`,
      type: 'BUDYNEK',
      subsystemType: subsystem.type
    });
  }
  for (let i = 0; i < getNumericValue(params, 'iloscKontenerow'); i++) {
    tasks.push({
      number: '',
      name: `Kontener SKD #${i + 1}`,
      type: 'KONTENER',
      subsystemType: subsystem.type
    });
  }
  for (let i = 0; i < getNumericValue(params, 'iloscPrzejsc'); i++) {
    tasks.push({
      number: '',
      name: `Przejście #${i + 1}`,
      type: 'PRZEJSCIE',
      subsystemType: subsystem.type
    });
  }
  
  return tasks;
};

/**
 * Generate tasks for generic subsystems (SSWiN, CCTV, SDIP, SUG, SSP, LAN, OTK, ZASILANIE)
 */
const generateGenericTasks = (subsystem: SubsystemWizardData): GeneratedTask[] => {
  const tasks: GeneratedTask[] = [];
  const params = subsystem.params as Record<string, number | boolean>;
  const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
  const subsystemLabel = config?.label || 'Zadanie';
  
  for (let i = 0; i < getNumericValue(params, 'iloscBudynkow'); i++) {
    tasks.push({
      number: '',
      name: `${subsystemLabel} - Budynek #${i + 1}`,
      type: 'BUDYNEK',
      subsystemType: subsystem.type
    });
  }
  for (let i = 0; i < getNumericValue(params, 'iloscPomieszczen'); i++) {
    tasks.push({
      number: '',
      name: `${subsystemLabel} - Pomieszczenie #${i + 1}`,
      type: 'POMIESZCZENIE',
      subsystemType: subsystem.type
    });
  }
  for (let i = 0; i < getNumericValue(params, 'iloscKontenerow'); i++) {
    tasks.push({
      number: '',
      name: `${subsystemLabel} - Kontener #${i + 1}`,
      type: 'KONTENER',
      subsystemType: subsystem.type
    });
  }
  
  return tasks;
};

/**
 * Generate tasks for a single subsystem
 */
export const generateTasksForSubsystem = (subsystem: SubsystemWizardData): GeneratedTask[] => {
  switch (subsystem.type) {
    case 'SMOKIP_A':
      return generateSmokipATasks(subsystem);
    case 'SMOKIP_B':
      return generateSmokipBTasks(subsystem);
    case 'SMW':
      return generateSmwTasks(subsystem);
    case 'SKD':
      return generateSkdTasks(subsystem);
    default:
      return generateGenericTasks(subsystem);
  }
};

/**
 * Generate all tasks from all subsystems
 */
export const generateAllTasks = (subsystems: SubsystemWizardData[]): GeneratedTask[] => {
  const allTasks: GeneratedTask[] = [];
  
  subsystems.forEach((subsystem) => {
    const tasks = generateTasksForSubsystem(subsystem);
    allTasks.push(...tasks);
  });
  
  return allTasks;
};
