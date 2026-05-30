import type { Snippet } from '@/types/Snippet'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export interface StreamChatPayload {
  sessionId: string
  message: string
  contextSnippet?: Snippet | null
}

export type StreamEvent =
  | { type: 'token'; content: string }
  | { type: 'done'; content: string }
  | {
      type: 'error'
      message: string
      statusCode?: number
      code?: string
      source?: string
    }

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function parseSSELine(line: string): StreamEvent | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return null

  const jsonStr = trimmed.slice(5).trim()
  if (!jsonStr) return null

  try {
    return JSON.parse(jsonStr) as StreamEvent
  } catch {
    return null
  }
}

export async function streamChat(
  payload: StreamChatPayload,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(err.error || `Request failed (${response.status})`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('ReadableStream not supported')

  const decoder = new TextDecoder()
  let buffer = ''
  let hasContent = false

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        if (!hasContent && !signal?.aborted) {
          onEvent({
            type: 'error',
            message: '连接在收到数据前被关闭，请重试',
            code: 'EMPTY_STREAM',
          })
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const event = parseSSELine(line)
        if (!event) continue

        hasContent = true
        onEvent(event)
      }
    }
  } catch (error) {
    if (isAbortError(error)) return
    throw error
  } finally {
    reader.releaseLock()
  }
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function getChatHistory(sessionId: string): Promise<ChatHistoryMessage[]> {
  const response = await fetch(`${API_BASE}/api/chat/history/${sessionId}`)
  if (!response.ok) return []

  const data = await response.json()
  return Array.isArray(data.history) ? data.history : []
}

export async function clearChatSession(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/api/chat/session/${sessionId}`, { method: 'DELETE' })
}
