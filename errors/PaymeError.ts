
import { BasePaymentError } from './BaseError';
import { PaymeJsonRpcError } from '../payme/types';

/**
 * Represents an error that occurred during an interaction with the Payme API.
 */
export class PaymeError extends BasePaymentError {
    public data?: any;

    constructor(message: string, code: number, data?: any) {
        super(message, code);
        this.name = 'PaymeError';
        this.data = data;
    }

    /**
     * Creates a PaymeError from a Payme JSON-RPC error object.
     */
    static fromJsonRpcError(error: PaymeJsonRpcError): PaymeError {
        const message = error.message?.en || error.message?.ru || error.message?.uz || 'Unknown Payme Error';
        return new PaymeError(message, error.code, error.data);
    }
}
