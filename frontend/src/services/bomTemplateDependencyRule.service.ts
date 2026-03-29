// src/services/bomTemplateDependencyRule.service.ts
// API client for BOM template dependency rule operations

import api from './api';

export interface BomTemplateDependencyRule {
  id: number;
  templateId: number;
  ruleName: string;
  ruleCode?: string | null;
  description?: string | null;
  evaluationOrder: number;
  aggregationType: 'SUM' | 'COUNT' | 'MIN' | 'MAX' | 'PRODUCT' | 'FIRST' | 'SELECT_RECORDER' | 'SELECT_DISKS';
  mathOperation: 'NONE' | 'FLOOR_DIV' | 'MODULO' | 'ADD' | 'SUBTRACT' | 'MULTIPLY' | 'CEIL_DIV' | 'ROUND_DIV' | 'CALCULATE_STORAGE';
  mathOperand?: number | null;
  targetItemId: number;
  isActive: boolean;
  targetWarehouseCategory?: string | null;
  selectionCriteria?: Record<string, unknown> | null;
  storageDaysParam?: string | null;
  storageBitrateMbps?: number;
  inputs?: BomTemplateDependencyRuleInput[];
  conditions?: BomTemplateDependencyRuleCondition[];
  targetItem?: any; // Full template item if loaded
  createdAt: string;
  updatedAt: string;
}

export interface BomTemplateDependencyRuleInput {
  id?: number;
  ruleId?: number;
  inputType: 'ITEM' | 'RULE_RESULT';
  sourceItemId?: number | null;
  sourceRuleId?: number | null;
  onlyIfSelected: boolean;
  inputMultiplier: number;
  sortOrder: number;
  sourceItem?: any; // Full template item if loaded
  sourceRule?: any; // Full rule if loaded
}

export interface BomTemplateDependencyRuleCondition {
  id?: number;
  ruleId?: number;
  conditionOrder: number;
  comparisonOperator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'BETWEEN';
  compareValue: number;
  compareValueMax?: number | null;
  resultValue: number;
  description?: string | null;
}

export interface CreateRuleDto {
  templateId: number;
  ruleName: string;
  ruleCode?: string;
  description?: string;
  evaluationOrder?: number;
  aggregationType: string;
  mathOperation: string;
  mathOperand?: number;
  targetItemId: number;
  isActive?: boolean;
  targetWarehouseCategory?: string;
  selectionCriteria?: Record<string, unknown>;
  storageDaysParam?: string;
  storageBitrateMbps?: number;
  inputs?: Omit<BomTemplateDependencyRuleInput, 'id' | 'ruleId'>[];
  conditions?: Omit<BomTemplateDependencyRuleCondition, 'id' | 'ruleId'>[];
}

export interface UpdateRuleDto extends Partial<CreateRuleDto> {}

export const bomTemplateDependencyRuleService = {
  /**
   * Get all rules for a specific template
   */
  async getRulesForTemplate(templateId: number): Promise<BomTemplateDependencyRule[]> {
    const response = await api.get(`/bom-template-dependency-rules/template/${templateId}`);
    return response.data.data || [];
  },

  /**
   * Get a single rule by ID
   */
  async getRule(id: number): Promise<BomTemplateDependencyRule> {
    const response = await api.get(`/bom-template-dependency-rules/${id}`);
    return response.data.data;
  },

  /**
   * Create a new rule
   */
  async createRule(data: CreateRuleDto): Promise<BomTemplateDependencyRule> {
    const response = await api.post('/bom-template-dependency-rules', data);
    return response.data.data;
  },

  /**
   * Update an existing rule
   */
  async updateRule(id: number, data: UpdateRuleDto): Promise<BomTemplateDependencyRule> {
    const response = await api.put(`/bom-template-dependency-rules/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete a rule
   */
  async deleteRule(id: number): Promise<void> {
    await api.delete(`/bom-template-dependency-rules/${id}`);
  }
};

export default bomTemplateDependencyRuleService;
