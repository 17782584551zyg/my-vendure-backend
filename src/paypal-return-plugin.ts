import { Controller, Get, Query, Redirect, Req } from '@nestjs/common';
import { PluginCommonModule, VendurePlugin, Logger, RequestContext, PaymentService, ChannelService, TransactionalConnection, Order, Channel } from '@vendure/core';

@Controller()
export class PayPalReturnController {
  constructor(
    private connection: TransactionalConnection,
    private paymentService: PaymentService,
    private channelService: ChannelService,
  ) {}

  @Get('paypal-return')
  @Redirect()
  async handlePayPalReturn(@Req() req: any, @Query('token') token: string, @Query('PayerID') payerId: string, @Query('orderCode') orderCode: string) {
    const storefrontUrl = process.env.STOREFRONT_URL || 'https://storefront-5qkr.onrailway.app';
    const backendUrl = process.env.BACKEND_URL || 'https://vendure-backend-8k3h.onrailway.app';
    
    Logger.info('[PayPal Return] Full URL: ' + req.protocol + '://' + req.get('host') + req.originalUrl);
    Logger.info('[PayPal Return] All query params: ' + JSON.stringify(req.query));
    Logger.info('[PayPal Return] STOREFRONT_URL: ' + storefrontUrl);
    Logger.info('[PayPal Return] BACKEND_URL: ' + backendUrl);
    
    if (!token || !orderCode) {
      Logger.error('[PayPal Return] Missing token or orderCode. Token: ' + (token ? 'present' : 'MISSING') + ', orderCode: ' + (orderCode ? 'present' : 'MISSING'));
      return { url: `${storefrontUrl}/checkout/payment?error=missing_params` };
    }

    try {
      const defaultChannel = await this.channelService.getDefaultChannel();
      Logger.info('[PayPal Return] Default channel: ' + defaultChannel.code);
      
      const ctx = new RequestContext({
        apiType: 'admin',
        channel: defaultChannel,
        isAuthorized: true,
        authorizedAsOwnerOnly: false,
      });

      Logger.info('[PayPal Return] Querying order with code: ' + orderCode);
      
      const order = await this.connection.getRepository(ctx, Order).findOne({
        where: { code: orderCode },
        relations: ['payments'],
      });
      
      if (!order) {
        Logger.error('[PayPal Return] Order NOT FOUND with code: ' + orderCode);
        
        const allOrders = await this.connection.getRepository(ctx, Order).find({
          take: 5,
          select: ['code'],
        });
        Logger.error('[PayPal Return] Available orders: ' + JSON.stringify(allOrders));
        
        return { url: `${storefrontUrl}/checkout/payment?error=order_not_found` };
      }

      Logger.info('[PayPal Return] Found order: code=' + order.code + ', state=' + order.state + ', id=' + order.id);

      const lastPayment = order.payments?.[order.payments.length - 1];
      
      if (!lastPayment) {
        Logger.error('[PayPal Return] Payment not found');
        return { url: `${storefrontUrl}/checkout/payment?error=payment_not_found` };
      }

      Logger.info('[PayPal Return] Payment state=' + lastPayment.state + ', id=' + lastPayment.id);

      if (lastPayment.state === 'Settled') {
        Logger.info('[PayPal Return] Payment already settled');
        return { url: `${storefrontUrl}/checkout/confirmation/${order.code}` };
      }

      if (lastPayment.state === 'Authorized') {
        Logger.info('[PayPal Return] Settling payment: ' + lastPayment.id);

        const settleResult = await this.paymentService.settlePayment(ctx, lastPayment.id);
        
        Logger.info('[PayPal Return] Settle result type: ' + typeof settleResult);
        Logger.info('[PayPal Return] Settle result: ' + JSON.stringify(settleResult));
        
        if ('state' in settleResult && settleResult.state === 'Settled') {
          Logger.info('[PayPal Return] Payment settled successfully');
          
          return { url: `${storefrontUrl}/checkout/confirmation/${order.code}` };
        } else {
          Logger.error('[PayPal Return] Payment settlement failed');
          return { url: `${storefrontUrl}/checkout/payment?error=settle_failed` };
        }
      } else {
        Logger.error('[PayPal Return] Payment is not Authorized: ' + lastPayment.state);
        return { url: `${storefrontUrl}/checkout/payment?error=wrong_state` };
      }
    } catch (error) {
      Logger.error('[PayPal Return] Unexpected error: ' + String(error));
      Logger.error('[PayPal Return] Error stack: ' + (error as Error).stack);
      return { url: `${storefrontUrl}/checkout/payment?error=server_error` };
    }
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  controllers: [PayPalReturnController],
})
export class PayPalReturnPlugin {
}