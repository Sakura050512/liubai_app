// 危机求助资源
// 设计原则：
// 1. 求助信息必须在任何时刻都能找到，而不是只有"聊到危机内容"时才出现——
//    人在最难的时候不会先去倾诉，可能只是点开 App 找号码。
// 2. 触发过危机词这件事本身不写库、不上传：那是最敏感的数据，多存一份就多一份风险。
//    只记在本机 localStorage，用来决定"要不要把这个入口推到更显眼的位置"。
// 3. 热线号码只保留长期有效、全国可用的两条，宁可少也不要给错号码。

export const HOTLINES = [
  {
    name: '全国心理援助热线',
    number: '12356',
    tel: '12356',
    hours: '24 小时',
    desc: '国家卫健委开通，全国通用',
  },
  {
    name: '希望24热线',
    number: '400-161-9995',
    tel: '4001619995',
    hours: '24 小时',
    desc: '北京心理危机研究与干预中心',
  },
  {
    name: '紧急医疗 / 报警',
    number: '120 / 110',
    tel: '120',
    hours: '24 小时',
    desc: '当你有立刻的生命危险时',
  },
]

// 危机发生时的完整回应（前端命中即时返回，不经过 AI）
export const CRISIS_REPLY = `我听到了，也谢谢你愿意说出来。你现在的感受很重要，但此刻你需要的是专业的帮助，而我不具备这样的能力。

如果你现在有伤害自己的念头，请一定联系这些地方：
· 全国心理援助热线：12356（24小时）
· 希望24热线：400-161-9995（24小时）

你值得被好好照顾，请现在就去打电话，好吗？`

// 本机记录"是否触发过危机干预"，用来把求助入口提前
const CARE_KEY = 'liubai-care-flag'

export function markCrisisTouched() {
  try {
    localStorage.setItem(CARE_KEY, String(Date.now()))
  } catch {
    /* 隐私模式忽略 */
  }
}

export function hasCrisisHistory() {
  try {
    return !!localStorage.getItem(CARE_KEY)
  } catch {
    return false
  }
}

export function clearCrisisHistory() {
  try {
    localStorage.removeItem(CARE_KEY)
  } catch {
    /* 忽略 */
  }
}
