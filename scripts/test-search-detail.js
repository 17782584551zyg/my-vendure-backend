const fetch = require('node-fetch');

const SHOP_API_URL = 'http://localhost:3002/shop-api';

async function test() {
  console.log('=== 测试搜索结果详情 ===\n');
  
  const searchResult = await fetch(SHOP_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `{
        search(input: { take: 10 }) {
          totalItems
          items {
            productId
            productName
            slug
            productAsset {
              id
              preview
            }
            currencyCode
            priceWithTax {
              ... on PriceRange { min max }
              ... on SinglePrice { value }
            }
          }
        }
      }`
    })
  });
  
  const data = await searchResult.json();
  
  console.log('搜索结果数量:', data.data?.search?.totalItems);
  
  if (data.data?.search?.items) {
    console.log('\n搜索结果详情:');
    data.data.search.items.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.productName}`);
      console.log(`   productId: ${item.productId}`);
      console.log(`   slug: ${item.slug}`);
      console.log(`   productAsset:`);
      console.log(`     id: ${item.productAsset?.id || 'undefined'}`);
      console.log(`     preview: ${item.productAsset?.preview || 'undefined'}`);
      
      if (!item.productAsset?.preview) {
        console.log(`   ⚠️ productAsset.preview 是 undefined!`);
      }
    });
  }
  
  if (data.errors) {
    console.error('\n错误:', JSON.stringify(data.errors, null, 2));
  }
  
  // 检查产品的 featuredAsset 是否正常
  console.log('\n\n=== 测试产品的 featuredAsset ===');
  const productResult = await fetch(SHOP_API_URL, {
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
            }
          }
        }
      }`
    })
  });
  
  const productData = await productResult.json();
  
  if (productData.data?.products?.items) {
    productData.data.products.items.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   slug: ${product.slug}`);
      console.log(`   featuredAsset:`);
      console.log(`     id: ${product.featuredAsset?.id || 'undefined'}`);
      console.log(`     preview: ${product.featuredAsset?.preview || 'undefined'}`);
    });
  }
}

test();