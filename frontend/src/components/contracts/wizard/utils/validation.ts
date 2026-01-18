// src/components/contracts/wizard/utils/validation.ts
// Validation utilities for contract wizard

import type { SubsystemType } from '../../../../config/subsystemWizardConfig';
import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../config/subsystemWizardConfig';
import type { SubsystemWizardData } from '../types/wizard.types';

export const OPTIONAL_KILOMETRAZ_HELP = 'Pole opcjonalne - wpisz w formacie XXX,XXX';

/**
 * Validate contract number format (R0000001_A)
 */
export const validateContractNumber = (value: string): boolean => {
  if (!value) return true; // Empty is valid (optional field)
  const regex = /^R\d{7}_[A-Z]$/;
  return regex.test(value);
};

/**
 * Format kilometraż to XXX,XXX format with leading zeros
 */
export const formatKilometrazDisplay = (value: string): string => {
  if (!value) return '';
  // Remove all non-digit characters
  const digitsOnly = value.replace(/\D/g, '');
  
  if (!digitsOnly) return '';
  
  // Limit to 6 digits
  const limited = digitsOnly.slice(0, 6);
  
  // Pad with leading zeros to make 6 digits
  const padded = limited.padStart(6, '0');
  
  // Insert comma after 3rd digit: XXX,XXX
  return `${padded.slice(0, 3)},${padded.slice(3)}`;
};

/**
 * Clean and limit kilometraż input
 */
export const cleanKilometrazInput = (value: string): string => {
  // Remove everything except digits and comma
  const cleaned = value.replace(/[^\d,]/g, '').replace(/,/g, '');
  // Limit to 6 digits
  return cleaned.slice(0, 6);
};

/**
 * Validate uniqueness of IP pools across subsystems
 */
export const validateUniqueIPPools = (subsystems: SubsystemWizardData[]): { valid: boolean; error?: string } => {
  // Get all IP pools from subsystems (skip empty/undefined)
  const ipPools = subsystems
    .map((s, index) => ({ 
      ipPool: s.ipPool?.trim(), 
      type: s.type,
      index 
    }))
    .filter(s => s.ipPool); // Only subsystems with assigned pool
  
  // If no subsystem has a pool - validation passes
  if (ipPools.length === 0) {
    return { valid: true };
  }
  
  // Look for duplicates
  const seen = new Map<string, { type: SubsystemType; index: number }>();
  const duplicates: string[] = [];
  
  for (const pool of ipPools) {
    if (seen.has(pool.ipPool!)) {
      const existing = seen.get(pool.ipPool!)!;
      const config1 = SUBSYSTEM_WIZARD_CONFIG[existing.type];
      const config2 = SUBSYSTEM_WIZARD_CONFIG[pool.type];
      duplicates.push(
        `${config1.label} i ${config2.label} mają tę samą pulę IP: ${pool.ipPool}`
      );
    } else {
      seen.set(pool.ipPool!, { type: pool.type, index: pool.index });
    }
  }
  
  if (duplicates.length > 0) {
    return {
      valid: false,
      error: `Podsystemy w kontrakcie muszą mieć różne pule adresowe IP!\n${duplicates.join('\n')}`
    };
  }
  
  return { valid: true };
};
