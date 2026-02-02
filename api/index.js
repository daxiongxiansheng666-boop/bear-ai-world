// Vercel Serverless API Handler
// 将所有API请求路由到统一处理

const API_CONFIG = {
  providers: {
    mock: { name: '模拟响应', enabled: true },
    openai: { name: 'OpenAI (GPT)', enabled: false },
    claude: { name: 'Claude', enabled: false },
    clawdbot: { name: 'Clawdbot', enabled: false }
  }
};

// 内存数据库（生产环境建议使用Vercel KV或外部数据库）
let db = {
  users: [{ id: 1, username: '大熊', email: '834202715@qq.com', password: 'sv834202715', bio: '全栈AI探索者 & MCN创业者' }],
  articles: [
    { id: 1, title: '2024年AI发展回顾与2025年趋势展望', slug: 'ai-2024-review-2025-outlook', excerpt: '回顾2024年AI领域的重大进展，GPT-4o、Claude 3、Sora等重磅发布，展望2025年AI发展趋势。', category: 'AI教程', author: '大熊', views: 150, likes: 12, content: '2024年是人工智能发展史上最重要的一年...', created_at: '2024-01-15' },
    { id: 2, title: 'RAG实战：如何构建一个真正的个人知识库', slug: 'rag-personal-knowledge-base-tutorial', excerpt: '利用检索增强生成技术，让AI真正理解你的专业知识。本文手把手教你搭建个人知识库系统。', category: 'AI教程', author: '大熊', views: 120, likes: 8, content: '你是否遇到过ChatGPT不知道你公司的业务细节...', created_at: '2024-01-12' },
    { id: 3, title: '主流AI编程助手对比评测', slug: 'ai-coding-assistant-comparison', excerpt: '三大AI编程工具横向评测，从代码补全、Bug修复、上下文理解等多个维度进行对比。', category: 'AI教程', author: '大熊', views: 200, likes: 25, content: '作为程序员，AI编程助手已经成为日常开发的必备工具...', created_at: '2024-01-10' },
    { id: 4, title: 'AI图像生成工具横评', slug: 'ai-image-generation-tools-comparison', excerpt: '三大AI图像生成工具全面对比，从生成质量、使用成本、易用性等维度分析。', category: 'AI教程', author: '大熊', views: 180, likes: 15, content: 'AI图像生成在过去一年取得了惊人进步...', created_at: '2024-01-08' },
    { id: 5, title: 'ChatGPT提示词工程完全指南', slug: 'chatgpt-prompt-engineering-guide', excerpt: '掌握提示词工程的核心技巧，让AI输出更精准、更高效。', category: 'AI教程', author: '大熊', views: 250, likes: 30, content: '提示词工程是AI时代的必备技能...', created_at: '2024-01-05' },
    { id: 6, title: '我的第一个AI项目', slug: 'my-first-ai-project', excerpt: '分享开发基于大语言模型的问答机器人完整历程。', category: '项目案例', author: '大熊', views: 300, likes: 45, content: '从零开始搭建一个AI问答机器人...', created_at: '2024-01-03' }
  ],
  projects: [
    { id: 1, title: 'AI写作助手', slug: 'ai-writing-assistant', description: '基于GPT的智能写作工具', tech_stack: 'React, Node.js', featured: 1 },
    { id: 2, title: '智能图像识别系统', slug: 'smart-image-recognition', description: '支持多种物体识别的视觉AI系统', tech_stack: 'Python, PyTorch', featured: 1 },
    { id: 3, title: 'AI聊天机器人平台', slug: 'ai-chat-platform', description: '支持多模型切换的对话平台', tech_stack: 'Vue3, FastAPI', featured: 0 }
  ],
  comments: [],
  messages: [
    { id: 1, name: '访客小明', content: '网站做得真棒！', created_at: '2024-01-15' },
    { id: 2, name: 'AI爱好者', content: '大熊哥，AI教程写得非常好！', created_at: '2024-01-12' }
  ],
  favorites: []
};

// 工具函数
function generateToken(user) {
  const payload = { id: user.id, username: user.username };
  return 'Bearer ' + Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(authHeader) {
  try {
    if (authHeader?.startsWith('Bearer ')) {
      const payload = JSON.parse(Buffer.from(authHeader.slice(7), 'base64').toString());
      return { valid: true, user: payload };
    }
  } catch (e) {}
  return { valid: false };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function sanitize(str) {
  return str?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') || '';
}

// AI响应生成器
function getAIResponse(message) {
  const responses = [
    `你好！关于"${message}"，这是一个很有趣的问题。让我来详细解答...`,
    `感谢你的提问！关于"${message}"，我可以提供以下建议：\n\n1. 首先，明确你的目标\n2. 选择合适的工具\n3. 持续学习和实践\n\n希望这对你有帮助！`,
    `这是一个很好的问题！关于"${message}"，我认为关键在于理解底层原理，然后通过实践来巩固知识。`
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// 主处理函数
export default async function handler(req) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const pathname = url.pathname.replace('/api/', '');
  const method = req.method;
  const parts = pathname.split('/').filter(Boolean);

  // CORS
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  try {
    // 解析请求体
    let data = {};
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        data = await req.json();
      } catch (e) {}
    }

    const authHeader = req.headers.get('authorization');
    const userResult = verifyToken(authHeader);
    const user = userResult.valid ? userResult.user : null;

    // 路由处理
    if (pathname === 'auth/login' && method === 'POST') {
      const foundUser = db.users.find(u => u.email === data.email);
      if (foundUser && data.password === foundUser.password) {
        return jsonResponse({ success: true, data: { token: generateToken(foundUser), user: { id: foundUser.id, username: foundUser.username, email: foundUser.email } } });
      }
      return jsonResponse({ success: false, message: '邮箱或密码错误' }, 400);
    }

    if (pathname === 'auth/register' && method === 'POST') {
      if (db.users.find(u => u.email === data.email)) {
        return jsonResponse({ success: false, message: '邮箱已存在' }, 400);
      }
      const newUser = { id: db.users.length + 1, username: data.username, email: data.email, password: data.password, bio: '' };
      db.users.push(newUser);
      return jsonResponse({ success: true, data: { token: generateToken(newUser), user: { id: newUser.id, username: newUser.username, email: newUser.email } } });
    }

    if (pathname === 'auth/me' && method === 'GET' && user) {
      const foundUser = db.users.find(u => u.id === user.id);
      return jsonResponse({ success: true, data: foundUser ? { id: foundUser.id, username: foundUser.username, email: foundUser.email, bio: foundUser.bio } : null });
    }

    if (pathname === 'users/profile' && method === 'PUT' && user) {
      const foundUser = db.users.find(u => u.id === user.id);
      if (foundUser) foundUser.bio = data.bio || foundUser.bio;
      return jsonResponse({ success: true, message: '更新成功' });
    }

    if (pathname === 'users/password' && method === 'PUT' && user) {
      const foundUser = db.users.find(u => u.id === user.id);
      if (foundUser && foundUser.password === data.currentPassword) {
        foundUser.password = data.newPassword;
        return jsonResponse({ success: true, message: '密码已修改' });
      }
      return jsonResponse({ success: false, message: '当前密码错误' }, 400);
    }

    // 文章
    if (pathname === 'articles' && method === 'GET') {
      const { category, search } = Object.fromEntries(url.searchParams);
      let result = [...db.articles];
      if (category && category !== 'all') result = result.filter(a => a.category === category);
      if (search) {
        const term = search.toLowerCase();
        result = result.filter(a => a.title.toLowerCase().includes(term) || a.excerpt?.toLowerCase().includes(term));
      }
      return jsonResponse({ success: true, data: { articles: result, total: result.length } });
    }

    if (pathname === 'articles' && method === 'POST' && user) {
      const newArticle = {
        id: db.articles.length + 1,
        title: sanitize(data.title),
        slug: data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
        content: sanitize(data.content),
        excerpt: sanitize(data.excerpt),
        category: data.category,
        tags: data.tags,
        author: user.username,
        views: 0,
        likes: 0,
        created_at: new Date().toISOString().split('T')[0]
      };
      db.articles.unshift(newArticle);
      return jsonResponse({ success: true, data: newArticle });
    }

    // 单篇文章操作
    if (parts[0] === 'articles' && parts.length === 2 && method === 'GET') {
      const article = db.articles.find(a => a.slug === parts[1]);
      if (article) {
        article.views++;
        return jsonResponse({ success: true, data: { article, comments: db.comments.filter(c => c.article_id === article.id) } });
      }
      return jsonResponse({ success: false, message: '文章不存在' }, 404);
    }

    if (parts[0] === 'articles' && parts.length === 3 && parts[2] === 'like' && method === 'POST') {
      const article = db.articles.find(a => a.id === parseInt(parts[1]));
      if (article) article.likes++;
      return jsonResponse({ success: true, data: { likes: article?.likes || 0 } });
      return jsonResponse({ success: false, message: '未登录' }, 401);
    }

    // 项目
    if (pathname === 'projects' && method === 'GET') {
      const { featured } = Object.fromEntries(url.searchParams);
      let result = [...db.projects];
      if (featured === '1') result = result.filter(p => p.featured === 1);
      return jsonResponse({ success: true, data: result });
    }

    if (pathname === 'projects' && method === 'POST' && user) {
      const newProject = {
        id: db.projects.length + 1,
        title: sanitize(data.title),
        slug: data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
        description: sanitize(data.description),
        content: sanitize(data.content),
        tech_stack: data.tech_stack,
        featured: data.featured ? 1 : 0,
        created_at: new Date().toISOString().split('T')[0]
      };
      db.projects.unshift(newProject);
      return jsonResponse({ success: true, data: newProject });
    }

    // 收藏
    if (pathname === 'favorites' && method === 'GET' && user) {
      return jsonResponse({ success: true, data: db.favorites.filter(f => f.user_id === user.id) });
    }

    if (pathname === 'favorites' && method === 'POST' && user) {
      db.favorites.push({ id: db.favorites.length + 1, user_id: user.id, article_id: data.article_id, project_id: data.project_id });
      return jsonResponse({ success: true, message: '收藏成功' });
    }

    // 评论
    if (pathname === 'comments' && method === 'POST' && user) {
      db.comments.push({ id: db.comments.length + 1, article_id: data.article_id, user_id: user.id, content: sanitize(data.content), created_at: new Date().toISOString() });
      return jsonResponse({ success: true, message: '评论成功' });
    }

    // 留言
    if (pathname === 'messages' && method === 'GET') {
      return jsonResponse({ success: true, data: db.messages.slice(0, 50) });
    }

    if (pathname === 'messages' && method === 'POST') {
      db.messages.unshift({ id: db.messages.length + 1, name: sanitize(data.name), email: data.email, content: sanitize(data.content), created_at: new Date().toISOString() });
      return jsonResponse({ success: true, message: '留言成功' });
    }

    // 搜索
    if (pathname === 'search' && method === 'GET') {
      const { q, type } = Object.fromEntries(url.searchParams);
      if (!q || q.length < 2) return jsonResponse({ success: false, message: '关键词至少2个字符' }, 400);
      const term = q.toLowerCase();
      const results = { articles: [], projects: [] };
      if (!type || type === 'all' || type === 'articles') {
        results.articles = db.articles.filter(a => a.title.toLowerCase().includes(term) || a.excerpt?.toLowerCase().includes(term)).slice(0, 10);
      }
      if (!type || type === 'all' || type === 'projects') {
        results.projects = db.projects.filter(p => p.title.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term)).slice(0, 10);
      }
      return jsonResponse({ success: true, data: results });
    }

    // 统计
    if (pathname === 'stats' && method === 'GET') {
      return jsonResponse({ success: true, data: {
        articles: db.articles.length,
        projects: db.projects.length,
        comments: db.comments.length,
        users: db.users.length,
        views: db.articles.reduce((sum, a) => sum + (a.views || 0), 0),
        likes: db.articles.reduce((sum, a) => sum + (a.likes || 0), 0),
        messages: db.messages.length
      }});
    }

    // AI
    if (pathname === 'ai/config' && method === 'GET') {
      return jsonResponse({ success: true, data: { ...API_CONFIG.providers.mock, current: 'mock' } });
    }

    if (pathname === 'ai/chat' && method === 'POST' && user) {
      if (!data.message) return jsonResponse({ success: false, message: '消息不能为空' }, 400);
      return jsonResponse({ success: true, data: { response: getAIResponse(data.message) } });
    }

    return jsonResponse({ success: false, message: 'API不存在' }, 404);
  } catch (error) {
    return jsonResponse({ success: false, message: error.message || '服务器错误' }, 500);
  }
}
