/** 代码片段实体（持久化在 localStorage） */
export interface Snippet {
  id: string
  title: string
  language: 'javascript' | 'html' | 'css'
  code: string
  tags: string[]
  isFavorite: boolean
  createdAt: number
  updatedAt: number
}
