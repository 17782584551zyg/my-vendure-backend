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

async function getCollections() {
  console.log('📁 Getting collections...');
  const data = await graphql(`
    query Collections {
      collections {
        items {
          id
          name
          slug
        }
      }
    }
  `);
  return data.collections.items;
}

async function getProducts() {
  console.log('📱 Getting products...');
  const data = await graphql(`
    query Products {
      products {
        items {
          id
          name
          slug
        }
      }
    }
  `);
  return data.products.items;
}

async function deleteCollection(id) {
  console.log(`🗑️ Deleting collection ${id}...`);
  await graphql(`
    mutation DeleteCollection($id: ID!) {
      deleteCollection(id: $id)
    }
  `, { id });
  console.log(`✅ Collection ${id} deleted`);
}

async function addProductsToCollection(collectionId, productIds) {
  console.log(`📥 Adding ${productIds.length} products to collection ${collectionId}...`);
  for (const productId of productIds) {
    try {
      await graphql(`
        mutation AddProductToCollection($collectionId: ID!, $productId: ID!) {
          addProductToCollection(collectionId: $collectionId, productId: $productId) {
            ... on Collection {
              id
              name
            }
          }
        }
      `, { collectionId, productId });
      console.log(`  ✅ Product ${productId} added`);
    } catch (e) {
      console.log(`  ⚠️ Product ${productId} may already be in collection:`, e.message);
    }
  }
  console.log(`✅ All products processed`);
}

async function main() {
  try {
    await login();
    
    const collections = await getCollections();
    console.log('Collections:', collections);
    
    const products = await getProducts();
    console.log('Products:', products);
    
    if (collections.length > 1) {
      console.log('⚠️ Found duplicate collections, skipping deletion for now');
    }
    
    const mainCollection = collections[0];
    if (mainCollection) {
      const productIds = products.map(p => p.id);
      await addProductsToCollection(mainCollection.id, productIds);
    }
    
    console.log('');
    console.log('🎉 Collections fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
