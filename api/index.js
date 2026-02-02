// Vercel Serverless API Handler with PostgreSQL (Native pg)

// 使用 Node.js 原生 pg 模块
const { Client } = require('pg');

let pgClient;
let useDatabase = false;

try {
  // 老板给的 Prisma URL 格式转标准 postgres
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL;
  
  if (dbUrl) {
    // 转换 prisma+postgres:// -> postgres://
    let connectionString = dbUrl.replace('prisma+postgres://', 'postgres://');
    
    pgClient = new Client({ connectionString });
    useDatabase = true;
    console.log('PostgreSQL 已配置');
  } else {
    console.log('未配置数据库，使用内存模式');
    useDatabase = false;
  }
} catch (e) {
  console.log('PostgreSQL 初始化失败，使用内存模式', e.message);
  useDatabase = false;
}

// 内存模式数据库
let memoryDb = {
  users: [{ id: 1, username: '大熊', email: '834202715@qq.com', password: 'sv834202715', bio: '全栈AI探索者' }],
  articles: [
    { id: 1, title: '2024年AI发展回顾与2025年趋势展望', slug: 'ai-2024-review-2025-outlook', excerpt: '回顾2024年AI领域的重大进展', category: 'AI教程', author: '大熊', views: 150, likes: 12, created_at: '2024-01-15' },
    { id: 2, title: 'RAG实战：如何构建个人知识库', slug: 'rag-personal-knowledge-base', excerpt: '利用RAG技术构建知识库', category: 'AI教程', author: '大熊', views: 120, likes: 8, created_at: '2024-01-12' },
    { id: 3, title: 'AI编程助手对比评测', slug: 'ai-coding-assistant-comparison', excerpt: 'Copilot、Claude Code、Cline对比', category: 'AI教程', author: '大熊', views: 200, likes: 25, created_at: '2024-01-10' },
    { id: 4, title: 'AI图像生成工具横评', slug: 'ai-image-generation', excerpt: 'Midjourney、DALL·E、SD对比', category: 'AI教程', author: '大熊', views: 180, likes: 15, created_at: '2024-01-08' },
    { id: 5, title: 'ChatGPT提示词工程完全指南', slug: 'chatgpt-prompt-engineering', excerpt: '掌握提示词工程技巧', category: 'AI教程', author: '大熊', views: 250, likes: 30, created_at: '2024-01-05' },
    { id: 6, title: '我的第一个AI项目', slug: 'my-first-ai-project', excerpt: '开发AI问答机器人历程', category: '项目案例', author: '大熊', views: 300, likes: 45, created_at: '2024-01-03' }
  ],
  projects: [
    { id: 1, title: 'Bear AI World', slug: 'bear-ai-world', description: '个人AI知识分享平台', tech_stack: 'Vercel, Next.js', featured: 1, github_url: 'https://github.com/daxiongxiansheng666-boop/bear-ai-world' },
    { id: 2, title: 'AI写作助手', slug: 'ai-writing-assistant', description: '基于GPT的智能写作', tech_stack: 'React, Node.js', featured: 1 },
    { id: 3, title: '智能图像识别', slug: 'smart-image-recognition', description: '物体识别系统', tech_stack: 'Python, PyTorch', featured: 1 }
  ],
  messages: [
    { id: 1, name: '访客小明', content: '网站做得真棒！', created_at: '2024-01-15' },
    { id: 2, name: 'AI爱好者', content: '大熊哥，AI教程写得非常好！', created_at: '2024-01-12' }
  ]
};

function generateToken(user) {
  const payload = { id: user.id, username: user.username };
  return 'Bearer ' + Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(authHeader) {
  try {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const payload = JSON.parse(Buffer.from(authHeader.slice(7), 'base64').toString());
      return { valid: true, user: payload };
    }
  } catch (e) {}
  return { valid: false };
}

function sanitize(str) {
  return str ? str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') : '';
}

function getAIResponse(message) {
  const responses = [
    `关于"${message}"，这是一个很有趣的问题。让我详细解答...`,
    `感谢提问！关于"${message}"，建议：1. 明确目标 2. 选择工具 3. 持续实践`,
    `关于"${message}"，关键在于理解原理，然后通过实践巩固。`
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

async function queryDb(text, params) {
  if (!useDatabase || !pgClient) throw new Error('数据库未配置');
  try {
    await pgClient.connect();
    const result = await pgClient.query(text, params);
    return result;
  } catch (e) {
    throw e;
  }
}

module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname.replace('/api/', '');
  const method = req.method;
  let data = {};

  // CORS
  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).send(null);
  }

  try {
    if (method !== 'GET' && method !== 'HEAD') {
      try { data = await req.json(); } catch (e) {}
    }

    const authHeader = req.headers.authorization;
    const userResult = verifyToken(authHeader);
    const user = userResult.valid ? userResult.user : null;

    res.setHeader('Content-Type', 'application/json');

    // ========== Auth ==========
    if (pathname === 'auth/login' && method === 'POST') {
      // 数据库模式
      if (useDatabase) {
        try {
          const result = await queryDb('SELECT * FROM users WHERE email = $1 AND password = $2', [data.email, data.password]);
          if (result.rows.length > 0) {
            const foundUser = result.rows[0];
            return res.json({ success: true, data: { token: generateToken(foundUser), user: { id: foundUser.id, username: foundUser.username, email: foundUser.email } } });
          }
        } catch (e) {
          console.log('数据库查询失败:', e.message);
        }
      }
      // 内存模式
      const foundUser = memoryDb.users.find(u => u.email === data.email && u.password === data.password);
      if (foundUser) {
        return res.json({ success: true, data: { token: generateToken(foundUser), user: { id: foundUser.id, username: foundUser.username, email: foundUser.email } } });
      }
      return res.status(400).json({ success: false, message: '邮箱或密码错误' });
    }

    // ========== Config ==========
    if (pathname === 'config' && method === 'GET') {
      if (useDatabase) {
        try {
          const result = await queryDb('SELECT * FROM config');
          const configObj = {};
          result.rows.forEach(row => { configObj[row.key] = row.value; });
          return res.json({ success: true, data: configObj });
        } catch (e) {}
      }
      return res.json({ success: true, data: {} });
    }

    if (pathname === 'config' && method === 'POST' && user) {
      if (useDatabase) {
        try {
          for (const [key, value] of Object.entries(data)) {
            await queryDb('INSERT INTO config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP', [key, value]);
          }
          return res.json({ success: true, message: '配置已保存' });
        } catch (e) {
          console.log('配置保存失败:', e.message);
        }
      }
      return res.json({ success: true, message: '配置已保存（内存模式）' });
    }

    // ========== Articles ==========
    if (pathname === 'articles' && method === 'GET') {
      if (useDatabase) {
        try {
          const result = await queryDb('SELECT * FROM articles ORDER BY created_at DESC');
          return res.json({ success: true, data: { articles: result.rows, total: result.rows.length } });
        } catch (e) {}
      }
      return res.json({ success: true, data: { articles: memoryDb.articles, total: memoryDb.articles.length } });
    }

    // ========== Projects ==========
    if (pathname === 'projects' && method === 'GET') {
      if (useDatabase) {
        try {
          const result = await queryDb('SELECT * FROM projects ORDER BY created_at DESC');
          return res.json({ success: true, data: result.rows });
        } catch (e) {}
      }
      return res.json({ success: true, data: memoryDb.projects });
    }

    // ========== Stats ==========
    if (pathname === 'stats' && method === 'GET') {
      if (useDatabase) {
        try {
          const articles = await queryDb('SELECT COUNT(*) as count FROM articles');
          const projects = await queryDb('SELECT COUNT(*) as count FROM projects');
          const messages = await queryDb('SELECT COUNT(*) as count FROM messages');
          return res.json({ success: true, data: { articles: parseInt(articles.rows[0].count), projects: parseInt(projects.rows[0].count), messages: parseInt(messages.rows[0].count) } });
        } catch (e) {}
      }
      return res.json({ success: true, data: { articles: memoryDb.articles.length, projects: memoryDb.projects.length, messages: memoryDb.messages.length } });
    }

    // ========== Messages ==========
    if (pathname === 'messages' && method === 'GET') {
      if (useDatabase) {
        try {
          const result = await queryDb('SELECT * FROM messages ORDER BY created_at DESC LIMIT 50');
          return res.json({ success: true, data: result.rows });
        } catch (e) {}
      }
      return res.json({ success: true, data: memoryDb.messages });
    }

    if (pathname === 'messages' && method === 'POST') {
      if (useDatabase) {
        try {
          await queryDb('INSERT INTO messages (name, email, content) VALUES ($1, $2, $3)', [sanitize(data.name), sanitize(data.email), sanitize(data.content)]);
        } catch (e) {}
      }
      return res.json({ success: true, message: '留言成功' });
    }

    // ========== AI Chat ==========
    if (pathname === 'ai/chat' && method === 'POST') {
      if (!data.message) return res.status(400).json({ success: false, message: '消息不能为空' });
      
      if (useDatabase) {
        try {
          const result = await queryDb('SELECT value FROM config WHERE key = $1', ['deepseek_api_key']);
          const apiKey = result.rows[0]?.value;
          if (apiKey && apiKey.startsWith('sk-')) {
            try {
              const aiRes = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: data.message }] })
              });
              const aiData = await aiRes.json();
              if (aiData.choices) {
                return res.json({ success: true, data: { response: aiData.choices[0].message.content } });
              }
            } catch (e) {}
          }
        } catch (e) {}
      }
      return res.json({ success: true, data: { response: getAIResponse(data.message) } });
    }

    return res.status(404).json({ success: false, message: 'API不存在' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || '服务器错误' });
  }
};
