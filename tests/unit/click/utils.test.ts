import {
  getDigestAuthToken,
  verifyWebhookSignature,
} from "../../../click/utils";
import { ClickWebhookAction } from "../../../click/types";

describe("Click Utils", () => {
  describe("getDigestAuthToken", () => {
    it("should generate valid digest auth token", () => {
      const merchantUserId = "test-user-id";
      const secretKey = "test-secret-key";

      const token = getDigestAuthToken(merchantUserId, secretKey);

      expect(token).toMatch(/^test-user-id:[a-f0-9]{40}:\d+$/);

      const parts = token.split(":");
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe(merchantUserId);
      expect(parts[1]).toMatch(/^[a-f0-9]{40}$/); // SHA1 hash
      expect(parts[2]).toMatch(/^\d+$/); // timestamp
    });

    it("should generate different tokens for different timestamps", () => {
      const merchantUserId = "test-user-id";
      const secretKey = "test-secret-key";

      const token1 = getDigestAuthToken(merchantUserId, secretKey);

      // Wait a bit to ensure different timestamp
      setTimeout(() => {
        const token2 = getDigestAuthToken(merchantUserId, secretKey);
        expect(token1).not.toBe(token2);
      }, 1000);
    });

    it("should generate consistent tokens for same timestamp", () => {
      const merchantUserId = "test-user-id";
      const secretKey = "test-secret-key";

      // Mock Date.now to return consistent timestamp
      const mockTimestamp = 1640995200; // Fixed timestamp
      jest.spyOn(Date, "now").mockReturnValue(mockTimestamp * 1000);

      const token1 = getDigestAuthToken(merchantUserId, secretKey);
      const token2 = getDigestAuthToken(merchantUserId, secretKey);

      expect(token1).toBe(token2);

      jest.restoreAllMocks();
    });

    it("should handle empty strings", () => {
      const token = getDigestAuthToken("", "");

      expect(token).toMatch(/^:[a-f0-9]{40}:\d+$/);
    });
  });

  describe("verifyWebhookSignature", () => {
    const secretKey = "test-secret-key";

    it("should verify valid signature for Prepare action", () => {
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

      // Calculate the expected signature
      const stringToHash = [
        webhookBody.click_trans_id,
        webhookBody.service_id,
        secretKey,
        webhookBody.merchant_trans_id,
        webhookBody.amount,
        webhookBody.action,
        webhookBody.sign_time,
      ].join("|");

      const expectedSignature = require("crypto")
        .createHash("md5")
        .update(stringToHash)
        .digest("hex");
      webhookBody.sign_string = expectedSignature;

      const isValid = verifyWebhookSignature(webhookBody, secretKey);
      expect(isValid).toBe(true);
    });

    it("should verify valid signature for Complete action with merchant_prepare_id", () => {
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

      // Calculate the expected signature
      const stringToHash = [
        webhookBody.click_trans_id,
        webhookBody.service_id,
        secretKey,
        webhookBody.merchant_trans_id,
        webhookBody.merchant_prepare_id, // Included for Complete action
        webhookBody.amount,
        webhookBody.action,
        webhookBody.sign_time,
      ].join("|");

      const expectedSignature = require("crypto")
        .createHash("md5")
        .update(stringToHash)
        .digest("hex");
      webhookBody.sign_string = expectedSignature;

      const isValid = verifyWebhookSignature(webhookBody, secretKey);
      expect(isValid).toBe(true);
    });

    it("should reject invalid signature", () => {
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

      const isValid = verifyWebhookSignature(webhookBody, secretKey);
      expect(isValid).toBe(false);
    });

    it("should reject signature with wrong secret key", () => {
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
        sign_string: "", // Will be calculated with wrong key
      };

      // Calculate signature with wrong secret key
      const stringToHash = [
        webhookBody.click_trans_id,
        webhookBody.service_id,
        "wrong-secret-key",
        webhookBody.merchant_trans_id,
        webhookBody.amount,
        webhookBody.action,
        webhookBody.sign_time,
      ].join("|");

      const wrongSignature = require("crypto")
        .createHash("md5")
        .update(stringToHash)
        .digest("hex");
      webhookBody.sign_string = wrongSignature;

      const isValid = verifyWebhookSignature(webhookBody, secretKey);
      expect(isValid).toBe(false);
    });

    it("should handle Complete action without merchant_prepare_id", () => {
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
        // merchant_prepare_id is missing
      };

      // Calculate the expected signature (without merchant_prepare_id)
      const stringToHash = [
        webhookBody.click_trans_id,
        webhookBody.service_id,
        secretKey,
        webhookBody.merchant_trans_id,
        webhookBody.amount,
        webhookBody.action,
        webhookBody.sign_time,
      ].join("|");

      const expectedSignature = require("crypto")
        .createHash("md5")
        .update(stringToHash)
        .digest("hex");
      webhookBody.sign_string = expectedSignature;

      const isValid = verifyWebhookSignature(webhookBody, secretKey);
      expect(isValid).toBe(true);
    });

    it("should handle empty values", () => {
      const webhookBody = {
        click_trans_id: "",
        service_id: "",
        click_paydoc_id: "",
        merchant_trans_id: "",
        amount: "",
        action: ClickWebhookAction.Prepare,
        error: 0,
        error_note: "",
        sign_time: "",
        sign_string: "", // Will be calculated
      };

      // Calculate the expected signature
      const stringToHash = [
        webhookBody.click_trans_id,
        webhookBody.service_id,
        secretKey,
        webhookBody.merchant_trans_id,
        webhookBody.amount,
        webhookBody.action,
        webhookBody.sign_time,
      ].join("|");

      const expectedSignature = require("crypto")
        .createHash("md5")
        .update(stringToHash)
        .digest("hex");
      webhookBody.sign_string = expectedSignature;

      const isValid = verifyWebhookSignature(webhookBody, secretKey);
      expect(isValid).toBe(true);
    });
  });
});
