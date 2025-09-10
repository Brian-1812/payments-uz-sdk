
import { Buffer } from 'buffer';
import { PaymentStatus } from '../types';

/**
 * Generates the Base64-encoded parameter string for a Payme invoice URL.
 */
export function generatePaymeInvoiceUrl(
    baseUrl: string,
    merchantId: string,
    amountInTiyins: number,
    orderId: string,
    returnUrl: string,
): string {
    const params = `m=${merchantId};ac.order_id=${orderId};a=${amountInTiyins};c=${returnUrl}`;
    const encodedParams = Buffer.from(params).toString('base64');
    return `${baseUrl}${encodedParams}`;
}


/**
 * Maps Payme receipt state codes to the standard PaymentStatus enum.
 * @param paymeStateCode - The numeric state from a Payme receipt.
 */
export function getStatusFromPaymeReceiptState(paymeStateCode?: number): PaymentStatus {
    switch (paymeStateCode) {
        case 0: // new
            return PaymentStatus.PENDING;
        case 1: // waiting for payment
            return PaymentStatus.PENDING;
        case 2: // paid
            return PaymentStatus.SUCCESS;
        case 3: // cancelled by timeout
            return PaymentStatus.CANCELLED;
        case 4: // cancelled
            return PaymentStatus.CANCELLED;
        case 5: // waiting for refund
            return PaymentStatus.PENDING;
        case 6: // refunded
            return PaymentStatus.REFUNDED;
        default:
            return PaymentStatus.FAILED;
    }
}
