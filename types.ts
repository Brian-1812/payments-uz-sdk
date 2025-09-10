
export interface CardDetails {
    /** Card number, typically 16 digits without spaces */
    cardNumber: string;
    /** Card expiration date in 'MMYY' format (e.g., '1228') */
    expireDate: string;
}

export interface CreateCardTokenParams extends CardDetails {
    /** If true, the card token can be saved for future payments. Defaults to true. */
    save?: boolean;
}

export interface VerifyCardTokenParams {
    /** The card token received after initialization. */
    cardToken: string;
    /** The SMS verification code sent to the user. */
    smsCode: string;
}

export interface ProcessPaymentParams {
    /** The verified card token. */
    cardToken: string;
    /** The amount to charge. For Payme, this is in UZS; for Click, also in UZS. */
    amount: number;
    /** A unique identifier for the transaction in your system. */
    orderId: string;
}

export interface GenerateInvoiceParams {
    /** The amount for the invoice. */
    amount: number;
    /** A unique identifier for the transaction in your system. */
    orderId: string;
    /** The URL to redirect the user to after payment completion. */
    returnUrl: string;
}

export enum PaymentStatus {
    PENDING = 'pending',
    SUCCESS = 'success',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
    REFUNDED = 'refunded',
}
