# Uzbekistan Payments SDK Test Suite

This directory contains comprehensive unit and integration tests for the Uzbekistan Payments SDK, covering all payment providers (Click and Payme) and their methods.

## Test Structure

```
tests/
├── __mocks__/           # Mock implementations
│   └── HttpClient.ts    # Mock HTTP client for testing
├── unit/               # Unit tests
│   ├── click/          # Click provider unit tests
│   │   ├── ClickClient.test.ts
│   │   ├── ClickWebhookHandler.test.ts
│   │   ├── utils.test.ts
│   │   └── status.test.ts
│   ├── payme/          # Payme provider unit tests
│   │   ├── PaymeClient.test.ts
│   │   ├── PaymeWebhookHandler.test.ts
│   │   └── utils.test.ts
│   ├── errors/         # Error handling tests
│   │   ├── BaseError.test.ts
│   │   ├── ClickError.test.ts
│   │   └── PaymeError.test.ts
│   └── utils/          # Utility function tests
│       └── HttpClient.test.ts
├── integration/       # Integration tests
│   ├── ClickPaymentFlow.test.ts
│   └── PaymePaymentFlow.test.ts
├── setup.ts           # Test setup and configuration
├── run-tests.ts       # Custom test runner
└── README.md          # This file
```

## Test Coverage

### Unit Tests

#### Click Provider (`tests/unit/click/`)

- **ClickClient.test.ts**: Tests all Click API methods

  - `createCardToken()` - Card token creation
  - `verifyCardToken()` - SMS verification
  - `chargeFromCardToken()` - Payment processing
  - `generateInvoiceUrl()` - Invoice URL generation
  - `checkPaymentStatus()` - Payment status checking
  - `cancelPayment()` - Payment cancellation
  - `deleteCardToken()` - Card token deletion
  - Error handling and edge cases

- **ClickWebhookHandler.test.ts**: Tests webhook handling

  - Signature verification
  - Success/error response creation
  - All Click error codes

- **utils.test.ts**: Tests utility functions

  - `getDigestAuthToken()` - Authentication token generation
  - `verifyWebhookSignature()` - Webhook signature verification

- **status.test.ts**: Tests status mapping
  - `getStatusFromClickCode()` - Click status to PaymentStatus mapping

#### Payme Provider (`tests/unit/payme/`)

- **PaymeClient.test.ts**: Tests all Payme API methods

  - `createCardToken()` - Card token creation
  - `sendVerificationCode()` - SMS code sending
  - `verifyCard()` - Card verification
  - `chargeFromCardToken()` - Payment processing (receipt creation + payment)
  - `generateInvoiceUrl()` - Invoice URL generation
  - `checkReceiptStatus()` - Receipt status checking
  - `cancelReceipt()` - Receipt cancellation
  - Error handling and edge cases

- **PaymeWebhookHandler.test.ts**: Tests webhook handling

  - Authentication verification
  - All webhook methods (CheckPerformTransaction, CreateTransaction, etc.)
  - Error handling and JSON-RPC responses

- **utils.test.ts**: Tests utility functions
  - `generatePaymeInvoiceUrl()` - Invoice URL generation
  - `getStatusFromPaymeReceiptState()` - Payme status to PaymentStatus mapping

#### Error Handling (`tests/unit/errors/`)

- **BaseError.test.ts**: Base error class tests
- **ClickError.test.ts**: Click-specific error tests
- **PaymeError.test.ts**: Payme-specific error tests
  - Error creation and properties
  - JSON-RPC error conversion
  - Error inheritance

#### Utilities (`tests/unit/utils/`)

- **HttpClient.test.ts**: HTTP client tests
  - GET, POST, DELETE methods
  - Error handling
  - Timeout handling
  - Response parsing

### Integration Tests

#### Click Payment Flow (`tests/integration/ClickPaymentFlow.test.ts`)

- Complete payment flow from token creation to payment completion
- Payment cancellation flow
- Card token deletion flow
- Webhook integration (Prepare and Complete actions)
- Error handling throughout the flow
- Invoice URL generation for different scenarios

#### Payme Payment Flow (`tests/integration/PaymePaymentFlow.test.ts`)

- Complete payment flow with and without SMS verification
- Receipt cancellation flow
- Webhook integration (all webhook methods)
- Error handling throughout the flow
- Invoice URL generation for different scenarios
- Test mode vs production mode

## Running Tests

### Prerequisites

Install dependencies:

```bash
npm install
```

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci
```

### Custom Test Runner

Use the custom test runner for more granular control:

```bash
# Run specific test types
npm run test:runner unit
npm run test:runner integration
npm run test:runner coverage

# Run provider-specific tests
npm run test:runner click
npm run test:runner payme

# Run error handling tests
npm run test:runner errors

# Run utility function tests
npm run test:runner utils

# Run multiple test types
npm run test:runner unit integration

# Show help
npm run test:runner --help
```

### Direct Jest Commands

```bash
# Run unit tests only
npx jest tests/unit

# Run integration tests only
npx jest tests/integration

# Run specific test file
npx jest tests/unit/click/ClickClient.test.ts

# Run tests matching pattern
npx jest --testNamePattern="ClickClient"

# Run tests with verbose output
npx jest --verbose

# Run tests in specific directory
npx jest tests/unit/click
```

## Test Configuration

### Jest Configuration (`jest.config.js`)

- TypeScript support with ts-jest
- Node.js test environment
- Coverage collection from source files
- Custom test setup
- 10-second timeout for integration tests

### Test Setup (`tests/setup.ts`)

- Global mocks for crypto and Buffer
- Custom Jest matchers
- Test data factories
- Cleanup after each test

### Mock Implementations (`tests/__mocks__/`)

- **HttpClient.ts**: Mock HTTP client for testing API interactions
- Configurable mock responses and errors
- Request/response tracking for assertions

## Test Data and Factories

The test suite includes factory functions for creating consistent test data:

```typescript
// Click configuration
const clickConfig = createMockClickConfig({
  merchantId: "custom-merchant-id",
});

// Payme configuration
const paymeConfig = createMockPaymeConfig({
  testMode: true,
});

// Click webhook body
const webhookBody = createMockClickWebhookBody({
  amount: "5000",
  action: ClickWebhookAction.Complete,
});

// Payme webhook request
const webhookRequest = createMockPaymeWebhookRequest(
  "CheckPerformTransaction",
  { amount: 100000, account: { order_id: "order-123" } }
);
```

## Coverage Reports

The test suite generates comprehensive coverage reports:

- **Text coverage**: Console output showing coverage percentages
- **LCOV coverage**: Machine-readable format for CI/CD integration
- **HTML coverage**: Visual coverage report in `coverage/index.html`

Coverage includes:

- All source files (`click/`, `payme/`, `errors/`, `utils/`)
- Excludes type definition files and index files
- Minimum coverage thresholds can be configured

## Continuous Integration

The test suite is designed to work seamlessly with CI/CD pipelines:

```bash
# CI-specific test command
npm run test:ci
```

This command:

- Runs tests in non-interactive mode
- Generates coverage reports
- Exits with appropriate status codes
- Optimized for CI environments

## Best Practices

### Writing Tests

1. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
2. **Descriptive names**: Use clear, descriptive test names that explain the scenario
3. **Single responsibility**: Each test should verify one specific behavior
4. **Mock external dependencies**: Use mocks for HTTP calls and external services
5. **Test edge cases**: Include tests for error conditions and boundary values

### Test Organization

1. **Group related tests**: Use `describe` blocks to group related functionality
2. **Consistent naming**: Follow consistent naming conventions for test files and functions
3. **Setup and teardown**: Use `beforeEach` and `afterEach` for consistent test setup
4. **Test data**: Use factory functions for consistent test data creation

### Maintenance

1. **Keep tests up to date**: Update tests when adding new features or changing existing ones
2. **Review coverage**: Regularly review coverage reports to ensure comprehensive testing
3. **Refactor tests**: Refactor tests when refactoring production code
4. **Document changes**: Update this README when adding new test types or changing structure

## Troubleshooting

### Common Issues

1. **Tests failing due to timeouts**

   - Increase timeout in `jest.config.js`
   - Check for infinite loops in test code

2. **Mock not working**

   - Ensure mocks are properly imported
   - Check mock implementation matches expected interface

3. **Coverage not generated**

   - Verify `collectCoverageFrom` paths in `jest.config.js`
   - Check that source files are being included

4. **TypeScript errors in tests**
   - Ensure `@types/jest` is installed
   - Check `tsconfig.json` includes test files

### Debug Mode

Run tests in debug mode for detailed output:

```bash
# Debug mode with verbose output
npx jest --verbose --no-cache

# Debug specific test
npx jest --verbose tests/unit/click/ClickClient.test.ts
```

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Add appropriate unit tests for new functionality
3. Add integration tests for new payment flows
4. Update this README if adding new test types or changing structure
5. Ensure all tests pass and coverage is maintained

## License

This test suite is part of the Uzbekistan Payments SDK and follows the same MIT license.
