import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const getTemplateFor = vi.fn();
const getAllGroups = vi.fn();
const resolveBom = vi.fn();

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
    update: vi.fn()
  }
}));

vi.mock('../../../services/bomResolver.service', () => ({
  default: {
    resolve: (...args: unknown[]) => resolveBom(...args)
  }
}));

vi.mock('../../../services/taskRelationship.service', () => ({
  default: {
    getBySubsystem: vi.fn().mockResolvedValue([])
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

describe('TaskConfigWizard', () => {
  it('blocks next button on BOM step when templateMissing=true', async () => {
    getAllGroups.mockResolvedValue([]);
    getTemplateFor.mockResolvedValue({
      id: 1,
      templateName: 'BOM',
      subsystemType: 'SMOKIP_A',
      taskVariant: null,
      version: 1,
      isActive: true,
      items: []
    });
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
});
