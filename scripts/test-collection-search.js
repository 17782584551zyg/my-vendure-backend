const fetch = require('node-fetch');

async function testCollectionSearch() {
  const response = await fetch('http://localhost:3002/shop-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: '{ search(input: { groupByProduct: true, collectionSlug: "electronics" }) { totalItems items { productName slug productAsset { preview } } } }'
    })
  });
  const data = await response.json();
  console.log('分类搜索结果:');
  console.log(JSON.stringify(data, null, 2));
}

testCollectionSearch();