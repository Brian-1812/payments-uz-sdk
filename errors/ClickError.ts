
import { BasePaymentError } from './BaseError';

/**
 * Represents an error that occurred during an interaction with the Click API.
 */
export class ClickError extends BasePaymentError {
    constructor(message: string, code: number) {
        super(message, code);
        this.name = 'ClickError';
    }
}
