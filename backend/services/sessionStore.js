/** 会话历史存储：默认内存 Map，后续可替换为 Redis */
const sessions = new Map();
const MAX_MESSAGES = 50;

function getHistory(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  return sessions.get(sessionId);
}

function addMessage(sessionId, role, content) {
  const history = getHistory(sessionId);
  history.push({ role, content, timestamp: Date.now() });

  if (history.length > MAX_MESSAGES) {
    history.splice(0, history.length - MAX_MESSAGES);
  }
}

function clearSession(sessionId) {
  sessions.delete(sessionId);
}

module.exports = { getHistory, addMessage, clearSession };
