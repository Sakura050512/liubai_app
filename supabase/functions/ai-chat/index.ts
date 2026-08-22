import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
}

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

// —— 危机干预 ——
// 命中关键词时不调用 DeepSeek，直接返回求助信息（前端也有同类检测，这里做后端兜底）
const CRISIS_RE = /自杀|想死|不想活|活着没意思|结束生命|轻生|自残|伤害自己|活不下去|kill\s*myself|suicide|end\s*my\s*life|hurt\s*myself/i

const CRISIS_REPLY = `我听到了，也谢谢你愿意说出来。你现在的感受很重要，但此刻你需要的是专业的帮助，而我不具备这样的能力。

如果你现在有伤害自己的念头，请一定联系这些地方：
· 全国心理援助热线：12356（24小时）
· 希望24热线：400-161-9995（24小时）

你值得被好好照顾，请现在就去打电话，好吗？`

// 把 DeepSeek 的 SSE 流规范化为我们自己约定的格式：data: {"content":"..."}
function normalizeStream(upstream) {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader()
      let buf = ''
      try {
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
              const content = j?.choices?.[0]?.delta?.content || ''
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
              }
            } catch {
              // 忽略残缺行
            }
          }
        }
      } catch {
        // 上游中断
      } finally {
        try { controller.enqueue(encoder.encode('data: [DONE]\n\n')) } catch {}
        try { controller.close() } catch {}
      }
    },
  })
}

// 生成一段固定内容的 SSE 流（危机回复）
function staticStream(text) {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const { messages, stream } = await req.json()

  // 危机兜底
  const lastUser = [...(messages || [])].reverse().find((m) => m.role === 'user')
  const isCrisis = lastUser && CRISIS_RE.test(lastUser.content || '')

  if (stream) {
    // 流式响应（SSE）
    const body = isCrisis ? staticStream(CRISIS_REPLY) : (await fetchDeepSeekStream(messages))
    return new Response(body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  // 非流式响应（兼容旧客户端）
  if (isCrisis) {
    return Response.json({ content: CRISIS_REPLY }, { headers: corsHeaders })
  }
  try {
    const content = await fetchDeepSeekOnce(messages)
    return Response.json({ content }, { headers: corsHeaders })
  } catch {
    return Response.json({ error: 'AI 服务暂时不可用' }, { status: 500, headers: corsHeaders })
  }
})

async function fetchDeepSeekStream(messages) {
  const key = Deno.env.get('DEEPSEEK_KEY')
  if (!key) return staticStream('AI 服务未配置密钥，请联系管理员。')
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: DEEPSEEK_MODEL, messages, stream: true }),
  })
  if (!res.ok || !res.body) return staticStream('抱歉，我现在有点走神了，再试一次吧。')
  return normalizeStream(res)
}

async function fetchDeepSeekOnce(messages) {
  const key = Deno.env.get('DEEPSEEK_KEY')
  if (!key) throw new Error('no key')
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: DEEPSEEK_MODEL, messages }),
  })
  if (!res.ok) throw new Error('upstream error')
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content || ''
  if (!content) throw new Error('empty content')
  return content
}
