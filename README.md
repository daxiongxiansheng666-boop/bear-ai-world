# 🐻 大熊的AI世界

> 个人博客 + AI工具平台 + 知识库

## 简介

大熊的AI世界是一个基于赛博朋克风格的个人网站，包含：
- 📝 **博客系统** - AI教程、项目案例、个人动态
- 🛠️ **项目展示** - 展示AI项目案例
- 🤖 **AI工具平台** - 集成AI对话功能
- 📚 **知识库** - AI知识体系整理

## 技术栈

- 前端：原生 HTML/CSS/JavaScript
- 后端：Node.js (Express) 或 纯Node.js
- 数据库：SQLite / 内存存储
- 部署：Vercel + GitHub

## 快速开始

### 本地开发

```bash
# 克隆项目
git clone https://github.com/你的用户名/bear-ai-world.git
cd bear-ai-world

# 启动服务器（无需安装依赖）
node server/simple-server.js

# 或使用完整版（需要安装依赖）
npm install
npm start

# 访问 http://localhost:3000
```

### 部署到 Vercel

1. Fork 本项目或上传到你的 GitHub
2. 登录 [Vercel](https://vercel.com)
3. 点击 "Add New Project"
4. 选择你的 GitHub 仓库
5. 配置：
   - Framework Preset: Other
   - Build Command: (留空)
   - Output Directory: `public`
6. 点击 Deploy！

## AI 服务商配置

在 Vercel 的 Environment Variables 中添加：

| 变量名 | 值 |
|-------|-----|
| `AI_PROVIDER` | `mock` / `openai` / `claude` / `clawdbot` |
| `OPENAI_API_KEY` | 你的OpenAI API Key |
| `CLAUDE_API_KEY` | 你的Claude API Key |

## 目录结构

```
bear-ai-world/
├── public/              # 前端静态文件
│   ├── index.html       # 首页
│   ├── blog.html        # 博客
│   ├── admin.html       # 管理后台
│   ├── css/             # 样式
│   └── js/              # 脚本
├── server/              # 后端
│   ├── simple-server.js # 纯Node.js版
│   └── server.js        # Express版
├── .env.example         # 环境变量示例
└── vercel.json          # Vercel配置
```

## 功能特性

- ✅ 赛博朋克风格界面
- ✅ 粒子动画背景
- ✅ 用户系统（注册/登录）
- ✅ 文章CRUD + 点赞 + 搜索
- ✅ 项目管理
- ✅ 评论/留言
- ✅ AI对话（支持多服务商切换）
- ✅ 响应式设计

## 截图

![首页预览](./docs/home.png)

## License

MIT License

## 作者

**大熊**

- GitHub: [@你的用户名](https://github.com/你的用户名)
- Email: bear@example.com

---

*如果你喜欢这个项目，请给我一个 ⭐ Star！*
