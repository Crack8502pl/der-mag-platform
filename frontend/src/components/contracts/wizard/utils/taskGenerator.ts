// src/components/contracts/wizard/utils/taskGenerator.ts
// Task generation logic for contract wizard

import { SUBSYSTEM_WIZARD_CONFIG, type SmwWizardData } from '../../../../config/subsystemWizardConfig';
import type { SubsystemWizardData, GeneratedTask, TaskDetail } from '../types/wizard.types';
import { generateTaskName } from './taskNameGenerator';

/**
 * Helper to get numeric value from params
 */
const getNumericValue = (params: Record<string, number | boolean>, key: string): number => {
  const value = params[key];
  return typeof value === 'number' ? value : 0;
};

/**
 * Resolve task variant including category information.
 * For PRZEJAZD tasks, the variant depends on the category (KAT A, KAT E, KAT F etc.)
 * rather than just the taskType.
 */
export const resolveTaskVariant = (taskType: string, detail: TaskDetail): string => {
  // Handle both PRZEJAZD_KAT_A and PRZEJAZD_KAT_B tasks
  if ((taskType === 'PRZEJAZD_KAT_A' || taskType === 'PRZEJAZD_KAT_B') && detail.kategoria) {
    // Validate that kategoria matches expected format 'KAT X' where X is A, B, C, E, or F
    const match = detail.kategoria.match(/^KAT\s+([ABCEF])$/);
    if (match) {
      const katSuffix = match[1]; // Extract the letter (A, B, C, E, or F)
      return `PRZEJAZD_KAT_${katSuffix}`;
    }
  }
  return taskType;
};

/**
 * Build task name from task details.
 * Delegates to generateTaskName for consistent name generation across UI and generation logic.
 */
export const buildTaskNameFromDetails = (
  taskType: string,
  detail: TaskDetail,
  liniaKolejowa?: string
): string => {
  return generateTaskName(taskType, detail, liniaKolejowa);
};

/**
 * Generate tasks for SMOKIP_A subsystem
 */
const generateSmokipATasks = (subsystem: SubsystemWizardData, liniaKolejowa?: string): GeneratedTask[] => {
  const tasks: GeneratedTask[] = [];
  
  // Use task details if available
  if (subsystem.taskDetails && subsystem.taskDetails.length > 0) {
    subsystem.taskDetails.forEach((detail) => {
      const name = buildTaskNameFromDetails(detail.taskType, detail, liniaKolejowa);
      
      tasks.push({
        number: '',
        name,
        type: resolveTaskVariant(detail.taskType, detail),
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
    // hasLCS is now a count (number of LCS tasks)
    const lcsCountA = getNumericValue(params, 'hasLCS');
    for (let i = 0; i < lcsCountA; i++) {
      tasks.push({
        number: '',
        name: lcsCountA > 1 ? `LCS #${i + 1}` : 'LCS',
        type: 'LCS',
        subsystemType: subsystem.type
      });
    }
    // hasCUID removed from step 3 - CUID tasks created per LCS in step 4
  }
  
  return tasks;
};

/**
 * Generate tasks for SMOKIP_B subsystem
 */
const generateSmokipBTasks = (subsystem: SubsystemWizardData, liniaKolejowa?: string): GeneratedTask[] => {
  const tasks: GeneratedTask[] = [];
  
  if (subsystem.taskDetails && subsystem.taskDetails.length > 0) {
    subsystem.taskDetails.forEach((detail) => {
      const name = buildTaskNameFromDetails(detail.taskType, detail, liniaKolejowa);
      
      tasks.push({
        number: '',
        name,
        type: resolveTaskVariant(detail.taskType, detail),
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
    // hasLCS is now a count (number of LCS tasks)
    const lcsCountB = getNumericValue(params, 'hasLCS');
    for (let i = 0; i < lcsCountB; i++) {
      tasks.push({
        number: '',
        name: lcsCountB > 1 ? `LCS #${i + 1}` : 'LCS',
        type: 'LCS',
        subsystemType: subsystem.type
      });
    }
    // hasCUID removed from step 3 - CUID tasks created per LCS in step 4
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
