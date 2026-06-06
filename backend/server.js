require('dotenv').config();
const express = require('express');
const cors = require('cors');
const chatRouter = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. CORS 配置（放在路由之前）
app.use(cors({
  origin: [
    'https://code-whisper-mvp-pqji8-9rxsp57su-dranbes-projects.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
}));

// 2. 解析 JSON 请求体
app.use(express.json());

// 3. 测试路由
app.get('/', (req, res) => {
  res.send('CodeWhisper API');
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV,
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  });
});

app.use('/api/chat', chatRouter);

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);

  // 记录请求开始
  console.log(`[${new Date().toISOString()}] [INFO] [${requestId}] ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    contentType: req.get('content-type'),
    bodySize: req.headers['content-length'] || 0
  });

  // 重写res.end以记录响应
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;

    console.log(`[${new Date().toISOString()}] [INFO] [${requestId}] 响应完成`, {
      状态码: res.statusCode,
      持续时间: `${duration}ms`,
      内容长度: res.getHeader('content-length') || '未知',
      内容类型: res.getHeader('content-type')
    });

    originalEnd.apply(this, args);
  };

  next();
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});