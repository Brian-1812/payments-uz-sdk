
import { PaymentStatus } from "../types";

/**
 * Maps Click's numeric payment status to the standard PaymentStatus enum.
 * @param clickStatusCode - The numeric status code from the Click API.
 * @returns The corresponding PaymentStatus.
 */
export function getStatusFromClickCode(clickStatusCode?: number): PaymentStatus {
    switch (clickStatusCode) {
        case 0: // new
        case 1: // waiting
            return PaymentStatus.PENDING;
        case 2: // confirmed
            return PaymentStatus.SUCCESS;
        case 3: // rejected
        case 5: // canceled
            return PaymentStatus.CANCELLED;
        case 4: // refunded
            return PaymentStatus.REFUNDED;
        default:
            return PaymentStatus.FAILED;
    }
}
