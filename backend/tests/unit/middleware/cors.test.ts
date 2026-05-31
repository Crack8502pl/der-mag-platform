import { Request, Response } from 'express';

// ── helpers ──────────────────────────────────────────────────────────────────
// Minimalna implementacja mock cors dla testów — symuluje zachowanie
// express cors middleware bez importowania całej biblioteki.
const mockCorsMiddleware = (
  originValidator: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void
) => {
  return (req: Request, res: Response, next: () => void) => {
    const origin = req.headers.origin;
    originValidator(origin, (err, allow) => {
      if (err || !allow) {
        res.statusCode = 403;
        res.end('Forbidden by CORS');
        return;
      }
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      next();
    });
  };
};

// ── corsOriginValidator (wyekstrahowana z app.ts) ────────────────────────────
// Duplikujemy logikę tutaj aby testować ją w izolacji.
// Przy refactorze app.ts warto wyeksportować corsOriginValidator bezpośrednio.
const buildCorsValidator = (allowedOrigins: string[], nodeEnv: string) => {
  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ): void => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (nodeEnv !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    const isLocalNetwork = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(origin);
    if (isLocalNetwork) return callback(null, true);
    const isInternalDomain = /^https?:\/\/[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.(lan|local|internal|home|corp|intranet|private)(:[1-9]\d{0,4})?$/.test(origin);
    if (isInternalDomain) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  };
};

// ── testy ────────────────────────────────────────────────────────────────────
describe('corsOriginValidator', () => {
  const allowedOrigins = ['https://app.example.com', 'https://admin.example.com'];

  describe('development (NODE_ENV=development)', () => {
    const validator = buildCorsValidator(allowedOrigins, 'development');

    it('akceptuje origin z allowlist', (done) => {
      validator('https://app.example.com', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('akceptuje brak originu (curl, Postman, same-origin)', (done) => {
      validator(undefined, (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('akceptuje localhost z dowolnym portem w development', (done) => {
      validator('http://localhost:5173', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('akceptuje adres LAN (192.168.x.x)', (done) => {
      validator('http://192.168.1.100:3000', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('akceptuje adres LAN (10.x.x.x)', (done) => {
      validator('http://10.0.0.5:8080', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('akceptuje domenę wewnętrzną (.local)', (done) => {
      validator('http://server.local:3000', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('akceptuje domenę wewnętrzną (.lan)', (done) => {
      validator('http://nas.lan', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('odrzuca zewnętrzną domenę spoza allowlist', (done) => {
      validator('https://evil.com', (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err?.message).toBe('Not allowed by CORS');
        done();
      });
    });

    it('odrzuca zewnętrzną domenę z podobną nazwą (typosquatting)', (done) => {
      validator('https://app.example.com.evil.io', (err) => {
        expect(err).toBeInstanceOf(Error);
        done();
      });
    });
  });

  describe('production (NODE_ENV=production)', () => {
    const validator = buildCorsValidator(allowedOrigins, 'production');

    it('akceptuje origin z allowlist w produkcji', (done) => {
      validator('https://app.example.com', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('odrzuca localhost w produkcji', (done) => {
      validator('http://localhost:5173', (err) => {
        expect(err).toBeInstanceOf(Error);
        done();
      });
    });

    it('nadal akceptuje LAN w produkcji (wewnętrzny deployment)', (done) => {
      validator('http://192.168.1.50:3000', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('odrzuca zewnętrzną domenę w produkcji', (done) => {
      validator('https://attacker.com', (err) => {
        expect(err).toBeInstanceOf(Error);
        done();
      });
    });
  });
});
