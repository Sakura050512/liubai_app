# 留白 (Liubai) - A Digital Sanctuary for Mental Wellness

[English](#english) | [中文](#中文)

---

## English

### Overview

**留白** (Liubai, meaning "Leaving White Space") is a mental wellness companion app designed to help users journal, breathe, and reflect. It provides a calming digital space for emotional tracking, mood analysis, and psychological term explanations.

### Features

- **Daily Journal** - Record your thoughts and feelings with a minimalist editor
- **Breathing Exercises** - Guided breathing sessions for relaxation
- **Mood Tracking** - Track your emotional journey over time
- **Weekly Reports** - Visual summaries of your wellness journey
- **Mind Dictionary** - Psychological terms explained in simple language
- **Dark/Light Mode** - Comfortable viewing in any lighting condition

### Tech Stack

| Category  | Technology       |
| --------- | ---------------- |
| Framework | React 18 + Vite  |
| Mobile    | Capacitor 8      |
| Styling   | Tailwind CSS 3   |
| Backend   | Supabase         |
| Icons     | Material Symbols |

### Project Structure

```
liubai-app/
├── src/
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Page components
│   ├── lib/            # Supabase client
│   ├── plugins/        # Capacitor plugins
│   └── index.css       # Global styles
├── android/            # Android native project
└── dist/               # Built web assets
```

### Getting Started

#### Prerequisites

- Node.js 18+
- npm or yarn
- Android SDK (for Android builds)

#### Installation

```bash
# Clone the repository
git clone <repository-url>
cd liubai-app

# Install dependencies
npm install

# Start development server
npm run dev
```

#### Build for Android

```bash
# Build web assets
npm run build

# Sync to Android
npx cap sync android

# Build APK
cd android && ./gradlew assembleDebug
```

The APK will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Color Palette

| Name       | Light Mode | Dark Mode |
| ---------- | ---------- | --------- |
| Primary    | #3d5940    | #a8d5a2   |
| Surface    | #fcf9f6    | #1a1c18   |
| Background | #fcf9f6    | #1a1c18   |

### License

MIT License

---

## 中文

### 概述

**留白**是一款心灵 wellness（身心健康）陪伴应用，旨在帮助用户记录日记、呼吸放松和自我反思。它提供了一个宁静的数字空间，用于情绪追踪、心情分析和心理词汇释义。

### 功能特点

- **每日日记** - 用简洁的编辑器记录你的想法和感受
- **呼吸练习** - 引导式呼吸训练，帮助放松身心
- **情绪追踪** - 记录你的情绪历程
- **每周回顾** - 可视化展示你的身心健康状态
- **心灵词典** - 用简洁的语言解释心理学概念
- **深色/浅色模式** - 适应各种光线环境

### 技术栈

| 类别   | 技术             |
| ------ | ---------------- |
| 框架   | React 18 + Vite  |
| 移动端 | Capacitor 8      |
| 样式   | Tailwind CSS 3   |
| 后端   | Supabase         |
| 图标   | Material Symbols |

### 项目结构

```
liubai-app/
├── src/
│   ├── components/     # 可复用 UI 组件
│   ├── hooks/          # 自定义 React hooks
│   ├── pages/          # 页面组件
│   ├── lib/            # Supabase 客户端
│   ├── plugins/        # Capacitor 插件
│   └── index.css       # 全局样式
├── android/            # Android 原生项目
└── dist/               # 构建后的 Web 资源
```

### 快速开始

#### 环境要求

- Node.js 18+
- npm 或 yarn
- Android SDK（用于 Android 构建）

#### 安装

```bash
# 克隆仓库
git clone <仓库-url>
cd liubai-app

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

#### 构建 Android 应用

```bash
# 构建 Web 资源
npm run build

# 同步到 Android
npx cap sync android

# 构建 APK
cd android && ./gradlew assembleDebug
```

APK 文件位置：
`android/app/build/outputs/apk/debug/app-debug.apk`

### 设计规范

#### 颜色系统

| 名称   | 浅色模式 | 深色模式 |
| ------ | -------- | -------- |
| 主色   | #3d5940  | #a8d5a2  |
| 表面色 | #fcf9f6  | #1a1c18  |
| 背景色 | #fcf9f6  | #1a1c18  |

#### 字体

- 标题字体：`font-headline`
- 正文字体：`font-body`

### 许可证

MIT License
