# Supabase 后端设置

本目录包含「留白」App 的后端定义：

```
supabase/
├── migrations/20260822000000_init.sql   # 完整数据库 schema + RLS 策略（幂等，可重复执行）
└── functions/ai-chat/index.ts           # AI 聊天代理（转发 DeepSeek API）
```

## 首次设置（新项目）

1. 在 [Supabase Dashboard](https://supabase.com/dashboard) 创建项目
2. 打开 **SQL Editor**，粘贴 `migrations/20260822000000_init.sql` 全部执行
3. 部署 edge function（两种方式任选）：
   - **CLI**：
     ```bash
     npx supabase login
     npx supabase link --project-ref <你的项目ref>
     npx supabase functions deploy ai-chat
     npx supabase secrets set DEEPSEEK_KEY=sk-xxx
     ```
   - **Dashboard**：Edge Functions → Create Function → 粘贴 `index.ts` 内容 →
     然后到 **Project Settings → Edge Functions Secrets** 添加 `DEEPSEEK_KEY`
4. 前端环境变量（`.env`，已被 gitignore）：
   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
   注意：`VITE_` 前缀的变量会被打包进客户端，**只放 anon key，不要放任何密钥**。

## 已有线上库（只需升级）

你的表（mood_records / journal_entries / dictionary_favorites / users_profile）已存在，
**只需要执行迁移文件里 `talk_records` 相关的部分**即可（建表 + 补列 + RLS 策略 + 授权），
其余部分会因已存在而自动跳过，整段执行也无害。

若线上库的 `talk_records` 表结构不同且为空，可先执行 `DROP TABLE public.talk_records;`
再运行整个迁移文件。

## 说明

- **AI 密钥**：`DEEPSEEK_KEY` 只配置在 edge function 的环境变量里，永远不要放进前端。
- **RLS**：所有表都启用了行级安全，每个用户只能读写自己的数据。
- **心里话计数**：`talk_records` 只在用户点击「留住这段时光」时写入一行，
  因此「我的」页与每周报告里的心里话条数 = 用户主动留下的次数。
