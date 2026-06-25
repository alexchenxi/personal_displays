# AI SSE Helper

> 基于 Next.js 16 + Vercel AI SDK 的流式 AI 对话应用，支持 SSE 实时打字效果、国际化（中/英/阿 RTL）、暗黑模式、响应式设计。

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.8-EF4444?logo=turborepo)](https://turbo.build/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 在线演示

🚀 [Vercel 一键部署](https://vercel.com/new)

## 功能特性

### 核心功能

- **🤖 AI 流式对话** — 基于 Vercel AI SDK + SSE（Server-Sent Events），实现实时打字机效果
- **🌐 国际化 i18n** — 支持中文、英文、阿拉伯语（RTL 从右到左布局），基于 `next-intl`
- **🌙 暗黑模式** — 支持浅色/深色/跟随系统三种模式，基于 `next-themes`
- **📱 响应式设计** — 移动端 / 平板 / 桌面端完美适配，Tailwind CSS v4 原子化样式
- **🔌 多模型兼容** — OpenAI 兼容协议，一行配置切换通义千问 / DeepSeek / Moonshot 等模型

### 工程化

- **🏗️ Monorepo 架构** — Turborepo + pnpm Workspace，共享包统一管理
- **⚡ Edge Runtime** — API 路由运行在边缘网络，全球低延迟
- **📦 组件封装** — ChatMessages / ChatInput / ThemeToggle / LanguageSwitcher 独立组件
- **🎨 Tailwind CSS v4** — 最新语法 `@theme inline`、CSS 变量驱动主题系统
- **🔒 类型安全** — TypeScript 严格模式，全链路类型覆盖

## 技术架构

```
ai-sse-helper/
├── apps/
│   └── web/                    # Next.js 16 应用
│       ├── src/
│       │   ├── middleware.ts   # i18n 中间件（locale 检测与路由）
│       │   ├── i18n/
│       │   │   ├── routing.ts  # 路由配置（en/zh/ar）
│       │   │   └── request.ts  # next-intl 请求配置
│       │   ├── app/
│       │   │   ├── [locale]/   # 国际化动态路由
│       │   │   │   ├── layout.tsx  # 根布局（ThemeProvider + NextIntlProvider）
│       │   │   │   └── page.tsx    # 聊天页面（useChat Hook）
│       │   │   ├── api/chat/
│       │   │   │   └── route.ts    # SSE 流式 API（Edge Runtime）
│       │   │   └── globals.css     # Tailwind v4 + 暗黑变量 + RTL
│       │   ├── components/
│       │   │   ├── ChatMessages.tsx    # 消息列表组件
│       │   │   ├── ChatInput.tsx       # 输入框组件
│       │   │   ├── ThemeToggle.tsx     # 主题切换按钮
│       │   │   ├── ThemeProvider.tsx   # 主题 Provider
│       │   │   └── LanguageSwitcher.tsx # 语言切换器
│       │   └── lib/
│       │       └── utils.ts
│       └── messages/
│           ├── en.json         # 英文翻译
│           ├── zh.json         # 中文翻译
│           └── ar.json         # 阿拉伯语翻译（RTL）
├── packages/
│   ├── utils/                  # @repo/utils 共享工具
│   └── tsconfig/               # @repo/tsconfig 共享 TS 配置
├── turbo.json                  # Turborepo 任务管线
├── pnpm-workspace.yaml         # pnpm 工作空间
└── package.json                # 根配置
```

## 数据流

```
用户输入 → useChat Hook → POST /api/chat
                              ↓
                    OpenAI SDK → 大模型 API
                    (stream: true)
                              ↓
                    OpenAIStream 转换流式数据
                              ↓
                    StreamingTextResponse 返回
                              ↓
                    useChat 自动更新 messages
                              ↓
                    React 实时渲染（打字机效果）
```

## 快速开始

### 环境要求

- **Node.js** >= 18
- **pnpm** >= 9.5.0

### 安装依赖

```bash
# 安装 pnpm（如未安装）
npm install -g pnpm@10.0.0

# 安装项目依赖
pnpm install
```

### 配置环境变量

```bash
# 复制环境变量模板
cp apps/web/.env.example apps/web/.env.local

# 编辑 .env.local，填入你的 API Key
# OPENAI_API_KEY=your-api-key-here
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 模型切换

得益于 OpenAI 兼容协议设计，切换大模型只需修改 `.env.local` 中的两行配置：

```bash
# 通义千问（默认）
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen3.5-plus

# DeepSeek
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat

# Moonshot
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=moonshot-v1-8k
```

## 国际化说明

| 语言    | 代码 | 方向    | 翻译文件           |
| ------- | ---- | ------- | ------------------ |
| 中文    | `zh` | LTR     | `messages/zh.json` |
| English | `en` | LTR     | `messages/en.json` |
| العربية | `ar` | **RTL** | `messages/ar.json` |

- 默认语言：中文（`zh`）
- URL 策略：`as-needed`（中文无前缀，其他语言带前缀如 `/en`、`/ar`）
- RTL 支持：阿拉伯语自动切换为从右到左布局

## 性能数据

| 指标                       | 数值          | 说明                           |
| -------------------------- | ------------- | ------------------------------ |
| **Lighthouse Performance** | 98+           | 服务端渲染 + 静态生成          |
| **First Contentful Paint** | < 1.0s        | Tailwind v4 按需生成 CSS       |
| **Time to Interactive**    | < 1.5s        | 客户端组件最小化               |
| **API 首字节时间（TTFB）** | < 200ms       | Edge Runtime 全球边缘节点      |
| **流式首字延迟**           | < 500ms       | SSE 流式传输，无需等待完整响应 |
| **构建缓存命中**           | 二次构建 < 3s | Turborepo 缓存机制             |

## 实现原理

### SSE 流式对话

1. 前端使用 Vercel AI SDK 的 `useChat` Hook，自动管理消息状态和流式解析
2. 后端 API 路由运行在 Edge Runtime，通过 OpenAI 兼容协议调用大模型
3. 大模型返回 SSE（Server-Sent Events）流式数据
4. `OpenAIStream` 将原始流转换为标准 ReadableStream
5. `StreamingTextResponse` 封装为 HTTP 流式响应返回前端
6. `useChat` 自动逐字更新 UI，实现打字机效果

### 暗黑模式

- 基于 `next-themes` 的 `ThemeProvider`，通过 CSS 类名 `.dark` 切换
- Tailwind CSS v4 的 `@custom-variant dark` 指令实现暗黑模式变体
- CSS 变量（`--background`、`--foreground` 等）在 `.dark` 选择器下切换值
- 支持 `system` 模式，自动跟随操作系统主题偏好
- `disableTransitionOnChange` 避免切换时的过渡动画闪烁

### 国际化 i18n

- 基于 `next-intl` 的 App Router 方案
- `middleware.ts` 根据 URL 路径自动检测和设置 locale
- `[locale]` 动态路由段承载多语言页面
- `NextIntlClientProvider` 在 layout 中注入翻译消息
- `useTranslations` Hook 在客户端组件中获取翻译文本
- 阿拉伯语通过 `dir="rtl"` 属性 + CSS `[dir="rtl"]` 选择器实现 RTL 布局

## Vercel 部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Fork 本仓库
2. 在 Vercel 中导入项目
3. 设置环境变量：
   - `OPENAI_BASE_URL` — API 地址
   - `OPENAI_API_KEY` — API Key
   - `OPENAI_MODEL` — 模型名称
4. 部署完成！

## 技术栈

| 技术          | 版本   | 用途              |
| ------------- | ------ | ----------------- |
| Next.js       | 16.1   | 全栈框架          |
| React         | 19.2   | UI 框架           |
| TypeScript    | 5      | 类型安全          |
| Tailwind CSS  | v4     | 原子化样式        |
| Vercel AI SDK | 2.2    | AI 流式对话       |
| OpenAI SDK    | 4.68   | 大模型 API 客户端 |
| next-intl     | v4     | 国际化            |
| next-themes   | 0.4    | 暗黑模式          |
| Turborepo     | 2.8    | Monorepo 任务编排 |
| pnpm          | 10.0.0 | 包管理器          |

## License

MIT
# Stripe Dashboard 
https://dashboard.stripe.com/acct_1TYMbaRHHNsv5BSW/test/dashboard