const fetch = require('node-fetch');

const ADMIN_API_URL = 'http://localhost:3002/admin-api';
const USERNAME = 'superadmin';
const PASSWORD = 'superadmin';

let authToken = '';

async function graphql(query, variables = {}) {
  const response = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const result = await response.json();
  if (result.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(result.errors)}`);
  }
  return result.data;
}

async function login() {
  console.log('🔐 Logging in...');
  const response = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      query: `
        mutation Login($username: String!, $password: String!) {
          login(username: $username, password: $password) {
            ... on CurrentUser { id identifier }
          }
        }
      `,
      variables: { username: USERNAME, password: PASSWORD }
    }),
  });
  
  authToken = response.headers.get('vendure-auth-token');
  console.log('✅ Login successful');
}

async function reindex() {
  console.log('🔍 Rebuilding search index...');
  const data = await graphql(`
    mutation Reindex {
      reindex {
        id
        state
        progress
        isSettled
      }
    }
  `);
  
  console.log('✅ Search index job created:');
  console.log(`   - Job ID: ${data.reindex.id}`);
  console.log(`   - State: ${data.reindex.state}`);
  console.log(`   - Progress: ${data.reindex.progress}%`);
  console.log(`   - Settled: ${data.reindex.isSettled}`);
}

async function main() {
  try {
    await login();
    await reindex();
    
    console.log('');
    console.log('🎉 Search index rebuilding...');
    console.log('');
    console.log('The search index is being rebuilt in the background.');
    console.log('Wait a few seconds and then visit:');
    console.log('• Storefront: http://localhost:3000');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();