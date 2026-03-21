// tests/unit/services/GoogleMapsService.test.ts
import { GoogleMapsService } from '../../../src/services/GoogleMapsService';

jest.mock('../../../src/utils/logger', () => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('GoogleMapsService', () => {
  let service: GoogleMapsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GoogleMapsService();
  });

  describe('validateCoordinates', () => {
    it('should return true for valid coordinates', () => {
      expect(service.validateCoordinates(52.2297, 21.0122)).toBe(true);
    });

    it('should return false for lat > 90', () => {
      expect(service.validateCoordinates(91, 21)).toBe(false);
    });

    it('should return false for lat < -90', () => {
      expect(service.validateCoordinates(-91, 21)).toBe(false);
    });

    it('should return false for lon > 180', () => {
      expect(service.validateCoordinates(52, 181)).toBe(false);
    });

    it('should return false for lon < -180', () => {
      expect(service.validateCoordinates(52, -181)).toBe(false);
    });

    it('should return false for NaN', () => {
      expect(service.validateCoordinates(NaN, 21)).toBe(false);
    });

    it('should accept boundary values', () => {
      expect(service.validateCoordinates(90, 180)).toBe(true);
      expect(service.validateCoordinates(-90, -180)).toBe(true);
    });
  });

  describe('isShortUrl', () => {
    it('should detect goo.gl/maps URL', () => {
      expect(service.isShortUrl('https://goo.gl/maps/abc123')).toBe(true);
    });

    it('should detect maps.app.goo.gl URL', () => {
      expect(service.isShortUrl('https://maps.app.goo.gl/abc123')).toBe(true);
    });

    it('should return false for full Google Maps URL', () => {
      expect(service.isShortUrl('https://www.google.com/maps?q=52.2297,21.0122')).toBe(false);
    });

    it('should return false for non-maps URL', () => {
      expect(service.isShortUrl('https://example.com')).toBe(false);
    });
  });

  describe('parseUrl', () => {
    it('should parse q= format coordinates', () => {
      const result = service.parseUrl('https://www.google.com/maps?q=52.2297,21.0122');
      expect(result).toEqual({ lat: 52.2297, lon: 21.0122 });
    });

    it('should parse @lat,lon format', () => {
      const result = service.parseUrl('https://www.google.com/maps/@52.2297,21.0122,17z');
      expect(result).toEqual({ lat: 52.2297, lon: 21.0122 });
    });

    it('should return null for invalid URL', () => {
      const result = service.parseUrl('https://example.com');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = service.parseUrl('');
      expect(result).toBeNull();
    });

    it('should return null for URL with invalid coordinates', () => {
      const result = service.parseUrl('https://www.google.com/maps?q=200,400');
      expect(result).toBeNull();
    });
  });

  describe('parseUrlFull', () => {
    it('should return full parse result with query format', () => {
      const result = service.parseUrlFull('https://www.google.com/maps?q=52.2297,21.0122');
      expect(result.coordinates).toEqual({ lat: 52.2297, lon: 21.0122 });
      expect(result.parseMethod).toBe('query');
      expect(result.isShortened).toBe(false);
      expect(result.originalUrl).toBe('https://www.google.com/maps?q=52.2297,21.0122');
    });

    it('should return full parse result with at-sign format', () => {
      const result = service.parseUrlFull('https://www.google.com/maps/@52.2297,21.0122,17z');
      expect(result.coordinates).toEqual({ lat: 52.2297, lon: 21.0122 });
      expect(result.parseMethod).toBe('at-sign');
    });

    it('should return place parseMethod for place URLs', () => {
      const result = service.parseUrlFull('https://www.google.com/maps/place/Warsaw/@52.2297,21.0122,15z');
      expect(result.parseMethod).toBe('place');
    });

    it('should return none parseMethod when no coordinates found', () => {
      const result = service.parseUrlFull('https://example.com/page');
      expect(result.coordinates).toBeNull();
      expect(result.parseMethod).toBe('none');
    });

    it('should handle empty URL', () => {
      const result = service.parseUrlFull('');
      expect(result.coordinates).toBeNull();
      expect(result.parseMethod).toBe('none');
    });
  });

  describe('generateNavigationUrl', () => {
    it('should generate URL with destination only', () => {
      const url = service.generateNavigationUrl({ lat: 52.2297, lon: 21.0122 });
      expect(url).toContain('maps/dir/');
      expect(url).toContain('destination=52.2297%2C21.0122');
    });

    it('should generate URL with origin and destination', () => {
      const url = service.generateNavigationUrl(
        { lat: 52.2297, lon: 21.0122 },
        { lat: 50.0, lon: 20.0 }
      );
      expect(url).toContain('origin=50%2C20');
      expect(url).toContain('destination=52.2297%2C21.0122');
    });
  });

  describe('generateViewUrl', () => {
    it('should generate view URL with default zoom', () => {
      const url = service.generateViewUrl({ lat: 52.2297, lon: 21.0122 });
      expect(url).toContain('@52.2297,21.0122,15z');
    });

    it('should generate view URL with custom zoom', () => {
      const url = service.generateViewUrl({ lat: 52.2297, lon: 21.0122 }, 18);
      expect(url).toContain('@52.2297,21.0122,18z');
    });
  });

  describe('parseAnyUrl', () => {
    it('should call parseUrlFull for non-shortened URL', async () => {
      const spy = jest.spyOn(service, 'parseUrlFull');
      await service.parseAnyUrl('https://www.google.com/maps?q=52.2297,21.0122');
      expect(spy).toHaveBeenCalled();
    });

    it('should call resolveShortUrl for shortened URL', async () => {
      const spy = jest.spyOn(service as any, 'resolveShortUrl').mockResolvedValue({
        coordinates: { lat: 52.2297, lon: 21.0122 },
        isShortened: true,
        parseMethod: 'redirect',
      });

      await service.parseAnyUrl('https://goo.gl/maps/xyz');
      expect(spy).toHaveBeenCalledWith('https://goo.gl/maps/xyz');
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const point1 = { lat: 52.2297, lon: 21.0122 }; // Warsaw
      const point2 = { lat: 50.0614, lon: 19.9366 }; // Krakow
      const distance = service.calculateDistance(point1, point2);
      // Warsaw to Krakow is approximately 251 km
      expect(distance).toBeGreaterThan(240);
      expect(distance).toBeLessThan(260);
    });

    it('should return 0 for same point', () => {
      const point = { lat: 52.2297, lon: 21.0122 };
      const distance = service.calculateDistance(point, point);
      expect(distance).toBe(0);
    });

    it('should calculate symmetric distance', () => {
      const point1 = { lat: 52.2297, lon: 21.0122 };
      const point2 = { lat: 50.0614, lon: 19.9366 };
      const d1 = service.calculateDistance(point1, point2);
      const d2 = service.calculateDistance(point2, point1);
      expect(Math.abs(d1 - d2)).toBeLessThan(0.001);
    });
  });
});
