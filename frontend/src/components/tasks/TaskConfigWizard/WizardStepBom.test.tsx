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

  it('shows the Slican audio aggregate and central recommendation separately from cameras', () => {
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
          cameraCount: 7,
          cameraBreakdown: { total: 7, ogolna: 7, lpr: 0, skp: 0 },
          audioBreakdown: {
            dphIpDevices: 2,
            audioIpDevices: 3,
            cts220IpDevices: 1,
            ivrChannels: 4,
            conferenceChannels: 5,
          },
          audioHierarchySummary: [{
            nodeId: 'crossing-1',
            nodeType: 'Przejazd',
            aggregate: {
              dphIpDevices: 2,
              audioIpDevices: 3,
              cts220IpDevices: 1,
              ivrChannels: 4,
              conferenceChannels: 5,
            },
          }],
          centralRecommendation: { warehouseStockId: 42, modelName: 'NCP-CM300P' },
          licenses: [],
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

    expect(screen.getByRole('region', { name: 'Audio / Slican' })).toHaveTextContent('DPH.IP: 2');
    expect(screen.getByRole('region', { name: 'Audio / Slican' })).toHaveTextContent('Razem: 15');
    expect(screen.getByRole('region', { name: 'Audio / Slican' })).toHaveTextContent('NCP-CM300P');
    expect(screen.getByRole('region', { name: 'Audio / Slican' })).toHaveTextContent('Przejazd (crossing-1)');
    expect(screen.getByText('📷 Wykryte kamery: 7')).toBeInTheDocument();
  });
});
