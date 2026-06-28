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

async function createCountry() {
  console.log('🌍 Creating Country...');
  const data = await graphql(`
    mutation CreateCountry($input: CreateCountryInput!) {
      createCountry(input: $input) {
        id
        code
      }
    }
  `, { input: { code: 'CN', enabled: true, translations: [{ languageCode: 'en', name: 'China' }] } });
  
  console.log('✅ Country created:', data.createCountry.code);
  return data.createCountry.id;
}

async function createTaxZone(countryId) {
  console.log('🌐 Creating Tax Zone...');
  const data = await graphql(`
    mutation CreateZone($input: CreateZoneInput!) {
      createZone(input: $input) {
        id
        name
      }
    }
  `, { input: { name: 'Worldwide', memberIds: [countryId] } });
  
  console.log('✅ Tax Zone created:', data.createZone.name);
  return data.createZone.id;
}

async function getDefaultChannelId() {
  const data = await graphql(`
    query Channels {
      channels {
        items {
          id
          code
        }
      }
    }
  `);
  const defaultChannel = data.channels.items.find(c => c.code === '__default_channel__');
  return defaultChannel.id;
}

async function updateChannelDefaultTaxZone(taxZoneId) {
  console.log('⚙️ Setting default tax zone for channel...');
  const channelId = await getDefaultChannelId();
  await graphql(`
    mutation UpdateChannel($input: UpdateChannelInput!) {
      updateChannel(input: $input) {
        ... on Channel {
          id
          code
        }
      }
    }
  `, { input: { id: channelId, defaultTaxZoneId: taxZoneId, defaultShippingZoneId: taxZoneId } });
  
  console.log('✅ Channel updated');
  return channelId;
}

async function createTaxCategory() {
  console.log('📝 Creating Tax Category...');
  const data = await graphql(`
    mutation CreateTaxCategory($input: CreateTaxCategoryInput!) {
      createTaxCategory(input: $input) {
        id
        name
      }
    }
  `, { input: { name: 'Standard Tax', isDefault: true } });
  
  console.log('✅ Tax Category created:', data.createTaxCategory.name);
  return data.createTaxCategory.id;
}

async function createStockLocation() {
  console.log('📦 Creating Stock Location...');
  const data = await graphql(`
    mutation CreateStockLocation($input: CreateStockLocationInput!) {
      createStockLocation(input: $input) {
        id
        name
      }
    }
  `, { input: { name: 'Default Warehouse', description: 'Main warehouse' } });
  
  console.log('✅ Stock Location created:', data.createStockLocation.name);
  return data.createStockLocation.id;
}

async function createCollection() {
  console.log('📁 Creating Collection...');
  const data = await graphql(`
    mutation CreateCollection($input: CreateCollectionInput!) {
      createCollection(input: $input) {
        id
        name
        slug
      }
    }
  `, { input: { 
    translations: [{ languageCode: 'en', name: 'Electronics', slug: 'electronics', description: 'Electronic devices' }],
    filters: []
  } });
  
  console.log('✅ Collection created:', data.createCollection.name);
  return data.createCollection.id;
}

async function createPaymentMethod(channelId) {
  console.log('💳 Creating Payment Method...');
  const data = await graphql(`
    mutation CreatePaymentMethod($input: CreatePaymentMethodInput!) {
      createPaymentMethod(input: $input) {
        id
        code
      }
    }
  `, { input: { 
    code: 'dummy-payment',
    enabled: true,
    translations: [{ languageCode: 'en', name: 'Dummy Payment', description: 'Test payment method' }],
    handler: { 
      code: 'dummy-payment-handler',
      arguments: []
    },
    checker: {
      code: 'always-eligible-payment-checker',
      arguments: []
    }
  } });
  
  console.log('✅ Payment Method created:', data.createPaymentMethod.code);
  
  await graphql(`
    mutation AssignPaymentMethodsToChannel($input: AssignPaymentMethodsToChannelInput!) {
      assignPaymentMethodsToChannel(input: $input) { id }
    }
  `, { input: { channelId, paymentMethodIds: [data.createPaymentMethod.id] } });
  
  console.log('✅ Payment Method assigned to channel');
  return data.createPaymentMethod.id;
}

async function createShippingMethod(channelId) {
  console.log('📦 Creating Shipping Method...');
  const data = await graphql(`
    mutation CreateShippingMethod($input: CreateShippingMethodInput!) {
      createShippingMethod(input: $input) {
        id
        code
      }
    }
  `, { input: { 
    code: 'standard-shipping',
    translations: [{ languageCode: 'en', name: 'Standard Shipping', description: 'Standard delivery' }],
    checker: { 
      code: 'always-active-checker',
      arguments: []
    },
    calculator: { 
      code: 'flat-rate-calculator',
      arguments: [{ name: 'rate', value: '500' }]
    },
    fulfillmentHandler: 'manual-fulfillment'
  } });
  
  console.log('✅ Shipping Method created:', data.createShippingMethod.code);
  
  await graphql(`
    mutation AssignShippingMethodsToChannel($input: AssignShippingMethodsToChannelInput!) {
      assignShippingMethodsToChannel(input: $input) { id }
    }
  `, { input: { channelId, shippingMethodIds: [data.createShippingMethod.id] } });
  
  console.log('✅ Shipping Method assigned to channel');
  return data.createShippingMethod.id;
}

async function getStockLocationId() {
  const data = await graphql(`
    query StockLocations {
      stockLocations {
        items {
          id
          name
        }
      }
    }
  `);
  return data.stockLocations.items[0].id;
}

async function addStock(variantId, quantity) {
  await graphql(`
    mutation UpdateProductVariant($input: UpdateProductVariantInput!) {
      updateProductVariant(input: $input) {
        id
        stockOnHand
      }
    }
  `, { input: { id: variantId, stockOnHand: quantity } });
}

async function createProducts(taxCategoryId, stockLocationId) {
  console.log('📱 Creating Products...');
  
  const products = [
    {
      name: 'Laptop',
      slug: 'laptop',
      description: 'A high-performance laptop with the latest technology',
      price: 99900,
    },
    {
      name: 'Smartphone',
      slug: 'smartphone',
      description: 'A modern smartphone with advanced features',
      price: 69900,
    },
    {
      name: 'Wireless Headphones',
      slug: 'wireless-headphones',
      description: 'Premium wireless headphones with noise cancellation',
      price: 19900,
    },
  ];
  
  for (const product of products) {
    const productData = await graphql(`
      mutation CreateProduct($input: CreateProductInput!) {
        createProduct(input: $input) {
          id
          name
        }
      }
    `, { input: { 
      translations: [{ languageCode: 'en', name: product.name, slug: product.slug, description: product.description }],
      enabled: true
    } });
    
    console.log(`✅ Product created: ${productData.createProduct.name}`);
    
    const variantData = await graphql(`
      mutation CreateProductVariants($input: [CreateProductVariantInput!]!) {
        createProductVariants(input: $input) {
          id
          sku
        }
      }
    `, { input: [{ 
      productId: productData.createProduct.id,
      sku: product.slug.toUpperCase().replace(/-/g, ''),
      price: product.price,
      taxCategoryId: taxCategoryId,
      translations: [{ languageCode: 'en', name: product.name }]
    }] });
    
    const variantId = variantData.createProductVariants[0].id;
    console.log(`   ✅ Variant created: ${variantData.createProductVariants[0].sku}`);
    
    // Add stock to variant
    await addStock(variantId, 100);
    console.log(`   ✅ Stock added: 100 units`);
  }
}

async function main() {
  try {
    await login();
    
    const countryId = await createCountry();
    const taxZoneId = await createTaxZone(countryId);
    const channelId = await updateChannelDefaultTaxZone(taxZoneId);
    
    const taxCategoryId = await createTaxCategory();
    await createStockLocation();
    const stockLocationId = await getStockLocationId();
    await createCollection();
    await createPaymentMethod(channelId);
    await createShippingMethod(channelId);
    await createProducts(taxCategoryId, stockLocationId);
    
    console.log('');
    console.log('🎉 All data created successfully!');
    console.log('');
    console.log('You can now:');
    console.log('• Visit Admin UI: http://localhost:3002/admin');
    console.log('• Visit Storefront: http://localhost:3000');
    console.log('• Login: superadmin / superadmin');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
