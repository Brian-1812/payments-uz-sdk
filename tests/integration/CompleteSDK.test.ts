/**
 * Complete SDK Integration Test
 *
 * This test demonstrates the complete functionality of the Uzbekistan Payments SDK
 * by testing both Click and Payme providers in a realistic scenario.
 */

import { ClickClient } from "../../click/ClickClient";
import { PaymeClient } from "../../payme/PaymeClient";
import { ClickWebhookHandler } from "../../click/ClickWebhookHandler";
import { PaymeWebhookHandler } from "../../payme/PaymeWebhookHandler";
import { PaymentStatus } from "../../types";
import { PaymeWebhookLogic } from "../../payme/types";

// Mock HttpClient for integration tests
jest.mock("../../utils/HttpClient");
import { HttpClient } from "../../utils/HttpClient";
const MockedHttpClient = HttpClient as jest.MockedClass<typeof HttpClient>;

describe("Complete SDK Integration Tests", () => {
  let clickClient: ClickClient;
  let paymeClient: PaymeClient;
  let clickWebhookHandler: ClickWebhookHandler;
  let paymeWebhookHandler: PaymeWebhookHandler;
  let mockHttpClient: jest.Mocked<HttpClient>;

  const clickConfig = {
    merchantId: "click-merchant-id",
    merchantUserId: "click-merchant-user-id",
    secretKey: "click-secret-key",
    serviceId: "click-service-id",
  };

  const paymeConfig = {
    merchantId: "payme-merchant-id",
    checkoutKey: "payme-checkout-key",
    merchantApiSecret: "payme-merchant-api-secret",
  };

  beforeEach(() => {
    mockHttpClient = {
      post: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    } as any;

    MockedHttpClient.mockImplementation(() => mockHttpClient);

    clickClient = new ClickClient(clickConfig);
    paymeClient = new PaymeClient(paymeConfig);
    clickWebhookHandler = new ClickWebhookHandler(clickConfig.secretKey);

    const mockLogic: PaymeWebhookLogic = {
      checkPerformTransaction: jest
        .fn()
        .mockResolvedValue({ result: { allow: true } }),
      createTransaction: jest.fn().mockResolvedValue({
        result: {
          create_time: Date.now(),
          transaction: "merchant-trans-123",
          state: 1,
        },
      }),
      performTransaction: jest.fn().mockResolvedValue({
        result: {
          perform_time: Date.now(),
          transaction: "merchant-trans-123",
          state: 2,
        },
      }),
      cancelTransaction: jest.fn().mockResolvedValue({
        result: {
          cancel_time: Date.now(),
          transaction: "merchant-trans-123",
          state: -1,
        },
      }),
      checkTransaction: jest.fn().mockResolvedValue({
        result: {
          create_time: Date.now(),
          perform_time: Date.now(),
          cancel_time: 0,
          transaction: "merchant-trans-123",
          state: 2,
        },
      }),
      getStatement: jest.fn().mockResolvedValue({
        result: { transactions: [] },
      }),
    };

    paymeWebhookHandler = new PaymeWebhookHandler({
      secretKey: paymeConfig.merchantApiSecret,
      logic: mockLogic,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Multi-Provider Payment Processing", () => {
    it("should process payments with both Click and Payme providers", async () => {
      // Click Payment Flow
      const clickTokenResponse = {
        card_token: "click-token-123",
        phone_number: "+998901234567",
        card_number: "8600****1234",
        temporary: 0,
        error_code: 0,
        error_note: "Success",
      };

      const clickVerifyResponse = {
        error_code: 0,
        error_note: "Success",
      };

      const clickPaymentResponse = {
        payment_id: 12345,
        payment_status: 2,
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post
        .mockResolvedValueOnce(clickTokenResponse)
        .mockResolvedValueOnce(clickVerifyResponse)
        .mockResolvedValueOnce(clickPaymentResponse);

      // Process Click payment
      const clickTokenResult = await clickClient.createCardToken({
        cardNumber: "8600123456789012",
        expireDate: "1228",
        save: true,
      });

      await clickClient.verifyCardToken({
        cardToken: clickTokenResult.cardToken,
        smsCode: "12345",
      });

      const clickPaymentResult = await clickClient.chargeFromCardToken({
        cardToken: clickTokenResult.cardToken,
        amount: 1000,
        orderId: "click-order-123",
      });

      expect(clickPaymentResult.status).toBe(PaymentStatus.SUCCESS);

      // Payme Payment Flow
      const paymeTokenResponse = {
        id: "123",
        result: {
          card: {
            token: "payme-token-123",
            recurrent: true,
            verify: true,
          },
        },
      };

      const paymeCreateReceiptResponse = {
        id: "124",
        result: {
          receipt: {
            _id: "payme-receipt-123",
            create_time: Date.now(),
            pay_time: 0,
            cancel_time: 0,
            state: 1,
            amount: 100000,
          },
        },
      };

      const paymePayReceiptResponse = {
        id: "125",
        result: {
          receipt: {
            _id: "payme-receipt-123",
            create_time: Date.now(),
            pay_time: Date.now(),
            cancel_time: 0,
            state: 2,
            amount: 100000,
          },
        },
      };

      mockHttpClient.post
        .mockResolvedValueOnce(paymeTokenResponse)
        .mockResolvedValueOnce(paymeCreateReceiptResponse)
        .mockResolvedValueOnce(paymePayReceiptResponse);

      // Process Payme payment
      const paymeTokenResult = await paymeClient.createCardToken({
        cardNumber: "8600123456789012",
        expireDate: "1228",
        save: true,
      });

      const paymePaymentResult = await paymeClient.chargeFromCardToken({
        cardToken: paymeTokenResult.cardToken,
        amount: 1000,
        orderId: "payme-order-123",
      });

      expect(paymePaymentResult.status).toBe(PaymentStatus.SUCCESS);

      // Verify both payments were processed
      expect(clickPaymentResult.transactionId).toBe(12345);
      expect(paymePaymentResult.transactionId).toBe("payme-receipt-123");
    });

    it("should handle payment failures across both providers", async () => {
      // Click payment failure
      const clickTokenErrorResponse = {
        card_token: "",
        phone_number: "",
        card_number: "",
        temporary: 0,
        error_code: -1,
        error_note: "Invalid card number",
      };

      mockHttpClient.post.mockResolvedValueOnce(clickTokenErrorResponse);

      await expect(
        clickClient.createCardToken({
          cardNumber: "invalid-card",
          expireDate: "1228",
        })
      ).rejects.toThrow();

      // Payme payment failure
      const paymeTokenErrorResponse = {
        id: "123",
        error: {
          code: -32000,
          message: { en: "Invalid card number" },
        },
      };

      mockHttpClient.post.mockResolvedValueOnce(paymeTokenErrorResponse);

      await expect(
        paymeClient.createCardToken({
          cardNumber: "invalid-card",
          expireDate: "1228",
        })
      ).rejects.toThrow();
    });
  });

  describe("Invoice URL Generation", () => {
    it("should generate valid invoice URLs for both providers", () => {
      const orderData = {
        amount: 5000,
        orderId: "order-123",
        returnUrl: "https://example.com/success",
      };

      // Click invoice URL
      const clickUrl = clickClient.generateInvoiceUrl(orderData);
      expect(clickUrl).toContain("https://my.click.uz/services/pay");
      expect(clickUrl).toContain(`amount=${orderData.amount}`);
      expect(clickUrl).toContain(`transaction_param=${orderData.orderId}`);

      // Payme invoice URL
      const paymeUrl = paymeClient.generateInvoiceUrl(orderData);
      expect(paymeUrl).toContain("https://checkout.paycom.uz/");

      // Verify base64 encoded parameters
      const encodedPart = paymeUrl.replace("https://checkout.paycom.uz/", "");
      const decodedParams = Buffer.from(encodedPart, "base64").toString(
        "utf-8"
      );
      expect(decodedParams).toContain(`m=${paymeConfig.merchantId}`);
      expect(decodedParams).toContain(`ac.order_id=${orderData.orderId}`);
      expect(decodedParams).toContain(`a=${orderData.amount * 100}`); // Amount in tiyins
    });
  });

  describe("Webhook Handling", () => {
    it("should handle webhooks from both providers", async () => {
      // Click webhook
      const clickWebhookBody = {
        click_trans_id: "123",
        service_id: "test-service",
        click_paydoc_id: "456",
        merchant_trans_id: "order-123",
        amount: "1000",
        action: 0, // Prepare
        error: 0,
        error_note: "Success",
        sign_time: "2023-01-01T00:00:00Z",
        sign_string: "", // Will be calculated
      };

      // Calculate valid Click signature
      const clickStringToHash = [
        clickWebhookBody.click_trans_id,
        clickWebhookBody.service_id,
        clickConfig.secretKey,
        clickWebhookBody.merchant_trans_id,
        clickWebhookBody.amount,
        clickWebhookBody.action,
        clickWebhookBody.sign_time,
      ].join("|");

      const clickValidSignature = require("crypto")
        .createHash("md5")
        .update(clickStringToHash)
        .digest("hex");
      clickWebhookBody.sign_string = clickValidSignature;

      // Verify Click webhook signature
      expect(() => {
        clickWebhookHandler.verifySignature(clickWebhookBody);
      }).not.toThrow();

      // Create Click success response
      const clickResponse = clickWebhookHandler.createSuccessResponse(
        clickWebhookBody,
        "prepare-123"
      );
      expect(clickResponse.error).toBe(0);

      // Payme webhook
      const paymeWebhookRequest = {
        id: "123",
        method: "CheckPerformTransaction",
        params: {
          amount: 100000,
          account: { order_id: "order-123" },
        },
      };

      const validAuthHeader =
        "Basic " +
        Buffer.from("Paycom:payme-merchant-api-secret").toString("base64");

      // Handle Payme webhook
      const paymeResponse = await paymeWebhookHandler.handle(
        paymeWebhookRequest,
        validAuthHeader
      );
      expect(paymeResponse.result).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle different error types from both providers", () => {
      // Test Click error
      const clickError = new (require("../../errors/ClickError").ClickError)(
        "Click error",
        -1
      );
      expect(clickError.name).toBe("ClickError");
      expect(clickError.code).toBe(-1);

      // Test Payme error
      const paymeError = new (require("../../errors/PaymeError").PaymeError)(
        "Payme error",
        -32000
      );
      expect(paymeError.name).toBe("PaymeError");
      expect(paymeError.code).toBe(-32000);

      // Test base error
      const baseError =
        new (require("../../errors/BaseError").BasePaymentError)(
          "Base error",
          123
        );
      expect(baseError.name).toBe("BasePaymentError");
      expect(baseError.code).toBe(123);
    });
  });

  describe("Status Mapping", () => {
    it("should correctly map statuses from both providers", () => {
      const { getStatusFromClickCode } = require("../../click/status");
      const { getStatusFromPaymeReceiptState } = require("../../payme/utils");

      // Test Click status mapping
      expect(getStatusFromClickCode(2)).toBe(PaymentStatus.SUCCESS);
      expect(getStatusFromClickCode(0)).toBe(PaymentStatus.PENDING);
      expect(getStatusFromClickCode(3)).toBe(PaymentStatus.CANCELLED);

      // Test Payme status mapping
      expect(getStatusFromPaymeReceiptState(2)).toBe(PaymentStatus.SUCCESS);
      expect(getStatusFromPaymeReceiptState(0)).toBe(PaymentStatus.PENDING);
      expect(getStatusFromPaymeReceiptState(4)).toBe(PaymentStatus.CANCELLED);
    });
  });

  describe("SDK Configuration", () => {
    it("should validate configuration for both providers", () => {
      // Test Click configuration validation
      expect(() => {
        new ClickClient({ ...clickConfig, merchantId: "" });
      }).toThrow(
        "ClickClient: merchantId, merchantUserId, secretKey, and serviceId are required."
      );

      // Test Payme configuration validation
      expect(() => {
        new PaymeClient({ ...paymeConfig, merchantId: "" });
      }).toThrow(
        "PaymeClient: merchantId, checkoutKey, and merchantApiSecret are required."
      );

      // Test webhook handler configuration validation
      expect(() => {
        new ClickWebhookHandler("");
      }).toThrow("ClickWebhookHandler: secretKey is required.");

      expect(() => {
        new PaymeWebhookHandler({ secretKey: "", logic: {} as any });
      }).toThrow(
        "PaymeWebhookHandler: secretKey and logic implementation are required."
      );
    });
  });

  describe("Real-world Scenarios", () => {
    it("should handle a complete e-commerce payment flow", async () => {
      // Simulate a user choosing Click for payment
      const clickTokenResponse = {
        card_token: "click-token-123",
        phone_number: "+998901234567",
        card_number: "8600****1234",
        temporary: 0,
        error_code: 0,
        error_note: "Success",
      };

      const clickVerifyResponse = {
        error_code: 0,
        error_note: "Success",
      };

      const clickPaymentResponse = {
        payment_id: 12345,
        payment_status: 2,
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post
        .mockResolvedValueOnce(clickTokenResponse)
        .mockResolvedValueOnce(clickVerifyResponse)
        .mockResolvedValueOnce(clickPaymentResponse);

      // Step 1: User enters card details
      const tokenResult = await clickClient.createCardToken({
        cardNumber: "8600123456789012",
        expireDate: "1228",
        save: true,
      });

      // Step 2: User receives SMS and enters code
      await clickClient.verifyCardToken({
        cardToken: tokenResult.cardToken,
        smsCode: "12345",
      });

      // Step 3: Payment is processed
      const paymentResult = await clickClient.chargeFromCardToken({
        cardToken: tokenResult.cardToken,
        amount: 25000, // 25,000 UZS
        orderId: "ecommerce-order-123",
      });

      // Step 4: Verify payment success
      expect(paymentResult.status).toBe(PaymentStatus.SUCCESS);
      expect(paymentResult.transactionId).toBe(12345);

      // Step 5: Generate invoice URL for alternative payment method
      const invoiceUrl = clickClient.generateInvoiceUrl({
        amount: 25000,
        orderId: "ecommerce-order-123",
        returnUrl: "https://shop.example.com/payment/success",
        cardType: "uzcard",
      });

      expect(invoiceUrl).toContain("https://my.click.uz/services/pay");
      expect(invoiceUrl).toContain("card_type=uzcard");
    });

    it("should handle payment cancellation and refund scenarios", async () => {
      // First create a successful payment
      const clickPaymentResponse = {
        payment_id: 12345,
        payment_status: 2,
        error_code: 0,
        error_note: "Success",
      };

      const clickCancelResponse = {
        payment_id: 12345,
        error_code: 0,
        error_note: "Success",
      };

      mockHttpClient.post.mockResolvedValueOnce(clickPaymentResponse);
      mockHttpClient.delete.mockResolvedValueOnce(clickCancelResponse);

      // Process payment
      await clickClient.chargeFromCardToken({
        cardToken: "test-token",
        amount: 1000,
        orderId: "order-123",
      });

      // Cancel payment
      const cancelResult = await clickClient.cancelPayment(12345);
      expect(cancelResult.transactionId).toBe(12345);

      // Test Payme receipt cancellation
      const paymeCancelResponse = {
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

      mockHttpClient.post.mockResolvedValueOnce(paymeCancelResponse);

      const paymeCancelResult = await paymeClient.cancelReceipt("receipt-123");
      expect(paymeCancelResult.status).toBe(PaymentStatus.CANCELLED);
    });
  });
});
