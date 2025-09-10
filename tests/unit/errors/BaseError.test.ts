import { BasePaymentError } from "../../../errors/BaseError";

describe("BasePaymentError", () => {
  it("should create an error with message and code", () => {
    const error = new BasePaymentError("Test error", 123);

    expect(error.message).toBe("Test error");
    expect(error.code).toBe(123);
    expect(error.name).toBe("BasePaymentError");
    expect(error instanceof Error).toBe(true);
  });

  it("should create an error with string code", () => {
    const error = new BasePaymentError("Test error", "ERROR_CODE");

    expect(error.message).toBe("Test error");
    expect(error.code).toBe("ERROR_CODE");
    expect(error.name).toBe("BasePaymentError");
  });

  it("should set prototype correctly", () => {
    const error = new BasePaymentError("Test error", 123);

    expect(Object.getPrototypeOf(error)).toBe(BasePaymentError.prototype);
  });
});
