const mongoose = require('mongoose');
const paperSchema = require('./Paper').schema; // Adjust path as needed

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true // Ensure teacher name is unique
  },
  profileUrl: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  photoUrl: {
    type: String,
    trim: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  citationsPerYear: {
    type: Map,
    of: Number,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes are already defined in the schema fields above with unique: true
// No need for duplicate schema.index() calls

const Teacher = mongoose.model('Teacher', teacherSchema);

const teacherPaperModels = {};

function getTeacherPaperModel(teacherName) {
  const collectionName = sanitizeCollectionName(teacherName);
  if (!teacherPaperModels[collectionName]) {
    teacherPaperModels[collectionName] = mongoose.model(
      collectionName,
      paperSchema,
      collectionName // Explicitly set collection name
    );
  }
  return teacherPaperModels[collectionName];
}

module.exports = Teacher; 