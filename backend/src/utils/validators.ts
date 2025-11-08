// src/utils/validators.ts
// Funkcje pomocnicze walidacji

/**
 * Sprawdza czy ciąg znaków jest poprawnym adresem email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sprawdza czy ciąg znaków jest poprawnym numerem telefonu (polski format)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+48)?[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{3}$/;
  return phoneRegex.test(phone);
};

/**
 * Sprawdza czy ciąg znaków jest poprawnym adresem IPv4
 */
export const isValidIPv4 = (ip: string): boolean => {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part);
    return num >= 0 && num <= 255;
  });
};

/**
 * Sprawdza czy ciąg znaków jest poprawnym CIDR
 */
export const isValidCIDR = (cidr: string): boolean => {
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  if (!cidrRegex.test(cidr)) return false;
  
  const [ip, prefix] = cidr.split('/');
  const prefixNum = parseInt(prefix);
  
  return isValidIPv4(ip) && prefixNum >= 0 && prefixNum <= 32;
};

/**
 * Sanityzacja ciągu znaków (usunięcie niebezpiecznych znaków)
 */
export const sanitizeString = (str: string): string => {
  return str
    .replace(/[<>]/g, '') // Usunięcie < >
    .replace(/javascript:/gi, '') // Usunięcie javascript:
    .trim();
};

/**
 * Generuje losowy ciąg znaków o określonej długości
 */
export const generateRandomString = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
