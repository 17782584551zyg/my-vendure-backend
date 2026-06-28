const fetch = require('node-fetch');

async function testSearch() {
  const response = await fetch('http://localhost:3002/shop-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      query: `
        query Search($input: SearchInput!) {
          search(input: $input) {
            totalItems
            items {
              productId
              productName
              slug
              productAsset {
                id
                preview
              }
              priceWithTax {
                ... on SinglePrice {
                  value
                }
              }
            }
          }
        }
      `,
      variables: { 
        input: { 
          take: 10,
          term: ""
        } 
      }
    }),
  });
  
  const result = await response.json();
  console.log('Search result:', JSON.stringify(result, null, 2));
}

testSearch();