const mongoose = require('mongoose');

const citationSchema = new mongoose.Schema({
  teacherName: {
    type: String,
    required: true,
    trim: true
  },
  profileUrl: {
    type: String,
    required: true,
    trim: true
  },
  citationsPerYear: {
    type: Object,
    required: true
  },
  hIndex: {
    type: Number,
    default: 0
  },
  i10Index: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Citation = mongoose.model('Citation', citationSchema);

module.exports = Citation; 