import { getStatusFromClickCode } from "../../../click/status";
import { PaymentStatus } from "../../../types";

describe("Click Status Mapping", () => {
  describe("getStatusFromClickCode", () => {
    it("should map status 0 (new) to PENDING", () => {
      expect(getStatusFromClickCode(0)).toBe(PaymentStatus.PENDING);
    });

    it("should map status 1 (waiting) to PENDING", () => {
      expect(getStatusFromClickCode(1)).toBe(PaymentStatus.PENDING);
    });

    it("should map status 2 (confirmed) to SUCCESS", () => {
      expect(getStatusFromClickCode(2)).toBe(PaymentStatus.SUCCESS);
    });

    it("should map status 3 (rejected) to CANCELLED", () => {
      expect(getStatusFromClickCode(3)).toBe(PaymentStatus.CANCELLED);
    });

    it("should map status 4 (refunded) to REFUNDED", () => {
      expect(getStatusFromClickCode(4)).toBe(PaymentStatus.REFUNDED);
    });

    it("should map status 5 (canceled) to CANCELLED", () => {
      expect(getStatusFromClickCode(5)).toBe(PaymentStatus.CANCELLED);
    });

    it("should map unknown status codes to FAILED", () => {
      expect(getStatusFromClickCode(999)).toBe(PaymentStatus.FAILED);
      expect(getStatusFromClickCode(-1)).toBe(PaymentStatus.FAILED);
      expect(getStatusFromClickCode(6)).toBe(PaymentStatus.FAILED);
      expect(getStatusFromClickCode(10)).toBe(PaymentStatus.FAILED);
    });

    it("should map undefined to FAILED", () => {
      expect(getStatusFromClickCode(undefined)).toBe(PaymentStatus.FAILED);
    });

    it("should map null to FAILED", () => {
      expect(getStatusFromClickCode(null as any)).toBe(PaymentStatus.FAILED);
    });

    it("should handle all valid Click status codes", () => {
      const statusMappings = [
        { code: 0, expected: PaymentStatus.PENDING },
        { code: 1, expected: PaymentStatus.PENDING },
        { code: 2, expected: PaymentStatus.SUCCESS },
        { code: 3, expected: PaymentStatus.CANCELLED },
        { code: 4, expected: PaymentStatus.REFUNDED },
        { code: 5, expected: PaymentStatus.CANCELLED },
      ];

      statusMappings.forEach(({ code, expected }) => {
        expect(getStatusFromClickCode(code)).toBe(expected);
      });
    });
  });
});
