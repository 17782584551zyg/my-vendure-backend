const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../vendure.sqlite');
console.log('数据库路径:', dbPath);

try {
  const db = new Database(dbPath);
  
  // 先查看表结构
  console.log('\nAsset 表结构:');
  const tableInfo = db.prepare('PRAGMA table_info(asset)').all();
  tableInfo.forEach(col => {
    console.log(`  ${col.name}: ${col.type}`);
  });
  
  // 查看当前资产数据
  console.log('\n当前资产路径:');
  const assets = db.prepare('SELECT * FROM asset').all();
  assets.forEach(asset => {
    console.log(`ID ${asset.id}:`);
    console.log(`  source: ${asset.source}`);
    console.log(`  preview: ${asset.preview}`);
  });
  
  // 更新路径 - 将反斜杠替换为正斜杠
  console.log('\n修复路径...');
  const updateStmt = db.prepare(`
    UPDATE asset 
    SET source = REPLACE(source, '\\', '/'),
        preview = REPLACE(preview, '\\', '/')
    WHERE source LIKE '%\\%' OR preview LIKE '%\\%'
  `);
  
  const result = updateStmt.run();
  console.log(`更新了 ${result.changes} 条记录`);
  
  // 验证修复结果
  console.log('\n修复后的资产路径:');
  const fixedAssets = db.prepare('SELECT id, source, preview FROM asset').all();
  fixedAssets.forEach(asset => {
    console.log(`ID ${asset.id}:`);
    console.log(`  source: ${asset.source}`);
    console.log(`  preview: ${asset.preview}`);
  });
  
  db.close();
  console.log('\n路径修复完成！');
} catch (err) {
  console.error('错误:', err);
}