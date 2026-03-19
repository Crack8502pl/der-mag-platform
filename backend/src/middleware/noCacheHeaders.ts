// src/middleware/noCacheHeaders.ts
// Middleware wyłączający cache HTTP dla odpowiedzi API

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware dodający nagłówki HTTP wyłączające cachowanie.
 * Stosowany dla endpointów API zwracających dynamiczne dane,
 * aby zapobiec problemom z nieaktualnymi danymi (304 Not Modified).
 */
export const noCacheHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Wyłącz cache dla odpowiedzi
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache'); // Dla starszych przeglądarek (HTTP/1.0)
  res.setHeader('Expires', '0'); // Dla proxy serwerów
  next();
};
