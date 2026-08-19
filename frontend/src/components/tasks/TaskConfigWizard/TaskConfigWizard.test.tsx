import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const getTemplateFor = vi.fn();
const getAllGroups = vi.fn();
const resolveBom = vi.fn();
const getBySubsystem = vi.fn();
const taskGetById = vi.fn();

vi.mock('../../../services/bomSubsystemTemplate.service', () => ({
  default: {
    getTemplateFor: (...args: unknown[]) => getTemplateFor(...args),
    applyToTask: vi.fn(),
  }
}));

vi.mock('../../../services/bomGroup.service', () => ({
  default: {
    getAll: (...args: unknown[]) => getAllGroups(...args)
  }
}));

vi.mock('../../../services/task.service', () => ({
  default: {
    update: vi.fn(),
    getById: (...args: unknown[]) => taskGetById(...args),
  }
}));

vi.mock('../../../services/bomResolver.service', () => ({
  default: {
    resolve: (...args: unknown[]) => resolveBom(...args)
  }
}));

vi.mock('../../../services/taskRelationship.service', () => ({
  default: {
    getBySubsystem: (...args: unknown[]) => getBySubsystem(...args),
  }
}));

vi.mock('./WizardStepParams', () => ({
  WizardStepParams: () => <div>params-step</div>
}));

vi.mock('./WizardStepCameras', () => ({
  WizardStepCameras: () => <div>cameras-step</div>
}));

vi.mock('./WizardStepBom', () => ({
  WizardStepBom: () => <div>bom-step</div>
}));

vi.mock('./WizardStepRecorder', () => ({
  WizardStepRecorder: () => <div>recorder-step</div>
}));

vi.mock('./WizardStepSummary', () => ({
  WizardStepSummary: () => <div>summary-step</div>
}));

import { TaskConfigWizard } from './TaskConfigWizard';

const defaultTemplateResponse = {
  id: 1,
  templateName: 'BOM',
  subsystemType: 'SMOKIP_A',
  taskVariant: null,
  version: 1,
  isActive: true,
  items: []
};

describe('TaskConfigWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllGroups.mockResolvedValue([]);
    getTemplateFor.mockResolvedValue(defaultTemplateResponse);
    getBySubsystem.mockResolvedValue([]);
  });

  it('blocks next button on BOM step when templateMissing=true', async () => {
    resolveBom.mockResolvedValue({
      templateId: null,
      templateName: null,
      templateVersion: null,
      templateMissing: true,
      subsystemType: 'SMOKIP_A',
      items: [],
      needsRecorder: false,
      cameraCount: 0,
      recorderRecommendation: null,
      diskRecommendation: null,
      retentionDays: 30,
      isConfigured: false,
      resolvedAt: new Date().toISOString(),
      warnings: []
    });

    render(
      <TaskConfigWizard
        task={{
          id: 1,
          taskNumber: 'Z1',
          taskType: { code: 'SMOKIP_A' },
          metadata: { subsystemType: 'SMOKIP_A', taskVariant: null }
        } as any}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await screen.findByText('params-step');

    fireEvent.click(screen.getByRole('button', { name: /Dalej/i }));
    await screen.findByText('cameras-step');

    fireEvent.click(screen.getByRole('button', { name: /Oblicz BOM/i }));
    await screen.findByText('bom-step');

    await waitFor(() => expect(resolveBom).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /Dalej/i })).toBeDisabled();
  });

  describe('Fix4 — fetchChildrenCameraBreakdown', () => {
    it('LCS z subsystemId — pobiera breakdown z dzieci i ustawia cameraCount', async () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      getBySubsystem.mockResolvedValue([
        {
          parentTaskNumber: 'LCS-1',
          parentType: 'LCS',
          parentTaskId: 10,
          children: [
            { childTaskNumber: 'P-1', childTaskId: 11, childTaskType: 'PRZEJAZD' },
            { childTaskNumber: 'P-2', childTaskId: 12, childTaskType: 'PRZEJAZD' },
          ],
        },
      ]);

      taskGetById
        .mockResolvedValueOnce({
          metadata: {
            configParams: {
              'camera.total.ip.ogolna': 1,
              'camera.total.ip.lpr': 1,
              'camera.total.ip.skp': 0,
            },
          },
        })
        .mockResolvedValueOnce({
          metadata: {
            configParams: {
              'camera.total.ip.ogolna': 1,
              'camera.total.ip.lpr': 1,
              'camera.total.ip.skp': 1,
            },
          },
        });

      render(
        <TaskConfigWizard
          task={{
            id: 10,
            taskNumber: 'LCS-1',
            subsystemId: 5,
            taskType: { code: 'LCS' },
            metadata: {
              subsystemType: 'SMOKIP_A',
              taskVariant: null,
              lcsConfig: { iloscKamer: 7 },
            },
          } as any}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      await screen.findByText('params-step');

      await waitFor(() =>
        expect(infoSpy).toHaveBeenCalledWith(
          expect.stringContaining('cameraCount from children = 5')
        )
      );

      expect(getBySubsystem).toHaveBeenCalledWith(5);
      expect(taskGetById).toHaveBeenCalledWith('P-1');
      expect(taskGetById).toHaveBeenCalledWith('P-2');

      infoSpy.mockRestore();
    });

    it('fallback do metadata gdy API zwraca błąd', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      getBySubsystem.mockRejectedValue(new Error('Network error'));

      render(
        <TaskConfigWizard
          task={{
            id: 10,
            taskNumber: 'LCS-1',
            subsystemId: 5,
            taskType: { code: 'LCS' },
            metadata: {
              subsystemType: 'SMOKIP_A',
              taskVariant: null,
              lcsConfig: { iloscKamer: 7 },
            },
          } as any}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      await screen.findByText('params-step');

      await waitFor(() =>
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('fetchChildrenCameraBreakdown failed'),
          expect.any(Error)
        )
      );

      // Komponent nie crashuje — params-step jest widoczny
      expect(screen.getByText('params-step')).toBeTruthy();

      warnSpy.mockRestore();
    });

    it('fallback gdy brak dzieci — komponent nie crashuje', async () => {
      getBySubsystem.mockResolvedValue([]);

      render(
        <TaskConfigWizard
          task={{
            id: 10,
            taskNumber: 'LCS-1',
            subsystemId: 5,
            taskType: { code: 'LCS' },
            metadata: {
              subsystemType: 'SMOKIP_A',
              taskVariant: null,
              lcsConfig: { iloscKamer: 3 },
            },
          } as any}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      await screen.findByText('params-step');

      // Brak dzieci — getById nie powinno być wywoływane
      expect(taskGetById).not.toHaveBeenCalled();
      expect(screen.getByText('params-step')).toBeTruthy();
    });

    it('NIE uruchamia się dla zadań nie-LCS/NASTAWNIA (PRZEJAZD)', async () => {
      render(
        <TaskConfigWizard
          task={{
            id: 20,
            taskNumber: 'PRZ-1',
            subsystemId: 5,
            taskType: { code: 'PRZEJAZD' },
            metadata: { subsystemType: 'SMOKIP_A', taskVariant: null },
          } as any}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      await screen.findByText('params-step');

      // Fix 4 nie uruchamia się dla PRZEJAZD
      expect(taskGetById).not.toHaveBeenCalled();
      // getBySubsystem może być wywołane dla logiki isStandaloneNastawnia, ale nie dla Fix 4
      // Ważne: taskGetById nie jest wywoływane
    });
  });
});
