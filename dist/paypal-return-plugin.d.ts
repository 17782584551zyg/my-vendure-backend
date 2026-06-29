import { PaymentService, ChannelService, TransactionalConnection } from '@vendure/core';
export declare class PayPalReturnController {
    private connection;
    private paymentService;
    private channelService;
    constructor(connection: TransactionalConnection, paymentService: PaymentService, channelService: ChannelService);
    handlePayPalReturn(req: any, token: string, payerId: string, orderCode: string): Promise<{
        url: string;
    }>;
}
export declare class PayPalReturnPlugin {
}
//# sourceMappingURL=paypal-return-plugin.d.ts.map