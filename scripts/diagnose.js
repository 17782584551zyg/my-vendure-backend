const fetch = require('node-fetch');

const SHOP_API_URL = 'http://localhost:3002/shop-api';
const ADMIN_API_URL = 'http://localhost:3002/admin-api';

async function diagnose() {
  console.log('=== Vendure 诊断报告 ===\n');

  // 1. 测试产品列表
  console.log('1. 测试产品列表 API...');
  try {
    const productsResult = await fetch(SHOP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          products(options: { take: 5 }) {
            items {
              id
              name
              slug
              featuredAsset {
                id
                preview
                source
              }
              assets {
                id
                preview
                source
              }
            }
            totalItems
          }
        }`
      })
    });
    const productsData = await productsResult.json();
    console.log('产品数量:', productsData.data?.products?.totalItems);
    if (productsData.data?.products?.items) {
      console.log('产品列表:');
      productsData.data.products.items.forEach(p => {
        console.log(`  - ${p.name} (slug: ${p.slug})`);
        console.log(`    featuredAsset: ${p.featuredAsset ? p.featuredAsset.preview : '无'}`);
        console.log(`    assets 数量: ${p.assets?.length || 0}`);
      });
    }
    if (productsData.errors) {
      console.error('错误:', JSON.stringify(productsData.errors, null, 2));
    }
  } catch (err) {
    console.error('请求失败:', err.message);
  }

  // 2. 测试搜索 API
  console.log('\n2. 测试搜索 API...');
  try {
    const searchResult = await fetch(SHOP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          search(input: { take: 5 }) {
            totalItems
            items {
              productId
              productName
              slug
              productAsset {
                id
                preview
              }
            }
          }
        }`
      })
    });
    const searchData = await searchResult.json();
    console.log('搜索结果数量:', searchData.data?.search?.totalItems);
    if (searchData.data?.search?.items?.length > 0) {
      console.log('搜索结果:');
      searchData.data.search.items.forEach(item => {
        console.log(`  - ${item.productName} (slug: ${item.slug})`);
      });
    }
    if (searchData.errors) {
      console.error('错误:', JSON.stringify(searchData.errors, null, 2));
    }
  } catch (err) {
    console.error('请求失败:', err.message);
  }

  // 3. 测试单个产品详情
  console.log('\n3. 测试产品详情 API (使用第一个产品的 slug)...');
  try {
    // 先获取一个产品 slug
    const productsResult = await fetch(SHOP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          products(options: { take: 1 }) {
            items {
              slug
            }
          }
        }`
      })
    });
    const productsData = await productsResult.json();
    const slug = productsData.data?.products?.items?.[0]?.slug;

    if (slug) {
      console.log(`测试 slug: ${slug}`);
      const productResult = await fetch(SHOP_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query product($slug: String) {
            product(slug: $slug) {
              id
              name
              slug
              description
              featuredAsset {
                id
                preview
                source
              }
              assets {
                id
                preview
                source
              }
              variants {
                id
                name
                priceWithTax
                currencyCode
                sku
                stockLevel
              }
            }
          }`,
          variables: { slug }
        })
      });
      const productData = await productResult.json();
      
      if (productData.data?.product) {
        console.log('产品详情获取成功:');
        console.log('  名称:', productData.data.product.name);
        console.log('  描述:', productData.data.product.description?.substring(0, 50) + '...');
        console.log('  变体数量:', productData.data.product.variants?.length);
        console.log('  featuredAsset:', productData.data.product.featuredAsset?.preview || '无');
        console.log('  assets 数量:', productData.data.product.assets?.length || 0);
      } else {
        console.error('产品详情获取失败');
        if (productData.errors) {
          console.error('错误:', JSON.stringify(productData.errors, null, 2));
        }
      }
    }
  } catch (err) {
    console.error('请求失败:', err.message);
  }

  // 4. 检查后台任务状态
  console.log('\n4. 检查后台任务状态...');
  try {
    // 登录获取 token
    const loginResult = await fetch(ADMIN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `mutation Login($username: String!, $password: String!) {
          login(username: $username, password: $password) {
            ... on CurrentUser { id identifier }
          }
        }`,
        variables: { username: 'superadmin', password: 'superadmin' }
      })
    });
    const authToken = loginResult.headers.get('vendure-auth-token');
    
    if (authToken) {
      const jobsResult = await fetch(ADMIN_API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `{
            jobs(options: { sort: { createdAt: DESC }, take: 5 }) {
              items {
                id
                queueName
                state
                progress
                isSettled
                createdAt
                startedAt
                settledAt
              }
            }
          }`
        })
      });
      const jobsData = await jobsResult.json();
      console.log('最近任务:');
      if (jobsData.data?.jobs?.items) {
        jobsData.data.jobs.items.forEach(job => {
          console.log(`  Job ${job.id}: ${job.queueName} - 状态: ${job.state}, 进度: ${job.progress}%, 完成: ${job.isSettled}`);
          if (!job.isSettled) {
            console.log(`    ⚠️  任务未完成`);
          }
        });
      }
    }
  } catch (err) {
    console.error('请求失败:', err.message);
  }

  console.log('\n=== 诊断完成 ===');
}

diagnose();