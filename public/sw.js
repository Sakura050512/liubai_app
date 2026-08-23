// 留白 PWA Service Worker
// 策略:预缓存 app shell + 运行时缓存同源 GET(网络优先,离线回退缓存/首页)
// 版本更新时把 CACHE 名 bump 一下即可(如 liubai-v2),旧缓存自动清理
const CACHE = 'liubai-v1'
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

  // 音源文件未就绪时会 404,不缓存失败响应,避免把 404 缓存成"正常"
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit
      return fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
        .catch(() => (req.mode === 'navigate' ? caches.match('/index.html') : Response.error()))
    })
  )
})
