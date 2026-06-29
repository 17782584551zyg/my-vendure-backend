import { Controller, Get, Query, Redirect } from '@nestjs/common';
import { PluginCommonModule, VendurePlugin, Logger } from '@vendure/core';

@Controller()
export class PayPalReturnController {
  @Get('paypal-return')
  @Redirect()
  async handlePayPalReturn(@Query('token') token: string, @Query('PayerID') payerId: string, @Query('orderCode') orderCode: string) {
    Logger.info('[PayPal Return] Received callback: token=' + token + ', PayerID=' + payerId + ', orderCode=' + orderCode);
    
    if (!token || !orderCode) {
      Logger.error('[PayPal Return] Missing token or orderCode');
      return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment?error=missing_params` };
    }

    try {
      const adminApiUrl = `${process.env.BACKEND_URL || 'http://localhost:3002'}/admin-api`;
      const adminToken = process.env.ADMIN_API_TOKEN || '';
      
      const orderQuery = await fetch(adminApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
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

      const orderData = (await orderQuery.json()) as any;
      
      if (!orderData.data?.order) {
        Logger.error('[PayPal Return] Order not found:', orderCode);
        return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment?error=order_not_found` };
      }

      const order = orderData.data.order;
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
        Logger.info('[PayPal Return] Settling payment:', lastPayment.id);

        const settleResponse = await fetch(adminApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
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

        const settleData = (await settleResponse.json()) as any;
        Logger.info('[PayPal Return] Settle response:', JSON.stringify(settleData, null, 2));

        if (settleData.data?.settlePayment?.__typename === 'Payment' && settleData.data.settlePayment.state === 'Settled') {
          Logger.info('[PayPal Return] Payment settled successfully');

          const transitionResponse = await fetch(adminApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminToken}`,
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

          const transitionData = (await transitionResponse.json()) as any;
          Logger.info('[PayPal Return] Transition response:', JSON.stringify(transitionData, null, 2));

          if (transitionData.data?.transitionOrderToState?.__typename === 'Order') {
            Logger.info('[PayPal Return] Order transitioned successfully');
          } else {
            Logger.warn('[PayPal Return] Order transition may have failed');
          }
          
          return { url: `${process.env.STOREFRONT_URL || ''}/checkout/confirmation/${order.code}` };
        } else {
          Logger.error('[PayPal Return] Payment settlement failed');
          return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment?error=settle_failed` };
        }
      } else {
        Logger.error('[PayPal Return] Payment is not Authorized:', lastPayment.state);
        return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment?error=wrong_state` };
      }
    } catch (error) {
      Logger.error('[PayPal Return] Unexpected error:', String(error));
      return { url: `${process.env.STOREFRONT_URL || ''}/checkout/payment?error=server_error` };
    }
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  controllers: [PayPalReturnController],
})
export class PayPalReturnPlugin {
}