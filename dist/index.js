"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@vendure/core");
const vendure_config_1 = require("./vendure-config");
async function start() {
    const app = await (0, core_1.bootstrap)(vendure_config_1.config);
    const jobQueueService = app.get(core_1.JobQueueService);
    jobQueueService.start();
    const orderService = app.get(core_1.OrderService);
    const paymentService = app.get(core_1.PaymentService);
    const requestContextService = app.get(core_1.RequestContextService);
    (0, vendure_config_1.initPayPalServices)(orderService, paymentService, requestContextService);
    console.log('');
    console.log('Vendure server is now running!');
    console.log('Shop API: http://localhost:3002/shop-api');
    console.log('Admin API: http://localhost:3002/admin-api');
    console.log('Admin UI: http://localhost:3002/admin');
    console.log('Admin credentials: superadmin / superadmin');
    console.log('');
    console.log('JobQueue is running - background jobs will be processed');
    console.log('PayPal return middleware is ready');
}
start().catch(err => {
    console.error('Failed to start Vendure:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map