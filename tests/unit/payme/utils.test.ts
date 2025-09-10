import {
  generatePaymeInvoiceUrl,
  getStatusFromPaymeReceiptState,
} from "../../../payme/utils";
import { PaymentStatus } from "../../../types";

describe("Payme Utils", () => {
  describe("generatePaymeInvoiceUrl", () => {
    it("should generate valid invoice URL", () => {
      const baseUrl = "https://checkout.paycom.uz/";
      const merchantId = "test-merchant-id";
      const amountInTiyins = 100000;
      const orderId = "order-123";
      const returnUrl = "https://example.com/success";

      const url = generatePaymeInvoiceUrl(
        baseUrl,
        merchantId,
        amountInTiyins,
        orderId,
        returnUrl
      );

      expect(url).toContain(baseUrl);

      // Extract the base64 encoded part
      const encodedPart = url.replace(baseUrl, "");
      const decodedParams = Buffer.from(encodedPart, "base64").toString(
        "utf-8"
      );

      expect(decodedParams).toBe(
        `m=${merchantId};ac.order_id=${orderId};a=${amountInTiyins};c=${returnUrl}`
      );
    });

    it("should handle special characters in orderId", () => {
      const baseUrl = "https://checkout.paycom.uz/";
      const merchantId = "test-merchant-id";
      const amountInTiyins = 100000;
      const orderId = "order-123 with spaces & symbols!";
      const returnUrl = "https://example.com/success";

      const url = generatePaymeInvoiceUrl(
        baseUrl,
        merchantId,
        amountInTiyins,
        orderId,
        returnUrl
      );

      const encodedPart = url.replace(baseUrl, "");
      const decodedParams = Buffer.from(encodedPart, "base64").toString(
        "utf-8"
      );

      expect(decodedParams).toBe(
        `m=${merchantId};ac.order_id=${orderId};a=${amountInTiyins};c=${returnUrl}`
      );
    });

    it("should handle special characters in returnUrl", () => {
      const baseUrl = "https://checkout.paycom.uz/";
      const merchantId = "test-merchant-id";
      const amountInTiyins = 100000;
      const orderId = "order-123";
      const returnUrl = "https://example.com/success?param=value&other=test";

      const url = generatePaymeInvoiceUrl(
        baseUrl,
        merchantId,
        amountInTiyins,
        orderId,
        returnUrl
      );

      const encodedPart = url.replace(baseUrl, "");
      const decodedParams = Buffer.from(encodedPart, "base64").toString(
        "utf-8"
      );

      expect(decodedParams).toBe(
        `m=${merchantId};ac.order_id=${orderId};a=${amountInTiyins};c=${returnUrl}`
      );
    });

    it("should handle empty strings", () => {
      const baseUrl = "https://checkout.paycom.uz/";
      const merchantId = "";
      const amountInTiyins = 0;
      const orderId = "";
      const returnUrl = "";

      const url = generatePaymeInvoiceUrl(
        baseUrl,
        merchantId,
        amountInTiyins,
        orderId,
        returnUrl
      );

      const encodedPart = url.replace(baseUrl, "");
      const decodedParams = Buffer.from(encodedPart, "base64").toString(
        "utf-8"
      );

      expect(decodedParams).toBe(
        `m=${merchantId};ac.order_id=${orderId};a=${amountInTiyins};c=${returnUrl}`
      );
    });

    it("should handle different base URLs", () => {
      const testUrls = [
        "https://checkout.paycom.uz/",
        "https://test.paycom.uz/",
        "https://example.com/",
      ];

      testUrls.forEach((baseUrl) => {
        const url = generatePaymeInvoiceUrl(
          baseUrl,
          "merchant",
          1000,
          "order",
          "return"
        );
        expect(url).toContain(baseUrl);
      });
    });

    it("should handle large amounts", () => {
      const baseUrl = "https://checkout.paycom.uz/";
      const merchantId = "test-merchant-id";
      const amountInTiyins = 999999999;
      const orderId = "order-123";
      const returnUrl = "https://example.com/success";

      const url = generatePaymeInvoiceUrl(
        baseUrl,
        merchantId,
        amountInTiyins,
        orderId,
        returnUrl
      );

      const encodedPart = url.replace(baseUrl, "");
      const decodedParams = Buffer.from(encodedPart, "base64").toString(
        "utf-8"
      );

      expect(decodedParams).toBe(
        `m=${merchantId};ac.order_id=${orderId};a=${amountInTiyins};c=${returnUrl}`
      );
    });
  });

  describe("getStatusFromPaymeReceiptState", () => {
    it("should map state 0 (new) to PENDING", () => {
      expect(getStatusFromPaymeReceiptState(0)).toBe(PaymentStatus.PENDING);
    });

    it("should map state 1 (waiting for payment) to PENDING", () => {
      expect(getStatusFromPaymeReceiptState(1)).toBe(PaymentStatus.PENDING);
    });

    it("should map state 2 (paid) to SUCCESS", () => {
      expect(getStatusFromPaymeReceiptState(2)).toBe(PaymentStatus.SUCCESS);
    });

    it("should map state 3 (cancelled by timeout) to CANCELLED", () => {
      expect(getStatusFromPaymeReceiptState(3)).toBe(PaymentStatus.CANCELLED);
    });

    it("should map state 4 (cancelled) to CANCELLED", () => {
      expect(getStatusFromPaymeReceiptState(4)).toBe(PaymentStatus.CANCELLED);
    });

    it("should map state 5 (waiting for refund) to PENDING", () => {
      expect(getStatusFromPaymeReceiptState(5)).toBe(PaymentStatus.PENDING);
    });

    it("should map state 6 (refunded) to REFUNDED", () => {
      expect(getStatusFromPaymeReceiptState(6)).toBe(PaymentStatus.REFUNDED);
    });

    it("should map unknown state codes to FAILED", () => {
      expect(getStatusFromPaymeReceiptState(999)).toBe(PaymentStatus.FAILED);
      expect(getStatusFromPaymeReceiptState(-1)).toBe(PaymentStatus.FAILED);
      expect(getStatusFromPaymeReceiptState(7)).toBe(PaymentStatus.FAILED);
      expect(getStatusFromPaymeReceiptState(10)).toBe(PaymentStatus.FAILED);
    });

    it("should map undefined to FAILED", () => {
      expect(getStatusFromPaymeReceiptState(undefined)).toBe(
        PaymentStatus.FAILED
      );
    });

    it("should map null to FAILED", () => {
      expect(getStatusFromPaymeReceiptState(null as any)).toBe(
        PaymentStatus.FAILED
      );
    });

    it("should handle all valid Payme receipt states", () => {
      const stateMappings = [
        { code: 0, expected: PaymentStatus.PENDING },
        { code: 1, expected: PaymentStatus.PENDING },
        { code: 2, expected: PaymentStatus.SUCCESS },
        { code: 3, expected: PaymentStatus.CANCELLED },
        { code: 4, expected: PaymentStatus.CANCELLED },
        { code: 5, expected: PaymentStatus.PENDING },
        { code: 6, expected: PaymentStatus.REFUNDED },
      ];

      stateMappings.forEach(({ code, expected }) => {
        expect(getStatusFromPaymeReceiptState(code)).toBe(expected);
      });
    });

    it("should handle edge cases", () => {
      // Test with various edge cases
      expect(getStatusFromPaymeReceiptState(Number.MAX_SAFE_INTEGER)).toBe(
        PaymentStatus.FAILED
      );
      expect(getStatusFromPaymeReceiptState(Number.MIN_SAFE_INTEGER)).toBe(
        PaymentStatus.FAILED
      );
      expect(getStatusFromPaymeReceiptState(NaN)).toBe(PaymentStatus.FAILED);
    });
  });
});
