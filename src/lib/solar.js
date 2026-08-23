// 24 节气(21 世纪近似算法,误差 ±1 天,足够日常展示)
// 公式:日期 = [Y×0.2422 + C] - [Y/4],Y 为年份后两位
const TERMS = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
  '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
  '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
  '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
]

// 21 世纪各节气 C 值(对应 TERMS 顺序)
const C21 = [
  5.4055, 20.12, 3.87, 18.73, 5.63, 20.646,
  4.81, 20.1, 5.52, 21.04, 5.678, 21.37,
  7.108, 22.83, 7.5, 23.13, 7.646, 23.042,
  8.318, 23.438, 7.438, 22.36, 7.18, 21.94,
]

function termDay(year, i) {
  const Y = year % 100
  const day = Math.floor(Y * 0.2422 + C21[i]) - Math.floor(Y / 4)
  const month = Math.floor(i / 2) + 1
  return new Date(year, month - 1, day)
}

/**
 * 返回今天的节气信息:
 * - 今天是节气日:{ name, today: true }
 * - 否则:{ name: 下一个节气名, daysAway }
 */
export function getSolarTerm(date = new Date()) {
  const y = date.getFullYear()
  const today = new Date(y, date.getMonth(), date.getDate())

  for (let i = 0; i < 24; i++) {
    const t = termDay(y, i)
    if (t.getTime() === today.getTime()) return { name: TERMS[i], today: true }
  }
  for (let i = 0; i < 24; i++) {
    const t = termDay(y, i)
    if (t > today) {
      return { name: TERMS[i], daysAway: Math.round((t - today) / 86400000) }
    }
  }
  // 跨年:明年小寒
  const t = termDay(y + 1, 0)
  return { name: '小寒', daysAway: Math.round((t - today) / 86400000) }
}
