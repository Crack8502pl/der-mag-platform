import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';

import type { TaskConfiguration, WizardData } from '../../types/wizard.types';

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

  const resolvedBom = (cameraCount: number, recorderModel = `NVR-${cameraCount}`) => ({
    templateId: 101,
    templateName: 'Test',
    templateVersion: 2,
    templateMissing: false,
    items: [{ ...baseResolvedItem, resolvedQuantity: 1 }],
    needsRecorder: true,
    cameraCount,
    recorderRecommendation: {
      recorder: {
        id: 10,
        modelName: recorderModel,
        manufacturer: 'Hik',
        minCameras: 1,
        maxCameras: 64,
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

  it('applies camera quantities from child task config when reloading LCS template', async () => {
    const wizardData: WizardData = {
      ...baseWizardData,
      subsystems: [
        {
          type: 'SMOKIP_A',
          params: {},
          taskDetails: [
            { taskType: 'PRZEJAZD_KAT_A', taskWizardId: 'child-1', kategoria: 'KAT A' },
            { taskType: 'LCS', taskWizardId: 'lcs-1' }
          ]
        }
      ],
      taskRelationships: {
        'lcs-1': {
          parentWizardId: 'lcs-1',
          parentType: 'LCS',
          childTaskKeys: ['child-1']
        }
      }
    };

    resolve.mockImplementation(async (request: { taskType: string }) => {
      if (request.taskType === 'PRZEJAZD_KAT_A') {
        return {
          templateId: 101,
          templateName: 'Przejazd',
          templateVersion: 1,
          templateMissing: false,
          items: [
            {
              templateItemId: 3001,
              materialName: 'Kamera Ogólna',
              catalogNumber: null,
              unit: 'szt',
              resolvedQuantity: 0,
              quantitySource: 'FIXED',
              groupName: 'Kamery',
              isRequired: true,
              requiresIp: true,
              sortOrder: 0,
              defaultQuantity: 0
            },
            {
              templateItemId: 3002,
              materialName: 'Kamera LPR',
              catalogNumber: null,
              unit: 'szt',
              resolvedQuantity: 0,
              quantitySource: 'FIXED',
              groupName: 'Kamery',
              isRequired: true,
              requiresIp: true,
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
        };
      }

      return {
        templateId: 102,
        templateName: 'LCS',
        templateVersion: 1,
        templateMissing: false,
        items: [{ ...baseResolvedItem, resolvedQuantity: 0 }],
        needsRecorder: true,
        cameraCount: 4,
        recorderRecommendation: null,
        diskRecommendation: null,
        retentionDays: 14,
        isConfigured: false,
        resolvedAt: new Date().toISOString(),
        warnings: []
      };
    });

    const StatefulWithHierarchy = () => {
      const [state, setState] = useState<WizardData>(wizardData);
      return (
        <TaskConfigurationStep
          wizardData={state}
          onUpdate={(patch) => {
            setState((prev) => ({
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

    render(<StatefulWithHierarchy />);

    await waitFor(() =>
      expect(resolve).toHaveBeenCalledWith(expect.objectContaining({ taskType: 'PRZEJAZD_KAT_A' }))
    );

    const qtyInputs = await screen.findAllByRole('spinbutton');
    fireEvent.change(qtyInputs[0], { target: { value: '2' } });
    fireEvent.change(qtyInputs[1], { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /Zastosuj BOM do zadania/i }));

    fireEvent.click(screen.getByText((content) => content.includes('LCS') && !content.includes('BOM')));
    const reloadButton = await screen.findByRole('button', { name: /Przeładuj szablon/i });
    fireEvent.click(reloadButton);

    await waitFor(() => {
      const lcsCalls = resolve.mock.calls
        .map((call) => call[0])
        .filter((request) => request.taskType === 'LCS');
      expect(lcsCalls.length).toBeGreaterThan(0);
      expect(lcsCalls.at(-1)).toEqual(expect.objectContaining({
        cameraCount: 4,
        cameraBreakdown: expect.objectContaining({
          total: 4,
          ogolna: 2,
          lpr: 2
        }),
        configParams: expect.objectContaining({
          cameraCount: 4,
          'camera.total.ip': 4
        })
      }));
    });
  });

  it('passes isStandaloneNastawnia for standalone NASTAWNIA task', async () => {
    const standaloneWizardData: WizardData = {
      ...baseWizardData,
      subsystems: [
        {
          type: 'SMOKIP_A',
          params: {},
          taskDetails: [{ taskType: 'NASTAWNIA', taskWizardId: 'nd-1' }]
        }
      ]
    };

    resolve.mockResolvedValue({
      templateId: 103,
      templateName: 'ND',
      templateVersion: 1,
      templateMissing: false,
      items: [{ ...baseResolvedItem, resolvedQuantity: 0 }],
      needsRecorder: true,
      cameraCount: 0,
      recorderRecommendation: null,
      diskRecommendation: null,
      retentionDays: 14,
      isConfigured: false,
      resolvedAt: new Date().toISOString(),
      warnings: []
    });

    render(<TaskConfigurationStep wizardData={standaloneWizardData} onUpdate={vi.fn()} />);

    await waitFor(() => expect(resolve).toHaveBeenCalled());
    expect(resolve).toHaveBeenCalledWith(expect.objectContaining({
      taskType: 'NASTAWNIA',
      isStandaloneNastawnia: true
    }));
  });

  it('prefers configured task camera count over higher fallback defaults', async () => {
    const wizardData: WizardData = {
      ...baseWizardData,
      taskConfigurations: {
        'SMOKIP_A-0': {
          taskId: 'SMOKIP_A-0',
          taskNumber: 'task-1',
          taskName: 'LCS',
          taskType: 'LCS',
          subsystemType: 'SMOKIP_A',
          materials: [],
          configParams: {
            cameraCount: 1,
            'camera.total': 1,
            'camera.total.ip': 1,
            'camera.ip.total': 1,
            'lcsConfig.iloscKamer': 5
          },
          isConfigured: true
        }
      }
    };

    resolve.mockResolvedValue({
      templateId: 101,
      templateName: 'Test',
      templateVersion: 2,
      templateMissing: false,
      items: [],
      needsRecorder: true,
      cameraCount: 1,
      recorderRecommendation: null,
      diskRecommendation: null,
      retentionDays: 14,
      isConfigured: false,
      resolvedAt: new Date().toISOString(),
      warnings: []
    });

    render(<TaskConfigurationStep wizardData={wizardData} onUpdate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Przeładuj szablon/i }));

    await waitFor(() => expect(resolve).toHaveBeenCalledWith(expect.objectContaining({
      taskType: 'LCS',
      cameraCount: 1,
      configParams: expect.objectContaining({
        cameraCount: 1,
        'camera.total.ip': 1,
        'lcsConfig.iloscKamer': 5
      })
    })));
  });

  it('prefers nested configured hierarchy counts over higher template defaults for LCS', async () => {
    const wizardData: WizardData = {
      ...baseWizardData,
      subsystems: [
        {
          type: 'SMOKIP_A',
          params: {},
          taskDetails: [
            { taskType: 'PRZEJAZD_KAT_A', taskWizardId: 'child-1', kategoria: 'KAT A' },
            { taskType: 'SKP', taskWizardId: 'child-2' },
            { taskType: 'NASTAWNIA', taskWizardId: 'nd-1' },
            { taskType: 'LCS', taskWizardId: 'lcs-1' }
          ]
        }
      ],
      taskRelationships: {
        'lcs-1': {
          parentWizardId: 'lcs-1',
          parentType: 'LCS',
          childTaskKeys: ['child-1', 'nd-1']
        },
        'nd-1': {
          parentWizardId: 'nd-1',
          parentType: 'NASTAWNIA',
          childTaskKeys: ['child-2']
        }
      },
      taskConfigurations: {
        'SMOKIP_A-0': {
          taskId: 'SMOKIP_A-0',
          taskNumber: 'Z-1',
          taskName: 'Przejazd',
          taskType: 'PRZEJAZD_KAT_A',
          subsystemType: 'SMOKIP_A',
          materials: [],
          configParams: {
            cameraCount: 1,
            'camera.total': 1,
            'camera.total.ip': 1,
            'camera.ip.total': 1,
            'camera.total.ip.lpr': 1
          },
          isConfigured: true
        },
        'SMOKIP_A-1': {
          taskId: 'SMOKIP_A-1',
          taskNumber: 'Z-2',
          taskName: 'SKP',
          taskType: 'SKP',
          subsystemType: 'SMOKIP_A',
          materials: [],
          configParams: {
            cameraCount: 0,
            'camera.total': 0,
            'camera.total.ip': 0,
            'camera.ip.total': 0,
            'camera.total.ip.skp': 0
          },
          isConfigured: true
        },
        'SMOKIP_A-2': {
          taskId: 'SMOKIP_A-2',
          taskNumber: 'Z-3',
          taskName: 'ND',
          taskType: 'NASTAWNIA',
          subsystemType: 'SMOKIP_A',
          materials: [],
          configParams: {
            cameraCount: 2,
            'camera.total': 2,
            'camera.total.ip': 2,
            'camera.ip.total': 2,
            'nastawniConfig.iloscKamer': 2
          },
          isConfigured: false
        },
        'SMOKIP_A-3': {
          taskId: 'SMOKIP_A-3',
          taskNumber: 'Z-4',
          taskName: 'LCS',
          taskType: 'LCS',
          subsystemType: 'SMOKIP_A',
          materials: [],
          configParams: {
            cameraCount: 5,
            'camera.total': 5,
            'camera.total.ip': 5,
            'camera.ip.total': 5,
            'lcsConfig.iloscKamer': 5
          },
          isConfigured: false
        }
      }
    };

    resolve.mockResolvedValue({
      templateId: 102,
      templateName: 'LCS',
      templateVersion: 1,
      templateMissing: false,
      items: [],
      needsRecorder: true,
      cameraCount: 1,
      recorderRecommendation: null,
      diskRecommendation: null,
      retentionDays: 14,
      isConfigured: false,
      resolvedAt: new Date().toISOString(),
      warnings: []
    });

    render(<TaskConfigurationStep wizardData={wizardData} onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByText((content) => content.includes('LCS') && !content.includes('BOM')));
    fireEvent.click(await screen.findByRole('button', { name: /Przeładuj szablon/i }));

    await waitFor(() => expect(resolve).toHaveBeenCalledWith(expect.objectContaining({
      taskType: 'LCS',
      cameraCount: 1,
      cameraBreakdown: expect.objectContaining({
        total: 1,
        lpr: 1,
        skp: 0
      }),
      configParams: expect.objectContaining({
        cameraCount: 1,
        'camera.total.ip': 1,
        'camera.total.ip.skp': 0,
        'lcsConfig.iloscKamer': 5
      })
    })));
  });

  it('reloads LCS template when child fingerprint changes and uses new camera count', async () => {
    const wizardData: WizardData = {
      ...baseWizardData,
      subsystems: [
        {
          type: 'SMOKIP_A',
          params: {},
          taskDetails: [
            { taskType: 'PRZEJAZD_KAT_A', taskWizardId: 'child-1' },
            { taskType: 'SKP', taskWizardId: 'child-2' },
            { taskType: 'LCS', taskWizardId: 'lcs-1' }
          ]
        }
      ],
      taskRelationships: {
        'lcs-1': {
          parentWizardId: 'lcs-1',
          parentType: 'LCS',
          childTaskKeys: ['child-1', 'child-2']
        }
      },
      taskConfigurations: {
        'SMOKIP_A-0': {
          taskId: 'SMOKIP_A-0',
          taskNumber: 'Z-1',
          taskName: 'Przejazd',
          taskType: 'PRZEJAZD_KAT_A',
          subsystemType: 'SMOKIP_A',
          materials: [],
          configParams: {
            cameraCount: 6,
            'camera.total.ip.ogolna': 3,
            'camera.total.ip.lpr': 3,
            'camera.total.ip.skp': 0
          },
          isConfigured: true
        },
        'SMOKIP_A-1': {
          taskId: 'SMOKIP_A-1',
          taskNumber: 'Z-2',
          taskName: 'SKP',
          taskType: 'SKP',
          subsystemType: 'SMOKIP_A',
          materials: [],
          configParams: {
            cameraCount: 1,
            'camera.total.ip.ogolna': 0,
            'camera.total.ip.lpr': 0,
            'camera.total.ip.skp': 1
          },
          isConfigured: true
        },
        'SMOKIP_A-2': {
          taskId: 'SMOKIP_A-2',
          taskNumber: 'Z-3',
          taskName: 'LCS',
          taskType: 'LCS',
          subsystemType: 'SMOKIP_A',
          materials: [],
          configParams: { cameraCount: 7, 'camera.total.ip': 7 },
          isConfigured: true
        }
      }
    };

    resolve.mockResolvedValue(resolvedBom(3));

    const { rerender } = render(<TaskConfigurationStep wizardData={wizardData} onUpdate={vi.fn()} />);
    await Promise.resolve();
    await Promise.resolve();
    expect(resolve).not.toHaveBeenCalled();

    const changedWizardData: WizardData = {
      ...wizardData,
      taskConfigurations: {
        ...wizardData.taskConfigurations!,
        'SMOKIP_A-0': {
          ...wizardData.taskConfigurations!['SMOKIP_A-0'],
          configParams: {
            cameraCount: 2,
            'camera.total.ip.ogolna': 1,
            'camera.total.ip.lpr': 1,
            'camera.total.ip.skp': 0
          }
        },
        'SMOKIP_A-1': {
          ...wizardData.taskConfigurations!['SMOKIP_A-1'],
          configParams: {
            cameraCount: 1,
            'camera.total.ip.ogolna': 0,
            'camera.total.ip.lpr': 0,
            'camera.total.ip.skp': 1
          }
        }
      }
    };

    rerender(<TaskConfigurationStep wizardData={changedWizardData} onUpdate={vi.fn()} />);

    await waitFor(() => expect(resolve).toHaveBeenCalledWith(expect.objectContaining({
      taskType: 'LCS',
      cameraCount: 3,
      configParams: expect.objectContaining({ cameraCount: 3, 'camera.total.ip': 3 })
    })));
  });

  it('with preferExplicitCameraValues uses explicit cameraCount over stale config fallback', async () => {
    const wizardData: WizardData = {
      ...baseWizardData,
      subsystems: [
        {
          type: 'SMOKIP_A',
          params: {},
          taskDetails: [
            { taskType: 'PRZEJAZD_KAT_A', taskWizardId: 'child-1' },
            { taskType: 'LCS', taskWizardId: 'lcs-1' }
          ]
        }
      ],
      taskRelationships: {
        'lcs-1': {
          parentWizardId: 'lcs-1',
          parentType: 'LCS',
          childTaskKeys: ['child-1']
        }
      },
      taskConfigurations: {
        'SMOKIP_A-0': {
          taskId: 'SMOKIP_A-0',
          taskNumber: 'Z-1',
          taskName: 'Przejazd',
          taskType: 'PRZEJAZD_KAT_A',
          subsystemType: 'SMOKIP_A',
          materials: [],
          configParams: {
            cameraCount: 3,
            'camera.total.ip.ogolna': 1,
            'camera.total.ip.lpr': 2,
            'camera.total.ip.skp': 0
          },
          isConfigured: true
        },
        'SMOKIP_A-1': {
          taskId: 'SMOKIP_A-1',
          taskNumber: 'Z-2',
          taskName: 'LCS',
          taskType: 'LCS',
          subsystemType: 'SMOKIP_A',
          materials: [],
          configParams: {
            cameraCount: 7,
            'camera.total': 7,
            'camera.total.ip': 7,
            'camera.ip.total': 7
          },
          isConfigured: true
        }
      }
    };

    resolve.mockResolvedValue(resolvedBom(3));

    render(<TaskConfigurationStep wizardData={wizardData} onUpdate={vi.fn()} />);
    fireEvent.click(screen.getByText((content) => content.includes('LCS') && !content.includes('BOM')));
    fireEvent.click(await screen.findByRole('button', { name: /Przeładuj szablon/i }));

    await waitFor(() => expect(resolve).toHaveBeenCalledWith(expect.objectContaining({
      taskType: 'LCS',
      cameraCount: 3,
      configParams: expect.objectContaining({
        cameraCount: 3,
        'camera.total.ip': 3,
        'camera.ip.total': 3
      })
    })));
  });

  it('updates recorder recommendation after reducing child camera counts', async () => {
    const startingState: WizardData = {
      ...baseWizardData,
      subsystems: [
        {
          type: 'SMOKIP_A',
          params: {},
          taskDetails: [
            { taskType: 'PRZEJAZD_KAT_A', taskWizardId: 'child-1' },
            { taskType: 'LCS', taskWizardId: 'lcs-1' }
          ]
        }
      ],
      taskRelationships: {
        'lcs-1': {
          parentWizardId: 'lcs-1',
          parentType: 'LCS',
          childTaskKeys: ['child-1']
        }
      },
      taskConfigurations: {
        'SMOKIP_A-0': {
          taskId: 'SMOKIP_A-0',
          taskNumber: 'Z-1',
          taskName: 'Przejazd',
          taskType: 'PRZEJAZD_KAT_A',
          subsystemType: 'SMOKIP_A',
          materials: [],
          configParams: {
            cameraCount: 7,
            'camera.total.ip.ogolna': 3,
            'camera.total.ip.lpr': 4,
            'camera.total.ip.skp': 0
          },
          isConfigured: true
        },
        'SMOKIP_A-1': {
          taskId: 'SMOKIP_A-1',
          taskNumber: 'Z-2',
          taskName: 'LCS',
          taskType: 'LCS',
          subsystemType: 'SMOKIP_A',
          materials: [],
          configParams: { cameraCount: 7, 'camera.total.ip': 7 },
          recorderRecommendation: {
            recorder: {
              id: 1,
              modelName: 'NVR-7',
              manufacturer: 'Hik',
              minCameras: 1,
              maxCameras: 16,
              diskSlots: 2,
              maxDiskCapacityTb: 16,
              isActive: true,
              catalogNumber: null
            },
            isRecommended: true,
            alternatives: []
          },
          isConfigured: true
        }
      }
    };

    resolve.mockImplementation(async (request: { cameraCount?: number }) => resolvedBom(request.cameraCount ?? 0));

    const StatefulRecorderCase = () => {
      const [wizardData, setWizardData] = useState<WizardData>(startingState);
      return (
        <>
          <button
            type="button"
            onClick={() =>
              setWizardData((prev) => ({
                ...prev,
                taskConfigurations: {
                  ...(prev.taskConfigurations || {}),
                  'SMOKIP_A-0': {
                    ...(prev.taskConfigurations?.['SMOKIP_A-0'] as TaskConfiguration),
                    configParams: {
                      cameraCount: 3,
                      'camera.total.ip.ogolna': 1,
                      'camera.total.ip.lpr': 2,
                      'camera.total.ip.skp': 0
                    }
                  }
                }
              }))
            }
          >
            reduce-cameras
          </button>
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
        </>
      );
    };

    render(<StatefulRecorderCase />);
    fireEvent.click(screen.getByText((content) => content.includes('LCS') && !content.includes('BOM')));
    expect(await screen.findByText(/NVR-7/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'reduce-cameras' }));

    await waitFor(() => expect(resolve).toHaveBeenCalledWith(expect.objectContaining({
      taskType: 'LCS',
      cameraCount: 3
    })));
    expect(await screen.findByText(/NVR-3/)).toBeInTheDocument();
  });

  it('does not reload template when child fingerprint stays unchanged', async () => {
    const wizardData: WizardData = {
      ...baseWizardData,
      subsystems: [
        {
          type: 'SMOKIP_A',
          params: {},
          taskDetails: [
            { taskType: 'PRZEJAZD_KAT_A', taskWizardId: 'child-1' },
            { taskType: 'LCS', taskWizardId: 'lcs-1' }
          ]
        }
      ],
      taskRelationships: {
        'lcs-1': {
          parentWizardId: 'lcs-1',
          parentType: 'LCS',
          childTaskKeys: ['child-1']
        }
      },
      taskConfigurations: {
        'SMOKIP_A-0': {
          taskId: 'SMOKIP_A-0',
          taskNumber: 'Z-1',
          taskName: 'Przejazd',
          taskType: 'PRZEJAZD_KAT_A',
          subsystemType: 'SMOKIP_A',
          materials: [],
          configParams: {
            cameraCount: 3,
            'camera.total.ip.ogolna': 1,
            'camera.total.ip.lpr': 2,
            'camera.total.ip.skp': 0
          },
          isConfigured: true
        },
        'SMOKIP_A-1': {
          taskId: 'SMOKIP_A-1',
          taskNumber: 'Z-2',
          taskName: 'LCS',
          taskType: 'LCS',
          subsystemType: 'SMOKIP_A',
          materials: [],
          configParams: { cameraCount: 7, 'camera.total.ip': 7 },
          isConfigured: true
        }
      }
    };

    resolve.mockResolvedValue(resolvedBom(3));

    const { rerender } = render(<TaskConfigurationStep wizardData={wizardData} onUpdate={vi.fn()} />);
    rerender(<TaskConfigurationStep wizardData={{ ...wizardData, taskConfigurations: { ...wizardData.taskConfigurations! } }} onUpdate={vi.fn()} />);

    await Promise.resolve();
    await Promise.resolve();
    expect(resolve).not.toHaveBeenCalled();
  });
});
