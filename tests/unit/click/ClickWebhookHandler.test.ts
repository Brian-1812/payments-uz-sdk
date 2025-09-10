import { ClickWebhookHandler } from "../../../click/ClickWebhookHandler";
import { ClickError } from "../../../errors/ClickError";
import { ClickWebhookAction, CLICK_ERROR_CODES } from "../../../click/types";

// Mock the utils module
jest.mock("../../../click/utils", () => ({
  verifyWebhookSignature: jest.fn(),
}));

import { verifyWebhookSignature } from "../../../click/utils";
const mockVerifyWebhookSignature =
  verifyWebhookSignature as jest.MockedFunction<typeof verifyWebhookSignature>;

describe("ClickWebhookHandler", () => {
  let webhookHandler: ClickWebhookHandler;
  const secretKey = "test-secret-key";

  beforeEach(() => {
    webhookHandler = new ClickWebhookHandler(secretKey);
    mockVerifyWebhookSignature.mockClear();
  });

  describe("constructor", () => {
    it("should create ClickWebhookHandler with valid secret key", () => {
      expect(webhookHandler).toBeDefined();
    });

    it("should throw error when secretKey is missing", () => {
      expect(() => {
        new ClickWebhookHandler("");
      }).toThrow("ClickWebhookHandler: secretKey is required.");
    });
  });

  describe("verifySignature", () => {
    it("should verify signature successfully", () => {
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
        sign_string: "test-signature",
      };

      mockVerifyWebhookSignature.mockReturnValue(true);

      expect(() => {
        webhookHandler.verifySignature(webhookBody);
      }).not.toThrow();

      expect(mockVerifyWebhookSignature).toHaveBeenCalledWith(
        webhookBody,
        secretKey
      );
    });

    it("should throw ClickError when signature is invalid", () => {
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

      mockVerifyWebhookSignature.mockReturnValue(false);

      expect(() => {
        webhookHandler.verifySignature(webhookBody);
      }).toThrow(ClickError);

      expect(mockVerifyWebhookSignature).toHaveBeenCalledWith(
        webhookBody,
        secretKey
      );
    });
  });

  describe("createSuccessResponse", () => {
    it("should create success response for Prepare action", () => {
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
        sign_string: "test-signature",
      };

      const result = webhookHandler.createSuccessResponse(
        webhookBody,
        "prepare-123"
      );

      expect(result).toEqual({
        click_trans_id: "123",
        merchant_trans_id: "order-123",
        merchant_prepare_id: "prepare-123",
        error: 0,
        error_note: "Success",
      });
    });

    it("should create success response for Complete action", () => {
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
        sign_string: "test-signature",
        merchant_prepare_id: "prepare-123",
      };

      const result = webhookHandler.createSuccessResponse(
        webhookBody,
        "confirm-123"
      );

      expect(result).toEqual({
        click_trans_id: "123",
        merchant_trans_id: "order-123",
        merchant_prepare_id: "confirm-123",
        error: 0,
        error_note: "Success",
      });
    });

    it("should handle numeric merchant prepare ID", () => {
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
        sign_string: "test-signature",
      };

      const result = webhookHandler.createSuccessResponse(webhookBody, 12345);

      expect(result).toEqual({
        click_trans_id: "123",
        merchant_trans_id: "order-123",
        merchant_prepare_id: 12345,
        error: 0,
        error_note: "Success",
      });
    });
  });

  describe("createErrorResponse", () => {
    it("should create error response with sign check failed", () => {
      const result = webhookHandler.createErrorResponse(
        CLICK_ERROR_CODES.SIGN_CHECK_FAILED,
        "Invalid signature"
      );

      expect(result).toEqual({
        click_trans_id: "",
        merchant_trans_id: "",
        error: -1,
        error_note: "Invalid signature",
      });
    });

    it("should create error response with incorrect amount", () => {
      const result = webhookHandler.createErrorResponse(
        CLICK_ERROR_CODES.INCORRECT_AMOUNT,
        "Amount mismatch"
      );

      expect(result).toEqual({
        click_trans_id: "",
        merchant_trans_id: "",
        error: -2,
        error_note: "Amount mismatch",
      });
    });

    it("should create error response with action not found", () => {
      const result = webhookHandler.createErrorResponse(
        CLICK_ERROR_CODES.ACTION_NOT_FOUND,
        "Action not supported"
      );

      expect(result).toEqual({
        click_trans_id: "",
        merchant_trans_id: "",
        error: -3,
        error_note: "Action not supported",
      });
    });

    it("should create error response with already paid", () => {
      const result = webhookHandler.createErrorResponse(
        CLICK_ERROR_CODES.ALREADY_PAID,
        "Payment already processed"
      );

      expect(result).toEqual({
        click_trans_id: "",
        merchant_trans_id: "",
        error: -4,
        error_note: "Payment already processed",
      });
    });

    it("should create error response with user not found", () => {
      const result = webhookHandler.createErrorResponse(
        CLICK_ERROR_CODES.USER_NOT_FOUND,
        "User not found"
      );

      expect(result).toEqual({
        click_trans_id: "",
        merchant_trans_id: "",
        error: -5,
        error_note: "User not found",
      });
    });

    it("should create error response with transaction not found", () => {
      const result = webhookHandler.createErrorResponse(
        CLICK_ERROR_CODES.TRANSACTION_NOT_FOUND,
        "Transaction not found"
      );

      expect(result).toEqual({
        click_trans_id: "",
        merchant_trans_id: "",
        error: -6,
        error_note: "Transaction not found",
      });
    });

    it("should create error response with failed to update user", () => {
      const result = webhookHandler.createErrorResponse(
        CLICK_ERROR_CODES.FAILED_TO_UPDATE_USER,
        "Failed to update user"
      );

      expect(result).toEqual({
        click_trans_id: "",
        merchant_trans_id: "",
        error: -7,
        error_note: "Failed to update user",
      });
    });

    it("should create error response with error in request", () => {
      const result = webhookHandler.createErrorResponse(
        CLICK_ERROR_CODES.ERROR_IN_REQUEST,
        "Invalid request format"
      );

      expect(result).toEqual({
        click_trans_id: "",
        merchant_trans_id: "",
        error: -8,
        error_note: "Invalid request format",
      });
    });

    it("should create error response with transaction cancelled", () => {
      const result = webhookHandler.createErrorResponse(
        CLICK_ERROR_CODES.TRANSACTION_CANCELLED,
        "Transaction was cancelled"
      );

      expect(result).toEqual({
        click_trans_id: "",
        merchant_trans_id: "",
        error: -9,
        error_note: "Transaction was cancelled",
      });
    });
  });
});
