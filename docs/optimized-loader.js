// 优化的数据加载器 - 提升加载速度和用户体验
class OptimizedDataLoader {
    constructor() {
        this.cache = new Map();
        this.loadingPromises = new Map();
        this.preloadQueue = [];
        this.networkSpeed = null;
        this.compressionSupport = this.checkCompressionSupport();
        
        this.initPerformanceMonitoring();
    }
    
    checkCompressionSupport() {
        // 检查浏览器压缩支持
        return {
            gzip: true,
            brotli: 'br' in CompressionStream || false,
            deflate: true
        };
    }
    
    initPerformanceMonitoring() {
        // 测量网络速度
        this.measureNetworkSpeed();
        
        // 监控内存使用
        this.startMemoryMonitoring();
    }
    
    async measureNetworkSpeed() {
        try {
            const startTime = performance.now();
            // 使用一个小的测试文件测量网络速度
            const response = await fetch('data/2025-07-26.jsonl?test=speed', { 
                method: 'HEAD',
                cache: 'no-cache' 
            });
            const endTime = performance.now();
            
            if (response.ok) {
                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                    const bytes = parseInt(contentLength);
                    const duration = (endTime - startTime) / 1000;
                    this.networkSpeed = bytes / duration; // bytes per second
                    
                    console.log(`网络速度测量: ${Math.round(this.networkSpeed / 1024 / 1024 * 10) / 10} MB/s`);
                }
            }
        } catch (error) {
            console.warn('无法测量网络速度:', error);
            this.networkSpeed = 1024 * 1024; // 默认 1MB/s
        }
    }
    
    startMemoryMonitoring() {
        if (performance.memory) {
            setInterval(() => {
                const used = performance.memory.usedJSHeapSize;
                const limit = performance.memory.jsHeapSizeLimit;
                
                if (used / limit > 0.8) {
                    console.warn('内存使用过高，开始清理缓存');
                    this.cleanupCache();
                }
            }, 30000); // 每30秒检查一次
        }
    }
    
    cleanupCache() {
        // 保留最近访问的数据，清理旧数据
        const now = Date.now();
        const maxAge = 10 * 60 * 1000; // 10分钟
        
        for (const [key, data] of this.cache.entries()) {
            if (now - data.timestamp > maxAge) {
                this.cache.delete(key);
                console.log(`清理缓存: ${key}`);
            }
        }
    }
    
    async loadMonth(month, options = {}) {
        const {
            useCache = true,
            priority = 'normal',
            onProgress = null,
            chunked = false
        } = options;
        
        // 检查缓存
        if (useCache && this.cache.has(month)) {
            const cached = this.cache.get(month);
            console.log(`从缓存加载 ${month}`);
            return cached.data;
        }
        
        // 检查是否正在加载
        if (this.loadingPromises.has(month)) {
            console.log(`等待现有加载任务: ${month}`);
            return this.loadingPromises.get(month);
        }
        
        // 创建加载任务
        const loadPromise = this.performLoad(month, {
            priority,
            onProgress,
            chunked
        });
        
        this.loadingPromises.set(month, loadPromise);
        
        try {
            const result = await loadPromise;
            
            // 缓存结果
            this.cache.set(month, {
                data: result,
                timestamp: Date.now()
            });
            
            return result;
        } finally {
            this.loadingPromises.delete(month);
        }
    }
    
    async performLoad(month, options) {
        const { priority, onProgress, chunked } = options;
        
        console.log(`开始加载 ${month} (优先级: ${priority})`);
        
        if (chunked && this.networkSpeed && this.networkSpeed < 1024 * 1024) {
            // 慢网络环境使用分块加载
            return this.loadWithChunking(month, onProgress);
        } else {
            // 正常加载
            return this.loadNormal(month, onProgress);
        }
    }
    
    async loadNormal(month, onProgress) {
        const startTime = performance.now();
        
        try {
            const response = await fetch(`data/${month}.jsonl`, {
                headers: this.getOptimalHeaders(),
                signal: this.createTimeoutSignal(60000) // 60秒超时
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentLength = response.headers.get('content-length');
            const total = contentLength ? parseInt(contentLength) : 0;
            
            if (onProgress && total > 0) {
                onProgress({ loaded: 0, total, phase: 'downloading' });
            }
            
            // 使用流式读取以支持进度回调
            const reader = response.body.getReader();
            const chunks = [];
            let loaded = 0;
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                chunks.push(value);
                loaded += value.length;
                
                if (onProgress && total > 0) {
                    onProgress({ 
                        loaded, 
                        total, 
                        phase: 'downloading',
                        percentage: Math.round((loaded / total) * 100)
                    });
                }
            }
            
            // 合并数据块
            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const combined = new Uint8Array(totalLength);
            let position = 0;
            
            for (const chunk of chunks) {
                combined.set(chunk, position);
                position += chunk.length;
            }
            
            // 解析 JSON
            if (onProgress) {
                onProgress({ loaded: total, total, phase: 'parsing' });
            }
            
            const text = new TextDecoder().decode(combined);
            const papers = JSON.parse(text);
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            const speed = total / (duration / 1000);
            
            console.log(`加载完成 ${month}: ${papers.length} 篇论文, ${Math.round(duration)}ms, ${Math.round(speed / 1024)}KB/s`);
            
            return papers;
            
        } catch (error) {
            console.error(`加载失败 ${month}:`, error);
            throw error;
        }
    }
    
    async loadWithChunking(month, onProgress) {
        console.log(`使用分块加载 ${month}`);
        
        try {
            const response = await fetch(`data/${month}.jsonl`, {
                headers: this.getOptimalHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            let buffer = '';
            let papers = [];
            let processedLines = 0;
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                // 解码数据块
                buffer += decoder.decode(value, { stream: true });
                
                // 处理完整的行
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // 保留最后不完整的行
                
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const paper = JSON.parse(line);
                            papers.push(paper);
                            processedLines++;
                            
                            // 每处理10篇论文更新一次进度
                            if (processedLines % 10 === 0 && onProgress) {
                                onProgress({
                                    loaded: processedLines,
                                    phase: 'streaming',
                                    message: `已加载 ${processedLines} 篇论文`
                                });
                                
                                // 允许UI更新
                                await new Promise(resolve => setTimeout(resolve, 0));
                            }
                        } catch (parseError) {
                            console.warn('解析行失败:', line, parseError);
                        }
                    }
                }
            }
            
            // 处理最后的缓冲区
            if (buffer.trim()) {
                try {
                    const paper = JSON.parse(buffer.trim());
                    papers.push(paper);
                } catch (parseError) {
                    console.warn('解析最后一行失败:', parseError);
                }
            }
            
            console.log(`分块加载完成 ${month}: ${papers.length} 篇论文`);
            return papers;
            
        } catch (error) {
            console.error(`分块加载失败 ${month}:`, error);
            throw error;
        }
    }
    
    getOptimalHeaders() {
        const headers = {
            'Accept': 'application/json,text/plain',
        };
        
        // 添加压缩支持
        const encodings = [];
        if (this.compressionSupport.brotli) encodings.push('br');
        if (this.compressionSupport.gzip) encodings.push('gzip');
        if (this.compressionSupport.deflate) encodings.push('deflate');
        
        if (encodings.length > 0) {
            headers['Accept-Encoding'] = encodings.join(', ');
        }
        
        return headers;
    }
    
    createTimeoutSignal(timeout) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), timeout);
        return controller.signal;
    }
    
    // 智能预加载
    async preloadRecentMonths(count = 3) {
        if (!state.manifest || !state.manifest.availableMonths) {
            console.warn('没有可用的月份清单');
            return;
        }
        
        const recentMonths = state.manifest.availableMonths.slice(0, count);
        console.log(`开始预加载最近 ${count} 个月:`, recentMonths);
        
        // 使用低优先级并发预加载
        const preloadPromises = recentMonths.map(month => 
            this.loadMonth(month, { 
                priority: 'low',
                useCache: true,
                onProgress: (progress) => {
                    console.log(`预加载进度 ${month}:`, progress);
                }
            }).catch(error => {
                console.warn(`预加载失败 ${month}:`, error);
                return null;
            })
        );
        
        // 等待所有预加载完成（允许部分失败）
        const results = await Promise.allSettled(preloadPromises);
        const successful = results.filter(result => result.status === 'fulfilled' && result.value);
        
        console.log(`预加载完成: ${successful.length}/${recentMonths.length} 成功`);
        
        return successful.map(result => result.value);
    }
    
    // 基于用户行为的智能预加载
    async intelligentPreload() {
        // 分析用户阅读历史
        const viewedPapers = Array.from(state.readingHistory?.viewedPapers?.keys() || []);
        if (viewedPapers.length === 0) {
            console.log('没有阅读历史，执行默认预加载');
            return this.preloadRecentMonths();
        }
        
        // 提取用户感兴趣的分类
        const interests = new Set();
        viewedPapers.forEach(paperId => {
            const paper = state.allPapers.get(paperId);
            if (paper && paper.categories) {
                paper.categories.forEach(cat => interests.add(cat));
            }
        });
        
        console.log('用户兴趣分类:', Array.from(interests));
        
        // 预加载包含相关分类的最新月份
        const relevantMonths = state.manifest.availableMonths.slice(0, 2);
        
        for (const month of relevantMonths) {
            if (!this.cache.has(month) && !this.loadingPromises.has(month)) {
                this.loadMonth(month, { 
                    priority: 'low',
                    onProgress: (progress) => {
                        if (progress.phase === 'streaming') {
                            console.log(`智能预加载 ${month}: ${progress.message}`);
                        }
                    }
                }).catch(error => {
                    console.warn(`智能预加载失败 ${month}:`, error);
                });
            }
        }
    }
    
    // 获取加载统计
    getLoadingStats() {
        return {
            cacheSize: this.cache.size,
            activeLoads: this.loadingPromises.size,
            networkSpeed: this.networkSpeed,
            memoryUsage: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            } : null
        };
    }
    
    // 清理资源
    cleanup() {
        this.cache.clear();
        this.loadingPromises.clear();
        this.preloadQueue = [];
        console.log('数据加载器已清理');
    }
}

// 批量操作优化器
class BatchOperationOptimizer {
    constructor() {
        this.pendingUpdates = new Map();
        this.updateTimer = null;
        this.batchSize = 50;
    }
    
    // 批量更新 DOM
    batchDOMUpdate(elementId, updateFunction) {
        this.pendingUpdates.set(elementId, updateFunction);
        
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
        }
        
        this.updateTimer = setTimeout(() => {
            this.flushUpdates();
        }, 16); // 一帧的时间
    }
    
    flushUpdates() {
        const fragment = document.createDocumentFragment();
        
        for (const [elementId, updateFunction] of this.pendingUpdates) {
            try {
                updateFunction(fragment);
            } catch (error) {
                console.error(`批量更新失败 ${elementId}:`, error);
            }
        }
        
        // 一次性应用所有更新
        if (fragment.children.length > 0) {
            const container = document.getElementById('papers-container');
            if (container) {
                container.appendChild(fragment);
            }
        }
        
        this.pendingUpdates.clear();
        this.updateTimer = null;
    }
    
    // 批量处理数据
    async batchProcess(items, processor, options = {}) {
        const {
            batchSize = this.batchSize,
            delay = 0,
            onProgress = null
        } = options;
        
        const results = [];
        
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            
            try {
                const batchResults = await Promise.all(
                    batch.map(item => processor(item))
                );
                
                results.push(...batchResults);
                
                if (onProgress) {
                    onProgress({
                        processed: i + batch.length,
                        total: items.length,
                        percentage: Math.round(((i + batch.length) / items.length) * 100)
                    });
                }
                
                // 给浏览器一些时间处理其他任务
                if (delay > 0 && i + batchSize < items.length) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
            } catch (error) {
                console.error('批量处理错误:', error);
                // 继续处理下一批次
            }
        }
        
        return results;
    }
}

// 导出优化器
window.OptimizedDataLoader = OptimizedDataLoader;
window.BatchOperationOptimizer = BatchOperationOptimizer;

// 创建全局实例
window.dataLoader = new OptimizedDataLoader();
window.batchOptimizer = new BatchOperationOptimizer();
