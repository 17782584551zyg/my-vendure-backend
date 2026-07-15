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
      query: `mutation Login($username: String!, $password: String!) { login(username: $username, password: $password) { ... on CurrentUser { id identifier } } }`,
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

async function updateCollection(collectionId, productIds) {
  console.log(`📥 Updating collection ${collectionId} with ${productIds.length} products...`);
  const data = await graphql(`
    mutation UpdateCollection($input: UpdateCollectionInput!) {
      updateCollection(input: $input) {
        id
        name
      }
    }
  `, { input: { id: collectionId } });
  console.log(`✅ Collection updated: ${data.updateCollection.name}`);
}

async function main() {
  try {
    await login();
    
    const collections = await getCollections();
    console.log('Collections:', collections);
    
    const products = await getProducts();
    console.log('Products:', products);
    
    if (collections.length > 0 && products.length > 0) {
      const collection = collections[0];
      const productIds = products.map(p => p.id);
      
      console.log(`\nTrying to associate ${productIds.length} products to collection "${collection.name}" (id: ${collection.id})`);
      console.log(`Product IDs: ${productIds.join(', ')}`);
      
      try {
        const schema = await graphql(`
          { __type(name: "CreateCollectionInput") { fields { name type { name } } } }
        `);
        console.log('CreateCollectionInput fields:', schema.__type.fields.map(f => `${f.name}: ${f.type.name}`));
      } catch (e) {
        console.log('Could not get schema:', e.message);
      }
      
      try {
        await graphql(`
          mutation UpdateCollection($input: UpdateCollectionInput!) {
            updateCollection(input: $input) {
              id
              name
            }
          }
        `, { input: { id: collection.id, filters: [{ code: 'facet-value-filter', args: [] }] } });
        console.log(`✅ Collection updated with filters`);
      } catch (e) {
        console.log(`⚠️ Update collection:`, e.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
