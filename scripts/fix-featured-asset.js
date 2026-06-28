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

async function checkAndFix() {
  console.log('\n检查产品和资产...');
  
  // 获取所有产品
  const productsData = await graphql(`{
    products(options: { take: 20 }) {
      items {
        id
        name
        slug
        featuredAsset { id }
        assets { id }
      }
    }
  }`);
  
  // 获取所有资产
  const assetsData = await graphql(`{
    assets(options: { take: 20 }) {
      items {
        id
        source
        preview
      }
    }
  }`);
  
  const products = productsData.data?.products?.items || [];
  const assets = assetsData.data?.assets?.items || [];
  
  console.log(`\n产品总数: ${products.length}`);
  console.log(`资产总数: ${assets.length}`);
  
  // 找出没有 featuredAsset 的产品
  const productsWithoutFeatured = products.filter(p => !p.featuredAsset && p.assets.length > 0);
  
  console.log(`\n需要设置 featuredAsset 的产品: ${productsWithoutFeatured.length}`);
  
  for (const product of productsWithoutFeatured) {
    console.log(`\n为产品 ${product.name} (ID: ${product.id}) 设置 featuredAsset...`);
    
    const firstAssetId = product.assets[0].id;
    console.log(`  使用资产 ID: ${firstAssetId}`);
    
    const updateResult = await graphql(`
      mutation UpdateProduct($input: UpdateProductInput!) {
        updateProduct(input: $input) {
          id
          name
          featuredAsset { id }
        }
      }
    `, {
      input: {
        id: product.id,
        featuredAssetId: firstAssetId,
      }
    });
    
    if (updateResult.errors) {
      console.error('  ❌ 更新失败:', JSON.stringify(updateResult.errors, null, 2));
    } else {
      console.log(`  ✅ 更新成功`);
    }
  }
  
  // 检查资产路径是否还有反斜杠
  console.log('\n检查资产路径...');
  const badAssets = assets.filter(a => a.source?.includes('\\') || a.preview?.includes('\\'));
  
  if (badAssets.length > 0) {
    console.log(`发现 ${badAssets.length} 个资产路径有问题:`);
    badAssets.forEach(a => {
      console.log(`  Asset ${a.id}:`);
      console.log(`    source: ${a.source}`);
      console.log(`    preview: ${a.preview}`);
    });
    console.log('\n需要运行数据库修复脚本');
  } else {
    console.log('所有资产路径正常');
  }
  
  // 重建搜索索引
  console.log('\n触发搜索索引重建...');
  const reindexResult = await graphql(`mutation Reindex {
    reindex { id state progress isSettled }
  }`);
  console.log(`Reindex job: ${reindexResult.data?.reindex?.id}, 状态: ${reindexResult.data?.reindex?.state}`);
}

async function fix() {
  await login();
  await checkAndFix();
  console.log('\n修复完成！');
}

fix();