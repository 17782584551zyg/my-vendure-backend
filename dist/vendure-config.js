"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPayPalServices = exports.config = void 0;
const core_1 = require("@vendure/core");
const admin_ui_plugin_1 = require("@vendure/admin-ui-plugin");
const asset_server_plugin_1 = require("@vendure/asset-server-plugin");
const path_1 = __importDefault(require("path"));
const default_zone_plugin_1 = require("./default-zone-plugin");
const paypal_payment_handler_1 = require("./paypal-payment-handler");
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;
const paypalReturnMiddleware = async (req, res, next) => {
    const token = req.query.token;
    const orderCode = req.query.orderCode;
    console.log('[PayPal Return] Received:', { token, orderCode });
    if (!token || !orderCode) {
        console.error('[PayPal Return] Missing token or orderCode');
        return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment`);
    }
    try {
        const orderService = global.__vendureOrderService;
        const paymentService = global.__vendurePaymentService;
        if (!orderService || !paymentService) {
            console.error('[PayPal Return] Services not available');
            return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment`);
        }
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
};
const alwaysEligiblePaymentChecker = new core_1.PaymentMethodEligibilityChecker({
    code: 'always-eligible-payment-checker',
    description: [{
            languageCode: core_1.LanguageCode.en,
            value: 'Always Eligible Payment Checker',
        }],
    args: {},
    check: async (ctx, order, args) => {
        return true;
    },
});
const alwaysActiveChecker = new core_1.ShippingEligibilityChecker({
    code: 'always-active-checker',
    description: [{
            languageCode: core_1.LanguageCode.en,
            value: 'Always Active Checker',
        }],
    args: {},
    check: async (ctx, order, args) => {
        return true;
    },
});
const flatRateCalculator = new core_1.ShippingCalculator({
    code: 'flat-rate-calculator',
    description: [{
            languageCode: core_1.LanguageCode.en,
            value: 'Flat Rate Calculator',
        }],
    args: {
        rate: {
            type: 'int',
            label: [{ languageCode: core_1.LanguageCode.en, value: 'Shipping Rate' }],
        },
    },
    calculate: async (ctx, order, args) => {
        return {
            price: args.rate,
            priceWithTax: args.rate,
            priceIncludesTax: false,
            taxRate: 0,
        };
    },
});
class FallbackTaxZoneStrategy {
    determineTaxZone(ctx, zones, channel, order) {
        if (channel.defaultTaxZone) {
            return channel.defaultTaxZone;
        }
        if (zones.length > 0) {
            return zones[0];
        }
        return undefined;
    }
}
exports.config = {
    apiOptions: {
        port: +(process.env.PORT || 3002),
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        cors: true,
        middleware: [{
                route: '/paypal/return',
                handler: paypalReturnMiddleware,
            }],
    },
    authOptions: {
        tokenMethod: 'bearer',
        requireVerification: false,
    },
    dbConnectionOptions: databaseUrl
        ? {
            type: 'postgres',
            url: databaseUrl,
            synchronize: true,
            logging: false,
            ssl: isProduction ? { rejectUnauthorized: false } : false,
        }
        : {
            type: 'better-sqlite3',
            database: path_1.default.join(__dirname, '../vendure.sqlite'),
            synchronize: true,
            logging: false,
        },
    customFields: {
        Product: [
            { name: 'weight', type: 'string', label: [{ languageCode: core_1.LanguageCode.en, value: 'Weight' }] },
            { name: 'specifications', type: 'localeText', label: [{ languageCode: core_1.LanguageCode.en, value: 'Specifications' }] },
            { name: 'usage', type: 'localeText', label: [{ languageCode: core_1.LanguageCode.en, value: 'Usage Instructions' }] },
            { name: 'detailImage', type: 'relation', entity: core_1.Asset, label: [{ languageCode: core_1.LanguageCode.en, value: 'Detail Image' }] },
        ],
    },
    paymentOptions: {
        paymentMethodHandlers: [paypal_payment_handler_1.paypalPaymentHandler],
        paymentMethodEligibilityCheckers: [alwaysEligiblePaymentChecker],
    },
    shippingOptions: {
        shippingEligibilityCheckers: [alwaysActiveChecker],
        shippingCalculators: [flatRateCalculator],
    },
    taxOptions: {
        taxZoneStrategy: new FallbackTaxZoneStrategy(),
    },
    logger: new core_1.DefaultLogger({ level: isProduction ? core_1.LogLevel.Info : core_1.LogLevel.Debug }),
    plugins: [
        default_zone_plugin_1.DefaultZonePlugin,
        core_1.DefaultJobQueuePlugin,
        core_1.DefaultSchedulerPlugin,
        core_1.DefaultSearchPlugin,
        asset_server_plugin_1.AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path_1.default.join(__dirname, '../static/assets'),
        }),
        admin_ui_plugin_1.AdminUiPlugin.init({
            port: +(process.env.PORT || 3002),
            route: 'admin',
        }),
    ],
};
const initPayPalServices = (orderService, paymentService) => {
    global.__vendureOrderService = orderService;
    global.__vendurePaymentService = paymentService;
};
exports.initPayPalServices = initPayPalServices;
//# sourceMappingURL=vendure-config.js.map