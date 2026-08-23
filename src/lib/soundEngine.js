// 静心之声:文件音源引擎
// 音源文件放在 public/sounds/ 下,命名规则见该目录 README.txt
// (white.mp3 / pink.mp3 / rain.mp3 / ocean.mp3 / wind.mp3 / fire.mp3)
// 文件尚未放入时,play() 会 reject,页面展示"音源未就绪"提示

export const SOUNDS = [
  { id: 'white', name: '白噪音', icon: 'graphic_eq', desc: '均匀平稳,遮蔽杂音', color: '#8fb3d9', src: '/sounds/white.mp3' },
  { id: 'pink', name: '粉红噪音', icon: 'blur_on', desc: '柔和低沉,助眠首选', color: '#b39ad6', src: '/sounds/pink.mp3' },
  { id: 'rain', name: '雨声', icon: 'water_drop', desc: '细密雨幕,安心入眠', color: '#7fb4d9', src: '/sounds/rain.mp3' },
  { id: 'ocean', name: '海浪', icon: 'waves', desc: '缓慢潮汐,放空思绪', color: '#5fb8b0', src: '/sounds/ocean.mp3' },
  { id: 'wind', name: '风声', icon: 'air', desc: '林间微风,松弛呼吸', color: '#8fbf83', src: '/sounds/wind.mp3' },
  { id: 'fire', name: '篝火', icon: 'local_fire_department', desc: '噼啪暖意,冬日围炉', color: '#e0a06b', src: '/sounds/fire.mp3' },
]

export const TIMERS = [15, 30, 60]

let audio = null
let currentId = null
let currentVolume = 0.7

export function getPlaying() {
  return currentId
}

/**
 * 播放指定音色(自动停止上一个)。
 * 返回 Promise:resolve = 已开始播放;reject = 加载失败(音源文件缺失/格式不支持/浏览器拦截)。
 * reject 的 payload: { sound: SOUNDS 条目 } 或 { sound: null }(未知 id)
 */
export function play(type) {
  const s = SOUNDS.find((x) => x.id === type)
  if (!s) return Promise.reject({ sound: null })

  stopSound()

  return new Promise((resolve, reject) => {
    const el = new Audio()
    el.src = s.src
    el.loop = true
    el.preload = 'auto'
    el.volume = currentVolume

    let settled = false
    const fail = () => {
      if (settled) return
      settled = true
      currentId = null
      reject({ sound: s })
    }

    el.onerror = fail
    el.play()
      .then(() => {
        if (settled) return
        settled = true
        audio = el
        currentId = type
        resolve()
      })
      .catch(fail)
  })
}

// 停止播放并释放资源(0.8s 音量淡出,避免"啪"地断音)
export function stopSound() {
  if (!audio) {
    currentId = null
    return
  }
  const el = audio
  audio = null
  currentId = null
  const fadeStep = () => {
    try {
      if (el.volume > 0.03) {
        el.volume = Math.max(0, el.volume - 0.07)
        setTimeout(fadeStep, 60)
      } else {
        el.pause()
        el.src = ''
        el.load()
      }
    } catch {
      try {
        el.pause()
        el.src = ''
        el.load()
      } catch {
        /* noop */
      }
    }
  }
  fadeStep()
}

// 音量 0..1(对当前及后续播放生效)
export function setVolume(v) {
  currentVolume = v
  if (audio) audio.volume = v
}
