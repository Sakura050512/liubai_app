<div align="center">

# 🌿 留白 LiuBai

**「心灵的数字庇护所」**

一个温暖、安静的心理健康陪伴应用。在这里，你可以记录心情、写下日记、诉说心事——不需要完美，只需要真实。

</div>

---

## ✨ 功能

- 🎭 **每日情绪打卡** — 每天记录一次，8 种情绪 + 3 档强度 + 一句话备注，可随时修改
- 🌈 **情绪趋势图** — 近 14 天气情绪轨迹（时间跨度自适应），看自己慢慢变好的样子
- 📓 **心情日记** — 引导式日记 + AI 心理学视角反思
- 📖 **心理词典** — 42 个心理学词条，每日推荐一条，可搜索、可收藏
- 💬 **AI 对话** — 「命名感受 / 自由倾诉」两种模式，AI 树洞倾听；想留就留、想丢就丢
- 🛡️ **危机干预** — 识别到自伤/绝望关键词时，立即给出专业求助热线（前端 + 后端双兜底）
- ⏩ **流式 AI 输出** — 打字机效果，等待不再漫长
- 🌬️ **呼吸练习** — 4-7-8 呼吸法，片刻宁静
- 📊 **每周报告** — AI 生成的周报 + 历史周报保存
- 🔥 **连续打卡** — 坚持记录本身就是一种自我关怀
- 🔔 **每日提醒** — 系统级本地通知（可选时间）
- 🌙 **深色模式** — 跟随系统，或手动切换

---

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 · Vite 5 · Tailwind CSS 3 |
| 图标 | Material Symbols（自托管 · 子集化 41KB） |
| 字体 | @fontsource 自托管（Lora / Manrope / Plus Jakarta Sans + 系统中文） |
| 移动端 | Capacitor 8（Android） |
| 后端 | Supabase（PostgreSQL + RLS + Edge Functions） |
| AI | DeepSeek（经 Supabase Edge Function 代理，SSE 流式） |

### 工程亮点

- **深色模式**：全部颜色用 CSS 变量（`:root` / `.dark` + `rgb(var(--x) / <alpha-value>)`），透明度类在深浅色下均正确
- **图标字体子集化**：3.96MB → 41KB，不依赖 Google CDN（国内可加载），用 `scripts/subset-icons.py` 可重新生成
- **路由懒加载**：每个页面独立 chunk，首屏只下首页代码
- **数据库安全**：所有表启用 RLS（Row Level Security），用户只能读写自己的数据
- **AI 上下文控制**：对话只带最近 12 条，控制 token 与费用
- **危机干预兜底**：edge function 与前端双重检测，AI 不可走时也有一层安全网

---

## 🚀 本地开发

> 需要 Node.js 18+

```bash
npm install
npm run dev        # 启动 Vite 开发服务器 (http://localhost:5173)
npm run build      # 构建生产版本到 dist/
npm run preview    # 预览生产构建
```

---

## 📦 Android 构建

> **需要 JDK 21**（Capacitor 8 标准）。如本地构建报 JDK/toolchain 错误，请：
> 1. 安装 JDK 21，设置 `JAVA_HOME` 指向它；或
> 2. 在用户级 `~/.gradle/gradle.properties` 添加：
>    `org.gradle.java.home=<你的JDK21路径>`
>    `org.gradle.java.installations.paths=<JDK17路径>,<JDK21路径>`

```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
# APK 位于 android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🗄 Supabase 后端设置

### 1. 创建项目

在 [supabase.com](https://supabase.com) 创建项目，记下项目地址（如 `xxxx.supabase.co`）。

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入：

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=<你的 anon key>
```

### 3. 建表 + 安全策略

镜像（Supabase Dashboard → SQL Editor → New query → 粘贴 → Run）：

```
supabase/migrations/20260822000000_init.sql
```

该脚本幂等，会创建全部 5 张表 + RLS 策略。

### 4. 部署 AI Edge Function

**函数**：`supabase/functions/ai-chat/`

**配置密钥**：Edge Function 环境变量需设 `DEEPSEEK_KEY`（DeepSeek API Key）。

```bash
npx supabase login
npx supabase link --project-ref <你的项目ref>
npx supabase secrets set DEEPSEEK_KEY=<你的DeepSeek Key>
npx supabase functions deploy ai-chat
```

或直接在 Dashboard 的 Edge Functions 页面创建 `ai-chat`，粘贴 `supabase/functions/ai-chat/index.ts` 内容并部署。

> 部署后，前端即时流式 + 危机兜底功能才生效。

---

## 📁 目录结构

```
src/
  components/     # 通用组件 (TopBar / BottomNav / MoodTrendChart / EmptyState)
  pages/          # 页面 (Home / Journal / Talk / Dictionary / Me / Breathing / WeeklyReport)
  lib/            # 工具 (supabase / ai / date / moodNote / notification)
  data/           # 词典单一数据源
  hooks/          # useDarkMode (深色模式, 跟随系统)
  assets/fonts/   # 自托管图标字体 (子集化)
supabase/
  migrations/     # 建表 SQL (幂等)
  functions/      # AI Edge Function (SSE 流式)
scripts/
  subset-icons.py # 图标字体子集化脚本
```

---

## 📄 协议

[MIT License](./LICENSE)

---

*留白 —— 给心灵留一点空白。*
