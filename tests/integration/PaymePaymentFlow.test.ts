import { PaymeClient } from "../../payme/PaymeClient";
import { PaymeWebhookHandler } from "../../payme/PaymeWebhookHandler";
import { PaymeError } from "../../errors/PaymeError";
import { PaymentStatus } from "../../types";
import { PaymeWebhookLogic } from "../../payme/types";

// Mock HttpClient for integration tests
jest.mock("../../utils/HttpClient");
import { HttpClient } from "../../utils/HttpClient";
const MockedHttpClient = HttpClient as jest.MockedClass<typeof HttpClient>;

describe("Payme Payment Flow Integration Tests", () => {
  let paymeClient: PaymeClient;
  let webhookHandler: PaymeWebhookHandler;
  let mockHttpClient: jest.Mocked<HttpClient>;
  let mockLogic: PaymeWebhookLogic;

  const config = {
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
    paymeClient = new PaymeClient(config);

    mockLogic = {
      checkPerformTransaction: jest.fn(),
      createTransaction: jest.fn(),
      performTransaction: jest.fn(),
      cancelTransaction: jest.fn(),
      checkTransaction: jest.fn(),
      getStatement: jest.fn(),
    };

    webhookHandler = new PaymeWebhookHandler({
      secretKey: config.merchantApiSecret,
      logic: mockLogic,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Complete Payment Flow", () => {
    it("should handle successful payment flow from start to finish", async () => {
      // Step 1: Create card token
      const createTokenResponse = {
        id: "123",
        result: {
          card: {
            token: "test-card-token-123",
            recurrent: true,
            verify: true,
          },
        },
      };

      mockHttpClient.post.mockResolvedValueOnce(createTokenResponse);

      const tokenResult = await paymeClient.createCardToken({
        cardNumber: "8600123456789012",
        expireDate: "1228",
        save: true,
      });

      expect(tokenResult.cardToken).toBe("test-card-token-123");
      expect(tokenResult.requiresVerification).toBe(false);

      // Step 2: Process payment (create receipt + pay receipt)
      const createReceiptResponse = {
        id: "124",
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
        id: "125",
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

      const paymentResult = await paymeClient.chargeFromCardToken({
        cardToken: "test-card-token-123",
        amount: 1000,
        orderId: "order-123",
      });

      expect(paymentResult.transactionId).toBe("receipt-123");
      expect(paymentResult.status).toBe(PaymentStatus.SUCCESS);
      expect(paymentResult.receipt).toBeDefined();

      // Step 3: Check receipt status
      const statusResponse = {
        id: "126",
        result: {
          state: 2,
        },
      };

      mockHttpClient.post.mockResolvedValueOnce(statusResponse);

      const statusResult = await paymeClient.checkReceiptStatus("receipt-123");

      expect(statusResult.status).toBe(PaymentStatus.SUCCESS);
    });

    it("should handle payment flow with SMS verification", async () => {
      // Step 1: Create card token that requires verification
      const createTokenResponse = {
        id: "123",
        result: {
          card: {
            token: "test-card-token-123",
            recurrent: true,
            verify: false,
          },
        },
      };

      mockHttpClient.post.mockResolvedValueOnce(createTokenResponse);

      const tokenResult = await paymeClient.createCardToken({
        cardNumber: "8600123456789012",
        expireDate: "1228",
        save: true,
      });

      expect(tokenResult.cardToken).toBe("test-card-token-123");
      expect(tokenResult.requiresVerification).toBe(true);

      // Step 2: Send verification code
      const sendCodeResponse = {
        id: "124",
        result: {
          sent: true,
          phone: "+998901234567",
          wait: 60,
        },
      };

      mockHttpClient.post.mockResolvedValueOnce(sendCodeResponse);

      const codeSent = await paymeClient.sendVerificationCode(
        "test-card-token-123"
      );
      expect(codeSent).toBe(true);

      // Step 3: Verify card
      const verifyResponse = {
        id: "125",
        result: {
          card: {
            token: "test-card-token-123",
            recurrent: true,
            verify: true,
          },
        },
      };

      mockHttpClient.post.mockResolvedValueOnce(verifyResponse);

      const verifyResult = await paymeClient.verifyCard({
        cardToken: "test-card-token-123",
        smsCode: "12345",
      });

      expect(verifyResult.cardToken).toBe("test-card-token-123");
      expect(verifyResult.isVerified).toBe(true);

      // Step 4: Process payment
      const createReceiptResponse = {
        id: "126",
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
        id: "127",
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

      const paymentResult = await paymeClient.chargeFromCardToken({
        cardToken: "test-card-token-123",
        amount: 1000,
        orderId: "order-123",
      });

      expect(paymentResult.transactionId).toBe("receipt-123");
      expect(paymentResult.status).toBe(PaymentStatus.SUCCESS);
    });

    it("should handle receipt cancellation", async () => {
      // First create a receipt
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

      mockHttpClient.post.mockResolvedValueOnce(createReceiptResponse);

      // Then cancel the receipt
      const cancelResponse = {
        id: "124",
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

      mockHttpClient.post.mockResolvedValueOnce(cancelResponse);

      const cancelResult = await paymeClient.cancelReceipt("receipt-123");

      expect(cancelResult.transactionId).toBe("receipt-123");
      expect(cancelResult.status).toBe(PaymentStatus.CANCELLED);
    });
  });

  describe("Webhook Integration", () => {
    const validAuthHeader =
      "Basic " +
      Buffer.from("Paycom:test-merchant-api-secret").toString("base64");

    it("should handle CheckPerformTransaction webhook", async () => {
      const request = {
        id: "123",
        method: "CheckPerformTransaction",
        params: {
          amount: 100000,
          account: { order_id: "order-123" },
        },
      };

      const mockResult = { allow: true };
      (mockLogic.checkPerformTransaction as jest.Mock).mockResolvedValue({
        result: mockResult,
      });

      const response = await webhookHandler.handle(request, validAuthHeader);

      expect(response).toEqual({
        id: "123",
        result: mockResult,
      });
    });

    it("should handle CreateTransaction webhook", async () => {
      const request = {
        id: "124",
        method: "CreateTransaction",
        params: {
          id: "payme-trans-123",
          time: Date.now(),
          amount: 100000,
          account: { order_id: "order-123" },
        },
      };

      const mockResult = {
        create_time: Date.now(),
        transaction: "merchant-trans-123",
        state: 1,
      };
      (mockLogic.createTransaction as jest.Mock).mockResolvedValue({
        result: mockResult,
      });

      const response = await webhookHandler.handle(request, validAuthHeader);

      expect(response).toEqual({
        id: "124",
        result: mockResult,
      });
    });

    it("should handle PerformTransaction webhook", async () => {
      const request = {
        id: "125",
        method: "PerformTransaction",
        params: {
          id: "payme-trans-123",
        },
      };

      const mockResult = {
        perform_time: Date.now(),
        transaction: "merchant-trans-123",
        state: 2,
      };
      (mockLogic.performTransaction as jest.Mock).mockResolvedValue({
        result: mockResult,
      });

      const response = await webhookHandler.handle(request, validAuthHeader);

      expect(response).toEqual({
        id: "125",
        result: mockResult,
      });
    });

    it("should handle CancelTransaction webhook", async () => {
      const request = {
        id: "126",
        method: "CancelTransaction",
        params: {
          id: "payme-trans-123",
          reason: 1,
        },
      };

      const mockResult = {
        cancel_time: Date.now(),
        transaction: "merchant-trans-123",
        state: -1,
      };
      (mockLogic.cancelTransaction as jest.Mock).mockResolvedValue({
        result: mockResult,
      });

      const response = await webhookHandler.handle(request, validAuthHeader);

      expect(response).toEqual({
        id: "126",
        result: mockResult,
      });
    });

    it("should handle CheckTransaction webhook", async () => {
      const request = {
        id: "127",
        method: "CheckTransaction",
        params: {
          id: "payme-trans-123",
        },
      };

      const mockResult = {
        create_time: Date.now(),
        perform_time: Date.now(),
        cancel_time: 0,
        transaction: "merchant-trans-123",
        state: 2,
      };
      (mockLogic.checkTransaction as jest.Mock).mockResolvedValue({
        result: mockResult,
      });

      const response = await webhookHandler.handle(request, validAuthHeader);

      expect(response).toEqual({
        id: "127",
        result: mockResult,
      });
    });

    it("should handle GetStatement webhook", async () => {
      const request = {
        id: "128",
        method: "GetStatement",
        params: {
          from: Date.now() - 86400000,
          to: Date.now(),
        },
      };

      const mockResult = {
        transactions: [
          {
            id: "payme-trans-123",
            time: Date.now(),
            amount: 100000,
            account: { order_id: "order-123" },
            create_time: Date.now(),
            perform_time: Date.now(),
            cancel_time: 0,
            transaction: "merchant-trans-123",
            state: 2,
          },
        ],
      };
      (mockLogic.getStatement as jest.Mock).mockResolvedValue({
        result: mockResult,
      });

      const response = await webhookHandler.handle(request, validAuthHeader);

      expect(response).toEqual({
        id: "128",
        result: mockResult,
      });
    });

    it("should handle webhook authentication failure", async () => {
      const request = {
        id: "129",
        method: "CheckPerformTransaction",
        params: {
          amount: 100000,
          account: { order_id: "order-123" },
        },
      };

      const invalidAuthHeader =
        "Basic " + Buffer.from("WrongUser:wrong-password").toString("base64");
      const response = await webhookHandler.handle(request, invalidAuthHeader);

      expect(response).toEqual({
        id: "129",
        error: {
          code: -32504,
          message: { en: "Unauthorized" },
          data: "Invalid login or password",
        },
      });
    });

    it("should handle webhook logic errors", async () => {
      const request = {
        id: "130",
        method: "CheckPerformTransaction",
        params: {
          amount: 100000,
          account: { order_id: "order-123" },
        },
      };

      const mockError = {
        code: -31001,
        message: { en: "Order not found" },
        data: { order_id: "order-123" },
      };
      (mockLogic.checkPerformTransaction as jest.Mock).mockResolvedValue({
        error: mockError,
      });

      const response = await webhookHandler.handle(request, validAuthHeader);

      expect(response).toEqual({
        id: "130",
        error: mockError,
      });
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle card token creation failure", async () => {
      const createTokenErrorResponse = {
        id: "123",
        error: {
          code: -32000,
          message: { en: "Invalid card number" },
        },
      };

      mockHttpClient.post.mockResolvedValueOnce(createTokenErrorResponse);

      await expect(
        paymeClient.createCardToken({
          cardNumber: "invalid-card",
          expireDate: "1228",
        })
      ).rejects.toThrow(PaymeError);
    });

    it("should handle verification code sending failure", async () => {
      const sendCodeErrorResponse = {
        id: "123",
        error: {
          code: -32000,
          message: { en: "Failed to send SMS" },
        },
      };

      mockHttpClient.post.mockResolvedValueOnce(sendCodeErrorResponse);

      await expect(
        paymeClient.sendVerificationCode("invalid-token")
      ).rejects.toThrow(PaymeError);
    });

    it("should handle card verification failure", async () => {
      const verifyErrorResponse = {
        id: "123",
        error: {
          code: -32000,
          message: { en: "Invalid verification code" },
        },
      };

      mockHttpClient.post.mockResolvedValueOnce(verifyErrorResponse);

      await expect(
        paymeClient.verifyCard({
          cardToken: "test-card-token-123",
          smsCode: "wrong-code",
        })
      ).rejects.toThrow(PaymeError);
    });

    it("should handle receipt creation failure", async () => {
      const createReceiptErrorResponse = {
        id: "123",
        error: {
          code: -32000,
          message: { en: "Failed to create receipt" },
        },
      };

      mockHttpClient.post.mockResolvedValueOnce(createReceiptErrorResponse);

      await expect(
        paymeClient.chargeFromCardToken({
          cardToken: "test-card-token-123",
          amount: 1000,
          orderId: "order-123",
        })
      ).rejects.toThrow(PaymeError);
    });

    it("should handle receipt payment failure", async () => {
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

      const payReceiptErrorResponse = {
        id: "124",
        error: {
          code: -32000,
          message: { en: "Payment failed" },
        },
      };

      mockHttpClient.post
        .mockResolvedValueOnce(createReceiptResponse)
        .mockResolvedValueOnce(payReceiptErrorResponse);

      await expect(
        paymeClient.chargeFromCardToken({
          cardToken: "test-card-token-123",
          amount: 1000,
          orderId: "order-123",
        })
      ).rejects.toThrow(PaymeError);
    });
  });

  describe("Invoice URL Generation", () => {
    it("should generate valid invoice URLs for different scenarios", () => {
      const scenarios = [
        {
          amount: 1000,
          orderId: "order-123",
          returnUrl: "https://example.com/success",
        },
        {
          amount: 5000,
          orderId: "order-456",
          returnUrl: "https://example.com/success?param=value",
        },
        {
          amount: 10000,
          orderId: "order with spaces",
          returnUrl: "https://example.com/success?param=value&other=test",
        },
      ];

      scenarios.forEach((scenario) => {
        const url = paymeClient.generateInvoiceUrl(scenario);

        expect(url).toContain("https://checkout.paycom.uz/");

        // Extract the base64 encoded part
        const encodedPart = url.replace("https://checkout.paycom.uz/", "");
        const decodedParams = Buffer.from(encodedPart, "base64").toString(
          "utf-8"
        );

        expect(decodedParams).toContain(`m=${config.merchantId}`);
        expect(decodedParams).toContain(`ac.order_id=${scenario.orderId}`);
        expect(decodedParams).toContain(`a=${scenario.amount * 100}`); // Amount in tiyins
        expect(decodedParams).toContain(`c=${scenario.returnUrl}`);
      });
    });

    it("should generate test mode invoice URLs", () => {
      const testConfig = { ...config, testMode: true };
      const testClient = new PaymeClient(testConfig);

      const url = testClient.generateInvoiceUrl({
        amount: 1000,
        orderId: "order-123",
        returnUrl: "https://example.com/success",
      });

      expect(url).toContain("https://test.paycom.uz/");
    });
  });
});
