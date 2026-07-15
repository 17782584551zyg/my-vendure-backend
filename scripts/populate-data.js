const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

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

async function getExistingProducts() {
  console.log('🔍 Checking existing products...');
  const data = await graphql(`
    query Products {
      products {
        items {
          id
          name
          slug
          customFields
        }
      }
    }
  `);
  return data.products.items;
}

async function updateProductCustomFields(productId, customFields) {
  console.log(`🔄 Updating product ${productId}...`);
  await graphql(`
    mutation UpdateProduct($input: UpdateProductInput!) {
      updateProduct(input: $input) {
        id
        name
      }
    }
  `, { input: { id: productId, customFields } });
  console.log(`✅ Product ${productId} updated`);
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

async function uploadAsset(filePath, fileName) {
  console.log(`📤 Uploading asset: ${fileName}...`);
  const fileData = fs.readFileSync(filePath);
  const base64Data = fileData.toString('base64');
  
  const data = await graphql(`
    mutation CreateAsset($input: CreateAssetInput!) {
      createAsset(input: $input) {
        id
        name
        preview
      }
    }
  `, { input: { 
    file: {
      filename: fileName,
      mimeType: 'image/png',
      fileSize: fileData.length,
      data: base64Data,
    },
  } });
  
  console.log(`✅ Asset uploaded: ${data.createAsset.name}`);
  return data.createAsset;
}

async function createCollection(assetId) {
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
    filters: [],
    featuredAssetId: assetId,
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

async function createProducts(taxCategoryId, stockLocationId, collectionId) {
  console.log('📱 Creating Products...');
  
  const products = [
    {
      name: 'Laptop',
      slug: 'laptop',
      description: 'A high-performance laptop with the latest technology',
      price: 99900,
      productDetails: '<p>This is a premium laptop with the latest Intel processor, 16GB RAM, and 512GB SSD storage.</p><ul><li>High-resolution display</li><li>Long battery life</li><li>Lightweight design</li></ul>',
    },
    {
      name: 'Smartphone',
      slug: 'smartphone',
      description: 'A modern smartphone with advanced features',
      price: 69900,
      productDetails: '<p>Experience next-generation mobile technology with our flagship smartphone.</p><ul><li>6.7 inch AMOLED display</li><li>50MP camera system</li><li>5G connectivity</li></ul>',
    },
    {
      name: 'Wireless Headphones',
      slug: 'wireless-headphones',
      description: 'Premium wireless headphones with noise cancellation',
      price: 19900,
      productDetails: '<p>Immerse yourself in premium audio quality with active noise cancellation.</p><ul><li>40-hour battery life</li><li>Active Noise Cancellation</li><li>Premium sound quality</li></ul>',
    },
  ];
  
  const productIds = [];
  
  for (const product of products) {
    const svgBuffer = await createPlaceholderImage(600, 400, `${product.name} Detail`);
    const base64Data = svgBuffer.toString('base64');
    const detailAssetData = await graphql(`
      mutation CreateAsset($input: CreateAssetInput!) {
        createAsset(input: $input) {
          id
          name
          preview
        }
      }
    `, { input: { 
      file: {
        filename: `${product.slug}-detail.png`,
        mimeType: 'image/svg+xml',
        fileSize: svgBuffer.length,
        data: base64Data,
      },
    } });
    
    const productData = await graphql(`
      mutation CreateProduct($input: CreateProductInput!) {
        createProduct(input: $input) {
          id
          name
        }
      }
    `, { input: { 
      translations: [{ languageCode: 'en', name: product.name, slug: product.slug, description: product.description }],
      enabled: true,
      customFields: {
        productDetails: { en: product.productDetails },
        detailImage: detailAssetData.createAsset.id,
      },
    } });
    
    productIds.push(productData.createProduct.id);
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
    
    await addStock(variantId, 100);
    console.log(`   ✅ Stock added: 100 units`);
  }
  
  return productIds;
}

async function createPlaceholderImage(width, height, text) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect fill="#f3f4f6" width="${width}" height="${height}"/>
    <text fill="#6b7280" font-family="sans-serif" font-size="24" x="50%" y="50%" text-anchor="middle" dy=".3em">${text}</text>
  </svg>`;
  return Buffer.from(svg, 'utf8');
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
    
    const collectionAsset = await uploadAsset(
      path.join(__dirname, '../static/assets/collection.png'),
      'collection.png'
    ).catch(async () => {
      console.log('⚠️ Using placeholder image for collection...');
      const svgBuffer = await createPlaceholderImage(400, 400, 'Electronics');
      const base64Data = svgBuffer.toString('base64');
      const data = await graphql(`
        mutation CreateAsset($input: CreateAssetInput!) {
          createAsset(input: $input) {
            id
            name
            preview
          }
        }
      `, { input: { 
        file: {
          filename: 'collection-placeholder.png',
          mimeType: 'image/svg+xml',
          fileSize: svgBuffer.length,
          data: base64Data,
        },
      } });
      return data.createAsset;
    });
    
    const collectionId = await createCollection(collectionAsset.id);
    
    for (const productName of ['Laptop', 'Smartphone', 'Wireless Headphones']) {
      const svgBuffer = await createPlaceholderImage(400, 400, productName);
      const base64Data = svgBuffer.toString('base64');
      await graphql(`
        mutation CreateAsset($input: CreateAssetInput!) {
          createAsset(input: $input) {
            id
            name
            preview
          }
        }
      `, { input: { 
        file: {
          filename: `${productName.toLowerCase().replace(' ', '-')}.png`,
          mimeType: 'image/svg+xml',
          fileSize: svgBuffer.length,
          data: base64Data,
        },
      } });
    }
    
    try {
      await createPaymentMethod(channelId);
    } catch (e) {
      console.log('⚠️ Payment method creation skipped:', e.message);
    }
    await createShippingMethod(channelId);
    await createProducts(taxCategoryId, stockLocationId);
    
    const existingProducts = await getExistingProducts();
    for (const product of existingProducts) {
      try {
        const customFields = typeof product.customFields === 'string' 
          ? JSON.parse(product.customFields) 
          : product.customFields || {};
        
        if (!customFields.productDetails) {
          const productDetailsMap = {
            'Laptop': '<p>This is a premium laptop with the latest Intel processor, 16GB RAM, and 512GB SSD storage.</p><ul><li>High-resolution display</li><li>Long battery life</li><li>Lightweight design</li></ul>',
            'Smartphone': '<p>Experience next-generation mobile technology with our flagship smartphone.</p><ul><li>6.7 inch AMOLED display</li><li>50MP camera system</li><li>5G connectivity</li></ul>',
            'Wireless Headphones': '<p>Immerse yourself in premium audio quality with active noise cancellation.</p><ul><li>40-hour battery life</li><li>Active Noise Cancellation</li><li>Premium sound quality</li></ul>',
          };
          
          const productDetails = productDetailsMap[product.name] || '<p>No details available.</p>';
          
          const svgBuffer = await createPlaceholderImage(600, 400, `${product.name} Detail`);
          const base64Data = svgBuffer.toString('base64');
          const detailAssetData = await graphql(`
            mutation CreateAsset($input: CreateAssetInput!) {
              createAsset(input: $input) {
                id
                name
                preview
              }
            }
          `, { input: { 
            file: {
              filename: `${product.slug}-detail.png`,
              mimeType: 'image/svg+xml',
              fileSize: svgBuffer.length,
              data: base64Data,
            },
          } });
          
          await updateProductCustomFields(product.id, {
            productDetails: { en: productDetails },
            detailImage: detailAssetData.createAsset.id,
          });
        }
      } catch (e) {
        console.log(`⚠️ Failed to update product ${product.name}:`, e.message);
      }
    }
    
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
