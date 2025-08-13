// remove-duplicate-teachers.js
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017/';
const DB_NAME = 'research_papers';

async function removeDuplicates() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const teachersCollection = db.collection('teachers');
    
    // 1. Remove duplicate teachers (keep oldest by profileUrl)
    const allTeachers = await teachersCollection.find({}).toArray();
    const byProfileUrl = {};
    for (const teacher of allTeachers) {
      const url = teacher.profileUrl;
      if (!url) continue;
      if (!byProfileUrl[url]) byProfileUrl[url] = [];
      byProfileUrl[url].push(teacher);
    }

    let removedTeacherIds = [];
    for (const [url, teachers] of Object.entries(byProfileUrl)) {
      if (teachers.length > 1) {
        // Sort by creation date (or _id timestamp) and keep the oldest
        teachers.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt) : a._id.getTimestamp();
          const bTime = b.createdAt ? new Date(b.createdAt) : b._id.getTimestamp();
          return aTime - bTime;
        });
        const toRemove = teachers.slice(1);
        for (const t of toRemove) {
          await teachersCollection.deleteOne({ _id: t._id });
          removedTeacherIds.push(t._id);
          console.log(`Removed duplicate teacher: ${t.name} (${t.profileUrl})`);
        }
      }
    }

    // Check if citations collection exists before trying to access it
    const collections = await db.listCollections().toArray();
    const citationsCollectionExists = collections.some(col => col.name === 'citations');
    
    if (!citationsCollectionExists) {
      console.log('Citations collection does not exist. Skipping citation cleanup.');
    } else {
      const citationsCollection = db.collection('citations');
      
      // 2. Remove orphaned citations (citations for deleted teachers)
      if (removedTeacherIds.length > 0) {
        const result = await citationsCollection.deleteMany({
          $or: [
            { teacherId: { $in: removedTeacherIds } },
            { teacherId: { $exists: false } }
          ]
        });
        console.log(`Removed ${result.deletedCount} orphaned citation records.`);
      }

      // 3. Remove duplicate citations (keep one per teacherName/profileUrl)
      const allCitations = await citationsCollection.find({}).toArray();
      const byTeacher = {};
      for (const c of allCitations) {
        const key = `${c.teacherName}||${c.profileUrl}`;
        if (!byTeacher[key]) byTeacher[key] = [];
        byTeacher[key].push(c);
      }
      for (const [key, arr] of Object.entries(byTeacher)) {
        if (arr.length > 1) {
          arr.sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt) : a._id.getTimestamp();
            const bTime = b.createdAt ? new Date(b.createdAt) : b._id.getTimestamp();
            return aTime - bTime;
          });
          const toRemove = arr.slice(1);
          for (const c of toRemove) {
            await citationsCollection.deleteOne({ _id: c._id });
            console.log(`Removed duplicate citation for: ${c.teacherName} (${c.profileUrl})`);
          }
        }
      }
    }

    console.log('Duplicate removal complete!');
  } catch (err) {
    console.error('Error removing duplicates:', err);
  } finally {
    await client.close();
  }
}

removeDuplicates();