import { Controller, Get, Query, Redirect } from '@nestjs/common';
import { PluginCommonModule, VendurePlugin, Logger, RequestContext, OrderService, PaymentService, OrderStateMachine, Channel } from '@vendure/core';

@Controller()
export class PayPalReturnController {
  constructor(
    private orderService: OrderService,
    private paymentService: PaymentService,
    private orderStateMachine: OrderStateMachine,
  ) {}

  @Get('paypal-return')
  @Redirect()
  async handlePayPalReturn(@Query('token') token: string, @Query('PayerID') payerId: string, @Query('orderCode') orderCode: string) {
    Logger.info('[PayPal Return] Received callback: token=' + token + ', PayerID=' + payerId + ', orderCode=' + orderCode);
    
    if (!token || !orderCode) {
      Logger.error('[PayPal Return] Missing token or orderCode. Token: ' + (token ? 'present' : 'MISSING') + ', orderCode: ' + (orderCode ? 'present' : 'MISSING'));
      return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment?error=missing_params` };
    }

    try {
      const ctx = new RequestContext({
        apiType: 'admin',
        channelOrId: Channel.DEFAULT_CHANNEL,
      });

      Logger.info('[PayPal Return] Querying order with code: ' + orderCode);
      
      const order = await this.orderService.findOneByCode(ctx, orderCode);
      
      if (!order) {
        Logger.error('[PayPal Return] Order not found with code: ' + orderCode);
        return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment?error=order_not_found` };
      }

      Logger.info('[PayPal Return] Found order: code=' + order.code + ', state=' + order.state);

      const lastPayment = order.payments?.[order.payments.length - 1];
      
      if (!lastPayment) {
        Logger.error('[PayPal Return] Payment not found');
        return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment?error=payment_not_found` };
      }

      Logger.info('[PayPal Return] Payment state=' + lastPayment.state + ', id=' + lastPayment.id);

      if (lastPayment.state === 'Settled') {
        Logger.info('[PayPal Return] Payment already settled');
        return { url: `${process.env.STOREFRONT_URL || ''}/checkout/confirmation/${order.code}` };
      }

      if (lastPayment.state === 'Authorized') {
        Logger.info('[PayPal Return] Settling payment: ' + lastPayment.id);

        const settledPayment = await this.paymentService.settlePayment(ctx, lastPayment.id);
        
        Logger.info('[PayPal Return] Settle result: ' + settledPayment.state);

        if (settledPayment.state === 'Settled') {
          Logger.info('[PayPal Return] Payment settled successfully');

          try {
            await this.orderStateMachine.transitionToState(ctx, order.id, 'PaymentSettled');
            Logger.info('[PayPal Return] Order transitioned to PaymentSettled');
          } catch (transitionError) {
            Logger.warn('[PayPal Return] Order transition failed: ' + String(transitionError));
          }
          
          return { url: `${process.env.STOREFRONT_URL || ''}/checkout/confirmation/${order.code}` };
        } else {
          Logger.error('[PayPal Return] Payment settlement failed, state: ' + settledPayment.state);
          return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment?error=settle_failed` };
        }
      } else {
        Logger.error('[PayPal Return] Payment is not Authorized: ' + lastPayment.state);
        return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment?error=wrong_state` };
      }
    } catch (error) {
      Logger.error('[PayPal Return] Unexpected error: ' + String(error));
      return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment?error=server_error` };
    }
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  controllers: [PayPalReturnController],
  providers: [OrderService, PaymentService, OrderStateMachine],
})
export class PayPalReturnPlugin {
}