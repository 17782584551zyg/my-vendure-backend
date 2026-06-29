import { bootstrap, JobQueueService } from '@vendure/core';
import { config, initPayPalServices } from './vendure-config';

async function start() {
  const app = await bootstrap(config);
  
  const jobQueueService = app.get(JobQueueService);
  jobQueueService.start();
  
  const orderService = app.get('OrderService');
  const paymentService = app.get('PaymentService');
  initPayPalServices(orderService, paymentService);
  
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