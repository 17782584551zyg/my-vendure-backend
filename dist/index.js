"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@vendure/core");
const vendure_config_1 = require("./vendure-config");
async function start() {
    const app = await (0, core_1.bootstrap)(vendure_config_1.config);
    const jobQueueService = app.get(core_1.JobQueueService);
    jobQueueService.start();
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.get('/paypal/return', async (req, res) => {
        const token = req.query.token;
        const orderCode = req.query.orderCode;
        console.log('[PayPal Return] Received:', { token, orderCode });
        if (!token || !orderCode) {
            console.error('[PayPal Return] Missing token or orderCode');
            return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment`);
        }
        try {
            const orderService = app.get('OrderService');
            const paymentService = app.get('PaymentService');
            const ctx = {
                apiType: 'shop',
                channelId: 1,
                languageCode: 'en',
                isAuthorized: true,
            };
            const order = await orderService.findOneByCode(ctx, orderCode);
            if (!order) {
                console.error('[PayPal Return] Order not found:', orderCode);
                return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment`);
            }
            console.log('[PayPal Return] Found order:', order.code, 'state:', order.state);
            const lastPayment = order.payments?.[order.payments.length - 1];
            if (!lastPayment || lastPayment.state !== 'Authorized') {
                console.error('[PayPal Return] Payment not found or not Authorized');
                return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment`);
            }
            console.log('[PayPal Return] Payment found:', lastPayment.id, 'transactionId:', lastPayment.transactionId);
            const handlerArgs = lastPayment.method.handlerArgs;
            const clientId = handlerArgs.clientId || '';
            const clientSecret = handlerArgs.clientSecret || '';
            const environment = handlerArgs.environment || 'sandbox';
            if (!clientId || !clientSecret) {
                console.error('[PayPal Return] Missing PayPal credentials');
                return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment`);
            }
            const apiUrl = environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
            const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
            console.log('[PayPal Return] Requesting access token');
            const tokenResponse = await fetch(`${apiUrl}/v1/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'grant_type=client_credentials',
            });
            const tokenData = await tokenResponse.json();
            if (!tokenResponse.ok) {
                console.error('[PayPal Return] Token request failed:', tokenData);
                return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment`);
            }
            const accessToken = tokenData.access_token;
            console.log('[PayPal Return] Capturing payment:', lastPayment.transactionId);
            const captureResponse = await fetch(`${apiUrl}/v2/checkout/orders/${lastPayment.transactionId}/capture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const captureData = await captureResponse.json();
            console.log('[PayPal Return] Capture response:', JSON.stringify(captureData, null, 2));
            if (captureData.status === 'COMPLETED') {
                console.log('[PayPal Return] Payment captured successfully');
                await paymentService.settlePayment(ctx, lastPayment.id);
                await orderService.transitionToState(ctx, order.id, 'PaymentSettled');
                return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/confirmation/${orderCode}`);
            }
            console.error('[PayPal Return] Payment capture failed:', captureData.message || 'Unknown error');
            return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment`);
        }
        catch (error) {
            console.error('[PayPal Return] Error:', error);
            return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment`);
        }
    });
    console.log('');
    console.log('Vendure server is now running!');
    console.log('Shop API: http://localhost:3002/shop-api');
    console.log('Admin API: http://localhost:3002/admin-api');
    console.log('Admin UI: http://localhost:3002/admin');
    console.log('Admin credentials: superadmin / superadmin');
    console.log('');
    console.log('JobQueue is running - background jobs will be processed');
}
start().catch(err => {
    console.error('Failed to start Vendure:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map