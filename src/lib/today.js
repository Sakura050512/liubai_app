// 首页"今天"模块：把「今天该做什么」算出来，而不是把功能列表摊在用户面前
//
// 设计意图（对应用户最初的抱怨"功能入口有点杂乱"）：
// 首页不再回答"这个 App 有什么"，而是回答"我现在该做什么"。
// 一天最多突出 2 件事，其余收进「还可以」一行小字，避免选择瘫痪。

// 一天的引导项。weight 越小越优先；done=true 的不再出现
// 优先级依据：记录心情(核心) > 写日记(次核心)
export function buildTodayTasks({ moodDone, journalDone, hour = new Date().getHours() }) {
  const tasks = []

  if (!moodDone) {
    tasks.push({
      key: 'mood',
      weight: 0,
      icon: 'sentiment_calm',
      title: '记录此刻的心情',
      desc: '一分钟就够，不用想清楚',
      to: null, // 留在本页，滚到打卡卡
      anchor: 'mood-card',
    })
  }

  if (!journalDone) {
    // 晚上更推日记，白天不催
    const evening = hour >= 19
    tasks.push({
      key: 'journal',
      weight: evening ? 1 : 2,
      icon: 'auto_stories',
      title: evening ? '睡前写几句' : '写今天的日记',
      desc: evening ? '夜里的话最真，写下来就好' : '不用长，想到什么写什么',
      to: '/journal',
    })
  }

  return tasks.filter(Boolean).sort((a, b) => a.weight - b.weight)
}

// 今日进度：0~3，用于顶部轻量进度环/文案
export function todayProgress({ moodDone, journalDone, reviewSeen }) {
  const done = [moodDone, journalDone, reviewSeen].filter(Boolean).length
  return { done, total: 3 }
}

// 一天不同时段的一句问候，让首页不是每天一模一样的字
export function greeting(hour = new Date().getHours()) {
  if (hour < 5) return '夜还长，不用急着睡'
  if (hour < 11) return '早安，今天想从哪儿开始'
  if (hour < 14) return '中午好，给自己一分钟'
  if (hour < 18) return '下午了，还撑得住吗'
  if (hour < 22) return '天黑了，把今天放下来'
  return '夜深了，说两句再睡'
}

// 一句话总结"今天还差什么"，用于卡片副标题
export function todaySummary({ moodDone, journalDone }) {
  const left = []
  if (!moodDone) left.push('心情')
  if (!journalDone) left.push('日记')
  if (!left.length) return '今天该做的都做完了，剩下的时间是你的'
  if (left.length === 1) return `还差一件：${left[0]}`
  return `还差 ${left.length} 件：${left.join('、')}`
}
