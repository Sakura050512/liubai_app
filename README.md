<div align="center">

# 🌿 留白 · LiuBai

**给心灵留一点空白**

一个安静、克制的心理健康陪伴应用 —— 记录心情、写点日记、想说的时候说两句。
不需要完美，只需要真实。

<sub>React 18 · Vite 5 · Tailwind CSS 3 · Capacitor 8 (Android) · Supabase · DeepSeek</sub>

</div>

---

## 这是什么

留白不是"效率工具"，也不是社交产品。它每天只做很少的事：问你今天怎么样、给你一块写字的地方、在你开口时听你说。

设计上刻意做减法 —— 没有排行榜、没有连续打卡的惩罚、没有"你已 3 天没记录"的催促。**能少则少**，加任何新模块之前先问一句"它是不是又多了一个人必须处理的界面元素"。

---

## ✨ 功能

| | 功能 | 说明 |
|---|---|---|
| 🎭 | **每日情绪打卡** | 8 种心情 × 3 档强度 + 一句话备注，当天可随时修改 |
| 🌱 | **情绪花园** | 每天记录会长出一株植物：平静长叶子、愉悦开花，其余心情点亮"心情灯" —— 每一种情绪都是养分，不是错误 |
| 📓 | **心情日记** | 引导式提问 + AI 心理学视角的回顾 |
| 💬 | **AI 树洞** | 「命名感受 / 自由倾诉」两种模式，SSE 流式输出；想留就留、想丢就丢 |
| 🧠 | **会话记忆** | 选择"留住"的对话会压成一段第一人称摘要，下次开口时注入上下文 |
| 📊 | **每周报告** | AI 生成的周报，历史周报可回看 |
| 📖 | **心理词典** | 42 个心理学词条，每日推荐一条，可搜索、可收藏 |
| 🌬 | **呼吸练习** | 4-7-8 呼吸法，几分钟的停顿 |
| 🎧 | **声音空间** | 合成音景，工作或睡前听 |
| 📈 | **情绪趋势** | 近 14 天轨迹（跨度自适应），看得见的变化 |
| 🛡 | **危机干预** | 识别到自伤/绝望表达时给出求助热线；求助入口任何时刻都可达 |
| 🔔 | **每日提醒** | 系统级本地通知，时间可选，随时关闭 |
| 🌙 | **深色模式** | 跟随系统或手动切换 |

---

## 🧭 设计原则

这些原则写进了代码注释里，也决定了这个项目"不做什么"。

1. **求助信息要在任何时刻都能找到**
   不是只有聊到危机内容才出现 —— 人在最难的时候不会先去倾诉，可能只是点开 App 找号码。所以热线入口常驻在「我的」页。

2. **危机触发不写库、不上传**
   那是最敏感的数据，多存一份就多一份风险。触发记录只留在本机 `localStorage`，仅用来决定要不要把求助入口推到更显眼的位置。

3. **热线号码宁少勿错**
   只保留长期有效、全国可用的号码。给一个打不通的号码，比不给更糟。

4. **AI 是可选的，不是必需的**
   摘要失败、记忆表未建、流式断流 —— 全部静默降级，主流程永远可用。

5. **克制的界面**
   首屏不放引导词、不弹窗、不催促。加载慢时给骨架屏而不是"加载中…"，出错时给可重试的错误态而不是空白。

---

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 · Vite 5 · React Router 6 · Tailwind CSS 3 |
| 图标 | Material Symbols（自托管 + 子集化，单文件约 70 KB） |
| 字体 | @fontsource 自托管（Lora / Manrope / Plus Jakarta Sans + 系统中文） |
| 移动端 | Capacitor 8（Android，`com.liubai.app`） |
| 后端 | Supabase（PostgreSQL + RLS + Edge Functions） |
| AI | DeepSeek（经 Supabase Edge Function 代理，SSE 流式） |
| 测试 | Vitest（纯函数单元测试，node 环境） |

### 工程要点

- **颜色令牌驱动深色模式**：所有颜色是 CSS 变量（`:root` / `.dark`），Tailwind 里以 `rgb(var(--x) / <alpha-value>)` 引用，所以 `bg-primary/30` 这类透明色在深浅模式下都正确
- **图标字体子集化**：3.96 MB → 约 70 KB，不依赖 Google Fonts CDN；`scripts/subset-icons.py` 可重新生成
  > ⚠️ Material Symbols 的连字组件**首字母大写**（`HOME`、`AUTO_AWESOME`）。新增图标时要确保脚本把它的大写形式一起打进子集，否则该图标会渲染成方块
- **路由懒加载**：每个页面独立 chunk，首屏只下载首页
- **数据库安全**：5 张表全部启用 RLS，用户只能读写自己的数据；AI Key 只存在于 Edge Function 环境变量，前端不持有
- **AI 上下文控制**：对话只带最近 12 条，记忆摘要只注入最近 5 条
- **键盘适配**：`src/lib/keyboard.js` 统一判断软键盘是否弹起 —— 键盘打开时收起底部导航、把输入框贴到键盘上沿（Android 主题为 `adjustResize`，直接用 `window.innerHeight` 变化判断）
- **Service Worker 网络优先**：先请求网络再回退缓存，避免发版后用户仍看到旧 bundle（这是踩过的坑，见 `public/sw.js` 顶部注释）

---

## 🚀 本地开发

> 需要 Node.js 18+

```bash
npm install
npm run dev        # 开发服务器 http://localhost:5173
npm run build      # 生产构建到 dist/
npm run preview    # 预览生产构建
npm test           # 运行单元测试（Vitest）
```

首次运行前需创建 `.env`（见下方「后端设置」），否则登录与数据功能不可用。

---

## 🗄 后端设置（Supabase）

### 1. 创建项目

在 [supabase.com](https://supabase.com) 建项目，记下项目地址（形如 `xxxx.supabase.co`）。

### 2. 前端环境变量

复制 `.env.example` 为 `.env`：

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=<你的 anon public key>
```

> 🔒 **只填 anon / publishable key。** `service_role` / `secret` key 绝不要放进 `.env` —— 带 `VITE_` 前缀的变量会被打进客户端包，任何人打开压缩包就能拿到。

### 3. 建表与 RLS

按顺序在 Dashboard → SQL Editor 执行：

```
supabase/migrations/20260822000000_init.sql        # 5 张业务表 + RLS
supabase/migrations/20261118000000_talk_summaries.sql  # 会话记忆表
```

两个脚本都是幂等的，可安全重复执行。

### 4. 部署 AI Edge Function

函数目录：`supabase/functions/ai-chat/`

```bash
npx supabase login
npx supabase link --project-ref <你的项目 ref>
npx supabase secrets set DEEPSEEK_KEY=<你的 DeepSeek API Key>
npx supabase functions deploy ai-chat
```

也可在 Dashboard 的 Edge Functions 页面新建 `ai-chat`，粘贴 `index.ts` 部署。

> 未部署时应用仍可使用记录、日记、词典等功能，只是 AI 对话不可用（会给出可重试的提示）。

---

## 📦 Android 构建

> **需要 JDK 21**（Capacitor 8 要求）。若 Gradle 报 JDK/toolchain 错误，在 `~/.gradle/gradle.properties` 里指定：
>
> ```properties
> org.gradle.java.home=<你的 JDK 21 路径>
> org.gradle.java.installations.paths=<JDK 17 路径>,<JDK 21 路径>
> ```

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# 产物：android/app/build/outputs/apk/debug/app-debug.apk
```

- 版本号在 `android/app/version.properties`（每次 `assembleDebug` 自动进位）
- 若项目路径含中文，`android/gradle.properties` 中的 `android.overridePathCheck=true` 必须保留
- `./gradlew assembleDebug` 打印 `BUILD SUCCESSFUL` 后进程偶尔不退出属正常现象，直接取产物即可

---

## 📁 目录结构

```
src/
├── pages/           # 12 个页面（懒加载）
│   ├── Onboarding.jsx      # 首次进入的三个问题
│   ├── Auth.jsx            # 登录 / 注册
│   ├── Home.jsx            # 首页：今日打卡 + 趋势
│   ├── Explore.jsx         # 探索：功能入口聚合
│   ├── MoodGarden.jsx      # 情绪花园
│   ├── DailyJournal.jsx    # 心情日记
│   ├── Talk.jsx            # AI 树洞
│   ├── WeeklyReport.jsx    # 周报
│   ├── MindDictionary.jsx  # 心理词典
│   ├── Breathing.jsx       # 呼吸练习
│   ├── Sound.jsx           # 声音空间
│   └── Me.jsx              # 我的：统计 / 收藏 / 设置 / 求助
├── components/      # BottomNav / TopBar / ProfileDrawer / 图表 / 空态 / 错误态 / 骨架屏
├── lib/
│   ├── supabase.js  # 客户端单例
│   ├── ai.js        # AI 调用（SSE 流式 + 非流式回退）
│   ├── memory.js    # 会话摘要的生成与读取
│   ├── crisis.js    # 危机关键词与求助热线
│   ├── garden.js    # 花园：心情映射、成长、SVG 植物、成就
│   ├── keyboard.js  # 软键盘检测 hook
│   ├── today.js     # "今天还差什么"的任务计算
│   ├── soundEngine.js # WebAudio 合成音景
│   └── *.test.js    # 纯函数单元测试
├── context/         # ThemeContext（深色模式）
├── data/            # dictionary.js 词典单一数据源
└── assets/fonts/    # 子集化图标字体
supabase/
├── migrations/      # 建表 SQL（幂等）
└── functions/ai-chat/  # DeepSeek 代理 + SSE + 危机兜底
scripts/             # 图标子集化、图标/音效/启动图生成、APK 内容检查
public/              # manifest、service worker、离线页
```

---

## ✅ 测试

```bash
npm test
```

当前 5 个测试文件、58 个用例，覆盖纯逻辑层：花园成长规则、键盘检测、会话记忆解析、今日任务计算、心情备注。UI 层靠真实设备验证。

---

## 📄 协议

[MIT License](./LICENSE)

---

<div align="center"><sub>

**留白** —— 什么都不做，也是一种照料。

</sub></div>
