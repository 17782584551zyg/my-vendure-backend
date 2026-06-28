const fetch = require('node-fetch');

const ADMIN_API_URL = 'http://localhost:3002/admin-api';
let authToken = '';

async function login() {
  const response = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
          ... on CurrentUser { id identifier }
        }
      }`,
      variables: { username: 'superadmin', password: 'superadmin' }
    }),
  });
  authToken = response.headers.get('vendure-auth-token');
  console.log('登录成功');
}

async function graphql(query, variables = {}) {
  const response = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ query, variables }),
  });
  return response.json();
}

async function run() {
  await login();
  
  const reindex = await graphql('mutation { reindex { id state } }');
  console.log('Reindex:', JSON.stringify(reindex, null, 2));
  
  const assets = await graphql('{ assets { items { id preview } } }');
  const bad = assets.data?.assets?.items?.filter(a => a.preview?.includes('\\')) || [];
  console.log('Assets with backslash:', bad.length);
  bad.forEach(a => console.log('  ', a.id, a.preview));
}

run();