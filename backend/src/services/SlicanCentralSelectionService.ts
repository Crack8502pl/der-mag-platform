import { AppDataSource } from '../config/database';
import { SlicanCentralSpecification } from '../entities/SlicanCentralSpecification';
import { SlicanAudioDemand } from './SlicanAudioService';

export class SlicanCentralSelectionService {
  static async selectCentral(
    demand: SlicanAudioDemand,
    sipVoipSubscribers: number
  ): Promise<SlicanCentralSpecification | null> {
    const repo = AppDataSource.getRepository(SlicanCentralSpecification);
    const baseQuery = repo
      .createQueryBuilder('scs')
      .leftJoinAndSelect('scs.warehouseStock', 'ws')
      .where('scs.is_active = true')
      .andWhere('scs.max_sip_voip_subscribers >= :sipVoipSubscribers', { sipVoipSubscribers })
      .andWhere('scs.max_dph_ip_devices >= :dphIpDevices', { dphIpDevices: demand.dphIpDevices })
      .andWhere('scs.max_audio_ip_devices >= :audioIpDevices', { audioIpDevices: demand.audioIpDevices })
      .andWhere('scs.max_ivr_channels >= :ivrChannels', { ivrChannels: demand.ivrChannels })
      .andWhere('scs.max_conference_channels >= :conferenceChannels', { conferenceChannels: demand.conferenceChannels })
      .orderBy('scs.priority', 'ASC')
      .addOrderBy('scs.max_sip_voip_subscribers', 'ASC')
      .addOrderBy('scs.id', 'ASC');

    if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_RECORDER_SELECTION === 'true') {
      const matchingCount = await baseQuery.getCount();
      console.log('[SlicanCentralSelectionService.selectCentral] selecting central', {
        demand,
        sipVoipSubscribers,
        matchingCount
      });
    }

    return baseQuery.getOne();
  }

  static async getAllCentrals(): Promise<SlicanCentralSpecification[]> {
    const repo = AppDataSource.getRepository(SlicanCentralSpecification);
    return repo.find({
      where: { isActive: true },
      relations: ['warehouseStock'],
      order: { priority: 'ASC', maxSipVoipSubscribers: 'ASC' }
    });
  }

  static async getCentral(id: number): Promise<SlicanCentralSpecification | null> {
    const repo = AppDataSource.getRepository(SlicanCentralSpecification);
    return repo.findOne({ where: { id }, relations: ['warehouseStock'] });
  }
}
