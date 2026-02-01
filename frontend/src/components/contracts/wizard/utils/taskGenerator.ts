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
const generateSmokipATasks = (subsystem: SubsystemWizardData, liniaKolejowa?: string): GeneratedTask[] => {
  const tasks: GeneratedTask[] = [];
  const lk = liniaKolejowa || '';
  
  // Use task details if available
  if (subsystem.taskDetails && subsystem.taskDetails.length > 0) {
    subsystem.taskDetails.forEach((detail) => {
      let name = '';
      if (detail.taskType === 'PRZEJAZD_KAT_A' && detail.kilometraz && detail.kategoria) {
        // Format: LK-221 | 123,456 | KAT A
        name = `${lk} | ${detail.kilometraz} | ${detail.kategoria}`;
      } else if (detail.taskType === 'SKP' && detail.kilometraz) {
        // Format: LK-221 | 123,456 | SKP
        name = `${lk} | ${detail.kilometraz} | SKP`;
      } else if (detail.taskType === 'NASTAWNIA') {
        // Format: LK-221 | 123,456 | ND - Nazwa - Miejscowość
        const ndPart = [];
        if (detail.nazwa) ndPart.push(detail.nazwa);
        if (detail.miejscowosc) ndPart.push(detail.miejscowosc);
        const ndLabel = ndPart.length > 0 ? `ND - ${ndPart.join(' - ')}` : 'ND';
        name = `${lk} | ${detail.kilometraz || ''} | ${ndLabel}`;
      } else if (detail.taskType === 'LCS') {
        // Format: E-20 | 045,678 | LCS - Nazwa - Miejscowość
        const lcsPart = [];
        if (detail.nazwa) lcsPart.push(detail.nazwa);
        if (detail.miejscowosc) lcsPart.push(detail.miejscowosc);
        const lcsLabel = lcsPart.length > 0 ? `LCS - ${lcsPart.join(' - ')}` : 'LCS';
        name = `${lk} | ${detail.kilometraz || ''} | ${lcsLabel}`;
      } else if (detail.taskType === 'CUID') {
        // Format: LK-221 | | CUID - Nazwa - Miejscowość
        const cuidPart = [];
        if (detail.nazwa) cuidPart.push(detail.nazwa);
        if (detail.miejscowosc) cuidPart.push(detail.miejscowosc);
        const cuidLabel = cuidPart.length > 0 ? `CUID - ${cuidPart.join(' - ')}` : 'CUID';
        name = `${lk} | | ${cuidLabel}`;
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
const generateSmokipBTasks = (subsystem: SubsystemWizardData, liniaKolejowa?: string): GeneratedTask[] => {
  const tasks: GeneratedTask[] = [];
  const lk = liniaKolejowa || '';
  
  if (subsystem.taskDetails && subsystem.taskDetails.length > 0) {
    subsystem.taskDetails.forEach((detail) => {
      let name = '';
      if (detail.taskType === 'PRZEJAZD_KAT_B' && detail.kilometraz && detail.kategoria) {
        // Format: LK-221 | 123,456 | KAT B
        name = `${lk} | ${detail.kilometraz} | ${detail.kategoria}`;
      } else if (detail.taskType === 'NASTAWNIA') {
        // Format: LK-221 | 123,456 | ND - Nazwa - Miejscowość
        const ndPart = [];
        if (detail.nazwa) ndPart.push(detail.nazwa);
        if (detail.miejscowosc) ndPart.push(detail.miejscowosc);
        const ndLabel = ndPart.length > 0 ? `ND - ${ndPart.join(' - ')}` : 'ND';
        name = `${lk} | ${detail.kilometraz || ''} | ${ndLabel}`;
      } else if (detail.taskType === 'LCS') {
        // Format: E-20 | 045,678 | LCS - Nazwa - Miejscowość
        const lcsPart = [];
        if (detail.nazwa) lcsPart.push(detail.nazwa);
        if (detail.miejscowosc) lcsPart.push(detail.miejscowosc);
        const lcsLabel = lcsPart.length > 0 ? `LCS - ${lcsPart.join(' - ')}` : 'LCS';
        name = `${lk} | ${detail.kilometraz || ''} | ${lcsLabel}`;
      } else if (detail.taskType === 'CUID') {
        // Format: LK-221 | | CUID - Nazwa - Miejscowość
        const cuidPart = [];
        if (detail.nazwa) cuidPart.push(detail.nazwa);
        if (detail.miejscowosc) cuidPart.push(detail.miejscowosc);
        const cuidLabel = cuidPart.length > 0 ? `CUID - ${cuidPart.join(' - ')}` : 'CUID';
        name = `${lk} | | ${cuidLabel}`;
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
const generateSmwTasks = (subsystem: SubsystemWizardData, liniaKolejowa?: string): GeneratedTask[] => {
  const tasks: GeneratedTask[] = [];
  const smwData = (subsystem.smwData || subsystem.params) as SmwWizardData;
  const lk = liniaKolejowa || '';
  
  console.log('🔍 Generating SMW tasks for:', smwData);
  
  if (!smwData) {
    console.warn('⚠️ No SMW data provided');
    return tasks;
  }
  
  // Tasks for each platform of each station
  if (smwData.stations && Array.isArray(smwData.stations) && smwData.stations.length > 0) {
    console.log(`🔍 Processing ${smwData.stations.length} stations`);
    smwData.stations.forEach((station, stationIdx: number) => {
      if (station.platformCabinets && Array.isArray(station.platformCabinets)) {
        station.platformCabinets.forEach((platform) => {
          const cabinetInfo = platform.cabinets && platform.cabinets.length > 0
            ? ` (${platform.cabinets.length} szaf)`
            : '';
          tasks.push({
            number: '',
            name: lk 
              ? `${lk} | ${station.name || `Stacja ${stationIdx + 1}`} - Peron ${platform.platformNumber}${cabinetInfo}`
              : `${station.name || `Stacja ${stationIdx + 1}`} - Peron ${platform.platformNumber}${cabinetInfo}`,
            type: 'SMW_PLATFORM',
            subsystemType: subsystem.type
          });
        });
      }
    });
  } else {
    console.warn('⚠️ No stations data or empty stations array');
  }
  
  // Task for SOK if enabled
  if (smwData.sokEnabled && smwData.sokConfig) {
    console.log('🔍 Adding SOK task');
    const sokCabinets = smwData.sokConfig.cabinets || [];
    const cabinetInfo = sokCabinets.length > 0 ? ` (${sokCabinets.length} szaf)` : '';
    tasks.push({
      number: '',
      name: lk 
        ? `${lk} | SOK${smwData.sokConfig.nameAddress ? ` - ${smwData.sokConfig.nameAddress}` : ''}${cabinetInfo}`
        : `SOK${smwData.sokConfig.nameAddress ? ` - ${smwData.sokConfig.nameAddress}` : ''}${cabinetInfo}`,
      type: 'SMW_SOK',
      subsystemType: subsystem.type
    });
  }
  
  // Task for Extra Viewing Station if enabled
  if (smwData.extraViewingEnabled && smwData.extraViewingConfig) {
    console.log('🔍 Adding Extra Viewing Station task');
    const extraCabinets = smwData.extraViewingConfig.cabinets || [];
    const cabinetInfo = extraCabinets.length > 0 ? ` (${extraCabinets.length} szaf)` : '';
    tasks.push({
      number: '',
      name: lk 
        ? `${lk} | Stanowisko Oglądowe${smwData.extraViewingConfig.nameAddress ? ` - ${smwData.extraViewingConfig.nameAddress}` : ''}${cabinetInfo}`
        : `Stanowisko Oglądowe${smwData.extraViewingConfig.nameAddress ? ` - ${smwData.extraViewingConfig.nameAddress}` : ''}${cabinetInfo}`,
      type: 'SMW_EXTRA_VIEWING',
      subsystemType: subsystem.type
    });
  }
  
  // Task for LCS
  if (smwData.lcsConfig) {
    console.log('🔍 Adding LCS task');
    const lcsCabinets = smwData.lcsConfig.cabinets || [];
    const cabinetInfo = lcsCabinets.length > 0 ? ` (${lcsCabinets.length} szaf)` : '';
    tasks.push({
      number: '',
      name: lk ? `${lk} | LCS${cabinetInfo}` : `LCS${cabinetInfo}`,
      type: 'SMW_LCS',
      subsystemType: subsystem.type
    });
  }
  
  // Fallback: If no smwData, generate generic tasks based on simple params
  if (tasks.length === 0 && 'iloscKontenerow' in smwData) {
    console.log('🔍 Using fallback: generating tasks from iloscKontenerow');
    for (let i = 0; i < (smwData.iloscKontenerow || 0); i++) {
      tasks.push({
        number: '',
        name: `SMW - Kontener #${i + 1}`,
        type: 'KONTENER',
        subsystemType: subsystem.type
      });
    }
  }
  
  console.log(`✅ Generated ${tasks.length} SMW tasks`);
  return tasks;
};

/**
 * Generate tasks for SKD subsystem
 */
const generateSkdTasks = (subsystem: SubsystemWizardData, liniaKolejowa?: string): GeneratedTask[] => {
  const tasks: GeneratedTask[] = [];
  const params = subsystem.params as Record<string, number | boolean>;
  const lk = liniaKolejowa || '';
  
  // SKD tasks with optional linia kolejowa prefix
  for (let i = 0; i < getNumericValue(params, 'iloscBudynkow'); i++) {
    tasks.push({
      number: '',
      name: lk ? `${lk} | Budynek SKD #${i + 1}` : `Budynek SKD #${i + 1}`,
      type: 'BUDYNEK',
      subsystemType: subsystem.type
    });
  }
  for (let i = 0; i < getNumericValue(params, 'iloscKontenerow'); i++) {
    tasks.push({
      number: '',
      name: lk ? `${lk} | Kontener SKD #${i + 1}` : `Kontener SKD #${i + 1}`,
      type: 'KONTENER',
      subsystemType: subsystem.type
    });
  }
  for (let i = 0; i < getNumericValue(params, 'iloscPrzejsc'); i++) {
    tasks.push({
      number: '',
      name: lk ? `${lk} | Przejście #${i + 1}` : `Przejście #${i + 1}`,
      type: 'PRZEJSCIE',
      subsystemType: subsystem.type
    });
  }
  
  return tasks;
};

/**
 * Generate tasks for generic subsystems (SSWiN, CCTV, SDIP, SUG, SSP, LAN, OTK, ZASILANIE)
 */
const generateGenericTasks = (subsystem: SubsystemWizardData, liniaKolejowa?: string): GeneratedTask[] => {
  const tasks: GeneratedTask[] = [];
  const params = subsystem.params as Record<string, number | boolean>;
  const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
  const subsystemLabel = config?.label || 'Zadanie';
  const lk = liniaKolejowa || '';
  
  // Generic tasks with optional linia kolejowa prefix
  for (let i = 0; i < getNumericValue(params, 'iloscBudynkow'); i++) {
    tasks.push({
      number: '',
      name: lk ? `${lk} | ${subsystemLabel} - Budynek #${i + 1}` : `${subsystemLabel} - Budynek #${i + 1}`,
      type: 'BUDYNEK',
      subsystemType: subsystem.type
    });
  }
  for (let i = 0; i < getNumericValue(params, 'iloscPomieszczen'); i++) {
    tasks.push({
      number: '',
      name: lk ? `${lk} | ${subsystemLabel} - Pomieszczenie #${i + 1}` : `${subsystemLabel} - Pomieszczenie #${i + 1}`,
      type: 'POMIESZCZENIE',
      subsystemType: subsystem.type
    });
  }
  for (let i = 0; i < getNumericValue(params, 'iloscKontenerow'); i++) {
    tasks.push({
      number: '',
      name: lk ? `${lk} | ${subsystemLabel} - Kontener #${i + 1}` : `${subsystemLabel} - Kontener #${i + 1}`,
      type: 'KONTENER',
      subsystemType: subsystem.type
    });
  }
  
  return tasks;
};

/**
 * Generate tasks for a single subsystem
 */
export const generateTasksForSubsystem = (subsystem: SubsystemWizardData, liniaKolejowa?: string): GeneratedTask[] => {
  switch (subsystem.type) {
    case 'SMOKIP_A':
      return generateSmokipATasks(subsystem, liniaKolejowa);
    case 'SMOKIP_B':
      return generateSmokipBTasks(subsystem, liniaKolejowa);
    case 'SMW':
      return generateSmwTasks(subsystem, liniaKolejowa);
    case 'SKD':
      return generateSkdTasks(subsystem, liniaKolejowa);
    default:
      return generateGenericTasks(subsystem, liniaKolejowa);
  }
};

/**
 * Generate all tasks from all subsystems
 */
export const generateAllTasks = (subsystems: SubsystemWizardData[], liniaKolejowa?: string): GeneratedTask[] => {
  const allTasks: GeneratedTask[] = [];
  
  subsystems.forEach((subsystem) => {
    const tasks = generateTasksForSubsystem(subsystem, liniaKolejowa);
    allTasks.push(...tasks);
  });
  
  return allTasks;
};
