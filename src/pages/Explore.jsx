import TopBar from '../components/TopBar'
import BottomNav from '../components/BottomNav'
import ThemeToggleButton from '../components/ThemeToggleButton'
import { Link } from 'react-router-dom'

// 探索页：收纳所有「工具型」功能
// 首页只留核心动作（打卡 + 今日词条），工具在这里按心境分组
const GROUPS = [
  {
    key: 'calm',
    title: '缓一缓',
    desc: '此刻需要安抚，让身体先慢下来',
    icon: 'spa',
    items: [
      {
        to: '/breathing',
        icon: 'air',
        title: '呼吸练习',
        desc: '4-4-6-2 呼吸法，随时平复情绪',
        tag: '冥想',
        iconBg: 'bg-tertiary-container/40',
        iconColor: 'text-tertiary',
        tagBg: 'bg-tertiary-container/40',
        tagColor: 'text-tertiary',
      },
      {
        to: '/sound',
        icon: 'waves',
        title: '静心之声',
        desc: '白噪音、雨声、海浪…让心安静下来',
        tag: '声音',
        iconBg: 'bg-primary-container/40',
        iconColor: 'text-primary',
        tagBg: 'bg-primary-container/40',
        tagColor: 'text-primary',
      },
      {
        to: '/garden',
        icon: 'auto_awesome',
        title: '情绪花园',
        desc: '每一次记录都是养分,看你的花园悄悄生长',
        tag: '养成',
        iconBg: 'bg-tertiary-container/40',
        iconColor: 'text-tertiary',
        tagBg: 'bg-tertiary-container/40',
        tagColor: 'text-tertiary',
      },
    ],
  },
  {
    key: 'look',
    title: '看一看',
    desc: '回看走过的路，理解自己的模式',
    icon: 'history',
    items: [
      {
        to: '/weekly',
        icon: 'bar_chart',
        title: '每周报告',
        desc: '查看本周情绪趋势和 AI 分析',
        tag: '数据',
        iconBg: 'bg-surface-container',
        iconColor: 'text-outline',
        tagBg: 'bg-surface-container',
        tagColor: 'text-outline',
      },
      {
        to: '/dictionary',
        icon: 'menu_book',
        title: '心理词典',
        desc: '解读内心的微妙信号，探索情绪背后的科学逻辑',
        tag: '知识',
        iconBg: 'bg-secondary-container/40',
        iconColor: 'text-secondary',
        tagBg: 'bg-secondary-container/40',
        tagColor: 'text-secondary',
      },
    ],
  },
]

export default function Explore() {
  return (
    <div className="relative w-full bg-surface min-h-screen" style={{ overflowX: 'hidden' }}>
      <TopBar right={<ThemeToggleButton />} />

      <main
        className="w-full mx-auto px-4"
        style={{
          maxWidth: 480,
          paddingTop: 'calc(64px + env(safe-area-inset-top) + 24px)',
          paddingBottom: 'calc(96px + env(safe-area-inset-bottom))',
        }}
      >
        {/* 页头 */}
        <section className="mb-6 animate-fade-in">
          <h2 className="font-display text-3xl font-medium text-on-surface mb-2 tracking-tight">
            探索
          </h2>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            想安静一会儿，还是想看看自己走过的路？
          </p>
        </section>

        {/* 分组 */}
        {GROUPS.map((group, gi) => (
          <section
            key={group.key}
            className="w-full mb-8 animate-slide-up"
            style={{ animationDelay: `${gi * 80}ms` }}
          >
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="material-symbols-outlined text-primary/70 text-base">{group.icon}</span>
              <h3 className="font-headline text-sm font-medium text-on-surface tracking-wide">
                {group.title}
              </h3>
            </div>
            <p className="text-on-surface-variant/60 text-xs mb-3 px-1">{group.desc}</p>

            <div className="flex flex-col gap-3">
              {group.items.map((card) => (
                <Link
                  key={card.to}
                  to={card.to}
                  className="group flex items-center gap-4 bg-surface-container-lowest rounded-2xl px-4 py-4 w-full transition-all duration-300 active:scale-[0.99] hover:bg-surface-container-low/70 border border-outline-variant/10"
                  style={{ boxShadow: '0 2px 16px rgba(49,51,47,0.04)' }}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                    <span className={`material-symbols-outlined ${card.iconColor} text-xl`}>
                      {card.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h4 className="font-headline text-sm font-medium text-on-surface">{card.title}</h4>
                      <span className={`text-[9px] tracking-widest uppercase font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${card.tagBg} ${card.tagColor}`}>
                        {card.tag}
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-xs leading-relaxed line-clamp-1">{card.desc}</p>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant text-base flex-shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300">
                    chevron_right
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* 底部轻提示 */}
        <p className="text-center text-on-surface-variant/40 text-xs font-light tracking-wide pb-2">
          给心灵留一点空白
        </p>
      </main>

      <BottomNav />
    </div>
  )
}
