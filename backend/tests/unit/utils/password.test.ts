// tests/unit/utils/password.test.ts
import { generateRandomPassword } from '../../../src/utils/password';

describe('password utility', () => {
  describe('generateRandomPassword', () => {
    it('should generate password with default length of 12', () => {
      const password = generateRandomPassword();
      expect(password).toHaveLength(12);
    });

    it('should generate password with custom length', () => {
      const password = generateRandomPassword(16);
      expect(password).toHaveLength(16);
    });

    it('should contain at least one uppercase letter', () => {
      const password = generateRandomPassword();
      expect(password).toMatch(/[A-Z]/);
    });

    it('should contain at least one lowercase letter', () => {
      const password = generateRandomPassword();
      expect(password).toMatch(/[a-z]/);
    });

    it('should contain at least one digit', () => {
      const password = generateRandomPassword();
      expect(password).toMatch(/[0-9]/);
    });

    it('should contain at least one special character', () => {
      const password = generateRandomPassword();
      expect(password).toMatch(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/);
    });

    it('should generate different passwords on each call', () => {
      const password1 = generateRandomPassword();
      const password2 = generateRandomPassword();
      expect(password1).not.toBe(password2);
    });

    it('should generate password of minimum length 8', () => {
      const password = generateRandomPassword(8);
      expect(password).toHaveLength(8);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/);
    });
  });
});
