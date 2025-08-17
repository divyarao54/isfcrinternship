const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();

// Support Elastic Cloud or self-hosted
// If ELASTIC_CLOUD_ID is present, prefer cloud config with basic auth
// Else use ELASTIC_NODE URL (http://host:9200) with optional auth via ELASTIC_USERNAME/ELASTIC_PASSWORD
const cloudId = process.env.ELASTIC_CLOUD_ID;
const nodeUrl = process.env.ELASTIC_NODE || 'http://localhost:9200';
const username = process.env.ELASTIC_USERNAME;
const password = process.env.ELASTIC_PASSWORD;

const client = cloudId
  ? new Client({
      cloud: { id: cloudId },
      auth: username && password ? { username, password } : undefined,
    })
  : new Client({
      node: nodeUrl,
      auth: username && password ? { username, password } : undefined,
    });

module.exports = client; 