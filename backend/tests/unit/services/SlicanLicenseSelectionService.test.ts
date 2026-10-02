import { AppDataSource } from '../../../src/config/database';
import { SlicanLicenseSpecification } from '../../../src/entities/SlicanLicenseSpecification';
import { SlicanLicenseSelectionService } from '../../../src/services/SlicanLicenseSelectionService';
import { createMockQueryBuilder, createMockRepository } from '../../mocks/database.mock';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: { getRepository: jest.fn() }
}));

describe('SlicanLicenseSelectionService', () => {
  let repository: any;
  let queryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = createMockRepository<SlicanLicenseSpecification>();
    queryBuilder = createMockQueryBuilder<SlicanLicenseSpecification>();
    repository.createQueryBuilder.mockReturnValue(queryBuilder);
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(repository);
  });

  it('selects license packages from active database configurations for requested demand', async () => {
    const licenses = [100, 10, 1].map((packageSize, index) => ({
      id: index + 1,
      warehouseStockId: index + 10,
      licenseType: 'AUDIO',
      packageSize,
      demandField: 'audioDevices',
      isActive: true
    })) as SlicanLicenseSpecification[];
    queryBuilder.getMany.mockResolvedValue(licenses);

    const result = await SlicanLicenseSelectionService.selectLicensesForDemand({
      sipVoipSubscribers: 0,
      audioDevices: 12,
      ivrChannels: 0,
      conferenceChannels: 0
    });

    expect(queryBuilder.where).toHaveBeenCalledWith('sls.is_active = true');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'sls.license_type IN (:...types)', { types: ['AUDIO'] }
    );
    expect(result.licenses).toEqual([
      { warehouseStockId: 12, licenseType: 'AUDIO', packageSize: 1, quantity: 2 },
      { warehouseStockId: 11, licenseType: 'AUDIO', packageSize: 10, quantity: 1 }
    ]);
  });

  it('returns no query results when all license demands are zero', async () => {
    const result = await SlicanLicenseSelectionService.selectLicensesForDemand({
      sipVoipSubscribers: 0,
      audioDevices: 0,
      ivrChannels: 0,
      conferenceChannels: 0
    });

    expect(result).toEqual({ licenses: [], warnings: [] });
    expect(repository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
