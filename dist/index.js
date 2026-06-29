"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@vendure/core");
const vendure_config_1 = require("./vendure-config");
async function start() {
    const app = await (0, core_1.bootstrap)(vendure_config_1.config);
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', 1);
    const jobQueueService = app.get(core_1.JobQueueService);
    jobQueueService.start();
    console.log('');
    console.log('Vendure server is now running!');
    console.log('Shop API: http://localhost:3002/shop-api');
    console.log('Admin API: http://localhost:3002/admin-api');
    console.log('Admin UI: http://localhost:3002/admin');
    console.log('Admin credentials: superadmin / superadmin');
    console.log('');
    console.log('JobQueue is running - background jobs will be processed');
}
start().catch(err => {
    console.error('Failed to start Vendure:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map