#!/usr/bin/env python3
"""
Test script to verify Celery backend setup
"""

import os
import sys
import time
import subprocess
from dotenv import load_dotenv

load_dotenv()

def test_imports():
    """Test if all required modules can be imported"""
    print("[CHECK] Testing imports...")
    
    try:
        from celery_app import celery_app
        print("[OK] celery_app imported successfully")
    except ImportError as e:
        print("[ERROR] Failed to import celery_app: " + str(e))
        return False
    
    try:
        from tasks import scrape_papers_task, cleanup_old_jobs_task, health_check_task
        print("[OK] tasks imported successfully")
    except ImportError as e:
        print("[ERROR] Failed to import tasks: " + str(e))
        return False
    
    try:
        from db_config import get_db, get_collection
        print("[OK] db_config imported successfully")
    except ImportError as e:
        print("[ERROR] Failed to import db_config: " + str(e))
        return False
    
    try:
        from scheduler_python import scheduler
        print("[OK] scheduler imported successfully")
    except ImportError as e:
        print("[ERROR] Failed to import scheduler: " + str(e))
        return False
    
    return True

def test_database_connection():
    """Test database connection"""
    print("[CHECK] Testing database connection...")
    
    try:
        from db_config import get_db
        db = get_db()
        db.admin.command('ping')
        print("[OK] Database connection successful")
        return True
    except Exception as e:
        print("[ERROR] Database connection failed: " + str(e))
        return False

def test_redis_connection():
    """Test Redis connection"""
    print("[CHECK] Testing Redis connection...")
    
    try:
        import redis
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        r = redis.from_url(redis_url)
        r.ping()
        print("[OK] Redis connection successful")
        return True
    except Exception as e:
        print("[ERROR] Redis connection failed: " + str(e))
        return False

def test_node_scraper():
    """Test if Node.js scraper can be executed"""
    print("[CHECK] Testing Node.js scraper...")
    
    try:
        # Check if scraper.js exists
        scraper_path = os.path.join(os.path.dirname(__file__), 'scraper.js')
        if not os.path.exists(scraper_path):
            print("[ERROR] scraper.js not found")
            return False
        
        # Check if Node.js is available
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode != 0:
            print("[ERROR] Node.js not available")
            return False
        
        print("[OK] Node.js version: " + result.stdout.strip())
        print("[OK] scraper.js found")
        return True
        
    except Exception as e:
        print("[ERROR] Node.js scraper test failed: " + str(e))
        return False

def test_celery_app():
    """Test Celery application"""
    print("[CHECK] Testing Celery application...")
    
    try:
        from celery_app import celery_app
        
        # Test basic Celery functionality
        app_name = celery_app.main
        print("[OK] Celery app name: " + str(app_name))
        
        # Test broker connection
        celery_app.control.inspect().active()
        print("[OK] Celery broker connection successful")
        
        return True
        
    except Exception as e:
        print("[ERROR] Celery application test failed: " + str(e))
        return False

def test_scheduler():
    """Test scheduler functionality"""
    print("[CHECK] Testing scheduler...")
    
    try:
        from scheduler_python import scheduler
        
        # Test health check
        health = scheduler.check_system_health()
        print("[OK] Health check successful: " + str(health['overall_status']))
        
        return True
        
    except Exception as e:
        print("[ERROR] Scheduler test failed: " + str(e))
        return False

def test_api_server():
    """Test API server imports"""
    print("[CHECK] Testing API server...")
    
    try:
        from api_server import app
        print("[OK] Flask app imported successfully")
        
        # Test basic route
        with app.test_client() as client:
            response = client.get('/health')
            if response.status_code == 200:
                print("[OK] Health endpoint accessible")
            else:
                print("[WARNING] Health endpoint returned status " + str(response.status_code))
        
        return True
        
    except Exception as e:
        print("[ERROR] API server test failed: " + str(e))
        return False

def main():
    """Run all tests"""
    print("[START] Starting Celery Backend Setup Tests")
    
    tests = [
        ("Imports", test_imports),
        ("Database Connection", test_database_connection),
        ("Redis Connection", test_redis_connection),
        ("Node.js Scraper", test_node_scraper),
        ("Celery Application", test_celery_app),
        ("Scheduler", test_scheduler),
        ("API Server", test_api_server)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                print("[ERROR] " + test_name + " test failed")
        except Exception as e:
            print("[ERROR] " + test_name + " test failed with exception: " + str(e))
    
    print("[SUMMARY] Test Results: " + str(passed) + "/" + str(total) + " tests passed")
    
    if passed == total:
        print("[SUCCESS] All tests passed! Your Celery backend is ready to use.")
        print("[INFO] Next steps:")
        print("1. Start Redis server: redis-server")
        print("2. Start MongoDB server")
        print("3. Run: python start_celery.py")
    else:
        print("[WARNING] Some tests failed. Please check the errors above.")
        print("[FIX] Common fixes:")
        print("1. Install missing dependencies: pip install -r requirements.txt")
        print("2. Start Redis server: redis-server")
        print("3. Start MongoDB server")
        print("4. Check .env file configuration")
    
    return passed == total

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1) 