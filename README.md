<div align="center">

<img src="logo.png" width="120" alt="留白 Logo" />

# 留白 Liubai

### 给心灵留一点空白

一个专注心理健康与情绪关怀的移动端应用，为用户搭建一个可以记录情绪、倾诉心事、探索自我的宁静数字空间。

[功能特性](#-功能特性) · [技术栈](#-技术栈) · [项目结构](#-项目结构) · [快速开始](#-快速开始) · [设计系统](#-设计系统) · [数据模型](#-数据模型)

</div>

---

## ✨ 功能特性

### 每日情绪打卡
- 8 种情绪 emoji 快速选择（平静、愉悦、低落、难过、焦虑、不安、烦躁、疲惫）
- 3 档情绪强度标记（淡淡地 / 适中 / 很强烈）
- 可添加文字备注，记录情绪背后的故事
- 累计记录统计，养成关注内心的习惯

### AI 倾听对话
- **命名感受模式**：描述你的感受，AI 帮你找到它的心理学名字，并关联词典词条
- **自由倾诉模式**：一个不评判、不建言的树洞，只陪伴和共情
- 基于 Supabase Edge Functions 的 AI 对话服务
- 自动识别心理学概念并用高亮标注

### 每日日记
- 每日随机引导问题，降低写作门槛
- 极简写作编辑器，专注内容本身
- AI 生成心理学视角的温柔反思，不说教、只陪伴
- 历史日记回顾，看见自己的变化

### 心理词典
- 12 个精选心理学词条（冒名顶替综合症、情绪颗粒度、反刍思维等）
- 卡片式翻阅体验，支持搜索
- 词条收藏功能，建立你的专属心理词库
- 词条来源标注（心理学文献、认知行为疗法、依恋理论等）

### 4-4-6-2 呼吸练习
- 吸气 4 秒 → 屏息 4 秒 → 呼气 6 秒 → 屏息 2 秒
- 动态呼吸引导圆圈，视觉化呼吸节奏
- 3 种练习时长（2 分钟 / 5 分钟 / 10 分钟）
- 完成统计与循环进度追踪

### 每周情绪报告
- 自动汇总本周情绪打卡、日记、倾诉数据
- 可视化情绪分布图表
- AI 生成个性化情绪周报，提供温暖的自我关怀建议
- 本周日记摘要速览

### 个人中心
- 自定义头像与昵称
- 情绪打卡 / 日记 / 倾诉统计数据
- 情绪分布趋势（近 14 次）
- 词典收藏管理
- 深色 / 浅色模式切换

### 其他
- 新用户引导动画（Onboarding）
- 深色 / 浅色模式全适配
- Supabase 身份认证与数据存储
- Android 原生状态栏适配

---

## 🛠 技术栈

| 类别 | 技术 | 版本 |
| --- | --- | --- |
| 前端框架 | React | 18.3 |
| 构建工具 | Vite | 5.4 |
| 路由 | React Router DOM | 6.27 |
| 样式方案 | Tailwind CSS | 3.4 |
| 移动端封装 | Capacitor | 8.2 |
| 后端服务 | Supabase（Auth + Database + Edge Functions） | 2.x |
| 图标 | Material Symbols | - |
| 包管理 | npm | - |

---

## 📁 项目结构

```
liubai_app/
├── src/
│   ├── components/            # 公共组件
│   │   ├── BottomNav.jsx      #   底部导航栏
│   │   └── TopBar.jsx         #   顶部导航栏
│   ├── hooks/
│   │   └── useDarkMode.js     #   深色模式 Hook
│   ├── lib/
│   │   ├── ai.js              #   AI 对话封装 + 系统提示词
│   │   └── supabase.js        #   Supabase 客户端
│   ├── pages/
│   │   ├── Onboarding.jsx     #   新用户引导
│   │   ├── Auth.jsx           #   登录注册
│   │   ├── Home.jsx           #   首页（情绪打卡 + 功能入口）
│   │   ├── Talk.jsx           #   AI 倾听对话
│   │   ├── DailyJournal.jsx   #   每日日记
│   │   ├── MindDictionary.jsx #   心理词典
│   │   ├── Breathing.jsx      #   呼吸练习
│   │   ├── WeeklyReport.jsx   #   每周报告
│   │   └── Me.jsx             #   个人中心
│   ├── plugins/
│   │   └── StatusBarColor.ts  #   Capacitor 状态栏插件
│   ├── App.jsx                # 应用入口 + 路由配置
│   ├── main.jsx               # React 挂载点
│   └── index.css              # 全局样式
├── android/                   # Android 原生工程
├── capacitor.config.json      # Capacitor 配置
├── tailwind.config.js         # Tailwind 主题配置
├── vite.config.js             # Vite 构建配置
├── index.html                 # HTML 模板
└── package.json
```

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm
- Android SDK（仅 Android 构建需要）
- Supabase 项目（需自行创建）

### 安装与开发

```bash
# 克隆仓库
git clone https://github.com/Sakura050512/liubai_app.git
cd liubai_app

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 环境变量

在 `src/lib/supabase.js` 中配置你的 Supabase 项目地址和 API Key：

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
)

export { supabase }
```

你还需要在 Supabase 中创建一个 Edge Function `ai-chat` 用于 AI 对话服务。

### 构建 Android 应用

```bash
# 构建 Web 资源
npm run build

# 同步到 Android 工程
npx cap sync android

# 构建 Debug APK
cd android && ./gradlew assembleDebug
```

APK 输出路径：
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🎨 设计系统

### 色彩体系

基于 Material Design 3 的自定义配色，以鼠尾草绿为主色调，营造自然、宁静的氛围。

| 名称 | 色值 | 用途 |
| --- | --- | --- |
| Primary | `#48654a` | 主色 · 按钮 · 强调 |
| Surface | `#fcf9f6` | 页面背景 · 卡片底色 |
| Secondary | `#7e5731` | 次要色 · 词条标签 |
| Tertiary | `#496553` | 辅助色 · 呼吸练习 |
| Error | `#9e422c` | 错误提示 |

### 字体方案

| 用途 | 字体 |
| --- | --- |
| 标题展示 | Lora, Noto Serif SC, serif |
| 页面标题 | Manrope, Plus Jakarta Sans, PingFang SC |
| 正文 | Plus Jakarta Sans, PingFang SC |

### 动效

内置 6 组自定义动画，营造柔和的交互体验：

| 动画 | 用途 |
| --- | --- |
| `fade-in` | 页面 / 元素淡入 |
| `slide-up` | 卡片上滑入场 |
| `scale-in` | 弹窗缩放入场 |
| `float` | 图标悬浮效果 |
| `breathe` | 呼吸圆圈脉冲 |
| `pulse-soft` | 柔和呼吸灯效果 |

---

## 🗄 数据模型

项目使用 Supabase PostgreSQL 作为数据库，主要表结构如下：

| 表名 | 说明 | 关键字段 |
| --- | --- | --- |
| `mood_records` | 情绪打卡记录 | `user_id`, `mood`, `emoji`, `note`, `created_at` |
| `journal_entries` | 日记记录 | `user_id`, `prompt`, `content`, `ai_reflection`, `created_at` |
| `talk_records` | 倾诉对话记录 | `user_id`, `created_at` |
| `dictionary_favorites` | 词典收藏 | `user_id`, `entry_zh`, `created_at` |
| `users_profile` | 用户资料 | `id`, `nickname` |

---

## 🤖 AI 能力

应用通过 Supabase Edge Functions 调用 AI 模型，内置 3 套系统提示词：

| 场景 | 提示词角色 | 特点 |
| --- | --- | --- |
| 倾听对话（命名感受） | AI 情绪伴侣 | 温柔共情，识别心理学概念并标注 |
| 倾听对话（自由倾诉） | AI 倾听者 | 不评判、不建言，纯粹陪伴 |
| 日记反思 | 日记反思助手 | 心理学视角简短反思，像一封短信 |
| 每周报告 | AI 情绪分析师 | 概括情绪基调 + 关注模式 + 关怀建议 |

---

## 📱 应用截图

<div align="center">

| 首页 | AI 对话 | 日记 | 词典 |
| :---: | :---: | :---: | :---: |
| 情绪打卡 | 倾听陪伴 | 写下心声 | 探索内心 |

| 呼吸练习 | 每周报告 | 个人中心 | 引导页 |
| :---: | :---: | :---: | :---: |
| 4-4-6-2 呼吸法 | 情绪分析 | 统计概览 | 初次见面 |

</div>

---

## 📄 许可证

MIT License

---

<div align="center">

**留白** — 在喧嚣的世界里，为你留一片安静的空间。

</div>
