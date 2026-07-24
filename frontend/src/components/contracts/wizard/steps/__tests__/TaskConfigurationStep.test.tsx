import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { WizardData } from '../../types/wizard.types';

const getTemplateFor = vi.fn();
const resolve = vi.fn();

vi.mock('../../../../../services/bomSubsystemTemplate.service', () => ({
  default: {
    getTemplateFor: (...args: unknown[]) => getTemplateFor(...args)
  }
}));

vi.mock('../../../../../services/bomResolver.service', () => ({
  default: {
    resolve: (...args: unknown[]) => resolve(...args)
  }
}));

import { TaskConfigurationStep } from '../TaskConfigurationStep';

describe('TaskConfigurationStep', () => {
  it('uses BOM resolver and auto-selects item resolved by rule', async () => {
    getTemplateFor.mockResolvedValue({
      id: 101,
      version: 2,
      items: [
        {
          id: 1001,
          materialName: 'Rejestrator',
          defaultQuantity: 0,
          quantitySource: 'DEPENDENT',
          requiresIp: true,
          isRequired: false,
          unit: 'szt'
        }
      ]
    });
    resolve.mockResolvedValue({
      templateId: 101,
      templateVersion: 2,
      items: [
        {
          templateItemId: 1001,
          materialName: 'Rejestrator',
          catalogNumber: null,
          unit: 'szt',
          resolvedQuantity: 1,
          quantitySource: 'DEPENDENT',
          groupName: 'Rejestratory',
          isRequired: false,
          requiresIp: true
        }
      ]
    });

    const onUpdate = vi.fn();
    const wizardData: WizardData = {
      contractNumber: 'C-1',
      customName: 'Test',
      orderDate: '2026-01-01',
      projectManagerId: '1',
      managerCode: 'M1',
      subsystems: [
        {
          type: 'SMOKIP_A',
          params: { 'camera.ip.total': 6 },
          taskDetails: [{ taskType: 'LCS', taskWizardId: 'task-1' }]
        }
      ]
    };

    render(<TaskConfigurationStep wizardData={wizardData} onUpdate={onUpdate} />);

    await waitFor(() => expect(resolve).toHaveBeenCalled());

    expect(resolve).toHaveBeenCalledWith(expect.objectContaining({
      subsystemType: 'SMOKIP_A',
      taskType: 'LCS',
      cameraCount: 6,
      configParams: expect.objectContaining({ 'camera.ip.total': 6 })
    }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const updatePayload = onUpdate.mock.calls.at(-1)?.[0];
    const config = updatePayload.taskConfigurations['SMOKIP_A-0'];
    expect(config.materials[0].quantity).toBe(1);
    expect(config.materials[0].isSelected).toBe(true);
  });
});
