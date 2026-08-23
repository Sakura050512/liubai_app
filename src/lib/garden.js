// 情绪花园核心逻辑
// 心情分类 → 植物成长映射、等级体系、矢量植物 SVG 生成、成就系统
import { localDayKey } from './date'

// 留白 8 种心情 → 花园 3 类情绪效果(内部使用)
// 愉悦让花绽放,平静让叶生长;其余心情点亮"心情灯"——每一种情绪都是养分
export const MOOD_CATEGORIES = {
  平静: 'calm',
  愉悦: 'happy',
  低落: 'low',
  难过: 'low',
  焦虑: 'anxious',
  不安: 'anxious',
  烦躁: 'anxious',
  疲惫: 'tired',
}

// 每种心情自己的颜色(日历格子 + 图例共用)
// 刻意拉开色相与明度:天蓝/藏青/紫/洋红彼此可分辨
export const MOOD_COLORS = {
  平静: { bg: 'rgba(88,179,131,0.35)', bd: '#3d9e6f' }, // 叶绿
  愉悦: { bg: 'rgba(224,168,60,0.35)', bd: '#d1921f' }, // 琥珀金
  低落: { bg: 'rgba(74,159,216,0.35)', bd: '#2f8fd1' }, // 天蓝
  难过: { bg: 'rgba(90,111,192,0.35)', bd: '#4a5fb5' }, // 藏青
  焦虑: { bg: 'rgba(155,111,216,0.35)', bd: '#8a5ccb' }, // 紫
  不安: { bg: 'rgba(216,111,168,0.35)', bd: '#c75094' }, // 洋红
  烦躁: { bg: 'rgba(224,118,80,0.35)', bd: '#d15e38' }, // 橙红
  疲惫: { bg: 'rgba(163,148,132,0.35)', bd: '#97826f' }, // 暖灰褐
}

export const LEVELS = [
  { name: '种子', icon: 'nutrition', need: 0 },
  { name: '破土', icon: 'grass', need: 1 },
  { name: '幼苗', icon: 'eco', need: 3 },
  { name: '小树', icon: 'park', need: 7 },
  { name: '开花', icon: 'local_florist', need: 14 },
  { name: '花满园', icon: 'spa', need: 25 },
]

const LEVEL_TIPS = [
  '种下一颗种子,等第一滴"心情"落下…',
  '破土啦!它感受到你的记录了',
  '长出小叶子,在轻轻摇摆',
  '小树初成,开始有自己的轮廓了',
  '开花了!开心的记忆都绽放出来',
  '花满园!你的情绪花园,繁花似锦',
]

// 场景状态行文案(按等级)
export const LEVEL_STATUS = [
  '一切伟大的生长,都始于安静地埋下自己。',
  '它收到了你的每一次记录。',
  '正在悄悄积蓄力量。',
  '已经能为你遮一点风雨了。',
  '你的好心情,正在枝头绽放。',
  '繁花似锦,是你认真生活的证明。',
]

// 打卡回馈卡片文案池(按情绪分类)
export const MOOD_CARDS = {
  happy: [
    '快乐值得被郑重收藏。',
    '今天的好心情,花园都替你记住了。',
    '你笑起来的时候,连风都是甜的。',
  ],
  calm: [
    '平静是一种很深的温柔。你做得很好。',
    '你给自己留了空白,真了不起。',
    '安静的日子,也在悄悄滋养你。',
  ],
  low: [
    '谢谢你如实记录这一刻。难过的情绪不是软弱,是你对自己诚实。',
    '没关系,花园会陪你把这一天慢慢养好。',
    '每一种情绪都会路过,你不是一个人。',
  ],
  anxious: [
    '慢慢来。呼吸会帮你的心回到原处。',
    '焦虑的声音很响,但它不代表真相。你已经在这里了。',
  ],
  tired: [
    '今天辛苦了。你不需要一直有力气。',
    '累的时候,允许自己慢下来。',
  ],
}

export function pickCard(category) {
  const pool = MOOD_CARDS[category] || MOOD_CARDS.calm
  return pool[Math.floor(Math.random() * pool.length)]
}

export function levelIndex(points) {
  let i = 0
  for (let k = 0; k < LEVELS.length; k++) if (points >= LEVELS[k].need) i = k
  return i
}

export const levelTip = (idx) => LEVEL_TIPS[idx] || ''

// 由 Supabase mood_records 计算花园状态(按天去重,一天一条取最新)
export function computeGarden(records = []) {
  const dayMap = new Map()
  for (const r of records) {
    const key = localDayKey(r.created_at)
    if (!dayMap.has(key)) dayMap.set(key, r) // records 按 created_at desc 传入 → 保留当天最新
  }
  const days = [...dayMap.values()].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
  let blooms = 0
  let calm = 0
  let care = 0
  for (const r of days) {
    const cat = MOOD_CATEGORIES[r.mood] || 'calm'
    if (cat === 'happy') blooms += 1
    else if (cat === 'calm') calm += 1
    else care += 1
  }
  const points = days.length
  return { points, blooms, calm, care, days, dayMap, level: levelIndex(points) }
}

/* ---------------- 矢量植物 SVG 生成 ---------------- */
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// idx: 等级; blooms: 绽放数; calmLeaves: 平静叶片数; care: 心情灯数
// 低等级也有足够体量:破土/幼苗的主干较高,不会"看不见"
export function buildPlantSVG(idx, blooms, calmLeaves, care) {
  const rnd = mulberry32(idx * 1337 + 42)
  const topY = [360, 250, 210, 170, 130, 90][idx]
  const trunkH = 358 - topY
  const trunkW = [0, 5, 6.5, 8, 9, 10][idx]

  let s = `<defs>
    <linearGradient id="gTrunk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:var(--g-trunk1)"/>
      <stop offset="1" style="stop-color:var(--g-trunk2)"/>
    </linearGradient>
    <linearGradient id="gLeaf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" style="stop-color:var(--g-leaf1)"/>
      <stop offset="1" style="stop-color:var(--g-leaf2)"/>
    </linearGradient>
    <radialGradient id="gPetal" cx="35%" cy="30%" r="80%">
      <stop offset="0" stop-color="#fff6e6"/>
      <stop offset="1" stop-color="#ffc9a3"/>
    </radialGradient>
    <radialGradient id="gGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffe9a8" stop-opacity=".9"/>
      <stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="gMound" cx="50%" cy="38%" r="62%">
      <stop offset="0" style="stop-color:var(--g-mound1)"/>
      <stop offset="1" style="stop-color:var(--g-mound2)"/>
    </radialGradient>
  </defs>`

  s += `<g class="sway-outer"><g class="sway">`

  // 地面:投影 + 小土丘 + 草
  s += `<ellipse cx="150" cy="373" rx="82" ry="12" style="fill:var(--g-shadow)"/>`
  s += `<ellipse cx="150" cy="368" rx="96" ry="17" fill="url(#gMound)"/>`
  for (let i = 0; i < 10; i++) {
    const gx = 105 + rnd() * 90
    const gh = 8 + rnd() * 8
    s += `<path d="M${gx} 360 q ${(rnd() > 0.5 ? 2 : -2)} -${gh} 4 -${gh + 6}" style="stroke:var(--g-grass)" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
  }

  // 叶片 / 花朵 / 心情灯的绘制工具
  const leaf = (x, y, rot, sz = 1) => {
    s += `<g transform="translate(${x},${y}) rotate(${rot}) scale(${sz})">
      <path d="M0 0 C 9 -16, 27 -14, 36 -1 C 27 14, 9 16, 0 0 Z" fill="url(#gLeaf)"/>
      <path d="M2 1 C 12 -5, 23 -7, 34 -1" stroke="rgba(255,255,255,.28)" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    </g>`
  }
  const flower = (x, y, sz = 1, delay = 0) => {
    s += `<g transform="translate(${x},${y}) scale(${sz})" class="bloom" style="animation-delay:${delay}s">
      <g fill="url(#gPetal)">
        <ellipse cx="0" cy="-9" rx="5.5" ry="9.5"/>
        <ellipse cx="0" cy="-9" rx="5.5" ry="9.5" transform="rotate(72)"/>
        <ellipse cx="0" cy="-9" rx="5.5" ry="9.5" transform="rotate(144)"/>
        <ellipse cx="0" cy="-9" rx="5.5" ry="9.5" transform="rotate(216)"/>
        <ellipse cx="0" cy="-9" rx="5.5" ry="9.5" transform="rotate(288)"/>
      </g>
      <circle r="4.5" fill="#ffcf6e"/>
    </g>`
  }
  const lantern = (x, y, delay) => {
    s += `<g transform="translate(${x},${y})" class="lantern" style="animation-delay:${delay}s">
      <line x1="0" y1="-24" x2="0" y2="-5" stroke="rgba(120,120,120,.4)" stroke-width="1"/>
      <circle cy="-3" r="17" fill="url(#gGlow)"/>
      <circle cy="-3" r="4" fill="#ffd166"/>
    </g>`
  }

  if (idx === 0) {
    // 种子 + 初芽
    s += `<ellipse cx="150" cy="355" rx="9" ry="6" style="fill:var(--g-seed)"/>`
    s += `<path d="M150 354 q 4 -10 2 -17" style="stroke:var(--g-sprout)" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
    s += `<ellipse cx="152" cy="337" rx="5.5" ry="3" style="fill:var(--g-sprout-leaf)" transform="rotate(-22 152 337)"/>`
  } else {
    // 主干(轻微弯曲)
    const bend = 2 + rnd() * 3
    s += `<path d="M150 357 C ${152 + bend} ${topY + trunkH * 0.45}, ${148 - bend} ${topY + trunkH * 0.75}, 150 ${topY}" stroke="url(#gTrunk)" stroke-width="${trunkW}" fill="none" stroke-linecap="round"/>`

    // 树枝(等级 3 起)
    const nBranches = idx >= 5 ? 4 : idx >= 4 ? 3 : idx >= 3 ? 2 : 0
    const branchTips = []
    for (let b = 0; b < nBranches; b++) {
      const t = 0.35 + rnd() * 0.4
      const by = topY + trunkH * t
      const bx = 150 + (rnd() > 0.5 ? bend : -bend) * (1 - t)
      const len = trunkH * (0.32 + rnd() * 0.18)
      const dir = rnd() > 0.5 ? 1 : -1
      const dx = len * 0.6 * dir
      const dy = len * 0.74
      const ex = bx + dx
      const ey = by - dy
      s += `<path d="M ${bx} ${by} Q ${bx + dx * 0.5} ${by - dy * 0.35} ${ex} ${ey}" stroke="url(#gTrunk)" stroke-width="3" fill="none" stroke-linecap="round"/>`
      branchTips.push({ x: ex, y: ey, dir })
      leaf(bx + dx * 0.5, by - dy * 0.45, dir * 55 + (rnd() - 0.5) * 20, 0.75 + rnd() * 0.2)
    }

    // 基础叶片 + 平静带来的额外叶片
    const baseLeaves = [0, 2, 3, 5, 7, 9][idx]
    const totalLeaves = baseLeaves + Math.min(calmLeaves, 8)
    const placed = []
    for (let i = 0; i < totalLeaves; i++) {
      const t = 0.12 + rnd() * 0.8
      const y = topY + trunkH * t
      const side = rnd() > 0.5 ? 1 : -1
      const x = 150 + side * (4 + rnd() * 15)
      if (placed.some((p) => Math.abs(p.x - x) < 10 && Math.abs(p.y - y) < 12)) continue
      placed.push({ x, y })
      const rot = side * (20 + rnd() * 55) + (y > 330 ? 40 : 0)
      leaf(x, y, rot, 0.75 + rnd() * 0.35)
    }
    // 枝顶叶片
    for (const tip of branchTips) {
      if (rnd() > 0.35) leaf(tip.x + tip.dir * 6, tip.y - 2, tip.dir * 70 + 15, 0.7 + rnd() * 0.25)
    }

    // 花(等级 4 起:基础 1 朵 + 愉悦绽放数)
    const flowerN = idx >= 4 ? 1 + Math.min(blooms, 6) : 0
    for (let i = 0; i < flowerN; i++) {
      if (branchTips.length && i < branchTips.length + 1 && rnd() > 0.3) {
        const tip = branchTips[i % branchTips.length]
        flower(tip.x + tip.dir * 8, tip.y - 6, 0.8 + rnd() * 0.3, i * 0.12)
      } else {
        const t = idx >= 5 ? 0.2 + rnd() * 0.7 : 0.55 + rnd() * 0.4
        const y = topY + trunkH * t
        const side = rnd() > 0.5 ? 1 : -1
        flower(150 + side * (14 + rnd() * (idx >= 5 ? 48 : 30)), y, 0.8 + rnd() * 0.3, i * 0.12)
      }
    }
    // 等级 5:树冠 + 树顶大花
    if (idx >= 5) {
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * Math.PI * 2 + rnd() * 0.5
        leaf(150 + Math.cos(ang) * 22, topY - 8 + Math.sin(ang) * 14, ang * 57.3 + 90, 0.85 + rnd() * 0.3)
      }
      flower(150, topY - 16, 1.15, 0.2)
      flower(150 - 26, topY - 2, 0.8, 0.34)
      flower(150 + 28, topY - 6, 0.85, 0.28)
    }
  }

  // 心情灯(被接住的情绪)——任何记录都会点亮一盏
  const lanternN = Math.min(care, 5)
  for (let i = 0; i < lanternN; i++) {
    const ly = Math.max(20, topY - 130 + rnd() * 120)
    lantern(150 + (rnd() > 0.5 ? 1 : -1) * (40 + rnd() * 80), ly, i * 0.5)
  }

  s += `</g></g>`
  return `<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">${s}</svg>`
}

/* ---------------- 星光成就 ---------------- */
export const ACHIEVEMENTS = [
  { id: 'first', icon: 'eco', title: '初次播种', desc: '记录第一条心情', check: (g) => g.points >= 1, progress: (g) => `${Math.min(g.points, 1)}/1 天` },
  { id: 'week', icon: 'local_fire_department', title: '一周坚持', desc: '连续打卡 7 天', check: (g, m) => m.maxStreak >= 7, progress: (g, m) => `最长连续 ${m.maxStreak}/7 天` },
  { id: 'month', icon: 'calendar_today', title: '月月相伴', desc: '累计记录 30 天', check: (g) => g.points >= 30, progress: (g) => `${g.points}/30 天` },
  { id: 'rainbow', icon: 'auto_awesome', title: '色彩缤纷', desc: '集齐全部 8 种心情', check: (g, m) => m.moodCount >= 8, progress: (g, m) => `${m.moodCount}/8 种` },
  { id: 'fullweek', icon: 'calendar_view_week', title: '完整的星期', desc: '一周七天都打过卡', check: (g, m) => m.weekdays >= 7, progress: (g, m) => `${m.weekdays}/7 天` },
  { id: 'early', icon: 'wb_twilight', title: '早起的鸟儿', desc: '曾在清晨 8 点前记录', check: (g, m) => m.earliestHour < 8, progress: () => '尚未达成' },
  { id: 'night', icon: 'dark_mode', title: '深夜灯火', desc: '曾在深夜 23 点后记录', check: (g, m) => m.latestHour >= 23, progress: () => '尚未达成' },
  { id: 'bloom', icon: 'local_florist', title: '繁花盛开', desc: '花园达到「开花」阶段', check: (g) => g.level >= 4, progress: (g) => `当前:${LEVELS[g.level].name}` },
  { id: 'fullgarden', icon: 'spa', title: '花满人间', desc: '花园达到「花满园」阶段', check: (g) => g.level >= 5, progress: (g) => `当前:${LEVELS[g.level].name}` },
  { id: 'century', icon: 'workspace_premium', title: '百日之约', desc: '累计记录 100 天', check: (g) => g.points >= 100, progress: (g) => `${g.points}/100 天` },
]

// 计算成就状态;返回 [{...ach, unlocked, progressText}]
export function computeAchievements(records, garden) {
  const days = garden.days // 按日期升序
  const dayKeys = days.map((r) => localDayKey(r.created_at))
  // 历史最长连续天数
  let maxStreak = 0
  let run = 0
  let prev = null
  for (const k of dayKeys) {
    const d = new Date(`${k}T00:00:00`)
    run = prev && Math.round((d - prev) / 86400000) === 1 ? run + 1 : 1
    maxStreak = Math.max(maxStreak, run)
    prev = d
  }
  const moods = new Set(days.map((r) => r.mood))
  const hours = records.map((r) => new Date(r.created_at).getHours())
  const meta = {
    maxStreak,
    moodCount: moods.size,
    weekdays: new Set(records.map((r) => new Date(r.created_at).getDay())).size,
    earliestHour: hours.length ? Math.min(...hours) : 24,
    latestHour: hours.length ? Math.max(...hours) : -1,
  }
  return ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: a.check(garden, meta),
    progressText: a.unlocked ? '' : a.progress(garden, meta),
  }))
}
