import type { Snippet } from '@/types/Snippet'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

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

// export async function streamChat(
//   payload: StreamChatPayload,
//   onEvent: (event: StreamEvent) => void,
//   signal?: AbortSignal
// ): Promise<void> {
//   console.log('🚀 [streamChat] 发起请求...'); // 新增日志 1
//   const response = await fetch(`${API_BASE}/api/chat/stream`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(payload),
//     signal,
//   })

//   if (!response.ok) {
//     const err = await response.json().catch(() => ({ error: response.statusText }))
//     throw new Error(err.error || `Request failed (${response.status})`)
//   }

//   const reader = response.body?.getReader()
//   if (!reader) throw new Error('ReadableStream not supported')

//   const decoder = new TextDecoder()
//   let buffer = ''
//   console.log('📖 [streamChat] 开始读取流...'); // 新增日志 2

//   while (true) {
//     const { done, value } = await reader.read()
//     console.log('⬇️ [streamChat] 读到数据块:', done ? '结束' : value); // 新增日志 3
//     if (done) break

//     buffer += decoder.decode(value, { stream: true })
//     const lines = buffer.split('\n')
//     buffer = lines.pop() || ''

//     for (const line of lines) {
//       const trimmed = line.trim()
//       if (!trimmed.startsWith('data:')) continue

//       const jsonStr = trimmed.slice(5).trim()
//       if (!jsonStr) continue

//       try {
//         onEvent(JSON.parse(jsonStr) as StreamEvent)
//       } catch {
//         // ignore malformed SSE chunks
//       }
//     }
//   }
// }


export async function streamChat(
  payload: StreamChatPayload,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  console.log('🚀 [streamChat] 发起请求...')
  console.log('📤 请求体:', JSON.stringify(payload, null, 2))

  const response = await fetch(`${API_BASE}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  console.log('🟡 响应状态:', response.status, response.statusText)
  console.log('🟡 响应头:', Object.fromEntries(response.headers.entries()))

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }))
    console.error('❌ 响应错误:', err)
    throw new Error(err.error || `Request failed (${response.status})`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('ReadableStream not supported')

  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  console.log('📖 [streamChat] 开始读取流...')
  let chunkCount = 0

  while (true) {
    const { done, value } = await reader.read()
    chunkCount++

    console.log(`\n⬇️ [streamChat] 第${chunkCount}个数据块:`, {
      是否结束: done,
      数据类型: value?.constructor?.name,
      数据长度: value?.length,
      原始字节预览: value ? Array.from(value.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ') + (value.length > 20 ? '...' : '') : '无数据'
    })

    if (done) {
      console.log('✅ 流读取完成')
      break
    }

    // 解码数据
    const decoded = decoder.decode(value, { stream: true })
    buffer += decoded

    console.log('📃 解码后的字符串:', JSON.stringify(decoded))
    console.log('📃 解码字符串长度:', decoded.length)
    console.log('📃 当前buffer长度:', buffer.length)
    console.log('📃 当前buffer内容:', JSON.stringify(buffer))

    // 按行分割
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    console.log(`📄 分割出 ${lines.length} 行，保留 ${buffer.length} 字符在buffer`)

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      console.log(`  📄 行${i+1}: ${JSON.stringify(trimmed)}`)
      console.log(`  📄 行${i+1}长度: ${trimmed.length}`)

      // 检查是否是有效的SSE行
      if (!trimmed) {
        console.log(`    ⏭️ 跳过空行`)
        continue
      }

      if (!trimmed.startsWith('data:')) {
        console.log(`    ⏭️ 跳过非data:行，实际以"${trimmed.substring(0, 5)}"开头`)
        continue
      }

      const jsonStr = trimmed.slice(5).trim()  // 移除"data:"前缀
      console.log(`    📦 提取的JSON字符串: ${JSON.stringify(jsonStr)}`)
      console.log(`    📦 JSON字符串长度: ${jsonStr.length}`)

      if (!jsonStr) {
        console.log(`    ⏭️ 跳过空JSON`)
        continue
      }

      try {
        const event = JSON.parse(jsonStr) as StreamEvent
        console.log(`    🎯 解析成功的事件:`, event)
        console.log(`    🎯 事件类型: ${event.type}`)
        console.log(`    🎯 事件内容预览: ${event.type === 'token' ? `"${event.content}"` : event.type === 'done' ? `完整长度:${event.content.length}` : `错误:${event.message}`}`)

        // 触发回调
        onEvent(event)
      } catch (parseError) {
        console.error(`    ❌ JSON解析失败:`, parseError)
        console.error(`    ❌ 原始字符串: ${jsonStr}`)
        console.error(`    ❌ 字符编码分析:`)

        // 分析前20个字符
        for (let j = 0; j < Math.min(jsonStr.length, 20); j++) {
          const char = jsonStr[j]
          const code = char.charCodeAt(0)
          console.error(`      [${j}]: 编码=${code} (0x${code.toString(16)}) 字符='${char}' ${code < 32 ? '(控制字符)' : ''}`)
        }
      }
    }
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
