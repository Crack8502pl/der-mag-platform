import { isExtensionError } from './isExtensionError';

type TestCase = {
  name: string;
  run: () => void;
};

const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const testCases: TestCase[] = [
  {
    name: 'detects chrome-extension source',
    run: () => {
      assert(
        isExtensionError('chrome-extension://abc/script.js'),
        'Expected chrome-extension source to be detected',
      );
    },
  },
  {
    name: 'detects moz-extension source',
    run: () => {
      assert(
        isExtensionError(undefined, 'at moz-extension://addon/background.js:10:1'),
        'Expected moz-extension source to be detected',
      );
    },
  },
  {
    name: 'detects AdGuard document-start script',
    run: () => {
      assert(
        isExtensionError(undefined, 'Error at document-start.js:3621:37'),
        'Expected document-start.js source to be detected',
      );
    },
  },
  {
    name: 'detects AdGuard connection message',
    run: () => {
      assert(
        isExtensionError(undefined, undefined, 'Could not establish connection. Receiving end does not exist.'),
        'Expected AdGuard connection message to be detected',
      );
    },
  },
  {
    name: 'does not flag normal application errors',
    run: () => {
      assert(
        !isExtensionError(
          'https://app.company.local/src/main.tsx',
          'Error: API request failed at src/services/api.ts',
          'Request failed with status code 500',
        ),
        'Expected normal application errors to not be detected as extension errors',
      );
    },
  },
];

for (const testCase of testCases) {
  testCase.run();
}

console.log(`✅ isExtensionError tests passed: ${testCases.length}/${testCases.length}`);
