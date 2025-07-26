// Service Worker for InsightArxiv Performance Optimization
// 提供离线缓存和网络优化功能

const CACHE_NAME = 'insightarxiv-v1.0.0';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/virtual-scroll.js',
    '/optimized-loader.js',
    '/performance-optimizer.js',
    '/json-parser-worker.js'
];

// 需要缓存的动态资源模式
const CACHE_PATTERNS = [
    /\.jsonl$/,
    /\.json$/,
    /\.md$/,
    /\/data\//
];

// 安装事件
self.addEventListener('install', event => {
    console.log('📦 Service Worker 安装中...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('💾 缓存静态资源...');
                return cache.addAll(STATIC_ASSETS.filter(url => {
                    // 检查资源是否存在再缓存
                    return fetch(url, { method: 'HEAD' })
                        .then(() => true)
                        .catch(() => false);
                }));
            })
            .then(() => {
                console.log('✅ Service Worker 安装完成');
                self.skipWaiting();
            })
            .catch(error => {
                console.log('ℹ️ 部分静态资源缓存失败（正常）:', error);
            })
    );
});

// 激活事件
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker 激活中...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (![STATIC_CACHE, DYNAMIC_CACHE].includes(cacheName)) {
                            console.log('🗑️ 删除旧缓存:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker 激活完成');
                return self.clients.claim();
            })
    );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // 只处理同源请求
    if (url.origin !== location.origin) {
        return;
    }
    
    // 处理不同类型的请求
    if (isStaticAsset(request)) {
        event.respondWith(handleStaticAsset(request));
    } else if (isDataRequest(request)) {
        event.respondWith(handleDataRequest(request));
    } else {
        event.respondWith(handleDefaultRequest(request));
    }
});

// 判断是否为静态资源
function isStaticAsset(request) {
    const url = new URL(request.url);
    return STATIC_ASSETS.some(asset => url.pathname.endsWith(asset)) ||
           /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/.test(url.pathname);
}

// 判断是否为数据请求
function isDataRequest(request) {
    const url = new URL(request.url);
    return CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// 处理静态资源（缓存优先）
async function handleStaticAsset(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
        
    } catch (error) {
        console.log('📄 静态资源请求失败:', request.url);
        
        // 返回缓存的版本或离线页面
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 如果是 HTML 请求，返回基本的离线页面
        if (request.destination === 'document') {
            return new Response(getOfflinePage(), {
                headers: { 'Content-Type': 'text/html' }
            });
        }
        
        throw error;
    }
}

// 处理数据请求（网络优先，带缓存回退）
async function handleDataRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // 缓存成功的响应
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            
            console.log('📊 数据已缓存:', request.url);
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('📊 网络请求失败，尝试缓存:', request.url);
        
        // 网络失败时使用缓存
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('💾 使用缓存数据:', request.url);
            return cachedResponse;
        }
        
        // 如果没有缓存，返回错误信息
        return new Response(JSON.stringify({
            error: '数据暂时不可用',
            message: '请检查网络连接',
            cached: false
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 处理默认请求
async function handleDefaultRequest(request) {
    try {
        return await fetch(request);
    } catch (error) {
        const cachedResponse = await caches.match(request);
        return cachedResponse || new Response('Network Error', { status: 503 });
    }
}

// 离线页面
function getOfflinePage() {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>InsightArxiv - 离线模式</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                text-align: center;
                padding: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
            }
            .offline-container {
                background: rgba(255, 255, 255, 0.1);
                padding: 40px;
                border-radius: 15px;
                backdrop-filter: blur(10px);
                max-width: 400px;
            }
            .icon {
                font-size: 64px;
                margin-bottom: 20px;
            }
            h1 {
                margin: 0 0 20px;
                font-size: 24px;
            }
            p {
                margin: 0 0 30px;
                opacity: 0.9;
                line-height: 1.6;
            }
            .retry-btn {
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.3s ease;
            }
            .retry-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
            }
        </style>
    </head>
    <body>
        <div class="offline-container">
            <div class="icon">📱</div>
            <h1>离线模式</h1>
            <p>您当前处于离线状态，正在显示缓存的内容。请检查网络连接后重试。</p>
            <button class="retry-btn" onclick="window.location.reload()">
                🔄 重新加载
            </button>
        </div>
    </body>
    </html>
    `;
}

// 监听消息（用于与主线程通信）
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_CACHE_INFO') {
        getCacheInfo().then(info => {
            event.ports[0].postMessage(info);
        });
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        clearAllCaches().then(() => {
            event.ports[0].postMessage({ success: true });
        });
    }
});

// 获取缓存信息
async function getCacheInfo() {
    const cacheNames = await caches.keys();
    const info = {};
    
    for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        info[name] = {
            count: keys.length,
            urls: keys.map(req => req.url)
        };
    }
    
    return info;
}

// 清理所有缓存
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('🗑️ 所有缓存已清理');
}

console.log('🔧 Service Worker 脚本已加载');
