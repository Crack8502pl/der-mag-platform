// tests/unit/config/constants.test.ts
import {
  TASK_TYPES,
  TASK_STATUSES,
  USER_ROLES,
  VALIDATION_LIMITS,
  PAGINATION,
  RATE_LIMIT,
} from '../../../src/config/constants';

describe('Constants', () => {
  describe('TASK_TYPES', () => {
    it('should have SMW task type', () => {
      expect(TASK_TYPES.SMW).toBe('SMW');
    });

    it('should have 13 task types', () => {
      expect(Object.keys(TASK_TYPES).length).toBe(13);
    });
  });

  describe('TASK_STATUSES', () => {
    it('should have created status', () => {
      expect(TASK_STATUSES.CREATED).toBe('created');
    });

    it('should have completed status', () => {
      expect(TASK_STATUSES.COMPLETED).toBe('completed');
    });

    it('should have 6 statuses', () => {
      expect(Object.keys(TASK_STATUSES).length).toBe(6);
    });
  });

  describe('USER_ROLES', () => {
    it('should have admin role', () => {
      expect(USER_ROLES.ADMIN).toBe('admin');
    });

    it('should have 4 roles', () => {
      expect(Object.keys(USER_ROLES).length).toBe(4);
    });
  });

  describe('VALIDATION_LIMITS', () => {
    it('should have minimum password length of 8', () => {
      expect(VALIDATION_LIMITS.MIN_PASSWORD_LENGTH).toBe(8);
    });

    it('should have max file size of 10MB', () => {
      expect(VALIDATION_LIMITS.MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });

    it('should allow JPEG and PNG images', () => {
      expect(VALIDATION_LIMITS.ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
      expect(VALIDATION_LIMITS.ALLOWED_IMAGE_TYPES).toContain('image/png');
    });
  });

  describe('PAGINATION', () => {
    it('should have default page of 1', () => {
      expect(PAGINATION.DEFAULT_PAGE).toBe(1);
    });

    it('should have default limit of 20', () => {
      expect(PAGINATION.DEFAULT_LIMIT).toBe(20);
    });

    it('should have max limit of 100', () => {
      expect(PAGINATION.MAX_LIMIT).toBe(100);
    });
  });

  describe('RATE_LIMIT', () => {
    it('should have 15 minute window', () => {
      expect(RATE_LIMIT.WINDOW_MS).toBe(15 * 60 * 1000);
    });

    it('should allow 100 requests per window', () => {
      expect(RATE_LIMIT.MAX_REQUESTS).toBe(100);
    });
  });
});
