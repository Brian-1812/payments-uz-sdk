
import { Buffer } from 'buffer';
import { PaymeError } from '../errors/PaymeError';
import type {
    PaymeWebhookLogic,
    PaymeJsonRpcRequest,
    PaymeJsonRpcResponse,
    PaymeJsonRpcError,
    CheckPerformTransactionParams,
    CreateTransactionParams,
    PerformTransactionParams,
    CancelTransactionParams,
    CheckTransactionParams,
    GetStatementParams
} from './types';

const PAYME_LOGIN = 'Paycom';

export class PaymeWebhookHandler {
    private readonly secretKey: string;
    private readonly logic: PaymeWebhookLogic;

    constructor(config: { secretKey: string, logic: PaymeWebhookLogic }) {
        if (!config.secretKey || !config.logic) {
            throw new Error('PaymeWebhookHandler: secretKey and logic implementation are required.');
        }
        this.secretKey = config.secretKey;
        this.logic = config.logic;
    }

    /**
     * Verifies the 'Authorization' header from a Payme webhook request.
     * @param authHeader The value of the 'Authorization' header.
     */
    private verifyAuth(authHeader?: string): void {
        if (!authHeader || !authHeader.startsWith('Basic ')) {
            throw new PaymeError('Unauthorized', -32504, 'Authorization header missing or invalid');
        }

        const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('ascii');
        const [login, password] = credentials.split(':');
        
        if (login !== PAYME_LOGIN || password !== this.secretKey) {
            throw new PaymeError('Unauthorized', -32504, 'Invalid login or password');
        }
    }

    /**
     * Handles an incoming Payme webhook request.
     * @param body - The raw or parsed request body.
     * @param authorizationHeader - The 'Authorization' header value from the request.
     * @returns A JSON-RPC response object to be sent back to Payme.
     */
    async handle(body: any, authorizationHeader?: string): Promise<PaymeJsonRpcResponse<any>> {
        try {
            this.verifyAuth(authorizationHeader);
            
            const request = body as PaymeJsonRpcRequest<any>;
            const { id, method, params } = request;
            
            let response: { result: any } | { error: PaymeJsonRpcError };

            switch (method) {
                case 'CheckPerformTransaction':
                    response = await this.logic.checkPerformTransaction(params as CheckPerformTransactionParams, id);
                    break;
                case 'CreateTransaction':
                    response = await this.logic.createTransaction(params as CreateTransactionParams, id);
                    break;
                case 'PerformTransaction':
                    response = await this.logic.performTransaction(params as PerformTransactionParams, id);
                    break;
                case 'CancelTransaction':
                    response = await this.logic.cancelTransaction(params as CancelTransactionParams, id);
                    break;
                case 'CheckTransaction':
                    response = await this.logic.checkTransaction(params as CheckTransactionParams, id);
                    break;
                case 'GetStatement':
                    response = await this.logic.getStatement(params as GetStatementParams, id);
                    break;
                default:
                    throw new PaymeError('Method not found', -32601);
            }

            return { id, ...response };

        } catch (error) {
            let jsonRpcError: PaymeJsonRpcError;
            if (error instanceof PaymeError) {
                jsonRpcError = { code: error.code as number, message: { en: error.message }, data: error.data };
            } else {
                // Generic internal server error
                jsonRpcError = { code: -32400, message: { en: 'Internal Server Error' }, data: (error as Error).message };
            }
            return { id: body?.id || Date.now(), error: jsonRpcError };
        }
    }
}
