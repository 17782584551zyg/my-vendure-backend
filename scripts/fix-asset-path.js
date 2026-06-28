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

async function checkAssets() {
  console.log('\n检查资产路径...');
  const data = await graphql(`{
    assets(options: { take: 20 }) {
      items {
        id
        name
        source
        preview
      }
    }
  }`);
  
  if (data.data?.assets?.items) {
    data.data.assets.items.forEach(asset => {
      console.log(`Asset ${asset.id}: ${asset.name}`);
      console.log(`  source: ${asset.source}`);
      console.log(`  preview: ${asset.preview}`);
      
      // 检查是否有反斜杠
      if (asset.source && asset.source.includes('\\')) {
        console.log(`  ⚠️ 需要修复路径`);
      }
    });
  }
}

async function fix() {
  await login();
  await checkAssets();
}

fix();