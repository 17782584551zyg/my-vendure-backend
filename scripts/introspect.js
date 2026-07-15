const fetch = require('node-fetch');

const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://localhost:3002/admin-api';
const USERNAME = process.env.ADMIN_USERNAME || 'superadmin';
const PASSWORD = process.env.ADMIN_PASSWORD || 'superadmin';

let authToken = '';

async function graphql(query, variables = {}) {
  const response = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  return response.json();
}

async function login() {
  const response = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
          __typename
        }
      }`,
      variables: { username: USERNAME, password: PASSWORD },
    }),
    credentials: 'include',
  });
  const result = await response.json();
  authToken = response.headers.get('vendure-auth-token');
  return result;
}

async function introspect() {
  const query = `query Products {
    products {
      items {
        id
        name
        customFields {
          productDetails
          detailImage {
            id
            preview
          }
        }
      }
    }
  }`;
  const result = await graphql(query);
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  try {
    await login();
    await introspect();
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main();
