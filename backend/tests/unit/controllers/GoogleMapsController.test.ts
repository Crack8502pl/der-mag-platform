// tests/unit/controllers/GoogleMapsController.test.ts
import { Request, Response } from 'express';
import { GoogleMapsController } from '../../../src/controllers/GoogleMapsController';
import googleMapsService from '../../../src/services/GoogleMapsService';
import { createMockRequest, createMockResponse } from '../../mocks/request.mock';

jest.mock('../../../src/services/GoogleMapsService', () => {
  return {
    __esModule: true,
    default: {
      parseAnyUrl: jest.fn(),
      validateCoordinates: jest.fn(),
      generateNavigationUrl: jest.fn(),
      generateViewUrl: jest.fn(),
      calculateDistance: jest.fn(),
    },
  };
});

jest.mock('../../../src/utils/logger', () => ({
  serverLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('GoogleMapsController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = createMockRequest();
    res = createMockResponse();
  });

  describe('parseUrl', () => {
    it('should return parsed coordinates on success', async () => {
      const mockResult = {
        coordinates: { lat: 52.2297, lon: 21.0122 },
        originalUrl: 'https://www.google.com/maps?q=52.2297,21.0122',
        isShortened: false,
        parseMethod: 'query',
      };
      (googleMapsService.parseAnyUrl as jest.Mock).mockResolvedValue(mockResult);

      req = createMockRequest({ body: { url: 'https://www.google.com/maps?q=52.2297,21.0122' } });

      await GoogleMapsController.parseUrl(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockResult });
    });

    it('should return 400 when url is missing', async () => {
      req = createMockRequest({ body: {} });

      await GoogleMapsController.parseUrl(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('should return 400 when url is too long', async () => {
      req = createMockRequest({ body: { url: 'https://example.com/' + 'a'.repeat(490) } });

      await GoogleMapsController.parseUrl(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('zbyt długi') })
      );
    });

    it('should return 500 on service error', async () => {
      (googleMapsService.parseAnyUrl as jest.Mock).mockRejectedValue(new Error('Network error'));

      req = createMockRequest({ body: { url: 'https://www.google.com/maps?q=52,21' } });

      await GoogleMapsController.parseUrl(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('generateNavigation', () => {
    beforeEach(() => {
      (googleMapsService.validateCoordinates as jest.Mock).mockReturnValue(true);
      (googleMapsService.generateNavigationUrl as jest.Mock).mockReturnValue(
        'https://www.google.com/maps/dir/?api=1&destination=52.2297%2C21.0122'
      );
      (googleMapsService.generateViewUrl as jest.Mock).mockReturnValue(
        'https://www.google.com/maps/@52.2297,21.0122,15z'
      );
    });

    it('should generate navigation URL with destination only', () => {
      req = createMockRequest({
        body: { destination: { lat: 52.2297, lon: 21.0122 } },
      });

      GoogleMapsController.generateNavigation(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            navigationUrl: expect.any(String),
            viewUrl: expect.any(String),
            destination: { lat: 52.2297, lon: 21.0122 },
            origin: null,
          }),
        })
      );
    });

    it('should generate navigation URL with origin and destination', () => {
      req = createMockRequest({
        body: {
          destination: { lat: 52.2297, lon: 21.0122 },
          origin: { lat: 50.0, lon: 20.0 },
        },
      });

      GoogleMapsController.generateNavigation(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 400 when destination is missing', () => {
      req = createMockRequest({ body: {} });

      GoogleMapsController.generateNavigation(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when destination coordinates are invalid', () => {
      (googleMapsService.validateCoordinates as jest.Mock).mockReturnValue(false);

      req = createMockRequest({
        body: { destination: { lat: 200, lon: 400 } },
      });

      GoogleMapsController.generateNavigation(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when origin lat/lon are not numbers', () => {
      req = createMockRequest({
        body: {
          destination: { lat: 52.2297, lon: 21.0122 },
          origin: { lat: 'bad', lon: 21 },
        },
      });

      GoogleMapsController.generateNavigation(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('calculateDistance', () => {
    beforeEach(() => {
      (googleMapsService.validateCoordinates as jest.Mock).mockReturnValue(true);
      (googleMapsService.calculateDistance as jest.Mock).mockReturnValue(123.456);
    });

    it('should calculate distance and return result', () => {
      req = createMockRequest({
        body: {
          point1: { lat: 52.2297, lon: 21.0122 },
          point2: { lat: 50.0, lon: 20.0 },
        },
      });

      GoogleMapsController.calculateDistance(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            distanceKm: expect.any(Number),
            distanceM: expect.any(Number),
          }),
        })
      );
    });

    it('should return 400 when point1 is missing', () => {
      req = createMockRequest({ body: { point2: { lat: 50.0, lon: 20.0 } } });

      GoogleMapsController.calculateDistance(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when point2 is missing', () => {
      req = createMockRequest({ body: { point1: { lat: 52.2297, lon: 21.0122 } } });

      GoogleMapsController.calculateDistance(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when point1 coordinates are invalid', () => {
      (googleMapsService.validateCoordinates as jest.Mock).mockReturnValueOnce(false);

      req = createMockRequest({
        body: {
          point1: { lat: 200, lon: 400 },
          point2: { lat: 50.0, lon: 20.0 },
        },
      });

      GoogleMapsController.calculateDistance(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when point2 coordinates are invalid', () => {
      (googleMapsService.validateCoordinates as jest.Mock)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      req = createMockRequest({
        body: {
          point1: { lat: 52.2297, lon: 21.0122 },
          point2: { lat: 200, lon: 400 },
        },
      });

      GoogleMapsController.calculateDistance(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
