// src/utils/helpers.ts
// Funkcje pomocnicze

/**
 * Formatuje datę do formatu ISO
 */
export const formatDate = (date: Date): string => {
  return date.toISOString();
};

/**
 * Oblicza różnicę między datami w godzinach
 */
export const getHoursDifference = (start: Date, end: Date): number => {
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
};

/**
 * Formatuje rozmiar pliku do czytelnej postaci
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Pobiera rozszerzenie pliku z nazwy
 */
export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * Paginacja - oblicza offset
 */
export const calculateOffset = (page: number, limit: number): number => {
  return (page - 1) * limit;
};

/**
 * Zwraca losowy element z tablicy
 */
export const getRandomElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Grupuje tablicę obiektów według klucza
 */
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

/**
 * Opóźnienie asynchroniczne
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry logika dla operacji asynchronicznych
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      await sleep(delayMs * attempt);
    }
  }
  throw new Error('Max retry attempts reached');
};
