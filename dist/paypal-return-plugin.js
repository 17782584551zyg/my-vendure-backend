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
exports.PayPalReturnPlugin = void 0;
const core_1 = require("@vendure/core");
let PayPalReturnPlugin = (() => {
    let _classDecorators = [(0, core_1.VendurePlugin)({
            imports: [core_1.PluginCommonModule],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var PayPalReturnPlugin = _classThis = class {
        async onApplicationBootstrap() {
            const app = globalThis['vendureApp'];
            if (!app) {
                core_1.Logger.error('Vendure app instance not found');
                return;
            }
            const httpAdapter = app.getHttpAdapter();
            const expressInstance = httpAdapter.getInstance();
            expressInstance.get('/paypal-return', async (req, res) => {
                const { token, PayerID, orderCode } = req.query;
                core_1.Logger.info('[PayPal Return] Received callback:', { token, PayerID, orderCode });
                if (!token || !orderCode) {
                    core_1.Logger.error('[PayPal Return] Missing token or orderCode');
                    return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment?error=missing_params`);
                }
                try {
                    const adminApiUrl = `${process.env.BACKEND_URL || 'http://localhost:3002'}/admin-api`;
                    const orderQuery = await fetch(adminApiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.ADMIN_API_TOKEN || 'superadmin'}`,
                        },
                        body: JSON.stringify({
                            query: `
              query GetOrder($code: String!) {
                order(code: $code) {
                  id
                  code
                  state
                  payments {
                    id
                    state
                    transactionId
                  }
                }
              }
            `,
                            variables: { code: orderCode },
                        }),
                    });
                    const orderData = await orderQuery.json();
                    if (!orderData.data?.order) {
                        core_1.Logger.error('[PayPal Return] Order not found:', orderCode);
                        return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment?error=order_not_found`);
                    }
                    const order = orderData.data.order;
                    core_1.Logger.info('[PayPal Return] Found order:', order.code, 'state:', order.state);
                    const lastPayment = order.payments?.[order.payments.length - 1];
                    if (!lastPayment) {
                        core_1.Logger.error('[PayPal Return] Payment not found');
                        return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment?error=payment_not_found`);
                    }
                    core_1.Logger.info('[PayPal Return] Payment state:', lastPayment.state, 'id:', lastPayment.id);
                    if (lastPayment.state === 'Settled') {
                        core_1.Logger.info('[PayPal Return] Payment already settled');
                        return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/confirmation/${order.code}`);
                    }
                    if (lastPayment.state === 'Authorized') {
                        core_1.Logger.info('[PayPal Return] Settling payment:', lastPayment.id);
                        const settleResponse = await fetch(adminApiUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${process.env.ADMIN_API_TOKEN || 'superadmin'}`,
                            },
                            body: JSON.stringify({
                                query: `
                mutation SettlePayment($id: ID!) {
                  settlePayment(id: $id) {
                    ... on Payment {
                      id
                      state
                    }
                    ... on ErrorResult {
                      message
                    }
                  }
                }
              `,
                                variables: { id: lastPayment.id },
                            }),
                        });
                        const settleData = await settleResponse.json();
                        core_1.Logger.info('[PayPal Return] Settle response:', JSON.stringify(settleData, null, 2));
                        if (settleData.data?.settlePayment?.__typename === 'Payment' && settleData.data.settlePayment.state === 'Settled') {
                            core_1.Logger.info('[PayPal Return] Payment settled successfully');
                            const transitionResponse = await fetch(adminApiUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${process.env.ADMIN_API_TOKEN || 'superadmin'}`,
                                },
                                body: JSON.stringify({
                                    query: `
                  mutation TransitionOrderToState($id: ID!, $state: String!) {
                    transitionOrderToState(id: $id, state: $state) {
                      ... on Order {
                        id
                        state
                      }
                      ... on OrderStateTransitionError {
                        message
                      }
                    }
                  }
                `,
                                    variables: { id: order.id, state: 'PaymentSettled' },
                                }),
                            });
                            const transitionData = await transitionResponse.json();
                            core_1.Logger.info('[PayPal Return] Transition response:', JSON.stringify(transitionData, null, 2));
                            if (transitionData.data?.transitionOrderToState?.__typename === 'Order') {
                                core_1.Logger.info('[PayPal Return] Order transitioned successfully');
                                return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/confirmation/${order.code}`);
                            }
                            else {
                                core_1.Logger.warn('[PayPal Return] Order transition may have failed, still redirecting to confirmation');
                                return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/confirmation/${order.code}`);
                            }
                        }
                        else {
                            core_1.Logger.error('[PayPal Return] Payment settlement failed');
                            return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment?error=settle_failed`);
                        }
                    }
                    else {
                        core_1.Logger.error('[PayPal Return] Payment is not Authorized:', lastPayment.state);
                        return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment?error=wrong_state`);
                    }
                }
                catch (error) {
                    core_1.Logger.error('[PayPal Return] Unexpected error:', error);
                    return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment?error=server_error`);
                }
            });
            core_1.Logger.info('[PayPal Return Plugin] Registered /paypal-return endpoint');
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