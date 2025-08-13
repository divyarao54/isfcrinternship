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
        """Connect to MongoDB Atlas"""
        try:
            if self.connected and self.client:
                print('MongoDB already connected')
                return self.db
            
            # Use MongoDB Atlas connection string from environment variable
            # If not provided, use a placeholder that will need to be updated
            mongo_uri = os.getenv('MONGODB_URI', 'mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority')
            
            if '<username>' in mongo_uri or '<cluster-url>' in mongo_uri:
                print('⚠️  MONGODB_URI not properly configured!')
                print('Please set your MongoDB Atlas connection string in the environment variable MONGODB_URI')
                print('Example: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/research_papers?retryWrites=true&w=majority')
                raise Exception('MongoDB Atlas connection string not configured')
            
            self.client = MongoClient(
                mongo_uri,
                serverSelectionTimeoutMS=10000,  # Increased timeout for Atlas
                socketTimeoutMS=45000,
                connectTimeoutMS=10000,
                maxPoolSize=10,  # Maximum number of connections in the pool
                minPoolSize=1,   # Minimum number of connections in the pool
                maxIdleTimeMS=30000  # Close connections after 30s of inactivity
            )
            
            # Test the connection
            self.client.admin.command('ping')
            self.db = self.client.get_database()
            self.connected = True
            
            print(f'✅ MongoDB Atlas Connected: {self.client.address[0]}:{self.client.address[1]}')
            return self.db
            
        except Exception as error:
            print(f'❌ MongoDB connection error: {error}')
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