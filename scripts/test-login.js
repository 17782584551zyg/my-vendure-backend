const fetch = require('node-fetch');

async function testLogin() {
  const response = await fetch('http://localhost:3002/admin-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      query: `
        mutation Login($username: String!, $password: String!) {
          login(username: $username, password: $password) {
            ... on CurrentUser {
              id
              identifier
            }
            ... on InvalidCredentialsError {
              errorCode
              message
            }
          }
        }
      `,
      variables: { username: 'superadmin', password: 'superadmin' }
    }),
  });
  
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  console.log('');
  console.log('Response body:', JSON.stringify(await response.json(), null, 2));
}

testLogin();