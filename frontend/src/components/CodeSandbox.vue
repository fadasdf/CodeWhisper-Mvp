<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElDialog, ElButton, ElTabs, ElTabPane } from 'element-plus'
import { Close, VideoPlay, RefreshRight, FullScreen } from '@/utils/icon'
import type { Snippet } from '@/types/Snippet'  // 修正导入路径

interface Props {
  visible: boolean
  snippet?: Snippet | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const activeTab = ref('result')

// 生成完整的 HTML 预览文档
const generateHtml = computed(() => {
  if (!props.snippet) return '<html><body>暂无代码片段</body></html>'

  const { language, code } = props.snippet

  // 处理 HTML
  if (language === 'html') {
    return code
  }

  // 处理 CSS：提供更丰富的示例 DOM
  if (language === 'css') {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${code}</style>
  <style>
    /* 基础演示样式，不会被覆盖 */
    .demo-container {
      font-family: system-ui, sans-serif;
      padding: 20px;
    }
    .demo-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      background: #fff;
    }
    button.demo-btn {
      margin-right: 8px;
      padding: 6px 12px;
      cursor: pointer;
    }
    input.demo-input {
      padding: 6px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="demo-container">
    <div class="demo-card">
      <h3>CSS 样式预览</h3>
      <p>这是一个段落，用于测试字体、颜色、边距等样式。</p>
      <button class="demo-btn">按钮</button>
      <button class="demo-btn">悬停效果</button>
      <input class="demo-input" placeholder="输入框" />
    </div>
    <div class="demo-card">
      <ul>
        <li>列表项 1</li>
        <li>列表项 2</li>
        <li>列表项 3</li>
      </ul>
    </div>
  </div>
</body>
</html>
    `
  }

  // 处理 JavaScript / TypeScript（将 TypeScript 视为 JavaScript 运行，或提示不支持）
  if (language === 'javascript' || language === 'typescript') {
    // 对于 TypeScript，简单提示用户（或可用 eval 直接执行，但可能报语法错误）
    // 这里采用友好提示并尝试执行（如果包含 TS 特有语法会失败）
    const tsWarning = language === 'typescript'
      ? '// 注意：TypeScript 代码未编译，可能无法运行。建议转为 JavaScript。\n'
      : '';
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; margin: 0; }
    .output-area {
      margin-top: 20px;
      padding: 12px;
      background: #1e1e1e;
      color: #d4d4d4;
      border-radius: 8px;
      font-family: monospace;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .output-title {
      font-weight: bold;
      margin-bottom: 8px;
      color: #fff;
    }
    .error-area {
      background: #2d2d2d;
      border-left: 4px solid #f44336;
      padding: 10px;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div id="app">
    <h3>JavaScript 运行结果</h3>
    <div id="output" class="output-area">
      <div class="output-title">控制台输出</div>
      <div id="console-output">(运行代码后将显示输出)</div>
    </div>
  </div>
  <script>
    (function() {
      // 捕获 console.log, error, warn
      const outputDiv = document.getElementById('console-output');
      function logToPage(type, args) {
        const message = Array.from(args).map(arg => {
          try {
            return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
          } catch(e) {
            return String(arg);
          }
        }).join(' ');
        const line = document.createElement('div');
        line.style.color = type === 'error' ? '#ff6b6b' : (type === 'warn' ? '#ffcc00' : '#a6e22e');
        line.textContent = (type === 'error' ? '❌ ' : (type === 'warn' ? '⚠️ ' : '> ')) + message;
        outputDiv.appendChild(line);
        // 自动滚动到底部
        outputDiv.scrollTop = outputDiv.scrollHeight;
      }

      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      console.log = function(...args) { logToPage('log', args); originalLog.apply(console, args); };
      console.error = function(...args) { logToPage('error', args); originalError.apply(console, args); };
      console.warn = function(...args) { logToPage('warn', args); originalWarn.apply(console, args); };

      window.onerror = function(message, source, lineno, colno, error) {
        logToPage('error', [message + ' at ' + source + ':' + lineno]);
        return false;
      };

      try {
        ${tsWarning}
        ${code}
      } catch (err) {
        logToPage('error', [err.message || err]);
      }
    })();
  <\/script>
</body>
</html>
    `
  }

  // 默认返回空
  return '<html><body>不支持的语言类型</body></html>'
})

const runCode = () => {
  if (iframeRef.value && props.snippet) {
    iframeRef.value.srcdoc = generateHtml.value
  }
}

const refresh = () => {
  runCode()
}

const openInNewWindow = () => {
  if (!props.snippet) return
  const html = generateHtml.value
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const newWindow = window.open(url, '_blank')
  if (newWindow) {
    // 释放 Blob URL，避免内存泄漏
    setTimeout(() => URL.revokeObjectURL(url), 100)
  } else {
    console.warn('新窗口被浏览器拦截，请允许弹出窗口')
  }
}

// 监听弹窗打开或 snippet 变化时自动运行
watch(
  () => [props.visible, props.snippet],
  ([newVisible, newSnippet]) => {
    if (newVisible && newSnippet) {
      // 延迟确保 iframe 已挂载
      setTimeout(runCode, 100)
    }
  },
  { deep: true }  // 深度监听 snippet 内容变化
)

// 手动执行一次，解决初次打开时的问题
watch(iframeRef, (newIframe) => {
  if (newIframe && props.visible && props.snippet) {
    runCode()
  }
})
</script>

<template>
  <ElDialog
    title="代码沙箱"
    :visible="visible"
    width="900px"
    :close-on-click-modal="false"
    @close="emit('close')"
  >
    <div class="sandbox-container" v-if="snippet">
      <div class="sandbox-toolbar">
        <ElButton size="small" type="primary" :icon="VideoPlay" @click="runCode">
          运行
        </ElButton>
        <ElButton size="small" :icon="RefreshRight" @click="refresh">
          刷新
        </ElButton>
        <ElButton size="small" :icon="FullScreen" @click="openInNewWindow">
          新窗口打开
        </ElButton>
      </div>

      <ElTabs v-model="activeTab" type="card" class="sandbox-tabs">
        <ElTabPane label="运行结果" name="result">
          <div class="iframe-container">
            <iframe
              ref="iframeRef"
              sandbox="allow-scripts allow-modals allow-popups allow-forms"
              class="sandbox-iframe"
              title="代码运行结果"
            ></iframe>
          </div>
        </ElTabPane>
        <ElTabPane label="源代码" name="code">
          <pre class="code-view">{{ snippet?.code || '暂无代码' }}</pre>
        </ElTabPane>
      </ElTabs>
    </div>
    <div v-else class="empty-state">
      请选择一个代码片段
    </div>

    <template #footer>
      <ElButton :icon="Close" @click="emit('close')">
        关闭
      </ElButton>
    </template>
  </ElDialog>
</template>

<style lang="scss" scoped>
.sandbox-container {
  padding: 16px 0;
}

.sandbox-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.sandbox-tabs {
  height: 400px;
}

.iframe-container {
  height: 350px;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
}

.sandbox-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}

.code-view {
  margin: 0;
  padding: 16px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Fira Code', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  border-radius: 8px;
  max-height: 350px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.empty-state {
  padding: 60px;
  text-align: center;
  color: #999;
}
</style>