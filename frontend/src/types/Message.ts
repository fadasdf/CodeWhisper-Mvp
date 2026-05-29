import type { Snippet } from '../type/Snippet'

export interface Message {
  id: string
  messageRole: 'user' | 'assistant'
  content: string
  timestamp: number
  contextSnippets?: Snippet[]
  contextMessages?: Message[]
}
