const Queue = require('bull');
require('dotenv').config();

async function checkQueue() {
  // Create a Bull queue instance supporting URL or host/port/password
  const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || '';
  const REDIS_HOST = process.env.REDIS_HOST;
  const REDIS_PORT = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined;
  const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
  const REDIS_TLS = (process.env.REDIS_TLS || process.env.REDIS_USE_TLS || '').toString().toLowerCase() === 'true';

  const queueOptions = REDIS_URL
    ? REDIS_URL
    : {
        redis: {
          host: REDIS_HOST || '127.0.0.1',
          port: REDIS_PORT || 6379,
          password: REDIS_PASSWORD,
          tls: REDIS_TLS ? { rejectUnauthorized: false } : undefined,
        },
      };

  const scrapingQueue = new Queue('scraping-queue', queueOptions);

  try {
    // Get queue information
    const jobCounts = await scrapingQueue.getJobCounts();
    console.log('Queue Status:');
    console.log('-------------');
    console.log('Waiting jobs:', jobCounts.waiting);
    console.log('Active jobs:', jobCounts.active);
    console.log('Completed jobs:', jobCounts.completed);
    console.log('Failed jobs:', jobCounts.failed);
    console.log('Delayed jobs:', jobCounts.delayed);

    // Get failed jobs
    const failedJobs = await scrapingQueue.getFailed();
    if (failedJobs.length > 0) {
      console.log('\nFailed Jobs Details:');
      console.log('-------------------');
      for (const job of failedJobs) {
        console.log(`Job ID: ${job.id}`);
        console.log(`Failed at: ${job.failedReason}`);
        console.log(`Attempts made: ${job.attemptsMade}`);
        console.log('-------------------');
      }
    }

    // Get active jobs
    const activeJobs = await scrapingQueue.getActive();
    if (activeJobs.length > 0) {
      console.log('\nActive Jobs Details:');
      console.log('-------------------');
      for (const job of activeJobs) {
        console.log(`Job ID: ${job.id}`);
        console.log(`Started at: ${job.processedOn}`);
        console.log(`Attempt: ${job.attemptsMade}`);
        console.log('-------------------');
      }
    }

    // Get waiting jobs
    const waitingJobs = await scrapingQueue.getWaiting();
    if (waitingJobs.length > 0) {
      console.log('\nWaiting Jobs Details:');
      console.log('-------------------');
      for (const job of waitingJobs) {
        console.log(`Job ID: ${job.id}`);
        console.log(`Added at: ${job.timestamp}`);
        console.log('-------------------');
      }
    }

    // Close the queue connection
    await scrapingQueue.close();
  } catch (error) {
    console.error('Error checking queue:', error);
  }
}

checkQueue(); 