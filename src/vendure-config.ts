import {
  DefaultLogger,
  DefaultJobQueuePlugin,
  DefaultSearchPlugin,
  DefaultSchedulerPlugin,
  LogLevel,
  VendureConfig,
  PaymentMethodEligibilityChecker,
  ShippingEligibilityChecker,
  ShippingCalculator,
  LanguageCode,
  Asset,
  TaxZoneStrategy,
  RequestContext,
  Channel,
  Order,
  Zone,
} from '@vendure/core';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import path from 'path';
import { DefaultZonePlugin } from './default-zone-plugin';
import { paypalPaymentHandler } from './paypal-payment-handler';

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

interface PayPalArgs {
  clientId: string;
  clientSecret: string;
  environment: string;
}

const paypalReturnMiddleware = async (req: any, res: any, next: any) => {
  const token = req.query.token;
  const orderCode = req.query.orderCode;
  
  console.log('[PayPal Return] Received:', { token, orderCode });
  
  if (!token || !orderCode) {
    console.error('[PayPal Return] Missing token or orderCode');
    return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment`);
  }

  try {
    const orderService = (global as any).__vendureOrderService;
    const paymentService = (global as any).__vendurePaymentService;
    
    if (!orderService || !paymentService) {
      console.error('[PayPal Return] Services not available');
      return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment`);
    }

    const ctx = {
      apiType: 'shop',
      channelId: 1,
      languageCode: 'en',
      isAuthorized: true,
    } as any;

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

    const handlerArgs = (lastPayment.method as any).handlerArgs as PayPalArgs;
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

    const tokenData = await tokenResponse.json() as { access_token: string };
    
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

    const captureData = await captureResponse.json() as { status: string; message?: string };
    console.log('[PayPal Return] Capture response:', JSON.stringify(captureData, null, 2));

    if (captureData.status === 'COMPLETED') {
      console.log('[PayPal Return] Payment captured successfully');
      
      await paymentService.settlePayment(ctx, lastPayment.id);
      
      await orderService.transitionToState(ctx, order.id, 'PaymentSettled');
      
      return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/confirmation/${orderCode}`);
    }

    console.error('[PayPal Return] Payment capture failed:', captureData.message || 'Unknown error');
    return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment`);

  } catch (error) {
    console.error('[PayPal Return] Error:', error);
    return res.redirect(`${process.env.STOREFRONT_URL || ''}/checkout/payment`);
  }
};

const alwaysEligiblePaymentChecker = new PaymentMethodEligibilityChecker({
  code: 'always-eligible-payment-checker',
  description: [{
    languageCode: LanguageCode.en,
    value: 'Always Eligible Payment Checker',
  }],
  args: {},
  check: async (ctx, order, args) => {
    return true;
  },
});

const alwaysActiveChecker = new ShippingEligibilityChecker({
  code: 'always-active-checker',
  description: [{
    languageCode: LanguageCode.en,
    value: 'Always Active Checker',
  }],
  args: {},
  check: async (ctx, order, args) => {
    return true;
  },
});

const flatRateCalculator = new ShippingCalculator({
  code: 'flat-rate-calculator',
  description: [{
    languageCode: LanguageCode.en,
    value: 'Flat Rate Calculator',
  }],
  args: {
    rate: {
      type: 'int',
      label: [{ languageCode: LanguageCode.en, value: 'Shipping Rate' }],
    },
  },
  calculate: async (ctx, order, args) => {
    return {
      price: args.rate,
      priceWithTax: args.rate,
      priceIncludesTax: false,
      taxRate: 0,
    };
  },
});

class FallbackTaxZoneStrategy implements TaxZoneStrategy {
  determineTaxZone(ctx: RequestContext, zones: Zone[], channel: Channel, order?: Order): Zone | undefined {
    if (channel.defaultTaxZone) {
      return channel.defaultTaxZone;
    }
    if (zones.length > 0) {
      return zones[0];
    }
    return undefined;
  }
}

export const config: VendureConfig = {
  apiOptions: {
    port: +(process.env.PORT || 3002),
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
    cors: true,
    middleware: [{
      route: '/paypal/return',
      handler: paypalReturnMiddleware,
    }],
  },
  authOptions: {
    tokenMethod: 'bearer',
    requireVerification: false,
  },
  dbConnectionOptions: databaseUrl
    ? {
        type: 'postgres',
        url: databaseUrl,
        synchronize: true,
        logging: false,
        ssl: isProduction ? { rejectUnauthorized: false } : false,
      }
    : {
        type: 'better-sqlite3',
        database: path.join(__dirname, '../vendure.sqlite'),
        synchronize: true,
        logging: false,
      },
  customFields: {
    Product: [
      { name: 'weight', type: 'string', label: [{ languageCode: LanguageCode.en, value: 'Weight' }] },
      { name: 'specifications', type: 'localeText', label: [{ languageCode: LanguageCode.en, value: 'Specifications' }] },
      { name: 'usage', type: 'localeText', label: [{ languageCode: LanguageCode.en, value: 'Usage Instructions' }] },
      { name: 'detailImage', type: 'relation', entity: Asset, label: [{ languageCode: LanguageCode.en, value: 'Detail Image' }] },
    ],
  },
  paymentOptions: {
    paymentMethodHandlers: [paypalPaymentHandler],
    paymentMethodEligibilityCheckers: [alwaysEligiblePaymentChecker],
  },
  shippingOptions: {
    shippingEligibilityCheckers: [alwaysActiveChecker],
    shippingCalculators: [flatRateCalculator],
  },
  taxOptions: {
    taxZoneStrategy: new FallbackTaxZoneStrategy(),
  },
  logger: new DefaultLogger({ level: isProduction ? LogLevel.Info : LogLevel.Debug }),
  plugins: [
    DefaultZonePlugin,
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    AssetServerPlugin.init({
      route: 'assets',
      assetUploadDir: path.join(__dirname, '../static/assets'),
    }),
    AdminUiPlugin.init({
      port: +(process.env.PORT || 3002),
      route: 'admin',
    }),
  ],
};

export const initPayPalServices = (orderService: any, paymentService: any) => {
  (global as any).__vendureOrderService = orderService;
  (global as any).__vendurePaymentService = paymentService;
};