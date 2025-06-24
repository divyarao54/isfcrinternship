const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true,
    unique: true
  },
  teacherName: {
    type: String,
    required: true
  },
  authors: {
    type: String,
    default: 'Unknown Authors'
  },
  source: String,
  journal: String,
  conference: String,
  book: String,
  year: String,
  volume: String,
  issue: String,
  pages: String,
  publisher: String,
  description: String,
  summary: String,
  pdfLink: String,
  citationCount: {
    type: Number,
    default: 0
  },
  publicationDate: String
}, {
  timestamps: true,
  collection: 'papers'
});

module.exports = mongoose.model('Paper', paperSchema); 