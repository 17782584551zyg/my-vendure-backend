"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayPalReturnController = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@vendure/core");
let PayPalReturnController = (() => {
    let _classDecorators = [(0, common_1.Controller)('paypal')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handleReturn_decorators;
    var PayPalReturnController = _classThis = class {
        constructor(orderService, paymentService) {
            this.orderService = (__runInitializers(this, _instanceExtraInitializers), orderService);
            this.paymentService = paymentService;
        }
        async handleReturn(token, orderCode) {
            console.log('[PayPal Return] Received:', { token, orderCode });
            if (!token || !orderCode) {
                console.error('[PayPal Return] Missing token or orderCode');
                return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment` };
            }
            const ctx = new core_1.RequestContext({
                apiType: 'shop',
                channelId: 1,
                languageCode: core_1.LanguageCode.en,
            });
            try {
                const order = await this.orderService.findOneByCode(ctx, orderCode);
                if (!order) {
                    console.error('[PayPal Return] Order not found:', orderCode);
                    return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment` };
                }
                console.log('[PayPal Return] Found order:', order.code, 'state:', order.state);
                const lastPayment = order.payments?.[order.payments.length - 1];
                if (!lastPayment || lastPayment.state !== 'Authorized') {
                    console.error('[PayPal Return] Payment not found or not Authorized');
                    return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment` };
                }
                console.log('[PayPal Return] Payment found:', lastPayment.id, 'transactionId:', lastPayment.transactionId);
                const handlerArgs = lastPayment.method.handlerArgs;
                const clientId = handlerArgs.clientId || '';
                const clientSecret = handlerArgs.clientSecret || '';
                const environment = handlerArgs.environment || 'sandbox';
                if (!clientId || !clientSecret) {
                    console.error('[PayPal Return] Missing PayPal credentials');
                    return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment` };
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
                    return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment` };
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
                    await this.paymentService.settlePayment(ctx, lastPayment.id);
                    await this.orderService.transitionToState(ctx, order.id, 'PaymentSettled');
                    return { url: `${process.env.STOREFRONT_URL || ''}/checkout/confirmation/${orderCode}` };
                }
                console.error('[PayPal Return] Payment capture failed:', captureData.message || 'Unknown error');
                return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment` };
            }
            catch (error) {
                console.error('[PayPal Return] Error:', error);
                return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment` };
            }
        }
    };
    __setFunctionName(_classThis, "PayPalReturnController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _handleReturn_decorators = [(0, common_1.Get)('return'), (0, common_1.Redirect)('/')];
        __esDecorate(_classThis, null, _handleReturn_decorators, { kind: "method", name: "handleReturn", static: false, private: false, access: { has: obj => "handleReturn" in obj, get: obj => obj.handleReturn }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PayPalReturnController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PayPalReturnController = _classThis;
})();
exports.PayPalReturnController = PayPalReturnController;
//# sourceMappingURL=paypal-return-controller.js.map