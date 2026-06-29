import { OrderService, PaymentService, ChannelService } from '@vendure/core';
export declare class PayPalReturnController {
    private orderService;
    private paymentService;
    private channelService;
    constructor(orderService: OrderService, paymentService: PaymentService, channelService: ChannelService);
    handlePayPalReturn(req: any, token: string, payerId: string, orderCode: string): Promise<{
        url: string;
    }>;
}
export declare class PayPalReturnPlugin {
}
//# sourceMappingURL=paypal-return-plugin.d.ts.map