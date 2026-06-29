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
      
      console.log('[PayPal] createPayment started');
      console.log('[PayPal] clientId:', clientId ? 'provided' : 'MISSING');
      console.log('[PayPal] clientSecret:', clientSecret ? 'provided' : 'MISSING');
      console.log('[PayPal] environment:', environment);
      console.log('[PayPal] order amount:', amount, 'currency:', order.currencyCode);
      
      if (!clientId || !clientSecret) {
        console.error('[PayPal] Missing credentials');
        return {
          amount,
          state: 'Declined',
          transactionId: '',
          errorMessage: 'PayPal credentials not configured. Please set Client ID and Secret in Admin UI.',
        };
      }
      
      const apiUrl = environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      console.log('[PayPal] Requesting access token from:', apiUrl);
      
      const tokenResponse = await fetch(`${apiUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      
      const tokenData = await tokenResponse.json();
      console.log('[PayPal] Token response status:', tokenResponse.status);
      
      if (!tokenResponse.ok) {
        console.error('[PayPal] Token request failed:', tokenData);
        return {
          amount,
          state: 'Declined',
          transactionId: '',
          errorMessage: `PayPal auth failed: ${(tokenData as any).error_description || 'Invalid credentials'}`,
        };
      }
      
      const accessToken = (tokenData as { access_token: string }).access_token;
      console.log('[PayPal] Access token obtained');
      
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
            return_url: `${process.env.BACKEND_URL || 'http://localhost:3002'}/paypal-return?orderCode=${order.code}`,
            cancel_url: `${process.env.STOREFRONT_URL || ''}/checkout/payment`,
          },
        }),
      });
      
      const orderData = await orderResponse.json();
      console.log('[PayPal] Order response status:', orderResponse.status);
      console.log('[PayPal] Order data:', JSON.stringify(orderData, null, 2));
      
      const returnUrl = `${process.env.BACKEND_URL || 'http://localhost:3002'}/paypal-return?orderCode=${order.code}`;
      console.log('[PayPal] RETURN URL sent to PayPal:', returnUrl);
      console.log('[PayPal] BACKEND_URL env:', process.env.BACKEND_URL || 'NOT SET');
      
      if (orderResponse.ok && (orderData as { id: string }).id) {
        const approvalUrl = (orderData as { id: string; links?: { rel: string; href: string }[] }).links?.find((link: any) => link.rel === 'approve')?.href;
        console.log('[PayPal] Approval URL:', approvalUrl);
        return {
          amount,
          state: 'Authorized',
          transactionId: (orderData as { id: string }).id,
          metadata: {
            public: {
              approvalUrl,
            },
          },
        };
      }
      
      console.error('[PayPal] Order creation failed:', orderData);
      return {
        amount,
        state: 'Declined',
        transactionId: '',
        errorMessage: `PayPal error: ${(orderData as any).message || (orderData as any).error_message || 'Payment creation failed'}`,
      };
    } catch (error) {
      console.error('[PayPal] createPayment error:', error);
      return {
        amount,
        state: 'Declined',
        transactionId: '',
        errorMessage: `PayPal error: ${(error as Error).message || 'Payment creation error'}`,
      };
    }
  },
  settlePayment: async (ctx: RequestContext, order: Order, payment: Payment, args: PayPalArgs, method: PaymentMethod) => {
    try {
      const clientId = args.clientId || '';
      const clientSecret = args.clientSecret || '';
      const environment = args.environment || 'sandbox';
      
      console.log('[PayPal] settlePayment started');
      console.log('[PayPal] order:', order.code);
      console.log('[PayPal] payment id:', payment.id);
      console.log('[PayPal] transactionId:', payment.transactionId);
      
      if (!payment.transactionId) {
        console.error('[PayPal] settlePayment failed: No transactionId');
        return { 
          success: false, 
          errorMessage: 'No PayPal transaction ID found' 
        };
      }
      
      const apiUrl = environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      console.log('[PayPal] Getting access token for capture');
      
      const tokenResponse = await fetch(`${apiUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      
      const tokenData = await tokenResponse.json() as { access_token: string };
      
      if (!tokenResponse.ok) {
        console.error('[PayPal] Token request failed in settlePayment:', tokenData);
        return { 
          success: false, 
          errorMessage: 'Failed to get PayPal access token' 
        };
      }
      
      const accessToken = tokenData.access_token;
      console.log('[PayPal] Access token obtained for capture');
      
      console.log('[PayPal] Capturing payment with transactionId:', payment.transactionId);
      
      const captureResponse = await fetch(`${apiUrl}/v2/checkout/orders/${payment.transactionId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('[PayPal] Capture response status:', captureResponse.status);
      
      const captureData = await captureResponse.json() as any;
      console.log('[PayPal] settlePayment capture response:', JSON.stringify(captureData, null, 2));
      
      if (!captureResponse.ok) {
        const errorMsg = captureData?.message || captureData?.details?.[0]?.issue || captureData?.error_description || 'Payment capture failed';
        console.error('[PayPal] Capture failed:', errorMsg);
        return { 
          success: false, 
          errorMessage: errorMsg 
        };
      }
      
      let captureStatus: string | undefined;
      
      if (captureData?.purchase_units?.[0]?.payments?.captures?.[0]) {
        captureStatus = captureData.purchase_units[0].payments.captures[0].status;
        console.log('[PayPal] Capture status from purchase_units:', captureStatus);
      } else if (captureData?.status) {
        captureStatus = captureData.status;
        console.log('[PayPal] Capture status from root:', captureStatus);
      } else {
        console.error('[PayPal] Cannot find capture status in response');
        return { 
          success: false, 
          errorMessage: 'Cannot determine capture status' 
        };
      }
      
      if (captureStatus === 'COMPLETED' || captureStatus === 'APPROVED') {
        console.log('[PayPal] Payment capture successful, status:', captureStatus);
        return { success: true };
      } else {
        console.error('[PayPal] Payment capture not completed, status:', captureStatus);
        return { 
          success: false, 
          errorMessage: `Payment capture status is ${captureStatus}` 
        };
      }
    } catch (error) {
      console.error('[PayPal] settlePayment error:', error);
      console.error('[PayPal] settlePayment error stack:', (error as Error).stack);
      return { 
        success: false, 
        errorMessage: (error as Error).message || 'Payment capture error' 
      };
    }
  },
});

export { paypalPaymentHandler };