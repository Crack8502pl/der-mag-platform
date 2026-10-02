import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { SlicanVoipSubscriberFormula } from '../entities/SlicanVoipSubscriberFormula';
import { SlicanCentralSelectionService } from '../services/SlicanCentralSelectionService';
import { SlicanLicenseSelectionService } from '../services/SlicanLicenseSelectionService';
import {
  calculateVoipSubscribers,
  defaultMultipliers,
  MissingLicensePackagesError,
  SlicanAudioDemand
} from '../services/SlicanAudioService';

class InvalidDemandError extends Error {}

function object(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidDemandError('Expected an object');
  }
  return value as Record<string, any>;
}

function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export class SlicanCentralSpecificationController {
  static async selectForDemand(req: Request, res: Response): Promise<void> {
    try {
      let raw: Record<string, any>;
      try {
        raw = object(JSON.parse(String(req.query.demand)));
      } catch {
        throw new InvalidDemandError('Invalid demand JSON');
      }

      const aliases: Record<string, string> = {
        dphIp: 'dphIpDevices',
        audioIp: 'audioIpDevices',
        cts220Ip: 'cts220IpDevices',
        ivr: 'ivrChannels',
        conf: 'conferenceChannels'
      };
      const parsed: Record<string, unknown> = { ...raw };
      for (const [short, long] of Object.entries(aliases)) {
        if (short in raw) {
          if (long in raw) throw new InvalidDemandError(`Duplicate demand field: ${long}`);
          parsed[long] = raw[short];
          delete parsed[short];
        }
      }
      const keys = Object.values(aliases);
      if (Object.keys(parsed).some(key => !keys.includes(key)) || keys.some(key => !integer(parsed[key]))) {
        throw new InvalidDemandError('Demand must contain five non-negative integer fields');
      }

      const demand = parsed as unknown as SlicanAudioDemand;
      const formula = await AppDataSource.getRepository(SlicanVoipSubscriberFormula).findOneBy({ id: 1 });
      const sipVoipSubscribers = calculateVoipSubscribers(demand, formula ?? defaultMultipliers);
      if (!Number.isSafeInteger(sipVoipSubscribers)) {
        throw new InvalidDemandError('Calculated demand is too large');
      }
      const central = await SlicanCentralSelectionService.selectCentral(demand, sipVoipSubscribers);
      const warnings: string[] = [];
      if (!central) {
        const centrals = await SlicanCentralSelectionService.getAllCentrals();
        warnings.push(centrals.length > 0 ? 'No central fits demand' : 'No active central configuration');
      }
      const result = await SlicanLicenseSelectionService.selectLicensesForDemand({
        sipVoipSubscribers,
        audioDevices: demand.audioIpDevices,
        ivrChannels: demand.ivrChannels,
        conferenceChannels: demand.conferenceChannels
      });
      res.json({ central, sipVoipSubscribers, licenses: result.licenses, warnings: [...warnings, ...result.warnings] });
    } catch (error) {
      if (error instanceof InvalidDemandError) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error instanceof MissingLicensePackagesError) {
        res.status(422).json({ error: error.message });
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error selecting Slican central:', error);
      res.status(500).json({ error: 'Failed to select Slican central', message });
    }
  }
}
