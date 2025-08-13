const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Check if we're already connected
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }

    // Use MongoDB Atlas connection string from environment variable
    // If not provided, use a placeholder that will need to be updated
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority';
    
    if (mongoUri.includes('<username>') || mongoUri.includes('<cluster-url>')) {
      console.error('⚠️  MONGODB_URI not properly configured!');
      console.error('Please set your MongoDB Atlas connection string in the environment variable MONGODB_URI');
      console.error('Example: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/research_papers?retryWrites=true&w=majority');
      throw new Error('MongoDB Atlas connection string not configured');
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000, // Increased timeout for Atlas
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      connectTimeoutMS: 10000, // Connection timeout
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 1, // Minimum number of connections in the pool
      maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    });
    
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    // Don't exit the process, let the application handle the error
    throw error;
  }
};

// Handle connection events
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

module.exports = connectDB; 