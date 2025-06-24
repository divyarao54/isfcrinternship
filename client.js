const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();

const client = new Client({
  node: process.env.ELASTIC_NODE, // e.g., 'http://localhost:9200'
});

module.exports = client; 