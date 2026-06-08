# odeWhisper - AI 驱动的代码工作台
一个面向开发者的在线工具，提供代码片段管理、AI 智能对话、安全代码执行沙箱。帮助个人开发者沉淀代码资产，提升编码效率。

线上 Demo（前端）：https://code-whisper-mvp-pqj8-48norljby-dranbes-projects.vercel.app/
后端 API 地址：https://code-whisper-mvp-pqj8.vercel.app/

## 功能特性
1.代码片段管理
  创建、编辑、删除、收藏代码片段，支持标签分类与全文搜索，数据存储于浏览器 localStorage（后续升级为云端存储）。
2.AI 智能对话
    基于 DeepSeek 大模型，实现流式打字机效果，支持多轮对话与代码解释。可引用已保存的代码片段作为上下文。
3.代码沙箱
  安全执行 JavaScript / HTML / CSS 代码，通过 iframe + QuickJS 沙箱隔离，实时预览运行结果。
4.远程协作就绪
  项目全程 Git 管理，完整文档，支持异步沟通与独立部署。

## 技术栈
前端： Vue 3 + TypeScript + Pinia + Vite
UI 组件： Element Plus
后端：	Node.js + Express + LangChain
AI 模型：	DeepSeek API（OpenAI 兼容）
部署:	前端 Vercel   后端 Docker
版本控制:	Git

## 本地运行
前置条件
Node.js >= 18
npm / yarn / pnpm
DeepSeek API Key（自行申请配置）

## 克隆项目
bash
git clone https://github.com/fadasdf/CodeWhisper-Mvp
cd CodeWhisper-Mvp
前端启动
bash
cd frontend
npm install
cp .env.example .env   # 配置后端 API 地址（本地开发可保持默认）
npm run dev
访问 http://localhost:5173

后端启动
bash
cd backend
npm install
cp .env.example .env   # 填入 DEEPSEEK_API_KEY
npm run dev
后端运行于 http://localhost:4000
开发环境下，通过nginx反向代理解决跨域问题

## 部署步骤
前端（Vercel）
  将 frontend 目录推送到 GitHub。
  在 Vercel 中导入仓库，设置 Root Directory 为 frontend。
  添加环境变量 VITE_API_BASE_URL = 后端线上地址。

后端（Docker）
  将 backend 目录推送到 GitHub。
  在 Render 中创建 Web Service，选择仓库，设置 Root Directory 为 backend。
  添加环境变量 DEEPSEEK_API_KEY。
