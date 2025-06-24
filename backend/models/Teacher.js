const mongoose = require('mongoose');
const paperSchema = require('./Paper').schema; // Adjust path as needed

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
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
  }
}, {
  timestamps: true
});

// Create index on profileUrl for faster lookups
teacherSchema.index({ profileUrl: 1 });

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