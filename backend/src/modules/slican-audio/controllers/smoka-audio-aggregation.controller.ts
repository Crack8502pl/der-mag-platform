import { Request, Response } from 'express';
import {
  SlicanAudioAggregationValidationError,
  SlicanHierarchyAudioNode,
  SmokaAudioAggregationService
} from '../services/smoka-audio-aggregation.service';

export class SmokaAudioAggregationController {
  static aggregate(req: Request, res: Response): void {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      res.status(400).json({ error: 'Nieprawidłowe żądanie agregacji audio.' });
      return;
    }
    const { ownerId, nodes } = req.body as {
      ownerId?: string;
      nodes?: SlicanHierarchyAudioNode[];
    };
    if (!ownerId || !Array.isArray(nodes)) {
      res.status(400).json({ error: 'Wymagane są pola ownerId i nodes.' });
      return;
    }

    try {
      const result = new SmokaAudioAggregationService().aggregateOwner(ownerId, nodes);
      res.json(result);
    } catch (error) {
      if (error instanceof SlicanAudioAggregationValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Błąd agregacji hierarchii audio.' });
    }
  }
}
