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
  
  console.log('\n=== 获取所有产品 ===');
  const products = await graphql('{ products(options: { take: 20 }) { items { id name slug } } }');
  console.log('产品列表:', products.data?.products?.items?.map(p => `${p.id}: ${p.name}`));
  
  console.log('\n=== 获取所有分类 ===');
  const collections = await graphql('{ collections { items { id name slug } } }');
  console.log('分类列表:', collections.data?.collections?.items?.map(c => `${c.id}: ${c.name} (${c.slug})`));
  
  const productIds = products.data?.products?.items?.map(p => p.id) || [];
  const firstCollectionId = collections.data?.collections?.items?.[0]?.id;
  
  if (firstCollectionId && productIds.length > 0) {
    console.log('\n=== 将所有产品添加到分类 ===');
    console.log('目标分类:', firstCollectionId);
    console.log('产品数量:', productIds.length);
    
    const addProducts = await graphql(`
      mutation AddProductsToCollection($collectionId: ID!, $productIds: [ID!]!) {
        addProductsToCollection(collectionId: $collectionId, productIds: $productIds) {
          id
          name
        }
      }
    `, {
      collectionId: firstCollectionId,
      productIds: productIds
    });
    
    if (addProducts.errors) {
      console.error('添加失败:', JSON.stringify(addProducts.errors, null, 2));
    } else {
      console.log('✅ 添加成功');
    }
    
    console.log('\n=== 触发搜索索引重建 ===');
    const reindex = await graphql('mutation { reindex { id state } }');
    console.log('Reindex:', reindex.data?.reindex);
  }
}

run();