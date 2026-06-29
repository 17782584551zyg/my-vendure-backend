import { OrderService, PaymentService, OrderStateMachine } from '@vendure/core';
export declare class PayPalReturnController {
    private orderService;
    private paymentService;
    private orderStateMachine;
    constructor(orderService: OrderService, paymentService: PaymentService, orderStateMachine: OrderStateMachine);
    handlePayPalReturn(token: string, payerId: string, orderCode: string): Promise<{
        url: string;
    }>;
}
export declare class PayPalReturnPlugin {
}
//# sourceMappingURL=paypal-return-plugin.d.ts.map