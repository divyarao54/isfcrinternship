const Queue = require('bull');
require('dotenv').config();

// Create queue instance
const scrapingQueue = new Queue('scraping-queue', {
  redis: {
    host: 'localhost',
    port: 6379
  }
});

async function cleanQueue() {
  try {
    console.log('\n=== Cleaning Queue ===');
    
    // Get all jobs in different states
    const activeJobs = await scrapingQueue.getActive();
    const waitingJobs = await scrapingQueue.getWaiting();
    const delayedJobs = await scrapingQueue.getDelayed();
    const failedJobs = await scrapingQueue.getFailed();
    const completedJobs = await scrapingQueue.getCompleted();
    
    console.log('\nQueue Status:');
    console.log('-------------');
    console.log(`Active jobs: ${activeJobs.length}`);
    console.log(`Waiting jobs: ${waitingJobs.length}`);
    console.log(`Delayed jobs: ${delayedJobs.length}`);
    console.log(`Failed jobs: ${failedJobs.length}`);
    console.log(`Completed jobs: ${completedJobs.length}`);
    
    // Clean up active jobs
    if (activeJobs.length > 0) {
      console.log('\nCleaning active jobs...');
      for (const job of activeJobs) {
        try {
          console.log(`\nProcessing job ${job.id}:`);
          console.log(`Started at: ${new Date(job.timestamp).toISOString()}`);
          console.log(`Age: ${Math.round((Date.now() - job.timestamp) / 1000)}s`);
          
          // First try to move to failed state
          try {
            await job.moveToFailed(new Error('Job cleaned up by admin'), true);
            console.log(`Moved job ${job.id} to failed state`);
          } catch (error) {
            console.log(`Could not move job ${job.id} to failed state: ${error.message}`);
          }
          
          // Then try to remove the job
          try {
            await job.remove();
            console.log(`Removed job ${job.id}`);
          } catch (error) {
            console.log(`Could not remove job ${job.id}: ${error.message}`);
            
            // If removal fails, try to unlock the job first
            try {
              await job.takeLock();
              console.log(`Took lock for job ${job.id}`);
              await job.remove();
              console.log(`Removed job ${job.id} after taking lock`);
            } catch (lockError) {
              console.log(`Could not take lock for job ${job.id}: ${lockError.message}`);
            }
          }
        } catch (error) {
          console.error(`Error cleaning job ${job.id}:`, error.message);
        }
      }
    }
    
    // Clean up waiting jobs
    if (waitingJobs.length > 0) {
      console.log('\nCleaning waiting jobs...');
      for (const job of waitingJobs) {
        try {
          await job.remove();
          console.log(`Removed waiting job ${job.id}`);
        } catch (error) {
          console.error(`Error removing waiting job ${job.id}:`, error.message);
        }
      }
    }
    
    // Clean up delayed jobs
    if (delayedJobs.length > 0) {
      console.log('\nCleaning delayed jobs...');
      for (const job of delayedJobs) {
        try {
          await job.remove();
          console.log(`Removed delayed job ${job.id}`);
        } catch (error) {
          console.error(`Error removing delayed job ${job.id}:`, error.message);
        }
      }
    }
    
    // Clean up failed jobs
    if (failedJobs.length > 0) {
      console.log('\nCleaning failed jobs...');
      for (const job of failedJobs) {
        try {
          await job.remove();
          console.log(`Removed failed job ${job.id}`);
        } catch (error) {
          console.error(`Error removing failed job ${job.id}:`, error.message);
        }
      }
    }
    
    // Clean up completed jobs
    if (completedJobs.length > 5) {
      console.log('\nCleaning completed jobs...');
      for (const job of completedJobs) {
        try {
          await job.remove();
          console.log(`Removed completed job ${job.id}`);
        } catch (error) {
          console.error(`Error removing completed job ${job.id}:`, error.message);
        }
      }
    }
    
    // Finally, try to clean the queue using Bull's clean method
    try {
      await scrapingQueue.clean(0, 'completed');
      await scrapingQueue.clean(0, 'failed');
      await scrapingQueue.clean(0, 'delayed');
      await scrapingQueue.clean(0, 'wait');
      await scrapingQueue.clean(0, 'active');
      console.log('\nQueue cleaned using Bull clean method');
    } catch (error) {
      console.error('Error cleaning queue with Bull clean method:', error.message);
    }
    
    console.log('\n=== Queue Cleanup Complete ===');
  } catch (error) {
    console.error('Error during queue cleanup:', error);
  } finally {
    // Close the queue connection
    await scrapingQueue.close();
  }
}

// Run the cleanup
cleanQueue().catch(console.error); 