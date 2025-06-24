const mongoose = require('mongoose');
const connectDB = require('./config/db');

async function checkCollections() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n=== Available Collections ===');
    collections.forEach(collection => {
      console.log(`Collection: ${collection.name}`);
    });
    
    // Check papers collection
    console.log('\n=== Papers Collection ===');
    const papersCollection = mongoose.connection.db.collection('papers');
    const paperCount = await papersCollection.countDocuments();
    console.log(`Total papers: ${paperCount}`);
    
    // Show sample papers
    const samplePapers = await papersCollection.find({}).limit(5).toArray();
    console.log('\nSample Papers:');
    samplePapers.forEach(paper => {
      console.log(`\nTitle: ${paper.title}`);
      console.log(`URL: ${paper.url}`);
      console.log(`Teacher: ${paper.teacherName}`);
      console.log(`Citations: ${paper.citationCount}`);
      console.log(`Created: ${paper.createdAt}`);
      console.log(`Updated: ${paper.updatedAt}`);
    });
    
  } catch (error) {
    console.error('Error checking collections:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkCollections(); 