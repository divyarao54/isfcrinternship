const mongoose = require('mongoose');

const domainSchema = new mongoose.Schema({
  teacherName: {
    type: String,
    required: true,
    trim: true
  },
  domainName: {
    type: String,
    required: true,
    trim: true
  },
  domainUrl: {
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

// Create compound index to ensure unique teacher-domain combinations
domainSchema.index({ teacherName: 1, domainName: 1 }, { unique: true });

const Domain = mongoose.model('Domain', domainSchema);

module.exports = Domain; 