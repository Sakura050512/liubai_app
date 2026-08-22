// 心理词典唯一数据源（Home / MindDictionary / Me 共用，避免多处维护不一致）

export const ALL_ENTRIES = [
  // —— 原有 12 条 ——
  { zh: '冒名顶替综合症', en: 'Impostor Syndrome', source: '心理学文献', desc: '一种觉得自己的成就是靠运气、随时会被人看穿的感觉。它有名字，很多人都有。' },
  { zh: '情绪颗粒度', en: 'Emotional Granularity', source: '情感神经科学', desc: '精确区分和描述自己情绪细节的能力。颗粒度越高，情绪调节能力往往越强。' },
  { zh: '边界感', en: 'Psychological Boundaries', source: '心理咨询学', desc: '对自我与他人关系的清晰认知，了解哪些行为是可接受的，哪些是不可接受的。' },
  { zh: '过度共情', en: 'Empathy Fatigue', source: '临床心理学', desc: '长期吸收他人的痛苦而导致的情感耗竭状态，常见于助人工作者和高敏感人群。' },
  { zh: '反刍思维', en: 'Rumination', source: '认知行为疗法', desc: '反复回想过去的负面事件或问题，无法从中解脱。是抑郁和焦虑的常见认知模式。' },
  { zh: '心理韧性', en: 'Resilience', source: '积极心理学', desc: '在逆境、创伤或压力后能够恢复、适应甚至成长的能力。它不是天生的，是可以培养的。' },
  { zh: '依恋焦虑', en: 'Attachment Anxiety', source: '依恋理论', desc: '对亲密关系中被抛弃的强烈恐惧，常表现为反复确认对方的感情和过度依赖。' },
  { zh: '认知失调', en: 'Cognitive Dissonance', source: '社会心理学', desc: '当一个人持有两种相互矛盾的信念时产生的心理不适感，常驱使人改变行为或观念来消除不适。' },
  { zh: '习得性无助', en: 'Learned Helplessness', source: '行为心理学', desc: '经历多次失败后，即使环境改变、成功有可能，也不再尝试的心理状态。' },
  { zh: '高敏感人格', en: 'Highly Sensitive Person', source: '人格心理学', desc: '对外界刺激（声音、情绪、细节）有比常人更深度的感知和处理，是一种天生的神经系统特质。' },
  { zh: '焦虑性依附', en: 'Anxious Attachment', source: '依恋理论', desc: '在亲密关系中持续担心被忽视或抛弃，需要频繁的确认和安慰才能感到安心。' },
  { zh: '自我效能感', en: 'Self-Efficacy', source: '社会认知理论', desc: '对自己完成特定任务或应对挑战能力的信念。高自我效能感的人更愿意尝试和坚持。' },

  // —— 扩充 30 条 ——
  { zh: '正念', en: 'Mindfulness', source: '积极心理学', desc: '有意识地把注意力放在当下，不加评判地观察自己的感受和想法。练习正念就像给心灵做拉伸。' },
  { zh: '心流', en: 'Flow', source: '积极心理学', desc: '完全沉浸在某件事中、忘记时间流逝的状态。心流越多，生活满意度往往越高。' },
  { zh: '自我关怀', en: 'Self-Compassion', source: '临床心理学', desc: '像对待好朋友一样善待自己，尤其是在失败和痛苦的时候。自我关怀不是放纵，是恢复力的来源。' },
  { zh: '拖延症', en: 'Procrastination', source: '行为心理学', desc: '明知该做却迟迟不行动。拖延常常不是懒，而是对失败、评价或不适感的回避。' },
  { zh: '完美主义', en: 'Perfectionism', source: '人格心理学', desc: '以不现实的高标准要求自己，把犯错等同于失败。适度追求卓越有益，极端完美主义会带来焦虑。' },
  { zh: '精神内耗', en: 'Mental Friction', source: '通俗心理学', desc: '大量心理能量消耗在自我怀疑、反复纠结和内在冲突上，让人什么都没做却疲惫不堪。' },
  { zh: '煤气灯效应', en: 'Gaslighting', source: '社会心理学', desc: '一种通过否认、歪曲事实来操控他人，让对方怀疑自己记忆和判断的心理操控方式。' },
  { zh: '情绪劳动', en: 'Emotional Labor', source: '社会心理学', desc: '为了符合工作要求或社交期待，压抑真实情绪、表演特定情绪所付出的心理代价。' },
  { zh: '达克效应', en: 'Dunning-Kruger Effect', source: '认知心理学', desc: '能力不足的人容易高估自己，而专家反而容易低估自己。知道得越多，越能看见自己的无知。' },
  { zh: '损失厌恶', en: 'Loss Aversion', source: '行为经济学', desc: '失去带来的痛苦远大于得到同等东西带来的快乐。这是大脑的默认设置，不是你的错。' },
  { zh: '锚定效应', en: 'Anchoring Effect', source: '认知心理学', desc: '做判断时过度依赖最先获得的信息。比如先看到的数字会影响后续的估计。' },
  { zh: '峰终定律', en: 'Peak-End Rule', source: '认知心理学', desc: '人们对一段体验的评价，主要由体验中的高峰时刻和结尾决定，而不是全程的平均感受。' },
  { zh: '蔡格尼克记忆效应', en: 'Zeigarnik Effect', source: '认知心理学', desc: '未完成的事情比已完成的事情更容易被记住，也因此不断在脑海中盘旋。' },
  { zh: '幸存者偏差', en: 'Survivorship Bias', source: '逻辑学', desc: '只看到"幸存"的例子，忽略了失败者。比如只看到成功者，而看不到同样努力却失败的人。' },
  { zh: '破窗效应', en: 'Broken Window Theory', source: '社会心理学', desc: '环境中小的混乱如果不加制止，会诱导更多混乱。整洁有序的环境本身会传递"被尊重"的信号。' },
  { zh: '踢猫效应', en: 'Kicked Cat Effect', source: '情绪心理学', desc: '负面情绪沿着等级链向下传递，最终发泄在最弱小、最无辜的对象身上。' },
  { zh: '野马效应', en: 'Wild Horse Effect', source: '情绪心理学', desc: '因小事过度反应，被自己的情绪消耗——就像被吸血蝙蝠叮咬后狂奔不止的野马。' },
  { zh: '标签效应', en: 'Labeling Effect', source: '社会心理学', desc: '被贴上某种标签后，人会不自觉地向标签描述的方向靠拢。' },
  { zh: '超限效应', en: 'Over-limit Effect', source: '心理学', desc: '刺激过多、过强或作用时间过久，反而会引起心理不耐烦甚至逆反。' },
  { zh: '鸟笼效应', en: 'Birdcage Effect', source: '行为心理学', desc: '有了鸟笼，就会不自觉地去买鸟。拥有某件东西后，会不断配置与之配套的事物。' },
  { zh: '安慰剂效应', en: 'Placebo Effect', source: '心理生理学', desc: '仅仅因为相信有效，就真的产生生理或心理改善。信念本身就有力量。' },
  { zh: '决策疲劳', en: 'Decision Fatigue', source: '认知心理学', desc: '做大量决策后，判断质量下降、自控力减弱。少做无关决定，把意志力留给重要的事。' },
  { zh: '睡眠拖延', en: 'Revenge Bedtime Procrastination', source: '行为心理学', desc: '白天没有属于自己的时间，于是明知该睡却熬夜"报复性"地享受自由。' },
  { zh: '季节性情绪失调', en: 'Seasonal Affective Disorder', source: '临床心理学', desc: '秋冬日照减少时出现的情绪低落、嗜睡和乏力，通常春夏回暖后缓解。' },
  { zh: '社交焦虑', en: 'Social Anxiety', source: '临床心理学', desc: '对社交场合或被人审视的强烈恐惧。注意：社交焦虑不等于内向，内向是偏好，焦虑是痛苦。' },
  { zh: '创伤后成长', en: 'Post-Traumatic Growth', source: '积极心理学', desc: '经历过创伤的人，在痛苦之后反而发展出更深的关系、更强的韧性或新的人生意义。' },
  { zh: '心理防御机制', en: 'Defense Mechanism', source: '精神分析', desc: '潜意识里用来缓冲焦虑和痛苦的心理策略，如否认、合理化、压抑。它在保护你，也可能让你看不清自己。' },
  { zh: '投射效应', en: 'Projection Bias', source: '社会心理学', desc: '把自己内心的特质、情绪或动机归因到别人身上。你怎么想别人，常常映照出你怎么想自己。' },
  { zh: '习得性乐观', en: 'Learned Optimism', source: '积极心理学', desc: '乐观不是天生的，是可以学习的解释风格：把坏事看作暂时的、局部的、可改变的。' },
  { zh: '多巴胺戒断', en: 'Dopamine Detox', source: '通俗心理学', desc: '暂时远离短视频、游戏等即时快感来源，让大脑的奖励系统恢复对平淡生活的敏感度。' },
]

// 按天轮换的"今日词条"（天数取模，保证每天稳定、全局一致）
export function todayEntryIndex() {
  return Math.floor(Date.now() / 86400000) % ALL_ENTRIES.length
}

export function todayEntry() {
  return ALL_ENTRIES[todayEntryIndex()]
}
