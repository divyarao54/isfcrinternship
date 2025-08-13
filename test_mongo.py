from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

def test_mongo_directly():
    print("Testing MongoDB connection directly...")
    
    try:
        # Connect to MongoDB
        mongo_uri = os.getenv('MONGODB_URI', 'mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority')
        
        if '<username>' in mongo_uri:
            print("MongoDB URI not configured!")
            return
            
        client = MongoClient(mongo_uri)
        db = client.get_database()
        
        # Check collections
        collections = db.list_collection_names()
        print(f"Collections: {collections}")
        
        if 'yearly_projects' in collections:
            projects_collection = db['yearly_projects']
            
            # Count documents
            count = projects_collection.count_documents({})
            print(f"Total projects: {count}")
            
            # Get first few projects
            projects = list(projects_collection.find({}).limit(3))
            print(f"First 3 projects:")
            
            for i, project in enumerate(projects):
                print(f"\nProject {i}:")
                print(f"  Keys: {list(project.keys())}")
                print(f"  _id: {project.get('_id')}")
                print(f"  _id type: {type(project.get('_id'))}")
                print(f"  projectName: {project.get('projectName')}")
                print(f"  teacherName: {project.get('teacherName')}")
                
                # Check if _id exists
                if '_id' in project:
                    print(f"  _id exists: True")
                    print(f"  _id value: {project['_id']}")
                else:
                    print(f"  _id exists: False")
                    
        else:
            print("yearly_projects collection not found!")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_mongo_directly()
