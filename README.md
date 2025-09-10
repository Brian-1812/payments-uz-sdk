# Uzbekistan Payments SDK

[![NPM Version](https://img.shields.io/npm/v/uzbekistan-payments.svg)](https://www.npmjs.com/package/uzbekistan-payments)

A comprehensive NPM package, written in TypeScript, to simplify integration with Uzbekistan's popular payment providers like Payme and Click. It provides an easy-to-use API for handling card payments, generating invoices, and processing webhooks.

## Features

-   **Type-Safe:** Written entirely in TypeScript for excellent autocompletion and type safety.
-   **Unified API:** Provides a consistent interface for common operations.
-   **Card Payments**
-   **Invoice Generation**
-   **Webhook Handling:** Securely process and respond to webhook callbacks from both providers.

## Installation

```bash
npm install uzbekistan-payments
```

---

## Click Integration

### 1. Initialize the Client

```typescript
import { ClickClient } from 'uzbekistan-payments';

const clickClient = new ClickClient({
  merchantId: process.env.CLICK_MERCHANT_ID,
  merchantUserId: process.env.CLICK_MERCHANT_USER_ID,
  secretKey: process.env.CLICK_SECRET_KEY,
  serviceId: process.env.CLICK_SERVICE_ID,
});
```

### 2. Payment with Card (Full Flow)

```typescript
import { ClickError } from 'uzbekistan-payments';

async function processClickPayment() {
  try {
    // Step 1: Create a card token
    const { cardToken } = await clickClient.createCardToken({
      cardNumber: '8600...',
      expireDate: '1228',
      save: true,
    });
    console.log('Card token created:', cardToken);

    // Step 2: Ask user for the SMS code and verify
    const smsCode = '12345'; // Get this from the user
    await clickClient.verifyCardToken({ cardToken, smsCode });
    console.log('Card token verified!');

    // Step 3: Charge the card
    const result = await clickClient.chargeFromCardToken({
      cardToken,
      amount: 1000, // 1000 UZS
      orderId: 'your-unique-order-id-123',
    });
    console.log('Payment successful:', result);
    // { transactionId: 12345, status: 'success' }

  } catch (error) {
    if (error instanceof ClickError) {
      console.error(`Click API Error: ${error.message} (Code: ${error.code})`);
    } else {
      console.error('An unexpected error occurred:', error);
    }
  }
}
```

### 3. Generate an Invoice URL

Redirect the user to this URL to pay.

```typescript
const invoiceUrl = clickClient.generateInvoiceUrl({
  amount: 5000, // 5000 UZS
  orderId: 'your-unique-order-id-456',
  returnUrl: 'https://your-site.com/payment/success',
});

console.log('Redirect user to:', invoiceUrl);
```

### 4. Handle Webhooks

Use the `ClickWebhookHandler` in your server endpoint (e.g., Express).

```typescript
import { ClickWebhookHandler, ClickWebhookBody, ClickWebhookAction } from 'uzbekistan-payments';

const webhookHandler = new ClickWebhookHandler(process.env.CLICK_SECRET_KEY);

// In your Express route
app.post('/webhook/click', async (req, res) => {
  const body: ClickWebhookBody = req.body;

  try {
    // Verifies signature, throws ClickError if invalid
    webhookHandler.verifySignature(body);

    if (body.action === ClickWebhookAction.Prepare) {
      // 1. Check if orderId (body.merchant_trans_id) exists and amount is correct.
      // 2. If all is good, create a pending payment record in your DB.
      const yourPaymentRecordId = 'your-internal-payment-id';
      const response = webhookHandler.createSuccessResponse(body, yourPaymentRecordId);
      return res.json(response);

    } else if (body.action === ClickWebhookAction.Complete) {
      // 1. Find your pending payment record using body.merchant_prepare_id.
      // 2. Mark the payment as successful in your DB and fulfill the order.
      const response = webhookHandler.createSuccessResponse(body, body.merchant_prepare_id);
      return res.json(response);
    }

  } catch (error) {
    // Handle verification errors or business logic errors
    const errorResponse = webhookHandler.createErrorResponse(-1, 'Signature failed');
    return res.status(400).json(errorResponse);
  }
});
```

---

## Payme Integration

### 1. Initialize the Client

```typescript
import { PaymeClient } from 'uzbekistan-payments';

const paymeClient = new PaymeClient({
  merchantId: process.env.PAYME_MERCHANT_ID,
  checkoutKey: process.env.PAYME_CHECKOUT_KEY,
  merchantApiSecret: process.env.PAYME_SECRET_KEY,
  testMode: true, // Optional: use Payme's test environment
});
```

### 2. Payment with Card (Full Flow)

```typescript
import { PaymeError } from 'uzbekistan-payments';

async function processPaymePayment() {
  try {
    // Step 1: Create card token
    let { cardToken, requiresVerification } = await paymeClient.createCardToken({
      cardNumber: '8600...',
      expireDate: '1228',
    });
    console.log('Token created:', cardToken);

    // Step 2: If needed, send and verify SMS code
    if (requiresVerification) {
      await paymeClient.sendVerificationCode(cardToken);
      const smsCode = '12345'; // Get from user
      const verificationResult = await paymeClient.verifyCard({ cardToken, smsCode });
      console.log('Card verified:', verificationResult.isVerified);
    }

    // Step 3: Charge the card (creates and pays a receipt)
    const result = await paymeClient.chargeFromCardToken({
      cardToken,
      amount: 1500, // 1500 UZS
      orderId: 'your-unique-order-id-789',
    });
    console.log('Payment successful:', result);
    // { transactionId: 'receipt-id...', status: 'success', receipt: { ... } }

  } catch (error) {
    if (error instanceof PaymeError) {
      console.error(`Payme API Error: ${error.message} (Code: ${error.code})`);
    } else {
      console.error('An unexpected error occurred:', error);
    }
  }
}
```

### 3. Generate an Invoice URL

```typescript
const invoiceUrl = paymeClient.generateInvoiceUrl({
  amount: 2500, // 2500 UZS
  orderId: 'your-unique-order-id-101',
  returnUrl: 'https://your-site.com/payment/success',
});

console.log('Redirect user to:', invoiceUrl);
```

### 4. Handle Webhooks (Merchant API)

Payme's webhooks use JSON-RPC. You need to provide the business logic for each RPC method.

```typescript
import { PaymeWebhookHandler, PaymeWebhookLogic, PaymeJsonRpcError } from 'uzbekistan-payments';

// Implement the business logic for your application
const myPaymeLogic: PaymeWebhookLogic = {
  async checkPerformTransaction(params) {
    // 1. Find the order by params.account.order_id
    // 2. Check if the order exists and if params.amount matches the order total
    const orderExists = true; // Replace with your logic
    const amountIsCorrect = true; // Replace with your logic

    if (orderExists && amountIsCorrect) {
      return { result: { allow: true } };
    } else {
      const error: PaymeJsonRpcError = { code: -31050, message: { en: "Order not found or amount incorrect" } };
      return { error };
    }
  },
  async createTransaction(params) {
    // 1. Check if a transaction with params.id already exists.
    // 2. Create a 'pending' payment record in your DB linked to the order.
    // 3. Return your internal transaction ID.
    const yourInternalTxId = 'your-payment-record-id-123';
    return {
      result: {
        create_time: Date.now(),
        transaction: yourInternalTxId,
        state: 1, // Pending
      }
    };
  },
  async performTransaction(params) {
    // 1. Find the pending transaction by params.id.
    // 2. Mark it as 'successful' in your database.
    // 3. Fulfill the order (grant access, ship product, etc.).
    const yourInternalTxId = 'your-payment-record-id-123';
    return {
      result: {
        perform_time: Date.now(),
        transaction: yourInternalTxId,
        state: 2, // Paid
      }
    };
  },
  // ... implement other methods: cancelTransaction, checkTransaction, getStatement
};

const paymeWebhookHandler = new PaymeWebhookHandler({
  secretKey: process.env.PAYME_SECRET_KEY,
  logic: myPaymeLogic,
});

// In your Express route
app.post('/webhook/payme', async (req, res) => {
  const authorizationHeader = req.headers.authorization;
  const response = await paymeWebhookHandler.handle(req.body, authorizationHeader);
  res.json(response);
});
```
