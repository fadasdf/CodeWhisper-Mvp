const { ChatOpenAI } = require('@langchain/openai');

function createChatModel() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  return new ChatOpenAI({
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    apiKey,
    temperature: 0.7,
    streaming: true,
    maxRetries: 0,
    configuration: {
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    },
  });
}

module.exports = { createChatModel };
