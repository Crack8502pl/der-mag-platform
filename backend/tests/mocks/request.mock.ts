// Mock for Express Request and Response
import { Request, Response, NextFunction } from 'express';

/**
 * Creates a mock Express Request object
 */
export const createMockRequest = (options: {
  body?: any;
  params?: any;
  query?: any;
  headers?: any;
  user?: any;
  userId?: number;
} = {}): Partial<Request> => {
  return {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    user: options.user,
    userId: options.userId,
    socket: {
      remoteAddress: '127.0.0.1',
    } as any,
  };
};

/**
 * Creates a mock Express Response object
 */
export const createMockResponse = (): Partial<Response> => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  return res;
};

/**
 * Creates a mock Next function
 */
export const createMockNext = (): NextFunction => {
  return jest.fn();
};

/**
 * Helper to extract response data from mock
 */
export const getResponseData = (mockResponse: any) => {
  const statusCall = mockResponse.status.mock.calls[0];
  const jsonCall = mockResponse.json.mock.calls[0];
  
  return {
    status: statusCall ? statusCall[0] : undefined,
    body: jsonCall ? jsonCall[0] : undefined,
  };
};
