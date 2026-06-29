import { bootstrap, JobQueueService, Logger } from '@vendure/core';
import { config } from './vendure-config';

async function start() {
  const app = await bootstrap(config);
  
  const jobQueueService = app.get(JobQueueService);
  jobQueueService.start();
  
  const httpAdapter = app.getHttpAdapter();
  const expressInstance = httpAdapter.getInstance();
  
  expressInstance.get('/paypal-return', async (req: any, res: any) => {
    const { token, PayerID, orderCode } = req.query;
    
    Logger.info('[PayPal Return] Received callback: token=' + token + ', PayerID=' + PayerID + ', orderCode=' + orderCode);
    
    if (!token || !orderCode) {
      Logger.error('[PayPal Return] Missing token or orderCode');
      return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment?error=missing_params`);
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
        return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment?error=order_not_found`);
      }

      const order = orderData.data.order;
      Logger.info('[PayPal Return] Found order: code=' + order.code + ', state=' + order.state);

      const lastPayment = order.payments?.[order.payments.length - 1];
      
      if (!lastPayment) {
        Logger.error('[PayPal Return] Payment not found');
        return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment?error=payment_not_found`);
      }

      Logger.info('[PayPal Return] Payment state=' + lastPayment.state + ', id=' + lastPayment.id);

      if (lastPayment.state === 'Settled') {
        Logger.info('[PayPal Return] Payment already settled');
        return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/confirmation/${order.code}`);
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
          
          return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/confirmation/${order.code}`);
        } else {
          Logger.error('[PayPal Return] Payment settlement failed');
          return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment?error=settle_failed`);
        }
      } else {
        Logger.error('[PayPal Return] Payment is not Authorized:', lastPayment.state);
        return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment?error=wrong_state`);
      }
    } catch (error) {
      Logger.error('[PayPal Return] Unexpected error:', String(error));
      return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment?error=server_error`);
    }
  });
  
  Logger.info('[PayPal Return] Registered /paypal-return endpoint');
  
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