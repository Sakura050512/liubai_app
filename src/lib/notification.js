// 系统级每日打卡提醒（本地通知）
// Web/预览环境无原生通知能力，静默返回；仅在 Capacitor 原生环境生效。
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'

const NOTIFY_ID = 1
const TIME_MAP = {
  morning: [9, 0],
  noon: [13, 0],
  evening: [21, 0],
}

/**
 * 设置每日提醒。
 * @param {string} timeId 'off' | 'morning' | 'noon' | 'evening'
 * @returns {{ok: boolean, reason?: string}}
 */
export async function setupDailyReminder(timeId) {
  if (!Capacitor.isNativePlatform()) return { ok: false, reason: '此功能需在手机上使用' }

  try {
    const perms = await LocalNotifications.requestPermissions()
    if (perms.display !== 'granted') return { ok: false, reason: '通知权限未开启' }
  } catch {
    return { ok: false, reason: '通知权限请求失败' }
  }

  const time = TIME_MAP[timeId]
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFY_ID }] })
    if (time) {
      const [hour, minute] = time
      await LocalNotifications.schedule({
        notifications: [{
          id: NOTIFY_ID,
          title: '留白 🌿',
          body: '给自己一分钟，记录此刻的心情吧',
          schedule: { on: { hour, minute }, repeats: true },
        }],
      })
    }
    return { ok: true }
  } catch {
    return { ok: false, reason: '提醒设置失败，请重试' }
  }
}
