import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';

import type { WizardData } from '../../types/wizard.types';

const getTemplateFor = vi.fn();
const resolve = vi.fn();
const resolveHierarchy = vi.fn();

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

vi.mock('../../../../../services/wizardHierarchy.service', () => ({
  wizardHierarchyService: {
    resolveHierarchy: (...args: unknown[]) => resolveHierarchy(...args)
  }
}));

import { TaskConfigurationStep } from '../TaskConfigurationStep';

describe('TaskConfigurationStep', () => {
  const baseWizardData: WizardData = {
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

  const baseResolvedItem = {
    templateItemId: 1001,
    materialName: 'Rejestrator',
    catalogNumber: null,
    unit: 'szt',
    quantitySource: 'DEPENDENT',
    groupName: 'Rejestratory',
    isRequired: false,
    requiresIp: true,
    sortOrder: 0,
    defaultQuantity: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resolveHierarchy.mockResolvedValue(null);
  });

  const StatefulTaskConfiguration = () => {
    const [wizardData, setWizardData] = useState<WizardData>(baseWizardData);
    return (
      <TaskConfigurationStep
        wizardData={wizardData}
        onUpdate={(patch) => {
          setWizardData((prev) => ({
            ...prev,
            ...patch,
            taskConfigurations: {
              ...(prev.taskConfigurations || {}),
              ...(patch.taskConfigurations || {})
            }
          }));
        }}
      />
    );
  };

  it('for DEPENDENT uses bomResolverService.resolve and not template service', async () => {
    resolve.mockResolvedValue({
      templateId: 101,
      templateName: 'Test',
      templateVersion: 2,
      templateMissing: false,
      items: [
        {
          ...baseResolvedItem,
          resolvedQuantity: 1
        }
      ],
      needsRecorder: true,
      cameraCount: 6,
      recorderRecommendation: null,
      diskRecommendation: null,
      retentionDays: 14,
      isConfigured: false,
      resolvedAt: new Date().toISOString(),
      warnings: []
    });

    const onUpdate = vi.fn();
    render(<TaskConfigurationStep wizardData={baseWizardData} onUpdate={onUpdate} />);

    await waitFor(() => expect(resolve).toHaveBeenCalled());
    expect(getTemplateFor).not.toHaveBeenCalled();

    expect(resolve).toHaveBeenCalledWith(expect.objectContaining({
      subsystemType: 'SMOKIP_A',
      taskType: 'LCS',
      cameraCount: 6,
      configParams: expect.objectContaining({ 'camera.ip.total': 6, cameraCount: 6 })
    }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());

    const updatePayload = onUpdate.mock.calls.at(-1)?.[0];
    const config = updatePayload.taskConfigurations['SMOKIP_A-0'];
    expect(config.materials[0].quantity).toBe(1);
    expect(config.materials[0].isSelected).toBe(true);
  });

  it('renders recorder recommendation from resolved BOM', async () => {
    resolve.mockResolvedValue({
      templateId: 101,
      templateName: 'Test',
      templateVersion: 2,
      templateMissing: false,
      items: [{ ...baseResolvedItem, resolvedQuantity: 1 }],
      needsRecorder: true,
      cameraCount: 6,
      recorderRecommendation: {
        recorder: {
          id: 10,
          modelName: 'NVR-32',
          manufacturer: 'Hik',
          minCameras: 1,
          maxCameras: 32,
          diskSlots: 2,
          maxDiskCapacityTb: 16,
          isActive: true,
          catalogNumber: null
        },
        isRecommended: true,
        alternatives: []
      },
      diskRecommendation: null,
      retentionDays: 14,
      isConfigured: false,
      resolvedAt: new Date().toISOString(),
      warnings: []
    });

    render(<StatefulTaskConfiguration />);

    expect(await screen.findByText(/Rekomendowany rejestrator/i)).toBeInTheDocument();
    expect(screen.getByText(/NVR-32/)).toBeInTheDocument();
  });

  it('shows loading state while waiting for BOM resolve', async () => {
    resolve.mockImplementation(() => new Promise(() => undefined));

    render(<TaskConfigurationStep wizardData={baseWizardData} onUpdate={vi.fn()} />);

    expect(await screen.findByText(/Ładowanie szablonu BOM/i)).toBeInTheDocument();
  });

  it('shows error when resolver API fails', async () => {
    resolve.mockRejectedValue(new Error('API down'));

    render(<TaskConfigurationStep wizardData={baseWizardData} onUpdate={vi.fn()} />);

    expect(await screen.findByText(/Nie udało się załadować szablonu BOM/i)).toBeInTheDocument();
  });

  it('uses resolved quantities for FIXED and FROM_CONFIG', async () => {
    resolve.mockResolvedValue({
      templateId: 101,
      templateName: 'Test',
      templateVersion: 2,
      templateMissing: false,
      items: [
        {
          templateItemId: 2001,
          materialName: 'Kabel',
          catalogNumber: null,
          unit: 'm',
          resolvedQuantity: 2,
          quantitySource: 'FIXED',
          groupName: 'Okablowanie',
          isRequired: true,
          requiresIp: false,
          sortOrder: 0,
          defaultQuantity: 2
        },
        {
          templateItemId: 2002,
          materialName: 'Patchpanel',
          catalogNumber: null,
          unit: 'szt',
          resolvedQuantity: 5,
          quantitySource: 'FROM_CONFIG',
          groupName: 'Szafa',
          isRequired: true,
          requiresIp: false,
          sortOrder: 1,
          defaultQuantity: 0
        }
      ],
      needsRecorder: false,
      cameraCount: 0,
      recorderRecommendation: null,
      diskRecommendation: null,
      retentionDays: 14,
      isConfigured: false,
      resolvedAt: new Date().toISOString(),
      warnings: []
    });

    const onUpdate = vi.fn();
    render(<TaskConfigurationStep wizardData={baseWizardData} onUpdate={onUpdate} />);

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    const updatePayload = onUpdate.mock.calls.at(-1)?.[0];
    const materials = updatePayload.taskConfigurations['SMOKIP_A-0'].materials;

    expect(materials.find((m: any) => m.quantitySource === 'FIXED')?.quantity).toBe(2);
    expect(materials.find((m: any) => m.quantitySource === 'FROM_CONFIG')?.quantity).toBe(5);
  });
});
