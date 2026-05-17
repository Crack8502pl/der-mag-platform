export interface SlackTextObject {
  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean;
}

export interface SlackBlock {
  type: 'header' | 'section' | 'divider' | 'context' | 'actions';
  text?: SlackTextObject;
  fields?: SlackTextObject[];
  elements?: SlackTextObject[];
  accessory?: Record<string, unknown>;
  block_id?: string;
}

export interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
  username?: string;
  icon_emoji?: string;
}

export interface SlackSendResult {
  success: boolean;
  error?: string;
  statusCode?: number;
}

export interface SlackStockCriticalPayload {
  materialName: string;
  catalogNumber: string;
  unit: string;
  warehouseLocation: string;
  supplier?: string;
  stockUrl: string;
}

export interface SlackStockLowPayload {
  materialName: string;
  catalogNumber: string;
  currentStock: number;
  minStockLevel: number;
  unit: string;
  warehouseLocation: string;
  stockUrl: string;
}

export interface SlackStockDigestPayload {
  date: string;
  totalAlerts: number;
  criticalCount: number;
  lowCount: number;
  warehouseUrl: string;
}

export interface SlackContractPayload {
  contractNumber: string;
  customName: string;
  projectManager: string;
  contractUrl: string;
  reason?: string;
  daysRemaining?: number;
}

export interface SlackPrefabricationPayload {
  subsystemNumber: string;
  contractNumber: string;
  deviceCount: number;
  completedAt?: string;
}

export interface SlackImportPayload {
  imported: number;
  updated: number;
  failed: number;
  successRate: number;
  warehouseUrl: string;
}
