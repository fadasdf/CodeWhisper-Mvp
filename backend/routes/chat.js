// const express = require('express');
// const {
//   SystemMessage,
//   HumanMessage,
//   AIMessage,
// } = require('@langchain/core/messages');
// const { createChatModel } = require('../services/llm');
// const sessionStore = require('../services/sessionStore');
// const { SYSTEM_PROMPT } = require('../config/systemPrompt');

// const router = express.Router();

// function buildContextBlock(contextSnippet) {
//   if (!contextSnippet?.code) return '';

//   const title = contextSnippet.title || '未命名片段';
//   const language = contextSnippet.language || '';

//   return `\n\n## 当前代码上下文\n标题：${title}\n语言：${language}\n\`\`\`${language}\n${contextSnippet.code}\n\`\`\``;
// }

// function buildMessages(history, userMessage, contextSnippet) {
//   const systemContent = SYSTEM_PROMPT + buildContextBlock(contextSnippet);
//   const messages = [new SystemMessage(systemContent)];

//   for (const msg of history) {
//     if (msg.role === 'user') {
//       messages.push(new HumanMessage(msg.content));
//     } else if (msg.role === 'assistant') {
//       messages.push(new AIMessage(msg.content));
//     }
//   }

//   messages.push(new HumanMessage(userMessage));
//   return messages;
// }

// function sendSSE(res, payload) {
//   res.write(`data: ${JSON.stringify(payload)}\n\n`);
// }

// function extractTokenContent(chunk) {
//   const { content } = chunk;
//   if (typeof content === 'string') return content;
//   if (Array.isArray(content)) {
//     return content.map((part) => part.text || '').join('');
//   }
//   return '';
// }

// /** POST /api/chat/stream — SSE 流式对话 */
// router.post('/stream', async (req, res) => {
//   const { sessionId, message, contextSnippet } = req.body;

//   if (!sessionId || typeof sessionId !== 'string') {
//     return res.status(400).json({ error: 'sessionId is required' });
//   }
//   if (!message || !String(message).trim()) {
//     return res.status(400).json({ error: 'message is required' });
//   }

//   if (!process.env.DEEPSEEK_API_KEY) {
//     return res.status(500).json({ error: 'DEEPSEEK_API_KEY is not configured' });
//   }

//   res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
//   res.setHeader('Cache-Control', 'no-cache, no-transform');
//   res.setHeader('Connection', 'keep-alive');
//   res.setHeader('X-Accel-Buffering', 'no');

//   if (typeof res.flushHeaders === 'function') {
//     res.flushHeaders();
//   }

//   const userMessage = String(message).trim();
//   const history = sessionStore.getHistory(sessionId);
//   const langchainMessages = buildMessages(history, userMessage, contextSnippet);

//   let fullReply = '';
//   let clientClosed = false;

//   req.on('close', () => {
//     clientClosed = true;
//   });

//   try {
//     const model = createChatModel();
//     const stream = await model.stream(langchainMessages);

//     for await (const chunk of stream) {
//       if (clientClosed) break;

//       const token = extractTokenContent(chunk);
//       if (!token) continue;

//       fullReply += token;
//       sendSSE(res, { type: 'token', content: token });
//     }

//     if (!clientClosed && fullReply) {
//       sessionStore.addMessage(sessionId, 'user', userMessage);
//       sessionStore.addMessage(sessionId, 'assistant', fullReply);
//       sendSSE(res, { type: 'done', content: fullReply });
//     }

//     res.end();
//   } catch (err) {
//     console.error('[chat/stream]', err);

//     let message = err.message || 'Stream failed';
//     if (err.status === 402 || message.includes('Insufficient Balance')) {
//       message = 'DeepSeek API 余额不足，请充值后重试';
//     } else if (err.status === 401) {
//       message = 'DeepSeek API Key 无效，请检查 .env 配置';
//     }

//     if (!clientClosed && !res.writableEnded) {
//       sendSSE(res, { type: 'error', message });
//       res.end();
//     }
//   }
// });

// /** DELETE /api/chat/session/:sessionId — 清空会话历史 */
// router.delete('/session/:sessionId', (req, res) => {
//   sessionStore.clearSession(req.params.sessionId);
//   res.json({ success: true });
// });

// /** GET /api/chat/history/:sessionId — 获取会话历史（调试用） */
// router.get('/history/:sessionId', (req, res) => {
//   const history = sessionStore.getHistory(req.params.sessionId);
//   res.json({ sessionId: req.params.sessionId, history });
// });

// module.exports = router;




const express = require('express');
const {
  SystemMessage,
  HumanMessage,
  AIMessage,
} = require('@langchain/core/messages');
const { createChatModel } = require('../services/llm');
const sessionStore = require('../services/sessionStore');
const { SYSTEM_PROMPT } = require('../config/systemPrompt');

const router = express.Router();

// 配置日志级别
const LOG_LEVEL = process.env.LOG_LEVEL || 'debug'; // debug, info, warn, error
const LOG_TOKENS = process.env.LOG_TOKENS === 'true'; // 是否记录每个token

function log(level, ...args) {
  const timestamp = new Date().toISOString();
  const levels = ['debug', 'info', 'warn', 'error'];
  if (levels.indexOf(level) >= levels.indexOf(LOG_LEVEL)) {
    console.log(`[${timestamp}] [${level.toUpperCase()}]`, ...args);
  }
}

function buildContextBlock(contextSnippet) {
  if (!contextSnippet?.code) {
    log('debug', 'buildContextBlock: 无代码片段或代码为空');
    return '';
  }

  const title = contextSnippet.title || '未命名片段';
  const language = contextSnippet.language || '';

  log('debug', 'buildContextBlock: 构建上下文块', {
    标题: title,
    语言: language,
    代码长度: contextSnippet.code.length
  });

  return `\n\n## 当前代码上下文\n标题：${title}\n语言：${language}\n\`\`\`${language}\n${contextSnippet.code}\n\`\`\``;
}

function buildMessages(history, userMessage, contextSnippet) {
  const systemContent = SYSTEM_PROMPT + buildContextBlock(contextSnippet);
  const messages = [new SystemMessage(systemContent)];

  log('debug', 'buildMessages: 系统提示长度', systemContent.length);
  log('debug', 'buildMessages: 历史消息数量', history.length);

  for (const msg of history) {
    if (msg.role === 'user') {
      messages.push(new HumanMessage(msg.content));
    } else if (msg.role === 'assistant') {
      messages.push(new AIMessage(msg.content));
    }
  }

  log('debug', 'buildMessages: 添加用户消息', {
    内容长度: userMessage.length,
    内容预览: userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '')
  });
  messages.push(new HumanMessage(userMessage));

  log('debug', 'buildMessages: 总消息数量', messages.length);
  return messages;
}

function sendSSE(res, payload) {
  if (res.writableEnded) return;

  const data = `data: ${JSON.stringify(payload)}\n\n`;
  res.write(data);

  if (typeof res.flush === 'function') {
    res.flush();
  }

  log('debug', 'sendSSE: 发送事件', {
    类型: payload.type,
    内容长度: payload.type === 'token' ? payload.content?.length : payload.content?.length
  });
}

function extractTokenContent(chunk) {
  const { content } = chunk;
  if (typeof content === 'string') {
    log('debug', 'extractTokenContent: 字符串内容', {
      长度: content.length,
      内容: LOG_TOKENS ? content : '（已隐藏）'
    });
    return content;
  }
  if (Array.isArray(content)) {
    const result = content.map((part) => part.text || '').join('');
    log('debug', 'extractTokenContent: 数组内容', {
      数组长度: content.length,
      合并长度: result.length,
      内容: LOG_TOKENS ? result : '（已隐藏）'
    });
    return result;
  }
  log('warn', 'extractTokenContent: 无法识别的chunk格式', chunk);
  return '';
}

/** POST /api/chat/stream — SSE 流式对话 */
router.post('/stream', async (req, res) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  log('info', `[${requestId}] 收到流式对话请求`);
  log('debug', `[${requestId}] 请求体:`, req.body);

  const { sessionId, message, contextSnippet } = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    log('warn', `[${requestId}] 验证失败: sessionId无效`, sessionId);
    return res.status(400).json({ error: 'sessionId is required' });
  }
  if (!message || !String(message).trim()) {
    log('warn', `[${requestId}] 验证失败: message无效`, message);
    return res.status(400).json({ error: 'message is required' });
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    log('error', `[${requestId}] 配置错误: DEEPSEEK_API_KEY未配置`);
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY is not configured' });
  }

  log('debug', `[${requestId}] 设置SSE响应头`);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  // 立即发送 SSE 注释行，保持连接活跃，避免客户端在模型响应前误判空流
  res.write(': stream-open\n\n');
  if (typeof res.flush === 'function') {
    res.flush();
  }

  const userMessage = String(message).trim();
  const history = sessionStore.getHistory(sessionId);
  const langchainMessages = buildMessages(history, userMessage, contextSnippet);

  let fullReply = '';
  let clientClosed = false;
  let chunkCount = 0;
  let tokenCount = 0;
  const startTime = Date.now();

  const markClientClosed = (reason) => {
    if (clientClosed) return;
    clientClosed = true;
    const duration = Date.now() - startTime;
    log('info', `[${requestId}] 客户端断开连接`, {
      原因: reason,
      持续时间: `${duration}ms`,
      处理chunk数: chunkCount,
      发送token数: tokenCount
    });
  };

  // 勿用 req.on('close')：请求体读完后可能误触发，导致 clientClosed 过早为 true、SSE 被跳过
  req.on('aborted', () => markClientClosed('request-aborted'));
  res.on('close', () => {
    if (!res.writableFinished) {
      markClientClosed('response-closed-early');
    }
  });

  log('info', `[${requestId}] 开始处理请求`, {
    sessionId: sessionId.substring(0, 8) + '...',
    消息长度: userMessage.length,
    历史记录数: history.length,
    是否有上下文: !!contextSnippet
  });

  try {
    log('debug', `[${requestId}] 创建聊天模型`);
    const model = createChatModel();

    log('info', `[${requestId}] 调用模型流接口`);
    const stream = await model.stream(langchainMessages);

    log('debug', `[${requestId}] 开始流式处理`);

    for await (const chunk of stream) {
      chunkCount++;

      if (clientClosed) {
        log('warn', `[${requestId}] 客户端已关闭，停止处理`);
        break;
      }

      log('debug', `[${requestId}] 收到第${chunkCount}个chunk`, {
        chunk类型: chunk.constructor?.name,
        原始数据: LOG_TOKENS ? JSON.stringify(chunk) : '（已隐藏）'
      });

      const token = extractTokenContent(chunk);

      if (!token) {
        log('debug', `[${requestId}] chunk内容为空，跳过`);
        continue;
      }

      tokenCount++;
      fullReply += token;

      log('debug', `[${requestId}] 发送第${tokenCount}个token`, {
        累计长度: fullReply.length,
        当前token: LOG_TOKENS ? token : '（已隐藏）'
      });

      sendSSE(res, { type: 'token', content: token });

      // 每10个token记录一次进度
      if (tokenCount % 10 === 0) {
        log('info', `[${requestId}] 处理进度`, {
          已处理token数: tokenCount,
          累计回复长度: fullReply.length,
          运行时间: `${Date.now() - startTime}ms`
        });
      }
    }

    const totalTime = Date.now() - startTime;
    log('info', `[${requestId}] 流式处理完成`, {
      总chunk数: chunkCount,
      总token数: tokenCount,
      完整回复长度: fullReply.length,
      总耗时: `${totalTime}ms`,
      平均速度: tokenCount > 0 ? `${Math.round(totalTime / tokenCount)}ms/token` : 'N/A'
    });

    if (!clientClosed && fullReply) {
      log('debug', `[${requestId}] 保存对话历史`);
      sessionStore.addMessage(sessionId, 'user', userMessage);
      sessionStore.addMessage(sessionId, 'assistant', fullReply);

      log('info', `[${requestId}] 发送完成事件`);
      sendSSE(res, { type: 'done', content: fullReply });
    } else if (!clientClosed && !fullReply) {
      log('warn', `[${requestId}] 模型未返回任何内容`);
      sendSSE(res, {
        type: 'error',
        message: '模型未返回任何内容，请检查API配置'
      });
    }

    log('info', `[${requestId}] 响应结束`);
    res.end();
  } catch (err) {
    const errorTime = Date.now() - startTime;
    log('error', `[${requestId}] 流式处理异常`, {
      错误信息: err.message,
      错误类型: err.constructor?.name,
      状态码: err.status,
      堆栈: err.stack,
      运行时间: `${errorTime}ms`
    });

    let errorMessage = err.message || 'Stream failed';
    if (err.status === 402 || errorMessage.includes('Insufficient Balance')) {
      errorMessage = 'DeepSeek API 余额不足，请充值后重试';
      log('warn', `[${requestId}] API余额不足`);
    } else if (err.status === 401) {
      errorMessage = 'DeepSeek API Key 无效，请检查 .env 配置';
      log('error', `[${requestId}] API Key无效`);
    } else if (err.code === 'ENOTFOUND') {
      errorMessage = '无法连接到DeepSeek API，请检查网络连接';
      log('error', `[${requestId}] 网络连接失败`);
    }

    if (!res.writableEnded) {
      log('info', `[${requestId}] 发送错误事件: ${errorMessage}`);
      sendSSE(res, { type: 'error', message: errorMessage });
      res.end();
    }
  }
});

/** DELETE /api/chat/session/:sessionId — 清空会话历史 */
router.delete('/session/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  log('info', '清空会话历史', { sessionId });

  sessionStore.clearSession(sessionId);
  res.json({ success: true });

  log('debug', '会话已清空', { sessionId });
});

/** GET /api/chat/history/:sessionId — 获取会话历史（调试用） */
router.get('/history/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  log('debug', '获取会话历史', { sessionId });

  const history = sessionStore.getHistory(sessionId);
  res.json({ sessionId: req.params.sessionId, history });

  log('debug', '返回历史记录', {
    sessionId,
    记录数量: history.length
  });
});

module.exports = router;