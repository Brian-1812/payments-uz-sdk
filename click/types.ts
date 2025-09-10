
import type { PaymentStatus } from '../types';

export interface ClickConfig {
    merchantId: string;
    merchantUserId: string;
    secretKey: string;
    serviceId: string;
    testMode?: boolean;
}

export interface ClickCreateCardTokenResponse {
    card_token: string;
    phone_number: string;
    card_number: string;
    temporary: number; // 0 for saved, 1 for temporary
    error_code: number;
    error_note: string;
}

export interface ClickVerifyCardTokenResponse {
    error_code: number;
    error_note: string;
}

export interface ClickChargeFromCardTokenResponse {
    payment_id: number;
    payment_status: number;
    error_code: number;
    error_note: string;
}

export interface ClickPaymentStatusResponse {
    payment_status: number;
    payment_status_note: string;
    error_code: number;
    error_note: string;
}

export interface ClickCancelPaymentResponse {
    payment_id: number;
    error_code: number;
    error_note: string;
}

export interface ClickDeleteCardTokenResponse {
    error_code: number;
    error_note: string;
}

export interface ProcessedPaymentResult {
    transactionId: number;
    status: PaymentStatus;
}

export type CardType = 'uzcard' | 'humo' | 'visa' | 'master';

export interface ClickGenerateInvoiceParams {
    amount: number;
    orderId: string;
    returnUrl: string;
    cardType?: CardType;
}

// Webhook related types
export enum ClickWebhookAction {
    Prepare = 0,
    Complete = 1,
}

export const CLICK_ERROR_CODES = {
    SUCCESS: 0,
    SIGN_CHECK_FAILED: -1,
    INCORRECT_AMOUNT: -2,
    ACTION_NOT_FOUND: -3,
    ALREADY_PAID: -4,
    USER_NOT_FOUND: -5,
    TRANSACTION_NOT_FOUND: -6,
    FAILED_TO_UPDATE_USER: -7,
    ERROR_IN_REQUEST: -8,
    TRANSACTION_CANCELLED: -9,
};

export interface ClickWebhookBody {
    click_trans_id: string;
    service_id: string;
    click_paydoc_id: string;
    merchant_trans_id: string; // Your orderId
    amount: string;
    action: ClickWebhookAction;
    error: number;
    error_note: string;
    sign_time: string;
    sign_string: string;
    merchant_prepare_id?: string; // Present in Complete action
}

export interface ClickWebhookResponse {
    click_trans_id: string;
    merchant_trans_id: string;
    merchant_prepare_id?: string | number;
    merchant_confirm_id?: string | number;
    error: number;
    error_note?: string;
}

export interface ClickWebhookPrepareResponse extends ClickWebhookResponse {
    merchant_prepare_id: string | number;
}

export interface ClickWebhookCompleteResponse extends ClickWebhookResponse {
    merchant_confirm_id: string | number;
}
