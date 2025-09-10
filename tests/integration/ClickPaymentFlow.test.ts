import { ClickClient } from "../../click/ClickClient";
import { ClickWebhookHandler } from "../../click/ClickWebhookHandler";
import { ClickError } from "../../errors/ClickError";
import { ClickWebhookAction } from "../../click/types";

// Mock HttpClient for integration tests
jest.mock("../../utils/HttpClient");
import { HttpClient } from "../../utils/HttpClient";
import { PaymentStatus } from "../../types";
const MockedHttpClient = HttpClient as jest.MockedClass<typeof HttpClient>;

describe("Click Payment Flow Integration Tests", () => {
  let clickClient: ClickClient;
  let webhookHandler: ClickWebhookHandler;
  let mockHttpClient: jest.Mocked<HttpClient>;

  const config = {
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
    clickClient = new ClickClient(config);
    webhookHandler = new ClickWebhookHandler(config.secretKey);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Complete Payment Flow", () => {
    it("should handle successful payment flow from start to finish", async () => {
      // Step 1: Create card token
      const createTokenResponse = {
        card_token: "test-card-token-123",
        phone_number: "+998901234567",
        card_number: "8600****1234",
        temporary: 0,
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post.mockResolvedValueOnce(createTokenResponse);

      const tokenResult = await clickClient.createCardToken({
        cardNumber: "8600123456789012",
        expireDate: "1228",
        save: true,
      });

      expect(tokenResult.cardToken).toBe("test-card-token-123");
      expect(tokenResult.requiresVerification).toBe(true);

      // Step 2: Verify card token
      const verifyResponse = {
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post.mockResolvedValueOnce(verifyResponse);

      await clickClient.verifyCardToken({
        cardToken: "test-card-token-123",
        smsCode: "12345",
      });

      // Step 3: Process payment
      const paymentResponse = {
        payment_id: 12345,
        payment_status: 2,
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post.mockResolvedValueOnce(paymentResponse);

      const paymentResult = await clickClient.chargeFromCardToken({
        cardToken: "test-card-token-123",
        amount: 1000,
        orderId: "order-123",
      });

      expect(paymentResult.transactionId).toBe(12345);
      expect(paymentResult.status).toBe(PaymentStatus.SUCCESS);

      // Step 4: Check payment status
      const statusResponse = {
        payment_status: 2,
        payment_status_note: "Success",
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.get.mockResolvedValueOnce(statusResponse);

      const statusResult = await clickClient.checkPaymentStatus(12345);

      expect(statusResult.transactionId).toBe(12345);
      expect(statusResult.status).toBe(PaymentStatus.SUCCESS);
    });

    it("should handle payment cancellation flow", async () => {
      // First, simulate a successful payment
      const paymentResponse = {
        payment_id: 12345,
        payment_status: 2,
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post.mockResolvedValueOnce(paymentResponse);

      await clickClient.chargeFromCardToken({
        cardToken: "test-card-token-123",
        amount: 1000,
        orderId: "order-123",
      });

      // Then cancel the payment
      const cancelResponse = {
        payment_id: 12345,
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.delete.mockResolvedValueOnce(cancelResponse);

      const cancelResult = await clickClient.cancelPayment(12345);

      expect(cancelResult.transactionId).toBe(12345);
    });

    it("should handle card token deletion", async () => {
      // First create a token
      const createTokenResponse = {
        card_token: "test-card-token-123",
        phone_number: "+998901234567",
        card_number: "8600****1234",
        temporary: 0,
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post.mockResolvedValueOnce(createTokenResponse);

      await clickClient.createCardToken({
        cardNumber: "8600123456789012",
        expireDate: "1228",
        save: true,
      });

      // Then delete the token
      const deleteResponse = {
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.delete.mockResolvedValueOnce(deleteResponse);

      await clickClient.deleteCardToken("test-card-token-123");

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        "/card_token/test-service-id/test-card-token-123",
        expect.any(Object)
      );
    });
  });

  describe("Webhook Integration", () => {
    it("should handle Prepare webhook action", () => {
      const webhookBody = {
        click_trans_id: "123",
        service_id: "test-service",
        click_paydoc_id: "456",
        merchant_trans_id: "order-123",
        amount: "1000",
        action: ClickWebhookAction.Prepare,
        error: 0,
        error_note: "Success",
        sign_time: "2023-01-01T00:00:00Z",
        sign_string: "", // Will be calculated
      };

      // Calculate valid signature
      const stringToHash = [
        webhookBody.click_trans_id,
        webhookBody.service_id,
        config.secretKey,
        webhookBody.merchant_trans_id,
        webhookBody.amount,
        webhookBody.action,
        webhookBody.sign_time,
      ].join("|");

      const validSignature = require("crypto")
        .createHash("md5")
        .update(stringToHash)
        .digest("hex");
      webhookBody.sign_string = validSignature;

      // Verify signature
      expect(() => {
        webhookHandler.verifySignature(webhookBody);
      }).not.toThrow();

      // Create success response
      const response = webhookHandler.createSuccessResponse(
        webhookBody,
        "prepare-123"
      );

      expect(response).toEqual({
        click_trans_id: "123",
        merchant_trans_id: "order-123",
        merchant_prepare_id: "prepare-123",
        error: 0,
        error_note: "Success",
      });
    });

    it("should handle Complete webhook action", () => {
      const webhookBody = {
        click_trans_id: "123",
        service_id: "test-service",
        click_paydoc_id: "456",
        merchant_trans_id: "order-123",
        amount: "1000",
        action: ClickWebhookAction.Complete,
        error: 0,
        error_note: "Success",
        sign_time: "2023-01-01T00:00:00Z",
        sign_string: "", // Will be calculated
        merchant_prepare_id: "prepare-123",
      };

      // Calculate valid signature
      const stringToHash = [
        webhookBody.click_trans_id,
        webhookBody.service_id,
        config.secretKey,
        webhookBody.merchant_trans_id,
        webhookBody.merchant_prepare_id,
        webhookBody.amount,
        webhookBody.action,
        webhookBody.sign_time,
      ].join("|");

      const validSignature = require("crypto")
        .createHash("md5")
        .update(stringToHash)
        .digest("hex");
      webhookBody.sign_string = validSignature;

      // Verify signature
      expect(() => {
        webhookHandler.verifySignature(webhookBody);
      }).not.toThrow();

      // Create success response
      const response = webhookHandler.createSuccessResponse(
        webhookBody,
        "confirm-123"
      );

      expect(response).toEqual({
        click_trans_id: "123",
        merchant_trans_id: "order-123",
        merchant_prepare_id: "confirm-123",
        error: 0,
        error_note: "Success",
      });
    });

    it("should handle webhook signature verification failure", () => {
      const webhookBody = {
        click_trans_id: "123",
        service_id: "test-service",
        click_paydoc_id: "456",
        merchant_trans_id: "order-123",
        amount: "1000",
        action: ClickWebhookAction.Prepare,
        error: 0,
        error_note: "Success",
        sign_time: "2023-01-01T00:00:00Z",
        sign_string: "invalid-signature",
      };

      expect(() => {
        webhookHandler.verifySignature(webhookBody);
      }).toThrow(ClickError);
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle API errors throughout the flow", async () => {
      // Step 1: Create card token fails
      const createTokenErrorResponse = {
        card_token: "",
        phone_number: "",
        card_number: "",
        temporary: 0,
        error_code: -1,
        error_note: "Invalid card number",
      };

      mockHttpClient.post.mockResolvedValueOnce(createTokenErrorResponse);

      await expect(
        clickClient.createCardToken({
          cardNumber: "invalid-card",
          expireDate: "1228",
        })
      ).rejects.toThrow(ClickError);
    });

    it("should handle verification failure", async () => {
      // Step 1: Create card token succeeds
      const createTokenResponse = {
        card_token: "test-card-token-123",
        phone_number: "+998901234567",
        card_number: "8600****1234",
        temporary: 0,
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post.mockResolvedValueOnce(createTokenResponse);

      await clickClient.createCardToken({
        cardNumber: "8600123456789012",
        expireDate: "1228",
        save: true,
      });

      // Step 2: Verification fails
      const verifyErrorResponse = {
        error_code: -1,
        error_note: "Invalid SMS code",
      };

      mockHttpClient.post.mockResolvedValueOnce(verifyErrorResponse);

      await expect(
        clickClient.verifyCardToken({
          cardToken: "test-card-token-123",
          smsCode: "wrong-code",
        })
      ).rejects.toThrow(ClickError);
    });

    it("should handle payment failure", async () => {
      // Step 1: Create card token succeeds
      const createTokenResponse = {
        card_token: "test-card-token-123",
        phone_number: "+998901234567",
        card_number: "8600****1234",
        temporary: 0,
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post.mockResolvedValueOnce(createTokenResponse);

      await clickClient.createCardToken({
        cardNumber: "8600123456789012",
        expireDate: "1228",
        save: true,
      });

      // Step 2: Verification succeeds
      const verifyResponse = {
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post.mockResolvedValueOnce(verifyResponse);

      await clickClient.verifyCardToken({
        cardToken: "test-card-token-123",
        smsCode: "12345",
      });

      // Step 3: Payment fails
      const paymentErrorResponse = {
        payment_id: 0,
        payment_status: 0,
        error_code: -1,
        error_note: "Payment failed",
      };

      mockHttpClient.post.mockResolvedValueOnce(paymentErrorResponse);

      await expect(
        clickClient.chargeFromCardToken({
          cardToken: "test-card-token-123",
          amount: 1000,
          orderId: "order-123",
        })
      ).rejects.toThrow(ClickError);
    });
  });

  describe("Invoice URL Generation", () => {
    it("should generate valid invoice URLs for different scenarios", () => {
      const scenarios = [
        {
          amount: 1000,
          orderId: "order-123",
          returnUrl: "https://example.com/success",
          cardType: undefined,
        },
        {
          amount: 5000,
          orderId: "order-456",
          returnUrl: "https://example.com/success",
          cardType: "uzcard" as const,
        },
        {
          amount: 10000,
          orderId: "order-789",
          returnUrl: "https://example.com/success?param=value",
          cardType: "humo" as const,
        },
      ];

      scenarios.forEach((scenario) => {
        const url = clickClient.generateInvoiceUrl(scenario);

        expect(url).toContain("https://my.click.uz/services/pay");
        expect(url).toContain(`amount=${scenario.amount}`);
        expect(url).toContain(`transaction_param=${scenario.orderId}`);
        expect(url).toContain(
          `return_url=${encodeURIComponent(scenario.returnUrl)}`
        );

        if (scenario.cardType) {
          expect(url).toContain(`card_type=${scenario.cardType}`);
        }
      });
    });
  });
});
