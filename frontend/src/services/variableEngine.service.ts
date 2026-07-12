import api from './api';

export interface VariableEngineVariable {
  expression: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  provider: string;
  usableInBom: boolean;
}

export const variableEngineService = {
  async listVariables(): Promise<VariableEngineVariable[]> {
    const response = await api.get('/variable-engine/variables');
    return response.data.data;
  },
};

export default variableEngineService;
