// 会话记忆：把每次「留住」的对话压缩成一段第一人称摘要，
// 下次开口时注入 system prompt，让 AI 记得你最近在想什么。
//
// 设计要点：
// 1) 摘要失败绝不影响主流程——留住对话本身永远优先，摘要是锦上添花；
// 2) talk_summaries 表未创建时（用户还没跑迁移）静默降级，
//    记忆功能自动关闭，不报错、不阻塞；
// 3) 只取最近 MEMORY_LIMIT 条，控制 token 与费用。
import { supabase } from './supabase'
import { chat } from './ai'

// 注入 system prompt 的摘要条数上限
export const MEMORY_LIMIT = 5

const SUMMARY_PROMPT = `你是一个记忆整理助手。下面是用户刚刚结束的一段对话记录。

请输出 JSON（不要任何额外文字、不要代码块标记），格式：
{"title":"6字以内的短标题","summary":"第一人称回忆","mood":"一个情绪词"}

要求：
- summary 用"我"的口吻，1~2 句、60字以内，像用户自己事后回想；
- 只记值得记的：ta 提到的人/事/处境、情绪走向、还没解开的心结；
- 不记寒暄、不记 App 名称、不做评判、不给建议；
- 如果这段对话没有实质内容，summary 返回空字符串。`

/**
 * 让 AI 把一段对话压缩成一条记忆摘要。
 * 返回 { title, summary, mood }，失败或内容为空时返回 null。
 */
export async function summarizeConversation(transcript) {
  if (!transcript || transcript.trim().length < 20) return null

  try {
    const raw = await chat([
      { role: 'system', content: SUMMARY_PROMPT },
      { role: 'user', content: transcript.slice(0, 2000) },
    ])
    if (!raw) return null

    // 容错：模型可能包了 ```json 或前后带说明文字
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    const summary = (parsed.summary || '').trim()
    if (!summary) return null

    return {
      title: (parsed.title || '').trim().slice(0, 12) || null,
      summary: summary.slice(0, 200),
      mood: (parsed.mood || '').trim().slice(0, 10) || null,
    }
  } catch {
    return null
  }
}

/**
 * 读取最近的会话记忆。
 * @returns {Array<{title,summary,mood,created_at}>} 失败时返回空数组
 */
export async function loadMemories(userId, limit = MEMORY_LIMIT) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('talk_summaries')
    .select('title, summary, mood, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return [] // 表不存在 / 网络问题 → 静默关闭记忆功能
  return data || []
}

/**
 * 写入一条会话记忆。失败静默（不影响「留住对话」的主流程）。
 */
export async function saveMemory(userId, memory, talkId = null) {
  if (!userId || !memory?.summary) return false
  const { error } = await supabase.from('talk_summaries').insert({
    user_id: userId,
    talk_id: talkId,
    title: memory.title,
    summary: memory.summary,
    mood: memory.mood,
  })
  return !error
}

/**
 * 把记忆片段拼成一段可注入 system prompt 的文本。
 * 没有记忆时返回空字符串（调用方据此跳过拼接）。
 */
export function buildMemoryBlock(memories) {
  if (!memories || memories.length === 0) return ''

  const lines = memories
    .slice()
    .reverse() // 旧 → 新，读起来像时间线
    .map((m) => `· ${m.summary}`)
    .join('\n')

  return `\n\n【你记得的、ta 之前提过的事】
${lines}

把这些当成"你还记得"的背景，不要复述、不要逐条提及，也不要说"我记得你说过"。
只有在上下文自然相关时，才轻轻带一句。`
}

/**
 * 把一条新生成的记忆接进已有的 prompt 块（不重新请求数据库）。
 * 已有块为空时，直接生成完整的新块。
 */
export function appendMemoryToBlock(currentBlock, memory) {
  const line = `· ${memory.summary}`

  // 还没有任何记忆块 → 造一个
  if (!currentBlock) {
    return buildMemoryBlock([memory])
  }

  // 块结构是：\n\n【标题】\n<逐行>\n\n<结尾叮嘱>
  const marker = '【你记得的、ta 之前提过的事】\n'
  const at = currentBlock.indexOf(marker)
  if (at === -1) return currentBlock + '\n' + line

  const head = currentBlock.slice(0, at + marker.length)
  const rest = currentBlock.slice(at + marker.length)
  const tailAt = rest.indexOf('\n\n')
  const body = tailAt === -1 ? rest : rest.slice(0, tailAt)
  const tail = tailAt === -1 ? '' : rest.slice(tailAt)

  return head + body + '\n' + line + tail
}

/**
 * 供页面判断记忆功能是否可用（表是否已建好）。
 */
export async function isMemoryAvailable(userId) {
  if (!userId) return false
  const { error } = await supabase
    .from('talk_summaries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .limit(1)
  return !error
}
