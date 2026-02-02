/**
 * API 模块 - 处理所有后端请求
 */

const API_BASE = '/api';

// 获取认证token
function getToken() {
  return localStorage.getItem('bear_ai_token');
}

// 设置认证token
function setToken(token) {
  localStorage.setItem('bear_ai_token', token);
}

// 移除认证token
function removeToken() {
  localStorage.removeItem('bear_ai_token');
}

// API请求封装
async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || '请求失败');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ==================== 认证相关 ====================

export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (data.success) {
    setToken(data.data.token);
  }
  return data;
}

export async function register(username, email, password) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password })
  });
  if (data.success) {
    setToken(data.data.token);
  }
  return data;
}

export async function getCurrentUser() {
  return await request('/auth/me');
}

export async function updateProfile(bio, avatar) {
  return await request('/users/profile', {
    method: 'PUT',
    body: JSON.stringify({ bio, avatar })
  });
}

export function logout() {
  removeToken();
  window.location.href = '/';
}

export async function updatePassword(currentPassword, newPassword) {
  return await request('/users/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

// ==================== 文章相关 ====================

export async function getArticles(params = {}) {
  const query = new URLSearchParams(params).toString();
  return await request(`/articles${query ? '?' + query : ''}`);
}

export async function getArticle(slug) {
  return await request(`/articles/${slug}`);
}

export async function createArticle(article) {
  return await request('/articles', {
    method: 'POST',
    body: JSON.stringify(article)
  });
}

export async function updateArticle(id, article) {
  return await request(`/articles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(article)
  });
}

export async function deleteArticle(id) {
  return await request(`/articles/${id}`, {
    method: 'DELETE'
  });
}

// ==================== 项目相关 ====================

export async function getProjects(params = {}) {
  const query = new URLSearchParams(params).toString();
  return await request(`/projects${query ? '?' + query : ''}`);
}

export async function getProject(slug) {
  return await request(`/projects/${slug}`);
}

export async function createProject(project) {
  return await request('/projects', {
    method: 'POST',
    body: JSON.stringify(project)
  });
}

export async function updateProject(id, project) {
  return await request(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(project)
  });
}

export async function deleteProject(id) {
  return await request(`/projects/${id}`, {
    method: 'DELETE'
  });
}

// ==================== 搜索功能 ====================

export async function searchContent(keyword, type = 'all') {
  return await request(`/search?q=${encodeURIComponent(keyword)}&type=${type}`);
}

// ==================== 点赞功能 ====================

export async function likeArticle(id) {
  return await request(`/articles/${id}/like`, {
    method: 'POST'
  });
}

// ==================== 收藏功能 ====================

export async function getFavorites() {
  return await request('/favorites');
}

export async function addFavorite(articleId = null, projectId = null) {
  return await request('/favorites', {
    method: 'POST',
    body: JSON.stringify({ article_id: articleId, project_id: projectId })
  });
}

export async function removeFavorite(id) {
  return await request(`/favorites/${id}`, {
    method: 'DELETE'
  });
}

// ==================== AI 配置 ====================

export async function getAIConfig() {
  return await request('/ai/config');
}

export async function testAIConnection(provider) {
  return await request('/ai/test', {
    method: 'POST',
    body: JSON.stringify({ provider })
  });
}

// ==================== 评论相关 ====================

export async function getComments(articleId) {
  const article = await getArticle(slug);
  return article.data.comments;
}

export async function createComment(comment) {
  return await request('/comments', {
    method: 'POST',
    body: JSON.stringify(comment)
  });
}

export async function deleteComment(id) {
  return await request(`/comments/${id}`, {
    method: 'DELETE'
  });
}

// ==================== 留言板 ====================

export async function getMessages() {
  return await request('/messages');
}

export async function createMessage(name, email, content) {
  return await request('/messages', {
    method: 'POST',
    body: JSON.stringify({ name, email, content })
  });
}

// ==================== 统计 ====================

export async function getStats() {
  return await request('/stats');
}

// ==================== AI工具 ====================

export async function sendAIMessage(message, systemPrompt = '') {
  return await request('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, system_prompt: systemPrompt })
  });
}

// ==================== 文件上传 ====================

export async function uploadFile(file) {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return await response.json();
}
