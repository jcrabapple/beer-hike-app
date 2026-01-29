import cron from 'node-cron';
import { syncAllData } from './sync.js';

export function startScheduler() {
  // Run data sync every day at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Running scheduled data sync...');
    await syncAllData();
  });

  console.log('Scheduler started');
}
