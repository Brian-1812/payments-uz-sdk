
export interface RequestOptions extends RequestInit {
    timeout?: number;
}

export class HttpClient {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const { timeout = 8000, ...restOptions } = options;

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
            ...restOptions,
            signal: controller.signal,
        });

        clearTimeout(id);

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }

        const text = await response.text();
        // Handle cases where the response body might be empty
        return text ? JSON.parse(text) : ({} as T);
    }

    get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    post<T>(endpoint: string, body: any, options: RequestOptions = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(options.headers || {}),
            },
        });
    }

    delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}
