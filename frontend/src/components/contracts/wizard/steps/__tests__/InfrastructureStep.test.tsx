import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InfrastructureForm, InfrastructureStep, PolesOverviewTable } from '../InfrastructureStep';
import type { GeneratedTask, InfrastructureData, WizardData } from '../../types/wizard.types';

const mockGenerateAllTasks = vi.fn();
const mockRequiresCabinetCompletion = vi.fn();

vi.mock('../../utils/taskGenerator', () => ({
  generateAllTasks: (...args: unknown[]) => mockGenerateAllTasks(...args),
}));

vi.mock('../../../../../config/taskTypes', () => ({
  requiresCabinetCompletion: (...args: unknown[]) => mockRequiresCabinetCompletion(...args),
}));

vi.mock('../../PoleSearchModal', () => ({
  PoleSearchModal: () => <div>Mock PoleSearchModal</div>,
}));

const createTask = (overrides: Partial<GeneratedTask> = {}): GeneratedTask => ({
  number: '',
  name: 'Zadanie testowe',
  type: 'SMOKIP_A',
  subsystemType: 'SMOKIP_A',
  ...overrides,
} as GeneratedTask);

const createWizardData = (infrastructure?: InfrastructureData): WizardData => ({
  contractNumber: 'C-1',
  customName: 'Test',
  orderDate: '2026-01-01',
  projectManagerId: '1',
  managerCode: 'M1',
  subsystems: [],
  infrastructure,
});

describe('InfrastructureStep', () => {
  beforeEach(() => {
    mockGenerateAllTasks.mockReset();
    mockRequiresCabinetCompletion.mockReset();
    mockRequiresCabinetCompletion.mockReturnValue(false);
  });

  it('PolesOverviewTable — tytuł "Podsumowanie"', () => {
    render(
      <PolesOverviewTable
        allTasks={[createTask()]}
        infrastructure={{ perTask: { 'SMOKIP_A-0': { cabinetType: '42U' } } }}
      />
    );

    expect(screen.getByRole('heading', { name: '📋 Podsumowanie' })).toBeInTheDocument();
  });

  it('PolesOverviewTable — wiersz pojawia się gdy cabinetType ustawiony bez poles', () => {
    render(
      <PolesOverviewTable
        allTasks={[createTask()]}
        infrastructure={{ perTask: { 'SMOKIP_A-0': { cabinetType: '42U' } } }}
      />
    );

    expect(screen.getByText('Zadanie testowe')).toBeInTheDocument();
    expect(screen.getByText('42U')).toBeInTheDocument();
    expect(screen.getByText('Brak słupów')).toBeInTheDocument();
  });

  it('PolesOverviewTable — wiersz pojawia się gdy cabinetType + poles', () => {
    render(
      <PolesOverviewTable
        allTasks={[createTask()]}
        infrastructure={{
          perTask: {
            'SMOKIP_A-0': {
              cabinetType: 'KONTENER',
              poles: [{ type: 'STALOWY', quantity: '3', productInfo: 'CAT-1 | Słup' }],
            },
          },
        }}
      />
    );

    expect(screen.getByText('KONTENER')).toBeInTheDocument();
    expect(screen.getByText('STALOWY')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('CAT-1 | Słup')).toBeInTheDocument();
  });

  it('PolesOverviewTable — brak wiersza gdy brak cabinetType i brak poles', () => {
    const { container } = render(
      <PolesOverviewTable
        allTasks={[createTask()]}
        infrastructure={{ perTask: { 'SMOKIP_A-0': {} } }}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('InfrastructureForm — sekcja słupów ukryta dla LCS', () => {
    render(<InfrastructureForm data={{}} taskType="LCS" onChange={vi.fn()} />);

    expect(screen.getByText('Słupy nie dotyczą tego typu zadania.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '➕ Dodaj typ słupa' })).not.toBeInTheDocument();
  });

  it('InfrastructureForm — sekcja słupów ukryta dla NASTAWNIA', () => {
    render(<InfrastructureForm data={{}} taskType="NASTAWNIA" onChange={vi.fn()} />);

    expect(screen.getByText('Słupy nie dotyczą tego typu zadania.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '➕ Dodaj typ słupa' })).not.toBeInTheDocument();
  });

  it('InfrastructureForm — sekcja słupów widoczna dla SMOKIP_A', () => {
    render(<InfrastructureForm data={{}} taskType="SMOKIP_A" onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: '➕ Dodaj typ słupa' })).toBeInTheDocument();
    expect(screen.queryByText('Słupy nie dotyczą tego typu zadania.')).not.toBeInTheDocument();
  });

  it('InfrastructureStep — kliknięcie nagłówka zwija kartę', () => {
    mockGenerateAllTasks.mockReturnValue([createTask()]);
    const { container } = render(
      <InfrastructureStep
        wizardData={createWizardData()}
        onUpdate={vi.fn()}
        onUpdateTaskInfrastructure={vi.fn()}
      />
    );

    expect(screen.getAllByRole('combobox')).toHaveLength(1);

    fireEvent.click(container.querySelector('.per-task-card-header') as HTMLElement);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('InfrastructureStep — ponowne kliknięcie nagłówka rozwija kartę', () => {
    mockGenerateAllTasks.mockReturnValue([createTask()]);
    const { container } = render(
      <InfrastructureStep
        wizardData={createWizardData()}
        onUpdate={vi.fn()}
        onUpdateTaskInfrastructure={vi.fn()}
      />
    );

    const header = container.querySelector('.per-task-card-header') as HTMLElement;
    fireEvent.click(header);
    fireEvent.click(header);

    expect(screen.getAllByRole('combobox')).toHaveLength(1);
  });
});
