/**
 * 大熊的AI世界 - 纯Node.js完整版服务器
 * 不依赖任何外部npm包，功能完整
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const crypto = require('crypto');

// 配置
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bear-ai-world-secret-key-2024';
const ROOT_DIR = path.join(__dirname, '../public');

// MIME类型映射
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// 内存数据库
const db = {
  users: [
    { id: 1, username: '大熊', email: 'bear@example.com', password: 'admin123', bio: '热爱AI与技术的探索者', created_at: '2024-01-01' }
  ],
  articles: [
    { id: 1, title: 'ChatGPT提示词工程完全指南', slug: 'chatgpt-prompt-engineering-guide', excerpt: '掌握提示词工程的核心技巧', content: '# ChatGPT提示词工程完全指南\n\n提示词工程是...', category: 'AI教程', tags: 'AI,ChatGPT,提示词', author: '大熊', views: 150, likes: 12, created_at: '2024-01-15' },
    { id: 2, title: 'AI图像生成工具横向评测', slug: 'ai-image-generation-tools-comparison', excerpt: '主流AI绘图工具全面对比', content: '# AI图像生成工具横向评测\n\nMidjourney vs Stable Diffusion...', category: '其他', tags: 'AI,图像生成', author: '大熊', views: 120, likes: 8, created_at: '2024-01-10' },
    { id: 3, title: '我的第一个AI项目', slug: 'my-first-ai-project', excerpt: '分享开发基于大语言模型的问答机器人', content: '# 我的第一个AI项目\n\n开发智能问答机器人...', category: '项目案例', tags: 'AI,项目,Node.js', author: '大熊', views: 200, likes: 25, created_at: '2024-01-05' },
    { id: 4, title: '2024年AI发展回顾与展望', slug: 'ai-2024-review', excerpt: '回顾2024年AI领域的重大进展', content: '# 2024年AI发展回顾\n\nGPT-4.5发布...', category: '个人动态', tags: 'AI,年度总结', author: '大熊', views: 180, likes: 15, created_at: '2024-01-01' }
  ],
  projects: [
    { id: 1, title: 'AI写作助手', slug: 'ai-writing-assistant', description: '基于GPT的智能写作工具', content: '智能写作助手...', tech_stack: 'React, Node.js', featured: 1, created_at: '2024-01-10' },
    { id: 2, title: '智能图像识别系统', slug: 'smart-image-recognition', description: '支持多种物体识别的视觉AI系统', content: '物体检测系统...', tech_stack: 'Python, PyTorch', featured: 1, created_at: '2024-01-05' },
    { id: 3, title: 'AI聊天机器人平台', slug: 'ai-chat-platform', description: '支持多模型切换的对话平台', content: '多模型平台...', tech_stack: 'Vue3, FastAPI', featured: 0, created_at: '2024-01-01' }
  ],
  comments: [],
  messages: [
    { id: 1, name: '访客小明', email: 'xiaoming@example.com', content: '网站做得真棒！赛博朋克风格很有科技感。', created_at: '2024-01-15' },
    { id: 2, name: 'AI爱好者', email: 'ai_fan@163.com', content: '大熊哥，AI教程写得非常好，期待更多内容！', created_at: '2024-01-12' }
  ],
  favorites: [],
  chatHistories: []
};

// 工具函数
function generateToken(user) {
  const payload = { id: user.id, username: user.username };
  return 'Bearer ' + Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(token) {
  try {
    if (token.startsWith('Bearer ')) {
      const payload = JSON.parse(Buffer.from(token.slice(7), 'base64').toString());
      return { valid: true, user: payload };
    }
  } catch (e) {}
  return { valid: false };
}

function hashPassword(password) {
  return password; // 简化版，生产环境应使用bcrypt
}

function comparePassword(password, hash) {
  return password === hash;
}

function generateSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
}

function sanitizeInput(str) {
  return str?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '') || '';
}

// 响应函数
function jsonResponse(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// AI 配置
const AI_CONFIG = {
  providers: {
    mock: { name: '模拟响应', enabled: true, description: '免费模拟响应' },
    openai: { name: 'OpenAI (GPT)', enabled: false, description: '需要API Key' },
    claude: { name: 'Claude', enabled: false, description: '需要API Key' },
    clawdbot: { name: 'Clawdbot', enabled: false, description: '自定义AI服务' }
  }
};

function getAIProvider() {
  return process.env.AI_PROVIDER || 'mock';
}

async function chatWithAI(message, history = []) {
  const provider = getAIProvider();

  if (provider === 'mock') {
    const responses = [
      `你好！我是AI助手。关于"${message}"，这是一个很有趣的问题。`,
      `感谢你的提问！关于"${message}"，我可以提供以下建议：\n\n1. 首先，明确你的目标\n2. 选择合适的工具\n3. 持续学习和实践\n\n希望这对你有帮助！`,
      `这是一个很好的问题！关于"${message}"，我认为关键在于理解底层原理。`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // 其他服务商需要环境变量配置
  throw new Error(`AI服务商 [${provider}] 需要配置 API Key`);
}

// HTTP服务器
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API 请求
  if (pathname.startsWith('/api/')) {
    handleApiRequest(pathname, method, url, req, res);
    return;
  }

  // 静态文件
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(ROOT_DIR, filePath);

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<html><body><h1>404 - 页面未找到</h1></body></html>');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

function handleApiRequest(pathname, method, url, req, res) {
  // 解析路径
  const parts = pathname.split('/').filter(p => p);
  const resource = parts[1];
  const id = parts[2];
  const action = parts[3];

  // 认证检查
  const authHeader = req.headers['authorization'];
  let user = null;
  if (authHeader) {
    const result = verifyToken(authHeader);
    if (result.valid) user = result.user;
  }

  // 请求体解析
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    let data = {};
    if (body) {
      try { data = JSON.parse(body); } catch (e) {}
    }

    try {
      // 路由处理
      switch (true) {
        // === 认证 ===
        case pathname === '/api/auth/login' && method === 'POST':
          const userLogin = db.users.find(u => u.email === data.email);
          if (userLogin && comparePassword(data.password, userLogin.password)) {
            const token = generateToken(userLogin);
            jsonResponse(res, { success: true, data: { token, user: { id: userLogin.id, username: userLogin.username, email: userLogin.email } } });
          } else {
            jsonResponse(res, { success: false, message: '邮箱或密码错误' }, 400);
          }
          return;

        case pathname === '/api/auth/register' && method === 'POST':
          if (db.users.find(u => u.email === data.email)) {
            jsonResponse(res, { success: false, message: '邮箱已存在' }, 400);
            return;
          }
          const newUser = { id: db.users.length + 1, username: data.username, email: data.email, password: hashPassword(data.password), bio: '', created_at: new Date().toISOString() };
          db.users.push(newUser);
          const regToken = generateToken(newUser);
          jsonResponse(res, { success: true, data: { token: regToken, user: { id: newUser.id, username: newUser.username, email: newUser.email } } });
          return;

        case pathname === '/api/auth/me' && method === 'GET':
          if (!user) { jsonResponse(res, { success: false, message: '未登录' }, 401); return; }
          const currentUser = db.users.find(u => u.id === user.id);
          jsonResponse(res, { success: true, data: currentUser ? { id: currentUser.id, username: currentUser.username, email: currentUser.email, bio: currentUser.bio } : null });
          return;

        case pathname === '/api/users/profile' && method === 'PUT':
          if (!user) { jsonResponse(res, { success: false, message: '未登录' }, 401); return; }
          const profileUser = db.users.find(u => u.id === user.id);
          if (profileUser) { profileUser.bio = data.bio || profileUser.bio; }
          jsonResponse(res, { success: true, message: '更新成功' });
          return;

        case pathname === '/api/users/password' && method === 'PUT':
          if (!user) { jsonResponse(res, { success: false, message: '未登录' }, 401); return; }
          const pwUser = db.users.find(u => u.id === user.id);
          if (pwUser && comparePassword(data.currentPassword, pwUser.password)) {
            pwUser.password = hashPassword(data.newPassword);
            jsonResponse(res, { success: true, message: '密码修改成功' });
          } else {
            jsonResponse(res, { success: false, message: '当前密码错误' }, 400);
          }
          return;

        // === 文章 ===
        case pathname === '/api/articles' && method === 'GET':
          const { category, search, page = 1, limit = 10 } = Object.fromEntries(url.searchParams);
          let articles = db.articles.filter(a => a);
          if (category && category !== 'all') articles = articles.filter(a => a.category === category);
          if (search) {
            const term = search.toLowerCase();
            articles = articles.filter(a => a.title.toLowerCase().includes(term) || a.excerpt?.toLowerCase().includes(term));
          }
          const total = articles.length;
          articles = articles.slice((page - 1) * limit, page * limit);
          jsonResponse(res, { success: true, data: { articles, total, page: parseInt(page), pages: Math.ceil(total / limit) } });
          return;

        case pathname.startsWith('/api/articles/') && parts.length === 3 && method === 'GET':
          const article = db.articles.find(a => a.slug === parts[2]);
          if (article) {
            article.views++;
            const comments = db.comments.filter(c => c.article_id === article.id);
            jsonResponse(res, { success: true, data: { article, comments } });
          } else {
            jsonResponse(res, { success: false, message: '文章不存在' }, 404);
          }
          return;

        case pathname === '/api/articles' && method === 'POST':
          if (!user) { jsonResponse(res, { success: false, message: '未登录' }, 401); return; }
          const newArticle = {
            id: db.articles.length + 1,
            title: sanitizeInput(data.title),
            slug: generateSlug(data.title),
            content: sanitizeInput(data.content),
            excerpt: sanitizeInput(data.excerpt),
            category: data.category,
            tags: data.tags,
            author: user.username,
            author_id: user.id,
            views: 0,
            likes: 0,
            created_at: new Date().toISOString()
          };
          db.articles.unshift(newArticle);
          jsonResponse(res, { success: true, data: newArticle });
          return;

        case pathname.startsWith('/api/articles/') && parts.length === 3 && method === 'DELETE':
          if (!user) { jsonResponse(res, { success: false, message: '未登录' }, 401); return; }
          const delIdx = db.articles.findIndex(a => a.id === parseInt(parts[2]));
          if (delIdx > -1) { db.articles.splice(delIdx, 1); }
          jsonResponse(res, { success: true, message: '删除成功' });
          return;

        case pathname.startsWith('/api/articles/') && action === 'like' && method === 'POST':
          const likeArticle = db.articles.find(a => a.id === parseInt(parts[2]));
          if (likeArticle) { likeArticle.likes++; }
          jsonResponse(res, { success: true, data: { likes: likeArticle?.likes || 0 } });
          return;

        // === 项目 ===
        case pathname === '/api/projects' && method === 'GET':
          const { featured } = Object.fromEntries(url.searchParams);
          let projects = db.projects;
          if (featured === '1') projects = projects.filter(p => p.featured === 1);
          jsonResponse(res, { success: true, data: projects });
          return;

        case pathname === '/api/projects' && method === 'POST':
          if (!user) { jsonResponse(res, { success: false, message: '未登录' }, 401); return; }
          const newProject = {
            id: db.projects.length + 1,
            title: sanitizeInput(data.title),
            slug: generateSlug(data.title),
            description: sanitizeInput(data.description),
            content: sanitizeInput(data.content),
            demo_url: data.demo_url,
            github_url: data.github_url,
            tech_stack: data.tech_stack,
            featured: data.featured ? 1 : 0,
            created_at: new Date().toISOString()
          };
          db.projects.unshift(newProject);
          jsonResponse(res, { success: true, data: newProject });
          return;

        case pathname.startsWith('/api/projects/') && parts.length === 3 && method === 'PUT':
          const proj = db.projects.find(p => p.id === parseInt(parts[2]));
          if (proj) {
            Object.assign(proj, { ...data, featured: data.featured ? 1 : 0 });
          }
          jsonResponse(res, { success: true, message: '更新成功' });
          return;

        case pathname.startsWith('/api/projects/') && parts.length === 3 && method === 'DELETE':
          const projIdx = db.projects.findIndex(p => p.id === parseInt(parts[2]));
          if (projIdx > -1) db.projects.splice(projIdx, 1);
          jsonResponse(res, { success: true, message: '删除成功' });
          return;

        // === 收藏 ===
        case pathname === '/api/favorites' && method === 'GET':
          if (!user) { jsonResponse(res, { success: false, message: '未登录' }, 401); return; }
          jsonResponse(res, { success: true, data: db.favorites.filter(f => f.user_id === user.id) });
          return;

        case pathname === '/api/favorites' && method === 'POST':
          if (!user) { jsonResponse(res, { success: false, message: '未登录' }, 401); return; }
          db.favorites.push({ id: db.favorites.length + 1, user_id: user.id, article_id: data.article_id, project_id: data.project_id, created_at: new Date().toISOString() });
          jsonResponse(res, { success: true, message: '收藏成功' });
          return;

        // === 评论 ===
        case pathname === '/api/comments' && method === 'POST':
          if (!user) { jsonResponse(res, { success: false, message: '未登录' }, 401); return; }
          db.comments.push({ id: db.comments.length + 1, article_id: data.article_id, user_id: user.id, content: sanitizeInput(data.content), created_at: new Date().toISOString() });
          jsonResponse(res, { success: true, message: '评论成功' });
          return;

        // === 留言板 ===
        case pathname === '/api/messages' && method === 'GET':
          jsonResponse(res, { success: true, data: db.messages.slice(0, 50) });
          return;

        case pathname === '/api/messages' && method === 'POST':
          db.messages.unshift({ id: db.messages.length + 1, name: sanitizeInput(data.name), email: data.email, content: sanitizeInput(data.content), created_at: new Date().toISOString() });
          jsonResponse(res, { success: true, message: '留言成功' });
          return;

        // === 搜索 ===
        case pathname === '/api/search' && method === 'GET':
          const { q, type = 'all' } = Object.fromEntries(url.searchParams);
          if (!q || q.length < 2) { jsonResponse(res, { success: false, message: '关键词至少2个字符' }, 400); return; }
          const term = q.toLowerCase();
          const results = { articles: [], projects: [] };
          if (type === 'all' || type === 'articles') {
            results.articles = db.articles.filter(a => a.title.toLowerCase().includes(term) || a.excerpt?.toLowerCase().includes(term)).slice(0, 10);
          }
          if (type === 'all' || type === 'projects') {
            results.projects = db.projects.filter(p => p.title.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term)).slice(0, 10);
          }
          jsonResponse(res, { success: true, data: results });
          return;

        // === 统计 ===
        case pathname === '/api/stats' && method === 'GET':
          jsonResponse(res, { success: true, data: {
            articles: db.articles.length,
            projects: db.projects.length,
            comments: db.comments.length,
            users: db.users.length,
            views: db.articles.reduce((sum, a) => sum + (a.views || 0), 0),
            likes: db.articles.reduce((sum, a) => sum + (a.likes || 0), 0),
            messages: db.messages.length
          }});
          return;

        // === AI ===
        case pathname === '/api/ai/config' && method === 'GET':
          const provider = getAIProvider();
          jsonResponse(res, { success: true, data: { current: provider, ...AI_CONFIG.providers[provider] } });
          return;

        case pathname === '/api/ai/chat' && method === 'POST':
          if (!user) { jsonResponse(res, { success: false, message: '未登录' }, 401); return; }
          if (!data.message) { jsonResponse(res, { success: false, message: '消息不能为空' }, 400); return; }
          const response = await chatWithAI(data.message, data.history || []);
          jsonResponse(res, { success: true, data: { response } });
          return;

        // 404
        default:
          jsonResponse(res, { success: false, message: 'API不存在' }, 404);
      }
    } catch (error) {
      console.error('API Error:', error);
      jsonResponse(res, { success: false, message: error.message || '服务器错误' }, 500);
    }
  });
}

server.listen(PORT, () => {
  const provider = getAIProvider();
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🐻 大熊的AI世界 - 服务器已启动                         ║
║                                                           ║
║     本地访问: http://localhost:${PORT}                      ║
║     管理后台: http://localhost:${PORT}/admin.html           ║
║                                                           ║
║     默认账号: bear@example.com / admin123                  ║
║                                                           ║
║     🤖 AI 服务商: ${AI_CONFIG.providers[provider]?.name?.padEnd(18) || provider.padEnd(18)}║
║     状态: ${AI_CONFIG.providers[provider]?.enabled ? '已启用' : '需配置'.padEnd(28)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
