const fetch = require('node-fetch');

const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://localhost:3002/admin-api';
const USERNAME = process.env.ADMIN_USERNAME || 'superadmin';
const PASSWORD = process.env.ADMIN_PASSWORD || 'superadmin';

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
      query: `mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
          __typename
        }
      }`,
      variables: { username: USERNAME, password: PASSWORD },
    }),
    credentials: 'include',
  });
  const result = await response.json();
  if (result.errors) {
    throw new Error(`Login failed: ${result.errors[0].message}`);
  }
  authToken = response.headers.get('vendure-auth-token');
  if (!authToken) {
    throw new Error('Failed to extract auth token');
  }
  console.log('✅ Login successful');
}

async function getExistingProducts() {
  console.log('🔍 Getting existing products...');
  const data = await graphql(`
    query Products {
      products {
        items {
          id
          name
          slug
          customFields {
            productDetails
            detailImage {
              id
              preview
            }
          }
          assets {
            id
            preview
          }
        }
      }
    }
  `);
  return data.products.items;
}

async function updateProductCustomFields(productId, customFields) {
  console.log(`🔄 Updating product ${productId} customFields...`);
  const input = {
    id: productId,
    translations: [{
      languageCode: 'en',
      customFields: {
        productDetails: customFields.productDetails
      }
    }],
    ...(customFields.detailImage ? {
      customFields: {
        detailImageId: customFields.detailImage
      }
    } : {})
  };
  await graphql(`
    mutation UpdateProduct($input: UpdateProductInput!) {
      updateProduct(input: $input) {
        id
        name
      }
    }
  `, { input });
  console.log(`✅ Product ${productId} updated`);
}

async function main() {
  try {
    await login();
    
    const existingProducts = await getExistingProducts();
    console.log(`Found ${existingProducts.length} products`);
    
    const productDetailsMap = {
      'Laptop': '<p>This is a premium laptop with the latest Intel processor, 16GB RAM, and 512GB SSD storage.</p><ul><li>High-resolution display</li><li>Long battery life</li><li>Lightweight design</li></ul>',
      'Smartphone': '<p>Experience next-generation mobile technology with our flagship smartphone.</p><ul><li>6.7 inch AMOLED display</li><li>50MP camera system</li><li>5G connectivity</li></ul>',
      'Wireless Headphones': '<p>Immerse yourself in premium audio quality with active noise cancellation.</p><ul><li>40-hour battery life</li><li>Active Noise Cancellation</li><li>Premium sound quality</li></ul>',
    };
    
    for (const product of existingProducts) {
      try {
        const customFields = typeof product.customFields === 'string' 
          ? JSON.parse(product.customFields) 
          : product.customFields || {};
        
        if (!customFields.productDetails) {
          const productDetails = productDetailsMap[product.name] || '<p>No details available.</p>';
          const detailImage = product.assets.length > 0 ? product.assets[0].id : null;
          
          await updateProductCustomFields(product.id, {
            productDetails,
            ...(detailImage ? { detailImage } : {}),
          });
        } else {
          console.log(`ℹ️ Product ${product.name} already has customFields, skipping`);
        }
      } catch (e) {
        console.log(`⚠️ Failed to update product ${product.name}:`, e.message);
      }
    }
    
    console.log('');
    console.log('🎉 All data updated successfully!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
