import fs from 'fs';
const path = 'src/vendure-config.ts';
let c = fs.readFileSync(path, 'utf8');

const oldCustomFields = `  customFields: {
    Product: [
      { name: 'productDetails', type: 'localeText', label: [{ languageCode: LanguageCode.en, value: 'Product Details' }] },
      { name: 'detailImage', type: 'relation', entity: Asset, label: [{ languageCode: LanguageCode.en, value: 'Detail Image' }] },
    ],
  },`;

const newCustomFields = `  customFields: {
    Product: [
      { 
        name: 'productDetails', 
        type: 'localeText', 
        label: [{ languageCode: LanguageCode.en, value: 'Product Details' }],
        graphQLType: 'String',
      },
      { 
        name: 'detailImage', 
        type: 'relation', 
        entity: Asset, 
        label: [{ languageCode: LanguageCode.en, value: 'Detail Image' }],
        graphQLType: 'Asset',
      },
    ],
  },`;

c = c.replace(oldCustomFields, newCustomFields);
fs.writeFileSync(path, c, 'utf8');
console.log('done');