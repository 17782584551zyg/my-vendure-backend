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
  console.log('登录成功，token:', authToken ? '已获取' : '未获取');
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

async function checkProducts() {
  console.log('\n检查产品状态...');
  const data = await graphql(`{
    products(options: { take: 20 }) {
      items {
        id
        name
        slug
        variants {
          id
          name
          sku
          price
          stockLevel
        }
        featuredAsset {
          id
          preview
        }
      }
      totalItems
    }
  }`);
  
  console.log('总产品数:', data.data?.products?.totalItems);
  data.data?.products?.items?.forEach(p => {
    console.log(`\n产品: ${p.name} (ID: ${p.id})`);
    console.log(`  Slug: ${p.slug}`);
    console.log(`  变体数量: ${p.variants?.length || 0}`);
    console.log(`  图片: ${p.featuredAsset ? '有' : '无'}`);
    if (p.variants?.length > 0) {
      p.variants.forEach(v => {
        console.log(`    - ${v.name} (SKU: ${v.sku}, 价格: ${v.price})`);
      });
    } else {
      console.log(`  ⚠️ 没有变体，需要添加！`);
    }
  });
}

async function addVariant(productId, productName) {
  console.log(`\n为产品 ${productName} (ID: ${productId}) 添加变体...`);
  
  // 先获取默认 TaxCategory
  const taxData = await graphql(`{
    taxCategories(options: { take: 1 }) {
      items { id name }
    }
  }`);
  const taxCategoryId = taxData.data?.taxCategories?.items?.[0]?.id;
  console.log('TaxCategory ID:', taxCategoryId);
  
  // 获取默认 FacetValues
  const facetData = await graphql(`{
    facets(options: { take: 5 }) {
      items {
        id code
        values { id code name }
      }
    }
  }`);
  
  const variantData = await graphql(`
    mutation CreateProductVariants($input: [CreateProductVariantInput!]!) {
      createProductVariants(input: $input) {
        id
        name
        sku
        price
        stockLevel
      }
    }
  `, {
    input: [{
      productId: productId,
      translations: [
        {
          languageCode: 'en',
          name: productName
        }
      ],
      sku: `SKU-${productId}-1`,
      price: 1000,
      taxCategoryId: taxCategoryId,
      stockOnHand: 100,
      trackInventory: 'TRUE',
    }]
  });
  
  if (variantData.errors) {
    console.error('创建变体失败:', JSON.stringify(variantData.errors, null, 2));
  } else {
    console.log('变体创建成功:', variantData.data?.createProductVariant?.name);
  }
}

async function reindex() {
  console.log('\n触发搜索索引重建...');
  const data = await graphql(`mutation Reindex {
    reindex {
      id
      state
      progress
      isSettled
    }
  }`);
  console.log('Reindex job:', data.data?.reindex?.id, '状态:', data.data?.reindex?.state);
}

async function fix() {
  await login();
  await checkProducts();
  
  // 找出没有变体的产品并添加变体
  const data = await graphql(`{
    products(options: { take: 20 }) {
      items {
        id
        name
        variants { id }
      }
    }
  }`);
  
  const productsWithoutVariants = data.data?.products?.items?.filter(p => !p.variants || p.variants.length === 0);
  
  if (productsWithoutVariants?.length > 0) {
    console.log(`\n发现 ${productsWithoutVariants.length} 个产品没有变体，正在添加...`);
    for (const p of productsWithoutVariants) {
      await addVariant(p.id, p.name);
    }
  } else {
    console.log('\n所有产品都有变体，无需修复');
  }
  
  // 重建索引
  await reindex();
  
  console.log('\n修复完成！');
}

fix();