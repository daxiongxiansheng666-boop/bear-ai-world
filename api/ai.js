// DeepSeek AI Chat API
// 使用方法：在 https://platform.deepseek.com/balance 充值后自动生效

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-e4c9c8d1736f4818a51c8fa639d0d4fb';

const SYSTEM_PROMPT = `你是一个友好、专业的AI助手，名字叫"大熊的AI助手"。
你的专长是帮助用户解答关于AI、技术、学习、编程等方面的问题。
回答要简洁、有帮助，可以用中文或英文。
如果遇到不确定的问题，要诚实说明，不要编造信息。`;

export default async function handler(req) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const pathname = url.pathname.replace('/api/', '');
  
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  if (pathname !== 'ai/chat' || req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'API不存在' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    let data = {};
    try {
      data = await req.json();
    } catch (e) {}

    const message = data.message?.trim();
    if (!message) {
      return new Response(JSON.stringify({ success: false, message: '消息不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查 API Key 是否有效
    if (DEEPSEEK_API_KEY.startsWith('sk-')) {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: message }
          ],
          max_tokens: 1024,
          temperature: 0.7
        })
      });

      const result = await response.json();
      
      if (result.error?.code === 'invalid_request_error') {
        // API Key 余额不足，使用模拟响应
        console.log('DeepSeek API 余额不足，使用模拟响应');
        return new Response(JSON.stringify({ 
          success: true, 
          data: { 
            response: getMockResponse(message),
            source: 'mock'
          } 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!response.ok) {
        throw new Error(result.error?.message || 'API请求失败');
      }

      return new Response(JSON.stringify({ 
        success: true, 
        data: { 
          response: result.choices[0].message.content,
          source: 'deepseek'
        } 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 默认使用模拟响应
    return new Response(JSON.stringify({ 
      success: true, 
      data: { 
        response: getMockResponse(message),
        source: 'mock'
      } 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message || '服务器错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 模拟响应（API 余额不足时使用）
function getMockResponse(message) {
  const responses = [
    `你好！关于"${message}"，这是一个很有趣的问题。让我来详细解答...`,
    `感谢你的提问！关于"${message}"，我可以提供以下建议：
    
1. 首先，明确你的目标
2. 选择合适的工具
3. 持续学习和实践

希望这对你有帮助！`,
    `这是一个很好的问题！关于"${message}"，我认为关键在于理解底层原理，然后通过实践来巩固知识。`,
    `关于"${message}"，我建议可以从以下几个方面入手：
    
• 学习基础知识
• 动手实践项目
• 加入社区交流
• 持续关注最新动态

有什么具体问题可以继续问我！`
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}
