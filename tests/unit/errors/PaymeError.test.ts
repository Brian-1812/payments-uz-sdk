import { PaymeError } from "../../../errors/PaymeError";
import { PaymeJsonRpcError } from "../../../payme/types";

describe("PaymeError", () => {
  it("should create a PaymeError with message and code", () => {
    const error = new PaymeError("Payme API error", -32000);

    expect(error.message).toBe("Payme API error");
    expect(error.code).toBe(-32000);
    expect(error.name).toBe("PaymeError");
    expect(error instanceof Error).toBe(true);
  });

  it("should create a PaymeError with data", () => {
    const data = { field: "value" };
    const error = new PaymeError("Test error", 123, data);

    expect(error.message).toBe("Test error");
    expect(error.code).toBe(123);
    expect(error.data).toEqual(data);
  });

  it("should create PaymeError from JSON-RPC error", () => {
    const jsonRpcError: PaymeJsonRpcError = {
      code: -32000,
      message: { en: "Invalid request", ru: "Неверный запрос" },
      data: { field: "value" },
    };

    const error = PaymeError.fromJsonRpcError(jsonRpcError);

    expect(error.message).toBe("Invalid request");
    expect(error.code).toBe(-32000);
    expect(error.data).toEqual({ field: "value" });
  });

  it("should handle JSON-RPC error with Russian message when English not available", () => {
    const jsonRpcError: PaymeJsonRpcError = {
      code: -32000,
      message: { ru: "Неверный запрос", uz: "Noto'g'ri so'rov" },
    };

    const error = PaymeError.fromJsonRpcError(jsonRpcError);

    expect(error.message).toBe("Неверный запрос");
    expect(error.code).toBe(-32000);
  });

  it("should handle JSON-RPC error with Uzbek message when others not available", () => {
    const jsonRpcError: PaymeJsonRpcError = {
      code: -32000,
      message: { uz: "Noto'g'ri so'rov" },
    };

    const error = PaymeError.fromJsonRpcError(jsonRpcError);

    expect(error.message).toBe("Noto'g'ri so'rov");
    expect(error.code).toBe(-32000);
  });

  it("should handle JSON-RPC error with no message", () => {
    const jsonRpcError: PaymeJsonRpcError = {
      code: -32000,
      message: {},
    };

    const error = PaymeError.fromJsonRpcError(jsonRpcError);

    expect(error.message).toBe("Unknown Payme Error");
    expect(error.code).toBe(-32000);
  });

  it("should inherit from BasePaymentError", () => {
    const error = new PaymeError("Test error", 123);

    expect(error instanceof Error).toBe(true);
    expect(error.name).toBe("PaymeError");
  });
});
