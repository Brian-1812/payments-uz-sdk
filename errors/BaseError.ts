
export class BasePaymentError extends Error {
    public code: number | string;

    constructor(message: string, code: number | string) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
