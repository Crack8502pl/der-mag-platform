// frontend/src/services/bomResolver.service.ts
import api from './api';

export interface BomResolveRequest {
  subsystemType: string;
  taskType: string;
  taskVariant?: string | null;
  configParams?: Record<string, any>;
  isStandaloneNastawnia?: boolean;
  selectedRecorderId?: number | null;
  retentionDays?: number;
}

export interface ResolvedBomItem {
  templateItemId: number;
  materialName: string;
  catalogNumber?: string | null;
  unit: string;
  resolvedQuantity: number;
  defaultQuantity: number;
  quantitySource: 'FIXED' | 'FROM_CONFIG' | 'PER_UNIT' | 'DEPENDENT';
  configParamName?: string | null;
  groupName?: string | null;
  sortOrder: number;
  isRequired: boolean;
  requiresIp: boolean;
  notes?: string | null;
}

export interface RecorderSpecificationDto {
  id: number;
  modelName: string;
  manufacturer: string;
  minCameras: number;
  maxCameras: number;
  diskSlots: number;
  maxDiskCapacityTb: number;
  catalogNumber?: string | null;
  isActive: boolean;
}

export interface DiskSpecificationDto {
  id: number;
  modelName: string;
  manufacturer: string;
  capacityTb: number;
  catalogNumber?: string | null;
  isActive: boolean;
}

export interface RecorderRecommendation {
  recorder: RecorderSpecificationDto;
  isRecommended: boolean;
  alternatives: RecorderSpecificationDto[];
}

export interface DiskRecommendation {
  diskSpecification: DiskSpecificationDto;
  quantity: number;
  totalCapacityTb: number;
  requiredTb: number;
  isAdequate: boolean;
}

export interface BomResolveResult {
  templateId: number | null;
  templateName: string | null;
  templateVersion: number | null;
  items: ResolvedBomItem[];
  needsRecorder: boolean;
  cameraCount: number;
  recorderRecommendation: RecorderRecommendation | null;
  diskRecommendation: DiskRecommendation | null;
  retentionDays: number;
  isConfigured: boolean;
  resolvedAt: string;
  warnings: string[];
}

export const bomResolverService = {
  async resolve(request: BomResolveRequest): Promise<BomResolveResult> {
    const response = await api.post('/bom-resolver/resolve', request);
    return response.data.data;
  },
  async resolveBulk(requests: BomResolveRequest[]): Promise<BomResolveResult[]> {
    const response = await api.post('/bom-resolver/resolve-bulk', { requests });
    return response.data.data;
  },
  async checkNeedsRecorder(
    subsystemType: string,
    taskType: string,
    isStandaloneNastawnia: boolean = false
  ): Promise<boolean> {
    const response = await api.get('/bom-resolver/needs-recorder', {
      params: { subsystemType, taskType, isStandaloneNastawnia }
    });
    return response.data.data.needsRecorder;
  },
};

export default bomResolverService;
