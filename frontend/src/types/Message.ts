import type { Snippet } from './Snippet'

/** AI 对话单条消息（预留，供后续对接真实聊天 API） */

export interface Message {
  id: string
  messageRole: 'user' | 'assistant'
  content: string
  timestamp: number
  contextSnippets?: Snippet[]
  contextMessages?: Message[]
}
