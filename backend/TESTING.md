# Testing Guide for Der-Mag Platform Backend

This document provides comprehensive instructions for testing the Der-Mag Platform backend application.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Conventions](#test-conventions)
- [Mocking](#mocking)
- [Coverage](#coverage)
- [CI/CD Integration](#cicd-integration)

## Overview

The backend uses **Jest** as the testing framework with **ts-jest** for TypeScript support. Tests are organized into:

- **Unit Tests**: Test individual functions, services, controllers, and utilities in isolation
- **Integration Tests**: Test complete workflows and interactions between components
- **File Generator Tests**: Test document generation services (Excel, Word, PDF)

## Test Structure

```
backend/tests/
├── setup.ts                          # Global test setup and configuration
├── mocks/                            # Mock implementations
│   ├── database.mock.ts              # TypeORM DataSource and repository mocks
│   ├── request.mock.ts               # Express Request/Response mocks
│   └── services.mock.ts              # Service layer mocks
├── unit/                             # Unit tests
│   ├── services/                     # Service layer tests
│   │   ├── TaskService.test.ts
│   │   ├── BOMService.test.ts
│   │   └── ...
│   ├── controllers/                  # Controller tests
│   │   ├── TaskController.test.ts
│   │   ├── AuthController.test.ts
│   │   └── ...
│   ├── middleware/                   # Middleware tests
│   │   ├── auth.test.ts
│   │   └── validation.test.ts
│   └── utils/                        # Utility function tests
│       └── TaskNumberGenerator.test.ts
├── integration/                      # Integration tests
│   ├── auth.test.ts
│   └── task-workflow.test.ts
└── file-generator/                   # File generation tests
    └── file-generator.test.ts
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Unit Tests Only

```bash
npm run test:unit
```

### Run Integration Tests Only

```bash
npm run test:integration
```

### Run Specific Test File

```bash
npm test -- TaskService
npm test -- --testPathPattern=TaskService
```

### Run Specific Test Suite

```bash
npm test -- --testNamePattern="createTask"
```

## Writing Tests

### Basic Test Structure

```typescript
import { ServiceName } from '../../../src/services/ServiceName';
import { createMockRepository } from '../../mocks/database.mock';

// Mock dependencies
jest.mock('../../../src/config/database');

describe('ServiceName', () => {
  // Setup before each test
  beforeEach(() => {
    // Initialize mocks
  });

  // Cleanup after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do something successfully', async () => {
      // Arrange
      const mockData = { /* test data */ };
      
      // Act
      const result = await ServiceName.methodName(mockData);
      
      // Assert
      expect(result).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw error for invalid input', async () => {
      // Arrange & Act & Assert
      await expect(ServiceName.methodName(null)).rejects.toThrow('Error message');
    });
  });
});
```

### Testing Controllers

```typescript
import { ControllerName } from '../../../src/controllers/ControllerName';
import { createMockRequest, createMockResponse } from '../../mocks/request.mock';

describe('ControllerName', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
  });

  it('should return success response', async () => {
    req.params = { id: '1' };
    
    await ControllerName.get(req as Request, res as Response);
    
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.any(Object)
    });
  });
});
```

### Testing Middleware

```typescript
import { authenticate } from '../../../src/middleware/auth';
import { createMockRequest, createMockResponse, createMockNext } from '../../mocks/request.mock';

describe('authenticate middleware', () => {
  it('should authenticate valid token', async () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer valid-token' }
    });
    const res = createMockResponse();
    const next = createMockNext();
    
    await authenticate(req as Request, res as Response, next);
    
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
  });
});
```

## Test Conventions

### Naming Conventions

- Test files: `*.test.ts`
- Test suites: Use `describe()` blocks to group related tests
- Test cases: Use `it()` or `test()` with descriptive names starting with "should"

### Test Organization

1. **Arrange**: Set up test data and mocks
2. **Act**: Execute the code being tested
3. **Assert**: Verify the expected outcomes

### Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Mocking**: Mock external dependencies (database, APIs, file system)
3. **Clear Names**: Use descriptive test names that explain what is being tested
4. **Single Responsibility**: Each test should verify one specific behavior
5. **Edge Cases**: Test both happy paths and error scenarios
6. **Async/Await**: Use async/await for asynchronous operations
7. **Cleanup**: Use `afterEach()` to clean up mocks and state

## Mocking

### Database Mocks

```typescript
import { createMockRepository, createMockQueryBuilder } from '../../mocks/database.mock';

const mockRepository = createMockRepository<EntityType>();
mockRepository.findOne.mockResolvedValue(mockData);
mockRepository.save.mockResolvedValue(savedData);
```

### Request/Response Mocks

```typescript
import { createMockRequest, createMockResponse } from '../../mocks/request.mock';

const req = createMockRequest({
  body: { /* request body */ },
  params: { id: '1' },
  query: { page: '1' },
  user: { userId: 1, role: 'admin' }
});

const res = createMockResponse();
```

### Service Mocks

```typescript
import { mockTaskService } from '../../mocks/services.mock';

mockTaskService.createTask.mockResolvedValue(mockTask);
```

## Coverage

### Viewing Coverage Reports

After running `npm run test:coverage`, coverage reports are available in:

- **Console**: Text summary in terminal
- **HTML**: `coverage/lcov-report/index.html` - Open in browser
- **LCOV**: `coverage/lcov.info` - For CI/CD tools

### Coverage Goals

- **Minimum**: 70% overall coverage
- **Target**: 80% or higher for critical paths
- **Focus Areas**:
  - Service layer: High coverage (80%+)
  - Controllers: Good coverage (70%+)
  - Utilities: Full coverage (90%+)

### Excluded from Coverage

- `src/index.ts` - Application entry point
- `src/**/*.d.ts` - Type definition files
- Generated files
- Configuration files

## CI/CD Integration

Tests can be integrated into CI/CD pipelines using the GitHub Actions workflow (see `.github/workflows/test.yml`).

### Pre-commit Checks

Before committing code:

```bash
npm run typecheck    # Check TypeScript types
npm test            # Run all tests
npm run test:coverage # Check coverage
```

### Debugging Tests

Enable verbose output:

```bash
npm test -- --verbose
```

Debug a specific test:

```bash
npm test -- --testNamePattern="specific test name"
```

Run tests in Node debug mode:

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Troubleshooting

### Common Issues

**Issue**: Tests timeout
- **Solution**: Increase timeout in jest.config.js or use `jest.setTimeout(15000)` in test

**Issue**: Mocks not working
- **Solution**: Ensure `jest.clearAllMocks()` is called in `afterEach()`

**Issue**: Database connection errors
- **Solution**: Verify mocks are properly set up and database module is mocked

**Issue**: TypeScript errors in tests
- **Solution**: Check that test setup includes `import 'reflect-metadata'`

### Getting Help

- Check existing tests for examples
- Review Jest documentation: https://jestjs.io/
- Review TypeORM documentation: https://typeorm.io/

## Adding New Tests

When adding new features:

1. Write tests **before** or **alongside** implementation (TDD approach recommended)
2. Follow existing test patterns and conventions
3. Ensure new code maintains or improves coverage percentage
4. Add integration tests for new workflows
5. Update this documentation if introducing new patterns

## Example Test Patterns

### Testing Error Handling

```typescript
it('should handle database errors gracefully', async () => {
  mockRepository.save.mockRejectedValue(new Error('Database error'));
  
  await expect(Service.create(data)).rejects.toThrow('Database error');
});
```

### Testing Async Operations

```typescript
it('should process async operation', async () => {
  const result = await Service.asyncMethod();
  expect(result).toBeDefined();
});
```

### Testing Multiple Scenarios

```typescript
describe.each([
  ['valid data', validData, true],
  ['invalid data', invalidData, false],
])('%s', (description, input, expected) => {
  it('should validate correctly', () => {
    const result = validate(input);
    expect(result).toBe(expected);
  });
});
```

---

**Last Updated**: December 2024
**Maintained By**: Der-Mag Platform Team
