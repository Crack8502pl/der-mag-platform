// src/components/contracts/wizard/utils/typeGuards.ts
// Type guard helpers for wizard types

import type { SubsystemType } from '../../../../config/subsystemWizardConfig';

const VALID_SUBSYSTEM_TYPES: SubsystemType[] = [
  'SMOKIP_A', 'SMOKIP_B', 'SMW', 'SKD', 'SSWIN',
  'CCTV', 'SDIP', 'SUG', 'SSP', 'LAN', 'OTK', 'ZASILANIE',
];

export function isValidSubsystemType(type: string): type is SubsystemType {
  return VALID_SUBSYSTEM_TYPES.includes(type as SubsystemType);
}

export function toSubsystemType(type: string, fallback: SubsystemType = 'SMOKIP_A'): SubsystemType {
  if (isValidSubsystemType(type)) {
    return type;
  }
  if (import.meta.env.DEV) {
    console.warn(`⚠️ Invalid subsystem type "${type}", using fallback: ${fallback}`);
  }
  return fallback;
}
