#!/usr/bin/env python3
"""
Startup script for Celery backend
This script starts the Celery worker and beat scheduler
"""

import os
import sys
import subprocess
import time
import signal
from dotenv import load_dotenv

load_dotenv()

class CeleryStarter:
    def __init__(self):
        self.processes = []
        self.is_running = False
        
    def setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown"""
        def signal_handler(signum, frame):
            print("[OK] Received signal " + str(signum) + ", shutting down gracefully...")
            self.shutdown()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    def start_worker(self):
        """Start Celery worker"""
        print("[START] Starting Celery worker...")
        
        worker_cmd = [
            'celery', '-A', 'celery_app', 'worker',
            '--loglevel=info',
            '--concurrency=1',
            '--queues=scraping,maintenance,monitoring',
            '--hostname=worker1@%h'
        ]
        
        # Add --pool=solo for Windows compatibility
        if os.name == 'nt':
            worker_cmd.append('--pool=solo')
        
        worker_process = subprocess.Popen(
            worker_cmd,
            cwd=os.path.dirname(__file__),
            text=True
        )
        
        self.processes.append(('worker', worker_process))
        print("[OK] Celery worker started with PID: " + str(worker_process.pid))
        return worker_process
    
    def start_beat(self):
        """Start Celery beat scheduler"""
        print("[START] Starting Celery beat scheduler...")
        
        beat_cmd = [
            'celery', '-A', 'celery_app', 'beat',
            '--loglevel=info',
            '--scheduler=celery.beat:PersistentScheduler'
        ]
        
        beat_process = subprocess.Popen(
            beat_cmd,
            cwd=os.path.dirname(__file__),
            text=True
        )
        
        self.processes.append(('beat', beat_process))
        print("[OK] Celery beat scheduler started with PID: " + str(beat_process.pid))
        return beat_process
    
    def start_api_server(self):
        """Start Flask API server"""
        print("[START] Starting Flask API server...")
        
        api_cmd = [
            'python', 'api_server.py'
        ]
        
        api_process = subprocess.Popen(
            api_cmd,
            cwd=os.path.dirname(__file__),
            text=True
        )
        
        self.processes.append(('api', api_process))
        print("[OK] Flask API server started with PID: " + str(api_process.pid))
        return api_process
    
    def check_processes(self):
        """Check if all processes are still running"""
        for name, process in self.processes:
            if process.poll() is not None:
                print("[ERROR] " + name + " process died with return code: " + str(process.returncode))
                return False
        return True
    
    def start_all(self):
        """Start all components"""
        try:
            print("[START] Starting Celery Backend System...")
            self.is_running = True
            self.setup_signal_handlers()
            
            # Start worker
            self.start_worker()
            time.sleep(2)  # Give worker time to start
            
            # Start beat scheduler
            self.start_beat()
            time.sleep(2)  # Give beat time to start
            
            # Start API server
            self.start_api_server()
            time.sleep(2)  # Give API server time to start
            
            print("[OK] All components started successfully!")
            print("[STATUS] System Status:")
            print("   - Celery Worker: Running")
            print("   - Celery Beat Scheduler: Running")
            print("   - Flask API Server: Running on http://localhost:5000")
            print("[INFO] Available API endpoints:")
            print("   - GET  /health - System health check")
            print("   - POST /scrape/trigger - Trigger manual scraping")
            print("   - GET  /tasks/status - Get task status")
            print("   - POST /tasks/terminate - Terminate a task")
            print("   - POST /tasks/cleanup - Cleanup stuck tasks")
            print("   - GET  /papers/count - Get papers count")
            print("   - GET  /papers - Get papers list")
            print("[CLEANUP] Monitoring processes... (Press Ctrl+C to stop)")
            
            # Monitor processes
            while self.is_running and self.check_processes():
                time.sleep(5)
                
        except Exception as error:
            print("[ERROR] Error starting system: " + str(error))
            self.shutdown()
    
    def shutdown(self):
        """Shutdown all processes gracefully"""
        print("[SHUTDOWN] Shutting down Celery Backend System...")
        self.is_running = False
        
        for name, process in self.processes:
            try:
                print("[CLEANUP] Stopping " + name + " process (PID: " + str(process.pid) + ")...")
                process.terminate()
                
                # Wait for graceful shutdown
                try:
                    process.wait(timeout=10)
                    print("[OK] " + name + " process stopped gracefully")
                except subprocess.TimeoutExpired:
                    print("[WARNING] " + name + " process didn't stop gracefully, forcing...")
                    process.kill()
                    process.wait()
                    print("[OK] " + name + " process force stopped")
                    
            except Exception as error:
                print("[ERROR] Error stopping " + name + " process: " + str(error))
        
        print("[OK] All processes stopped")

def main():
    """Main function"""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'worker':
            # Start only worker
            starter = CeleryStarter()
            starter.start_worker()
            try:
                starter.processes[0][1].wait()
            except KeyboardInterrupt:
                starter.shutdown()
                
        elif command == 'beat':
            # Start only beat scheduler
            starter = CeleryStarter()
            starter.start_beat()
            try:
                starter.processes[0][1].wait()
            except KeyboardInterrupt:
                starter.shutdown()
                
        elif command == 'api':
            # Start only API server
            starter = CeleryStarter()
            starter.start_api_server()
            try:
                starter.processes[0][1].wait()
            except KeyboardInterrupt:
                starter.shutdown()
                
        else:
            print("Unknown command. Available commands: worker, beat, api, or no command for all")
    else:
        # Start all components
        starter = CeleryStarter()
        try:
            starter.start_all()
        except KeyboardInterrupt:
            starter.shutdown()

if __name__ == '__main__':
    main() 