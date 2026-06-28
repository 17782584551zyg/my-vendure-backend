const sqlite = require('better-sqlite3');
const db = sqlite('vendure.sqlite');

console.log('=== 所有表名 ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
tables.forEach(t => console.log('  ', t.name));

console.log('\n=== Product 表数据 ===');
const products = db.prepare('SELECT * FROM Product').all();
console.log('产品总数:', products.length);
products.forEach(p => {
  console.log('  ID:', p.id, 'Enabled:', p.enabled, 'FeaturedAssetId:', p.featuredAssetId);
});

console.log('\n=== 查找包含 product_translation 或类似的表 ===');
const translationTables = tables.filter(t => t.name.toLowerCase().includes('product') && t.name.toLowerCase().includes('trans'));
console.log('翻译相关表:', translationTables.map(t => t.name));

console.log('\n=== 查找包含 search 或 index 的表 ===');
const searchTables = tables.filter(t => t.name.toLowerCase().includes('search') || t.name.toLowerCase().includes('index'));
console.log('搜索相关表:', searchTables.map(t => t.name));