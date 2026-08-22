import { supabase } from './supabase'

/**
 * AI 对话。
 * @param messages 消息数组
 * @param onDelta  可选流式回调，每来一段文本调用一次
 * @returns 完整回复文本
 */
export async function chat(messages, onDelta) {
  if (onDelta) {
    try {
      return await streamChat(messages, onDelta)
    } catch {
      // 流式失败时回退到非流式，保证可用
    }
  }
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: { messages },
  })
  if (error) throw new Error(error.message || 'AI 服务不可用')
  if (data?.error) throw new Error(data.error)
  return data.content
}

// 流式调用：edge function 返回 SSE（data: {"content":"..."}），解析后逐段回调
// 注意：supabase-js 的 functions.invoke 返回 { data, error }；
// 当响应 Content-Type 为 text/event-stream 时，data 就是 Response 本身（data.body 为流），
// 且 invoke 会忽略 responseType 参数。
async function streamChat(messages, onDelta) {
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: { messages, stream: true },
  })
  if (error) throw new Error(error.message || 'AI 服务不可用')
  if (!data || !data.body) throw new Error('流式响应不可用')

  const reader = data.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const j = JSON.parse(payload)
        const content = j?.content || j?.choices?.[0]?.delta?.content || ''
        if (content) {
          full += content
          onDelta(content)
        }
      } catch { /* 忽略不完整行 */ }
    }
  }
  return full
}

export const SYSTEM_PROMPT_FEELING = `你是"留白"App的AI情绪伴侣，专注心理健康领域。
用温柔、不评判的语气回应用户的情绪描述。
如果能识别出用户描述对应的心理学概念，用「词条名称」格式标注（例如「冒名顶替综合症」）。
回复控制在80字以内，语气像一位理解你的朋友，不说教，不给建议，只是陪伴和共情。`

export const SYSTEM_PROMPT_JOURNAL = `你是"留白"App的日记反思助手。
用户写完今天的日记后，你给出一段简短的心理学视角的反思。
如果发现关键词，可以用「心理学概念」格式标注。
回复控制在60字以内，温柔、不评判，像一封写给用户的短信。`

export const SYSTEM_PROMPT_TALK = `你是"留白"App的AI倾听者，一个安静、不评判的树洞。
用户向你倾诉心事，你只需要陪伴和共情，不要说教、不要给建议、不要急着解决问题。
回复控制在80字以内，简短温柔，像一位理解你的朋友。
如果用户明显在描述一种情绪，可以轻声说一句"我听到了"，并问一句"这种感觉持续多久了"，帮助用户把感受说出来。`

// —— 危机干预 ——
// 命中关键词时不调用 AI，立即返回求助信息（前端即时响应；edge function 有同样检测兜底）
export const CRISIS_RE = /自杀|想死|不想活|活着没意思|结束生命|轻生|自残|伤害自己|活不下去|kill\s*myself|suicide|end\s*my\s*life|hurt\s*myself/i

export const CRISIS_REPLY = `我听到了，也谢谢你愿意说出来。你现在的感受很重要，但此刻你需要的是专业的帮助，而我不具备这样的能力。

如果你现在有伤害自己的念头，请一定联系这些地方：
· 全国心理援助热线：12356（24小时）
· 希望24热线：400-161-9995（24小时）

你值得被好好照顾，请现在就去打电话，好吗？`