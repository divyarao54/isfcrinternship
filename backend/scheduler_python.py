import os
import time
import signal
import sys
import json
from datetime import datetime, timedelta
from celery.schedules import crontab
from celery_app import celery_app
from tasks import scrape_papers_task, cleanup_old_jobs_task, health_check_task
from db_config import get_db, db_manager

class CeleryScheduler:
    def __init__(self):
        self.is_running = False
        self.current_task = None
        
    def setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown"""
        def signal_handler(signum, frame):
            print("[OK] Received signal " + str(signum) + ", shutting down gracefully...")
            self.shutdown()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    def setup_periodic_tasks(self):
        """Setup periodic tasks using Celery Beat"""
        celery_app.conf.beat_schedule = {
            'scrape-papers-daily': {
                'task': 'tasks.scrape_papers_task',
                'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
                'args': ('scheduled',),
                'options': {'queue': 'scraping'}
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
    
    def trigger_manual_scraping(self, source='manual'):
        """Trigger a manual scraping job"""
        try:
            print(f"\n[START] Triggering manual scraping job (source: {source})")
            print(f"[INFO] Task will be queued and processed by Celery worker")
            
            # Check if there's already an active task
            active_tasks = celery_app.control.inspect().active()
            if active_tasks:
                for worker, tasks in active_tasks.items():
                    for task in tasks:
                        if task['name'] == 'tasks.scrape_papers_task':
                            print(f"[WARNING] Active scraping task found: {task['id']}")
                            print(f"[INFO] Task status: {task.get('state', 'unknown')}")
                            return {
                                'success': False,
                                'message': 'Active scraping task already running',
                                'task_id': task['id']
                            }
            
            print("[INFO] No active scraping tasks found, creating new task...")
            
            # Start new task
            task = scrape_papers_task.delay(source)
            print(f"[OK] Manual scraping task started: {task.id}")
            print(f"[INFO] Task queued successfully. Worker will pick it up shortly.")
            print(f"[INFO] You can monitor progress with: python scheduler_python.py status {task.id}")
            
            return {
                'success': True,
                'message': 'Manual scraping task started',
                'task_id': task.id
            }
            
        except Exception as error:
            print(f"[ERROR] Error triggering manual scraping: {str(error)}")
            return {
                'success': False,
                'message': 'Error: ' + str(error)
            }
    
    def get_task_status(self, task_id):
        """Get the status of a specific task"""
        try:
            task_result = celery_app.AsyncResult(task_id)
            
            # Handle the result safely
            result = None
            if task_result.ready():
                try:
                    result = task_result.result
                    # Convert non-serializable objects to strings
                    if isinstance(result, Exception):
                        result = str(result)
                except Exception:
                    result = "Error retrieving result"
            
            # Handle info safely
            info = None
            if hasattr(task_result, 'info') and task_result.info:
                try:
                    info = task_result.info
                    # Convert non-serializable objects to strings
                    if isinstance(info, Exception):
                        info = str(info)
                except Exception:
                    info = "Error retrieving info"
            
            return {
                'task_id': task_id,
                'status': task_result.status,
                'result': result,
                'info': info
            }
        except Exception as error:
            return {
                'task_id': task_id,
                'status': 'ERROR',
                'error': str(error)
            }
    
    def get_active_tasks(self):
        """Get all active tasks"""
        try:
            active_tasks = celery_app.control.inspect().active()
            return active_tasks
        except Exception as error:
            print("[ERROR] Error getting active tasks: " + str(error))
            return {}
    
    def terminate_task(self, task_id):
        """Terminate a specific task"""
        try:
            celery_app.control.revoke(task_id, terminate=True)
            print("[OK] Task " + task_id + " terminated")
            return {
                'success': True,
                'message': 'Task ' + task_id + ' terminated',
                'task_id': task_id
            }
        except Exception as error:
            print("[ERROR] Error terminating task " + task_id + ": " + str(error))
            return {
                'success': False,
                'message': 'Error: ' + str(error),
                'task_id': task_id
            }
    
    def cleanup_stuck_tasks(self):
        """Cleanup stuck or failed tasks"""
        try:
            # Get all task results
            i = celery_app.control.inspect()
            
            # Revoke all active tasks
            active_tasks = i.active()
            if active_tasks:
                for worker, tasks in active_tasks.items():
                    for task in tasks:
                        celery_app.control.revoke(task['id'], terminate=True)
                        print("[CLEANUP] Revoked active task: " + task['id'])
            
            # Revoke all reserved tasks
            reserved_tasks = i.reserved()
            if reserved_tasks:
                for worker, tasks in reserved_tasks.items():
                    for task in tasks:
                        celery_app.control.revoke(task['id'])
                        print("[CLEANUP] Revoked reserved task: " + task['id'])
            
            print("[OK] Cleanup completed")
            return {
                'success': True,
                'message': 'Cleanup completed'
            }
            
        except Exception as error:
            print("[ERROR] Error during cleanup: " + str(error))
            return {
                'success': False,
                'message': 'Error: ' + str(error)
            }
    
    def check_system_health(self):
        """Check the overall system health"""
        try:
            # Always try to connect if not already connected
            from db_config import db_manager
            if not db_manager.client:
                db_manager.connect()
            db_manager.client.admin.command('ping')
            db_status = 'connected'
        except Exception as error:
            db_status = 'error: ' + str(error)
        
        # Check Redis
        try:
            celery_app.control.inspect().active()
            redis_status = 'connected'
        except Exception as error:
            redis_status = 'error: ' + str(error)
        
        # Check Celery workers
        try:
            workers = celery_app.control.inspect().active()
            worker_status = 'running' if workers else 'no workers'
        except Exception as error:
            worker_status = 'error: ' + str(error)
        
        return {
            'timestamp': datetime.now().isoformat(),
            'database': db_status,
            'redis': redis_status,
            'celery_workers': worker_status,
            'overall_status': 'healthy' if all('error' not in status for status in [db_status, redis_status, worker_status]) else 'unhealthy'
        }
    
    def start(self):
        """Start the scheduler"""
        try:
            print("[START] Starting Celery Scheduler...")
            self.is_running = True
            self.setup_signal_handlers()
            self.setup_periodic_tasks()
            
            print("[OK] Scheduler started successfully")
            print("[SCHEDULE] Periodic tasks configured:")
            print("   - Daily scraping at 2:00 AM")
            print("   - Cleanup at 3:00 AM")
            print("   - Health check every 15 minutes")
            
            # Keep the scheduler running
            while self.is_running:
                time.sleep(1)
                
        except Exception as error:
            print("[ERROR] Error starting scheduler: " + str(error))
            self.shutdown()
    
    def shutdown(self):
        """Shutdown the scheduler gracefully"""
        print("[SHUTDOWN] Shutting down scheduler...")
        self.is_running = False
        
        # Revoke all active tasks
        try:
            self.cleanup_stuck_tasks()
        except:
            pass
        
        print("[OK] Scheduler shutdown complete")

# Global scheduler instance
scheduler = CeleryScheduler()

def main():
    """Main function to run the scheduler"""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'start':
            scheduler.start()
        elif command == 'trigger':
            source = sys.argv[2] if len(sys.argv) > 2 else 'manual'
            result = scheduler.trigger_manual_scraping(source)
            print(json.dumps(result, indent=2))
        elif command == 'status':
            task_id = sys.argv[2] if len(sys.argv) > 2 else None
            if task_id:
                result = scheduler.get_task_status(task_id)
                print(json.dumps(result, indent=2))
            else:
                result = scheduler.get_active_tasks()
                print(json.dumps(result, indent=2))
        elif command == 'terminate':
            task_id = sys.argv[2] if len(sys.argv) > 2 else None
            if task_id:
                result = scheduler.terminate_task(task_id)
                print(json.dumps(result, indent=2))
            else:
                print("Please provide a task ID")
        elif command == 'cleanup':
            result = scheduler.cleanup_stuck_tasks()
            print(json.dumps(result, indent=2))
        elif command == 'health':
            result = scheduler.check_system_health()
            print(json.dumps(result, indent=2))
        else:
            print("Unknown command. Available commands: start, trigger, status, terminate, cleanup, health")
    else:
        print("Usage: python scheduler_python.py [command]")
        print("Commands:")
        print("  start     - Start the scheduler")
        print("  trigger   - Trigger manual scraping")
        print("  status    - Get task status")
        print("  terminate - Terminate a task")
        print("  cleanup   - Cleanup stuck tasks")
        print("  health    - Check system health")

if __name__ == '__main__':
    main() 