// 数据库初始化脚本
const { Client } = require('pg');

const connectionString = 'postgres://291b2267eccf67fe66356de2ee55ffd8775b4c313febf5e65c9e2995b1171408:sk_QrceDijpsC6FBjZIskU0f@db.prisma.io:5432/postgres?sslmode=require';

async function init() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ 连接到数据库');

    // 创建 users 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        bio TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ users 表创建成功');

    // 创建 config 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS config (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ config 表创建成功');

    // 初始化用户
    await client.query(`
      INSERT INTO users (username, email, password, bio)
      VALUES ('大熊', '834202715@qq.com', 'sv834202715', '全栈AI探索者')
      ON CONFLICT (email) DO NOTHING
    `);
    console.log('✅ 管理员用户已创建');

    // 初始化配置
    await client.query(`
      INSERT INTO config (key, value) VALUES
      ('deepseek_api_key', ''),
      ('ai_model', 'deepseek-chat')
      ON CONFLICT (key) DO NOTHING
    `);
    console.log('✅ 初始配置已创建');

    console.log('\n🎉 数据库初始化完成！');
  } catch (e) {
    console.error('❌ 错误:', e.message);
  } finally {
    await client.end();
  }
}

init();
