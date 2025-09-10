
import { HttpClient } from '../utils/HttpClient';
import { ClickError } from '../errors/ClickError';
import { getDigestAuthToken } from './utils';
import { getStatusFromClickCode } from './status';
import type {
    ClickConfig,
    ClickCreateCardTokenResponse,
    ClickVerifyCardTokenResponse,
    ClickChargeFromCardTokenResponse,
    ProcessedPaymentResult,
    ClickPaymentStatusResponse,
    ClickCancelPaymentResponse,
    ClickDeleteCardTokenResponse,
    ClickGenerateInvoiceParams
} from './types';
import type {
    CreateCardTokenParams,
    VerifyCardTokenParams,
    ProcessPaymentParams
} from '../types';

const CLICK_API_BASE_URL = 'https://api.click.uz/v2/merchant';
const CLICK_INVOICE_BASE_URL = 'https://my.click.uz/services/pay';

export class ClickClient {
    private readonly config: ClickConfig;
    private readonly httpClient: HttpClient;

    constructor(config: ClickConfig) {
        if (!config.merchantId || !config.merchantUserId || !config.secretKey || !config.serviceId) {
            throw new Error('ClickClient: merchantId, merchantUserId, secretKey, and serviceId are required.');
        }
        this.config = config;
        this.httpClient = new HttpClient(CLICK_API_BASE_URL);
    }

    private async request<T>(method: 'post' | 'get' | 'delete', endpoint: string, body?: any): Promise<T> {
        const headers = {
            'Auth': getDigestAuthToken(this.config.merchantUserId, this.config.secretKey),
        };

        try {
            if (method === 'post') {
                return await this.httpClient.post<T>(endpoint, body, { headers });
            }
            if (method === 'get') {
                return await this.httpClient.get<T>(endpoint, { headers });
            }
            if (method === 'delete') {
                return await this.httpClient.delete<T>(endpoint, { headers });
            }
            throw new Error(`Unsupported method: ${method}`);
        } catch (error) {
            // Re-throw as a generic error for now, specific errors are handled in methods
            if (error instanceof Error) {
                throw new Error(`Click API request failed: ${error.message}`);
            }
            throw new Error(`An unknown error occurred during the Click API request.`);
        }
    }

    /**
     * Step 1: Initialize payment by creating a card token.
     */
    async createCardToken(params: CreateCardTokenParams): Promise<{ cardToken: string; requiresVerification: boolean }> {
        const response = await this.request<ClickCreateCardTokenResponse>('post', '/card_token/request', {
            card_number: params.cardNumber,
            expire_date: params.expireDate,
            temporary: (params.save ?? true) ? 0 : 1,
            service_id: this.config.serviceId,
        });

        if (response.error_code < 0 || !response.card_token) {
            throw new ClickError(response.error_note, response.error_code);
        }

        return {
            cardToken: response.card_token,
            requiresVerification: true, // Click always seems to require SMS verification
        };
    }

    /**
     * Step 2: Verify the card token with the SMS code.
     */
    async verifyCardToken(params: VerifyCardTokenParams): Promise<void> {
        const response = await this.request<ClickVerifyCardTokenResponse>('post', '/card_token/verify', {
            service_id: this.config.serviceId,
            card_token: params.cardToken,
            sms_code: params.smsCode,
        });

        if (response.error_code < 0) {
            throw new ClickError(response.error_note, response.error_code);
        }
    }

    /**
     * Step 3: Process the payment using the verified card token.
     */
    async chargeFromCardToken(params: ProcessPaymentParams): Promise<ProcessedPaymentResult> {
        const response = await this.request<ClickChargeFromCardTokenResponse>('post', '/card_token/payment', {
            service_id: this.config.serviceId,
            card_token: params.cardToken,
            amount: params.amount,
            transaction_parameter: params.orderId,
        });
        
        // As per docs, a negative error code indicates failure.
        // A non-2 payment_status also indicates an issue.
        if (response.error_code < 0 || (response.payment_status !== 2 && response.error_code === 0)) {
            throw new ClickError(response.error_note, response.error_code);
        }

        return {
            transactionId: response.payment_id,
            status: getStatusFromClickCode(response.payment_status),
        };
    }
    
    /**
     * Generates a URL for redirecting the user to the Click payment page.
     */
    generateInvoiceUrl(params: ClickGenerateInvoiceParams): string {
        const queryParams = new URLSearchParams({
            service_id: this.config.serviceId,
            merchant_id: this.config.merchantId,
            amount: params.amount.toString(),
            transaction_param: params.orderId,
            return_url: params.returnUrl,
        });

        if (params.cardType) {
            queryParams.set('card_type', params.cardType);
        }
        
        return `${CLICK_INVOICE_BASE_URL}?${queryParams.toString()}`;
    }

    /**
     * Checks the status of a payment.
     */
    async checkPaymentStatus(paymentId: string | number): Promise<ProcessedPaymentResult> {
        const response = await this.request<ClickPaymentStatusResponse>('get', `/payment/status/${this.config.serviceId}/${paymentId}`);
        
        if (response.error_code < 0) {
            throw new ClickError(response.error_note, response.error_code);
        }
        
        return {
            transactionId: Number(paymentId),
            status: getStatusFromClickCode(response.payment_status)
        };
    }

    /**
     * Cancels/reverses a payment.
     */
    async cancelPayment(paymentId: string | number): Promise<{ transactionId: number }> {
        const response = await this.request<ClickCancelPaymentResponse>('delete', `/payment/reversal/${this.config.serviceId}/${paymentId}`);
        
        if (response.error_code < 0) {
            throw new ClickError(response.error_note, response.error_code);
        }
        
        return { transactionId: response.payment_id };
    }

    /**
     * Deletes a saved card token.
     */
    async deleteCardToken(cardToken: string): Promise<void> {
        const response = await this.request<ClickDeleteCardTokenResponse>('delete', `/card_token/${this.config.serviceId}/${cardToken}`);
        
        if (response.error_code < 0) {
            throw new ClickError(response.error_note, response.error_code);
        }
    }
}
