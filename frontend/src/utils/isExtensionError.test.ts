import { isExtensionError } from './isExtensionError';

describe('isExtensionError', () => {
  it('detects chrome-extension source', () => {
    expect(isExtensionError('chrome-extension://abc/script.js')).toBe(true);
  });

  it('detects moz-extension source', () => {
    expect(isExtensionError(undefined, 'at moz-extension://addon/background.js:10:1')).toBe(true);
  });

  it('detects AdGuard document-start script', () => {
    expect(isExtensionError(undefined, 'Error at document-start.js:3621:37')).toBe(true);
  });

  it('detects AdGuard connection message', () => {
    expect(
      isExtensionError(undefined, undefined, 'Could not establish connection. Receiving end does not exist.'),
    ).toBe(true);
  });

  it('does not flag normal application errors', () => {
    expect(
      isExtensionError(
        'https://app.company.local/src/main.tsx',
        'Error: API request failed at src/services/api.ts',
        'Request failed with status code 500',
      ),
    ).toBe(false);
  });
});
