import {
  DefaultLogger,
  DefaultJobQueuePlugin,
  DefaultSearchPlugin,
  DefaultSchedulerPlugin,
  LogLevel,
  VendureConfig,
  PaymentMethodHandler,
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
