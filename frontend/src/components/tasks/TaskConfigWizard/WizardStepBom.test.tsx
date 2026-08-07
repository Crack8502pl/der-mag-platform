import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WizardStepBom } from './WizardStepBom';

describe('WizardStepBom', () => {
  it('shows templateMissing alert when template is missing', () => {
    render(
      <WizardStepBom
        resolvedBom={{
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
          retentionDays: 14,
          isConfigured: false,
          resolvedAt: new Date().toISOString(),
          warnings: [],
        } as any}
        bomGroups={[]}
      />
    );

    expect(screen.getByText(/Brak szablonu BOM dla tego zadania/i)).toBeInTheDocument();
  });

  it('does not show templateMissing alert when templateMissing is false and items are empty', () => {
    render(
      <WizardStepBom
        resolvedBom={{
          templateId: 1,
          templateName: 'BOM',
          templateVersion: 1,
          templateMissing: false,
          subsystemType: 'SMOKIP_A',
          items: [],
          needsRecorder: false,
          cameraCount: 0,
          recorderRecommendation: null,
          diskRecommendation: null,
          retentionDays: 14,
          isConfigured: false,
          resolvedAt: new Date().toISOString(),
          warnings: [],
        } as any}
        bomGroups={[]}
      />
    );

    expect(screen.queryByText(/Brak szablonu BOM dla tego zadania/i)).not.toBeInTheDocument();
  });
});
