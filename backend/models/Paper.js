const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: false
    // unique: true // Remove unique constraint so multiple publications can have the same url
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
  publicationDate: String,
  inventors: String,
  patentOffice: String,
  patentNumber: String,
  applicationNumber: String,
  patentFilingNumber: String,
  filedOn: String,
  grantedOn: String,
  patent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Remove or comment out the unique index on url
// paperSchema.index({ url: 1 }, { unique: true });

module.exports = mongoose.model('Paper', paperSchema); 