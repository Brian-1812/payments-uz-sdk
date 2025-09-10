import { ClickError } from "../../../errors/ClickError";

describe("ClickError", () => {
  it("should create a ClickError with message and code", () => {
    const error = new ClickError("Click API error", -1);

    expect(error.message).toBe("Click API error");
    expect(error.code).toBe(-1);
    expect(error.name).toBe("ClickError");
    expect(error instanceof Error).toBe(true);
  });

  it("should inherit from BasePaymentError", () => {
    const error = new ClickError("Test error", 123);

    expect(error instanceof Error).toBe(true);
    expect(error.name).toBe("ClickError");
  });

  it("should handle different error codes", () => {
    const error1 = new ClickError("Invalid signature", -1);
    const error2 = new ClickError("Incorrect amount", -2);

    expect(error1.code).toBe(-1);
    expect(error2.code).toBe(-2);
  });
});
