const fetch = require('node-fetch');

async function testProducts() {
  const response = await fetch('http://localhost:3002/shop-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      query: `
        query Products($options: ProductListOptions) {
          products(options: $options) {
            totalItems
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
        }
      `,
      variables: { 
        options: { 
          take: 10
        } 
      }
    }),
  });
  
  const result = await response.json();
  console.log('Products result:', JSON.stringify(result, null, 2));
}

testProducts();