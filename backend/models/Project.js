const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: false },
  srn: { type: String, required: false }
});

const projectSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
    min: 2000,
    max: 2100
  },
  teacherName: {
    type: String,
    required: true,
    trim: true
  },
  projectName: {
    type: String,
    required: true,
    trim: true
  },
  projectDescription: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Capstone', 'Summer Internship'],
    default: 'Capstone'
  },
  students: {
    type: [studentSchema],
    default: []
  },
  studentsString: {
    type: String,
    required: false,
    trim: true
  },
  report: {
    type: String,
    required: false,
    trim: true
  },
  poster: {
    type: String,
    required: false,
    trim: true
  },
  groupId: {
    type: String,
    required: false,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create unique index to prevent duplicates
projectSchema.index({ year: 1, teacherName: 1, projectName: 1 }, { unique: true });

// Update the updatedAt field before saving
projectSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Project', projectSchema);
