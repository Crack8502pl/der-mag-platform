// tests/unit/controllers/BomTriggerController.test.ts
import { Request, Response } from 'express';
import { BomTriggerController } from '../../../src/controllers/BomTriggerController';
import { BomTriggerService } from '../../../src/services/BomTriggerService';

// Mock BomTriggerService
jest.mock('../../../src/services/BomTriggerService');

describe('BomTriggerController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      params: {},
      query: {},
      body: {},
      userId: 1,
    };
    
    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return list of triggers', async () => {
      const mockTriggers = [
        {
          id: 1,
          name: 'Test Trigger',
          triggerEvent: 'ON_TASK_CREATE',
          actionType: 'ADD_MATERIAL',
        },
      ];

      (BomTriggerService.getAllTriggers as jest.Mock).mockResolvedValue(mockTriggers);

      await BomTriggerController.list(mockRequest as Request, mockResponse as Response);

      expect(BomTriggerService.getAllTriggers).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockTriggers,
      });
    });

    it('should handle errors', async () => {
      (BomTriggerService.getAllTriggers as jest.Mock).mockRejectedValue(new Error('Test error'));

      await BomTriggerController.list(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Błąd serwera',
      });
    });
  });

  describe('get', () => {
    it('should return a trigger by ID', async () => {
      mockRequest.params = { id: '1' };
      const mockTrigger = {
        id: 1,
        name: 'Test Trigger',
      };

      (BomTriggerService.getTriggerById as jest.Mock).mockResolvedValue(mockTrigger);

      await BomTriggerController.get(mockRequest as Request, mockResponse as Response);

      expect(BomTriggerService.getTriggerById).toHaveBeenCalledWith(1);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockTrigger,
      });
    });

    it('should return 404 if trigger not found', async () => {
      mockRequest.params = { id: '999' };

      (BomTriggerService.getTriggerById as jest.Mock).mockResolvedValue(null);

      await BomTriggerController.get(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Trigger nie znaleziony',
      });
    });
  });

  describe('create', () => {
    it('should create a new trigger', async () => {
      mockRequest.body = {
        name: 'New Trigger',
        triggerEvent: 'ON_TASK_CREATE',
        actionType: 'ADD_MATERIAL',
        actionConfig: {},
      };

      const createdTrigger = { id: 1, ...mockRequest.body };
      (BomTriggerService.createTrigger as jest.Mock).mockResolvedValue(createdTrigger);

      await BomTriggerController.create(mockRequest as Request, mockResponse as Response);

      expect(BomTriggerService.createTrigger).toHaveBeenCalledWith(mockRequest.body, 1);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: createdTrigger,
        message: 'Trigger utworzony pomyślnie',
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.userId = undefined;

      await BomTriggerController.create(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Brak autoryzacji',
      });
    });
  });

  describe('toggle', () => {
    it('should toggle trigger active status', async () => {
      mockRequest.params = { id: '1' };
      const toggledTrigger = { id: 1, isActive: false };

      (BomTriggerService.toggleTrigger as jest.Mock).mockResolvedValue(toggledTrigger);

      await BomTriggerController.toggle(mockRequest as Request, mockResponse as Response);

      expect(BomTriggerService.toggleTrigger).toHaveBeenCalledWith(1);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: toggledTrigger,
        message: 'Trigger dezaktywowany pomyślnie',
      });
    });
  });

  describe('getEvents', () => {
    it('should return available events', async () => {
      const mockEvents = [
        { value: 'ON_TASK_CREATE', label: 'Test', description: 'Test' },
      ];

      (BomTriggerService.getAvailableEvents as jest.Mock).mockReturnValue(mockEvents);

      await BomTriggerController.getEvents(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockEvents,
      });
    });
  });

  describe('getActions', () => {
    it('should return available actions', async () => {
      const mockActions = [
        { value: 'ADD_MATERIAL', label: 'Test', description: 'Test' },
      ];

      (BomTriggerService.getAvailableActions as jest.Mock).mockReturnValue(mockActions);

      await BomTriggerController.getActions(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockActions,
      });
    });
  });
});
