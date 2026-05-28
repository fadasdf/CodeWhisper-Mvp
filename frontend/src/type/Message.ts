import type { Snippet } from './Snippet'

export interface Message {
  id: string
  messageRole: 'user' | 'assistant'
  content: string
  timestamp: number
  contextSnippets?: Snippet[]
  contextMessages?: Message[]
}
