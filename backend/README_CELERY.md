# Celery Backend for Research Paper Scraping

This backend has been converted from Bull (Node.js) to Celery (Python) while keeping the Puppeteer scraping code intact. The Python Celery system orchestrates the Node.js scraper.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Flask API     │    │   Celery Beat   │    │   Celery Worker │
│   Server        │    │   Scheduler     │    │                 │
│   (Port 5000)   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │      Redis      │
                    │   (Broker)      │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │    MongoDB      │
                    │   (Database)    │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Node.js Scraper│
                    │  (Puppeteer)    │
                    └─────────────────┘
```

## Prerequisites

1. **Python 3.8+**
2. **Node.js 16+** (for Puppeteer scraper)
3. **Redis Server** (for Celery broker)
4. **MongoDB** (for data storage)

## Installation

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the backend directory:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/research_papers

# Redis
REDIS_URL=redis://localhost:6379/0

# API Server
API_PORT=5000

# Optional: Custom Chrome path for Puppeteer
CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

## Running the System

### Option 1: Start All Components (Recommended)

```bash
python start_celery.py
```

This starts:
- Celery Worker
- Celery Beat Scheduler
- Flask API Server

### Option 2: Start Components Individually

```bash
# Start only Celery worker
python start_celery.py worker

# Start only Celery beat scheduler
python start_celery.py beat

# Start only API server
python start_celery.py api
```

### Option 3: Manual Commands

```bash
# Terminal 1: Start Celery worker
celery -A celery_app worker --loglevel=info --concurrency=1

# Terminal 2: Start Celery beat scheduler
celery -A celery_app beat --loglevel=info

# Terminal 3: Start API server
python api_server.py
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Trigger Manual Scraping
```bash
POST /scrape/trigger
Content-Type: application/json

{
  "source": "manual"
}
```

### Get Task Status
```bash
GET /tasks/status?task_id=<task_id>
```

### Get Active Tasks
```bash
GET /tasks/status
```

### Terminate Task
```bash
POST /tasks/terminate
Content-Type: application/json

{
  "task_id": "<task_id>"
}
```

### Cleanup Stuck Tasks
```bash
POST /tasks/cleanup
```

### Get Papers Count
```bash
GET /papers/count
```

### Get Papers List
```bash
GET /papers?limit=50&skip=0
```

## Scheduler Commands

### Manual Scraping
```bash
python scheduler_python.py trigger manual
```

### Check Task Status
```bash
python scheduler_python.py status <task_id>
```

### Terminate Task
```bash
python scheduler_python.py terminate <task_id>
```

### Cleanup Tasks
```bash
python scheduler_python.py cleanup
```

### Health Check
```bash
python scheduler_python.py health
```

## Scheduled Tasks

The system automatically runs:

- **Daily Scraping**: 2:00 AM every day
- **Cleanup**: 3:00 AM every day  
- **Health Check**: Every 15 minutes

## Monitoring

### Celery Monitoring
```bash
# Monitor Celery workers
celery -A celery_app inspect active

# Monitor Celery stats
celery -A celery_app inspect stats
```

### Redis Monitoring
```bash
# Connect to Redis CLI
redis-cli

# Monitor Redis
MONITOR
```

## Troubleshooting

### Common Issues

1. **Redis Connection Error**
   - Ensure Redis server is running: `redis-server`
   - Check Redis URL in `.env` file

2. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check MongoDB URI in `.env` file

3. **Node.js Scraper Fails**
   - Ensure Node.js dependencies are installed: `npm install`
   - Check Chrome/Chromium installation for Puppeteer

4. **Celery Worker Not Starting**
   - Check Redis connection
   - Ensure all Python dependencies are installed
   - Check for port conflicts

### Logs

- **Celery Worker**: Check terminal output for worker logs
- **Celery Beat**: Check terminal output for scheduler logs
- **API Server**: Check terminal output for API logs
- **Node.js Scraper**: Check terminal output when tasks run

### Debug Mode

To run in debug mode, set environment variable:
```bash
export FLASK_ENV=development
```

## File Structure

```
backend/
├── celery_app.py          # Celery application configuration
├── tasks.py               # Celery task definitions
├── db_config.py           # Database configuration
├── scheduler_python.py    # Python scheduler (replaces scheduler.js)
├── api_server.py          # Flask API server
├── start_celery.py        # Startup script
├── requirements.txt       # Python dependencies
├── package.json           # Node.js dependencies
├── scraper.js             # Puppeteer scraper (unchanged)
├── models/                # MongoDB models (unchanged)
│   ├── Paper.js
│   └── Teacher.js
└── config/                # Configuration files
    └── db.js              # Node.js DB config (unchanged)
```

## Migration from Bull

The main changes from the Bull-based system:

1. **Queue Management**: Bull → Celery
2. **Scheduler**: Node.js cron → Celery Beat
3. **Task Processing**: Bull jobs → Celery tasks
4. **API**: Express → Flask
5. **Database**: Still MongoDB, but accessed via PyMongo

The Puppeteer scraping logic remains unchanged in `scraper.js`.

## Performance

- **Concurrency**: Limited to 1 worker to prevent overwhelming the target sites
- **Timeouts**: 30-minute timeout for scraping tasks
- **Retries**: Automatic retry on failure
- **Memory**: Efficient task cleanup and result expiration

## Security

- Input validation on API endpoints
- Task isolation
- Graceful error handling
- Process monitoring and cleanup 