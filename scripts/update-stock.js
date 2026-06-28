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
    console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
    throw new Error(`GraphQL Error`);
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

async function getProducts() {
  const data = await graphql(`
    query Products {
      products(options: { take: 100 }) {
        items {
          id
          name
          variants {
            id
            sku
            name
            stockLevel
          }
        }
      }
    }
  `);
  return data.products.items;
}

async function updateStock(variantId, quantity) {
  console.log(`📦 Updating stock for variant ${variantId} to ${quantity}...`);
  const data = await graphql(`
    mutation UpdateProductVariant($input: UpdateProductVariantInput!) {
      updateProductVariant(input: $input) {
        id
        name
        stockOnHand
        stockLevel
      }
    }
  `, { input: { id: variantId, stockOnHand: quantity } });
  
  console.log(`   ✅ Updated: ${data.updateProductVariant.name} - Stock: ${data.updateProductVariant.stockOnHand} (${data.updateProductVariant.stockLevel})`);
  return data;
}

async function main() {
  try {
    await login();
    
    console.log('\n📋 Current Products and Stock:\n');
    const products = await getProducts();
    
    for (const product of products) {
      console.log(`Product: ${product.name}`);
      for (const variant of product.variants) {
        console.log(`  - Variant: ${variant.name} (${variant.sku})`);
        console.log(`    Current Stock: ${variant.stockLevel}`);
        
        // Update stock to 100 for all variants
        await updateStock(variant.id, 100);
      }
      console.log('');
    }
    
    console.log('🎉 Stock update completed!');
    console.log('\nYou can now add products to cart in the storefront.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
