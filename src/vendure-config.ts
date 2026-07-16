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
import { PayPalReturnPlugin } from './paypal-return-plugin';
import { ContactFormPlugin } from './contact-form-plugin';

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;
const backendUrl = process.env.BACKEND_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : undefined);

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
    cors: { origin: true, credentials: true },
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
  customFields: { Channel: [{ name: 'bannerImages', type: 'relation', list: true, entity: Asset, label: [{ languageCode: LanguageCode.en, value: 'Banner Images' }] }],
    Product: [
      { name: 'productDetails', type: 'localeText', label: [{ languageCode: LanguageCode.en, value: 'Product Details' }], ui: { component: 'rich-text-form-input' } },
      { name: 'detailImage', type: 'relation', list: true, entity: Asset, label: [{ languageCode: LanguageCode.en, value: 'Detail Images' }] },
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
      assetUrlPrefix: isProduction && backendUrl ? `${backendUrl}/assets` : undefined,
    }),
    AdminUiPlugin.init({
      port: +(process.env.PORT || 3002),
      route: 'admin',
      app: {
        path: './admin-ui/dist',
      },
    }),
    PayPalReturnPlugin,
    ContactFormPlugin,
  ],
};