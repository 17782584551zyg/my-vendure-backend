"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayPalReturnPlugin = exports.PayPalReturnModule = void 0;
const core_1 = require("@vendure/core");
const common_1 = require("@nestjs/common");
let PayPalReturnModule = (() => {
    let _classDecorators = [(0, common_1.Module)({
            imports: [core_1.PluginCommonModule],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var PayPalReturnModule = _classThis = class {
    };
    __setFunctionName(_classThis, "PayPalReturnModule");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PayPalReturnModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PayPalReturnModule = _classThis;
})();
exports.PayPalReturnModule = PayPalReturnModule;
let PayPalReturnPlugin = (() => {
    let _classDecorators = [(0, core_1.VendurePlugin)({
            imports: [PayPalReturnModule],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var PayPalReturnPlugin = _classThis = class {
        constructor(appModule) {
            this.appModule = appModule;
        }
        async onApplicationBootstrap() {
            const app = this.appModule.instance;
            const httpAdapter = app.getHttpAdapter();
            httpAdapter.get('/paypal/return', async (req, res) => {
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
        }
    };
    __setFunctionName(_classThis, "PayPalReturnPlugin");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PayPalReturnPlugin = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PayPalReturnPlugin = _classThis;
})();
exports.PayPalReturnPlugin = PayPalReturnPlugin;
//# sourceMappingURL=paypal-return-plugin.js.map