import { HttpClient } from "../../../utils/HttpClient";

// Mock fetch globally
global.fetch = jest.fn();

describe("HttpClient", () => {
  let httpClient: HttpClient;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    httpClient = new HttpClient("https://api.example.com");
    mockFetch.mockClear();
  });

  describe("constructor", () => {
    it("should set the base URL", () => {
      const client = new HttpClient("https://test.api.com");
      expect(client).toBeDefined();
    });
  });

  describe("request method", () => {
    it("should make a successful GET request", async () => {
      const mockResponse = { data: "test" };
      const mockResponseObj = {
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      };
      mockFetch.mockResolvedValue(mockResponseObj as any);

      const result = await httpClient.request("/test", { method: "GET" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          method: "GET",
          signal: expect.any(AbortSignal),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should make a successful POST request with body", async () => {
      const mockResponse = { success: true };
      const mockResponseObj = {
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      };
      mockFetch.mockResolvedValue(mockResponseObj as any);

      const requestBody = { key: "value" };
      const result = await httpClient.request("/test", {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: { "Content-Type": "application/json" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(requestBody),
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          signal: expect.any(AbortSignal),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle empty response body", async () => {
      const mockResponseObj = {
        ok: true,
        text: jest.fn().mockResolvedValue(""),
      };
      mockFetch.mockResolvedValue(mockResponseObj as any);

      const result = await httpClient.request("/test", { method: "GET" });

      expect(result).toEqual({});
    });

    it("should throw error for non-ok response", async () => {
      const mockResponseObj = {
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue("Not Found"),
      };
      mockFetch.mockResolvedValue(mockResponseObj as any);

      await expect(
        httpClient.request("/test", { method: "GET" })
      ).rejects.toThrow("HTTP error! status: 404, body: Not Found");
    });

    it("should handle timeout", async () => {
      // Mock fetch to never resolve
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const requestPromise = httpClient.request("/test", {
        method: "GET",
        timeout: 100,
      });

      await expect(requestPromise).rejects.toThrow();
    });

    it("should use default timeout of 8000ms", async () => {
      const mockResponseObj = {
        ok: true,
        text: jest.fn().mockResolvedValue("{}"),
      };
      mockFetch.mockResolvedValue(mockResponseObj as any);

      await httpClient.request("/test", { method: "GET" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it("should handle custom timeout", async () => {
      const mockResponseObj = {
        ok: true,
        text: jest.fn().mockResolvedValue("{}"),
      };
      mockFetch.mockResolvedValue(mockResponseObj as any);

      await httpClient.request("/test", {
        method: "GET",
        timeout: 5000,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe("get method", () => {
    it("should make a GET request", async () => {
      const mockResponse = { data: "test" };
      const mockResponseObj = {
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      };
      mockFetch.mockResolvedValue(mockResponseObj as any);

      const result = await httpClient.get("/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should pass options to request", async () => {
      const mockResponseObj = {
        ok: true,
        text: jest.fn().mockResolvedValue("{}"),
      };
      mockFetch.mockResolvedValue(mockResponseObj as any);

      await httpClient.get("/test", {
        headers: { Authorization: "Bearer token" },
        timeout: 1000,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer token",
          }),
        })
      );
    });
  });

  describe("post method", () => {
    it("should make a POST request with JSON body", async () => {
      const mockResponse = { success: true };
      const mockResponseObj = {
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      };
      mockFetch.mockResolvedValue(mockResponseObj as any);

      const requestBody = { key: "value" };
      const result = await httpClient.post("/test", requestBody);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(requestBody),
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Accept: "application/json",
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should merge custom headers with default headers", async () => {
      const mockResponseObj = {
        ok: true,
        text: jest.fn().mockResolvedValue("{}"),
      };
      mockFetch.mockResolvedValue(mockResponseObj as any);

      await httpClient.post(
        "/test",
        { key: "value" },
        {
          headers: { Authorization: "Bearer token" },
        }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: "Bearer token",
          }),
        })
      );
    });

    it("should override default headers with custom ones", async () => {
      const mockResponseObj = {
        ok: true,
        text: jest.fn().mockResolvedValue("{}"),
      };
      mockFetch.mockResolvedValue(mockResponseObj as any);

      await httpClient.post(
        "/test",
        { key: "value" },
        {
          headers: {
            "Content-Type": "application/xml",
            Accept: "application/xml",
          },
        }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/xml",
            Accept: "application/xml",
          }),
        })
      );
    });
  });

  describe("delete method", () => {
    it("should make a DELETE request", async () => {
      const mockResponse = { deleted: true };
      const mockResponseObj = {
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      };
      mockFetch.mockResolvedValue(mockResponseObj as any);

      const result = await httpClient.delete("/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          method: "DELETE",
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should pass options to request", async () => {
      const mockResponseObj = {
        ok: true,
        text: jest.fn().mockResolvedValue("{}"),
      };
      mockFetch.mockResolvedValue(mockResponseObj as any);

      await httpClient.delete("/test", {
        headers: { Authorization: "Bearer token" },
        timeout: 1000,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({
            Authorization: "Bearer token",
          }),
        })
      );
    });
  });

  describe("error handling", () => {
    it("should handle network errors", async () => {
      const networkError = new Error("Network error");
      mockFetch.mockRejectedValue(networkError);

      await expect(httpClient.get("/test")).rejects.toThrow("Network error");
    });

    it("should handle JSON parsing errors", async () => {
      const mockResponseObj = {
        ok: true,
        text: jest.fn().mockResolvedValue("invalid json"),
      };
      mockFetch.mockResolvedValue(mockResponseObj as any);

      await expect(httpClient.get("/test")).rejects.toThrow();
    });
  });
});
