const { MongoClient } = require('mongodb');
const client = require('./client');
require('dotenv').config();

// Function to normalize date format for Elasticsearch
function normalizeDate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }
  
  try {
    // Handle various date formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Convert to yyyy/MM/dd format that Elasticsearch expects
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}/${month}/${day}`;
  } catch (error) {
    console.warn(`Warning: Could not parse date "${dateString}":`, error.message);
    return null;
  }
}

// Function to clean paper data before indexing
function cleanPaperData(paper) {
  const cleaned = { ...paper };
  
  // Remove _id from body
  delete cleaned._id;
  
  // Normalize date fields
  if (cleaned.publicationDate) {
    const normalizedDate = normalizeDate(cleaned.publicationDate);
    if (normalizedDate) {
      cleaned.publicationDate = normalizedDate;
    } else {
      // If we can't parse the date, remove it to avoid indexing errors
      delete cleaned.publicationDate;
    }
  }
  
  if (cleaned.year) {
    // Convert year to number if it's a string
    const yearNum = parseInt(cleaned.year);
    if (!isNaN(yearNum)) {
      cleaned.year = yearNum;
    } else {
      delete cleaned.year;
    }
  }
  
  if (cleaned.citationCount) {
    // Convert citation count to number if it's a string
    const citationNum = parseInt(cleaned.citationCount);
    if (!isNaN(citationNum)) {
      cleaned.citationCount = citationNum;
    } else {
      cleaned.citationCount = 0;
    }
  }
  
  // Clean up any undefined or null values
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined || cleaned[key] === null || cleaned[key] === '') {
      delete cleaned[key];
    }
  });
  
  return cleaned;
}

// Function to create or update index mapping
async function ensureIndexMapping(indexName) {
  try {
    // Check if index exists
    const indexExists = await client.indices.exists({ index: indexName });
    
    if (!indexExists.body) {
      // Create index with proper mapping
      await client.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: {
              title: { type: 'text' },
              authors: { type: 'text' },
              publicationDate: { 
                type: 'date',
                format: 'yyyy/MM/dd HH:mm:ss||yyyy/MM/dd||epoch_millis'
              },
              year: { type: 'integer' },
              citationCount: { type: 'integer' },
              source: { type: 'text' },
              journal: { type: 'text' },
              conference: { type: 'text' },
              book: { type: 'text' },
              volume: { type: 'text' },
              issue: { type: 'text' },
              pages: { type: 'text' },
              publisher: { type: 'text' },
              description: { type: 'text' },
              summary: { type: 'text' },
              pdfLink: { type: 'keyword' },
              url: { type: 'keyword' },
              teacherName: { type: 'text' }
            }
          }
        }
      });
      console.log(`[SUCCESS] Created index ${indexName} with proper mapping`);
    } else {
      console.log(`[INFO] Index ${indexName} already exists`);
    }
  } catch (error) {
    console.warn(`[WARNING] Could not create/update mapping for ${indexName}:`, error.message);
  }
}

async function syncToElastic() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/research_papers';
  const dbName = mongoUri.split('/').pop();
  const mongoClient = new MongoClient(mongoUri, { 
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4 // Use IPv4, skip trying IPv6
  });
  
  try {
    await mongoClient.connect();
    console.log('MongoDB Connected successfully');
    
    const db = mongoClient.db(dbName);

    // Get all collections that start with 'papers_'
    const collections = await db.listCollections().toArray();
    const paperCollections = collections.filter(col => col.name.startsWith('papers_'));

    for (const col of paperCollections) {
      const collectionName = col.name;
      const esIndex = collectionName; // Use the same name for ES index
      const papers = await db.collection(collectionName).find({}).toArray();
      console.log(`Found ${papers.length} papers in ${collectionName} to sync`);

      // Ensure proper index mapping
      await ensureIndexMapping(esIndex);

      for (const paper of papers) {
        try {
          // Clean the paper data before indexing
          const cleanedPaper = cleanPaperData(paper);
          
          await client.index({
            index: esIndex,
            id: paper._id.toString(),
            body: cleanedPaper,
          });
          console.log(`[SUCCESS] Indexed: ${paper.title} -> ${esIndex}`);
        } catch (err) {
          console.error(`[ERROR] Failed to index paper ${paper._id} in ${esIndex}: ${err.message}`);
          
          // Log more details for debugging
          if (err.message.includes('document_parsing_exception')) {
            console.error(`   Paper title: ${paper.title}`);
            console.error(`   Publication date: ${paper.publicationDate}`);
            console.error(`   Year: ${paper.year}`);
            console.error(`   Cleaned publication date: ${cleanedPaper.publicationDate}`);
          }
        }
      }

      // Refresh the index after syncing
      try {
        await client.indices.refresh({ index: esIndex });
      } catch (err) {
        console.error(`[ERROR] Failed to refresh index ${esIndex}: ${err.message}`);
      }
    }

    console.log('[SUCCESS] Sync complete for all teacher collections!');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  } finally {
    await mongoClient.close();
  }
  
  process.exit(0);
}

syncToElastic().catch(err => {
  console.error('Fatal error during sync:', err);
  process.exit(1);
}); 