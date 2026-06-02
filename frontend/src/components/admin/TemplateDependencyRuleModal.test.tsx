import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BomTemplateDependencyRule } from '../../services/bomTemplateDependencyRule.service';
import type { BomSubsystemTemplateItem } from '../../services/bomSubsystemTemplate.service';
import { TemplateDependencyRuleModal } from './TemplateDependencyRuleModal';

const templateItems: BomSubsystemTemplateItem[] = [
  {
    id: 1,
    templateId: 1,
    materialName: 'Kamera testowa',
    unit: 'szt.',
    defaultQuantity: 1,
    quantitySource: 'FIXED',
    requiresIp: false,
    isRequired: true,
    sortOrder: 0
  }
];

const baseRule: BomTemplateDependencyRule = {
  id: 10,
  templateId: 1,
  ruleName: 'Reguła testowa',
  evaluationOrder: 1,
  aggregationType: 'SUM',
  mathOperation: 'NONE',
  targetItemId: 1,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  inputs: [
    {
      inputType: 'ITEM',
      sourceItemId: 1,
      sourceRuleId: null,
      sourceParamName: null,
      onlyIfSelected: true,
      inputMultiplier: 1,
      sortOrder: 0
    }
  ],
  conditions: []
};

describe('TemplateDependencyRuleModal CONFIG_PARAM onlyIfSelected behavior', () => {
  it('resets onlyIfSelected when switching input type to CONFIG_PARAM', () => {
    const { container } = render(
      <TemplateDependencyRuleModal
        templateId={1}
        templateItems={templateItems}
        existingRules={[]}
        rule={baseRule}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const typeSelect = container.querySelector('select') as HTMLSelectElement;
    const checkbox = container.querySelector('#onlyIfSelected-0') as HTMLInputElement;

    expect(typeSelect).toBeTruthy();
    expect(checkbox.checked).toBe(true);

    fireEvent.change(typeSelect, { target: { value: 'CONFIG_PARAM' } });
    expect(screen.getByText('N/D')).toBeInTheDocument();

    fireEvent.change(typeSelect, { target: { value: 'ITEM' } });
    const checkboxAfter = container.querySelector('#onlyIfSelected-0') as HTMLInputElement;
    expect(checkboxAfter.checked).toBe(false);
  });
});
