import type { PaymentStatus } from '../types';

export interface PaymeConfig {
    /** The Merchant ID from Payme cabinet. Used for `m` parameter in invoices. */
    merchantId: string;
    /** The API key for the Checkout API (X-Auth header). */
    checkoutKey: string;
    /** The key for authenticating merchant API (webhook) requests. */
    merchantApiSecret: string;
    testMode?: boolean;
}

// Generic Payme JSON-RPC structures
export interface PaymeJsonRpcRequest<T> {
    id: number | string;
    method: string;
    params: T;
}

export interface PaymeJsonRpcError {
    code: number;
    message: {
        ru?: string;
        uz?: string;
        en?: string;
    };
    data?: any;
}

export interface PaymeJsonRpcResponse<T> {
    id: number | string;
    result?: T;
    error?: PaymeJsonRpcError;
}

// card.create
export interface PaymeCreateCardParams {
    card: { number: string; expire: string; };
    save: boolean;
}
export interface PaymeCreateCardResult {
    card: { token: string; recurrent: boolean; verify: boolean; };
}

// cards.get_verify_code
export interface PaymeGetVerifyCodeParams {
    token: string;
}
export interface PaymeGetVerifyCodeResult {
    sent: boolean;
    phone: string;
    wait: number;
}

// cards.verify
export interface PaymeVerifyCardParams {
    token: string;
    code: string;
}
export interface PaymeVerifyCardResult extends PaymeCreateCardResult { }


// receipts.create
export interface PaymeCreateReceiptParams {
    amount: number; // in tiyins (UZS * 100)
    account: {
        [key: string]: any;
        order_id: string; // The order ID in your system
    };
    description?: string;
}
export interface Receipt {
    _id: string;
    create_time: number;
    pay_time: number;
    cancel_time: number;
    state: number; // See PaymeReceiptState
    amount: number;
}
export interface PaymeCreateReceiptResult {
    receipt: Receipt;
}

// receipts.pay
export interface PaymePayReceiptParams {
    id: string; // The receipt _id
    token: string; // The card token
}
export interface PaymePayReceiptResult extends PaymeCreateReceiptResult { }

// receipts.check
export interface PaymeCheckReceiptParams {
    id: string;
}
export interface PaymeCheckReceiptResult {
    state: number;
}
export interface ProcessedReceiptResult {
    transactionId: string;
    status: PaymentStatus;
    receipt: Receipt;
}

// receipts.cancel
export interface PaymeCancelReceiptParams {
    id: string; // The receipt _id
}
export interface PaymeCancelReceiptResult extends PaymeCreateReceiptResult { }


// --- Merchant API (Webhook) Types ---
export type PaymeWebhookMethod =
  | 'CheckPerformTransaction'
  | 'CreateTransaction'
  | 'PerformTransaction'
  | 'CancelTransaction'
  | 'CheckTransaction'
  | 'GetStatement';

export interface PaymeWebhookBaseParams {
    id?: string;
    method: PaymeWebhookMethod;
}
export interface PaymeWebhookRequestParam<T> extends PaymeWebhookBaseParams {
    params: T;
}

export interface CheckPerformTransactionParams {
    amount: number; // in tiyins
    account: { order_id: string; [key: string]: any; };
}
export interface CheckPerformTransactionResult {
    allow: true; // A success result must allow the transaction.
    detail?: any;
}

export interface CreateTransactionParams {
    id: string; // Payme transaction ID
    time: number;
    amount: number; // in tiyins
    account: { order_id: string; [key: string]: any; };
}
export interface CreateTransactionResult {
    create_time: number;
    transaction: string; // Your internal transaction/payment ID
    state: number; // See PaymeTransactionState
}

export interface PerformTransactionParams {
    id: string; // Payme transaction ID
}
export interface PerformTransactionResult {
    perform_time: number;
    transaction: string; // Your internal transaction/payment ID
    state: number;
}

export interface CancelTransactionParams {
    id: string; // Payme transaction ID
    reason: number;
}
export interface CancelTransactionResult {
    cancel_time: number;
    transaction: string; // Your internal transaction/payment ID
    state: number;
}

export interface CheckTransactionParams {
    id: string; // Payme transaction ID
}
export interface CheckTransactionResult {
    create_time: number;
    perform_time: number;
    cancel_time: number;
    transaction: string; // Your internal transaction/payment ID
    state: number;
    reason?: number;
}

export interface GetStatementParams {
    from: number;
    to: number;
}
export interface StatementTransaction {
    id: string; // Payme transaction ID
    time: number;
    amount: number;
    account: { order_id: string; [key: string]: any; };
    create_time: number;
    perform_time: number;
    cancel_time: number;
    transaction: string; // Your internal transaction/payment ID
    state: number;
    reason?: number;
    receivers?: any[];
}
export interface GetStatementResult {
    transactions: StatementTransaction[];
}

// Logic interface for user to implement
export interface PaymeWebhookLogic {
    checkPerformTransaction(params: CheckPerformTransactionParams, requestId?: string | number): Promise<{ result: CheckPerformTransactionResult } | { error: PaymeJsonRpcError }>;
    createTransaction(params: CreateTransactionParams, requestId?: string | number): Promise<{ result: CreateTransactionResult } | { error: PaymeJsonRpcError }>;
    performTransaction(params: PerformTransactionParams, requestId?: string | number): Promise<{ result: PerformTransactionResult } | { error: PaymeJsonRpcError }>;
    cancelTransaction(params: CancelTransactionParams, requestId?: string | number): Promise<{ result: CancelTransactionResult } | { error: PaymeJsonRpcError }>;
    checkTransaction(params: CheckTransactionParams, requestId?: string | number): Promise<{ result: CheckTransactionResult } | { error: PaymeJsonRpcError }>;
    getStatement(params: GetStatementParams, requestId?: string | number): Promise<{ result: GetStatementResult } | { error: PaymeJsonRpcError }>;
}