const Bull = require('bull');
const Redis = require('ioredis');
const { MongoClient } = require('mongodb');
const subprocess = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

// Prefer a single connection URL (works for Redis Cloud/Upstash/Railway Redis)
const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || 'redis://127.0.0.1:6379';
const redis = new Redis(REDIS_URL);
const LAST_JOB_KEY = 'scrape:lastJobStart';
const INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 1 month (30 days)
const CHECK_INTERVAL_MS = 60 * 1000; // Check every 1 minute
const LOG_INTERVAL_MS = 5 * 60 * 1000; // Log every 5 minutes

// MongoDB connection - use environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/research_papers';
const DB_NAME = 'research_papers';

// Create a Bull queue for scraping jobs
// Bull accepts a Redis connection string directly
const scrapeQueue = new Bull('scrape-queue', REDIS_URL);

// Function to create a temp file path
function createTempFilePath(prefix) {
  return path.join(os.tmpdir(), `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
}

// Function to run update all logic (same as admin page)
async function runUpdateAll() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const teachersCollection = db.collection('teachers');
    
    // Get all teachers
    const teachers = await teachersCollection.find({}, { profileUrl: 1, name: 1 }).toArray();
    
    if (teachers.length === 0) {
      console.log('[SCHEDULER] No teachers found in database');
      return;
    }
    
    console.log(`[SCHEDULER] Found ${teachers.length} teachers to process`);
    
    const results = [];
    
    // Process each teacher
    for (let idx = 0; idx < teachers.length; idx++) {
      const teacher = teachers[idx];
      const profileUrl = teacher.profileUrl;
      const name = teacher.name;
      
      if (!profileUrl) {
        console.log(`[SCHEDULER] No Google Scholar URL for ${name}, skipping...`);
        continue;
      }
      
      console.log(`[SCHEDULER] Processing teacher ${idx + 1}/${teachers.length}: ${name}`);
      console.log(`[SCHEDULER] Profile URL: ${profileUrl}`);
      
      // Create temp file paths for output
      const stdoutPath = createTempFilePath('stdout');
      const stderrPath = createTempFilePath('stderr');
      const stdoutStream = fs.createWriteStream(stdoutPath);
      const stderrStream = fs.createWriteStream(stderrPath);
      
      console.log(`[SCHEDULER] Starting scraper process for ${name}...`);
      
      try {
        // Run scraper.js for this teacher
        console.log('Spawning scraper process:', 'node', ['scraper.js', profileUrl], 'cwd:', __dirname);
        const scraperProcess = subprocess.spawn('node', ['scraper.js', profileUrl], {
          cwd: __dirname,
          stdio: ['ignore', 'pipe', 'pipe'], // Use pipes instead of file descriptors for Windows compatibility
          env: { ...process.env, PYTHONIOENCODING: 'utf-8', NODE_OPTIONS: '--max-old-space-size=8192' }
        });
        
        // Check if process started successfully
        if (!scraperProcess.pid) {
          console.log(`[SCHEDULER] Failed to start process for ${name}`);
          results.push({
            teacher: name,
            profileUrl: profileUrl,
            return_code: -1,
            stdout: '',
            stderr: 'Failed to start process'
          });
          continue;
        }
        
        console.log(`[SCHEDULER] Process started for ${name} with PID: ${scraperProcess.pid}`);
        
        // Collect output DURING process execution to avoid deadlocks
        let stdout = '';
        let stderr = '';
        
        scraperProcess.stdout.on('data', (data) => {
          const dataStr = data.toString();
          stdout += dataStr;
          stdoutStream.write(data);
        });
        
        scraperProcess.stderr.on('data', (data) => {
          const dataStr = data.toString();
          stderr += dataStr;
          stderrStream.write(data);
        });
        
        // Wait for process to complete with timeout
        const returnCode = await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.log(`[SCHEDULER] Timeout reached for ${name}, killing process...`);
            scraperProcess.kill();
            resolve(-1);
          }, 1800000); // 30 minute timeout for teachers with many publications
          
          scraperProcess.on('close', (code) => {
            clearTimeout(timeout);
            console.log(`[SCHEDULER] Process for ${name} exited with code: ${code}`);
            resolve(code);
          });
          
          scraperProcess.on('error', (error) => {
            clearTimeout(timeout);
            console.log(`[SCHEDULER] Process error for ${name}: ${error.message}`);
            resolve(-1);
          });
        });
        
        // Close streams after process completes
        stdoutStream.end();
        stderrStream.end();
        
        // Wait a brief moment for streams to finish writing
        await new Promise(resolve => setTimeout(resolve, 100));
        
        results.push({
          teacher: name,
          profileUrl: profileUrl,
          return_code: returnCode,
          stdout: stdout, // Log full stdout
          stderr: stderr  // Log full stderr
        });
        
        if (returnCode === 0) {
          console.log(`[SCHEDULER] Successfully processed ${name}`);
        } else {
          console.log(`[SCHEDULER] Failed to process ${name} (return code: ${returnCode})`);
          console.log(`[SCHEDULER] Full stdout for ${name}:\n${stdout}`);
          console.log(`[SCHEDULER] Full stderr for ${name}:\n${stderr}`);
        }
        
      } catch (error) {
        console.error(`[SCHEDULER] Error processing ${name}:`, error.message);
        results.push({
          teacher: name,
          profileUrl: profileUrl,
          return_code: -1,
          stdout: '',
          stderr: error.message
        });
      } finally {
        // Clean up temp files
        try { fs.unlinkSync(stdoutPath); } catch (e) {}
        try { fs.unlinkSync(stderrPath); } catch (e) {}
      }
    }
    
    // Sync to Elasticsearch
    console.log('[SCHEDULER] Syncing to Elasticsearch...');
    
    const syncStdoutPath = createTempFilePath('sync_stdout');
    const syncStderrPath = createTempFilePath('sync_stderr');
    const syncStdoutStream = fs.createWriteStream(syncStdoutPath);
    const syncStderrStream = fs.createWriteStream(syncStderrPath);
    
    try {
      const syncProcess = subprocess.spawn('node', ['syncToElastic.js'], {
        cwd: path.dirname(__dirname), // Run from root directory
        stdio: ['ignore', 'pipe', 'pipe'], // Use pipes instead of file descriptors for Windows compatibility
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', NODE_OPTIONS: '--max-old-space-size=4096' }
      });
      
      // Collect output DURING sync process execution
      let syncStdout = '';
      let syncStderr = '';
      
      syncProcess.stdout.on('data', (data) => {
        const dataStr = data.toString();
        syncStdout += dataStr;
        syncStdoutStream.write(data);
      });
      
      syncProcess.stderr.on('data', (data) => {
        const dataStr = data.toString();
        syncStderr += dataStr;
        syncStderrStream.write(data);
      });
      
      const syncReturnCode = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          syncProcess.kill();
          resolve(-1);
        }, 300000); // 5 minute timeout
        
        syncProcess.on('close', (code) => {
          clearTimeout(timeout);
          resolve(code);
        });
      });
      
      // Close streams after sync process completes
      syncStdoutStream.end();
      syncStderrStream.end();
      
      // Wait a brief moment for streams to finish writing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (syncReturnCode === 0) {
        console.log('[SCHEDULER] Elasticsearch sync completed successfully');
      } else {
        console.log(`[SCHEDULER] Elasticsearch sync failed (return code: ${syncReturnCode})`);
        console.log(`[SCHEDULER] Sync stdout:\n${syncStdout}`);
        console.log(`[SCHEDULER] Sync stderr:\n${syncStderr}`);
      }
      
    } catch (error) {
      console.error('[SCHEDULER] Error during Elasticsearch sync:', error.message);
    } finally {
      try { fs.unlinkSync(syncStdoutPath); } catch (e) {}
      try { fs.unlinkSync(syncStderrPath); } catch (e) {}
    }
    
    console.log(`[SCHEDULER] Update All completed for ${teachers.length} teachers`);
    
  } catch (error) {
    console.error('[SCHEDULER] Error in runUpdateAll:', error);
  } finally {
    await client.close();
  }
}

// Process the scraping job
scrapeQueue.process(async (job, done) => {
  const now = Date.now();
  await redis.set(LAST_JOB_KEY, now);
  console.log('[BULL] Scraping job started at', new Date(now).toISOString());
  
  try {
    // Run the update all logic (same as admin page)
    console.log('[BULL] Starting Update All process...');
    await runUpdateAll();
    console.log('[BULL] Update All process completed.');
    
    console.log('[BULL] All scraping jobs completed.');
    done();
  } catch (error) {
    console.error('[BULL] Scraping job failed:', error.message || error);
    done(error);
  }
});

// Function to log time remaining until next scraping job
async function logTimeRemaining() {
  const lastJobStart = await redis.get(LAST_JOB_KEY);
  const now = Date.now();
  
  if (!lastJobStart) {
    console.log('[SCHEDULER] No previous job found. Next scraping will start immediately when scheduled.');
    return;
  }
  
  const timeSinceLastJob = now - parseInt(lastJobStart, 10);
  const timeRemaining = INTERVAL_MS - timeSinceLastJob;
  
  if (timeRemaining > 0) {
    const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));
    const hoursRemaining = Math.floor(minutesRemaining / 60);
    const minsRemaining = minutesRemaining % 60;
    
    if (hoursRemaining > 0) {
      console.log(`[SCHEDULER] Next scraping job in ${hoursRemaining}h ${minsRemaining}m`);
    } else {
      console.log(`[SCHEDULER] Next scraping job in ${minsRemaining}m`);
    }
  } else {
    console.log('[SCHEDULER] Ready to schedule next scraping job');
  }
}

// Function to schedule a job if 1 hour has passed since last job start
async function maybeScheduleJob() {
  const lastJobStart = await redis.get(LAST_JOB_KEY);
  const now = Date.now();
  if (!lastJobStart || now - parseInt(lastJobStart, 10) >= INTERVAL_MS) {
    // Check if a job is already waiting or running
    const activeCount = await scrapeQueue.getActiveCount();
    const waitingCount = await scrapeQueue.getWaitingCount();
    if (activeCount === 0 && waitingCount === 0) {
      await scrapeQueue.add({}, { removeOnComplete: true, removeOnFail: true });
      console.log('[BULL] Scheduled a new scraping job at', new Date(now).toISOString());
    }
  }
}

// Clear the queue on startup
scrapeQueue.obliterate({ force: true }).then(() => {
  console.log('[BULL] Queue cleared on startup.');
  //console.log('[SCHEDULER] Using MongoDB URI:', MONGODB_URI);
  
  // On process start, check every minute if a new job should be scheduled
  setInterval(maybeScheduleJob, CHECK_INTERVAL_MS);
  
  // Log time remaining every 5 minutes
  setInterval(logTimeRemaining, LOG_INTERVAL_MS);
  
  // Also check immediately on startup
  maybeScheduleJob();
  
  // Log time remaining immediately on startup
  logTimeRemaining();
});

// Optional: Log job events
scrapeQueue.on('completed', (job) => {
  console.log(`[BULL] Job ${job.id} completed.`);
});

scrapeQueue.on('failed', (job, err) => {
  console.error(`[BULL] Job ${job.id} failed:`, err);
}); 