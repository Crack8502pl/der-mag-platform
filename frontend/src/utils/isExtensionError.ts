/**
 * Sprawdza czy błąd pochodzi z rozszerzenia przeglądarki (np. AdGuard, uBlock itp.)
 * a nie z kodu aplikacji.
 */
export const isExtensionError = (filename?: string, stack?: string, message?: string): boolean => {
  const sources = [filename || '', stack || '', message || ''];

  return sources.some((source) =>
    source.includes('chrome-extension://')
    || source.includes('moz-extension://')
    || source.includes('safari-extension://')
    || source.includes('document-start.js')
    || source.includes('extension-')
    || source.includes('Could not establish connection')
    || source.includes('Receiving end does not exist'),
  );
};
