import { PaymeWebhookHandler } from "../../../payme/PaymeWebhookHandler";
import { PaymeError } from "../../../errors/PaymeError";
import {
  PaymeWebhookLogic,
  PaymeJsonRpcRequest,
  PaymeJsonRpcResponse,
} from "../../../payme/types";

describe("PaymeWebhookHandler", () => {
  let webhookHandler: PaymeWebhookHandler;
  let mockLogic: PaymeWebhookLogic;
  const secretKey = "test-secret-key";

  beforeEach(() => {
    mockLogic = {
      checkPerformTransaction: jest.fn(),
      createTransaction: jest.fn(),
      performTransaction: jest.fn(),
      cancelTransaction: jest.fn(),
      checkTransaction: jest.fn(),
      getStatement: jest.fn(),
    };

    webhookHandler = new PaymeWebhookHandler({
      secretKey,
      logic: mockLogic,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create PaymeWebhookHandler with valid config", () => {
      expect(webhookHandler).toBeDefined();
    });

    it("should throw error when secretKey is missing", () => {
      expect(() => {
        new PaymeWebhookHandler({
          secretKey: "",
          logic: mockLogic,
        });
      }).toThrow(
        "PaymeWebhookHandler: secretKey and logic implementation are required."
      );
    });

    it("should throw error when logic is missing", () => {
      expect(() => {
        new PaymeWebhookHandler({
          secretKey,
          logic: null as any,
        });
      }).toThrow(
        "PaymeWebhookHandler: secretKey and logic implementation are required."
      );
    });
  });

  describe("handle", () => {
    const validAuthHeader =
      "Basic " + Buffer.from("Paycom:test-secret-key").toString("base64");

    it("should handle CheckPerformTransaction successfully", async () => {
      const request: PaymeJsonRpcRequest<any> = {
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

      expect(mockLogic.checkPerformTransaction).toHaveBeenCalledWith(
        request.params,
        "123"
      );
      expect(response).toEqual({
        id: "123",
        result: mockResult,
      });
    });

    it("should handle CreateTransaction successfully", async () => {
      const request: PaymeJsonRpcRequest<any> = {
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

      expect(mockLogic.createTransaction).toHaveBeenCalledWith(
        request.params,
        "124"
      );
      expect(response).toEqual({
        id: "124",
        result: mockResult,
      });
    });

    it("should handle PerformTransaction successfully", async () => {
      const request: PaymeJsonRpcRequest<any> = {
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

      expect(mockLogic.performTransaction).toHaveBeenCalledWith(
        request.params,
        "125"
      );
      expect(response).toEqual({
        id: "125",
        result: mockResult,
      });
    });

    it("should handle CancelTransaction successfully", async () => {
      const request: PaymeJsonRpcRequest<any> = {
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

      expect(mockLogic.cancelTransaction).toHaveBeenCalledWith(
        request.params,
        "126"
      );
      expect(response).toEqual({
        id: "126",
        result: mockResult,
      });
    });

    it("should handle CheckTransaction successfully", async () => {
      const request: PaymeJsonRpcRequest<any> = {
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

      expect(mockLogic.checkTransaction).toHaveBeenCalledWith(
        request.params,
        "127"
      );
      expect(response).toEqual({
        id: "127",
        result: mockResult,
      });
    });

    it("should handle GetStatement successfully", async () => {
      const request: PaymeJsonRpcRequest<any> = {
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

      expect(mockLogic.getStatement).toHaveBeenCalledWith(
        request.params,
        "128"
      );
      expect(response).toEqual({
        id: "128",
        result: mockResult,
      });
    });

    it("should handle logic errors", async () => {
      const request: PaymeJsonRpcRequest<any> = {
        id: "129",
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
        id: "129",
        error: mockError,
      });
    });

    it("should throw error for unknown method", async () => {
      const request: PaymeJsonRpcRequest<any> = {
        id: "130",
        method: "UnknownMethod" as any,
        params: {},
      };

      const response = await webhookHandler.handle(request, validAuthHeader);

      expect(response).toEqual({
        id: "130",
        error: {
          code: -32601,
          message: { en: "Method not found" },
        },
      });
    });

    it("should throw PaymeError for invalid authorization header", async () => {
      const request: PaymeJsonRpcRequest<any> = {
        id: "131",
        method: "CheckPerformTransaction",
        params: {
          amount: 100000,
          account: { order_id: "order-123" },
        },
      };

      const response = await webhookHandler.handle(request, "Invalid header");

      expect(response).toEqual({
        id: "131",
        error: {
          code: -32504,
          message: { en: "Unauthorized" },
          data: "Authorization header missing or invalid",
        },
      });
    });

    it("should throw PaymeError for missing authorization header", async () => {
      const request: PaymeJsonRpcRequest<any> = {
        id: "132",
        method: "CheckPerformTransaction",
        params: {
          amount: 100000,
          account: { order_id: "order-123" },
        },
      };

      const response = await webhookHandler.handle(request);

      expect(response).toEqual({
        id: "132",
        error: {
          code: -32504,
          message: { en: "Unauthorized" },
          data: "Authorization header missing or invalid",
        },
      });
    });

    it("should throw PaymeError for invalid credentials", async () => {
      const request: PaymeJsonRpcRequest<any> = {
        id: "133",
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
        id: "133",
        error: {
          code: -32504,
          message: { en: "Unauthorized" },
          data: "Invalid login or password",
        },
      });
    });

    it("should handle unexpected errors", async () => {
      const request: PaymeJsonRpcRequest<any> = {
        id: "134",
        method: "CheckPerformTransaction",
        params: {
          amount: 100000,
          account: { order_id: "order-123" },
        },
      };

      (mockLogic.checkPerformTransaction as jest.Mock).mockRejectedValue(
        new Error("Unexpected error")
      );

      const response = await webhookHandler.handle(request, validAuthHeader);

      expect(response).toEqual({
        id: "134",
        error: {
          code: -32400,
          message: { en: "Internal Server Error" },
          data: "Unexpected error",
        },
      });
    });

    it("should handle errors without request ID", async () => {
      const request = {
        method: "CheckPerformTransaction",
        params: {
          amount: 100000,
          account: { order_id: "order-123" },
        },
      };

      (mockLogic.checkPerformTransaction as jest.Mock).mockRejectedValue(
        new Error("Unexpected error")
      );

      const response = await webhookHandler.handle(request, validAuthHeader);

      expect(response.id).toBeDefined();
      expect(response.error).toEqual({
        code: -32400,
        message: { en: "Internal Server Error" },
        data: "Unexpected error",
      });
    });

    it("should handle PaymeError correctly", async () => {
      const request: PaymeJsonRpcRequest<any> = {
        id: "135",
        method: "CheckPerformTransaction",
        params: {
          amount: 100000,
          account: { order_id: "order-123" },
        },
      };

      const paymeError = new PaymeError("Test error", -32000, {
        field: "value",
      });
      (mockLogic.checkPerformTransaction as jest.Mock).mockRejectedValue(
        paymeError
      );

      const response = await webhookHandler.handle(request, validAuthHeader);

      expect(response).toEqual({
        id: "135",
        error: {
          code: -32000,
          message: { en: "Test error" },
          data: { field: "value" },
        },
      });
    });
  });
});
