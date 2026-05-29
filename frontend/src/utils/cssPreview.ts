/**
 * CSS 沙箱预览：根据片段中的选择器生成匹配 DOM，避免所有 CSS 共用同一套 demo 结构
 */

/** 从 CSS 源码解析 .class、#id、标签选择器（先去掉注释） */
export function parseCssTargets(css: string) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const classes = new Set<string>()
  const ids = new Set<string>()
  const elements = new Set<string>()

  for (const m of stripped.matchAll(/\.([a-zA-Z_][\w-]*)/g)) classes.add(m[1])
  for (const m of stripped.matchAll(/#([a-zA-Z_][\w-]*)/g)) ids.add(m[1])

  const elementTags = [
    'body', 'html', 'h1', 'h2', 'h3', 'h4', 'p', 'a', 'button', 'input',
    'textarea', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'header', 'footer', 'nav', 'section', 'article', 'main', 'aside', 'form', 'label', 'span', 'img', 'hr',
  ] as const

  for (const tag of elementTags) {
    const re = new RegExp(`(^|[\\s,{>+~|(])${tag}(?![\\w-])`)
    if (re.test(stripped)) elements.add(tag)
  }

  return {
    classes: [...classes],
    ids: [...ids],
    elements: [...elements],
  }
}

const CARD_RELATED = new Set(['card', 'card-header', 'card-body', 'btn'])

/** 预置 DOM：覆盖常见类名（与项目示例片段对齐） */
const PRESET_BLOCKS: Record<string, string> = {
  container: `
    <div class="container">
      <h2>容器标题</h2>
      <p>用于测试 max-width、margin、padding 等布局样式。</p>
    </div>`,
  card: `
    <div class="card">
      <div class="card-header"><h3>卡片标题</h3></div>
      <div class="card-body">
        <p>卡片正文区域</p>
        <button type="button" class="btn">操作按钮</button>
      </div>
    </div>`,
  wrapper: `
    <div class="wrapper">
      <p>包装器 .wrapper</p>
      <div class="content"><p>内容区 .content</p></div>
    </div>`,
  content: `<div class="content"><p>内容区 .content</p></div>`,
  header: `<header class="header"><h1>页头 .header</h1><nav class="nav"><a href="#">链接 A</a> <a href="#">链接 B</a></nav></header>`,
  footer: `<footer class="footer"><p>页脚 .footer</p></footer>`,
  nav: `<nav class="nav"><a href="#">导航链接 1</a> <a href="#">导航链接 2</a></nav>`,
  sidebar: `<aside class="sidebar"><p>侧边栏 .sidebar</p></aside>`,
  main: `<main class="main"><p>主区域 .main</p></main>`,
  title: `<h2 class="title">标题 .title</h2>`,
  btn: `<button type="button" class="btn">按钮 .btn</button>`,
  active: `<p class="active">激活态 .active</p><p>普通段落</p>`,
  disabled: `<button type="button" class="disabled" disabled>禁用 .disabled</button>`,
}

const ELEMENT_SAMPLES: Record<string, string> = {
  body: '', // body 由外层承载
  html: '',
  h1: '<h1>一级标题 h1</h1>',
  h2: '<h2>二级标题 h2</h2>',
  h3: '<h3>三级标题 h3</h3>',
  h4: '<h4>四级标题 h4</h4>',
  p: '<p>段落文本 p</p>',
  a: '<a href="#">链接 a</a>',
  button: '<button type="button">原生 button</button>',
  input: '<input type="text" placeholder="input 输入框" />',
  textarea: '<textarea rows="2" placeholder="textarea"></textarea>',
  ul: '<ul><li>列表项 1</li><li>列表项 2</li></ul>',
  ol: '<ol><li>有序 1</li><li>有序 2</li></ol>',
  li: '<ul><li>li 列表项</li></ul>',
  table: '<table><thead><tr><th>表头</th></tr></thead><tbody><tr><td>单元格</td></tr></tbody></table>',
  thead: '<table><thead><tr><th>thead</th></tr></thead><tbody><tr><td>数据</td></tr></tbody></table>',
  tbody: '<table><tbody><tr><td>tbody</td></tr></tbody></table>',
  tr: '<table><tbody><tr><td>tr</td></tr></tbody></table>',
  th: '<table><thead><tr><th>th</th></tr></thead></table>',
  td: '<table><tbody><tr><td>td</td></tr></tbody></table>',
  header: '<header><p>header 元素</p></header>',
  footer: '<footer><p>footer 元素</p></footer>',
  nav: '<nav><a href="#">nav 链接</a></nav>',
  section: '<section><p>section 区块</p></section>',
  article: '<article><p>article 文章</p></article>',
  main: '<main><p>main 主内容</p></main>',
  aside: '<aside><p>aside 侧栏</p></aside>',
  form: '<form><label>标签 <input type="text" /></label></form>',
  label: '<label><input type="checkbox" /> label 选项</label>',
  span: '<p>文字 <span>span 行内</span> 效果</p>',
  img: '<img src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'60\'%3E%3Crect fill=\'%23ddd\' width=\'120\' height=\'60\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23666\' font-size=\'12\'%3Eimg%3C/text%3E%3C/svg%3E" alt="示例图" />',
  hr: '<hr />',
}

function wrapBlock(label: string, innerHtml: string) {
  return `
    <section class="sandbox-block">
      <div class="sandbox-tag">${label}</div>
      ${innerHtml}
    </section>`
}

function resolvePresetKeys(classes: string[]) {
  const keys = new Set<string>()
  for (const cls of classes) {
    if (PRESET_BLOCKS[cls]) keys.add(cls)
    if (CARD_RELATED.has(cls)) keys.add('card')
    if (cls === 'card-header' || cls === 'card-body') keys.add('card')
    if (cls === 'nav' && !keys.has('header')) keys.add('nav')
  }
  return [...keys]
}

/** 组装完整 HTML 文档，用户样式置于末尾以覆盖沙箱基础样式 */
export function buildCssPreviewDocument(code: string, title = 'CSS 片段') {
  const { classes, ids, elements } = parseCssTargets(code)
  const blocks: string[] = []
  const coveredClasses = new Set<string>()

  const presetKeys = resolvePresetKeys(classes)
  const showFullPlayground =
    classes.length === 0 && ids.length === 0 && elements.filter((e) => e !== 'body' && e !== 'html').length === 0

  const keysToRender = showFullPlayground ? Object.keys(PRESET_BLOCKS) : presetKeys

  for (const key of keysToRender) {
    blocks.push(wrapBlock(`.${key}`, PRESET_BLOCKS[key]))
    coveredClasses.add(key)
    if (key === 'card') {
      coveredClasses.add('card-header')
      coveredClasses.add('card-body')
      coveredClasses.add('btn')
    }
  }

  for (const cls of classes) {
    if (coveredClasses.has(cls) || CARD_RELATED.has(cls)) continue
    blocks.push(wrapBlock(
      `.${cls}`,
      `<div class="${cls}"><p>匹配 <code>.${cls}</code> 的预览内容</p></div>`,
    ))
    coveredClasses.add(cls)
  }

  for (const id of ids) {
    blocks.push(wrapBlock(
      `#${id}`,
      `<div id="${id}"><p>匹配 <code>#${id}</code> 的预览内容</p></div>`,
    ))
  }

  for (const tag of elements) {
    if (tag === 'body' || tag === 'html') continue
    const sample = ELEMENT_SAMPLES[tag]
    if (sample) blocks.push(wrapBlock(tag, sample))
  }

  if (blocks.length === 0) {
    blocks.push(wrapBlock('默认', PRESET_BLOCKS.container + PRESET_BLOCKS.card))
  }

  const escapedTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* 沙箱结构样式（尽量中性，避免盖住用户 CSS） */
    .sandbox-playground {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.5;
      padding: 16px;
    }
    .sandbox-title {
      margin: 0 0 16px;
      font-size: 14px;
      color: #6b7280;
    }
    .sandbox-block {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px dashed #e5e7eb;
    }
    .sandbox-block:last-child { border-bottom: none; }
    .sandbox-tag {
      font-size: 11px;
      color: #9ca3af;
      font-family: ui-monospace, monospace;
      margin-bottom: 8px;
    }
    .sandbox-tag code { color: #6366f1; }
  </style>
  <style>
${code}
  </style>
</head>
<body>
  <div class="sandbox-playground">
    <p class="sandbox-title">正在预览：<strong>${escapedTitle}</strong></p>
    ${blocks.join('\n')}
  </div>
</body>
</html>`
}
