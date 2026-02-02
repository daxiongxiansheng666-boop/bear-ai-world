/**
 * 大熊的AI世界 - 完整后端服务器
 * 功能：用户系统、文章管理、项目管理、评论系统、AI对话
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { chatWithAI, getProviderInfo, testConnection } = require('./ai-service');

// 配置
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bear-ai-world-secret-key-2024';

// 中间件
const app = express();

// CORS 配置
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// 响应压缩
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务（带缓存）
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: '1d',
  etag: false
}));

// 数据库初始化
const db = new Database(path.join(__dirname, 'database.sqlite'));

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT '/images/default-avatar.png',
    bio TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    cover_image TEXT,
    category TEXT NOT NULL,
    tags TEXT,
    author_id INTEGER NOT NULL,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    content TEXT,
    image TEXT,
    demo_url TEXT,
    github_url TEXT,
    tech_stack TEXT,
    featured INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER,
    project_id INTEGER,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    parent_id INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    article_id INTEGER,
    project_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (article_id) REFERENCES articles(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    UNIQUE(user_id, article_id, project_id)
  );

  CREATE TABLE IF NOT EXISTS chat_histories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    messages TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 插入示例数据
const existingUser = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (existingUser.count === 0) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, email, password, bio) VALUES (?, ?, ?, ?)').run(
    '大熊', 'bear@example.com', hashedPassword, '热爱AI与技术的探索者，致力于分享AI知识和工具'
  );

  const sampleArticles = [
    {
      title: 'ChatGPT提示词工程完全指南',
      slug: 'chatgpt-prompt-engineering-guide',
      excerpt: '掌握提示词工程的核心技巧，让AI对话更高效',
      content: `# ChatGPT提示词工程完全指南

提示词工程（Prompt Engineering）是与AI模型高效沟通的关键技能。

## 什么是提示词工程？
提示词工程是指设计和优化输入给AI模型的文本提示，以获得最佳输出的过程。

## 核心原则

### 1. 明确具体
模糊的提示词会导致模糊的回答。

### 2. 提供上下文
给AI足够的背景信息。

### 3. 分步指令
复杂任务分解为多个步骤。`,
      category: 'AI教程'
    },
    {
      title: 'AI图像生成工具横向评测',
      slug: 'ai-image-generation-tools-comparison',
      excerpt: '主流AI绘图工具全面对比，助你选择最适合的工具',
      content: `# AI图像生成工具横向评测

随着AI图像生成技术的快速发展，市面上出现了众多优秀工具。

## 参评工具

### Midjourney
- 优点：艺术感强，社区活跃
- 缺点：需要Discord，使用成本较高

### Stable Diffusion
- 优点：开源免费，本地部署
- 缺点：需要一定技术基础`,
      category: '其他'
    },
    {
      title: '我的第一个AI项目：智能问答机器人',
      slug: 'my-first-ai-project-qa-bot',
      excerpt: '分享开发基于大语言模型的问答机器人的完整过程',
      content: `# 我的第一个AI项目：智能问答机器人

本文分享我开发智能问答机器人的完整历程。

## 项目背景
希望构建一个能理解上下文的多轮对话机器人。

## 技术栈
- 前端：React + TypeScript
- 后端：Node.js + Express
- AI：OpenAI API (GPT-3.5)
- 数据库：MongoDB`,
      category: '项目案例'
    },
    {
      title: '2024年AI发展回顾与展望',
      slug: 'ai-2024-review',
      excerpt: '回顾2024年AI领域的重大进展，展望未来趋势',
      content: `# 2024年AI发展回顾与展望

2024年是AI技术飞速发展的一年。

## 年度大事件

### GPT-4.5发布
更强大的多模态能力，更低的成本。

### 开源模型崛起
Llama、Mistral等开源模型性能大幅提升。`,
      category: '个人动态'
    }
  ];

  const stmt = db.prepare('INSERT INTO articles (title, slug, excerpt, content, category, author_id) VALUES (?, ?, ?, ?, ?, 1)');
  sampleArticles.forEach(article => {
    stmt.run(article.title, article.slug, article.excerpt, article.content, article.category);
  });

  const sampleProjects = [
    {
      title: 'AI写作助手',
      slug: 'ai-writing-assistant',
      description: '基于GPT的智能写作工具，支持多种写作场景',
      content: '这是一个基于OpenAI API开发的智能写作助手',
      demo_url: '#',
      github_url: '#',
      tech_stack: 'React, Node.js, OpenAI API',
      featured: 1
    },
    {
      title: '智能图像识别系统',
      slug: 'smart-image-recognition',
      description: '支持多种物体识别的视觉AI系统',
      content: '使用YOLOv8开发的物体检测系统',
      demo_url: '#',
      github_url: '#',
      tech_stack: 'Python, PyTorch',
      featured: 1
    },
    {
      title: 'AI聊天机器人平台',
      slug: 'ai-chat-platform',
      description: '支持多模型切换的对话平台',
      content: '整合多个大语言模型的聊天平台',
      demo_url: '#',
      github_url: '#',
      tech_stack: 'Vue3, FastAPI, LangChain',
      featured: 0
    }
  ];

  const projStmt = db.prepare('INSERT INTO projects (title, slug, description, content, demo_url, github_url, tech_stack, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  sampleProjects.forEach(project => {
    projStmt.run(project.title, project.slug, project.description, project.content, project.demo_url, project.github_url, project.tech_stack, project.featured);
  });
}

// ==================== 中间件 ====================

// JWT 认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// 输入清理中间件
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        // 简单清理：移除可能的恶意脚本
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '');
      }
    }
  }
  next();
};

// 通用响应函数
const sendResponse = (res, success, data, message = '') => {
  res.json({ success, data, message });
};

// ==================== 认证路由 ====================

app.post('/api/auth/register', sanitizeInput, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return sendResponse(res, false, null, '请填写完整信息');
    }

    if (password.length < 6) {
      return sendResponse(res, false, null, '密码至少需要6位');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    const result = stmt.run(username, email, hashedPassword);

    const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '7d' });

    sendResponse(res, true, { token, user: { id: result.lastInsertRowid, username, email } }, '注册成功');
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      sendResponse(res, false, null, '用户名或邮箱已存在');
    } else {
      sendResponse(res, false, null, '注册失败');
    }
  }
});

app.post('/api/auth/login', sanitizeInput, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return sendResponse(res, false, null, '邮箱或密码错误');
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    sendResponse(res, true, {
      token,
      user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, bio: user.bio }
    }, '登录成功');
  } catch (error) {
    sendResponse(res, false, null, '登录失败');
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, email, avatar, bio, created_at FROM users WHERE id = ?').get(req.user.id);
  sendResponse(res, true, user);
});

app.put('/api/users/profile', authenticateToken, sanitizeInput, (req, res) => {
  const { bio, avatar } = req.body;
  db.prepare('UPDATE users SET bio = ?, avatar = ? WHERE id = ?').run(bio, avatar, req.user.id);
  sendResponse(res, true, null, '资料更新成功');
});

app.put('/api/users/password', authenticateToken, sanitizeInput, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendResponse(res, false, null, '请填写完整信息');
    }

    if (newPassword.length < 6) {
      return sendResponse(res, false, null, '新密码至少需要6位');
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return sendResponse(res, false, null, '当前密码错误');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);

    sendResponse(res, true, null, '密码修改成功');
  } catch (error) {
    sendResponse(res, false, null, '密码修改失败');
  }
});

// ==================== 文章路由 ====================

app.get('/api/articles', (req, res) => {
  const { category, search, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT a.*, u.username as author FROM articles a JOIN users u ON a.author_id = u.id WHERE a.is_published = 1';
  const params = [];

  // 分类筛选
  if (category && category !== 'all') {
    query += ' AND a.category = ?';
    params.push(category);
  }

  // 搜索
  if (search) {
    query += ' AND (a.title LIKE ? OR a.excerpt LIKE ? OR a.content LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const articles = db.prepare(query).all(...params);

  // 获取总数
  let countQuery = 'SELECT COUNT(*) as count FROM articles WHERE is_published = 1';
  const countParams = [];
  if (category && category !== 'all') {
    countQuery += ' AND category = ?';
    countParams.push(category);
  }
  if (search) {
    countQuery += ' AND (title LIKE ? OR excerpt LIKE ? OR content LIKE ?)';
    const searchTerm = `%${search}%`;
    countParams.push(searchTerm, searchTerm, searchTerm);
  }
  const total = db.prepare(countQuery).get(...countParams);

  sendResponse(res, true, { articles, total: total.count, page: parseInt(page), pages: Math.ceil(total.count / limit) });
});

app.get('/api/articles/:slug', (req, res) => {
  const article = db.prepare(`
    SELECT a.*, u.username as author, u.avatar as author_avatar
    FROM articles a
    JOIN users u ON a.author_id = u.id
    WHERE a.slug = ?
  `).get(req.params.slug);

  if (!article) return sendResponse(res, false, null, '文章不存在');

  db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(article.id);

  const comments = db.prepare(`
    SELECT c.*, u.username, u.avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.article_id = ?
    ORDER BY c.created_at DESC
  `).all(article.id);

  sendResponse(res, true, { article, comments });
});

app.post('/api/articles', authenticateToken, sanitizeInput, (req, res) => {
  const { title, content, excerpt, category, tags, cover_image } = req.body;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

  try {
    const result = db.prepare(`
      INSERT INTO articles (title, slug, content, excerpt, category, tags, cover_image, author_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, slug, content, excerpt, category, tags, cover_image, req.user.id);

    sendResponse(res, true, { id: result.lastInsertRowid, slug }, '发布成功');
  } catch (error) {
    sendResponse(res, false, null, '发布失败');
  }
});

app.put('/api/articles/:id', authenticateToken, sanitizeInput, (req, res) => {
  const { title, content, excerpt, category, tags, cover_image } = req.body;

  db.prepare(`
    UPDATE articles SET title = ?, content = ?, excerpt = ?, category = ?, tags = ?, cover_image = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND author_id = ?
  `).run(title, content, excerpt, category, tags, cover_image, req.params.id, req.user.id);

  sendResponse(res, true, null, '更新成功');
});

app.delete('/api/articles/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM articles WHERE id = ? AND author_id = ?').run(req.params.id, req.user.id);
  sendResponse(res, true, null, '删除成功');
});

// 点赞
app.post('/api/articles/:id/like', authenticateToken, (req, res) => {
  db.prepare('UPDATE articles SET likes = likes + 1 WHERE id = ?').run(req.params.id);
  const article = db.prepare('SELECT likes FROM articles WHERE id = ?').get(req.params.id);
  sendResponse(res, true, { likes: article.likes }, '点赞成功');
});

// ==================== 项目路由 ====================

app.get('/api/projects', (req, res) => {
  const { featured } = req.query;
  let query = 'SELECT * FROM projects';
  const params = [];

  if (featured === '1') {
    query += ' WHERE featured = 1';
  }

  query += ' ORDER BY created_at DESC';
  const projects = db.prepare(query).all(...params);
  sendResponse(res, true, projects);
});

app.get('/api/projects/:slug', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(req.params.slug);
  if (!project) return sendResponse(res, false, null, '项目不存在');
  sendResponse(res, true, project);
});

app.post('/api/projects', authenticateToken, sanitizeInput, (req, res) => {
  const { title, description, content, demo_url, github_url, tech_stack, featured } = req.body;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

  try {
    const result = db.prepare(`
      INSERT INTO projects (title, slug, description, content, demo_url, github_url, tech_stack, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, slug, description, content, demo_url, github_url, tech_stack, featured ? 1 : 0);

    sendResponse(res, true, { id: result.lastInsertRowid, slug }, '创建成功');
  } catch (error) {
    sendResponse(res, false, null, '创建失败');
  }
});

app.put('/api/projects/:id', authenticateToken, sanitizeInput, (req, res) => {
  const { title, description, content, demo_url, github_url, tech_stack, featured } = req.body;

  db.prepare(`
    UPDATE projects SET title = ?, description = ?, content = ?, demo_url = ?, github_url = ?, tech_stack = ?, featured = ?
    WHERE id = ?
  `).run(title, description, content, demo_url, github_url, tech_stack, featured ? 1 : 0, req.params.id);

  sendResponse(res, true, null, '更新成功');
});

app.delete('/api/projects/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  sendResponse(res, true, null, '删除成功');
});

// ==================== 收藏路由 ====================

app.get('/api/favorites', authenticateToken, (req, res) => {
  const favorites = db.prepare(`
    SELECT f.*, a.title as article_title, a.slug as article_slug, p.title as project_title, p.slug as project_slug
    FROM favorites f
    LEFT JOIN articles a ON f.article_id = a.id
    LEFT JOIN projects p ON f.project_id = p.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(req.user.id);

  sendResponse(res, true, favorites);
});

app.post('/api/favorites', authenticateToken, (req, res) => {
  const { article_id, project_id } = req.body;

  try {
    db.prepare('INSERT OR IGNORE INTO favorites (user_id, article_id, project_id) VALUES (?, ?, ?)').run(req.user.id, article_id || null, project_id || null);
    sendResponse(res, true, null, '收藏成功');
  } catch (error) {
    sendResponse(res, false, null, '收藏失败');
  }
});

app.delete('/api/favorites/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM favorites WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  sendResponse(res, true, null, '取消收藏');
});

// ==================== 评论路由 ====================

app.post('/api/comments', authenticateToken, sanitizeInput, (req, res) => {
  const { article_id, project_id, content, parent_id } = req.body;

  const result = db.prepare(`
    INSERT INTO comments (article_id, project_id, user_id, content, parent_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(article_id, project_id, req.user.id, content, parent_id || 0);

  sendResponse(res, true, { id: result.lastInsertRowid }, '评论成功');
});

app.delete('/api/comments/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM comments WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  sendResponse(res, true, null, '删除成功');
});

// ==================== 留言板路由 ====================

app.get('/api/messages', (req, res) => {
  const messages = db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT 50').all();
  sendResponse(res, true, messages);
});

app.post('/api/messages', sanitizeInput, (req, res) => {
  const { name, email, content } = req.body;

  if (!name || !email || !content) {
    return sendResponse(res, false, null, '请填写完整信息');
  }

  db.prepare('INSERT INTO messages (name, email, content) VALUES (?, ?, ?)').run(name, email, content);
  sendResponse(res, true, null, '留言成功');
});

// ==================== 搜索路由 ====================

app.get('/api/search', (req, res) => {
  const { q, type = 'all' } = req.query;

  if (!q || q.trim().length < 2) {
    return sendResponse(res, false, null, '搜索关键词至少2个字符');
  }

  const searchTerm = `%${q}%`;
  const results = { articles: [], projects: [] };

  if (type === 'all' || type === 'articles') {
    results.articles = db.prepare(`
      SELECT id, title, slug, excerpt, category, created_at
      FROM articles
      WHERE is_published = 1 AND (title LIKE ? OR excerpt LIKE ? OR tags LIKE ?)
      ORDER BY created_at DESC
      LIMIT 10
    `).all(searchTerm, searchTerm, searchTerm);
  }

  if (type === 'all' || type === 'projects') {
    results.projects = db.prepare(`
      SELECT id, title, slug, description, tech_stack, created_at
      FROM projects
      WHERE title LIKE ? OR description LIKE ? OR tech_stack LIKE ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(searchTerm, searchTerm, searchTerm);
  }

  sendResponse(res, true, results);
});

// ==================== 统计路由 ====================

app.get('/api/stats', (req, res) => {
  const articles = db.prepare('SELECT COUNT(*) as count FROM articles WHERE is_published = 1').get();
  const projects = db.prepare('SELECT COUNT(*) as count FROM projects').get();
  const comments = db.prepare('SELECT COUNT(*) as count FROM comments').get();
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const views = db.prepare('SELECT SUM(views) as total FROM articles').get();
  const likes = db.prepare('SELECT SUM(likes) as total FROM articles').get();
  const messages = db.prepare('SELECT COUNT(*) as count FROM messages').get();

  sendResponse(res, true, {
    articles: articles.count,
    projects: projects.count,
    comments: comments.count,
    users: users.count,
    views: views.total || 0,
    likes: likes.total || 0,
    messages: messages.count
  });
});

// ==================== AI 路由 ====================

app.get('/api/ai/config', (req, res) => {
  const info = getProviderInfo();
  sendResponse(res, true, info);
});

app.post('/api/ai/test', authenticateToken, async (req, res) => {
  const { provider } = req.body;
  const result = await testConnection(provider);
  sendResponse(res, result.success, null, result.message);
});

app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  const { message, history, system_prompt } = req.body;

  if (!message || message.trim().length === 0) {
    return sendResponse(res, false, null, '消息不能为空');
  }

  try {
    // 保存对话历史
    const historyStr = JSON.stringify(history || []);
    db.prepare('INSERT INTO chat_histories (user_id, messages) VALUES (?, ?)').run(req.user.id, historyStr);

    // 调用 AI
    const response = await chatWithAI(message, history || [], { systemPrompt: system_prompt });

    sendResponse(res, true, { response }, '对话成功');
  } catch (error) {
    console.error('AI Chat Error:', error);
    sendResponse(res, false, null, error.message || 'AI服务暂时不可用');
  }
});

// ==================== 文件上传 ====================

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, '../public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB 限制

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return sendResponse(res, false, null, '上传失败');
  sendResponse(res, true, { url: `/uploads/${req.file.filename}` });
});

// ==================== 启动服务器 ====================

app.listen(PORT, () => {
  const aiInfo = getProviderInfo();
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🐻 大熊的AI世界 - 服务器已启动                         ║
║                                                           ║
║     本地访问: http://localhost:${PORT}                      ║
║                                                           ║
║     默认账号: bear@example.com / admin123                  ║
║                                                           ║
║     🤖 AI 服务商: ${aiInfo.name.padEnd(20)}          ║
║     状态: ${aiInfo.enabled ? '已启用' : '未启用'.padEnd(25)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
