import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WizardStepCameras } from './WizardStepCameras';

describe('WizardStepCameras', () => {
  it('renders totals, estimated poles and storage', () => {
    render(
      <WizardStepCameras
        cameraRows={[
          { type: 'Ogólna', quantity: 5, quantityPerPole: 2 },
          { type: 'LPR', quantity: 2, quantityPerPole: 1 },
          { type: 'SKP', quantity: 1, quantityPerPole: 1 },
        ]}
        retentionDays={30}
        onCameraRowsChange={vi.fn()}
        onRetentionDaysChange={vi.fn()}
      />
    );

    expect(screen.getByText('Łącznie kamer')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText(/~10.4 TB/)).toBeInTheDocument();
  });

  it('emits row and retention changes', () => {
    const handleRowsChange = vi.fn();
    const handleRetentionChange = vi.fn();

    render(
      <WizardStepCameras
        cameraRows={[
          { type: 'Ogólna', quantity: 0, quantityPerPole: 2 },
          { type: 'LPR', quantity: 0, quantityPerPole: 1 },
          { type: 'SKP', quantity: 0, quantityPerPole: 1 },
        ]}
        retentionDays={30}
        onCameraRowsChange={handleRowsChange}
        onRetentionDaysChange={handleRetentionChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Ogólna ilość'), { target: { value: '7' } });
    expect(handleRowsChange).toHaveBeenCalledWith([
      { type: 'Ogólna', quantity: 7, quantityPerPole: 2 },
      { type: 'LPR', quantity: 0, quantityPerPole: 1 },
      { type: 'SKP', quantity: 0, quantityPerPole: 1 },
    ]);

    fireEvent.change(screen.getByLabelText('Dni retencji'), { target: { value: '45' } });
    expect(handleRetentionChange).toHaveBeenCalledWith(45);
  });
});
