import { HttpClient } from '../utils/HttpClient';
import { PaymeError } from '../errors/PaymeError';
import { generatePaymeInvoiceUrl, getStatusFromPaymeReceiptState } from './utils';
import type {
    PaymeConfig,
    PaymeJsonRpcRequest,
    PaymeJsonRpcResponse,
    PaymeCreateCardParams,
    PaymeCreateCardResult,
    PaymeGetVerifyCodeParams,
    PaymeGetVerifyCodeResult,
    PaymeVerifyCardParams,
    PaymeVerifyCardResult,
    PaymeCreateReceiptParams,
    PaymeCreateReceiptResult,
    PaymePayReceiptParams,
    PaymePayReceiptResult,
    PaymeCheckReceiptParams,
    PaymeCheckReceiptResult,
    ProcessedReceiptResult,
    PaymeCancelReceiptParams,
    PaymeCancelReceiptResult
} from './types';
// FIX: Imported the 'PaymentStatus' type, which was missing.
import type {
    CreateCardTokenParams,
    GenerateInvoiceParams,
    ProcessPaymentParams,
    VerifyCardTokenParams,
    PaymentStatus
} from '../types';

const PAYME_API_BASE_URL = 'https://checkout.paycom.uz/api';
const PAYME_TEST_API_BASE_URL = 'https://checkout.test.paycom.uz/api';
const PAYME_CHECKOUT_URL = 'https://checkout.paycom.uz/';
const PAYME_TEST_CHECKOUT_URL = 'https://test.paycom.uz/';

export class PaymeClient {
    private readonly config: PaymeConfig;
    private readonly httpClient: HttpClient;
    private readonly checkoutUrl: string;

    constructor(config: PaymeConfig) {
        if (!config.merchantId || !config.checkoutKey || !config.merchantApiSecret) {
            throw new Error('PaymeClient: merchantId, checkoutKey, and merchantApiSecret are required.');
        }
        this.config = config;
        const baseUrl = config.testMode ? PAYME_TEST_API_BASE_URL : PAYME_API_BASE_URL;
        this.checkoutUrl = config.testMode ? PAYME_TEST_CHECKOUT_URL : PAYME_CHECKOUT_URL;
        this.httpClient = new HttpClient(baseUrl);
    }

    private async request<TResult>(method: string, params: any): Promise<TResult> {
        const requestId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
        const requestBody: PaymeJsonRpcRequest<any> = {
            id: requestId,
            method,
            params,
        };

        const response = await this.httpClient.post<PaymeJsonRpcResponse<TResult>>('', requestBody, {
            headers: { 'X-Auth': this.config.checkoutKey },
        });

        if (response.error) {
            throw PaymeError.fromJsonRpcError(response.error);
        }

        if (!response.result) {
            throw new PaymeError('Received empty result from Payme API.', -32000);
        }

        return response.result;
    }

    /**
     * Step 1: Initialize payment by creating a card token.
     */
    async createCardToken(params: CreateCardTokenParams): Promise<{ cardToken: string; requiresVerification: boolean }> {
        const payload: PaymeCreateCardParams = {
            card: { number: params.cardNumber, expire: params.expireDate },
            save: params.save ?? true,
        };
        const result = await this.request<PaymeCreateCardResult>('cards.create', payload);

        return {
            cardToken: result.card.token,
            requiresVerification: !result.card.verify,
        };
    }
    
    /**
     * Step 1a: If required, send an SMS verification code to the user.
     */
    async sendVerificationCode(cardToken: string): Promise<boolean> {
        const payload: PaymeGetVerifyCodeParams = { token: cardToken };
        const result = await this.request<PaymeGetVerifyCodeResult>('cards.get_verify_code', payload);
        return result.sent;
    }

    /**
     * Step 2: Verify the card token with the SMS code.
     */
    async verifyCard(params: VerifyCardTokenParams): Promise<{ cardToken: string, isVerified: boolean }> {
        const payload: PaymeVerifyCardParams = { token: params.cardToken, code: params.smsCode };
        const result = await this.request<PaymeVerifyCardResult>('cards.verify', payload);

        return {
            cardToken: result.card.token,
            isVerified: result.card.verify
        };
    }

    /**
     * Step 3: Process the payment. This is a two-step process in Payme (create receipt, then pay receipt),
     * wrapped into a single method for convenience.
     */
    async chargeFromCardToken(params: ProcessPaymentParams): Promise<ProcessedReceiptResult> {
        // Step 3a: Create a receipt
        const createReceiptParams: PaymeCreateReceiptParams = {
            amount: params.amount * 100, // Amount in tiyins
            account: { order_id: params.orderId },
            description: `Payment for order ${params.orderId}`,
        };
        const createResult = await this.request<PaymeCreateReceiptResult>('receipts.create', createReceiptParams);
        const receiptId = createResult.receipt._id;

        if (!receiptId) {
            throw new PaymeError('Failed to create receipt.', -32001);
        }
        
        // Step 3b: Pay the receipt with the card token
        const payReceiptParams: PaymePayReceiptParams = {
            id: receiptId,
            token: params.cardToken,
        };
        const payResult = await this.request<PaymePayReceiptResult>('receipts.pay', payReceiptParams);

        return {
            transactionId: payResult.receipt._id,
            status: getStatusFromPaymeReceiptState(payResult.receipt.state),
            receipt: payResult.receipt,
        };
    }
    
    /**
     * Generates a URL for redirecting the user to the Payme payment page (invoice).
     */
    generateInvoiceUrl(params: GenerateInvoiceParams): string {
        const amountInTiyins = params.amount * 100;
        return generatePaymeInvoiceUrl(
            this.checkoutUrl,
            this.config.merchantId,
            amountInTiyins,
            params.orderId,
            params.returnUrl
        );
    }
    
    /**
     * Checks the status of a receipt (payment).
     */
    async checkReceiptStatus(receiptId: string): Promise<{ status: PaymentStatus }> {
        const params: PaymeCheckReceiptParams = { id: receiptId };
        const result = await this.request<PaymeCheckReceiptResult>('receipts.check', params);
        
        return {
            status: getStatusFromPaymeReceiptState(result.state),
        };
    }

    /**
     * Cancels an unpaid receipt.
     */
    async cancelReceipt(receiptId: string): Promise<ProcessedReceiptResult> {
        const params: PaymeCancelReceiptParams = { id: receiptId };
        const result = await this.request<PaymeCancelReceiptResult>('receipts.cancel', params);

        return {
            transactionId: result.receipt._id,
            status: getStatusFromPaymeReceiptState(result.receipt.state),
            receipt: result.receipt,
        };
    }
}