require('dotenv').config();
const express = require('express');
const cors = require('cors');
const chatRouter = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. CORS 配置（放在路由之前）
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
