/**
 * 大熊的AI世界 - 主JavaScript
 */

import { login, register, getCurrentUser, logout, getStats, getArticles, getProjects, sendAIMessage, createComment, getMessages, createMessage } from './api.js';

// 全局状态
let currentUser = null;
let chatCount = 0;

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initNavbar();
  initTabs();
  initChat();
  checkAuth();
  loadStats();
  loadLatestArticles();
  loadFeaturedProjects();
  initMessageForm();
});

// ==================== 粒子背景 ====================

function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationId;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.size = Math.random() * 2 + 1;
      this.opacity = Math.random() * 0.5 + 0.2;
      this.hue = Math.random() * 60 + 160; // Cyan to purple range
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
        this.reset();
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 100%, 70%, ${this.opacity})`;
      ctx.fill();
    }
  }

  function createParticles() {
    particles = [];
    const count = Math.min(window.innerWidth / 10, 100);
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.update();
      p.draw();
    });

    // Draw connections
    particles.forEach((p1, i) => {
      particles.slice(i + 1).forEach(p2 => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          const opacity = (1 - distance / 150) * 0.3;
          ctx.strokeStyle = `rgba(0, 240, 255, ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
    });

    animationId = requestAnimationFrame(animate);
  }

  createParticles();
  animate();

  window.addEventListener('resize', () => {
    cancelAnimationFrame(animationId);
    createParticles();
    animate();
  });
}

// ==================== 导航栏 ====================

function initNavbar() {
  const navbar = document.getElementById('navbar');
  const mobileToggle = document.getElementById('mobileToggle');
  const navLinks = document.getElementById('navLinks');

  // 滚动效果
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // 移动端菜单
  mobileToggle?.addEventListener('click', () => {
    mobileToggle.classList.toggle('active');
    navLinks.classList.toggle('active');
  });

  // 点击链接关闭移动端菜单
  navLinks?.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-link')) {
      mobileToggle.classList.remove('active');
      navLinks.classList.remove('active');
    }
  });

  // 更新导航状态
  updateNavAuth();
}

// ==================== 认证状态 ====================

async function checkAuth() {
  const token = localStorage.getItem('bear_ai_token');
  if (token) {
    try {
      currentUser = await getCurrentUser();
      updateNavAuth();
    } catch (e) {
      localStorage.removeItem('bear_ai_token');
    }
  }
}

function updateNavAuth() {
  const navActions = document.getElementById('navActions');
  if (!navActions) return;

  if (currentUser) {
    navActions.innerHTML = `
      <div class="user-menu">
        <button class="user-avatar-btn">${currentUser.username[0].toUpperCase()}</button>
        <div class="user-dropdown">
          <a href="/profile.html">👤 个人中心</a>
          <a href="#" onclick="handleLogout(); return false;">🚪 退出登录</a>
        </div>
      </div>
    `;
  } else {
    navActions.innerHTML = `
      <a href="/login.html" class="btn btn-ghost">登录</a>
      <a href="/register.html" class="btn btn-primary">注册</a>
    `;
  }
}

window.handleLogout = function() {
  logout();
  currentUser = null;
  updateNavAuth();
  showToast('已退出登录', 'success');
};

// ==================== 统计加载 ====================

async function loadStats() {
  try {
    const data = await getStats();
    const heroStats = document.getElementById('heroStats');
    if (heroStats && data.success) {
      heroStats.innerHTML = `
        <div class="hero-stat">
          <div class="hero-stat-value" data-count="${data.data.articles}">0</div>
          <div class="hero-stat-label">篇文章</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-value" data-count="${data.data.projects}">0</div>
          <div class="hero-stat-label">个项目</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-value" data-count="${data.data.views}">0</div>
          <div class="hero-stat-label">次阅读</div>
        </div>
      `;
      animateCounters();
    }
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
}

function animateCounters() {
  const counters = document.querySelectorAll('.hero-stat-value[data-count]');
  counters.forEach(counter => {
    const target = parseInt(counter.dataset.count);
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        counter.textContent = formatNumber(target);
        clearInterval(timer);
      } else {
        counter.textContent = formatNumber(Math.floor(current));
      }
    }, 16);
  });
}

function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

// ==================== 文章加载 ====================

async function loadLatestArticles(category = 'all') {
  const container = document.getElementById('latestArticles');
  if (!container) return;

  try {
    const params = category !== 'all' ? { category } : {};
    const data = await getArticles(params);
    container.innerHTML = data.data.articles.map(article => createArticleCard(article)).join('');

    // 添加动画
    container.querySelectorAll('.card').forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      setTimeout(() => {
        card.style.transition = 'all 0.5s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, i * 100);
    });
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>加载文章失败</p></div>';
  }
}

function createArticleCard(article) {
  const date = new Date(article.created_at).toLocaleDateString('zh-CN');
  return `
    <article class="card article-card animate-on-scroll">
      <div class="article-card-image" style="background: linear-gradient(135deg, rgba(0,240,255,0.1), rgba(255,0,255,0.1)); display: flex; align-items: center; justify-content: center; font-size: 3rem;">
        📄
      </div>
      <span class="article-card-category">${article.category}</span>
      <h3 class="article-card-title">
        <a href="/article.html?slug=${article.slug}">${article.title}</a>
      </h3>
      <p class="article-card-excerpt">${article.excerpt || ''}</p>
      <div class="article-card-meta">
        <span>👤 ${article.author}</span>
        <span>📅 ${date}</span>
        <span>👁 ${article.views || 0}</span>
      </div>
    </article>
  `;
}

// ==================== 标签页 ====================

function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadLatestArticles(tab.dataset.category);
    });
  });
}

// ==================== 项目加载 ====================

async function loadFeaturedProjects() {
  const container = document.getElementById('featuredProjects');
  if (!container) return;

  try {
    const data = await getProjects({ featured: '1' });
    container.innerHTML = data.data.map(project => createProjectCard(project)).join('');

    container.querySelectorAll('.card').forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      setTimeout(() => {
        card.style.transition = 'all 0.5s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, i * 150);
    });
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>加载项目失败</p></div>';
  }
}

function createProjectCard(project) {
  const techStack = project.tech_stack ? project.tech_stack.split(',').map(t => t.trim()) : [];
  return `
    <div class="card project-card animate-on-scroll">
      <div class="project-card-image" style="background: linear-gradient(135deg, rgba(0,240,255,0.1), rgba(255,0,255,0.1)); display: flex; align-items: center; justify-content: center; font-size: 3rem;">
        🛠️
      </div>
      <h3 class="article-card-title">${project.title}</h3>
      <p class="article-card-excerpt">${project.description || ''}</p>
      <div class="project-card-tags">
        ${techStack.map(tech => `<span class="project-tag">${tech}</span>`).join('')}
      </div>
      <div class="project-card-links">
        <a href="/projects.html" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">查看详情</a>
        <a href="${project.github_url || '#'}" target="_blank" class="btn btn-ghost" style="padding: 0.5rem 1rem; font-size: 0.85rem;">GitHub</a>
      </div>
    </div>
  `;
}

// ==================== 聊天功能 ====================

function initChat() {
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendChat');
  const chatMessages = document.getElementById('chatMessages');
  const quickPrompts = document.querySelectorAll('.quick-prompt-btn');

  if (!chatInput || !sendBtn) return;

  // 发送消息
  const sendMessage = async () => {
    const message = chatInput.value.trim();
    if (!message) return;

    // 添加用户消息
    addChatMessage(message, 'user');
    chatInput.value = '';

    // 显示加载状态
    const loadingId = addLoadingMessage();

    try {
      const data = await sendAIMessage(message);
      if (data.success) {
        removeLoadingMessage(loadingId);
        addChatMessage(data.data.response, 'assistant');
        chatCount++;
        document.getElementById('chatCount').textContent = chatCount;
      }
    } catch (e) {
      removeLoadingMessage(loadingId);
      addChatMessage('抱歉，出现了一些问题。请稍后再试。', 'assistant');
    }
  };

  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // 快捷提示
  quickPrompts.forEach(btn => {
    btn.addEventListener('click', () => {
      chatInput.value = btn.dataset.prompt;
      chatInput.focus();
    });
  });
}

function addChatMessage(content, type) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${type}`;
  messageDiv.innerHTML = `<div class="message-bubble">${formatMessage(content)}</div>`;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addLoadingMessage() {
  const id = 'loading-' + Date.now();
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return id;

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'chat-message assistant';
  loadingDiv.id = id;
  loadingDiv.innerHTML = `
    <div class="message-bubble" style="display: flex; align-items: center; gap: 0.5rem;">
      <div class="loading-spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
      <span>思考中...</span>
    </div>
  `;
  chatMessages.appendChild(loadingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return id;
}

function removeLoadingMessage(id) {
  const loadingDiv = document.getElementById(id);
  if (loadingDiv) loadingDiv.remove();
}

function formatMessage(content) {
  // 简单格式化：代码块、换行
  return content
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

// ==================== 留言板 ====================

function initMessageForm() {
  const messageForm = document.getElementById('messageForm');
  const messagesList = document.getElementById('messagesList');

  if (!messageForm) return;

  messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(messageForm);
    const name = formData.get('name');
    const email = formData.get('email');
    const content = formData.get('content');

    try {
      await createMessage(name, email, content);
      showToast('留言成功！', 'success');
      messageForm.reset();
      loadMessages();
    } catch (e) {
      showToast('留言失败，请稍后重试', 'error');
    }
  });

  loadMessages();
}

async function loadMessages() {
  const messagesList = document.getElementById('messagesList');
  if (!messagesList) return;

  try {
    const data = await getMessages();
    messagesList.innerHTML = data.data.map(msg => `
      <div class="message-item" style="padding: 1rem; border-bottom: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
          <span style="font-weight: 600; color: var(--primary);">${escapeHtml(msg.name)}</span>
          <span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(msg.created_at).toLocaleDateString()}</span>
        </div>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">${escapeHtml(msg.content)}</p>
      </div>
    `).join('');
  } catch (e) {
    messagesList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">加载留言失败</p>';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== Toast通知 ====================

export function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '✕'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== 滚动动画 ====================

function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  animatedElements.forEach(el => observer.observe(el));
}

// ==================== 评论功能 ====================

export async function submitComment(articleId, content, parentId = 0) {
  if (!currentUser) {
    showToast('请先登录', 'error');
    return false;
  }

  try {
    await createComment({ article_id: articleId, content, parent_id: parentId });
    showToast('评论成功', 'success');
    return true;
  } catch (e) {
    showToast('评论失败', 'error');
    return false;
  }
}

// ==================== 工具函数 ====================

export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}前`;
    }
  }
  return '刚刚';
}

// 导出全局函数
window.showToast = showToast;
window.formatDate = formatDate;
window.timeAgo = timeAgo;
