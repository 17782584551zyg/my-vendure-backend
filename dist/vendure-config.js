"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const core_1 = require("@vendure/core");
const admin_ui_plugin_1 = require("@vendure/admin-ui-plugin");
const asset_server_plugin_1 = require("@vendure/asset-server-plugin");
const path_1 = __importDefault(require("path"));
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;
const dummyPaymentHandler = new core_1.PaymentMethodHandler({
    code: 'dummy-payment-handler',
    description: [{
            languageCode: core_1.LanguageCode.en,
            value: 'Dummy Payment Handler',
        }],
    args: {},
    createPayment: async (ctx, order, amount, args, metadata) => {
        return {
            amount: order.total,
            state: 'Settled',
            transactionId: 'dummy-' + Date.now(),
        };
    },
    settlePayment: async (ctx, order, payment, args) => {
        return { success: true };
    },
});
const alwaysEligiblePaymentChecker = new core_1.PaymentMethodEligibilityChecker({
    code: 'always-eligible-payment-checker',
    description: [{
            languageCode: core_1.LanguageCode.en,
            value: 'Always Eligible Payment Checker',
        }],
    args: {},
    check: async (ctx, order, args) => {
        return true;
    },
});
const alwaysActiveChecker = new core_1.ShippingEligibilityChecker({
    code: 'always-active-checker',
    description: [{
            languageCode: core_1.LanguageCode.en,
            value: 'Always Active Checker',
        }],
    args: {},
    check: async (ctx, order, args) => {
        return true;
    },
});
const flatRateCalculator = new core_1.ShippingCalculator({
    code: 'flat-rate-calculator',
    description: [{
            languageCode: core_1.LanguageCode.en,
            value: 'Flat Rate Calculator',
        }],
    args: {
        rate: {
            type: 'int',
            label: [{ languageCode: core_1.LanguageCode.en, value: 'Shipping Rate' }],
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
class FallbackTaxZoneStrategy {
    determineTaxZone(ctx, zones, channel, order) {
        if (channel.defaultTaxZone) {
            return channel.defaultTaxZone;
        }
        if (zones.length > 0) {
            return zones[0];
        }
        return undefined;
    }
}
exports.config = {
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
            database: path_1.default.join(__dirname, '../vendure.sqlite'),
            synchronize: true,
            logging: false,
        },
    customFields: {
        Product: [
            { name: 'weight', type: 'string', label: [{ languageCode: core_1.LanguageCode.en, value: 'Weight' }] },
            { name: 'specifications', type: 'localeText', label: [{ languageCode: core_1.LanguageCode.en, value: 'Specifications' }] },
            { name: 'usage', type: 'localeText', label: [{ languageCode: core_1.LanguageCode.en, value: 'Usage Instructions' }] },
            { name: 'detailImage', type: 'relation', entity: core_1.Asset, label: [{ languageCode: core_1.LanguageCode.en, value: 'Detail Image' }] },
        ],
    },
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler],
        paymentMethodEligibilityCheckers: [alwaysEligiblePaymentChecker],
    },
    shippingOptions: {
        shippingEligibilityCheckers: [alwaysActiveChecker],
        shippingCalculators: [flatRateCalculator],
    },
    taxOptions: {
        taxZoneStrategy: new FallbackTaxZoneStrategy(),
    },
    logger: new core_1.DefaultLogger({ level: isProduction ? core_1.LogLevel.Info : core_1.LogLevel.Debug }),
    plugins: [
        core_1.DefaultJobQueuePlugin,
        core_1.DefaultSchedulerPlugin,
        core_1.DefaultSearchPlugin,
        asset_server_plugin_1.AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path_1.default.join(__dirname, '../static/assets'),
        }),
        admin_ui_plugin_1.AdminUiPlugin.init({
            port: +(process.env.PORT || 3002),
            route: 'admin',
        }),
    ],
};
//# sourceMappingURL=vendure-config.js.map