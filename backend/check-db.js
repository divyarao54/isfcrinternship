const mongoose = require('mongoose');
const Paper = require('./models/Paper');
const Teacher = require('./models/Teacher');
const connectDB = require('./config/db');

async function checkDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    
    // Check teachers
    console.log('\n=== Teachers ===');
    const teachers = await Teacher.find({});
    console.log(`Total teachers: ${teachers.length}`);
    teachers.forEach(teacher => {
      console.log(`\nTeacher: ${teacher.name}`);
      console.log(`Profile URL: ${teacher.profileUrl}`);
      console.log(`Photo URL: ${teacher.photoUrl || 'No photo'}`);
      console.log(`Last Updated: ${teacher.lastUpdated}`);
    });
    
    // Check papers
    console.log('\n=== Papers ===');
    const papers = await Paper.find({});
    console.log(`Total papers: ${papers.length}`);
    
    // Group papers by teacher
    const papersByTeacher = {};
    papers.forEach(paper => {
      if (!papersByTeacher[paper.teacherName]) {
        papersByTeacher[paper.teacherName] = [];
      }
      papersByTeacher[paper.teacherName].push(paper);
    });
    
    // Display papers by teacher
    Object.entries(papersByTeacher).forEach(([teacher, teacherPapers]) => {
      console.log(`\nPapers for ${teacher}: ${teacherPapers.length}`);
      teacherPapers.forEach(paper => {
        console.log(`\nTitle: ${paper.title}`);
        console.log(`URL: ${paper.url}`);
        console.log(`Citations: ${paper.citationCount}`);
        console.log(`Year: ${paper.year || 'N/A'}`);
        console.log(`Source: ${paper.source || 'N/A'}`);
      });
    });
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkDatabase(); 