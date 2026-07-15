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
  const response = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      query: `mutation Login($username: String!, $password: String!) { login(username: $username, password: $password) { ... on CurrentUser { id identifier } } }`,
      variables: { username: USERNAME, password: PASSWORD }
    }),
  });
  
  authToken = response.headers.get('vendure-auth-token');
}

async function main() {
  try {
    await login();
    
    const products = await graphql(`
      query Products {
        products {
          items {
            id
            name
            slug
            collections {
              id
              name
            }
            featuredAsset {
              id
              preview
            }
          }
        }
      }
    `);
    console.log('=== Products ===');
    console.log(JSON.stringify(products.products.items, null, 2));
    
    const collections = await graphql(`
      query Collections {
        collections {
          items {
            id
            name
            slug
            filters {
              code
            }
          }
        }
      }
    `);
    console.log('\n=== Collections ===');
    console.log(JSON.stringify(collections.collections.items, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
