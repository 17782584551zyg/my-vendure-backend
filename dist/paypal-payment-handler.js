"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paypalPaymentHandler = void 0;
const core_1 = require("@vendure/core");
const paypalPaymentHandler = new core_1.PaymentMethodHandler({
    code: 'paypal-handler',
    description: [{
            languageCode: core_1.LanguageCode.en,
            value: 'PayPal',
        }],
    args: {
        clientId: { type: 'string', label: [{ languageCode: core_1.LanguageCode.en, value: 'PayPal Client ID' }] },
        clientSecret: { type: 'string', label: [{ languageCode: core_1.LanguageCode.en, value: 'PayPal Client Secret' }] },
        environment: { type: 'string', label: [{ languageCode: core_1.LanguageCode.en, value: 'Environment' }] },
    },
    createPayment: async (ctx, order, amount, args, metadata, method) => {
        try {
            const clientId = args.clientId || '';
            const clientSecret = args.clientSecret || '';
            const environment = args.environment || 'sandbox';
            console.log('[PayPal] createPayment started');
            console.log('[PayPal] clientId:', clientId ? 'provided' : 'MISSING');
            console.log('[PayPal] clientSecret:', clientSecret ? 'provided' : 'MISSING');
            console.log('[PayPal] environment:', environment);
            console.log('[PayPal] order amount:', amount, 'currency:', order.currencyCode);
            if (!clientId || !clientSecret) {
                console.error('[PayPal] Missing credentials');
                return {
                    amount,
                    state: 'Declined',
                    transactionId: '',
                    errorMessage: 'PayPal credentials not configured. Please set Client ID and Secret in Admin UI.',
                };
            }
            const apiUrl = environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
            const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
            console.log('[PayPal] Requesting access token from:', apiUrl);
            const tokenResponse = await fetch(`${apiUrl}/v1/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'grant_type=client_credentials',
            });
            const tokenData = await tokenResponse.json();
            console.log('[PayPal] Token response status:', tokenResponse.status);
            if (!tokenResponse.ok) {
                console.error('[PayPal] Token request failed:', tokenData);
                return {
                    amount,
                    state: 'Declined',
                    transactionId: '',
                    errorMessage: `PayPal auth failed: ${tokenData.error_description || 'Invalid credentials'}`,
                };
            }
            const accessToken = tokenData.access_token;
            console.log('[PayPal] Access token obtained');
            const orderResponse = await fetch(`${apiUrl}/v2/checkout/orders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    intent: 'CAPTURE',
                    purchase_units: [{
                            amount: {
                                currency_code: order.currencyCode || 'USD',
                                value: (amount / 100).toFixed(2),
                            },
                        }],
                    application_context: {
                        return_url: `${process.env.VENDURE_API_URL || ''}/paypal-return`,
                        cancel_url: `${process.env.VENDURE_API_URL || ''}/paypal-cancel`,
                    },
                }),
            });
            const orderData = await orderResponse.json();
            console.log('[PayPal] Order response status:', orderResponse.status);
            console.log('[PayPal] Order data:', JSON.stringify(orderData, null, 2));
            if (orderResponse.ok && orderData.id) {
                const approvalUrl = orderData.links?.find((link) => link.rel === 'approve')?.href;
                console.log('[PayPal] Approval URL:', approvalUrl);
                return {
                    amount,
                    state: 'Authorized',
                    transactionId: orderData.id,
                    metadata: {
                        public: {
                            approvalUrl,
                        },
                    },
                };
            }
            console.error('[PayPal] Order creation failed:', orderData);
            return {
                amount,
                state: 'Declined',
                transactionId: '',
                errorMessage: `PayPal error: ${orderData.message || orderData.error_message || 'Payment creation failed'}`,
            };
        }
        catch (error) {
            console.error('[PayPal] createPayment error:', error);
            return {
                amount,
                state: 'Declined',
                transactionId: '',
                errorMessage: `PayPal error: ${error.message || 'Payment creation error'}`,
            };
        }
    },
    settlePayment: async (ctx, order, payment, args, method) => {
        try {
            const clientId = args.clientId || '';
            const clientSecret = args.clientSecret || '';
            const environment = args.environment || 'sandbox';
            const apiUrl = environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
            const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
            const tokenResponse = await fetch(`${apiUrl}/v1/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'grant_type=client_credentials',
            });
            const tokenData = await tokenResponse.json();
            const accessToken = tokenData.access_token;
            const captureResponse = await fetch(`${apiUrl}/v2/checkout/orders/${payment.transactionId}/capture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const captureData = await captureResponse.json();
            if (captureData.status === 'COMPLETED') {
                return { success: true };
            }
            return {
                success: false,
                errorMessage: captureData.message || 'Payment capture failed'
            };
        }
        catch (error) {
            console.error('PayPal settlePayment error:', error);
            return {
                success: false,
                errorMessage: error.message || 'Payment capture error'
            };
        }
    },
});
exports.paypalPaymentHandler = paypalPaymentHandler;
//# sourceMappingURL=paypal-payment-handler.js.map