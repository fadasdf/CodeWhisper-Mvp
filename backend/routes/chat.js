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

function buildContextBlock(contextSnippet) {
  if (!contextSnippet?.code) return '';

  const title = contextSnippet.title || '未命名片段';
  const language = contextSnippet.language || '';

  return `\n\n## 当前代码上下文\n标题：${title}\n语言：${language}\n\`\`\`${language}\n${contextSnippet.code}\n\`\`\``;
}

function buildMessages(history, userMessage, contextSnippet) {
  const systemContent = SYSTEM_PROMPT + buildContextBlock(contextSnippet);
  const messages = [new SystemMessage(systemContent)];

  for (const msg of history) {
    if (msg.role === 'user') {
      messages.push(new HumanMessage(msg.content));
    } else if (msg.role === 'assistant') {
      messages.push(new AIMessage(msg.content));
    }
  }

  messages.push(new HumanMessage(userMessage));
  return messages;
}

function sendSSE(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function extractTokenContent(chunk) {
  const { content } = chunk;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => part.text || '').join('');
  }
  return '';
}

/** POST /api/chat/stream — SSE 流式对话 */
router.post('/stream', async (req, res) => {
  const { sessionId, message, contextSnippet } = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId is required' });
  }
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY is not configured' });
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const userMessage = String(message).trim();
  const history = sessionStore.getHistory(sessionId);
  const langchainMessages = buildMessages(history, userMessage, contextSnippet);

  let fullReply = '';
  let clientClosed = false;

  req.on('close', () => {
    clientClosed = true;
  });

  try {
    const model = createChatModel();
    const stream = await model.stream(langchainMessages);

    for await (const chunk of stream) {
      if (clientClosed) break;

      const token = extractTokenContent(chunk);
      if (!token) continue;

      fullReply += token;
      sendSSE(res, { type: 'token', content: token });
    }

    if (!clientClosed && fullReply) {
      sessionStore.addMessage(sessionId, 'user', userMessage);
      sessionStore.addMessage(sessionId, 'assistant', fullReply);
      sendSSE(res, { type: 'done', content: fullReply });
    }

    res.end();
  } catch (err) {
    console.error('[chat/stream]', err);

    let message = err.message || 'Stream failed';
    if (err.status === 402 || message.includes('Insufficient Balance')) {
      message = 'DeepSeek API 余额不足，请充值后重试';
    } else if (err.status === 401) {
      message = 'DeepSeek API Key 无效，请检查 .env 配置';
    }

    if (!clientClosed && !res.writableEnded) {
      sendSSE(res, { type: 'error', message });
      res.end();
    }
  }
});

/** DELETE /api/chat/session/:sessionId — 清空会话历史 */
router.delete('/session/:sessionId', (req, res) => {
  sessionStore.clearSession(req.params.sessionId);
  res.json({ success: true });
});

/** GET /api/chat/history/:sessionId — 获取会话历史（调试用） */
router.get('/history/:sessionId', (req, res) => {
  const history = sessionStore.getHistory(req.params.sessionId);
  res.json({ sessionId: req.params.sessionId, history });
});

module.exports = router;