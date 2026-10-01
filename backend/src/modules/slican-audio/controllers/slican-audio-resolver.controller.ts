import { Request, Response } from 'express';
import { SlicanAudioDemand } from '../../../services/SlicanAudioService';
import { SlicanAudioResolverService } from '../services/slican-audio-resolver.service';

const demandFields: Array<keyof SlicanAudioDemand> = [
  'dphIpDevices',
  'audioIpDevices',
  'cts220IpDevices',
  'ivrChannels',
  'conferenceChannels'
];

export class SlicanAudioResolverController {
  static async resolve(req: Request, res: Response): Promise<void> {
    const demand = req.body as SlicanAudioDemand;
    if (!demand || typeof demand !== 'object' || Array.isArray(demand) ||
        Object.keys(demand).length !== demandFields.length ||
        Object.keys(demand).some(field => !demandFields.includes(field as keyof SlicanAudioDemand)) ||
        demandFields.some(field => !Number.isSafeInteger(demand[field]) || demand[field] < 0)) {
      res.status(400).json({ error: 'Nieprawidłowe zapotrzebowanie audio.' });
      return;
    }

    try {
      const { centralRecommendation, licenses, warnings } =
        await new SlicanAudioResolverService().resolveForSmokA(demand);
      res.json({ centralRecommendation, licenses, warnings });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Błąd rozwiązywania Slican audio.';
      res.status(error instanceof RangeError ? 422 : 500).json({ error: message });
    }
  }
}
