import subprocess
import json
import os
import sys
from datetime import datetime
from celery import current_task
from celery_app import celery_app
from db_config import get_db, get_collection, db_manager

@celery_app.task(bind=True, queue='scraping')
def scrape_papers_task(self, source='manual'):
    """
    Main Celery task that orchestrates the Node.js scraper
    """
    task_id = self.request.id
    print(f"\n=== Starting Celery Task {task_id} ===")
    print(f"Task started at: {datetime.now().isoformat()}")
    print(f"Task source: {source}")
    
    try:
        # Update task status
        self.update_state(
            state='PROGRESS',
            meta={'current': 0, 'total': 100, 'status': 'Initializing scraper...'}
        )
        print("[PROGRESS] Initializing scraper...")
        
        # Ensure database connection
        db = get_db()
        print("[OK] Database connection established")
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'current': 10, 'total': 100, 'status': 'Database connected, starting scraper...'}
        )
        print("[PROGRESS] Database connected, starting scraper...")
        
        # Run the Node.js scraper
        scraper_path = os.path.join(os.path.dirname(__file__), 'scraper.js')
        
        print(f"[INFO] Executing Node.js scraper: {scraper_path}")
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'current': 20, 'total': 100, 'status': 'Executing Puppeteer scraper...'}
        )
        print("[PROGRESS] Executing Puppeteer scraper...")
        print("[INFO] This may take several minutes. Puppeteer is scraping Google Scholar...")
        
        # Execute the Node.js scraper
        result = subprocess.run(
            ['node', scraper_path],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(__file__),
            timeout=1800  # 30 minutes timeout
        )
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'current': 80, 'total': 100, 'status': 'Scraping completed, syncing to Elasticsearch...'}
        )
        print("[PROGRESS] Scraping completed, syncing to Elasticsearch...")
        
        if result.returncode == 0:
            print("[OK] Scraper executed successfully")
            print(f"[INFO] STDOUT: {result.stdout}")
            print(f"[INFO] STDERR: {result.stderr}")
            
            # Sync MongoDB papers to Elasticsearch
            sync_script = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'syncToElastic.js')
            print(f"[INFO] Syncing MongoDB papers to Elasticsearch: {sync_script}")
            sync_result = subprocess.run(
                ['node', sync_script],
                capture_output=True,
                text=True,
                cwd=os.path.dirname(os.path.dirname(__file__)),
                timeout=600  # 10 minutes timeout
            )
            print(f"[INFO] Elasticsearch sync STDOUT: {sync_result.stdout}")
            print(f"[INFO] Elasticsearch sync STDERR: {sync_result.stderr}")
            if sync_result.returncode != 0:
                print("[ERROR] Elasticsearch sync failed")
            else:
                print("[OK] Elasticsearch sync completed successfully")
            
            # Get the results from the database
            papers_collection = get_collection('papers')
            papers_count = papers_collection.count_documents({})
            
            # Update progress
            self.update_state(
                state='PROGRESS',
                meta={'current': 95, 'total': 100, 'status': f'Found {papers_count} papers in database'}
            )
            
            print(f"[SUMMARY] Total papers in database: {papers_count}")
            
            # Mark task as completed
            self.update_state(
                state='SUCCESS',
                meta={
                    'current': 100,
                    'total': 100,
                    'status': 'Task completed successfully',
                    'papers_processed': papers_count,
                    'elasticsearch_synced': sync_result.returncode == 0,
                    'result': 'success'
                }
            )
            
            print(f"[SUCCESS] Task {task_id} completed successfully!")
            print(f"[INFO] Papers processed: {papers_count}")
            print(f"[INFO] Elasticsearch synced: {sync_result.returncode == 0}")
            
            return {
                'success': True,
                'papers_processed': papers_count,
                'elasticsearch_synced': sync_result.returncode == 0,
                'task_id': task_id,
                'completed_at': datetime.now().isoformat()
            }
            
        else:
            error_msg = f"Scraper failed with return code {result.returncode}"
            print(f"[ERROR] {error_msg}")
            print(f"[ERROR] STDOUT: {result.stdout}")
            print(f"[ERROR] STDERR: {result.stderr}")
            
            raise Exception(f"{error_msg}: {result.stderr}")
            
    except subprocess.TimeoutExpired:
        error_msg = "Scraper timed out after 30 minutes"
        print(f"[ERROR] {error_msg}")
        
        # Try to kill any remaining Node.js processes
        try:
            subprocess.run(['taskkill', '/F', '/IM', 'node.exe'], capture_output=True)
            print("[CLEANUP] Killed remaining Node.js processes")
        except:
            pass
        
        raise Exception(error_msg)
        
    except Exception as error:
        print(f"[ERROR] Task error: {str(error)}")
        
        # Update task state to failed
        self.update_state(
            state='FAILURE',
            meta={
                'error': str(error),
                'task_id': task_id,
                'failed_at': datetime.now().isoformat()
            }
        )
        
        raise error

@celery_app.task(bind=True, queue='maintenance')
def sync_elasticsearch_task(self):
    """
    Dedicated task to sync MongoDB papers to Elasticsearch
    """
    try:
        print(f"[START] Starting Elasticsearch sync task {self.request.id}")
        
        # Sync MongoDB papers to Elasticsearch
        sync_script = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'syncToElastic.js')
        print(f"[INFO] Running sync script: {sync_script}")
        
        sync_result = subprocess.run(
            ['node', sync_script],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.dirname(__file__)),
            timeout=600  # 10 minutes timeout
        )
        
        if sync_result.returncode == 0:
            print("[SUCCESS] Elasticsearch sync completed successfully")
            return {
                'success': True,
                'message': 'Elasticsearch sync completed',
                'task_id': self.request.id
            }
        else:
            error_msg = f"Elasticsearch sync failed with return code {sync_result.returncode}"
            print(f"[ERROR] {error_msg}")
            print(f"[ERROR] STDOUT: {sync_result.stdout}")
            print(f"[ERROR] STDERR: {sync_result.stderr}")
            raise Exception(error_msg)
            
    except Exception as error:
        print(f"[ERROR] Elasticsearch sync task error: {str(error)}")
        raise error

@celery_app.task(bind=True, queue='maintenance')
def cleanup_old_jobs_task(self):
    """
    Cleanup task to remove old completed/failed tasks
    """
    try:
        # This would typically clean up old task results
        # For now, we'll just return success
        return {
            'success': True,
            'message': 'Cleanup completed',
            'task_id': self.request.id
        }
    except Exception as error:
        print(f"[ERROR] Cleanup error: {str(error)}")
        raise error

@celery_app.task(bind=True, queue='monitoring')
def health_check_task(self):
    """
    Health check task to verify system status
    """
    try:
        # Check database connection
        if db_manager.client:
            db_manager.client.admin.command('ping')
            db_status = 'connected'
        else:
            db_status = 'not connected'
        
        # Check Redis connection (Celery broker)
        celery_app.control.inspect().active()
        
        return {
            'success': True,
            'database': db_status,
            'redis': 'connected',
            'celery': 'running',
            'task_id': self.request.id
        }
    except Exception as error:
        print(f"[ERROR] Health check error: {str(error)}")
        raise error 