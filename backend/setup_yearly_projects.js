const { MongoClient } = require('mongodb');

async function setupYearlyProjects() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/isfcr';
  
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Create yearly_projects collection if it doesn't exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    if (!collectionNames.includes('yearly_projects')) {
      await db.createCollection('yearly_projects');
      console.log('Created yearly_projects collection');
      
      // Create indexes for better performance
      const yearlyProjectsCollection = db.collection('yearly_projects');
      
      // Index on year for faster queries
      await yearlyProjectsCollection.createIndex({ year: -1 });
      console.log('Created index on year field');
      
      // Index on teacherName for faster lookups
      await yearlyProjectsCollection.createIndex({ teacherName: 1 });
      console.log('Created index on teacherName field');
      
      // Index on createdAt for sorting
      await yearlyProjectsCollection.createIndex({ createdAt: -1 });
      console.log('Created index on createdAt field');
      
      // Compound index for year + createdAt for efficient sorting
      await yearlyProjectsCollection.createIndex({ year: -1, createdAt: -1 });
      console.log('Created compound index on year + createdAt');
      
    } else {
      console.log('yearly_projects collection already exists');
    }
    
    await client.close();
    console.log('Setup completed successfully');
    
  } catch (error) {
    console.error('Error setting up yearly projects:', error);
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupYearlyProjects();
}

module.exports = { setupYearlyProjects };
