const { MongoClient } = require('mongodb');

(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/research_papers';
  const dbName = uri.split('/').pop();
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      if (col.name.startsWith('papers_')) {
        const indexes = await db.collection(col.name).indexes();
        for (const idx of indexes) {
          if (idx.key && idx.key.url === 1 && idx.unique) {
            console.log(`Dropping unique index on url in ${col.name}`);
            await db.collection(col.name).dropIndex(idx.name);
          }
        }
      }
    }
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
})(); 