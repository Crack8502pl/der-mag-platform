import { AppDataSource } from '../../../src/config/database';
import { SlicanCentralSpecification } from '../../../src/entities/SlicanCentralSpecification';
import { SlicanCentralSelectionService } from '../../../src/services/SlicanCentralSelectionService';
import { createMockQueryBuilder, createMockRepository } from '../../mocks/database.mock';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: { getRepository: jest.fn() }
}));

describe('SlicanCentralSelectionService', () => {
  const demand = {
    dphIpDevices: 2,
    audioIpDevices: 3,
    cts220IpDevices: 1,
    ivrChannels: 4,
    conferenceChannels: 5
  };
  let repository: any;
  let queryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = createMockRepository<SlicanCentralSpecification>();
    queryBuilder = createMockQueryBuilder<SlicanCentralSpecification>();
    repository.createQueryBuilder.mockReturnValue(queryBuilder);
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(repository);
  });

  it('queries a central meeting every demand limit and applies the specified deterministic ordering', async () => {
    const selected = { id: 3 } as SlicanCentralSpecification;
    queryBuilder.getOne.mockResolvedValue(selected);

    await expect(SlicanCentralSelectionService.selectCentral(demand, 6)).resolves.toBe(selected);

    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('scs.warehouseStock', 'ws');
    expect(queryBuilder.where).toHaveBeenCalledWith('scs.is_active = true');
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(1,
      'scs.max_sip_voip_subscribers >= :sipVoipSubscribers', { sipVoipSubscribers: 6 });
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(2,
      'scs.max_dph_ip_devices >= :dphIpDevices', { dphIpDevices: demand.dphIpDevices });
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(3,
      'scs.max_audio_ip_devices >= :audioIpDevices', { audioIpDevices: demand.audioIpDevices });
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(4,
      'scs.max_ivr_channels >= :ivrChannels', { ivrChannels: demand.ivrChannels });
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(5,
      'scs.max_conference_channels >= :conferenceChannels', { conferenceChannels: demand.conferenceChannels });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('scs.priority', 'ASC');
    expect(queryBuilder.addOrderBy).toHaveBeenNthCalledWith(1, 'scs.max_sip_voip_subscribers', 'ASC');
    expect(queryBuilder.addOrderBy).toHaveBeenNthCalledWith(2, 'scs.id', 'ASC');
  });

  it('returns null when there is no matching central', async () => {
    queryBuilder.getOne.mockResolvedValue(null);

    await expect(SlicanCentralSelectionService.selectCentral(demand, 6)).resolves.toBeNull();
  });

  it('logs the matching count when selection debugging is enabled', async () => {
    const previous = process.env.DEBUG_RECORDER_SELECTION;
    process.env.DEBUG_RECORDER_SELECTION = 'true';
    queryBuilder.getCount.mockResolvedValue(2);
    queryBuilder.getOne.mockResolvedValue(null);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      await SlicanCentralSelectionService.selectCentral(demand, 6);
      expect(log).toHaveBeenCalledWith(
        '[SlicanCentralSelectionService.selectCentral] selecting central',
        { demand, sipVoipSubscribers: 6, matchingCount: 2 }
      );
    } finally {
      log.mockRestore();
      if (previous === undefined) delete process.env.DEBUG_RECORDER_SELECTION;
      else process.env.DEBUG_RECORDER_SELECTION = previous;
    }
  });

  it('lists only active centrals', async () => {
    const active = [{ id: 1 }] as SlicanCentralSpecification[];
    repository.find.mockResolvedValue(active);

    await expect(SlicanCentralSelectionService.getAllCentrals()).resolves.toBe(active);

    expect(repository.find).toHaveBeenCalledWith({
      where: { isActive: true },
      relations: ['warehouseStock'],
      order: { priority: 'ASC', maxSipVoipSubscribers: 'ASC' }
    });
  });

  it('gets one central specification with its warehouse stock', async () => {
    const central = { id: 7 } as SlicanCentralSpecification;
    repository.findOne.mockResolvedValue(central);

    await expect(SlicanCentralSelectionService.getCentral(7)).resolves.toBe(central);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 7 },
      relations: ['warehouseStock']
    });
  });
});
