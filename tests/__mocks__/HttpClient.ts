export class MockHttpClient {
  private mockResponses: Map<string, any> = new Map();
  private mockErrors: Map<string, Error> = new Map();

  // Mock response for a specific endpoint and method
  mockResponse(method: string, endpoint: string, response: any) {
    const key = `${method.toUpperCase()}:${endpoint}`;
    this.mockResponses.set(key, response);
  }

  // Mock error for a specific endpoint and method
  mockError(method: string, endpoint: string, error: Error) {
    const key = `${method.toUpperCase()}:${endpoint}`;
    this.mockErrors.set(key, error);
  }

  // Clear all mocks
  clearMocks() {
    this.mockResponses.clear();
    this.mockErrors.clear();
  }

  async request<T>(endpoint: string, options: any = {}): Promise<T> {
    const method = options.method || "GET";
    const key = `${method.toUpperCase()}:${endpoint}`;

    if (this.mockErrors.has(key)) {
      throw this.mockErrors.get(key);
    }

    if (this.mockResponses.has(key)) {
      return this.mockResponses.get(key);
    }

    // Default mock response
    return {} as T;
  }

  async get<T>(endpoint: string, options: any = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(endpoint: string, body: any, options: any = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  }

  async delete<T>(endpoint: string, options: any = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const mockHttpClient = new MockHttpClient();
