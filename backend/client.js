const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();

// Support Elastic Cloud or self-hosted
// Auth precedence: API key (ELASTIC_API_KEY or ID/SECRET) > username/password
const cloudId = process.env.ELASTIC_CLOUD_ID;
const nodeUrl = process.env.ELASTIC_NODE || 'http://localhost:9200';

// API key can be provided as a single base64 key or as id/secret pair
const apiKeySingle = process.env.ELASTIC_API_KEY; // base64 or "id:api_key"
const apiKeyId = process.env.ELASTIC_API_KEY_ID;
const apiKeySecret = process.env.ELASTIC_API_KEY_SECRET;

const username = process.env.ELASTIC_USERNAME;
const password = process.env.ELASTIC_PASSWORD;

let auth;
if (apiKeySingle) {
  auth = { apiKey: apiKeySingle };
} else if (apiKeyId && apiKeySecret) {
  auth = { apiKey: { id: apiKeyId, api_key: apiKeySecret } };
} else if (username && password) {
  auth = { username, password };
}

const client = cloudId
  ? new Client({
      cloud: { id: cloudId },
      auth,
    })
  : new Client({
      node: nodeUrl,
      auth,
    });

module.exports = client; 