-- Vercel Postgres Database Schema
-- 运行方式：复制到 Vercel Postgres 查询控制台执行

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  bio TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 文章表
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT,
  category VARCHAR(100),
  tags TEXT,
  author VARCHAR(255),
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at DATE DEFAULT CURRENT_DATE
);

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  description TEXT,
  content TEXT,
  demo_url VARCHAR(500),
  github_url VARCHAR(500),
  tech_stack TEXT,
  featured INTEGER DEFAULT 0,
  created_at DATE DEFAULT CURRENT_DATE
);

-- 留言表
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 配置表（存储 API Key 等）
CREATE TABLE IF NOT EXISTS config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初始化默认管理员
INSERT INTO users (username, email, password, bio)
VALUES ('大熊', '834202715@qq.com', 'sv834202715', '全栈AI探索者')
ON CONFLICT (email) DO NOTHING;

-- 初始化配置
INSERT INTO config (key, value) VALUES
('deepseek_api_key', ''),
('ai_model', 'deepseek-chat')
ON CONFLICT (key) DO NOTHING;

-- 初始化示例文章
INSERT INTO articles (title, slug, excerpt, category, author, views, likes, created_at) VALUES
('2024年AI发展回顾与2025年趋势展望', 'ai-2024-review-2025-outlook', '回顾2024年AI领域的重大进展', 'AI教程', '大熊', 150, 12, '2024-01-15'),
('RAG实战：如何构建个人知识库', 'rag-personal-knowledge-base', '利用RAG技术构建知识库', 'AI教程', '大熊', 120, 8, '2024-01-12'),
('AI编程助手对比评测', 'ai-coding-assistant-comparison', 'Copilot、Claude Code、Cline对比', 'AI教程', '大熊', 200, 25, '2024-01-10'),
('AI图像生成工具横评', 'ai-image-generation', 'Midjourney、DALL·E、SD对比', 'AI教程', '大熊', 180, 15, '2024-01-08'),
('ChatGPT提示词工程完全指南', 'chatgpt-prompt-engineering', '掌握提示词工程技巧', 'AI教程', '大熊', 250, 30, '2024-01-05'),
('我的第一个AI项目', 'my-first-ai-project', '开发AI问答机器人历程', '项目案例', '大熊', 300, 45, '2024-01-03')
ON CONFLICT DO NOTHING;

-- 初始化示例项目
INSERT INTO projects (title, slug, description, tech_stack, featured, github_url) VALUES
('Bear AI World', 'bear-ai-world', '个人AI知识分享平台', 'Vercel, Next.js', 1, 'https://github.com/daxiongxiansheng666-boop/bear-ai-world'),
('AI写作助手', 'ai-writing-assistant', '基于GPT的智能写作', 'React, Node.js', 1, ''),
('智能图像识别', 'smart-image-recognition', '物体识别系统', 'Python, PyTorch', 1, '')
ON CONFLICT DO NOTHING;

-- 初始化示例留言
INSERT INTO messages (name, email, content) VALUES
('访客小明', 'xiaoming@example.com', '网站做得真棒！赛博朋克风格很有科技感。'),
('AI爱好者', 'ai_fan@163.com', '大熊哥，AI教程写得非常好，期待更多内容！')
ON CONFLICT DO NOTHING;
