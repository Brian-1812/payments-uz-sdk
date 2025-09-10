import { PaymeClient } from "../../../payme/PaymeClient";
import { PaymeError } from "../../../errors/PaymeError";
import { HttpClient } from "../../../utils/HttpClient";
import { PaymentStatus } from "../../../types";

// Mock HttpClient
jest.mock("../../../utils/HttpClient");
const MockedHttpClient = HttpClient as jest.MockedClass<typeof HttpClient>;

describe("PaymeClient", () => {
  let paymeClient: PaymeClient;
  let mockHttpClient: jest.Mocked<HttpClient>;
  const mockConfig = {
    merchantId: "test-merchant-id",
    checkoutKey: "test-checkout-key",
    merchantApiSecret: "test-merchant-api-secret",
  };

  beforeEach(() => {
    mockHttpClient = {
      post: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    } as any;

    MockedHttpClient.mockImplementation(() => mockHttpClient);
    paymeClient = new PaymeClient(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create PaymeClient with valid config", () => {
      expect(paymeClient).toBeDefined();
      expect(MockedHttpClient).toHaveBeenCalledWith(
        "https://checkout.paycom.uz/api"
      );
    });

    it("should create PaymeClient in test mode", () => {
      const testConfig = { ...mockConfig, testMode: true };
      new PaymeClient(testConfig);
      expect(MockedHttpClient).toHaveBeenCalledWith(
        "https://checkout.test.paycom.uz/api"
      );
    });

    it("should throw error when merchantId is missing", () => {
      expect(() => {
        new PaymeClient({ ...mockConfig, merchantId: "" });
      }).toThrow(
        "PaymeClient: merchantId, checkoutKey, and merchantApiSecret are required."
      );
    });

    it("should throw error when checkoutKey is missing", () => {
      expect(() => {
        new PaymeClient({ ...mockConfig, checkoutKey: "" });
      }).toThrow(
        "PaymeClient: merchantId, checkoutKey, and merchantApiSecret are required."
      );
    });

    it("should throw error when merchantApiSecret is missing", () => {
      expect(() => {
        new PaymeClient({ ...mockConfig, merchantApiSecret: "" });
      }).toThrow(
        "PaymeClient: merchantId, checkoutKey, and merchantApiSecret are required."
      );
    });
  });

  describe("createCardToken", () => {
    it("should create card token successfully", async () => {
      const mockResponse = {
        id: "123",
        result: {
          card: {
            token: "test-card-token",
            recurrent: true,
            verify: true,
          },
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await paymeClient.createCardToken({
        cardNumber: "8600123456789012",
        expireDate: "1228",
        save: true,
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          id: expect.any(String),
          method: "cards.create",
          params: {
            card: { number: "8600123456789012", expire: "1228" },
            save: true,
          },
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Auth": "test-checkout-key",
          }),
        })
      );

      expect(result).toEqual({
        cardToken: "test-card-token",
        requiresVerification: false,
      });
    });

    it("should create card token that requires verification", async () => {
      const mockResponse = {
        id: "123",
        result: {
          card: {
            token: "test-card-token",
            recurrent: true,
            verify: false,
          },
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await paymeClient.createCardToken({
        cardNumber: "8600123456789012",
        expireDate: "1228",
        save: true,
      });

      expect(result).toEqual({
        cardToken: "test-card-token",
        requiresVerification: true,
      });
    });

    it("should default save to true when not provided", async () => {
      const mockResponse = {
        id: "123",
        result: {
          card: {
            token: "test-card-token",
            recurrent: true,
            verify: true,
          },
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      await paymeClient.createCardToken({
        cardNumber: "8600123456789012",
        expireDate: "1228",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          params: expect.objectContaining({
            save: true,
          }),
        }),
        expect.any(Object)
      );
    });

    it("should throw PaymeError when API returns error", async () => {
      const mockResponse = {
        id: "123",
        error: {
          code: -32000,
          message: { en: "Invalid card number" },
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      await expect(
        paymeClient.createCardToken({
          cardNumber: "invalid",
          expireDate: "1228",
        })
      ).rejects.toThrow(PaymeError);
    });

    it("should throw PaymeError when result is empty", async () => {
      const mockResponse = {
        id: "123",
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      await expect(
        paymeClient.createCardToken({
          cardNumber: "8600123456789012",
          expireDate: "1228",
        })
      ).rejects.toThrow(PaymeError);
    });
  });

  describe("sendVerificationCode", () => {
    it("should send verification code successfully", async () => {
      const mockResponse = {
        id: "123",
        result: {
          sent: true,
          phone: "+998901234567",
          wait: 60,
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await paymeClient.sendVerificationCode("test-card-token");

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          method: "cards.get_verify_code",
          params: { token: "test-card-token" },
        }),
        expect.any(Object)
      );

      expect(result).toBe(true);
    });

    it("should return false when SMS not sent", async () => {
      const mockResponse = {
        id: "123",
        result: {
          sent: false,
          phone: "+998901234567",
          wait: 60,
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await paymeClient.sendVerificationCode("test-card-token");

      expect(result).toBe(false);
    });
  });

  describe("verifyCard", () => {
    it("should verify card successfully", async () => {
      const mockResponse = {
        id: "123",
        result: {
          card: {
            token: "test-card-token",
            recurrent: true,
            verify: true,
          },
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await paymeClient.verifyCard({
        cardToken: "test-card-token",
        smsCode: "12345",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          method: "cards.verify",
          params: { token: "test-card-token", code: "12345" },
        }),
        expect.any(Object)
      );

      expect(result).toEqual({
        cardToken: "test-card-token",
        isVerified: true,
      });
    });

    it("should return false when verification fails", async () => {
      const mockResponse = {
        id: "123",
        result: {
          card: {
            token: "test-card-token",
            recurrent: true,
            verify: false,
          },
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await paymeClient.verifyCard({
        cardToken: "test-card-token",
        smsCode: "wrong-code",
      });

      expect(result).toEqual({
        cardToken: "test-card-token",
        isVerified: false,
      });
    });
  });

  describe("chargeFromCardToken", () => {
    it("should charge from card token successfully", async () => {
      const createReceiptResponse = {
        id: "123",
        result: {
          receipt: {
            _id: "receipt-123",
            create_time: Date.now(),
            pay_time: 0,
            cancel_time: 0,
            state: 1,
            amount: 100000,
          },
        },
      };

      const payReceiptResponse = {
        id: "124",
        result: {
          receipt: {
            _id: "receipt-123",
            create_time: Date.now(),
            pay_time: Date.now(),
            cancel_time: 0,
            state: 2,
            amount: 100000,
          },
        },
      };

      mockHttpClient.post
        .mockResolvedValueOnce(createReceiptResponse)
        .mockResolvedValueOnce(payReceiptResponse);

      const result = await paymeClient.chargeFromCardToken({
        cardToken: "test-card-token",
        amount: 1000,
        orderId: "order-123",
      });

      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);

      // Check create receipt call
      expect(mockHttpClient.post).toHaveBeenNthCalledWith(
        1,
        "",
        expect.objectContaining({
          method: "receipts.create",
          params: {
            amount: 100000, // Amount in tiyins
            account: { order_id: "order-123" },
            description: "Payment for order order-123",
          },
        }),
        expect.any(Object)
      );

      // Check pay receipt call
      expect(mockHttpClient.post).toHaveBeenNthCalledWith(
        2,
        "",
        expect.objectContaining({
          method: "receipts.pay",
          params: {
            id: "receipt-123",
            token: "test-card-token",
          },
        }),
        expect.any(Object)
      );

      expect(result).toEqual({
        transactionId: "receipt-123",
        status: PaymentStatus.SUCCESS,
        receipt: payReceiptResponse.result.receipt,
      });
    });

    it("should throw PaymeError when receipt creation fails", async () => {
      const mockResponse = {
        id: "123",
        error: {
          code: -32000,
          message: { en: "Failed to create receipt" },
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      await expect(
        paymeClient.chargeFromCardToken({
          cardToken: "test-card-token",
          amount: 1000,
          orderId: "order-123",
        })
      ).rejects.toThrow(PaymeError);
    });

    it("should throw PaymeError when receipt ID is missing", async () => {
      const mockResponse = {
        id: "123",
        result: {
          receipt: {
            _id: "",
            create_time: Date.now(),
            pay_time: 0,
            cancel_time: 0,
            state: 1,
            amount: 100000,
          },
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      await expect(
        paymeClient.chargeFromCardToken({
          cardToken: "test-card-token",
          amount: 1000,
          orderId: "order-123",
        })
      ).rejects.toThrow(PaymeError);
    });

    it("should throw PaymeError when receipt payment fails", async () => {
      const createReceiptResponse = {
        id: "123",
        result: {
          receipt: {
            _id: "receipt-123",
            create_time: Date.now(),
            pay_time: 0,
            cancel_time: 0,
            state: 1,
            amount: 100000,
          },
        },
      };

      const payReceiptResponse = {
        id: "124",
        error: {
          code: -32000,
          message: { en: "Payment failed" },
        },
      };

      mockHttpClient.post
        .mockResolvedValueOnce(createReceiptResponse)
        .mockResolvedValueOnce(payReceiptResponse);

      await expect(
        paymeClient.chargeFromCardToken({
          cardToken: "test-card-token",
          amount: 1000,
          orderId: "order-123",
        })
      ).rejects.toThrow(PaymeError);
    });
  });

  describe("generateInvoiceUrl", () => {
    it("should generate invoice URL for production", () => {
      const result = paymeClient.generateInvoiceUrl({
        amount: 2500,
        orderId: "order-456",
        returnUrl: "https://example.com/success",
      });

      expect(result).toContain("https://checkout.paycom.uz/");
      expect(result).toContain("m=test-merchant-id");
      expect(result).toContain("a=250000"); // Amount in tiyins
      expect(result).toContain("ac=order-456");
      expect(result).toContain(
        "return_url=https%3A%2F%2Fexample.com%2Fsuccess"
      );
    });

    it("should generate invoice URL for test mode", () => {
      const testConfig = { ...mockConfig, testMode: true };
      const testClient = new PaymeClient(testConfig);

      const result = testClient.generateInvoiceUrl({
        amount: 2500,
        orderId: "order-456",
        returnUrl: "https://example.com/success",
      });

      expect(result).toContain("https://test.paycom.uz/");
    });

    it("should URL encode parameters correctly", () => {
      const result = paymeClient.generateInvoiceUrl({
        amount: 2500,
        orderId: "order with spaces",
        returnUrl: "https://example.com/success?param=value",
      });

      expect(result).toContain("ac=order+with+spaces");
      expect(result).toContain(
        "return_url=https%3A%2F%2Fexample.com%2Fsuccess%3Fparam%3Dvalue"
      );
    });
  });

  describe("checkReceiptStatus", () => {
    it("should check receipt status successfully", async () => {
      const mockResponse = {
        id: "123",
        result: {
          state: 2,
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await paymeClient.checkReceiptStatus("receipt-123");

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          method: "receipts.check",
          params: { id: "receipt-123" },
        }),
        expect.any(Object)
      );

      expect(result).toEqual({
        status: PaymentStatus.SUCCESS,
      });
    });

    it("should throw PaymeError when status check fails", async () => {
      const mockResponse = {
        id: "123",
        error: {
          code: -32000,
          message: { en: "Receipt not found" },
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      await expect(
        paymeClient.checkReceiptStatus("invalid-receipt")
      ).rejects.toThrow(PaymeError);
    });
  });

  describe("cancelReceipt", () => {
    it("should cancel receipt successfully", async () => {
      const mockResponse = {
        id: "123",
        result: {
          receipt: {
            _id: "receipt-123",
            create_time: Date.now(),
            pay_time: 0,
            cancel_time: Date.now(),
            state: -1,
            amount: 100000,
          },
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await paymeClient.cancelReceipt("receipt-123");

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          method: "receipts.cancel",
          params: { id: "receipt-123" },
        }),
        expect.any(Object)
      );

      expect(result).toEqual({
        transactionId: "receipt-123",
        status: PaymentStatus.CANCELLED,
        receipt: mockResponse.result.receipt,
      });
    });

    it("should throw PaymeError when cancellation fails", async () => {
      const mockResponse = {
        id: "123",
        error: {
          code: -32000,
          message: { en: "Cannot cancel receipt" },
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      await expect(paymeClient.cancelReceipt("receipt-123")).rejects.toThrow(
        PaymeError
      );
    });
  });

  describe("request method", () => {
    it("should generate unique request IDs", async () => {
      const mockResponse = {
        id: "123",
        result: { success: true },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      await paymeClient.createCardToken({
        cardNumber: "8600123456789012",
        expireDate: "1228",
      });

      await paymeClient.createCardToken({
        cardNumber: "8600123456789012",
        expireDate: "1228",
      });

      const calls = mockHttpClient.post.mock.calls;
      expect(calls[0][1].id).not.toBe(calls[1][1].id);
    });

    it("should handle JSON-RPC errors correctly", async () => {
      const mockResponse = {
        id: "123",
        error: {
          code: -32000,
          message: { en: "Test error", ru: "Тестовая ошибка" },
          data: { field: "value" },
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      try {
        await paymeClient.createCardToken({
          cardNumber: "8600123456789012",
          expireDate: "1228",
        });
      } catch (error) {
        expect(error).toBeInstanceOf(PaymeError);
        expect((error as PaymeError).message).toBe("Test error");
        expect((error as PaymeError).code).toBe(-32000);
        expect((error as PaymeError).data).toEqual({ field: "value" });
      }
    });
  });
});
