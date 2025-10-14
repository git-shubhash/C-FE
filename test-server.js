const https = require('https');

// Test the services endpoints
const testEndpoints = async () => {
  const baseUrl = 'https://localhost:5000/api/services';
  
  const endpoints = [
    '/test',
    '/departments', 
    '/all'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await new Promise((resolve, reject) => {
        https.get(`${baseUrl}${endpoint}`, {
          rejectUnauthorized: false // For self-signed certificates
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data }));
        }).on('error', reject);
      });

      console.log(`${endpoint}: ${response.status} - ${response.data}`);
    } catch (error) {
      console.error(`${endpoint}: Error - ${error.message}`);
    }
  }
};

console.log('Testing server endpoints...');
testEndpoints();
