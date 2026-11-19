// 留白 PWA Service Worker
// 策略:预缓存 app shell + 运行时缓存同源 GET(网络优先,离线回退缓存/首页)
// 版本更新时把 CACHE 名 bump 一下即可(如 liubai-v2),旧缓存自动清理
//
// 注意:这里曾经是 cache-first(先查缓存命中就直接返回),导致发版后用户一直
// 看到旧 bundle——页面看起来「没更新」。现在改成网络优先:每次先要新文件,
// 成功就顺手更新缓存;离线时才用缓存兜底。
const CACHE = 'liubai-v2'
const SHELL = ['/', '/index.html', '/manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // 跨域(Supabase API 等)不拦截

  e.respondWith(
    fetch(req)
      .then((res) => {
        // 只缓存成功响应,避免把 404/500 缓存成"正常"
        if (res.ok && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        }
        return res
      })
      .catch(() =>
        caches
          .match(req)
          .then((hit) => hit || (req.mode === 'navigate' ? caches.match('/index.html') : Response.error()))
      )
  )
})
