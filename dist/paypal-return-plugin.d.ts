import { OnApplicationBootstrap } from '@vendure/core';
export declare class PayPalReturnModule {
}
export declare class PayPalReturnPlugin implements OnApplicationBootstrap {
    private readonly appModule;
    constructor(appModule: any);
    onApplicationBootstrap(): Promise<void>;
}
//# sourceMappingURL=paypal-return-plugin.d.ts.map