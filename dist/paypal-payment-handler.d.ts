import { PaymentMethodHandler, LanguageCode } from '@vendure/core';
declare const paypalPaymentHandler: PaymentMethodHandler<{
    clientId: {
        type: "string";
        label: {
            languageCode: LanguageCode.en;
            value: string;
        }[];
    };
    clientSecret: {
        type: "string";
        label: {
            languageCode: LanguageCode.en;
            value: string;
        }[];
    };
    environment: {
        type: "string";
        label: {
            languageCode: LanguageCode.en;
            value: string;
        }[];
    };
}>;
export { paypalPaymentHandler };
//# sourceMappingURL=paypal-payment-handler.d.ts.map