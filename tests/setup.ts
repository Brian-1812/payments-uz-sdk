// Test setup file
import "jest";

// Mock crypto module for consistent testing
jest.mock("crypto", () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue("mocked-hash"),
  })),
}));

// Mock Buffer for consistent base64 encoding/decoding
jest.mock("buffer", () => ({
  Buffer: {
    from: jest.fn((data: any, encoding?: string) => ({
      toString: jest.fn((outputEncoding?: string) => {
        if (outputEncoding === "base64") {
          return Buffer.from(data, encoding as any).toString("base64");
        }
        if (outputEncoding === "utf-8" || outputEncoding === "ascii") {
          return Buffer.from(data, encoding as any).toString(outputEncoding);
        }
        return data;
      }),
    })),
  },
}));

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidPaymentStatus(): R;
      toBeValidTransactionId(): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidPaymentStatus(received) {
    const validStatuses = [
      "pending",
      "success",
      "failed",
      "cancelled",
      "refunded",
    ];
    const pass = validStatuses.includes(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid payment status`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be a valid payment status (${validStatuses.join(
            ", "
          )})`,
        pass: false,
      };
    }
  },

  toBeValidTransactionId(received) {
    const pass = typeof received === "string" || typeof received === "number";

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid transaction ID`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be a valid transaction ID (string or number)`,
        pass: false,
      };
    }
  },
});

// Test data factories
export const createMockClickConfig = (overrides = {}) => ({
  merchantId: "test-merchant-id",
  merchantUserId: "test-merchant-user-id",
  secretKey: "test-secret-key",
  serviceId: "test-service-id",
  ...overrides,
});

export const createMockPaymeConfig = (overrides = {}) => ({
  merchantId: "test-merchant-id",
  checkoutKey: "test-checkout-key",
  merchantApiSecret: "test-merchant-api-secret",
  ...overrides,
});

export const createMockClickWebhookBody = (overrides = {}) => ({
  click_trans_id: "123",
  service_id: "test-service",
  click_paydoc_id: "456",
  merchant_trans_id: "order-123",
  amount: "1000",
  action: 0, // Prepare
  error: 0,
  error_note: "Success",
  sign_time: "2023-01-01T00:00:00Z",
  sign_string: "test-signature",
  ...overrides,
});

export const createMockPaymeWebhookRequest = (
  method: string,
  params: any,
  overrides = {}
) => ({
  id: "123",
  method,
  params,
  ...overrides,
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
