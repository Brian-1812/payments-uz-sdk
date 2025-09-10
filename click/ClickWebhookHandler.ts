
import { ClickError } from '../errors/ClickError';
import { verifyWebhookSignature } from './utils';
import type { ClickWebhookBody, ClickWebhookResponse, CLICK_ERROR_CODES } from './types';

export class ClickWebhookHandler {
    private readonly secretKey: string;

    constructor(secretKey: string) {
        if (!secretKey) {
            throw new Error('ClickWebhookHandler: secretKey is required.');
        }
        this.secretKey = secretKey;
    }

    /**
     * Verifies the signature of the incoming webhook request.
     * Throws a ClickError if the signature is invalid.
     * @param body - The raw or parsed request body from the webhook.
     */
    verifySignature(body: ClickWebhookBody): void {
        const isValid = verifyWebhookSignature(body, this.secretKey);
        if (!isValid) {
            throw new ClickError('Invalid webhook signature.', -1);
        }
    }

    /**
     * Creates a standard success response for a Click webhook.
     * @param body - The incoming webhook body, used to extract transaction IDs.
     * @param merchantPrepareId - The unique ID for the transaction on the merchant's side (e.g., your payment record ID).
     */
    createSuccessResponse(body: ClickWebhookBody, merchantPrepareId: string | number): ClickWebhookResponse {
        return {
            click_trans_id: body.click_trans_id,
            merchant_trans_id: body.merchant_trans_id,
            merchant_prepare_id: merchantPrepareId,
            error: 0,
            error_note: 'Success',
        };
    }
    
    /**
     * Creates a standard error response for a Click webhook.
     * @param code - The Click error code (e.g., -1 for invalid signature).
     * @param message - The error message.
     */
    createErrorResponse(code: typeof CLICK_ERROR_CODES[keyof typeof CLICK_ERROR_CODES], message: string): ClickWebhookResponse {
        return {
            // Click does not expect transaction IDs on auth failure.
            click_trans_id: '',
            merchant_trans_id: '',
            error: code,
            error_note: message,
        };
    }
}
