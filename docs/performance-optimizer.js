// 性能优化实施脚本 - 立即提升论文加载速度
(function() {
    'use strict';
    
    console.log('🚀 开始应用性能优化...');
    
    // 检查是否已经优化过
    if (window.performanceOptimized) {
        console.log('✅ 性能优化已启用');
        return;
    }
    
    // === 1. 立即应用的优化 ===
    
    // 1.1 优化 Web Worker 批次大小
    function optimizeWorkerBatchSize() {
        if (typeof calculateOptimalBatchSize === 'function') {
            const originalCalc = calculateOptimalBatchSize;
            window.calculateOptimalBatchSize = function(totalPapers, config) {
                const result = originalCalc(totalPapers, config);
                // 减小批次大小以提供更好的进度反馈
                return Math.min(result, 500);
            };
            console.log('✅ Worker 批次大小已优化');
        }
    }
    
    // 1.2 优化渲染性能
    function optimizeRendering() {
        // 替换原有的 renderInChunks 函数
        if (typeof renderInChunks === 'function') {
            const originalRender = renderInChunks;
            window.renderInChunks = function(papers, container, index = 0) {
                const OPTIMIZED_CHUNK_SIZE = 5; // 减小块大小
                
                if (index >= papers.length) {
                    // 渲染完成后的优化
                    requestIdleCallback(() => {
                        optimizeRenderedContent();
                    });
                    return originalRender(papers, container, index);
                }
                
                // 使用 DocumentFragment 优化 DOM 操作
                const fragment = document.createDocumentFragment();
                const endIndex = Math.min(index + OPTIMIZED_CHUNK_SIZE, papers.length);
                
                for (let i = index; i < endIndex; i++) {
                    if (papers[i] && papers[i].id) {
                        try {
                            const paper = papers[i];
                            if (!state.allPapers.has(paper.id)) {
                                state.allPapers.set(paper.id, paper);
                            }
                            
                            // 根据位置决定是否懒加载
                            const shouldBeLazy = i >= 15; // 前15篇直接加载
                            const card = createPaperCard(paper, shouldBeLazy);
                            
                            // 添加性能优化的类
                            card.classList.add('paper-card-auto');
                            
                            fragment.appendChild(card);
                        } catch (e) {
                            console.error('创建卡片失败:', e);
                        }
                    }
                }
                
                container.appendChild(fragment);
                
                // 继续渲染下一批
                if (window.requestIdleCallback) {
                    requestIdleCallback(() => {
                        renderInChunks(papers, container, endIndex);
                    });
                } else {
                    setTimeout(() => {
                        renderInChunks(papers, container, endIndex);
                    }, 10);
                }
            };
            console.log('✅ 渲染性能已优化');
        }
    }
    
    // 1.3 优化已渲染的内容
    function optimizeRenderedContent() {
        const cards = document.querySelectorAll('.paper-card');
        const viewportHeight = window.innerHeight;
        
        cards.forEach((card, index) => {
            const rect = card.getBoundingClientRect();
            
            // 为不在视口内的卡片启用内容可见性优化
            if (rect.bottom < -viewportHeight || rect.top > viewportHeight * 2) {
                card.style.contentVisibility = 'auto';
                card.style.containIntrinsicSize = '280px';
            }
            
            // 为卡片添加硬件加速
            if (index < 20) { // 只为前20个卡片启用
                card.style.willChange = 'transform';
                card.style.transform = 'translateZ(0)';
            }
        });
        
        console.log(`✅ 优化了 ${cards.length} 个已渲染的卡片`);
    }
    
    // 1.4 优化滚动性能
    function optimizeScrolling() {
        let scrollTimeout;
        let isScrolling = false;
        
        const optimizedScrollHandler = () => {
            if (!isScrolling) {
                isScrolling = true;
                // 禁用不必要的动画
                document.body.style.pointerEvents = 'none';
            }
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
                document.body.style.pointerEvents = 'auto';
                
                // 滚动结束后优化内容
                optimizeRenderedContent();
            }, 150);
        };
        
        // 替换现有的滚动监听器
        window.addEventListener('scroll', optimizedScrollHandler, { passive: true });
        console.log('✅ 滚动性能已优化');
    }
    
    // 1.5 优化网络请求
    function optimizeNetworkRequests() {
        // 包装 fetch 函数以添加优化的请求头
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            if (url.includes('.jsonl') || url.includes('data/')) {
                const optimizedOptions = {
                    ...options,
                    headers: {
                        'Accept': 'application/json,text/plain',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Cache-Control': 'public, max-age=3600',
                        ...options.headers
                    }
                };
                return originalFetch(url, optimizedOptions);
            }
            return originalFetch(url, options);
        };
        console.log('✅ 网络请求已优化');
    }
    
    // 1.6 内存管理优化
    function optimizeMemoryManagement() {
        // 增强现有的内存清理
        if (typeof MemoryManager !== 'undefined' && MemoryManager.cleanup) {
            const originalCleanup = MemoryManager.cleanup;
            MemoryManager.cleanup = function() {
                // 执行原始清理
                originalCleanup.call(this);
                
                // 额外的优化清理
                const cards = document.querySelectorAll('.paper-card');
                const viewportHeight = window.innerHeight;
                let cleanedCount = 0;
                
                cards.forEach(card => {
                    const rect = card.getBoundingClientRect();
                    
                    // 清理距离视口很远的卡片内容
                    if (rect.bottom < -viewportHeight * 3 || rect.top > viewportHeight * 4) {
                        const detailsSection = card.querySelector('.ai-details-section');
                        if (detailsSection && detailsSection.innerHTML.length > 500) {
                            detailsSection.innerHTML = '<p class="text-gray-500 text-center py-4">内容已缓存 <button onclick="location.reload()" class="text-blue-500 underline ml-2">重新加载</button></p>';
                            cleanedCount++;
                        }
                        
                        // 移除不必要的事件监听器
                        const buttons = card.querySelectorAll('button');
                        buttons.forEach(btn => {
                            if (!btn.classList.contains('favorite-btn')) {
                                btn.style.pointerEvents = 'none';
                            }
                        });
                    }
                });
                
                if (cleanedCount > 0) {
                    console.log(`🧹 额外清理了 ${cleanedCount} 个远程卡片`);
                }
            };
        }
        
        // 自动内存清理
        setInterval(() => {
            if (performance.memory) {
                const used = performance.memory.usedJSHeapSize;
                const limit = performance.memory.jsHeapSizeLimit;
                
                if (used / limit > 0.75) {
                    console.log('🧹 触发自动内存清理');
                    if (MemoryManager && MemoryManager.cleanup) {
                        MemoryManager.cleanup();
                    }
                    
                    // 强制垃圾回收（如果可用）
                    if (window.gc) {
                        window.gc();
                    }
                }
            }
        }, 30000);
        
        console.log('✅ 内存管理已优化');
    }
    
    // 1.7 预加载优化
    function optimizePreloading() {
        // 智能预加载最新月份
        if (state && state.manifest && state.manifest.availableMonths) {
            const recentMonths = state.manifest.availableMonths.slice(0, 2);
            
            setTimeout(() => {
                recentMonths.forEach(month => {
                    if (!state.loadedMonths.has(month)) {
                        // 使用低优先级预加载
                        fetch(`data/${month}.jsonl`, {
                            headers: {
                                'Accept': 'application/json',
                                'Cache-Control': 'public, max-age=3600'
                            }
                        }).then(response => {
                            if (response.ok) {
                                return response.json();
                            }
                        }).then(papers => {
                            if (papers) {
                                console.log(`📦 预加载完成: ${month} (${papers.length} 篇论文)`);
                                // 将预加载的数据存储到 state 中
                                papers.forEach(paper => {
                                    if (paper.id && !state.allPapers.has(paper.id)) {
                                        state.allPapers.set(paper.id, paper);
                                    }
                                });
                                state.loadedMonths.add(month);
                            }
                        }).catch(error => {
                            console.warn(`预加载失败 ${month}:`, error);
                        });
                    }
                });
            }, 5000); // 页面加载5秒后开始预加载
        }
        
        console.log('✅ 智能预加载已启用');
    }
    
    // 1.7.1 基于用户行为的智能预加载
    function optimizeIntelligentPreloading() {
        // 分析用户阅读模式
        let userBehaviorPattern = {
            readingSpeed: 0, // 每分钟阅读的论文数
            preferredCategories: new Set(),
            activeTimeRanges: [],
            scrollPattern: 'normal' // normal, fast, slow
        };
        
        // 跟踪用户行为
        function trackUserBehavior() {
            let papersViewed = 0;
            let startTime = Date.now();
            
            // 跟踪论文查看
            document.addEventListener('click', (e) => {
                if (e.target.closest('.paper-card')) {
                    papersViewed++;
                    const timeElapsed = (Date.now() - startTime) / 60000; // 分钟
                    userBehaviorPattern.readingSpeed = papersViewed / timeElapsed || 0;
                    
                    // 提取用户偏好分类
                    const card = e.target.closest('.paper-card');
                    const categories = card.querySelectorAll('.keyword-tag');
                    categories.forEach(tag => {
                        userBehaviorPattern.preferredCategories.add(tag.textContent.trim());
                    });
                }
            });
            
            // 跟踪滚动模式
            let scrollCount = 0;
            let lastScrollTime = Date.now();
            window.addEventListener('scroll', () => {
                scrollCount++;
                const currentTime = Date.now();
                const timeDiff = currentTime - lastScrollTime;
                
                if (timeDiff < 100) {
                    userBehaviorPattern.scrollPattern = 'fast';
                } else if (timeDiff > 1000) {
                    userBehaviorPattern.scrollPattern = 'slow';
                } else {
                    userBehaviorPattern.scrollPattern = 'normal';
                }
                lastScrollTime = currentTime;
            });
        }
        
        // 智能预测需要加载的内容
        function predictivePreload() {
            if (userBehaviorPattern.readingSpeed > 5) { // 快速阅读者
                // 预加载更多月份
                const monthsToPreload = state.manifest.availableMonths.slice(0, 4);
                monthsToPreload.forEach(month => preloadMonth(month, 'low'));
            }
            
            if (userBehaviorPattern.scrollPattern === 'fast') {
                // 快速滚动者，预加载下一页内容
                preloadNextPage();
            }
        }
        
        // 启动行为跟踪
        trackUserBehavior();
        
        // 定期执行预测性预加载
        setInterval(predictivePreload, 30000); // 每30秒分析一次
        
        console.log('✅ 智能预测性预加载已启用');
    }
    
    // 1.8 图片懒加载优化
    function optimizeImageLoading() {
        // 如果浏览器支持原生懒加载
        if ('loading' in HTMLImageElement.prototype) {
            const images = document.querySelectorAll('img:not([loading])');
            images.forEach(img => {
                img.loading = 'lazy';
                img.decoding = 'async';
            });
            console.log(`✅ 启用了 ${images.length} 个图片的原生懒加载`);
        }
        
        // 为未来的图片元素设置默认属性
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        const images = node.querySelectorAll ? node.querySelectorAll('img') : [];
                        images.forEach(img => {
                            if (!img.loading) {
                                img.loading = 'lazy';
                                img.decoding = 'async';
                            }
                        });
                        
                        // 如果节点本身是图片
                        if (node.tagName === 'IMG' && !node.loading) {
                            node.loading = 'lazy';
                            node.decoding = 'async';
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('✅ 动态图片懒加载监听已启用');
    }
    
    // 1.8.1 高级图片优化
    function optimizeAdvancedImageLoading() {
        // WebP 支持检测
        function supportsWebP() {
            return new Promise((resolve) => {
                const webP = new Image();
                webP.onload = webP.onerror = () => resolve(webP.height === 2);
                webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
            });
        }
        
        // AVIF 支持检测
        function supportsAVIF() {
            return new Promise((resolve) => {
                const avif = new Image();
                avif.onload = avif.onerror = () => resolve(avif.height === 2);
                avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
            });
        }
        
        // 根据浏览器支持设置最佳图片格式
        Promise.all([supportsWebP(), supportsAVIF()]).then(([webpSupported, avifSupported]) => {
            const preferredFormat = avifSupported ? 'avif' : webpSupported ? 'webp' : 'jpg';
            document.documentElement.setAttribute('data-preferred-image-format', preferredFormat);
            console.log(`✅ 检测到最佳图片格式: ${preferredFormat}`);
        });
    }
    
    // 1.9 CSS 动画优化
    function optimizeAnimations() {
        // 检查用户偏好
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const style = document.createElement('style');
            style.textContent = `
                * {
                    animation-duration: 0.001s !important;
                    transition-duration: 0.001s !important;
                }
            `;
            document.head.appendChild(style);
            console.log('✅ 根据用户偏好禁用了动画');
        } else {
            // 优化动画性能
            const style = document.createElement('style');
            style.textContent = `
                .paper-card {
                    will-change: auto;
                }
                .paper-card:hover {
                    will-change: transform, box-shadow;
                }
                .paper-card.animate-in {
                    animation-duration: 0.3s;
                }
            `;
            document.head.appendChild(style);
            console.log('✅ 动画性能已优化');
        }
    }
    
    // 1.10 事件处理优化
    function optimizeEventHandlers() {
        // 使用事件委托优化点击处理
        document.addEventListener('click', function(e) {
            // 收藏按钮优化
            if (e.target.closest('.favorite-btn')) {
                e.stopPropagation();
                const btn = e.target.closest('.favorite-btn');
                const paperId = btn.dataset.paperId;
                
                if (paperId) {
                    // 使用 requestAnimationFrame 优化 UI 更新
                    requestAnimationFrame(() => {
                        if (state.favorites.has(paperId)) {
                            state.favorites.delete(paperId);
                            btn.classList.remove('favorited');
                        } else {
                            state.favorites.add(paperId);
                            btn.classList.add('favorited');
                        }
                        saveFavorites();
                    });
                }
            }
            
            // 关键词标签点击优化
            if (e.target.classList.contains('keyword-tag')) {
                e.stopPropagation();
                const keyword = e.target.textContent.trim();
                
                // 防止重复点击
                if (e.target.dataset.clicking) return;
                e.target.dataset.clicking = 'true';
                
                setTimeout(() => {
                    delete e.target.dataset.clicking;
                }, 500);
                
                // 异步执行搜索
                setTimeout(() => {
                    if (typeof performSearch === 'function') {
                        performSearch(keyword);
                    }
                }, 0);
            }
        }, { passive: false });
        
        console.log('✅ 事件处理已优化');
    }
    
    // 1.11 高级缓存策略
    function optimizeAdvancedCaching() {
        // 实现 LRU 缓存
        class LRUCache {
            constructor(maxSize = 50) {
                this.maxSize = maxSize;
                this.cache = new Map();
            }
            
            get(key) {
                if (this.cache.has(key)) {
                    // 移动到最前面（最近使用）
                    const value = this.cache.get(key);
                    this.cache.delete(key);
                    this.cache.set(key, value);
                    return value;
                }
                return null;
            }
            
            set(key, value) {
                if (this.cache.has(key)) {
                    this.cache.delete(key);
                } else if (this.cache.size >= this.maxSize) {
                    // 删除最久未使用的项
                    const firstKey = this.cache.keys().next().value;
                    this.cache.delete(firstKey);
                }
                this.cache.set(key, value);
            }
            
            clear() {
                this.cache.clear();
            }
            
            size() {
                return this.cache.size;
            }
        }
        
        // 创建各种缓存实例
        window.paperCache = new LRUCache(100); // 论文内容缓存
        window.searchCache = new LRUCache(20);  // 搜索结果缓存
        window.imageCache = new LRUCache(30);   // 图片缓存
        
        console.log('✅ LRU缓存系统已启用');
    }
    
    // 1.12 网络连接优化
    function optimizeNetworkConnection() {
        // 检测网络状态
        function updateNetworkStatus() {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                const networkInfo = {
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt,
                    saveData: connection.saveData
                };
                
                // 根据网络状况调整策略
                if (networkInfo.saveData || networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
                    // 启用数据节省模式
                    enableDataSavingMode();
                } else if (networkInfo.effectiveType === '4g' && networkInfo.downlink > 10) {
                    // 启用高速模式
                    enableHighSpeedMode();
                }
                
                console.log('📶 网络状态:', networkInfo);
                return networkInfo;
            }
            return null;
        }
        
        // 数据节省模式
        function enableDataSavingMode() {
            document.documentElement.setAttribute('data-connection', 'slow');
            
            // 禁用自动预加载
            window.performanceConfig.enableIntelligentPreload = false;
            
            // 减少批次大小
            window.performanceConfig.batchSize = 200;
            
            // 启用更激进的图片懒加载
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                img.loading = 'lazy';
                if (!img.src.includes('data:')) {
                    img.dataset.src = img.src;
                    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHZpZXdCb3g9IjAgMCAxMCAxMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjRjBGMEYwIi8+Cjwvc3ZnPgo=';
                }
            });
            
            console.log('📱 数据节省模式已启用');
        }
        
        // 高速模式
        function enableHighSpeedMode() {
            document.documentElement.setAttribute('data-connection', 'fast');
            
            // 启用积极预加载
            window.performanceConfig.enableIntelligentPreload = true;
            
            // 增加批次大小
            window.performanceConfig.batchSize = 1000;
            
            // 预加载更多内容
            setTimeout(() => {
                if (state && state.manifest) {
                    const monthsToPreload = state.manifest.availableMonths.slice(0, 5);
                    monthsToPreload.forEach(month => preloadMonth(month, 'high'));
                }
            }, 2000);
            
            console.log('🚀 高速模式已启用');
        }
        
        // 监听网络状态变化
        if (navigator.connection) {
            navigator.connection.addEventListener('change', updateNetworkStatus);
        }
        
        // 初始检测
        updateNetworkStatus();
        
        console.log('✅ 网络连接优化已启用');
    }
    
    // 1.13 CPU 和电池优化
    function optimizePowerConsumption() {
        // 检测电池状态
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                const batteryInfo = {
                    level: battery.level,
                    charging: battery.charging,
                    chargingTime: battery.chargingTime,
                    dischargingTime: battery.dischargingTime
                };
                
                // 低电量模式
                if (batteryInfo.level < 0.2 && !batteryInfo.charging) {
                    enableLowPowerMode();
                }
                
                // 监听电池状态变化
                battery.addEventListener('levelchange', () => {
                    if (battery.level < 0.15 && !battery.charging) {
                        enableLowPowerMode();
                    } else if (battery.level > 0.5 || battery.charging) {
                        disableLowPowerMode();
                    }
                });
                
                console.log('🔋 电池状态:', batteryInfo);
            });
        }
        
        // 低功耗模式
        function enableLowPowerMode() {
            document.documentElement.setAttribute('data-power-mode', 'low');
            
            // 减少动画
            const style = document.createElement('style');
            style.id = 'low-power-style';
            style.textContent = `
                * {
                    animation-duration: 0.1s !important;
                    transition-duration: 0.1s !important;
                }
                .paper-card:hover {
                    transform: none !important;
                }
            `;
            document.head.appendChild(style);
            
            // 降低刷新频率
            window.performanceConfig.refreshRate = 'low';
            
            // 禁用自动预加载
            window.performanceConfig.enableIntelligentPreload = false;
            
            console.log('🔋 低功耗模式已启用');
        }
        
        // 禁用低功耗模式
        function disableLowPowerMode() {
            document.documentElement.removeAttribute('data-power-mode');
            
            const lowPowerStyle = document.getElementById('low-power-style');
            if (lowPowerStyle) {
                lowPowerStyle.remove();
            }
            
            window.performanceConfig.refreshRate = 'normal';
            window.performanceConfig.enableIntelligentPreload = true;
            
            console.log('🔋 低功耗模式已禁用');
        }
        
        console.log('✅ 电源管理优化已启用');
    }
    
    // === 2. 应用所有优化 ===
    
    function applyAllOptimizations() {
        try {
            optimizeWorkerBatchSize();
            optimizeRendering();
            optimizeScrolling();
            optimizeNetworkRequests();
            optimizeMemoryManagement();
            optimizePreloading();
            optimizeImageLoading();
            optimizeAnimations();
            optimizeEventHandlers();
            
            // 标记优化已完成
            window.performanceOptimized = true;
            
            // 显示优化完成通知
            if (typeof showToast === 'function') {
                showToast('⚡ 性能优化已启用，加载速度提升！', 'success');
            }
            
            console.log('🎉 所有性能优化已应用完成！');
            
            // 显示性能统计
            setTimeout(() => {
                displayPerformanceStats();
            }, 2000);
            
        } catch (error) {
            console.error('❌ 应用性能优化时出错:', error);
        }
    }
    
    // === 3. 性能监控 ===
    
    function displayPerformanceStats() {
        if (window.location.search.includes('debug=true')) {
            const stats = {
                papers: state.allPapers?.size || 0,
                loadedMonths: state.loadedMonths?.size || 0,
                memory: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 'N/A',
                optimized: window.performanceOptimized
            };
            
            console.log('📊 性能统计:', stats);
            
            // 在页面上显示统计信息
            const statsElement = document.createElement('div');
            statsElement.style.cssText = `
                position: fixed;
                bottom: 10px;
                left: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px;
                border-radius: 5px;
                font-size: 12px;
                z-index: 1001;
                max-width: 200px;
            `;
            statsElement.innerHTML = `
                <div><strong>性能统计</strong></div>
                <div>论文数: ${stats.papers}</div>
                <div>已加载月份: ${stats.loadedMonths}</div>
                <div>内存使用: ${stats.memory}MB</div>
                <div>优化状态: ${stats.optimized ? '✅' : '❌'}</div>
                <button onclick="this.parentElement.remove()" style="margin-top: 5px; padding: 2px 5px; font-size: 10px;">关闭</button>
            `;
            document.body.appendChild(statsElement);
            
            // 5秒后自动隐藏
            setTimeout(() => {
                if (statsElement.parentElement) {
                    statsElement.remove();
                }
            }, 5000);
        }
    }
    
    // === 4. 初始化优化 ===
    
    // 等待 DOM 和必要的脚本加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyAllOptimizations);
    } else {
        // 如果页面已经加载完成，立即应用优化
        if (typeof state !== 'undefined') {
            applyAllOptimizations();
        } else {
            // 等待 state 初始化
            let checkCount = 0;
            const checkInterval = setInterval(() => {
                if (typeof state !== 'undefined' || checkCount > 20) {
                    clearInterval(checkInterval);
                    if (typeof state !== 'undefined') {
                        applyAllOptimizations();
                    } else {
                        console.warn('⚠️ state 未找到，跳过部分优化');
                        // 仍然应用不依赖 state 的优化
                        optimizeNetworkRequests();
                        optimizeImageLoading();
                        optimizeAnimations();
                        optimizeEventHandlers();
                    }
                }
                checkCount++;
            }, 100);
        }
    }
    
    // === 5. 导出优化控制函数 ===
    
    window.performanceOptimizer = {
        isOptimized: () => window.performanceOptimized,
        getStats: displayPerformanceStats,
        reapplyOptimizations: applyAllOptimizations,
        version: '1.0.0'
    };

})();
