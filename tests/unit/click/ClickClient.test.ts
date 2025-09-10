import { ClickClient } from "../../../click/ClickClient";
import { ClickError } from "../../../errors/ClickError";
import { HttpClient } from "../../../utils/HttpClient";
import { PaymentStatus } from "../../../types";

// Mock HttpClient
jest.mock("../../../utils/HttpClient");
const MockedHttpClient = HttpClient as jest.MockedClass<typeof HttpClient>;

describe("ClickClient", () => {
  let clickClient: ClickClient;
  let mockHttpClient: jest.Mocked<HttpClient>;
  const mockConfig = {
    merchantId: "test-merchant-id",
    merchantUserId: "test-merchant-user-id",
    secretKey: "test-secret-key",
    serviceId: "test-service-id",
  };

  beforeEach(() => {
    mockHttpClient = {
      post: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    } as any;

    MockedHttpClient.mockImplementation(() => mockHttpClient);
    clickClient = new ClickClient(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create ClickClient with valid config", () => {
      expect(clickClient).toBeDefined();
      expect(MockedHttpClient).toHaveBeenCalledWith(
        "https://api.click.uz/v2/merchant"
      );
    });

    it("should throw error when merchantId is missing", () => {
      expect(() => {
        new ClickClient({ ...mockConfig, merchantId: "" });
      }).toThrow(
        "ClickClient: merchantId, merchantUserId, secretKey, and serviceId are required."
      );
    });

    it("should throw error when merchantUserId is missing", () => {
      expect(() => {
        new ClickClient({ ...mockConfig, merchantUserId: "" });
      }).toThrow(
        "ClickClient: merchantId, merchantUserId, secretKey, and serviceId are required."
      );
    });

    it("should throw error when secretKey is missing", () => {
      expect(() => {
        new ClickClient({ ...mockConfig, secretKey: "" });
      }).toThrow(
        "ClickClient: merchantId, merchantUserId, secretKey, and serviceId are required."
      );
    });

    it("should throw error when serviceId is missing", () => {
      expect(() => {
        new ClickClient({ ...mockConfig, serviceId: "" });
      }).toThrow(
        "ClickClient: merchantId, merchantUserId, secretKey, and serviceId are required."
      );
    });
  });

  describe("createCardToken", () => {
    it("should create card token successfully", async () => {
      const mockResponse = {
        card_token: "test-card-token",
        phone_number: "+998901234567",
        card_number: "8600****1234",
        temporary: 0,
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await clickClient.createCardToken({
        cardNumber: "8600123456789012",
        expireDate: "1228",
        save: true,
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/card_token/request",
        {
          card_number: "8600123456789012",
          expire_date: "1228",
          temporary: 0,
          service_id: "test-service-id",
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            Auth: expect.any(String),
          }),
        })
      );

      expect(result).toEqual({
        cardToken: "test-card-token",
        requiresVerification: true,
      });
    });

    it("should create temporary card token when save is false", async () => {
      const mockResponse = {
        card_token: "test-card-token",
        phone_number: "+998901234567",
        card_number: "8600****1234",
        temporary: 1,
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      await clickClient.createCardToken({
        cardNumber: "8600123456789012",
        expireDate: "1228",
        save: false,
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/card_token/request",
        expect.objectContaining({
          temporary: 1,
        }),
        expect.any(Object)
      );
    });

    it("should default save to true when not provided", async () => {
      const mockResponse = {
        card_token: "test-card-token",
        phone_number: "+998901234567",
        card_number: "8600****1234",
        temporary: 0,
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      await clickClient.createCardToken({
        cardNumber: "8600123456789012",
        expireDate: "1228",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/card_token/request",
        expect.objectContaining({
          temporary: 0,
        }),
        expect.any(Object)
      );
    });

    it("should throw ClickError when API returns error", async () => {
      const mockResponse = {
        card_token: "",
        phone_number: "",
        card_number: "",
        temporary: 0,
        error_code: -1,
        error_note: "Invalid card number",
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      await expect(
        clickClient.createCardToken({
          cardNumber: "invalid",
          expireDate: "1228",
        })
      ).rejects.toThrow(ClickError);
    });

    it("should throw ClickError when card_token is missing", async () => {
      const mockResponse = {
        card_token: "",
        phone_number: "+998901234567",
        card_number: "8600****1234",
        temporary: 0,
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      await expect(
        clickClient.createCardToken({
          cardNumber: "8600123456789012",
          expireDate: "1228",
        })
      ).rejects.toThrow(ClickError);
    });
  });

  describe("verifyCardToken", () => {
    it("should verify card token successfully", async () => {
      const mockResponse = {
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      await clickClient.verifyCardToken({
        cardToken: "test-card-token",
        smsCode: "12345",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/card_token/verify",
        {
          service_id: "test-service-id",
          card_token: "test-card-token",
          sms_code: "12345",
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            Auth: expect.any(String),
          }),
        })
      );
    });

    it("should throw ClickError when verification fails", async () => {
      const mockResponse = {
        error_code: -1,
        error_note: "Invalid SMS code",
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      await expect(
        clickClient.verifyCardToken({
          cardToken: "test-card-token",
          smsCode: "wrong-code",
        })
      ).rejects.toThrow(ClickError);
    });
  });

  describe("chargeFromCardToken", () => {
    it("should charge from card token successfully", async () => {
      const mockResponse = {
        payment_id: 12345,
        payment_status: 2,
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await clickClient.chargeFromCardToken({
        cardToken: "test-card-token",
        amount: 1000,
        orderId: "order-123",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/card_token/payment",
        {
          service_id: "test-service-id",
          card_token: "test-card-token",
          amount: 1000,
          transaction_parameter: "order-123",
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            Auth: expect.any(String),
          }),
        })
      );

      expect(result).toEqual({
        transactionId: 12345,
        status: PaymentStatus.SUCCESS,
      });
    });

    it("should throw ClickError when payment fails", async () => {
      const mockResponse = {
        payment_id: 0,
        payment_status: 0,
        error_code: -1,
        error_note: "Payment failed",
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      await expect(
        clickClient.chargeFromCardToken({
          cardToken: "test-card-token",
          amount: 1000,
          orderId: "order-123",
        })
      ).rejects.toThrow(ClickError);
    });

    it("should throw ClickError when payment status is not success", async () => {
      const mockResponse = {
        payment_id: 12345,
        payment_status: 0, // Not success status
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      await expect(
        clickClient.chargeFromCardToken({
          cardToken: "test-card-token",
          amount: 1000,
          orderId: "order-123",
        })
      ).rejects.toThrow(ClickError);
    });
  });

  describe("generateInvoiceUrl", () => {
    it("should generate invoice URL with required parameters", () => {
      const result = clickClient.generateInvoiceUrl({
        amount: 5000,
        orderId: "order-456",
        returnUrl: "https://example.com/success",
      });

      expect(result).toBe(
        "https://my.click.uz/services/pay?service_id=test-service-id&merchant_id=test-merchant-id&amount=5000&transaction_param=order-456&return_url=https%3A%2F%2Fexample.com%2Fsuccess"
      );
    });

    it("should generate invoice URL with card type", () => {
      const result = clickClient.generateInvoiceUrl({
        amount: 5000,
        orderId: "order-456",
        returnUrl: "https://example.com/success",
        cardType: "uzcard",
      });

      expect(result).toContain("card_type=uzcard");
    });

    it("should URL encode parameters correctly", () => {
      const result = clickClient.generateInvoiceUrl({
        amount: 5000,
        orderId: "order with spaces",
        returnUrl: "https://example.com/success?param=value",
      });

      expect(result).toContain("transaction_param=order+with+spaces");
      expect(result).toContain(
        "return_url=https%3A%2F%2Fexample.com%2Fsuccess%3Fparam%3Dvalue"
      );
    });
  });

  describe("checkPaymentStatus", () => {
    it("should check payment status successfully", async () => {
      const mockResponse = {
        payment_status: 2,
        payment_status_note: "Success",
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await clickClient.checkPaymentStatus(12345);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/payment/status/test-service-id/12345",
        expect.objectContaining({
          headers: expect.objectContaining({
            Auth: expect.any(String),
          }),
        })
      );

      expect(result).toEqual({
        transactionId: 12345,
        status: PaymentStatus.SUCCESS,
      });
    });

    it("should throw ClickError when status check fails", async () => {
      const mockResponse = {
        payment_status: 0,
        payment_status_note: "Failed",
        error_code: -1,
        error_note: "Payment not found",
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      await expect(clickClient.checkPaymentStatus(12345)).rejects.toThrow(
        ClickError
      );
    });
  });

  describe("cancelPayment", () => {
    it("should cancel payment successfully", async () => {
      const mockResponse = {
        payment_id: 12345,
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.delete.mockResolvedValue(mockResponse);

      const result = await clickClient.cancelPayment(12345);

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        "/payment/reversal/test-service-id/12345",
        expect.objectContaining({
          headers: expect.objectContaining({
            Auth: expect.any(String),
          }),
        })
      );

      expect(result).toEqual({
        transactionId: 12345,
      });
    });

    it("should throw ClickError when cancellation fails", async () => {
      const mockResponse = {
        payment_id: 0,
        error_code: -1,
        error_note: "Cannot cancel payment",
      };

      mockHttpClient.delete.mockResolvedValue(mockResponse);

      await expect(clickClient.cancelPayment(12345)).rejects.toThrow(
        ClickError
      );
    });
  });

  describe("deleteCardToken", () => {
    it("should delete card token successfully", async () => {
      const mockResponse = {
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.delete.mockResolvedValue(mockResponse);

      await clickClient.deleteCardToken("test-card-token");

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        "/card_token/test-service-id/test-card-token",
        expect.objectContaining({
          headers: expect.objectContaining({
            Auth: expect.any(String),
          }),
        })
      );
    });

    it("should throw ClickError when deletion fails", async () => {
      const mockResponse = {
        error_code: -1,
        error_note: "Token not found",
      };

      mockHttpClient.delete.mockResolvedValue(mockResponse);

      await expect(
        clickClient.deleteCardToken("invalid-token")
      ).rejects.toThrow(ClickError);
    });
  });

  describe("error handling", () => {
    it("should handle HTTP client errors", async () => {
      const httpError = new Error("Network error");
      mockHttpClient.post.mockRejectedValue(httpError);

      await expect(
        clickClient.createCardToken({
          cardNumber: "8600123456789012",
          expireDate: "1228",
        })
      ).rejects.toThrow("Click API request failed: Network error");
    });

    it("should handle unknown errors", async () => {
      mockHttpClient.post.mockRejectedValue("Unknown error");

      await expect(
        clickClient.createCardToken({
          cardNumber: "8600123456789012",
          expireDate: "1228",
        })
      ).rejects.toThrow(
        "An unknown error occurred during the Click API request."
      );
    });
  });
});
