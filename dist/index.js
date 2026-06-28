"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@vendure/core");
const vendure_config_1 = require("./vendure-config");
async function start() {
    // 启动主服务器
    const app = await (0, core_1.bootstrap)(vendure_config_1.config);
    // 在主进程启动 JobQueue 来处理后台任务
    // 这适用于开发环境，生产环境应该使用单独的 worker 进程
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