const mongoose = require('mongoose');
const Paper = require('./models/Paper');
const Teacher = require('./models/Teacher');
const connectDB = require('./config/db');

async function testDatabase() {
  try {
    console.log('Testing MongoDB connection...');
    await connectDB();
    
    // Test teacher creation
    console.log('\nTesting teacher creation...');
    const teacher = new Teacher({
      name: 'Test Teacher',
      profileUrl: 'https://scholar.google.com/citations?user=GF0YZuUAAAAJ&hl=en&oi=ao',
      photoUrl: 'https://example.com/photo.jpg'
    });
    
    await teacher.save();
    console.log('✅ Teacher saved successfully');
    
    // Test paper creation
    console.log('\nTesting paper creation...');
    const paper = new Paper({
      title: 'Test Paper',
      url: 'https://scholar.google.com/test-paper',
      teacherName: 'Test Teacher',
      authors: 'Test Author',
      citationCount: 10
    });
    
    await paper.save();
    console.log('✅ Paper saved successfully');
    
    // Check collections
    console.log('\nChecking collections...');
    const teacherCount = await Teacher.countDocuments();
    const paperCount = await Paper.countDocuments();
    
    console.log(`Teachers in database: ${teacherCount}`);
    console.log(`Papers in database: ${paperCount}`);
    
    // List all papers
    const papers = await Paper.find({});
    console.log('\nPapers in database:');
    papers.forEach(p => {
      console.log(`- ${p.title} (${p.url})`);
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', error.errors);
    }
  } finally {
    await mongoose.connection.close();
  }
}

testDatabase(); 