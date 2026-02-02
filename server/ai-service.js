/**
 * AI 服务层 - 支持多服务商切换
 *
 * 配置方式：在 .env 文件中设置 AI_PROVIDER
 * 可选值: mock, openai, claude, clawdbot, azure
 */

const AI_CONFIG = {
  default: 'mock',
  providers: {
    mock: {
      name: '模拟响应',
      enabled: true,
      description: '返回预设的模拟响应，完全免费'
    },
    openai: {
      name: 'OpenAI (GPT)',
      enabled: false,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      baseUrl: 'https://api.openai.com/v1',
      description: 'ChatGPT，性价比高，生态成熟'
    },
    claude: {
      name: 'Anthropic (Claude)',
      enabled: false,
      apiKey: process.env.CLAUDE_API_KEY,
      model: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
      baseUrl: 'https://api.anthropic.com/v1',
      description: 'Claude，写作能力强'
    },
    clawdbot: {
      name: 'Clawdbot',
      enabled: false,
      apiKey: process.env.CLAWDBOT_API_KEY,
      model: process.env.CLAWDBOT_MODEL || 'default',
      baseUrl: process.env.CLAWDBOT_BASE_URL || 'https://api.clawdbot.com/v1',
      description: '你的自定义AI服务'
    },
    azure: {
      name: 'Azure OpenAI',
      enabled: false,
      apiKey: process.env.AZURE_API_KEY,
      deploymentId: process.env.AZURE_DEPLOYMENT_ID,
      baseUrl: process.env.AZURE_ENDPOINT,
      apiVersion: '2023-05-15',
      description: '企业级 OpenAI 服务'
    }
  }
};

/**
 * 主聊天函数 - 统一接口
 * @param {string} message - 用户消息
 * @param {Array} history - 对话历史 [{role: 'user'|'assistant', content: '...'}]
 * @param {Object} options - 其他选项
 * @returns {Promise<string>} AI 回复内容
 */
async function chatWithAI(message, history = [], options = {}) {
  const provider = process.env.AI_PROVIDER || 'mock';
  const providerConfig = AI_CONFIG.providers[provider];

  if (!providerConfig) {
    throw new Error(`未知的 AI 服务商: ${provider}`);
  }

  if (!providerConfig.enabled) {
    throw new Error(`AI 服务商 [${provider}] 未启用，请检查配置`);
  }

  if (!providerConfig.apiKey && provider !== 'mock') {
    throw new Error(`AI 服务商 [${provider}] 未配置 API Key`);
  }

  // 根据不同服务商调用
  switch (provider) {
    case 'mock':
      return await mockChat(message, history, options);
    case 'openai':
      return await openaiChat(message, history, providerConfig, options);
    case 'claude':
      return await claudeChat(message, history, providerConfig, options);
    case 'clawdbot':
      return await clawdbotChat(message, history, providerConfig, options);
    case 'azure':
      return await azureChat(message, history, providerConfig, options);
    default:
      return await mockChat(message, history, options);
  }
}

/**
 * 模拟聊天 - 免费模式
 */
async function mockChat(message, history, options) {
  // 模拟响应
  const responses = [
    `你好！我是AI助手。关于"${message}"，这是一个很有趣的问题。让我来详细解答...\n\n首先，我们需要明确这个问题的核心要点。其次，从实践角度来看，有几个关键因素需要考虑。最后，建议你多尝试不同的方法，找到最适合的解决方案。`,
    `感谢你的提问！关于"${message}"，我可以提供以下建议：\n\n1. 首先，明确你的目标\n2. 选择合适的工具和方法\n3. 持续学习和实践\n4. 及时总结经验教训\n\n希望这对你有帮助！`,
    `这是一个很好的问题！关于"${message}"，我认为关键在于理解底层原理，然后通过实践来巩固知识。\n\n建议你从基础开始，逐步深入。有不懂的地方可以随时问我。`,
    `关于"${message}"，让我从以下几个角度来分析：\n\n📌 核心概念\n📌 应用场景\n📌 最佳实践\n📌 常见误区\n\n希望这个框架对你有帮助！`,
    `你好！我注意到你在问关于"${message}"。这个问题涉及多个层面：\n\n• 技术层面\n• 实践层面\n• 优化方向\n\n有什么具体方面需要我深入解释吗？`
  ];

  // 根据消息内容选择不同的响应
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('你好') || lowerMessage.includes('hi') || lowerMessage.includes('hello')) {
    return '你好！我是大熊的AI助手，很高兴为你服务！有什么我可以帮助你的吗？😊';
  }

  if (lowerMessage.includes('帮助') || lowerMessage.includes('help')) {
    return '我可以帮你做很多事情：\n\n• 回答问题\n• 写作辅助\n• 代码编写\n• 知识讲解\n• 创意头脑风暴\n\n请告诉我你需要什么帮助！';
  }

  if (lowerMessage.includes('谢谢') || lowerMessage.includes('感谢')) {
    return '不客气！很高兴能帮到你。如果还有其他问题，随时问我！😊';
  }

  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * OpenAI ChatGPT 聊天
 */
async function openaiChat(message, history, config, options) {
  const maxTokens = options.maxTokens || 1024;
  const temperature = options.temperature || 0.7;

  const messages = [
    { role: 'system', content: getSystemPrompt() },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model,
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API 请求失败');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Anthropic Claude 聊天
 */
async function claudeChat(message, history, config, options) {
  const maxTokens = options.maxTokens || 1024;

  const messages = [
    ...history.map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content
    })),
    { role: 'user', content: message }
  ];

  const response = await fetch(`${config.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model,
      messages: messages,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Claude API 请求失败');
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Clawdbot 自定义聊天
 */
async function clawdbotChat(message, history, config, options) {
  const response = await fetch(`${config.baseUrl}/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: message,
      history: history,
      model: config.model,
      options: options
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Clawdbot API 请求失败');
  }

  const data = await response.json();
  return data.response || data.result || data.content || JSON.stringify(data);
}

/**
 * Azure OpenAI 聊天
 */
async function azureChat(message, history, config, options) {
  const maxTokens = options.maxTokens || 1024;
  const apiVersion = config.apiVersion || '2023-05-15';

  const messages = [
    { role: 'system', content: getSystemPrompt() },
    ...history,
    { role: 'user', content: message }
  ];

  const url = `${config.baseUrl}/openai/deployments/${config.deploymentId}/chat/completions?api-version=${apiVersion}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': config.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: messages,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Azure API 请求失败');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 获取系统提示词
 */
function getSystemPrompt() {
  return `你是一位专业、友好、有耐心的AI助手，名字叫"大熊的AI助手"。

你的特点：
1. 回答问题时清晰、准确、有条理
2. 擅长用通俗易懂的语言解释复杂概念
3. 乐于帮助用户解决问题
4. 适当使用emoji让对话更生动
5. 如果不确定的问题，会诚实告知

请用中文回答用户的问题。`;
}

/**
 * 获取当前配置的服务商信息
 */
function getProviderInfo() {
  const provider = process.env.AI_PROVIDER || 'mock';
  const config = AI_CONFIG.providers[provider];
  return {
    current: provider,
    name: config?.name || '未知',
    description: config?.description || '',
    enabled: config?.enabled || false
  };
}

/**
 * 测试 AI 连接
 */
async function testConnection(provider = null) {
  const targetProvider = provider || process.env.AI_PROVIDER || 'mock';
  const config = AI_CONFIG.providers[targetProvider];

  if (!config) {
    return { success: false, message: `未知的提供商: ${targetProvider}` };
  }

  if (!config.enabled) {
    return { success: false, message: `提供商 [${targetProvider}] 未启用` };
  }

  try {
    const response = await chatWithAI('你好，请简单回复', [], { maxTokens: 50 });
    return { success: true, message: '连接成功！', response: response.substring(0, 100) };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = {
  chatWithAI,
  AI_CONFIG,
  getProviderInfo,
  testConnection
};
