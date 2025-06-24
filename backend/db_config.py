import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

class DatabaseManager:
    def __init__(self):
        self.client = None
        self.db = None
        self.connected = False
    
    def connect(self):
        """Connect to MongoDB"""
        try:
            if self.connected and self.client:
                print('MongoDB already connected')
                return self.db
            
            mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/research_papers')
            self.client = MongoClient(
                mongo_uri,
                serverSelectionTimeoutMS=5000,
                socketTimeoutMS=45000,
                connectTimeoutMS=5000
            )
            
            # Test the connection
            self.client.admin.command('ping')
            self.db = self.client.get_database()
            self.connected = True
            
            print(f'MongoDB Connected: {self.client.address[0]}:{self.client.address[1]}')
            return self.db
            
        except Exception as error:
            print(f'MongoDB connection error: {error}')
            self.connected = False
            raise error
    
    def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            self.connected = False
            print('MongoDB disconnected')
    
    def get_db(self):
        """Get database instance"""
        if not self.connected:
            return self.connect()
        return self.db
    
    def get_collection(self, collection_name):
        """Get a collection from the database"""
        db = self.get_db()
        return db[collection_name]

# Global database manager instance
db_manager = DatabaseManager()

def get_db():
    """Get database instance"""
    return db_manager.get_db()

def get_collection(collection_name):
    """Get a collection from the database"""
    return db_manager.get_collection(collection_name) 