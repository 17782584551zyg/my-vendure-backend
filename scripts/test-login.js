const fetch = require('node-fetch');

const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://localhost:3002/admin-api';

async function test() {
  const response = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
          __typename
        }
      }`,
      variables: { username: 'superadmin', password: 'superadmin' },
    }),
    credentials: 'include',
  });
  const result = await response.json();
  console.log('Response:', JSON.stringify(result, null, 2));
  console.log('Headers:', response.headers.raw());
}

test();
