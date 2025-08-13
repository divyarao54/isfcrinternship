const Queue = require('bull');
require('dotenv').config();

async function checkQueue() {
  // Create a Bull queue instance
  const scrapingQueue = new Queue('scraping-queue', {
    redis: {
      host: 'localhost',
      port: 6379
    }
  });

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