const client = require('./client');
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function diagnoseElasticsearch() {
  console.log('🔍 Diagnosing Elasticsearch Issues...\n');
  
  // Check environment variables
  console.log('1. Environment Variables:');
  console.log(`   ELASTIC_NODE: ${process.env.ELASTIC_NODE || 'NOT SET'}`);
  console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? 'SET' : 'NOT SET'}`);
  console.log('');
  
  // Test Elasticsearch connection
  console.log('2. Testing Elasticsearch Connection:');
  try {
    const info = await client.info();
    console.log(`   ✅ Connected to Elasticsearch: ${info.body.version.number}`);
    console.log(`   ✅ Cluster: ${info.body.cluster_name}`);
    console.log(`   ✅ Node: ${info.body.name}`);
  } catch (error) {
    console.log(`   ❌ Failed to connect to Elasticsearch: ${error.message}`);
    console.log('   💡 Make sure Elasticsearch is running on the configured URL');
    return;
  }
  console.log('');
  
  // Check indices
  console.log('3. Checking Elasticsearch Indices:');
  try {
    const indices = await client.cat.indices({ format: 'json' });
    const paperIndices = indices.filter(idx => idx.index.startsWith('papers_'));
    
    console.log(`   Total indices: ${indices.length}`);
    console.log(`   Paper indices: ${paperIndices.length}`);
    
    if (paperIndices.length === 0) {
      console.log('   ❌ No paper indices found in Elasticsearch');
      console.log('   💡 Run "node syncToElastic.js" to sync data from MongoDB');
    } else {
      console.log('   ✅ Paper indices found:');
      paperIndices.forEach(idx => {
        console.log(`      - ${idx.index} (${idx['docs.count']} documents)`);
      });
    }
  } catch (error) {
    console.log(`   ❌ Failed to get indices: ${error.message}`);
  }
  console.log('');
  
  // Check MongoDB data
  console.log('4. Checking MongoDB Data:');
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/research_papers';
    const mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    
    const db = mongoClient.db();
    const collections = await db.listCollections().toArray();
    const paperCollections = collections.filter(col => col.name.startsWith('papers_'));
    
    console.log(`   Total collections: ${collections.length}`);
    console.log(`   Paper collections: ${paperCollections.length}`);
    
    if (paperCollections.length === 0) {
      console.log('   ❌ No paper collections found in MongoDB');
      console.log('   💡 Add some teachers and scrape their publications first');
    } else {
      console.log('   ✅ Paper collections found:');
      for (const col of paperCollections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`      - ${col.name} (${count} documents)`);
      }
    }
    
    await mongoClient.close();
  } catch (error) {
    console.log(`   ❌ Failed to connect to MongoDB: ${error.message}`);
  }
  console.log('');
  
  // Test search functionality
  console.log('5. Testing Search Functionality:');
  try {
    const indices = await client.cat.indices({ format: 'json' });
    const paperIndices = indices.filter(idx => idx.index.startsWith('papers_'));
    
    if (paperIndices.length > 0) {
      const searchResult = await client.search({
        index: paperIndices.map(idx => idx.index),
        query: {
          multi_match: {
            query: 'test',
            fields: ['title', 'authors'],
            fuzziness: 'AUTO',
          },
        },
        size: 1,
      });
      
      console.log(`   ✅ Search test successful: ${searchResult.hits.total.value} total documents found`);
    } else {
      console.log('   ⚠️  No indices to test search with');
    }
  } catch (error) {
    console.log(`   ❌ Search test failed: ${error.message}`);
  }
  console.log('');
  
  console.log('📋 Summary:');
  console.log('   - If Elasticsearch connection fails: Start Elasticsearch service');
  console.log('   - If no paper indices: Run "node syncToElastic.js"');
  console.log('   - If no MongoDB data: Add teachers and scrape publications first');
  console.log('   - If environment variables missing: Check your .env file');
}

diagnoseElasticsearch().catch(console.error);

