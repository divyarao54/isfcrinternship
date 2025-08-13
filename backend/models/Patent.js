const mongoose = require('mongoose');

const patentSchema = new mongoose.Schema({
  patentTitle: {
    type: String,
    required: true,
    trim: true
  },
  patentNumber: {
    type: String,
    required: true,
    trim: true
  },
  inventors: [{
    type: String,
    required: true,
    trim: true
  }],
  assignee: {
    type: String,
    required: true,
    trim: true
  },
  patentOffice: {
    type: String,
    required: true,
    enum: ['USPTO', 'IPO India', 'EPO', 'WIPO', 'Other']
  },
  patentType: {
    type: String,
    required: true,
    enum: ['Provisional', 'Non-provisional', 'Design', 'Utility', 'Plant', 'Other']
  },
  status: {
    type: String,
    required: true,
    enum: ['Filed', 'Published', 'Granted', 'Rejected', 'Abandoned']
  },
  filingDate: {
    type: Date,
    required: true
  },
  publicationDate: {
    type: Date
  },
  grantDate: {
    type: Date
  },
  abstract: {
    type: String,
    required: true,
    trim: true
  },
  patentDocument: {
    type: String, // URL to uploaded file
    trim: true
  },
  patentLink: {
    type: String, // URL to patent document
    trim: true
  },
  domain: {
    type: String,
    required: true,
    enum: ['Cryptography', 'AI', '6G', 'Cybersecurity', 'Machine Learning', 'Data Science', 'Computer Vision', 'Natural Language Processing', 'Robotics', 'IoT', 'Blockchain', 'Cloud Computing', 'Software Engineering', 'Other']
  },
  remarks: {
    type: String,
    trim: true
  },
  teacherName: {
    type: String,
    required: true,
    trim: true
  },
  teacherId: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
patentSchema.index({ teacherName: 1 });
patentSchema.index({ patentNumber: 1 });
patentSchema.index({ domain: 1 });
patentSchema.index({ status: 1 });

const Patent = mongoose.model('Patent', patentSchema);

module.exports = Patent; 