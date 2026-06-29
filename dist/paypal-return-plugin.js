"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayPalReturnPlugin = exports.PayPalReturnController = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@vendure/core");
let PayPalReturnController = class PayPalReturnController {
    constructor(orderService, paymentService, orderStateMachine) {
        this.orderService = orderService;
        this.paymentService = paymentService;
        this.orderStateMachine = orderStateMachine;
    }
    async handlePayPalReturn(token, payerId, orderCode) {
        core_1.Logger.info('[PayPal Return] Received callback: token=' + token + ', PayerID=' + payerId + ', orderCode=' + orderCode);
        if (!token || !orderCode) {
            core_1.Logger.error('[PayPal Return] Missing token or orderCode. Token: ' + (token ? 'present' : 'MISSING') + ', orderCode: ' + (orderCode ? 'present' : 'MISSING'));
            return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment?error=missing_params` };
        }
        try {
            const ctx = new core_1.RequestContext({
                apiType: 'admin',
                channelOrId: core_1.Channel.DEFAULT_CHANNEL,
            });
            core_1.Logger.info('[PayPal Return] Querying order with code: ' + orderCode);
            const order = await this.orderService.findOneByCode(ctx, orderCode);
            if (!order) {
                core_1.Logger.error('[PayPal Return] Order not found with code: ' + orderCode);
                return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment?error=order_not_found` };
            }
            core_1.Logger.info('[PayPal Return] Found order: code=' + order.code + ', state=' + order.state);
            const lastPayment = order.payments?.[order.payments.length - 1];
            if (!lastPayment) {
                core_1.Logger.error('[PayPal Return] Payment not found');
                return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment?error=payment_not_found` };
            }
            core_1.Logger.info('[PayPal Return] Payment state=' + lastPayment.state + ', id=' + lastPayment.id);
            if (lastPayment.state === 'Settled') {
                core_1.Logger.info('[PayPal Return] Payment already settled');
                return { url: `${process.env.STOREFRONT_URL || ''}/checkout/confirmation/${order.code}` };
            }
            if (lastPayment.state === 'Authorized') {
                core_1.Logger.info('[PayPal Return] Settling payment: ' + lastPayment.id);
                const settledPayment = await this.paymentService.settlePayment(ctx, lastPayment.id);
                core_1.Logger.info('[PayPal Return] Settle result: ' + settledPayment.state);
                if (settledPayment.state === 'Settled') {
                    core_1.Logger.info('[PayPal Return] Payment settled successfully');
                    try {
                        await this.orderStateMachine.transitionToState(ctx, order.id, 'PaymentSettled');
                        core_1.Logger.info('[PayPal Return] Order transitioned to PaymentSettled');
                    }
                    catch (transitionError) {
                        core_1.Logger.warn('[PayPal Return] Order transition failed: ' + String(transitionError));
                    }
                    return { url: `${process.env.STOREFRONT_URL || ''}/checkout/confirmation/${order.code}` };
                }
                else {
                    core_1.Logger.error('[PayPal Return] Payment settlement failed, state: ' + settledPayment.state);
                    return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment?error=settle_failed` };
                }
            }
            else {
                core_1.Logger.error('[PayPal Return] Payment is not Authorized: ' + lastPayment.state);
                return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment?error=wrong_state` };
            }
        }
        catch (error) {
            core_1.Logger.error('[PayPal Return] Unexpected error: ' + String(error));
            return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment?error=server_error` };
        }
    }
};
exports.PayPalReturnController = PayPalReturnController;
__decorate([
    (0, common_1.Get)('paypal-return'),
    (0, common_1.Redirect)(),
    __param(0, (0, common_1.Query)('token')),
    __param(1, (0, common_1.Query)('PayerID')),
    __param(2, (0, common_1.Query)('orderCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PayPalReturnController.prototype, "handlePayPalReturn", null);
exports.PayPalReturnController = PayPalReturnController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [core_1.OrderService,
        core_1.PaymentService,
        core_1.OrderStateMachine])
], PayPalReturnController);
let PayPalReturnPlugin = class PayPalReturnPlugin {
};
exports.PayPalReturnPlugin = PayPalReturnPlugin;
exports.PayPalReturnPlugin = PayPalReturnPlugin = __decorate([
    (0, core_1.VendurePlugin)({
        imports: [core_1.PluginCommonModule],
        controllers: [PayPalReturnController],
        providers: [core_1.OrderService, core_1.PaymentService, core_1.OrderStateMachine],
    })
], PayPalReturnPlugin);
//# sourceMappingURL=paypal-return-plugin.js.map