import { PaymentMethodHandler, LanguageCode, RequestContext, Order, Payment, PaymentMethod, PaymentMetadata } from '@vendure/core';

interface PayPalArgs {
  clientId: string;
  clientSecret: string;
  environment: string;
}

const paypalPaymentHandler = new PaymentMethodHandler({
  code: 'paypal-handler',
  description: [{
    languageCode: LanguageCode.en,
    value: 'PayPal',
  }],
  args: {
    clientId: { type: 'string', label: [{ languageCode: LanguageCode.en, value: 'PayPal Client ID' }] },
    clientSecret: { type: 'string', label: [{ languageCode: LanguageCode.en, value: 'PayPal Client Secret' }] },
    environment: { type: 'string', label: [{ languageCode: LanguageCode.en, value: 'Environment' }] },
  },
  createPayment: async (ctx: RequestContext, order: Order, amount: number, args: PayPalArgs, metadata: PaymentMetadata, method: PaymentMethod) => {
    try {
      const clientId = args.clientId || '';
      const clientSecret = args.clientSecret || '';
      const environment = args.environment || 'sandbox';
      
      const apiUrl = environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const tokenResponse = await fetch(`${apiUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      
      const tokenData = await tokenResponse.json() as { access_token: string };
      const accessToken = tokenData.access_token;
      
      const orderResponse = await fetch(`${apiUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: order.currencyCode || 'USD',
              value: (amount / 100).toFixed(2),
            },
          }],
          application_context: {
            return_url: `${process.env.VENDURE_API_URL || ''}/paypal-return`,
            cancel_url: `${process.env.VENDURE_API_URL || ''}/paypal-cancel`,
          },
        }),
      });
      
      const orderData = await orderResponse.json() as { id: string; links?: { rel: string; href: string }[] };
      
      if (orderData.id) {
        const approvalUrl = orderData.links?.find((link: any) => link.rel === 'approve')?.href;
        return {
          amount,
          state: 'Authorized',
          transactionId: orderData.id,
          metadata: {
            approvalUrl,
          },
        };
      }
      
      return {
        amount,
        state: 'Declined',
        transactionId: '',
        metadata: {
          error: (orderData as any).message || 'PayPal payment creation failed',
        },
      };
    } catch (error) {
      console.error('PayPal createPayment error:', error);
      return {
        amount,
        state: 'Declined',
        transactionId: '',
        metadata: {
          error: (error as Error).message || 'Payment creation error',
        },
      };
    }
  },
  settlePayment: async (ctx: RequestContext, order: Order, payment: Payment, args: PayPalArgs, method: PaymentMethod) => {
    try {
      const clientId = args.clientId || '';
      const clientSecret = args.clientSecret || '';
      const environment = args.environment || 'sandbox';
      
      const apiUrl = environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const tokenResponse = await fetch(`${apiUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      
      const tokenData = await tokenResponse.json() as { access_token: string };
      const accessToken = tokenData.access_token;
      
      const captureResponse = await fetch(`${apiUrl}/v2/checkout/orders/${payment.transactionId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      const captureData = await captureResponse.json() as { status: string; message?: string };
      
      if (captureData.status === 'COMPLETED') {
        return { success: true };
      }
      
      return { 
        success: false, 
        errorMessage: captureData.message || 'Payment capture failed' 
      };
    } catch (error) {
      console.error('PayPal settlePayment error:', error);
      return { 
        success: false, 
        errorMessage: (error as Error).message || 'Payment capture error' 
      };
    }
  },
});

export { paypalPaymentHandler };