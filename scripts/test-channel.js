const fetch = require('node-fetch');

async function testChannel() {
  const response = await fetch('http://localhost:3002/admin-api', {
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
      variables: { username: 'superadmin', password: 'superadmin' }
    }),
  });
  
  const token = response.headers.get('vendure-auth-token');
  
  const data = await fetch('http://localhost:3002/admin-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ 
      query: `
        query Channels {
          channels {
            items {
              id
              code
              defaultTaxZone { id name }
            }
          }
        }
      `
    }),
  });
  
  const result = await data.json();
  console.log('Channels:', JSON.stringify(result, null, 2));
}

testChannel();