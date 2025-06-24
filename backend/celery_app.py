from celery import Celery
import os
from dotenv import load_dotenv
from celery.schedules import crontab

# Load environment variables
load_dotenv()

# Create Celery instance
celery_app = Celery(
    'scraping_tasks',
    broker=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    include=['tasks']
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1,
    worker_disable_rate_limits=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_always_eager=False,
    result_expires=3600,  # 1 hour
    worker_send_task_events=True,
    task_send_sent_event=True,
)

celery_app.conf.beat_schedule = {
    'scrape-papers-every-2-minutes': {
        'task': 'tasks.scrape_papers_task',
        'schedule': 120.0,  # Every 2 minutes
        'args': ('scheduled',),
        'options': {'queue': 'scraping'}
    },
    'sync-elasticsearch-daily': {
        'task': 'tasks.sync_elasticsearch_task',
        'schedule': crontab(hour=4, minute=0),  # Daily at 4 AM
        'options': {'queue': 'maintenance'}
    },
    'cleanup-old-jobs': {
        'task': 'tasks.cleanup_old_jobs_task',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3 AM
        'options': {'queue': 'maintenance'}
    },
    'health-check': {
        'task': 'tasks.health_check_task',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
        'options': {'queue': 'monitoring'}
    }
}

if __name__ == '__main__':
    celery_app.start() 