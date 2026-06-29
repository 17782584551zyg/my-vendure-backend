import { OrderService, PaymentService } from '@vendure/core';
export declare class PayPalReturnController {
    private readonly orderService;
    private readonly paymentService;
    constructor(orderService: OrderService, paymentService: PaymentService);
    handleReturn(token: string, orderCode: string): Promise<{
        url: string;
    }>;
}
//# sourceMappingURL=paypal-return-controller.d.ts.map