import * as crypto from 'crypto';
import type { ClickWebhookBody } from './types';

/**
 * Generates the 'Auth' header value for Click API requests.
 * @param merchantUserId - The merchant user ID.
 * @param secretKey - The secret key.
 * @returns The digest auth token string.
 */
export function getDigestAuthToken(merchantUserId: string, secretKey: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const digest = crypto
        .createHash('sha1')
        .update(timestamp + secretKey)
        .digest('hex');
    return `${merchantUserId}:${digest}:${timestamp}`;
}

/**
 * Verifies the signature of an incoming Click webhook.
 * https://docs.click.uz/click-api-v2/podklyuchenie-k-api/vzaimodejstvie-s-post-zaprosami#proverka-podpisi-sign_string
 * @param body - The parsed webhook request body.
 * @param secretKey - The secret key.
 * @returns True if the signature is valid, otherwise false.
 */
export function verifyWebhookSignature(body: ClickWebhookBody, secretKey: string): boolean {
    // FIX: Property 'secret_key' does not exist on type 'ClickWebhookBody'.
    const {
        click_trans_id,
        service_id,
        merchant_trans_id,
        merchant_prepare_id,
        amount,
        action,
        sign_time,
        sign_string,
    } = body;

    const stringToHash = [
        click_trans_id,
        service_id,
        secretKey,
        merchant_trans_id,
        // For 'complete' action, merchant_prepare_id is included
        ...(action === 1 && merchant_prepare_id ? [merchant_prepare_id] : []),
        amount,
        action,
        sign_time,
    ].join('|');
    
    const generatedHash = crypto.createHash('md5').update(stringToHash).digest('hex');
    
    return generatedHash === sign_string;
}
