export type SlicanLicenseType = 'VOIP_SUBSCRIBER' | 'AUDIO' | 'IVR' | 'CONFERENCE';
export type SlicanLicensePackageSize = 1 | 10 | 100;
export type SlicanLicenseDemandField = 'sipVoipSubscribers' | 'audioDevices' | 'ivrChannels' | 'conferenceChannels';

export interface SlicanAudioAggregate {
  dphIpDevices: number;
  audioIpDevices: number;
  cts220IpDevices: number;
  ivrChannels: number;
  conferenceChannels: number;
}

export interface SlicanHierarchyAudioNode {
  id: string;
  type: 'LCS' | 'Nastawnia' | 'Przejazd' | 'SKP' | 'Point';
  parentId?: string;
  ownerId?: string;
  items: Array<{
    id?: string;
    deviceId?: string;
    deviceType: 'DPH_IP' | 'AUDIO_IP' | 'CTS220_IP' | 'IVR' | 'CONFERENCE';
    quantity: number;
  }>;
}

export interface SlicanCentralSpecification {
  id: number;
  warehouseStockId: number;
  warehouseStock?: {
    id: number;
    catalogNumber: string;
    materialName: string;
  };
  modelName: string;
  maxSipVoipSubscribers: number;
  maxDphIpDevices: number;
  maxAudioIpDevices: number;
  maxIvrChannels: number;
  maxConferenceChannels: number;
  priority: number;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SlicanCentralSpecificationDTO = Pick<
  SlicanCentralSpecification,
  | 'warehouseStockId'
  | 'modelName'
  | 'maxSipVoipSubscribers'
  | 'maxDphIpDevices'
  | 'maxAudioIpDevices'
  | 'maxIvrChannels'
  | 'maxConferenceChannels'
  | 'priority'
  | 'isActive'
> & { notes?: string | null };

export interface SlicanLicenseSpecification {
  id: number;
  warehouseStockId: number;
  warehouseStock?: {
    id: number;
    catalogNumber: string;
    materialName: string;
  };
  licenseType: SlicanLicenseType;
  packageSize: SlicanLicensePackageSize;
  demandField: SlicanLicenseDemandField;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export type SlicanLicenseSpecificationDTO = Pick<
  SlicanLicenseSpecification,
  'warehouseStockId' | 'licenseType' | 'packageSize' | 'demandField' | 'isActive' | 'priority'
>;
