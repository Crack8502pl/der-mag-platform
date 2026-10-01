import api from './api';
import type {
  SlicanCentralSpecification,
  SlicanCentralSpecificationDTO,
  SlicanAudioAggregate,
  SlicanHierarchyAudioNode,
  SlicanLicenseSpecification,
  SlicanLicenseSpecificationDTO
} from '../types/slicanAudio.types';

export const slicanAudioService = {
  async aggregateSmokAAudio(
    ownerId: string,
    nodes: SlicanHierarchyAudioNode[]
  ): Promise<{ aggregate: SlicanAudioAggregate; warnings: string[] }> {
    const response = await api.post('/smoka/audio/aggregate', { ownerId, nodes });
    return response.data;
  },

  async getCentrals(): Promise<SlicanCentralSpecification[]> {
    const response = await api.get('/slican-central-specifications');
    return response.data.data || [];
  },

  async createCentral(data: SlicanCentralSpecificationDTO): Promise<SlicanCentralSpecification> {
    const response = await api.post('/slican-central-specifications', data);
    return response.data.data;
  },

  async updateCentral(id: number, data: SlicanCentralSpecificationDTO): Promise<SlicanCentralSpecification> {
    const response = await api.put(`/slican-central-specifications/${id}`, data);
    return response.data.data;
  },

  async deleteCentral(id: number): Promise<void> {
    await api.delete(`/slican-central-specifications/${id}`);
  },

  async getLicenses(): Promise<SlicanLicenseSpecification[]> {
    const response = await api.get('/slican-license-specifications');
    return response.data.data || [];
  },

  async createLicense(data: SlicanLicenseSpecificationDTO): Promise<SlicanLicenseSpecification> {
    const response = await api.post('/slican-license-specifications', data);
    return response.data.data;
  },

  async updateLicense(id: number, data: SlicanLicenseSpecificationDTO): Promise<SlicanLicenseSpecification> {
    const response = await api.put(`/slican-license-specifications/${id}`, data);
    return response.data.data;
  },

  async deleteLicense(id: number): Promise<void> {
    await api.delete(`/slican-license-specifications/${id}`);
  }
};

export default slicanAudioService;
