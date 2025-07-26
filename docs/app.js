
// --- 全局状态管理 ---
const state = {
    manifest: null, searchIndex: null, categoryIndex: null, allPapers: new Map(),
    loadedMonths: new Set(), currentMonthIndex: -1, isFetching: false, isSearchMode: false,
    navObserver: null, currentQuery: '', favorites: new Set(), viewMode: 'detailed',
    allCategories: [],
    mainCategories: ['cs.CV', 'cs.LG', 'cs.CL', 'cs.AI', 'cs.RO', 'stat.ML'],
    // 新增：用户提供的支持分类列表 (已去重)
    supportedCategories: [
        'cs.CR', 'cs.AI', 'cs.LG', 'cs.MA', 'cs.RO', 'cs.CV', 'cs.HC', 'cs.ET', 'cs.SE', 
        'cs.SI', 'cs.NI', 'cs.IT', 'cs.AR', 'cs.DC', 'cs.CY', 'cs.CE', 'cs.FL', 
        'eess.SY', 'eess.SP', 'eess.IV', 'eess.AS', 'cs.CL', 'cs.DS', 'cs.GR', 
        'cs.IR', 'cs.NE', 'math.NA', 'cs.SD', 'cs.SC', 'cs.SY', 'cs.TO'
    ],
    currentSearchResults: [],
    activeCategoryFilter: 'all',
    activeDateFilters: new Map(),
    // 新增状态
    theme: 'light',
    searchHistory: [],
    searchSuggestions: [],
    searchHistoryVisible: false,
    currentSuggestionIndex: -1,
    paperTags: new Map(), // 用户自定义标签 paperID -> [tags]
    paperNotes: new Map(), // 论文笔记 paperID -> note
    paperRatings: new Map(), // 论文评分 paperID -> rating(1-5)
    favoriteGroups: new Map(), // 收藏夹分组 groupName -> Set<paperID>
    keyboardNavigation: {
        enabled: true,
        currentFocusIndex: -1,
        focusableElements: []
    },
    // 移动端状态
    mobile: {
        isMenuOpen: false,
        isTouchDevice: 'ontouchstart' in window,
        swipeThreshold: 50,
        touchStartX: 0,
        touchEndX: 0,
        isSwipeGestureActive: false
    },
    // 用户引导状态
    tutorial: {
        isActive: false,
        currentStep: 0,
        totalSteps: 6,
        isFirstVisit: false,
        hasSeenWelcome: false,
        steps: [
            {
                target: 'header',
                title: '欢迎使用 AI 论文每日速览',
                content: '这里展示每日最新的 AI 研究论文，所有内容都配有 AI 增强的中文摘要，帮助您快速了解前沿研究。',
                position: 'bottom'
            },
            {
                target: '#searchInput',
                title: '智能搜索功能',
                content: '在这里输入关键词搜索论文。支持搜索论文标题、作者、摘要内容，还有智能搜索建议和历史记录。',
                position: 'bottom'
            },
            {
                target: '#quick-nav',
                title: '时间导航',
                content: '点击不同月份快速跳转到对应时间的论文。支持键盘导航和移动端手势操作。',
                position: 'bottom'
            },
            {
                target: '.paper-card:first-child',
                title: '论文卡片功能',
                content: '每张论文卡片包含原文摘要、AI 增强的中文摘要，以及收藏、分享等功能。点击"查看 AI 分析"展开详细解读。',
                position: 'top'
            },
            {
                target: '.view-toggle',
                title: '视图切换',
                content: '在详细视图和紧凑视图之间切换，根据您的阅读习惯选择最适合的展示方式。',
                position: 'bottom'
            },
            {
                target: '#theme-toggle',
                title: '个性化设置',
                content: '切换深色/浅色主题，支持系统主题跟随。所有设置都会自动保存。',
                position: 'bottom'
            }
        ]
    },
    // 用户偏好设置
    userPreferences: {
        hasSeenTutorial: false,
        preferredTheme: 'system',
        defaultView: 'detailed',
        autoHideWelcome: false,
        showTooltips: true,
        enableKeyboardNav: true,
        // 新增个性化偏好
        autoSaveInterval: 30000, // 自动保存间隔(毫秒)
        recommendationEnabled: true,
        maxRecentPapers: 50,
        customCategories: new Map(), // 自定义分类
        paperInteractions: new Map(), // 论文交互记录
        readingGoals: {
            dailyTarget: 5,
            weeklyTarget: 30,
            currentStreak: 0,
            longestStreak: 0
        },
        // Web Worker性能偏好
        workerPreferences: {
            enableWorkers: true,
            preferWorkerOverFallback: true,
            timeoutStrategy: 'adaptive', // 'fixed', 'adaptive', 'aggressive'
            maxTimeoutMinutes: 5,
            retryFailedWorkers: true,
            adaptiveBatchSizing: true,
            enableStuckDetection: true,
            stuckDetectionThreshold: 30000, // 30 seconds
            maxRetryAttempts: 2,
            enableAsyncImageProcessing: true // Enable OffscreenCanvas features
        }
    },
    // 阅读历史和行为追踪
    readingHistory: {
        viewedPapers: new Map(), // paperID -> { timestamp, duration, interactions }
        readingSessions: [], // 阅读会话记录
        preferences: new Map(), // 基于行为的偏好权重
        recommendations: [] // 智能推荐列表
    },
    // 数据管理
    dataManagement: {
        lastBackup: null,
        autoBackup: true,
        backupInterval: 24 * 60 * 60 * 1000, // 24小时
        exportFormats: ['json', 'csv', 'bibtex', 'markdown'],
        syncEnabled: false
    }
};

// --- DOM 元素引用 ---
const mainContainer = document.getElementById('main-content');
const papersContainer = document.getElementById('papers-container');
const searchResultsContainer = document.getElementById('search-results-container');
const skeletonContainer = document.getElementById('skeleton-container');
const searchInput = document.getElementById('searchInput');
const loader = document.getElementById('loader');
const endOfListMessage = document.getElementById('end-of-list-message');
const quickNavContainer = document.getElementById('quick-nav-container');
const searchBarContainer = document.getElementById('search-bar-container');
const backToTopBtn = document.getElementById('back-to-top');
const lastUpdatedEl = document.getElementById('last-updated');
const searchInfoEl = document.getElementById('search-info');
const toastNotificationEl = document.getElementById('toast-notification');
const categoryFilterContainer = document.getElementById('category-filter-container');
const categoryFiltersEl = document.getElementById('category-filters');
const progressContainer = document.getElementById('progress-container');
const topLoaderBar = document.getElementById('top-loader-bar');
const progressText = document.getElementById('progress-text');
// 新增：错误处理元素
const errorContainer = document.getElementById('error-container');
const errorMessageSpan = document.getElementById('error-message');
const retryLoadBtn = document.getElementById('retry-load-btn');

// DOM 元素引用
const themeToggle = document.getElementById('theme-toggle');
const themeIconLight = document.getElementById('theme-icon-light');
const themeIconDark = document.getElementById('theme-icon-dark');
const searchHistoryToggle = document.getElementById('search-history-toggle');
const searchHistoryPanel = document.getElementById('search-history-panel');
const searchSuggestions = document.getElementById('search-suggestions');
const searchHistoryItems = document.getElementById('search-history-items');
const readingProgressBar = document.getElementById('reading-progress-bar');
const swipeIndicatorRight = document.getElementById('swipe-indicator-right');

// 用户引导元素引用 - 使用安全的获取方式
const tutorialBtn = document.getElementById('tutorial-btn') || null;
const helpBtn = document.getElementById('help-btn') || null;
const welcomeCard = document.getElementById('welcome-card') || null;
const quickActions = document.getElementById('quick-actions') || null;
const popularKeywords = document.getElementById('popular-keywords') || null;
const tutorialOverlay = document.getElementById('tutorial-overlay') || null;
const tutorialCard = document.getElementById('tutorial-card') || null;
const tutorialHighlight = document.getElementById('tutorial-highlight') || null;
const tutorialProgress = document.getElementById('tutorial-progress') || null;
const tutorialTitle = document.getElementById('tutorial-title') || null;
const tutorialContent = document.getElementById('tutorial-content') || null;
const tutorialFeatures = document.getElementById('tutorial-features') || null;
const tutorialPrevBtn = document.getElementById('tutorial-prev') || null;
const tutorialNextBtn = document.getElementById('tutorial-next') || null;
const tutorialSkipBtn = document.getElementById('tutorial-skip') || null;
const tutorialProgressText = document.getElementById('tutorial-progress-text') || null;
const tutorialProgressFill = document.getElementById('tutorial-progress-fill') || null;
const featureTooltip = document.getElementById('feature-tooltip') || null;
const firstVisitIndicator = document.getElementById('first-visit-indicator') || null;
const startTutorialBtn = document.getElementById('start-tutorial') || null;
const exploreNowBtn = document.getElementById('explore-now') || null;

// 个性化功能元素引用 - 使用安全的获取方式
const settingsBtn = document.getElementById('settings-btn') || null;
const dataManagementBtn = document.getElementById('data-management-btn') || null;
const settingsModal = document.getElementById('settings-modal') || null;
const dataManagementModal = document.getElementById('data-management-modal') || null;
const recommendationsPanel = document.getElementById('recommendations-panel') || null;
const closeSettingsModal = document.getElementById('close-settings-modal') || null;
const closeDataModal = document.getElementById('close-data-modal') || null;
const closeRecommendations = document.getElementById('close-recommendations') || null;

// --- 性能监控和内存管理 ---
const performance = {
    startTime: 0,
    loadTimes: new Map(),
    memoryUsage: 0,
    workerStats: {
        activeWorkers: new Map(),
        completedTasks: [],
        failedTasks: [],
        averageProcessingTime: 0,
        successRate: 0
    },

    startTracking(operation) {
        this.startTime = Date.now();
        console.log(`⏱️ Started: ${operation}`);
    },

    endTracking(operation) {
        const duration = Date.now() - this.startTime;
        this.loadTimes.set(operation, duration);
        console.log(`✅ Completed: ${operation} in ${duration}ms`);

        // 检查内存使用情况
        if (window.performance && window.performance.memory) {
            this.memoryUsage = window.performance.memory.usedJSHeapSize / 1024 / 1024;
            console.log(`🧠 Memory usage: ${this.memoryUsage.toFixed(1)}MB`);

            // 如果内存使用超过 200MB，建议用户刷新页面
            if (this.memoryUsage > 200) {
                showToast('内存使用过高，建议刷新页面以获得更好性能', 'warning');
            }
        }
    },

    // Enhanced Worker performance tracking
    updateWorkerStats(stats) {
        const { month, processed, total, speed, estimatedRemaining } = stats;
        
        this.workerStats.activeWorkers.set(month, {
            processed,
            total,
            speed,
            estimatedRemaining,
            lastUpdate: Date.now()
        });
        
        // Update UI if available
        this.updateWorkerStatsDisplay();
    },

    recordWorkerSuccess(month, processingTime, paperCount) {
        this.workerStats.completedTasks.push({
            month,
            processingTime,
            paperCount,
            timestamp: Date.now(),
            success: true
        });
        
        // Remove from active workers
        this.workerStats.activeWorkers.delete(month);
        
        // Calculate updated statistics
        this.calculateWorkerMetrics();
        
        console.log(`📊 Worker completed: ${month} in ${processingTime}ms (${paperCount} papers)`);
    },

    recordWorkerFailure(month, reason, timeElapsed) {
        this.workerStats.failedTasks.push({
            month,
            reason,
            timeElapsed,
            timestamp: Date.now(),
            success: false
        });
        
        // Remove from active workers
        this.workerStats.activeWorkers.delete(month);
        
        // Calculate updated statistics
        this.calculateWorkerMetrics();
        
        console.warn(`⚠️ Worker failed: ${month} - ${reason} after ${timeElapsed}ms`);
    },

    calculateWorkerMetrics() {
        const allTasks = [...this.workerStats.completedTasks, ...this.workerStats.failedTasks];
        const recentTasks = allTasks.filter(task => 
            Date.now() - task.timestamp < 60 * 60 * 1000 // Last hour
        );
        
        if (recentTasks.length > 0) {
            const successfulTasks = recentTasks.filter(task => task.success);
            this.workerStats.successRate = successfulTasks.length / recentTasks.length;
            
            if (successfulTasks.length > 0) {
                this.workerStats.averageProcessingTime = 
                    successfulTasks.reduce((sum, task) => sum + task.processingTime, 0) / successfulTasks.length;
            }
        }
        
        // Update display
        this.updateWorkerStatsDisplay();
    },

    updateWorkerStatsDisplay() {
        // Update worker stats in UI if element exists
        const workerStatsEl = document.getElementById('worker-stats');
        if (workerStatsEl) {
            const activeCount = this.workerStats.activeWorkers.size;
            const successRate = (this.workerStats.successRate * 100).toFixed(1);
            const avgTime = Math.round(this.workerStats.averageProcessingTime / 1000);
            
            workerStatsEl.innerHTML = `
                <div class="text-xs text-gray-600">
                    活跃Worker: ${activeCount} | 
                    成功率: ${successRate}% | 
                    平均处理时间: ${avgTime}s
                </div>
            `;
        }
    },

    updateWorkerUsageStats(month, status, errorMessage) {
        // Additional tracking for usage patterns
        const usageKey = 'worker_usage_analytics';
        const stored = localStorage.getItem(usageKey);
        
        let analytics = {
            totalAttempts: 0,
            successfulWorkerUsage: 0,
            fallbackUsage: 0,
            timeoutFailures: 0,
            stuckFailures: 0,
            networkFailures: 0
        };
        
        if (stored) {
            try {
                analytics = { ...analytics, ...JSON.parse(stored) };
            } catch (e) {
                console.warn('Failed to parse usage analytics:', e);
            }
        }
        
        analytics.totalAttempts++;
        
        switch (status) {
            case 'success':
                analytics.successfulWorkerUsage++;
                break;
            case 'fallback_success':
            case 'fallback_only':
                analytics.fallbackUsage++;
                break;
            case 'failed':
                if (errorMessage) {
                    if (errorMessage.includes('超时') || errorMessage.includes('timeout')) {
                        analytics.timeoutFailures++;
                    } else if (errorMessage.includes('卡住') || errorMessage.includes('stuck')) {
                        analytics.stuckFailures++;
                    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
                        analytics.networkFailures++;
                    }
                }
                break;
        }
        
        try {
            localStorage.setItem(usageKey, JSON.stringify(analytics));
        } catch (e) {
            console.warn('Failed to save usage analytics:', e);
        }
    },

    getWorkerAnalytics() {
        const usageKey = 'worker_usage_analytics';
        const stored = localStorage.getItem(usageKey);
        
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.warn('Failed to parse usage analytics:', e);
            }
        }
        
        return null;
    },

    // Monitor for stuck or inactive workers
    monitorWorkerHealth() {
        const stuckThreshold = 60000; // 1 minute without update
        const now = Date.now();
        
        for (const [month, workerInfo] of this.workerStats.activeWorkers.entries()) {
            // Validate that lastUpdate is a valid timestamp before calculation
            if (!workerInfo || typeof workerInfo.lastUpdate !== 'number' || !isFinite(workerInfo.lastUpdate)) {
                console.warn(`Invalid or missing timestamp for worker ${month}, skipping health check.`, workerInfo);
                continue; // Skip to the next worker
            }

            const timeSinceUpdate = now - workerInfo.lastUpdate;

            if (timeSinceUpdate > stuckThreshold) {
                console.warn(`🚨 Worker for ${month} may be stuck - no updates for ${timeSinceUpdate}ms`);
                
                // Could trigger recovery actions here
                this.triggerWorkerRecovery(month, workerInfo);
            }
        }
    },

    triggerWorkerRecovery(month, workerInfo) {
        // This could implement recovery strategies
        console.log(`🔧 Attempting recovery for stuck worker: ${month}`);
        
        // For now, just remove from active tracking
        this.workerStats.activeWorkers.delete(month);
        
        // Could notify user
        showToast(`检测到 ${month} 处理异常，已启动恢复机制`, 'warning');
    },

    updateWorkerCapabilities(features) {
        // Store worker capabilities for optimization decisions
        this.workerStats.capabilities = features;
        
        console.log('📋 Worker capabilities updated:', features);
        
        // Update UI display if available
        const capabilitiesEl = document.getElementById('worker-capabilities');
        if (capabilitiesEl) {
            const capabilitiesList = Object.entries(features)
                .map(([key, value]) => `${key}: ${value ? '✅' : '❌'}`)
                .join(' | ');
            capabilitiesEl.textContent = capabilitiesList;
        }
    },

    cleanup() {
        // 清理不可见的论文卡片以释放内存
        const cards = document.querySelectorAll('.paper-card');
        const viewportHeight = window.innerHeight;
        let cleanedCount = 0;

        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            // 如果卡片在视口外很远（超过3个屏幕高度），则清理其详细内容
            if (rect.bottom < -viewportHeight * 3 || rect.top > viewportHeight * 4) {
                const paperId = card.id.replace('card-', '');
                const detailsSection = card.querySelector('.ai-details-section');
                if (detailsSection && detailsSection.innerHTML.length > 1000) {
                    detailsSection.innerHTML = '<p class="text-gray-500">内容已缓存以节省内存</p>';
                    cleanedCount++;
                }
            }
        });

        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} cards to save memory`);
        }
        
        // Also cleanup old worker tracking data
        this.cleanupWorkerData();

        // 新增：清理 state.allPapers 中不再显示的旧月份条目
        // 仅在非搜索模式下运行，以避免意外清理搜索所需的数据
        if (!state.isSearchMode) {
            const maxLoadedMonths = 5; // 内存中保留的最大月份数量

            if (state.loadedMonths.size > maxLoadedMonths) {
                // 获取所有已加载的月份，并按时间倒序排序（最新的在前）
                const sortedLoadedMonths = Array.from(state.loadedMonths).sort().reverse();
                
                // 确定要卸载的月份（保留最新的 maxLoadedMonths 个）
                const monthsToUnload = sortedLoadedMonths.slice(maxLoadedMonths);
                
                if (monthsToUnload.length > 0) {
                    console.log(`🧹 Memory cleanup: Unloading ${monthsToUnload.length} old month(s): ${monthsToUnload.join(', ')}`);
                    const monthsToUnloadSet = new Set(monthsToUnload);
                    const keysToDelete = [];

                    // 找出属于要卸载月份的所有论文的ID
                    for (const paperId of state.allPapers.keys()) {
                        // 从论文ID推断月份，例如 '2507.12345' -> '2025-07'
                        const paperMonth = `20${paperId.substring(0, 2)}-${paperId.substring(2, 4)}`;
                        if (monthsToUnloadSet.has(paperMonth)) {
                            keysToDelete.push(paperId);
                        }
                    }

                    // 从 state.allPapers 中删除这些论文
                    keysToDelete.forEach(key => {
                        state.allPapers.delete(key);
                    });

                    // 从 state.loadedMonths 中移除已卸载的月份记录
                    monthsToUnload.forEach(month => state.loadedMonths.delete(month));

                    console.log(`🧹 Memory cleanup: Removed ${keysToDelete.length} papers. New total: ${state.allPapers.size}.`);
                }
            }
        }
    },

    cleanupWorkerData() {
        // Keep only recent completed and failed tasks
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        this.workerStats.completedTasks = this.workerStats.completedTasks.filter(
            task => task.timestamp > oneHourAgo
        );
        
        this.workerStats.failedTasks = this.workerStats.failedTasks.filter(
            task => task.timestamp > oneHourAgo
        );
        
        // Recalculate metrics after cleanup
        this.calculateWorkerMetrics();
    }
};

// 每30秒执行一次内存清理和Worker健康检查
setInterval(() => {
    if (!state.isFetching) {
        performance.cleanup();
    }
    // Always monitor worker health
    performance.monitorWorkerHealth();
}, 30000);

// --- 工具函数 ---
function escapeCQ(str) { return str ? String(str).replace(/'/g, "\\'") : ''; }
function escapeRegex(string) { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ==================== 智能缓存系统 ====================

// 缓存管理器
const CacheManager = {
    cache: new Map(),
    maxSize: 100, // 最大缓存条目数

    set(key, value, ttl = 300000) { // 默认5分钟TTL
        const item = {
            value,
            timestamp: Date.now(),
            ttl,
            accessCount: 0
        };

        // 如果缓存已满，删除最少使用的项目
        if (this.cache.size >= this.maxSize) {
            this.evictLeastUsed();
        }

        this.cache.set(key, item);
        this.updateCacheStats();
    },

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        // 检查是否过期
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            this.updateCacheStats();
            return null;
        }

        // 更新访问计数
        item.accessCount++;
        return item.value;
    },

    evictLeastUsed() {
        let leastUsedKey = null;
        let minAccessCount = Infinity;

        for (const [key, item] of this.cache.entries()) {
            if (item.accessCount < minAccessCount) {
                minAccessCount = item.accessCount;
                leastUsedKey = key;
            }
        }

        if (leastUsedKey) {
            this.cache.delete(leastUsedKey);
        }
    },

    clear() {
        this.cache.clear();
        this.updateCacheStats();
    },

    getStats() {
        let totalSize = 0;
        let expiredCount = 0;
        const now = Date.now();

        for (const [key, item] of this.cache.entries()) {
            totalSize += JSON.stringify(item.value).length;
            if (now - item.timestamp > item.ttl) {
                expiredCount++;
            }
        }

        return {
            size: this.cache.size,
            totalSize,
            expiredCount,
            hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
        };
    },

    updateCacheStats() {
        // 可以在这里更新UI显示
        if (typeof updatePerformanceDisplay === 'function') {
            updatePerformanceDisplay();
        }
    },

    hitCount: 0,
    missCount: 0
};

// 缓存装饰器函数
function withCache(fn, keyGenerator = (...args) => JSON.stringify(args), ttl = 300000) {
    return function (...args) {
        const key = keyGenerator(...args);
        const cached = CacheManager.get(key);

        if (cached !== null) {
            CacheManager.hitCount++;
            return cached;
        }

        CacheManager.missCount++;
        const result = fn.apply(this, args);
        CacheManager.set(key, result, ttl);
        return result;
    };
}

// 为搜索结果添加缓存
const cachedSearch = withCache(
    (query, papers) => papers.filter(paper =>
        paper.title.toLowerCase().includes(query.toLowerCase()) ||
        paper.title_zh?.toLowerCase().includes(query.toLowerCase()) ||
        paper.summary.toLowerCase().includes(query.toLowerCase()) ||
        paper.categories.some(cat => cat.toLowerCase().includes(query.toLowerCase()))
    ),
    (query, papers) => `search_${query}_${papers.length}`,
    600000 // 10分钟缓存
);

// 为分类筛选添加缓存
const cachedCategoryFilter = withCache(
    (papers, category) => {
        if (category === 'all') return papers;
        return papers.filter(paper =>
            paper.categories.includes(category) ||
            (paper.custom_categories && paper.custom_categories.includes(category))
        );
    },
    (papers, category) => `category_${category}_${papers.length}`,
    300000 // 5分钟缓存
);

// 性能监控系统
const performanceTracker = {
    timers: new Map(),

    startTracking(label) {
        this.timers.set(label, Date.now());
    },

    endTracking(label) {
        const startTime = this.timers.get(label);
        if (startTime) {
            const duration = Date.now() - startTime;
            console.log(`Performance: ${label} took ${duration}ms`);
            this.timers.delete(label);
            return duration;
        }
        return 0;
    }
};

// 渲染时间测量函数
function measureRenderTime(renderFunction, label = 'render') {
    const startTime = Date.now();
    const result = renderFunction();
    const duration = Date.now() - startTime;
    if (duration > 50) { // 只记录超过50ms的渲染
        console.log(`Render Performance: ${label} took ${duration}ms`);
    }
    return result;
}

// 预加载关键数据
function preloadCriticalData() {
    // 预加载用户偏好相关的数据
    setTimeout(() => {
        if (state.userPreferences.recommendationEnabled) {
            generateRecommendations();
        }
    }, 5000);
}

async function applyViewTransition(updateFunction, vtName = '') {
    if (!document.startViewTransition) {
        await updateFunction();
        return;
    }
    mainContainer.dataset.vtName = vtName;
    const transition = document.startViewTransition(updateFunction);
    try { await transition.finished; }
    finally { delete mainContainer.dataset.vtName; }
}
function updateProgress(text, percentage) {
    progressText.textContent = text;
    topLoaderBar.style.width = `${percentage}%`;
}
function showProgress(text) {
    updateProgress(text, 0);
    progressContainer.classList.add('visible');
}
function hideProgress() {
    updateProgress('', 100);
    setTimeout(() => {
        progressContainer.classList.remove('visible');
        updateProgress('', 0);
    }, 300);
}

// --- 日期筛选功能 (新增) ---
// 日期筛选状态
let currentDateFilter = {
    startDate: null,
    endDate: null,
    period: null
};

// 日期筛选相关函数
function setupDateFilter() {
    console.log('开始初始化日期筛选功能...');

    try {
        // 获取DOM元素 (在函数内部获取，确保DOM已加载)
        const dateFilterToggle = document.getElementById('date-filter-toggle');
        const dateFilterPanel = document.getElementById('date-filter-panel');
        const dateFilterModal = document.getElementById('date-filter-modal');
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const activeFilters = document.getElementById('active-filters');
        const dateFilterDisplay = document.getElementById('date-filter-display');

        console.log('日期筛选DOM元素检查:', {
            dateFilterToggle: !!dateFilterToggle,
            dateFilterPanel: !!dateFilterPanel,
            dateFilterModal: !!dateFilterModal,
            startDateInput: !!startDateInput,
            endDateInput: !!endDateInput
        });

        // 检查关键元素是否存在
        if (!dateFilterToggle || !dateFilterPanel || !dateFilterModal) {
            console.warn('日期筛选关键元素未找到，跳过日期筛选功能初始化');
            return;
        }

        // 切换日期筛选面板
        dateFilterToggle.addEventListener('click', () => {
            console.log('切换日期筛选面板');
            dateFilterPanel.classList.toggle('hidden');
        });

        // 快捷日期筛选
        const quickFilterBtns = document.querySelectorAll('.date-quick-filter');
        console.log('找到快捷筛选按钮数量:', quickFilterBtns.length);

        quickFilterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const period = e.target.dataset.period;
                console.log('点击快捷筛选:', period);

                if (period === 'custom') {
                    dateFilterModal.classList.remove('hidden');
                } else {
                    applyQuickDateFilter(period);
                }
            });
        });

        // 模态框事件
        const closeModalBtn = document.getElementById('close-date-modal');
        const applyFilterBtn = document.getElementById('apply-date-filter');
        const clearFilterBtn = document.getElementById('clear-date-filter');

        console.log('模态框按钮检查:', {
            closeModalBtn: !!closeModalBtn,
            applyFilterBtn: !!applyFilterBtn,
            clearFilterBtn: !!clearFilterBtn
        });

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                console.log('关闭日期筛选模态框');
                dateFilterModal.classList.add('hidden');
            });
        }

        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', () => {
                const startDate = startDateInput ? startDateInput.value : '';
                const endDate = endDateInput ? endDateInput.value : '';

                console.log('应用自定义日期筛选:', { startDate, endDate });

                if (startDate && endDate) {
                    if (new Date(startDate) > new Date(endDate)) {
                        showToast('开始日期不能晚于结束日期', 'error');
                        return;
                    }

                    applyCustomDateFilter(startDate, endDate);
                    dateFilterModal.classList.add('hidden');
                } else {
                    showToast('请选择开始和结束日期', 'warning');
                }
            });
        }

        if (clearFilterBtn) {
            clearFilterBtn.addEventListener('click', () => {
                console.log('清除日期筛选');
                clearDateFilter();
                dateFilterModal.classList.add('hidden');
            });
        }

        // 点击外部关闭模态框
        if (dateFilterModal) {
            dateFilterModal.addEventListener('click', (e) => {
                if (e.target === dateFilterModal) {
                    console.log('点击外部关闭日期筛选模态框');
                    dateFilterModal.classList.add('hidden');
                }
            });
        }

        console.log('日期筛选功能初始化完成');
    } catch (error) {
        console.error('初始化日期筛选功能时出错:', error);
    }
}

function applyQuickDateFilter(period) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();

    let startDate, endDate, displayText;

    switch (period) {
        case 'today':
            startDate = endDate = formatDate(today);
            displayText = '今日';
            break;
        case 'week':
            const weekStart = new Date(today);
            weekStart.setDate(date - today.getDay());
            startDate = formatDate(weekStart);
            endDate = formatDate(today);
            displayText = '本周';
            break;
        case 'month':
            const monthStart = new Date(year, month, 1);
            startDate = formatDate(monthStart);
            endDate = formatDate(today);
            displayText = '本月';
            break;
        case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(date - 1);
            startDate = endDate = formatDate(yesterday);
            displayText = '昨天';
            break;
        case 'dayBeforeYesterday':
            const dayBeforeYesterday = new Date(today);
            dayBeforeYesterday.setDate(date - 2);
            startDate = endDate = formatDate(dayBeforeYesterday);
            displayText = '前天';
            break;
        case 'recent3':
            const recent3 = new Date(today);
            recent3.setDate(date - 2);
            startDate = formatDate(recent3);
            endDate = formatDate(today);
            displayText = '最近3天';
            break;
        case 'recent5':
            const recent5 = new Date(today);
            recent5.setDate(date - 4);
            startDate = formatDate(recent5);
            endDate = formatDate(today);
            displayText = '最近5天';
            break;
        default:
            // 如果 period 不匹配任何已知值，则不进行任何筛选
            currentDateFilter = { startDate: null, endDate: null, period: null };
            updateDateFilterDisplay('');
            dateFilterPanel.classList.add('hidden');
            break;
    }

    // 新增：清除每日分布筛选器的激活状态，确保筛选互斥
    const dailyFilterBtns = document.querySelectorAll('#daily-distribution-filters .date-filter-btn');
    dailyFilterBtns.forEach(btn => btn.classList.remove('active'));

    // 激活当前点击的按钮
    const quickFilterBtns = document.querySelectorAll('.date-quick-filter');
    quickFilterBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.period === period) {
            btn.classList.add('active');
        }
    });

    currentDateFilter = { startDate, endDate, period };
    updateDateFilterDisplay(displayText);
    filterPapersByDate();
    dateFilterPanel.classList.add('hidden');
    showToast(`已应用${displayText}筛选`);
}

function applyCustomDateFilter(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    currentDateFilter = {
        startDate,
        endDate,
        period: 'custom'
    };

    const displayText = `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
    updateDateFilterDisplay(displayText);
    filterPapersByDate();
    showToast('已应用自定义日期筛选');
}

function clearDateFilter() {
    currentDateFilter = { startDate: null, endDate: null, period: null };
    updateDateFilterDisplay('');

    // 清除快捷筛选按钮的激活状态
    const quickFilterBtns = document.querySelectorAll('.date-quick-filter');
    quickFilterBtns.forEach(btn => btn.classList.remove('active'));

    // 安全地清除输入值
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';

    // 如果在搜索模式，重新渲染结果。否则，重置默认视图。
    if (state.currentQuery) {
        renderFilteredResults();
    } else {
        // 如果不在搜索模式，可以重置到默认视图
        resetToDefaultView();
    }

    showToast('已清除日期筛选');
}

function updateDateFilterDisplay(text) {
    const dateFilterDisplay = document.getElementById('date-filter-display');
    const activeFilters = document.getElementById('active-filters');

    if (!dateFilterDisplay || !activeFilters) return;

    if (text) {
        const textElement = dateFilterDisplay.querySelector('.date-range-text');
        if (textElement) textElement.textContent = text;
        dateFilterDisplay.classList.remove('hidden');
        activeFilters.classList.remove('hidden');
    } else {
        dateFilterDisplay.classList.add('hidden');
        activeFilters.classList.add('hidden');
    }
}

function filterPapersByDate() {
    // 如果在搜索模式下，重新渲染搜索结果以应用日期筛选
    if (state.isSearchMode && state.currentSearchResults.length > 0) {
        renderFilteredResults();
    } else {
        // 如果不在搜索模式，则筛选当前视图中的论文
        // (此功能当前主要为搜索结果设计，非搜索模式下可后续增强)
        showToast('日期筛选主要用于搜索结果。', 'info');
    }
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// 修改搜索函数以支持日期筛选
function applyDateFilterToResults(papers) {
    if (!currentDateFilter.startDate || !currentDateFilter.endDate) {
        return papers;
    }

    const startDate = new Date(currentDateFilter.startDate);
    const endDate = new Date(currentDateFilter.endDate);
    endDate.setHours(23, 59, 59, 999);

    return papers.filter(paper => {
        const paperDate = new Date(paper.date);
        return paperDate >= startDate && paperDate <= endDate;
    });
}

// --- 深色模式功能 ---
function initializeTheme() {
    const savedTheme = localStorage.getItem('arxiv_theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);
}

function setTheme(theme) {
    state.theme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('arxiv_theme', theme);
    updateThemeIcons();
}

function toggleTheme() {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    showToast(`已切换到${newTheme === 'dark' ? '深色' : '浅色'}模式`);
}

function updateThemeIcons() {
    if (state.theme === 'dark') {
        themeIconLight.classList.add('hidden');
        themeIconDark.classList.remove('hidden');
    } else {
        themeIconLight.classList.remove('hidden');
        themeIconDark.classList.add('hidden');
    }
}

// --- 搜索建议功能 ---
function initializeSearchSuggestions() {
    // 基础搜索建议数据
    state.searchSuggestions = [
        ...state.mainCategories.map(cat => ({
            text: cat,
            type: '分类',
            category: 'category'
        })),
        { text: 'transformer', type: '关键词', category: 'keyword' },
        { text: 'neural network', type: '关键词', category: 'keyword' },
        { text: 'deep learning', type: '关键词', category: 'keyword' },
        { text: 'computer vision', type: '关键词', category: 'keyword' },
        { text: 'natural language processing', type: '关键词', category: 'keyword' },
        { text: 'reinforcement learning', type: '关键词', category: 'keyword' },
        { text: 'generative adversarial network', type: '关键词', category: 'keyword' },
        { text: 'attention mechanism', type: '关键词', category: 'keyword' },
        { text: 'machine learning', type: '关键词', category: 'keyword' },
        { text: 'artificial intelligence', type: '关键词', category: 'keyword' }
    ];
}

function showSearchSuggestions(query) {
    if (!query.trim()) {
        hideSearchSuggestions();
        return;
    }

    const filtered = state.searchSuggestions
        .filter(suggestion =>
            suggestion.text.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 8);

    // 添加搜索历史匹配项
    const historyMatches = state.searchHistory
        .filter(item =>
            item.toLowerCase().includes(query.toLowerCase()) &&
            !filtered.some(f => f.text === item)
        )
        .slice(0, 3)
        .map(item => ({
            text: item,
            type: '历史',
            category: 'history'
        }));

    const allSuggestions = [...historyMatches, ...filtered];

    // 新增：如果输入内容符合ID格式，在最顶端添加一个ID搜索建议
    if (/^\d{4}\.\d{4,5}$/.test(query)) {
        allSuggestions.unshift({
            text: query,
            type: '论文ID',
            category: 'paper_id' // 使用一个特殊的类型
        });
    }

    if (allSuggestions.length === 0) {
        hideSearchSuggestions();
        return;
    }

    let html = '';
    allSuggestions.forEach((suggestion, index) => {
        html += `
                <div class="suggestion-item ${index === state.currentSuggestionIndex ? 'highlighted' : ''}" 
                     data-suggestion="${escapeCQ(suggestion.text)}" 
                     data-index="${index}">
                    <span>${suggestion.text}</span>
                    <span class="suggestion-type">${suggestion.type}</span>
                </div>
            `;
    });

    searchSuggestions.innerHTML = html;
    searchSuggestions.classList.add('visible');
}

function hideSearchSuggestions() {
    searchSuggestions.classList.remove('visible');
    state.currentSuggestionIndex = -1;
}

function selectSuggestion(suggestion) {
    searchInput.value = suggestion;
    hideSearchSuggestions();
    addToSearchHistory(suggestion);
    handleSearch();
}

// --- 搜索历史功能 ---
function loadSearchHistory() {
    const history = localStorage.getItem('arxiv_search_history');
    if (history) {
        try {
            state.searchHistory = JSON.parse(history);
        } catch (e) {
            console.warn('Failed to load search history:', e);
            state.searchHistory = [];
        }
    }
}

function saveSearchHistory() {
    localStorage.setItem('arxiv_search_history', JSON.stringify(state.searchHistory));
}

function addToSearchHistory(query) {
    if (!query.trim() || query === 'favorites') return;

    // 移除重复项
    state.searchHistory = state.searchHistory.filter(item => item !== query);
    // 添加到开头
    state.searchHistory.unshift(query);
    // 限制数量
    state.searchHistory = state.searchHistory.slice(0, 10);
    saveSearchHistory();
    updateSearchHistoryDisplay();
}

function updateSearchHistoryDisplay() {
    if (state.searchHistory.length === 0) {
        searchHistoryItems.innerHTML = '<p class="text-sm text-gray-500">暂无搜索历史</p>';
        return;
    }

    let html = '';
    state.searchHistory.forEach(item => {
        html += `<span class="search-history-item" data-query="${escapeCQ(item)}">${item}</span>`;
    });
    searchHistoryItems.innerHTML = html;
}

function clearSearchHistory() {
    state.searchHistory = [];
    saveSearchHistory();
    updateSearchHistoryDisplay();
    showToast('搜索历史已清除');
}

// --- 阅读进度功能 ---
function updateReadingProgress() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = (scrollTop / scrollHeight) * 100;
    readingProgressBar.style.width = `${Math.min(progress, 100)}%`;
}

// --- 移动端优化功能 ---

function initializeMobileFeatures() {
    if (!state.mobile.isTouchDevice) return;

    setupMobileNavigation();
    setupTouchGestures();
    setupMobileBottomNav();
    optimizeMobileSearch();
    setupMobileViewportFix();
}

function setupMobileNavigation() {
    console.log('开始初始化移动端导航...');
    try {
        // 点击外部关闭菜单
        document.addEventListener('click', (e) => {
            const quickNavContainer = document.getElementById('quick-nav-container');
            const mobileBottomNav = document.querySelector('.mobile-bottom-nav');

            if (state.mobile.isMenuOpen &&
                quickNavContainer && !quickNavContainer.contains(e.target) &&
                mobileBottomNav && !mobileBottomNav.contains(e.target)
            ) {
                console.log('点击外部关闭移动端菜单');
                closeMobileMenu();
            }
        });
        console.log('移动端导航初始化完成');
    } catch (error) {
        console.error('初始化移动端导航时出错:', error);
    }
}

function toggleMobileMenu() {
    console.log('切换移动端菜单');
    state.mobile.isMenuOpen = !state.mobile.isMenuOpen;
    updateMobileMenuState();
}

function closeMobileMenu() {
    if (!state.mobile.isMenuOpen) return;
    console.log('关闭移动端菜单');
    state.mobile.isMenuOpen = false;
    updateMobileMenuState();
}

function updateMobileMenuState() {
    const mobileNavContent = document.getElementById('mobile-nav-content');
    const mobileMenuBtn = document.getElementById('mobile-nav-menu');

    if (mobileNavContent && mobileMenuBtn) {
        mobileNavContent.classList.toggle('active', state.mobile.isMenuOpen);
        mobileMenuBtn.classList.toggle('active', state.mobile.isMenuOpen);
    }
}

function setupTouchGestures() {
    console.log('开始初始化触摸手势...');

    try {
        // 使用全局的mainContainer，如果不存在则回退到body
        const touchContainer = mainContainer || document.body;

        let touchStartX = 0;
        let touchEndX = 0;
        let touchStartY = 0;
        let touchEndY = 0;
        let isVerticalScroll = false;

        touchContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
            state.mobile.touchStartX = touchStartX;
            state.mobile.touchStartY = touchStartY;
            isVerticalScroll = false;
        }, { passive: true });

        touchContainer.addEventListener('touchmove', (e) => {
            const currentX = e.changedTouches[0].screenX;
            const currentY = e.changedTouches[0].screenY;

            // 检查是否是垂直滚动
            const deltaY = Math.abs(currentY - touchStartY);
            const deltaX = Math.abs(currentX - touchStartX);

            if (deltaY > deltaX && deltaY > 10) {
                isVerticalScroll = true;
            }

            // 显示滑动提示
            if (!isVerticalScroll && deltaX > 20) {
                const direction = currentX > touchStartX ? 'right' : 'left';
                showSwipeIndicator(direction);
            }
        }, { passive: true });

        touchContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            state.mobile.touchEndX = touchEndX;
            state.mobile.touchEndY = touchEndY;

            hideSwipeIndicators();

            if (!isVerticalScroll) {
                handleSwipeGesture();
            }
        }, { passive: true });

        console.log('触摸手势初始化完成');
    } catch (error) {
        console.error('初始化触摸手势时出错:', error);
    }
}

function handleSwipeGesture() {
    const deltaX = state.mobile.touchEndX - state.mobile.touchStartX;
    const deltaY = Math.abs(state.mobile.touchEndY - state.mobile.touchStartY);

    // 只有水平滑动距离足够且垂直滑动距离不大时才处理
    if (Math.abs(deltaX) > state.mobile.swipeThreshold && deltaY < 100) {
        if (deltaX > 0) {
            // 向右滑动 - 加载上一月
            handleSwipeRight();
        } else {
            // 向左滑动 - 加载下一月
            handleSwipeLeft();
        }
    }
}

function handleSwipeLeft() {
    // 加载下一月
    if (!state.isFetching && !state.isSearchMode) {
        loadNextMonth(false);
        showToast('滑动加载下一月');
    }
}

function handleSwipeRight() {
    // 加载上一月
    if (!state.isFetching && !state.isSearchMode && state.currentMonthIndex > 0) {
        const prevMonth = state.manifest.availableMonths[state.currentMonthIndex - 1];
        if (prevMonth) {
            navigateToMonth(prevMonth);
            showToast('滑动加载上一月');
        }
    }
}

function showSwipeIndicator(direction) {
    const swipeIndicatorLeft = document.getElementById('swipe-indicator-left');
    const swipeIndicatorRight = document.getElementById('swipe-indicator-right');
    const indicator = direction === 'left' ? swipeIndicatorLeft : swipeIndicatorRight;
    if (indicator) {
        indicator.classList.add('show');
    }
}

function hideSwipeIndicators() {
    const swipeIndicatorLeft = document.getElementById('swipe-indicator-left');
    const swipeIndicatorRight = document.getElementById('swipe-indicator-right');
    if (swipeIndicatorLeft) swipeIndicatorLeft.classList.remove('show');
    if (swipeIndicatorRight) swipeIndicatorRight.classList.remove('show');
}

function setupMobileBottomNav() {
    console.log('开始初始化移动端底部导航...');

    try {
        const mobileBottomNav = document.querySelector('.mobile-bottom-nav');
        if (!mobileBottomNav) {
            console.warn('移动端底部导航元素未找到');
            return;
        }

        const buttons = mobileBottomNav.querySelectorAll('button');
        console.log('找到移动端底部导航按钮数量:', buttons.length);

        buttons.forEach(button => {
            button.addEventListener('click', handleMobileBottomNavClick);
        });

        // 更新收藏计数
        updateMobileFavoritesCount();
        console.log('移动端底部导航初始化完成');
    } catch (error) {
        console.error('初始化移动端底部导航时出错:', error);
    }
}

function handleMobileBottomNavClick(e) {
    const button = e.currentTarget;
    const action = button.dataset.action;

    // 如果点击的不是菜单按钮，则关闭菜单
    if (action !== 'toggle-mobile-menu' && state.mobile.isMenuOpen) {
        closeMobileMenu();
    }

    // 更新活跃状态 (不包括菜单按钮，其状态由 updateMobileMenuState 控制)
    const mobileBottomNav = document.querySelector('.mobile-bottom-nav');
    if (mobileBottomNav && action !== 'toggle-mobile-menu') {
        mobileBottomNav.querySelectorAll('button').forEach(btn => {
            if (btn.dataset.action !== 'toggle-mobile-menu') {
                btn.classList.remove('active');
            }
        });
        button.classList.add('active');
    }

    switch (action) {
        case 'scroll-to-top':
            window.scrollTo({ top: 0, behavior: 'smooth' });
            break;
        case 'focus-search':
            searchInput.focus();
            searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
        case 'show-favorites':
            performTagSearch('favorites');
            break;
        case 'toggle-mobile-menu':
            toggleMobileMenu();
            break;
    }
}

function updateMobileFavoritesCount() {
    const badge = document.getElementById('mobile-favorites-badge');
    const mobileCount = document.getElementById('favorites-count-mobile');
    if (badge) badge.textContent = state.favorites.size;
    if (mobileCount) mobileCount.textContent = state.favorites.size;
}

function optimizeMobileSearch() {
    console.log('开始优化移动端搜索...');

    try {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) {
            console.warn('搜索输入框未找到');
            return;
        }

        // 移动端搜索框优化
        searchInput.addEventListener('focus', () => {
            // 滚动到搜索框
            setTimeout(() => {
                searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });

        // 优化搜索建议在移动端的显示
        const suggestions = document.getElementById('search-suggestions');
        if (suggestions) {
            suggestions.addEventListener('touchstart', (e) => {
                e.preventDefault(); // 防止双击缩放
            });
        }

        console.log('移动端搜索优化完成');
    } catch (error) {
        console.error('优化移动端搜索时出错:', error);
    }
}

function setupMobileViewportFix() {
    // 修复移动端 100vh 问题
    function setVH() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', () => {
        setTimeout(setVH, 500);
    });
}

function optimizeMobileTouchTargets() {
    // 确保所有可点击元素达到最小触摸目标尺寸
    const clickableElements = document.querySelectorAll('button, a, .keyword-tag, .suggestion-item');
    clickableElements.forEach(element => {
        if (window.innerWidth <= 768) {
            const rect = element.getBoundingClientRect();
            if (rect.height < 44) {
                element.style.minHeight = '44px';
                element.style.display = 'inline-flex';
                element.style.alignItems = 'center';
                element.style.justifyContent = 'center';
            }
        }
    });
}

function addRippleEffect(element) {
    element.addEventListener('touchstart', function (e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.touches[0].clientX - rect.left - size / 2;
        const y = e.touches[0].clientY - rect.top - size / 2;

        ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;

        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    });

    // 添加 CSS 动画
    if (!document.getElementById('ripple-animation')) {
        const style = document.createElement('style');
        style.id = 'ripple-animation';
        style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
            `;
        document.head.appendChild(style);
    }
}

// 全局错误处理器 - 改进版本用于精确调试
window.addEventListener('error', function (e) {
    console.error('🚨 JavaScript错误捕获:', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error,
        stack: e.error?.stack
    });

    // 输出详细的错误信息到控制台
    console.group('🔍 错误详情分析');
    console.log('错误消息:', e.message);
    console.log('发生位置:', `${e.filename}:${e.lineno}:${e.colno}`);
    console.log('错误对象:', e.error);
    if (e.error?.stack) {
        console.log('调用栈:', e.error.stack);
    }
    console.groupEnd();

    return false; // 让浏览器继续处理错误
});

// 捕获未处理的 Promise 拒绝
window.addEventListener('unhandledrejection', function (e) {
    console.error('🚨 Promise拒绝捕获:', e.reason);
    console.error('Promise拒绝堆栈:', e.reason?.stack);
});

// --- 动态样式注入 ---
function injectStyles() {
    const style = document.createElement('style');
    style.id = 'dynamic-styles';
    style.textContent = `
        .highlight {
            background-color: #fde047; /* yellow-300 */
            color: #1f2937; /* gray-800 */
            padding: 0 2px;
            border-radius: 2px;
        }
        body[data-theme='dark'] .highlight {
            background-color: #facc15; /* yellow-400 */
            color: #111827; /* gray-900 */
        }
    `;
    document.head.appendChild(style);
}

// --- 核心功能 ---
async function init() {
    console.log('开始初始化...');
    showProgress('正在初始化...');
    try {
        injectStyles(); // 注入自定义高亮样式
        hideLoadError();
        console.log('加载基础设置...');
        // 基础设置加载 - 使用 try-catch 包装每个函数调用
        try { loadFavorites(); } catch (e) { console.warn('loadFavorites error:', e); }
        try { loadViewMode(); } catch (e) { console.warn('loadViewMode error:', e); }
        try { loadSearchHistory(); } catch (e) { console.warn('loadSearchHistory error:', e); }
        try { initializeTheme(); } catch (e) { console.warn('initializeTheme error:', e); }
        try { initializeSearchSuggestions(); } catch (e) { console.warn('initializeSearchSuggestions error:', e); }

        console.log('尝试加载用户偏好...');
        // 尝试加载用户偏好和其他设置（如果函数存在）
        try {
            loadPaperTags();
            loadPaperNotes();
            loadPaperRatings();
            loadUserPreferences();
            loadReadingHistory();
        } catch (e) {
            console.warn('加载用户设置时出现警告:', e);
        }

        console.log('尝试初始化用户引导...');
        // 尝试初始化用户引导（如果函数存在）
        try {
            if (typeof initializeUserGuidance === 'function') {
                initializeUserGuidance();
            }
        } catch (e) {
            console.warn('初始化用户引导时出现警告:', e);
        }

        console.log('开始加载数据清单...');
        // 加载数据清单
        const response = await fetch('./data/index.json');
        console.log('数据清单请求响应状态:', response.status);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        state.manifest = await response.json();
        console.log('数据清单加载成功:', state.manifest);

        // 新增：在初始化时加载全部分类
        try {
            console.log('开始加载分类索引...');
            const catResponse = await fetch('./data/category_index.json');
            if (catResponse.ok) {
                const catIndex = await catResponse.json();
                state.categoryIndex = catIndex;
                state.allCategories = Object.keys(catIndex).sort();
                console.log(`分类加载成功，共找到 ${state.allCategories.length} 个分类。`);
            }
        } catch (e) {
            console.warn('初始化时加载 category_index.json 失败，筛选功能将受限。', e);
            // 如果加载失败，则回退到预设的核心分类
            state.allCategories = state.mainCategories;
        }

        console.log('检查数据清单内容...');
        if (state.manifest.availableMonths && state.manifest.availableMonths.length > 0) {
            console.log('数据清单有效，可用月份:', state.manifest.availableMonths);
            console.log('开始设置UI...');
            try { setupUI(); } catch (e) { console.error('setupUI error:', e); }
            console.log('开始设置事件监听器...');
            try { setupGlobalEventListeners(); } catch (e) { console.error('setupGlobalEventListeners error:', e); }

            const urlParams = new URLSearchParams(window.location.search);
            const queryFromUrl = urlParams.get('q');
            const paperFromUrl = urlParams.get('paper');

            console.log('URL参数 - 查询:', queryFromUrl, '论文:', paperFromUrl);

            if (paperFromUrl) {
                console.log('处理直接链接...');
                await handleDirectLink(paperFromUrl);
            } else if (queryFromUrl) {
                console.log('处理URL查询...');
                searchInput.value = queryFromUrl;
                updateClearButtonVisibility();
                await handleSearch();
            } else {
                console.log('加载默认内容...');
                await loadNextMonth(false);
            }
        } else {
            console.log('数据清单为空或无效');
            papersContainer.innerHTML = `<p class="text-center text-gray-500">数据清单为空。</p>`;
        }
    } catch (error) {
        console.error("Initialization failed:", error);

        let errorMessage = '加载数据失败。';
        if (error.message.includes('fetch')) {
            errorMessage += '请检查您的网络连接。';
        } else if (error.message.includes('Web Worker超时')) {
            errorMessage += `错误详情：${error.message}。这通常是由于网络连接较慢或数据文件过大导致。`;
        } else if (error.name === 'ReferenceError') {
            errorMessage += `代码中可能存在错误: ${error.message}`;
        } else {
            errorMessage += `错误信息：${error.message}`;
        }
        showLoadError(errorMessage);
    } finally {
        hideProgress();
        
        // 🔥 新增：页面加载完成后自动检测和修复问题
        setTimeout(() => {
            console.log(`🔍 页面加载完成，开始自动检测问题...`);
            if (typeof autoFixStuckPapers === 'function') {
                autoFixStuckPapers();
            }
            
            // 额外的检测：查找所有卡住的加载元素
            setTimeout(() => {
                if (typeof findStuckLoadingElements === 'function') {
                    findStuckLoadingElements();
                }
                
                // 启动实时监听
                if (typeof startLoadingElementMonitor === 'function') {
                    startLoadingElementMonitor();
                }
            }, 1000);
        }, 2000); // 2秒后运行自动检测
    }
}

function setupUI() {
    setupQuickNav();
    setupCategoryFilters();
    renderSupportedCategories(); // 新增：渲染支持的分类列表
    updateSearchStickiness();
    setupNavObserver();
    setupBackToTopButton();
    setupIntersectionObserver();
    updateSearchHistoryDisplay();
    setupDateFilter(); // 添加日期筛选初始化
    initializeMobileFeatures(); // 新增移动端功能初始化
    if (state.manifest.lastUpdated) lastUpdatedEl.textContent = `数据更新于: ${state.manifest.lastUpdated}`;
    initPaperIdSearch(); // 初始化论文 ID 搜索
    document.getElementById('favorites-count').textContent = state.favorites.size;
    updateMobileFavoritesCount(); // 更新移动端收藏计数
}

// --- 论文标签、笔记、评分功能 ---
function loadPaperTags() {
    const tags = localStorage.getItem('arxiv_paper_tags');
    if (tags) {
        try {
            const parsed = JSON.parse(tags);
            state.paperTags = new Map(Object.entries(parsed));
        } catch (e) {
            console.warn('Failed to load paper tags:', e);
            state.paperTags = new Map();
        }
    }
}

function savePaperTags() {
    const obj = Object.fromEntries(state.paperTags);
    localStorage.setItem('arxiv_paper_tags', JSON.stringify(obj));
}

function loadPaperNotes() {
    const notes = localStorage.getItem('arxiv_paper_notes');
    if (notes) {
        try {
            const parsed = JSON.parse(notes);
            state.paperNotes = new Map(Object.entries(parsed));
        } catch (e) {
            console.warn('Failed to load paper notes:', e);
            state.paperNotes = new Map();
        }
    }
}

function savePaperNotes() {
    const obj = Object.fromEntries(state.paperNotes);
    localStorage.setItem('arxiv_paper_notes', JSON.stringify(obj));
}

function loadPaperRatings() {
    const ratings = localStorage.getItem('arxiv_paper_ratings');
    if (ratings) {
        try {
            const parsed = JSON.parse(ratings);
            state.paperRatings = new Map(Object.entries(parsed));
        } catch (e) {
            console.warn('Failed to load paper ratings:', e);
            state.paperRatings = new Map();
        }
    }
}

function savePaperRatings() {
    const obj = Object.fromEntries(state.paperRatings);
    localStorage.setItem('arxiv_paper_ratings', JSON.stringify(obj));
}

function addPaperTag(paperId, tag) {
    if (!tag.trim()) return;

    const currentTags = state.paperTags.get(paperId) || [];
    if (!currentTags.includes(tag)) {
        currentTags.push(tag);
        state.paperTags.set(paperId, currentTags);
        savePaperTags();
        updatePaperTagsDisplay(paperId);
    }
}

function removePaperTag(paperId, tag) {
    const currentTags = state.paperTags.get(paperId) || [];
    const updated = currentTags.filter(t => t !== tag);

    if (updated.length === 0) {
        state.paperTags.delete(paperId);
    } else {
        state.paperTags.set(paperId, updated);
    }
    savePaperTags();
    updatePaperTagsDisplay(paperId);
}

function updatePaperTagsDisplay(paperId) {
    const container = document.getElementById(`paper-tags-${paperId}`);
    if (!container) return;

    const tags = state.paperTags.get(paperId) || [];
    let html = '';

    tags.forEach(tag => {
        html += `
                <span class="custom-tag">
                    ${tag}
                    <span class="tag-remove" data-action="remove-tag" data-paper-id="${paperId}" data-tag="${escapeCQ(tag)}">×</span>
                </span>
            `;
    });

    // 添加新标签输入
    html += `
            <input type="text" 
                   id="tag-input-${paperId}" 
                   class="inline-block text-xs px-2 py-1 border border-gray-300 rounded" 
                   placeholder="添加标签..." 
                   style="width: 80px; font-size: 0.75rem;"
                   data-paper-id="${paperId}">
        `;

    container.innerHTML = html;

    // 设置标签输入事件
    const tagInput = document.getElementById(`tag-input-${paperId}`);
    if (tagInput) {
        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const tag = e.target.value.trim();
                if (tag) {
                    addPaperTag(paperId, tag);
                    e.target.value = '';
                }
            }
        });
    }
}

function setPaperRating(paperId, rating) {
    state.paperRatings.set(paperId, rating);
    savePaperRatings();
    updatePaperRatingDisplay(paperId);
}

function updatePaperRatingDisplay(paperId) {
    const container = document.getElementById(`paper-rating-${paperId}`);
    if (!container) return;

    const currentRating = state.paperRatings.get(paperId) || 0;
    let html = '<span class="text-sm text-gray-600 mr-2">评分:</span>';

    for (let i = 1; i <= 5; i++) {
        html += `
                <span class="star ${i <= currentRating ? 'active' : ''}" 
                      data-action="rate-paper" 
                      data-paper-id="${paperId}" 
                      data-rating="${i}">★</span>
            `;
    }

    container.innerHTML = html;
}

function savePaperNote(paperId, note) {
    if (note.trim()) {
        state.paperNotes.set(paperId, note.trim());
    } else {
        state.paperNotes.delete(paperId);
    }
    savePaperNotes();
}

function togglePaperNotes(paperId) {
    const notesContainer = document.getElementById(`paper-notes-${paperId}`);
    if (!notesContainer) return;

    notesContainer.classList.toggle('visible');

    if (notesContainer.classList.contains('visible')) {
        const textarea = notesContainer.querySelector('textarea');
        if (textarea) {
            textarea.focus();
            textarea.value = state.paperNotes.get(paperId) || '';
        }
    }
}

// --- 个性化功能增强 ---

// 用户偏好管理
function loadUserPreferences() {
    const preferences = localStorage.getItem('arxiv_user_preferences');
    if (preferences) {
        try {
            const parsed = JSON.parse(preferences);
            Object.assign(state.userPreferences, parsed);
        } catch (e) {
            console.warn('Failed to load user preferences:', e);
        }
    }
}

function saveUserPreferences() {
    localStorage.setItem('arxiv_user_preferences', JSON.stringify(state.userPreferences));
}

// 阅读历史管理
function loadReadingHistory() {
    const history = localStorage.getItem('arxiv_reading_history');
    if (history) {
        try {
            const parsed = JSON.parse(history);
            state.readingHistory.viewedPapers = new Map(Object.entries(parsed.viewedPapers || {}));
            state.readingHistory.readingSessions = parsed.readingSessions || [];
            state.readingHistory.preferences = new Map(Object.entries(parsed.preferences || {}));
            state.readingHistory.recommendations = parsed.recommendations || [];
        } catch (e) {
            console.warn('Failed to load reading history:', e);
        }
    }
}

function saveReadingHistory() {
    const historyObj = {
        viewedPapers: Object.fromEntries(state.readingHistory.viewedPapers),
        readingSessions: state.readingHistory.readingSessions,
        preferences: Object.fromEntries(state.readingHistory.preferences),
        recommendations: state.readingHistory.recommendations
    };
    localStorage.setItem('arxiv_reading_history', JSON.stringify(historyObj));
}

// 记录论文交互
function recordPaperInteraction(paperId, interactionType, duration = 0) {
    const timestamp = Date.now();
    const existing = state.readingHistory.viewedPapers.get(paperId) || {
        timestamp: timestamp,
        interactions: [],
        totalDuration: 0
    };

    existing.interactions.push({
        type: interactionType,
        timestamp: timestamp,
        duration: duration
    });
    existing.totalDuration += duration;
    existing.lastViewed = timestamp;

    state.readingHistory.viewedPapers.set(paperId, existing);

    // 更新阅读目标进度
    updateReadingProgress();

    // 异步保存历史记录
    setTimeout(() => saveReadingHistory(), 100);
}

// 更新阅读进度和目标
function updateReadingProgress() {
    const today = new Date().toDateString();
    const todaysReading = Array.from(state.readingHistory.viewedPapers.values())
        .filter(record => new Date(record.timestamp).toDateString() === today)
        .length;

    // 更新连续阅读天数
    updateReadingStreak();

    // 更新目标显示
    updateReadingGoalsDisplay();
}

function updateReadingStreak() {
    const dates = Array.from(state.readingHistory.viewedPapers.values())
        .map(record => new Date(record.timestamp).toDateString())
        .filter((date, index, self) => self.indexOf(date) === index)
        .sort((a, b) => new Date(b) - new Date(a));

    let currentStreak = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

    if (dates.includes(today)) {
        currentStreak = 1;
        for (let i = 1; i < dates.length; i++) {
            const currentDate = new Date(dates[i - 1]);
            const prevDate = new Date(dates[i]);
            const diffDays = Math.floor((currentDate - prevDate) / (24 * 60 * 60 * 1000));

            if (diffDays === 1) {
                currentStreak++;
            } else {
                break;
            }
        }
    } else if (dates.includes(yesterday)) {
        // 昨天有阅读记录，今天没有，连续天数为0
        currentStreak = 0;
    }

    state.userPreferences.readingGoals.currentStreak = currentStreak;
    if (currentStreak > state.userPreferences.readingGoals.longestStreak) {
        state.userPreferences.readingGoals.longestStreak = currentStreak;
    }

    saveUserPreferences();
}

// 智能推荐算法
function generateRecommendations() {
    if (!state.userPreferences.recommendationEnabled) return;

    const viewedPapers = Array.from(state.readingHistory.viewedPapers.keys());
    if (viewedPapers.length < 3) return; // 需要至少3篇论文的历史记录

    const recommendations = [];
    const categoryWeights = new Map();
    const keywordWeights = new Map();

    // 分析用户偏好
    viewedPapers.forEach(paperId => {
        const paper = state.allPapers.get(paperId);
        const record = state.readingHistory.viewedPapers.get(paperId);

        if (paper && record) {
            // 基于阅读时长和交互次数计算权重
            const weight = Math.log(record.totalDuration + 1) * record.interactions.length;

            // 分类权重
            if (paper.categories) {
                paper.categories.forEach(category => {
                    categoryWeights.set(category, (categoryWeights.get(category) || 0) + weight);
                });
            }

            // 关键词权重
            if (paper.keywords) {
                paper.keywords.forEach(keyword => {
                    keywordWeights.set(keyword, (keywordWeights.get(keyword) || 0) + weight);
                });
            }
        }
    });

    // 生成推荐
    const allPaperIds = Array.from(state.allPapers.keys());
    const unviewedPapers = allPaperIds.filter(id => !viewedPapers.includes(id));

    const scoredPapers = unviewedPapers.map(paperId => {
        const paper = state.allPapers.get(paperId);
        let score = 0;

        if (paper.categories) {
            paper.categories.forEach(category => {
                score += categoryWeights.get(category) || 0;
            });
        }

        if (paper.keywords) {
            paper.keywords.forEach(keyword => {
                score += keywordWeights.get(keyword) || 0;
            });
        }

        return { paperId, score, paper };
    }).filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    state.readingHistory.recommendations = scoredPapers;
    saveReadingHistory();

    return scoredPapers;
}

// 数据导出功能
function exportFavorites(format) {
    const favorites = Array.from(state.favorites);
    const papersData = favorites.map(id => state.allPapers.get(id)).filter(Boolean);

    let content, filename, mimeType;

    switch (format) {
        case 'json':
            content = JSON.stringify(papersData, null, 2);
            filename = `arxiv-favorites-${new Date().toISOString().split('T')[0]}.json`;
            mimeType = 'application/json';
            break;

        case 'csv':
            const csvHeaders = ['ID', 'Title', 'Authors', 'Abstract', 'Categories', 'Keywords', 'Date'];
            const csvRows = papersData.map(paper => [
                paper.id || '',
                `"${(paper.title || '').replace(/"/g, '""')}"`,
                `"${(paper.authors || '').replace(/"/g, '""')}"`,
                `"${(paper.abstract || '').replace(/"/g, '""')}"`,
                `"${(paper.categories || []).join(', ')}"`,
                `"${(paper.keywords || []).join(', ')}"`,
                paper.date || ''
            ]);
            content = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
            filename = `arxiv-favorites-${new Date().toISOString().split('T')[0]}.csv`;
            mimeType = 'text/csv';
            break;

        case 'bibtex':
            content = papersData.map(paper => {
                const year = paper.date ? paper.date.split('-')[0] : '';
                const authors = paper.authors ? paper.authors.split(',').map(a => a.trim()).join(' and ') : '';
                return `@article{${paper.id},
  title={${paper.title || ''}},
  author={${authors}},
  journal={arXiv preprint arXiv:${paper.id}},
  year={${year}},
  url={https://arxiv.org/abs/${paper.id}}
}`;
            }).join('\n\n');
            filename = `arxiv-favorites-${new Date().toISOString().split('T')[0]}.bib`;
            mimeType = 'text/plain';
            break;

        case 'markdown':
            content = `# arXiv 收藏夹\n\n导出时间: ${new Date().toLocaleString()}\n总计: ${papersData.length} 篇论文\n\n---\n\n`;
            content += papersData.map((paper, index) => {
                return `## ${index + 1}. ${paper.title || '无标题'}

**作者**: ${paper.authors || '未知'}  
**分类**: ${(paper.categories || []).join(', ')}  
**关键词**: ${(paper.keywords || []).join(', ')}  
**arXiv ID**: [${paper.id}](https://arxiv.org/abs/${paper.id})  
**PDF链接**: [PDF](https://arxiv.org/pdf/${paper.id})  

**摘要**: ${paper.abstract || '无摘要'}

${paper.zh_abstract ? `**中文摘要**: ${paper.zh_abstract}` : ''}

---
`;
            }).join('\n');
            filename = `arxiv-favorites-${new Date().toISOString().split('T')[0]}.md`;
            mimeType = 'text/markdown';
            break;

        default:
            showToast('不支持的导出格式', 'error');
            return;
    }

    downloadFile(content, filename, mimeType);
    showToast(`已导出 ${papersData.length} 篇论文为 ${format.toUpperCase()} 格式`);
}

// 导出其他用户数据
function exportUserData(dataType) {
    let content, filename, mimeType = 'application/json';

    switch (dataType) {
        case 'notes':
            const notesObj = Object.fromEntries(state.paperNotes);
            content = JSON.stringify(notesObj, null, 2);
            filename = `arxiv-notes-${new Date().toISOString().split('T')[0]}.json`;
            break;

        case 'tags':
            const tagsObj = Object.fromEntries(state.paperTags);
            content = JSON.stringify(tagsObj, null, 2);
            filename = `arxiv-tags-${new Date().toISOString().split('T')[0]}.json`;
            break;

        case 'ratings':
            const ratingsObj = Object.fromEntries(state.paperRatings);
            content = JSON.stringify(ratingsObj, null, 2);
            filename = `arxiv-ratings-${new Date().toISOString().split('T')[0]}.json`;
            break;

        case 'all':
            const allData = {
                favorites: Array.from(state.favorites),
                notes: Object.fromEntries(state.paperNotes),
                tags: Object.fromEntries(state.paperTags),
                ratings: Object.fromEntries(state.paperRatings),
                preferences: state.userPreferences,
                readingHistory: {
                    viewedPapers: Object.fromEntries(state.readingHistory.viewedPapers),
                    readingSessions: state.readingHistory.readingSessions,
                    preferences: Object.fromEntries(state.readingHistory.preferences)
                },
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            content = JSON.stringify(allData, null, 2);
            filename = `arxiv-complete-backup-${new Date().toISOString().split('T')[0]}.json`;
            break;

        default:
            showToast('不支持的数据类型', 'error');
            return;
    }

    downloadFile(content, filename, mimeType);
    showToast('数据导出成功');
}

// 数据导入功能
function importUserData(fileContent) {
    try {
        const data = JSON.parse(fileContent);

        // 验证数据格式
        if (data.version && data.exportDate) {
            // 完整备份格式
            if (confirm('这将覆盖现有的所有用户数据。是否继续？')) {
                if (data.favorites) state.favorites = new Set(data.favorites);
                if (data.notes) state.paperNotes = new Map(Object.entries(data.notes));
                if (data.tags) state.paperTags = new Map(Object.entries(data.tags));
                if (data.ratings) state.paperRatings = new Map(Object.entries(data.ratings));
                if (data.preferences) Object.assign(state.userPreferences, data.preferences);
                if (data.readingHistory) {
                    if (data.readingHistory.viewedPapers) {
                        state.readingHistory.viewedPapers = new Map(Object.entries(data.readingHistory.viewedPapers));
                    }
                    if (data.readingHistory.readingSessions) {
                        state.readingHistory.readingSessions = data.readingHistory.readingSessions;
                    }
                    if (data.readingHistory.preferences) {
                        state.readingHistory.preferences = new Map(Object.entries(data.readingHistory.preferences));
                    }
                }
            }
        } else {
            // 部分数据导入
            if (Array.isArray(data)) {
                // 收藏夹数据
                if (confirm('检测到收藏夹数据，是否导入？')) {
                    data.forEach(id => state.favorites.add(id));
                }
            } else if (typeof data === 'object') {
                // 其他类型的数据
                if (confirm('检测到用户数据，是否导入？')) {
                    // 简单的对象导入逻辑
                    Object.keys(data).forEach(key => {
                        if (state.paperNotes && state.paperNotes.set) {
                            state.paperNotes.set(key, data[key]);
                        }
                    });
                }
            }
        }

        // 保存所有数据
        saveFavorites();
        savePaperNotes();
        savePaperTags();
        savePaperRatings();
        saveUserPreferences();
        saveReadingHistory();

        showToast('数据导入成功', 'success');

        // 刷新UI
        updatePersonalizationUI();

    } catch (error) {
        console.error('Import error:', error);
        showToast('数据格式错误，导入失败', 'error');
    }
}

// 文件下载辅助函数
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 更新个性化UI
function updatePersonalizationUI() {
    // 更新设置面板中的统计信息
    const totalFavorites = document.getElementById('total-favorites');
    const totalNotes = document.getElementById('total-notes');
    const totalPapersRead = document.getElementById('total-papers-read');
    const avgRating = document.getElementById('avg-rating');
    const currentStreak = document.getElementById('current-streak');
    const longestStreak = document.getElementById('longest-streak');

    if (totalFavorites) totalFavorites.textContent = state.favorites.size;
    if (totalNotes) totalNotes.textContent = state.paperNotes.size;
    if (totalPapersRead) totalPapersRead.textContent = state.readingHistory.viewedPapers.size;
    if (currentStreak) currentStreak.textContent = `${state.userPreferences.readingGoals.currentStreak} 天`;
    if (longestStreak) longestStreak.textContent = `${state.userPreferences.readingGoals.longestStreak} 天`;

    // 计算平均评分
    if (avgRating) {
        const ratings = Array.from(state.paperRatings.values());
        const avg = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '0.0';
        avgRating.textContent = avg;
    }

    // 更新存储统计
    const storageFavorites = document.getElementById('storage-favorites');
    const storageNotes = document.getElementById('storage-notes');
    const storageTags = document.getElementById('storage-tags');
    const storageSize = document.getElementById('storage-size');

    if (storageFavorites) storageFavorites.textContent = state.favorites.size;
    if (storageNotes) storageNotes.textContent = state.paperNotes.size;
    if (storageTags) storageTags.textContent = state.paperTags.size;

    // 计算存储大小
    if (storageSize) {
        const totalSize = new Blob([
            localStorage.getItem('arxiv_favorites') || '',
            localStorage.getItem('arxiv_paper_notes') || '',
            localStorage.getItem('arxiv_paper_tags') || '',
            localStorage.getItem('arxiv_paper_ratings') || '',
            localStorage.getItem('arxiv_user_preferences') || '',
            localStorage.getItem('arxiv_reading_history') || ''
        ]).size;
        storageSize.textContent = totalSize > 1024 ? `${(totalSize / 1024).toFixed(1)} KB` : `${totalSize} B`;
    }

    // 更新阅读分类统计
    updateReadingCategoriesChart();
}

// 更新阅读分类统计图表
function updateReadingCategoriesChart() {
    const chartContainer = document.getElementById('reading-categories-chart');
    if (!chartContainer) return;

    const categoryStats = new Map();

    // 统计各分类的阅读次数
    state.readingHistory.viewedPapers.forEach((record, paperId) => {
        const paper = state.allPapers.get(paperId);
        if (paper && paper.categories) {
            paper.categories.forEach(category => {
                categoryStats.set(category, (categoryStats.get(category) || 0) + 1);
            });
        }
    });

    const sortedCategories = Array.from(categoryStats.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sortedCategories.length === 0) {
        chartContainer.innerHTML = '<p class="text-sm text-gray-500">暂无阅读记录</p>';
        return;
    }

    const maxCount = sortedCategories[0][1];

    chartContainer.innerHTML = sortedCategories.map(([category, count]) => {
        const percentage = (count / maxCount) * 100;
        return `
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-gray-700">${category}</span>
                    <div class="flex items-center gap-2">
                        <div class="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div class="h-full bg-blue-500 rounded-full" style="width: ${percentage}%"></div>
                        </div>
                        <span class="text-xs text-gray-500 w-8 text-right">${count}</span>
                    </div>
                </div>
            `;
    }).join('');
}

// 更新阅读目标显示
function updateReadingGoalsDisplay() {
    // 在个性化面板中更新目标进度
    // 这个函数可以在后续扩展
}

// --- UI/UX 功能 ---
function setupQuickNav() {
    const monthsByYear = state.manifest.availableMonths.reduce((acc, month) => {
        const year = month.substring(0, 4);
        if (!acc[year]) acc[year] = [];
        acc[year].push(month);
        return acc;
    }, {});
    let navHTML = '';
    const sortedYears = Object.keys(monthsByYear).sort((a, b) => b - a);
    sortedYears.forEach(year => {
        navHTML += `<div class="year-group"><span class="year-label">${year}</span>`;
        monthsByYear[year].forEach(month => {
            const monthLabel = month.substring(5, 7);
            navHTML += `<button class="month-btn" data-action="navigate-month" data-month="${month}">${monthLabel}月</button>`;
        });
        navHTML += `</div>`;
    });

    // 填充移动端和桌面端导航
    const mobileNavWrapper = document.getElementById('month-nav-wrapper');
    const desktopNavWrapper = document.getElementById('month-nav-wrapper-desktop');

    if (mobileNavWrapper) mobileNavWrapper.innerHTML = navHTML;
    if (desktopNavWrapper) desktopNavWrapper.innerHTML = navHTML;

    // 设置按钮事件
    setupViewToggleButtons();
    setupFavoritesButtons();
    updateViewModeUI();

    // 为移动端按钮添加涟漪效果
    if (state.mobile.isTouchDevice) {
        document.querySelectorAll('.month-btn').forEach(addRippleEffect);
    }
}

function setupViewToggleButtons() {
    // 桌面端按钮
    const detailedBtn = document.getElementById('view-detailed-btn');
    const compactBtn = document.getElementById('view-compact-btn');
    if (detailedBtn) {
        detailedBtn.dataset.action = 'toggle-view';
        detailedBtn.dataset.mode = 'detailed';
    }
    if (compactBtn) {
        compactBtn.dataset.action = 'toggle-view';
        compactBtn.dataset.mode = 'compact';
    }

    // 移动端按钮
    const detailedBtnMobile = document.getElementById('view-detailed-btn-mobile');
    const compactBtnMobile = document.getElementById('view-compact-btn-mobile');
    if (detailedBtnMobile) {
        detailedBtnMobile.dataset.action = 'toggle-view';
        detailedBtnMobile.dataset.mode = 'detailed';
    }
    if (compactBtnMobile) {
        compactBtnMobile.dataset.action = 'toggle-view';
        compactBtnMobile.dataset.mode = 'compact';
    }
}

function setupFavoritesButtons() {
    // 桌面端收藏按钮
    const favBtn = document.getElementById('show-favorites-btn');
    if (favBtn) {
        favBtn.dataset.action = 'search-tag';
        favBtn.dataset.tagValue = 'favorites';
    }

    // 移动端收藏按钮
    const favBtnMobile = document.getElementById('show-favorites-btn-mobile');
    if (favBtnMobile) {
        favBtnMobile.dataset.action = 'search-tag';
        favBtnMobile.dataset.tagValue = 'favorites';
    }
}

function renderSupportedCategories() {
    const container = document.getElementById('supported-categories-list');
    if (!container) {
        console.warn('Supported categories container not found.');
        return;
    }

    // 使用多种颜色让标签更生动
    const colors = [
        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
        'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
    ];

    const categoriesHTML = state.supportedCategories.map((cat, index) => {
        const colorClass = colors[index % colors.length];
        return `
            <button 
                class="px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-transform transform hover:scale-105 ${colorClass}" 
                data-action="search-tag" 
                data-tag-value="${cat}"
                title="搜索分类: ${cat}">
                ${cat}
            </button>
        `;
    }).join('');

    container.innerHTML = categoriesHTML;
}

function setupCategoryFilters() {
    if (!state.categoryIndex) {
        categoryFiltersEl.innerHTML = '<p class="text-sm text-gray-500">分类信息加载中...</p>';
        return;
    }

    const categoriesWithCounts = state.allCategories.map(cat => ({
        name: cat,
        count: state.categoryIndex[cat] ? state.categoryIndex[cat].length : 0
    }));

    categoriesWithCounts.sort((a, b) => b.count - a.count);

    let buttonsHTML = '';
    categoriesWithCounts.forEach(catInfo => {
        if (catInfo.count > 0) { // 只显示有论文的分类
            buttonsHTML += `<button class="category-filter-btn flex-shrink-0" data-action="search-tag" data-tag-value="${catInfo.name}">${catInfo.name} (${catInfo.count})</button>`;
        }
    });
    categoryFiltersEl.innerHTML = buttonsHTML;
}

function renderCategoryFiltersForSearch(papers) {
    const categoryCounts = new Map();
    papers.forEach(paper => {
        if (paper.categories) {
            paper.categories.forEach(cat => {
                categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
            });
        }
    });

    const sortedCategories = Array.from(categoryCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    let buttonsHTML = `<button class="category-filter-btn active flex-shrink-0" data-action="filter-category" data-category="all">全部 <span class="filter-count">${papers.length}</span></button>`;
    sortedCategories.forEach(catInfo => {
        if (catInfo.count > 0) {
            buttonsHTML += `<button class="category-filter-btn flex-shrink-0" data-action="filter-category" data-category="${catInfo.name}">${catInfo.name} <span class="filter-count">${catInfo.count}</span></button>`;
        }
    });
    categoryFiltersEl.innerHTML = buttonsHTML;
}

function setupNavObserver() {
    const options = { rootMargin: '-40% 0px -60% 0px', threshold: 0 };
    state.navObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const month = entry.target.dataset.monthAnchor;
                document.querySelectorAll('.month-btn.active').forEach(btn => btn.classList.remove('active'));
                const targetBtn = document.querySelector(`.month-btn[data-month="${month}"]`);
                if (targetBtn) targetBtn.classList.add('active');
            }
        });
    }, options);
}

function setupBackToTopButton() {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) { backToTopBtn.classList.add('visible'); }
        else { backToTopBtn.classList.remove('visible'); }

        // 更新阅读进度
        updateReadingProgress();
    });
    backToTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
}

function updateSearchStickiness() {
    const navHeight = quickNavContainer.offsetHeight;
    document.documentElement.style.setProperty('--nav-height', `${navHeight}px`);
}

// --- 核心逻辑：数据加载与渲染 ---
async function fetchWithProgress(monthsToLoad) {
    console.log(`fetchWithProgress called with months: ${monthsToLoad}`);
    const total = monthsToLoad.length;
    if (total === 0) return;

    showProgress(`开始加载 ${total} 个文件...`);
    let loadedCount = 0;

    for (const month of monthsToLoad) {
        loadedCount++;
        console.log(`Loading month ${month} (${loadedCount}/${total})`);
        updateProgress(`正在加载: ${month} (${loadedCount}/${total})`, (loadedCount / total) * 90);
        try {
            await fetchMonth(month);
            console.log(`Successfully loaded month ${month}`);
        } catch (error) {
            console.error(`Failed to load month ${month}:`, error);
            showToast(`加载 ${month} 失败`, 'error');
            // 继续尝试加载其他月份
        }
    }
    console.log('fetchWithProgress completed');
}

async function fetchMonth(month, force = false) { // 1. 添加 force 参数，默认为 false
    console.log(`📅 fetchMonth 调用: ${month}, force: ${force}`);
    
    // 2. 在检查缓存时，同时检查 force 标志
    if (state.loadedMonths.has(month) && !force) {
        console.log(`✅ 月份 ${month} 已加载，跳过`);
        return;
    }

    // 如果是强制加载，记录原因
    if (force && state.loadedMonths.has(month)) {
        console.warn(`🔄 强制重新加载月份 ${month}，数据可能不完整`);
    }

    // Enhanced Worker support detection and intelligent fallback
    const shouldUseWorker = checkWorkerSupport(month);
    let workerAttempted = false;
    
    if (shouldUseWorker) {
        try {
            console.log(`🔧 使用 Web Worker 加载 ${month}`);
            workerAttempted = true;
            await fetchMonthWithWorker(month);
            
            // Record successful Worker usage
            recordWorkerUsage(month, 'success');
            
        } catch (workerError) {
            console.warn(`🚨 Web Worker 失败 (${month}):`, workerError.message);
            
            // Record Worker failure
            recordWorkerUsage(month, 'failed', workerError.message);
            
            // Intelligently decide whether to retry with fallback
            const shouldRetryWithFallback = shouldAttemptFallback(workerError, month);
            
            if (shouldRetryWithFallback) {
                console.log(`🔄 自动切换到 fallback 方法加载 ${month}`);
                updateProgress(`Worker 失败，切换到主线程模式...`, 25);
                
                try {
                    await fetchMonthFallback(month);
                    recordWorkerUsage(month, 'fallback_success');
                    showToast(`${month} 已通过备用方式加载完成`, 'info');
                } catch (fallbackError) {
                    console.error(`❌ Fallback 也失败了 (${month}):`, fallbackError.message);
                    recordWorkerUsage(month, 'fallback_failed', fallbackError.message);
                    throw new Error(`数据加载失败：${fallbackError.message}`);
                }
            } else {
                // Don't retry with fallback, just throw the error
                throw workerError;
            }
        }
    } else {
        console.log(`📝 直接使用 fallback 方法加载 ${month}${!workerAttempted ? ' (Worker 不可用)' : ''}`);
        await fetchMonthFallback(month);
        recordWorkerUsage(month, 'fallback_only');
    }
    
    // 验证加载结果
    console.log(`📊 加载完成后统计:`);
    console.log(`- state.allPapers 总数: ${state.allPapers.size}`);
    
    const papersFromThisMonth = Array.from(state.allPapers.values()).filter(p => 
        p.date && p.date.startsWith(month)
    );
    console.log(`- ${month} 月论文数量: ${papersFromThisMonth.length}`);
    
    // 如果没有找到该月的论文，发出警告
    if (papersFromThisMonth.length === 0) {
        console.warn(`⚠️ 警告：${month} 月份加载后没有找到任何论文`);
    }
    
    return papersFromThisMonth.length;
}

// Check if Web Worker should be used for this month
function checkWorkerSupport(month) {
    // Basic Worker support check
    if (typeof Worker === 'undefined') {
        return false;
    }
    
    // Check recent failure rate for this month
    const failureHistory = getWorkerFailureHistory(month);
    if (failureHistory && failureHistory.recentFailureRate > 0.7) { // >70% failure rate
        console.log(`Skipping Worker for ${month} due to high failure rate: ${failureHistory.recentFailureRate}`);
        return false;
    }
    
    // Check if this month has consistently failed before
    const monthHistory = getMonthPerformanceHistory(month);
    if (monthHistory && monthHistory.failures.length > monthHistory.successes.length * 2) {
        console.log(`Skipping Worker for ${month} due to poor historical performance`);
        return false;
    }
    
    // Check system resources
    if (performance.memory && performance.memory.usedJSHeapSize > 150 * 1024 * 1024) { // >150MB
        console.log(`Skipping Worker for ${month} due to high memory usage`);
        return false;
    }
    
    return true;
}

// Determine if fallback should be attempted after Worker failure
function shouldAttemptFallback(error, month) {
    const errorMessage = error.message.toLowerCase();
    
    // Always retry for timeout errors (might be network related)
    if (errorMessage.includes('超时') || errorMessage.includes('timeout')) {
        return true;
    }
    
    // Always retry for stuck/progress errors
    if (errorMessage.includes('卡住') || errorMessage.includes('stuck') || errorMessage.includes('progress')) {
        return true;
    }
    
    // Retry for network-related errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('failed to fetch')) {
        return true;
    }
    
    // Don't retry for structural errors (JSON parse errors, etc.)
    if (errorMessage.includes('parse') || errorMessage.includes('syntax')) {
        return false;
    }
    
    // Don't retry if we've already failed multiple times recently
    const failureHistory = getWorkerFailureHistory(month);
    if (failureHistory && failureHistory.recentFailures >= 3) {
        console.log(`Not retrying fallback for ${month} - too many recent failures`);
        return false;
    }
    
    // Default: attempt fallback
    return true;
}

// Get Worker failure history for decision making
function getWorkerFailureHistory(month) {
    const historyKey = 'worker_failure_history';
    const stored = localStorage.getItem(historyKey);
    
    let history = {};
    if (stored) {
        try {
            history = JSON.parse(stored);
        } catch (e) {
            console.warn('Failed to parse worker failure history:', e);
        }
    }
    
    const monthHistory = history[month] || { failures: [], successes: [] };
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Count recent failures (last hour)
    const recentFailures = monthHistory.failures.filter(f => f.timestamp > oneHourAgo).length;
    const recentSuccesses = monthHistory.successes.filter(s => s.timestamp > oneHourAgo).length;
    const totalRecent = recentFailures + recentSuccesses;
    
    return {
        recentFailures,
        recentSuccesses,
        recentFailureRate: totalRecent > 0 ? recentFailures / totalRecent : 0
    };
}

// Record Worker usage for analytics and decision making
function recordWorkerUsage(month, status, errorMessage = null) {
    const historyKey = 'worker_failure_history';
    const stored = localStorage.getItem(historyKey);
    
    let history = {};
    if (stored) {
        try {
            history = JSON.parse(stored);
        } catch (e) {
            console.warn('Failed to parse worker failure history:', e);
        }
    }
    
    if (!history[month]) {
        history[month] = { failures: [], successes: [] };
    }
    
    const record = {
        timestamp: Date.now(),
        status,
        errorMessage
    };
    
    if (status.includes('success')) {
        history[month].successes.push(record);
        // Keep only last 10 successes
        history[month].successes = history[month].successes.slice(-10);
    } else {
        history[month].failures.push(record);
        // Keep only last 10 failures
        history[month].failures = history[month].failures.slice(-10);
    }
    
    // Save updated history
    try {
        localStorage.setItem(historyKey, JSON.stringify(history));
    } catch (e) {
        console.warn('Failed to save worker usage history:', e);
    }
    
    // Update global performance tracking
    if (performance.updateWorkerUsageStats) {
        performance.updateWorkerUsageStats(month, status, errorMessage);
    }
}

async function fetchMonthWithWorker(month) {
    console.log(`Using Web Worker for ${month}`);

    return new Promise((resolve, reject) => {
        const worker = new Worker('./json-parser-worker.js');
        const url = `./data/database-${month}.json`;

        // Enhanced worker state tracking
        const workerState = {
            startTime: Date.now(),
            lastHeartbeat: Date.now(),
            lastProgressUpdate: Date.now(),
            totalPapers: 0,
            processedPapers: 0,
            isStuck: false,
            progressStuckCount: 0,
            timeoutId: null,
            heartbeatCheckId: null,
            config: getWorkerConfig(),
            estimatedSize: 0
        };

        updateProgress(`加载 ${month} (使用 Web Worker)...`, 30);

        // Send configuration to worker
        worker.postMessage({ 
            url, 
            month, 
            config: workerState.config,
            asyncImageProcessing: checkAsyncImageProcessingSupport()
        });

        // Calculate dynamic timeout based on estimated data size and network conditions
        const dynamicTimeout = calculateDynamicTimeout(month);
        console.log(`Dynamic timeout set to ${dynamicTimeout}ms for ${month}`);

        // Set main timeout
        workerState.timeoutId = setTimeout(() => {
            console.warn(`Web Worker timeout after ${dynamicTimeout}ms`);
            worker.terminate();
            recordWorkerFailure(month, 'timeout', dynamicTimeout);
            reject(new Error(`Web Worker 超时 (${Math.round(dynamicTimeout/1000)}秒)`));
        }, dynamicTimeout);

        // Start heartbeat monitoring for stuck detection
        workerState.heartbeatCheckId = setInterval(() => {
            checkWorkerProgress(workerState, worker, month, reject);
        }, 5000); // Check every 5 seconds

        worker.onmessage = function (e) {
            const { type, papers, progress, error, timestamp, contentLength, totalPapers, batchSize, processingSpeed, estimatedTimeRemaining } = e.data;

            // Update heartbeat timestamp
            workerState.lastHeartbeat = timestamp || Date.now();

            switch (type) {
                case 'started':
                    console.log(`Worker started processing ${month} at ${new Date(timestamp).toISOString()}`);
                    if (e.data.capabilities) {
                        console.log('Worker capabilities:', e.data.capabilities);
                        if (e.data.capabilities.asyncImageProcessing) {
                            console.log('✨ Async image processing enabled');
                        }
                    }
                    break;

                case 'fetch_complete':
                    if (contentLength) {
                        workerState.estimatedSize = parseInt(contentLength, 10);
                        console.log(`Fetch completed for ${month}, size: ${(workerState.estimatedSize / 1024 / 1024).toFixed(1)}MB`);
                    }
                    break;

                case 'processing_start':
                    workerState.totalPapers = totalPapers;
                    console.log(`Processing started for ${month}: ${totalPapers} papers, batch size: ${batchSize}`);
                    updateProgress(
                        `处理 ${month}: 开始处理 ${totalPapers} 篇论文 (批次大小: ${batchSize})`,
                        35
                    );
                    break;

                case 'heartbeat':
                    // Update heartbeat tracking
                    workerState.lastHeartbeat = timestamp;
                    workerState.processedPapers = e.data.processed;
                    workerState.totalPapers = e.data.total;
                    
                    // Check if progress has been made
                    if (e.data.processed > workerState.processedPapers) {
                        workerState.lastProgressUpdate = timestamp;
                        workerState.progressStuckCount = 0;
                        workerState.isStuck = false;
                    }
                    break;

                case 'batch':
                    // 批量处理接收到的论文数据
                    papers.forEach(paper => {
                        if (paper && paper.id && !state.allPapers.has(paper.id)) {
                            state.allPapers.set(paper.id, paper);
                        }
                    });
                    workerState.processedPapers += papers.length;
                    workerState.lastProgressUpdate = Date.now();
                    workerState.progressStuckCount = 0;
                    workerState.isStuck = false;

                    if (progress) {
                        let progressText = `处理 ${month}: ${progress.current}/${progress.total}`;
                        
                        // Add processing speed information if available
                        if (progress.processingSpeed) {
                            progressText += ` (${progress.processingSpeed} 篇/秒)`;
                        }
                        
                        // Add estimated time remaining if available
                        if (progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0) {
                            progressText += ` 预计剩余: ${progress.estimatedTimeRemaining}秒`;
                        }

                        updateProgress(
                            progressText,
                            30 + (progress.percentage * 0.6)
                        );

                        // Update performance monitoring
                        if (performance.updateWorkerStats) {
                            performance.updateWorkerStats({
                                month,
                                processed: progress.current,
                                total: progress.total,
                                speed: progress.processingSpeed,
                                estimatedRemaining: progress.estimatedTimeRemaining
                            });
                        }
                    }
                    break;

                case 'complete':
                    clearTimeout(workerState.timeoutId);
                    clearInterval(workerState.heartbeatCheckId);
                    worker.terminate();
                    state.loadedMonths.add(month);
                    
                    const totalTime = e.data.processingTime || (Date.now() - workerState.startTime);
                    console.log(`Web Worker completed loading ${month}: ${workerState.processedPapers} papers in ${totalTime}ms`);
                    
                    if (e.data.processedWithAsyncFeatures) {
                        console.log('🎨 Async features were used during processing');
                    }
                    
                    // Record successful completion
                    recordWorkerSuccess(month, totalTime, workerState.processedPapers);
                    resolve();
                    break;

                case 'capabilities':
                    // Handle worker capabilities announcement
                    console.log('Worker capabilities received:', e.data.features);
                    if (performance.updateWorkerCapabilities) {
                        performance.updateWorkerCapabilities(e.data.features);
                    }
                    break;

                case 'error':
                    clearTimeout(workerState.timeoutId);
                    clearInterval(workerState.heartbeatCheckId);
                    worker.terminate();
                    console.error(`Web Worker error for ${month}:`, error);
                    recordWorkerFailure(month, 'worker_error', Date.now() - workerState.startTime);
                    reject(new Error(error));
                    break;
            }
        };

        worker.onerror = function (error) {
            clearTimeout(workerState.timeoutId);
            clearInterval(workerState.heartbeatCheckId);
            worker.terminate();
            console.error(`Web Worker error:`, error);
            recordWorkerFailure(month, 'onerror', Date.now() - workerState.startTime);
            reject(error);
        };
    });
}

// Calculate dynamic timeout based on various factors
function calculateDynamicTimeout(month) {
    const preferences = state.userPreferences.workerPreferences;
    const baseTimeout = 60000; // 60 seconds base
    const maxTimeout = preferences.maxTimeoutMinutes * 60 * 1000; // User-configurable max
    const minTimeout = 30000;  // 30 seconds minimum
    
    // Check timeout strategy
    if (preferences.timeoutStrategy === 'fixed') {
        return Math.min(maxTimeout, baseTimeout);
    }
    
    if (preferences.timeoutStrategy === 'aggressive') {
        // Shorter timeouts, more likely to fallback
        return Math.min(maxTimeout, baseTimeout * 0.7);
    }
    
    // Default: adaptive strategy
    const networkCondition = getNetworkCondition();
    const previousPerformance = getMonthPerformanceHistory(month);
    const estimatedDataSize = getEstimatedDataSize(month);
    
    let dynamicTimeout = baseTimeout;
    
    // Adjust based on network conditions
    switch (networkCondition) {
        case 'slow':
            dynamicTimeout *= 2;
            break;
        case 'fast':
            dynamicTimeout *= 0.7;
            break;
        case 'unknown':
        default:
            dynamicTimeout *= 1.2; // Conservative for unknown conditions
            break;
    }
    
    // Adjust based on estimated data size
    if (estimatedDataSize > 10 * 1024 * 1024) { // > 10MB
        dynamicTimeout *= 1.5;
    } else if (estimatedDataSize < 1 * 1024 * 1024) { // < 1MB
        dynamicTimeout *= 0.8;
    }
    
    // Adjust based on previous performance
    if (previousPerformance && previousPerformance.averageTime) {
        const performanceMultiplier = Math.max(0.5, Math.min(2.0, previousPerformance.averageTime / baseTimeout));
        dynamicTimeout *= performanceMultiplier;
    }
    
    // Ensure timeout is within bounds
    return Math.max(minTimeout, Math.min(maxTimeout, Math.round(dynamicTimeout)));
}

// Get network condition assessment
function getNetworkCondition() {
    // Use navigator.connection if available
    if (navigator.connection) {
        const connection = navigator.connection;
        const effectiveType = connection.effectiveType;
        
        if (effectiveType === '4g' && connection.downlink > 10) {
            return 'fast';
        } else if (effectiveType === '3g' || connection.downlink < 1) {
            return 'slow';
        }
    }
    
    // Fallback: use performance timing if available
    if (performance.timing) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        if (loadTime < 2000) return 'fast';
        if (loadTime > 5000) return 'slow';
    }
    
    return 'unknown';
}

// Get estimated data size for a month
function getEstimatedDataSize(month) {
    // Try to estimate based on previous months or use a default
    const averageSize = 5 * 1024 * 1024; // 5MB default
    
    // Could be enhanced with actual historical data
    if (performance.loadTimes && performance.loadTimes.has(month)) {
        return performance.loadTimes.get(month).estimatedSize || averageSize;
    }
    
    return averageSize;
}

// Get performance history for a specific month
function getMonthPerformanceHistory(month) {
    const historyKey = `worker_perf_${month}`;
    const stored = localStorage.getItem(historyKey);
    
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.warn('Failed to parse performance history:', e);
        }
    }
    
    return null;
}

// Get worker configuration
function getWorkerConfig() {
    const preferences = state.userPreferences.workerPreferences;
    
    return {
        baseBatchSize: preferences.adaptiveBatchSizing ? 1000 : 500,
        maxBatchSize: preferences.adaptiveBatchSizing ? 2000 : 1000,
        minBatchSize: 100,
        enableTimeSlicing: true,
        heartbeatInterval: 5000,
        adaptiveBatchSizing: preferences.adaptiveBatchSizing,
        stuckDetectionEnabled: preferences.enableStuckDetection,
        stuckThreshold: preferences.stuckDetectionThreshold
    };
}

// Check if worker is making progress or stuck
function checkWorkerProgress(workerState, worker, month, reject) {
    const preferences = state.userPreferences.workerPreferences;
    
    if (!preferences.enableStuckDetection) {
        return; // Skip stuck detection if disabled
    }
    
    const now = Date.now();
    const timeSinceLastHeartbeat = now - workerState.lastHeartbeat;
    const timeSinceLastProgress = now - workerState.lastProgressUpdate;
    const stuckThreshold = preferences.stuckDetectionThreshold;
    
    // Check for missing heartbeats (worker might be completely stuck)
    if (timeSinceLastHeartbeat > 15000) { // 15 seconds without heartbeat
        console.warn(`Worker for ${month} has not sent heartbeat for ${timeSinceLastHeartbeat}ms`);
        clearTimeout(workerState.timeoutId);
        clearInterval(workerState.heartbeatCheckId);
        worker.terminate();
        recordWorkerFailure(month, 'no_heartbeat', now - workerState.startTime);
        reject(new Error('Web Worker 失去响应 (无心跳信号)'));
        return;
    }
    
    // Check for stuck progress (worker alive but not making progress)
    if (timeSinceLastProgress > stuckThreshold) {
        workerState.progressStuckCount++;
        
        if (!workerState.isStuck) {
            workerState.isStuck = true;
            console.warn(`Worker for ${month} appears stuck - no progress for ${timeSinceLastProgress}ms`);
            
            // Notify user about stuck state
            updateProgress(
                `处理 ${month}: 检测到卡住状态，尝试恢复中...`,
                50
            );
        }
        
        // Calculate max retry attempts based on user preferences
        const maxStuckChecks = Math.max(2, Math.floor(preferences.maxRetryAttempts * 1.5));
        
        // If stuck for too long, terminate and switch to fallback
        if (workerState.progressStuckCount >= maxStuckChecks) {
            console.error(`Worker for ${month} stuck for too long, terminating`);
            clearTimeout(workerState.timeoutId);
            clearInterval(workerState.heartbeatCheckId);
            worker.terminate();
            recordWorkerFailure(month, 'stuck_progress', now - workerState.startTime);
            reject(new Error('Web Worker 卡住状态 (长时间无进度更新)'));
            return;
        }
    }
}

// Record worker success for performance tracking
function recordWorkerSuccess(month, processingTime, paperCount) {
    const historyKey = `worker_perf_${month}`;
    const existing = getMonthPerformanceHistory(month) || { successes: [], failures: [] };
    
    existing.successes.push({
        timestamp: Date.now(),
        processingTime,
        paperCount,
        timePerPaper: processingTime / paperCount
    });
    
    // Keep only last 5 records
    existing.successes = existing.successes.slice(-5);
    
    // Calculate average time
    existing.averageTime = existing.successes.reduce((sum, record) => sum + record.processingTime, 0) / existing.successes.length;
    
    localStorage.setItem(historyKey, JSON.stringify(existing));
    
    // Update global performance stats
    if (performance.recordWorkerSuccess) {
        performance.recordWorkerSuccess(month, processingTime, paperCount);
    }
}

// Record worker failure for performance tracking
function recordWorkerFailure(month, reason, timeElapsed) {
    const historyKey = `worker_perf_${month}`;
    const existing = getMonthPerformanceHistory(month) || { successes: [], failures: [] };
    
    existing.failures.push({
        timestamp: Date.now(),
        reason,
        timeElapsed
    });
    
    // Keep only last 5 records
    existing.failures = existing.failures.slice(-5);
    
    localStorage.setItem(historyKey, JSON.stringify(existing));
    
    // Update global performance stats
    if (performance.recordWorkerFailure) {
        performance.recordWorkerFailure(month, reason, timeElapsed);
    }
}

async function fetchMonthFallback(month) {
    console.log(`Using enhanced fallback method for ${month}`);
    try {
        const url = `./data/database-${month}.json`;
        console.log(`Fetching URL: ${url}`);
        const response = await fetch(url);
        console.log(`Response status: ${response.status}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        // 获取文件大小以显示进度
        const contentLength = response.headers.get('content-length');
        const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
        console.log(`File size: ${totalSize} bytes (${(totalSize / 1024 / 1024).toFixed(1)}MB)`);

        // 显示解析进度
        updateProgress(`解析数据文件 ${month}...`, 50);

        // Calculate dynamic timeout for fallback based on file size
        const fallbackTimeout = calculateFallbackTimeout(totalSize);
        console.log(`Fallback timeout set to ${fallbackTimeout}ms`);

        // 使用Promise.race添加超时控制
        const parsePromise = response.json();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`JSON解析超时 (${Math.round(fallbackTimeout/1000)}秒)`)), fallbackTimeout)
        );

        console.log('Starting JSON parsing...');
        const papers = await Promise.race([parsePromise, timeoutPromise]);
        console.log(`Loaded ${papers.length} papers for month ${month}`);

        // Enhanced batch processing with requestIdleCallback for better main thread performance
        await processPapersWithIdleCallback(papers, month);

        state.loadedMonths.add(month);
        console.log(`Fallback method completed for ${month}: ${papers.length} papers processed`);
        
        return papers.length;
    } catch (error) {
        console.error(`Failed to load data for month ${month}:`, error);
        if (error.message.includes('JSON解析超时')) {
            showToast(`${month} 数据文件过大，解析超时。请稍后重试。`);
        }
        throw error; // 重新抛出错误以便上层处理
    }
}

// Calculate dynamic timeout for fallback method based on file size
function calculateFallbackTimeout(fileSize) {
    const baseTimeout = 45000; // 45 seconds base
    const maxTimeout = 180000; // 3 minutes maximum
    const minTimeout = 30000;  // 30 seconds minimum
    
    if (!fileSize || fileSize <= 0) {
        return baseTimeout;
    }
    
    // Calculate timeout based on file size (assuming ~1MB per 15 seconds processing time)
    const sizeMB = fileSize / (1024 * 1024);
    const sizeBasedTimeout = sizeMB * 15000; // 15 seconds per MB
    
    // Apply network condition modifier
    const networkCondition = getNetworkCondition();
    let networkMultiplier = 1;
    
    switch (networkCondition) {
        case 'slow':
            networkMultiplier = 2;
            break;
        case 'fast':
            networkMultiplier = 0.7;
            break;
        default:
            networkMultiplier = 1.2;
            break;
    }
    
    const adjustedTimeout = (baseTimeout + sizeBasedTimeout) * networkMultiplier;
    
    return Math.max(minTimeout, Math.min(maxTimeout, Math.round(adjustedTimeout)));
}

// Process papers using requestIdleCallback for better main thread performance
async function processPapersWithIdleCallback(papers, month) {
    return new Promise((resolve, reject) => {
        let processedCount = 0;
        const adaptiveBatchSize = calculateAdaptiveBatchSize(papers.length);
        let currentBatchIndex = 0;
        const totalBatches = Math.ceil(papers.length / adaptiveBatchSize);
        
        console.log(`Processing ${papers.length} papers in ${totalBatches} batches of ${adaptiveBatchSize}`);
        
        function processNextBatch(deadline) {
            const batchStartTime = Date.now();
            let batchProcessed = 0;
            
            // Process papers while we have time left in this frame
            while (currentBatchIndex * adaptiveBatchSize + batchProcessed < papers.length && 
                   (deadline.timeRemaining() > 1 || deadline.didTimeout)) {
                
                const paperIndex = currentBatchIndex * adaptiveBatchSize + batchProcessed;
                const paper = papers[paperIndex];
                
                if (paper && paper.id && !state.allPapers.has(paper.id)) {
                    state.allPapers.set(paper.id, paper);
                }
                
                batchProcessed++;
                processedCount++;
                
                // Update progress every 100 papers or when batch is complete
                if (batchProcessed % 100 === 0 || paperIndex === papers.length - 1) {
                    const progressPercentage = Math.round((processedCount / papers.length) * 100);
                    const processingSpeed = processedCount / ((Date.now() - batchStartTime) / 1000);
                    
                    updateProgress(
                        `主线程处理 ${month}: ${processedCount}/${papers.length} (${Math.round(processingSpeed)} 篇/秒)`,
                        50 + (progressPercentage * 0.4)
                    );
                }
                
                // Break if we've processed a full batch
                if (batchProcessed >= adaptiveBatchSize) {
                    break;
                }
            }
            
            // Update batch index
            if (batchProcessed >= adaptiveBatchSize || currentBatchIndex * adaptiveBatchSize + batchProcessed >= papers.length) {
                currentBatchIndex++;
            }
            
            // Check if we're done
            if (processedCount >= papers.length) {
                console.log(`Completed processing ${processedCount} papers for ${month}`);
                resolve();
                return;
            }
            
            // Schedule next batch
            if (window.requestIdleCallback) {
                requestIdleCallback(processNextBatch, { timeout: 1000 });
            } else {
                // Fallback for browsers without requestIdleCallback
                setTimeout(() => processNextBatch({ timeRemaining: () => 5, didTimeout: false }), 0);
            }
        }
        
        // Start processing
        if (window.requestIdleCallback) {
            requestIdleCallback(processNextBatch, { timeout: 1000 });
        } else {
            setTimeout(() => processNextBatch({ timeRemaining: () => 5, didTimeout: false }), 0);
        }
    });
}

// Calculate adaptive batch size for fallback processing
function calculateAdaptiveBatchSize(totalPapers) {
    const baseBatchSize = 500;
    const maxBatchSize = 1000;
    const minBatchSize = 100;
    
    // Check system performance
    const performanceMetrics = getSystemPerformanceMetrics();
    
    let adaptiveBatchSize = baseBatchSize;
    
    // Adjust based on total papers
    if (totalPapers < 1000) {
        adaptiveBatchSize = minBatchSize;
    } else if (totalPapers > 5000) {
        adaptiveBatchSize = maxBatchSize;
    } else {
        adaptiveBatchSize = Math.round(baseBatchSize * (totalPapers / 2500));
    }
    
    // Adjust based on system performance
    if (performanceMetrics.isLowEnd) {
        adaptiveBatchSize = Math.round(adaptiveBatchSize * 0.5);
    } else if (performanceMetrics.isHighEnd) {
        adaptiveBatchSize = Math.round(adaptiveBatchSize * 1.5);
    }
    
    // Adjust based on memory usage
    if (performance.memoryUsage > 100) { // >100MB
        adaptiveBatchSize = Math.round(adaptiveBatchSize * 0.7);
    }
    
    return Math.max(minBatchSize, Math.min(maxBatchSize, adaptiveBatchSize));
}

// Get basic system performance metrics
function getSystemPerformanceMetrics() {
    const metrics = {
        isLowEnd: false,
        isHighEnd: false,
        cpuSlowdown: 1
    };
    
    // Check hardware concurrency
    if (navigator.hardwareConcurrency) {
        if (navigator.hardwareConcurrency <= 2) {
            metrics.isLowEnd = true;
        } else if (navigator.hardwareConcurrency >= 8) {
            metrics.isHighEnd = true;
        }
    }
    
    // Check device memory if available
    if (navigator.deviceMemory) {
        if (navigator.deviceMemory <= 2) {
            metrics.isLowEnd = true;
        } else if (navigator.deviceMemory >= 8) {
            metrics.isHighEnd = true;
        }
    }
    
    // Check connection speed
    if (navigator.connection) {
        if (navigator.connection.effectiveType === '2g' || navigator.connection.effectiveType === 'slow-2g') {
            metrics.isLowEnd = true;
        }
    }
    
    return metrics;
}

function renderPapers(papersForMonth, month) {
    return measureRenderTime(() => {
        const monthWrapper = document.createElement('div');
        monthWrapper.id = `month-content-${month}`;
        monthWrapper.dataset.monthAnchor = month;

        const header = document.createElement('h2');
        header.className = 'month-header';
        header.textContent = `${month.substring(0, 4)}年${month.substring(5, 7)}月`;

        const dateFilterWrapper = document.createElement('div');
        dateFilterWrapper.id = `date-filter-wrapper-${month}`;
        dateFilterWrapper.className = 'flex flex-wrap items-center gap-2 mb-6';

        const papersListWrapper = document.createElement('div');
        papersListWrapper.id = `papers-list-wrapper-${month}`;
        papersListWrapper.className = 'space-y-8';

        monthWrapper.append(header, dateFilterWrapper, papersListWrapper);
        papersContainer.appendChild(monthWrapper);

        if (state.navObserver) {
            state.navObserver.observe(monthWrapper);
            console.log(`navObserver now observing month ${month}`);
        } else {
            console.log('navObserver is null, skipping observe');
        }

        updateMonthView(month, papersForMonth);
    }, `renderPapers-${month}`);
}

function updateMonthView(month, allPapersForMonth) {
    const dateFilterWrapper = document.getElementById(`date-filter-wrapper-${month}`);
    const papersListWrapper = document.getElementById(`papers-list-wrapper-${month}`);
    if (!dateFilterWrapper || !papersListWrapper) return;

    const activeFilter = state.activeDateFilters.get(month) || 'all';

    renderDateFilter(month, allPapersForMonth, dateFilterWrapper);

    const filteredPapers = (activeFilter === 'all')
        ? allPapersForMonth
        : allPapersForMonth.filter(p => p.date === activeFilter);

    papersListWrapper.innerHTML = '';
    // 确保在渲染前按日期降序排序，以解决筛选后顺序不正确的问题
    filteredPapers.sort((a, b) => b.date.localeCompare(a.date));
    if (filteredPapers.length > 0) {
        renderInChunks(filteredPapers, papersListWrapper);
    } else {
        papersListWrapper.innerHTML = `<p class="text-center text-gray-500 py-4">该日期没有论文。</p>`;
    }
}

function renderDailyDistributionFilters(papers) {
    const container = document.getElementById('daily-distribution-container');
    const filtersEl = document.getElementById('daily-distribution-filters');
    if (!container || !filtersEl) return;

    if (papers.length === 0) {
        container.classList.add('hidden');
        return;
    }

    const dateCounts = papers.reduce((acc, paper) => {
        if (paper.date) {
            acc[paper.date] = (acc[paper.date] || 0) + 1;
        }
        return acc;
    }, {});

    const sortedDates = Object.keys(dateCounts).sort((a, b) => new Date(b) - new Date(a));

    if (sortedDates.length <= 1) { // 如果只有一天的数据，则不显示筛选器
        container.classList.add('hidden');
        return;
    }

    // If no start date is set, or if a range is selected, 'all' is active.
    // Otherwise, if a single day is selected (start === end), that day is active.
    const activeDate = (!currentDateFilter.startDate || currentDateFilter.startDate !== currentDateFilter.endDate) 
        ? 'all' 
        : currentDateFilter.startDate;

    let buttonsHTML = `<button class="date-filter-btn flex-shrink-0 ${activeDate === 'all' ? 'active' : ''}" data-action="filter-by-distribution-date" data-date="all">全部日期 <span class="filter-count">${papers.length}</span></button>`;

    sortedDates.forEach(date => {
        const count = dateCounts[date];
        const dateObj = new Date(date);
        const displayDate = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
        buttonsHTML += `<button class="date-filter-btn flex-shrink-0 ${activeDate === date ? 'active' : ''}" data-action="filter-by-distribution-date" data-date="${date}">${displayDate} <span class="filter-count">${count}</span></button>`;
    });

    filtersEl.innerHTML = buttonsHTML;
    container.classList.remove('hidden');
}

function renderDateFilter(month, papers, container) {
    // The active filter for a month can be 'all' or a full date like '2025-06-15'
    const activeDateFilter = state.activeDateFilters.get(month) || 'all';

    // Group papers by full date and get counts
    // FIX: Only count papers whose date property actually falls within the specified month.
    // This prevents dates from other months (due to potential data errors) from polluting the filter buttons.
    const dateCounts = papers.reduce((acc, paper) => {
        if (paper.date && paper.date.startsWith(month)) {
            acc[paper.date] = (acc[paper.date] || 0) + 1;
        }
        return acc;
    }, {});

    // Get unique dates and sort them in descending order
    const sortedDates = Object.keys(dateCounts).sort((a, b) => new Date(b) - new Date(a));

    // "All" button with total count
    let buttonsHTML = `<button class="date-filter-btn ${activeDateFilter === 'all' ? 'active' : ''}" data-action="filter-by-date" data-month="${month}" data-day="all">全部 <span class="filter-count">${papers.length}</span></button>`;

    // Buttons for each day
    sortedDates.forEach(fullDate => {
        const dayOfMonth = parseInt(fullDate.split('-')[2], 10); // Display '15' instead of '15日'
        const count = dateCounts[fullDate];
        const isActive = activeDateFilter === fullDate;

        buttonsHTML += `
                <button class="date-filter-btn ${isActive ? 'active' : ''}" data-action="filter-by-date" data-month="${month}" data-full-date="${fullDate}">
                    ${dayOfMonth}日 <span class="filter-count">${count}</span>
                </button>
            `;
    });
    container.innerHTML = buttonsHTML;
}

function renderInChunks(papers, container, index = 0) {
    console.log(`=== RENDER IN CHUNKS START ===
        - Papers to render: ${papers.length}
        - Starting from index: ${index}
        - Container ID: ${container.id}
        - Chunk size: ${3}
    `);

    const CHUNK_SIZE = 3; // 进一步减小批次大小
    if (index >= papers.length) {
        console.log(`=== RENDERING COMPLETED ===
            - Total papers rendered: ${papers.length}
            - Container now contains: ${container.children.length} elements
            - Last 3 paper IDs: ${Array.from(container.querySelectorAll('.paper-card')).slice(-3).map(card => card.id)}
        `);
        
        // 确保所有论文都已添加到state.allPapers
        const missingPapers = papers.filter(p => !state.allPapers.has(p.id));
        if (missingPapers.length > 0) {
            console.warn(`Found ${missingPapers.length} papers not in state.allPapers:`, 
                missingPapers.map(p => p.id)
            );
            missingPapers.forEach(p => state.allPapers.set(p.id, p));
        }

        // 渲染完成后启用懒加载 - 添加延迟和重试机制
        console.log('Enabling lazy loading...');
        setTimeout(() => {
            try {
                enableLazyLoading();
                console.log('✅ Lazy loading enabled successfully');
                
                // 额外的修复：检查是否有论文在视口内但没有加载
                setTimeout(() => {
                    checkAndFixVisibleLazyElements();
                }, 1000);
            } catch (error) {
                console.error('❌ Failed to enable lazy loading:', error);
                // 如果懒加载失败，尝试直接加载所有可见的论文
                setTimeout(() => forceLoadVisiblePapers(), 500);
            }
        }, 100); // 给DOM一点时间来稳定
        return;
    }

    const fragment = document.createDocumentFragment();
    const endIndex = Math.min(index + CHUNK_SIZE, papers.length);

    console.log(`Processing chunk: ${index} to ${endIndex}`);
    for (let i = index; i < endIndex; i++) {
        if (papers[i] && papers[i].id) {
            try {
                // 🔥 增强数据验证和调试
                const paper = papers[i];
                console.log(`📋 处理论文 ${i}: ${paper.id}, 标题: ${paper.title?.substring(0, 30)}...`);
                
                // 确保论文数据在allPapers中
                if (!state.allPapers.has(paper.id)) {
                    console.log(`💾 添加论文 ${paper.id} 到 state.allPapers`);
                    state.allPapers.set(paper.id, paper);
                } else {
                    console.log(`✅ 论文 ${paper.id} 已在 state.allPapers 中`);
                }
                
                // 验证数据完整性
                const storedPaper = state.allPapers.get(paper.id);
                if (!storedPaper.title || !storedPaper.abstract) {
                    console.warn(`⚠️ 论文 ${paper.id} 数据可能不完整:`, {
                        hasTitle: !!storedPaper.title,
                        hasAbstract: !!storedPaper.abstract,
                        hasTranslation: !!storedPaper.translation
                    });
                }
                
                // 🔥 关键修改：进一步降低懒加载阈值或完全禁用懒加载进行测试
                // const shouldBeLazy = i >= 10; // 旧的设置
                const shouldBeLazy = false; // 🚀 临时完全禁用懒加载，让所有论文都正常加载
                const card = createPaperCard(paper, shouldBeLazy);
                fragment.appendChild(card);
                console.log(`✅ 创建卡片完成: ${paper.id} (index: ${i}, ${shouldBeLazy ? 'lazy' : 'full'})`);
            } catch (e) {
                console.error(`❌ 创建卡片失败: paper #${papers[i].id} at index ${i}:`, papers[i], e);
            }
        } else {
            console.warn(`⚠️ 跳过无效论文数据 at index ${i}:`, papers[i]);
        }
    }

    container.appendChild(fragment);
    console.log(`Appended ${endIndex - index} cards to container`);

    // 显示渲染进度
    if (index % 30 === 0) { // 每30个论文显示一次进度
        const progress = Math.round((endIndex / papers.length) * 100);
        console.log(`Rendering progress: ${endIndex}/${papers.length} (${progress}%)`);

        // 更新进度条
        if (papers.length > 100) {
            updateProgress(`渲染论文: ${endIndex}/${papers.length}`, 95 + (progress * 0.05));
        }
    }

    // 使用requestIdleCallback来优化性能
    if (window.requestIdleCallback) {
        requestIdleCallback(() => renderInChunks(papers, container, endIndex), { timeout: 100 });
    } else {
        // 降级到setTimeout，增加延迟以避免阻塞
        setTimeout(() => renderInChunks(papers, container, endIndex), 15);
    }
}

function enableLazyLoading() {
    // 防止重复初始化
    if (window.lazyObserver) {
        console.log(`⚠️ 懒加载观察器已存在，先断开旧的观察器`);
        window.lazyObserver.disconnect();
        window.lazyObserver = null;
    }
    
    const lazyElements = document.querySelectorAll('.lazy-load');
    console.log(`🚀 设置懒加载：发现 ${lazyElements.length} 个元素`);
    
    if (lazyElements.length === 0) {
        console.warn(`⚠️ 没有找到懒加载元素`);
        return;
    }

    // IntersectionObserver 配置
    const observerOptions = {
        rootMargin: '200px 0px', // 元素进入视口前200px开始加载
        threshold: 0.01 // 1%可见时触发
    };

    // 创建懒加载观察器
    const lazyObserver = new IntersectionObserver(
        async (entries, observer) => {
            console.log(`👀 懒加载观察器触发：${entries.length} 个条目`);
            
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const paperId = element.dataset.paperId;
                    
                    console.log(`📄 检测到论文进入视口: ${paperId}`);
                    
                    // 立即停止观察该元素，防止重复触发
                    observer.unobserve(element);
                    console.log(`👁️ 停止观察论文: ${paperId}`);

                    if (paperId) {
                        try {
                            console.log(`🔄 开始懒加载论文: ${paperId}`);
                            await loadPaperDetails(paperId);
                            console.log(`✅ 懒加载完成: ${paperId}`);
                        } catch (error) {
                            console.error(`💥 懒加载失败: ${paperId}`, error);
                            
                            // 如果加载失败，显示错误状态但不重新观察
                            element.innerHTML = `
                                <div class="text-center py-4 text-red-500">
                                    <p class="text-sm">加载失败: ${error.message}</p>
                                    <button class="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" 
                                            onclick="forceLoadPaper('${paperId}')" 
                                            title="重试加载">
                                        🔄 重试
                                    </button>
                                </div>
                            `;
                        }
                    } else {
                        console.error(`❌ 懒加载元素缺少 paperId 属性:`, element);
                    }
                }
            }
        },
        observerOptions
    );

    // 开始观察每个懒加载元素
    let observedCount = 0;
    lazyElements.forEach(el => {
        const paperId = el.dataset.paperId;
        if (paperId) {
            lazyObserver.observe(el);
            observedCount++;
            console.log(`👁️ 开始观察论文: ${paperId}`);
        } else {
            console.warn(`⚠️ 懒加载元素缺少 paperId 属性:`, el);
        }
    });
    
    console.log(`✅ 懒加载设置完成：观察 ${observedCount} 个元素`);
    
    // 保存观察器引用以便调试和清理
    window.lazyObserver = lazyObserver;
    
    // 返回观察器实例
    return lazyObserver;
}

async function loadPaperDetails(paperId) {
    const loadStartTime = Date.now();
    console.log(`🚀 开始加载论文详情: ${paperId}`);

    const placeholder = document.getElementById(`lazy-${paperId}`);
    if (!placeholder) {
        const existingCard = document.getElementById(`card-${paperId}`);
        if (existingCard && !existingCard.querySelector('.lazy-load')) {
            console.log(`📄 论文 ${paperId} 已完全加载，跳过`);
            return;
        }
        console.warn(`⚠️ 找不到论文 ${paperId} 的占位符元素`);
        return;
    }

    const card = placeholder.closest('.paper-card');
    if (!card) {
        console.error(`❌ 找不到论文 ${paperId} 的卡片容器`);
        return;
    }

    // 防止重复加载
    if (card.dataset.loading === 'true') {
        console.log(`⏳ 论文 ${paperId} 正在加载中，跳过重复请求`);
        return;
    }

    // 设置加载状态
    card.dataset.loading = 'true';
    console.log(`🔄 设置论文 ${paperId} 加载状态`);

    try {
        // 1. 首先尝试从内存中获取论文数据
        let paper = state.allPapers.get(paperId);
        console.log(`📚 从内存获取论文数据:`, paper ? '成功' : '失败');

        // 2. 如果论文数据不存在，强制重新获取月份数据
        if (!paper) {
            console.warn(`⚠️ 论文 ${paperId} 数据不存在，开始强制获取月份数据...`);
            
            // 更新加载提示
            const loadingTextSpan = placeholder.querySelector('.loading-text span');
            if (loadingTextSpan) {
                loadingTextSpan.textContent = '正在重新获取数据...';
            }
            
            // 解析论文所属月份
            const paperMonth = `20${paperId.substring(0, 2)}-${paperId.substring(2, 4)}`;
            console.log(`📅 解析论文月份: ${paperMonth}`);
            
            try {
                console.log(`🔄 开始获取 ${paperMonth} 月份数据...`);
                await fetchMonth(paperMonth, true); // 强制重新获取
                console.log(`✅ 月份数据获取完成`);
                
                // 重新尝试获取论文数据
                paper = state.allPapers.get(paperId);
                console.log(`📚 重新获取论文数据:`, paper ? '成功' : '失败');
                
                if (!paper) {
                    console.error(`❌ 即使重新获取月份数据后，仍找不到论文 ${paperId}`);
                    throw new Error(`无法找到论文数据 (${paperId})`);
                }
            } catch (fetchError) {
                console.error(`❌ 获取月份数据失败:`, fetchError);
                throw new Error(`数据加载失败: ${fetchError.message}`);
            }
        }

        // 3. 验证论文数据完整性
        if (!paper.abstract && !paper.translation) {
            console.warn(`⚠️ 论文 ${paperId} 数据不完整，缺少摘要信息`);
        }

        console.log(`📝 开始渲染论文 ${paperId}:
            - 标题: ${paper.title}
            - 日期: ${paper.date}
            - 分类: ${paper.categories?.join(', ')}
            - 有摘要: ${!!paper.abstract}
            - 有翻译: ${!!paper.translation}
        `);

        // 4. 渲染论文详细内容
        card.innerHTML = createDetailedPaperContent(paper);
        console.log(`✅ 论文内容渲染完成`);

        // 5. 初始化交互功能
        requestAnimationFrame(() => {
            try {
                updatePaperRatingDisplay(paperId);
                updatePaperTagsDisplay(paperId);
                console.log(`🎮 交互功能初始化完成`);
            } catch (interactionError) {
                console.warn(`⚠️ 交互功能初始化失败:`, interactionError);
            }
        });

        // 6. 记录性能
        const loadTime = Date.now() - loadStartTime;
        console.log(`🎉 论文 ${paperId} 加载成功 (${loadTime}ms)`);

    } catch (error) {
        // 错误处理
        console.error(`💥 论文 ${paperId} 加载失败:`, error);
        
        // 显示友好的错误界面
        card.innerHTML = `
            <div class="p-6 text-center">
                <div class="text-red-500 mb-4">
                    <svg class="mx-auto h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <p class="font-semibold">论文加载失败</p>
                    <p class="text-sm mt-1 text-gray-600">${error.message}</p>
                </div>
                <div class="space-x-2">
                    <button class="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition" 
                            onclick="loadPaperDetails('${paperId}')" 
                            title="重新加载论文">
                        🔄 重试加载
                    </button>
                    <button class="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition" 
                            onclick="location.reload()" 
                            title="刷新整个页面">
                        🔄 刷新页面
                    </button>
                </div>
            </div>
        `;
        
        // 显示错误提示
        if (typeof showToast === 'function') {
            showToast(`论文 ${paperId} 加载失败: ${error.message}`, 'error');
        }

    } finally {
        // 清理加载状态
        card.dataset.loading = 'false';
        console.log(`🏁 论文 ${paperId} 加载状态清理完成`);
    }
}

// 暴露到全局，以便HTML中的onclick可以访问
window.loadPaperDetails = loadPaperDetails;

// 全局调试函数
window.debugPaper = function(paperId) {
    console.log(`🔍 调试论文 ${paperId}:`);
    console.log(`- 在 allPapers 中: ${state.allPapers.has(paperId)}`);
    if (state.allPapers.has(paperId)) {
        const paper = state.allPapers.get(paperId);
        console.log(`- 论文数据:`, paper);
        console.log(`- 有标题: ${!!paper.title}`);
        console.log(`- 有摘要: ${!!paper.abstract}`);
        console.log(`- 有翻译: ${!!paper.translation}`);
    }
    console.log(`- 占位符存在: ${!!document.getElementById('lazy-' + paperId)}`);
    console.log(`- 卡片存在: ${!!document.getElementById('card-' + paperId)}`);
    
    const paperMonth = `20${paperId.substring(0, 2)}-${paperId.substring(2, 4)}`;
    console.log(`- 推断月份: ${paperMonth}`);
    console.log(`- 月份已加载: ${state.loadedMonths.has(paperMonth)}`);
    console.log(`- 全部已加载月份:`, Array.from(state.loadedMonths));
    console.log(`- allPapers 总数: ${state.allPapers.size}`);
};

// 全局强制加载函数
window.forceLoadPaper = function(paperId) {
    console.log(`🚀 强制加载论文 ${paperId}`);
    const card = document.getElementById('card-' + paperId);
    if (card) {
        card.dataset.loading = 'false'; // 重置加载状态
    }
    loadPaperDetails(paperId);
};

// 全局状态检查函数
window.checkAppState = function() {
    console.log(`📊 应用状态检查:`);
    console.log(`- 总论文数: ${state.allPapers.size}`);
    console.log(`- 已加载月份: ${Array.from(state.loadedMonths).join(', ')}`);
    console.log(`- 是否正在获取: ${state.isFetching}`);
    console.log(`- 是否搜索模式: ${state.isSearchMode}`);
    
    // 检查懒加载元素
    const lazyElements = document.querySelectorAll('.lazy-load');
    console.log(`- 懒加载元素数量: ${lazyElements.length}`);
    
    if (lazyElements.length > 0) {
        console.log(`- 前5个懒加载元素的论文ID:`);
        Array.from(lazyElements).slice(0, 5).forEach((el, index) => {
            console.log(`  ${index + 1}. ${el.dataset.paperId}`);
        });
    }
    
    // 检查卡片的加载状态
    const cards = document.querySelectorAll('.paper-card');
    let loadingCards = 0;
    cards.forEach(card => {
        if (card.dataset.loading === 'true') {
            loadingCards++;
        }
    });
    console.log(`- 正在加载的卡片数量: ${loadingCards}`);
    
    return {
        totalPapers: state.allPapers.size,
        loadedMonths: Array.from(state.loadedMonths),
        isFetching: state.isFetching,
        lazyElements: lazyElements.length,
        loadingCards: loadingCards
    };
};

// 修复卡住的加载状态
window.fixStuckLoading = function() {
    console.log(`🔧 修复卡住的加载状态...`);
    
    // 重置所有卡片的加载状态
    const cards = document.querySelectorAll('.paper-card[data-loading="true"]');
    cards.forEach(card => {
        card.dataset.loading = 'false';
        console.log(`🔄 重置卡片加载状态: ${card.id}`);
    });
    
    // 重置全局加载状态
    state.isFetching = false;
    
    // 重新启用懒加载
    setTimeout(() => {
        enableLazyLoading();
        console.log(`✅ 重新启用懒加载`);
    }, 500);
    
    console.log(`✅ 修复完成，重置了 ${cards.length} 个卡片`);
};

// 批量调试多个论文
window.debugMultiplePapers = function(paperIds) {
    paperIds.forEach(id => {
        console.log(`\n--- 调试论文 ${id} ---`);
        debugPaper(id);
    });
};

// 诊断具体的加载卡住问题
window.diagnoseLoadingIssue = function(paperId) {
    console.log(`🔍 深度诊断论文 ${paperId} 的加载问题:`);
    
    // 1. 检查DOM元素
    const placeholder = document.getElementById(`lazy-${paperId}`);
    const card = document.getElementById(`card-${paperId}`);
    
    console.log(`📄 DOM元素检查:`);
    console.log(`- 占位符存在: ${!!placeholder}`);
    console.log(`- 卡片存在: ${!!card}`);
    
    if (placeholder) {
        console.log(`- 占位符类名: ${placeholder.className}`);
        console.log(`- 占位符数据属性:`, placeholder.dataset);
        console.log(`- 占位符父级:`, placeholder.parentElement);
    }
    
    if (card) {
        console.log(`- 卡片加载状态: ${card.dataset.loading}`);
        console.log(`- 卡片ID: ${card.id}`);
    }
    
    // 2. 检查数据
    const paper = state.allPapers.get(paperId);
    console.log(`📚 数据检查:`);
    console.log(`- 论文数据存在: ${!!paper}`);
    if (paper) {
        console.log(`- 标题: ${paper.title}`);
        console.log(`- 日期: ${paper.date}`);
        console.log(`- 有摘要: ${!!paper.abstract}`);
        console.log(`- 有翻译: ${!!paper.translation}`);
    }
    
    // 3. 检查月份加载状态
    const paperMonth = `20${paperId.substring(0, 2)}-${paperId.substring(2, 4)}`;
    console.log(`📅 月份检查:`);
    console.log(`- 推断月份: ${paperMonth}`);
    console.log(`- 月份已加载: ${state.loadedMonths.has(paperMonth)}`);
    
    // 4. 检查懒加载观察器
    console.log(`👁️ 懒加载检查:`);
    if (window.lazyObserver && placeholder) {
        console.log(`- 懒加载观察器存在: ${!!window.lazyObserver}`);
        // 检查元素是否仍在被观察
        try {
            const rect = placeholder.getBoundingClientRect();
            console.log(`- 元素位置:`, rect);
            console.log(`- 元素在视口内: ${rect.top < window.innerHeight && rect.bottom > 0}`);
        } catch (e) {
            console.warn(`- 无法获取元素位置:`, e);
        }
    }
    
    // 5. 尝试手动触发加载
    console.log(`🔄 尝试手动加载...`);
    if (card) {
        card.dataset.loading = 'false'; // 重置状态
    }
    
    return {
        placeholder: !!placeholder,
        card: !!card,
        paperData: !!paper,
        monthLoaded: state.loadedMonths.has(paperMonth),
        cardLoading: card?.dataset?.loading
    };
};

// 修复特定论文的加载问题
window.fixSpecificPaper = function(paperId) {
    console.log(`🔧 修复论文 ${paperId} 的加载问题`);
    
    const result = diagnoseLoadingIssue(paperId);
    
    // 如果卡片处于加载状态，重置它
    const card = document.getElementById(`card-${paperId}`);
    if (card && card.dataset.loading === 'true') {
        console.log(`🔄 重置卡片加载状态`);
        card.dataset.loading = 'false';
    }
    
    // 如果占位符存在但没有被观察，重新设置懒加载
    const placeholder = document.getElementById(`lazy-${paperId}`);
    if (placeholder && window.lazyObserver) {
        console.log(`👁️ 重新开始观察占位符`);
        window.lazyObserver.observe(placeholder);
    }
    
    // 强制触发加载
    setTimeout(() => {
        console.log(`🚀 强制触发加载`);
        loadPaperDetails(paperId);
    }, 100);
    
    return result;
};

// 批量修复卡住的论文
window.fixAllStuckPapers = function() {
    console.log(`🔧 批量修复所有卡住的论文...`);
    
    const lazyElements = document.querySelectorAll('.lazy-load');
    const stuckPapers = [];
    
    lazyElements.forEach(el => {
        const paperId = el.dataset.paperId;
        if (paperId) {
            const card = el.closest('.paper-card');
            if (card && card.dataset.loading === 'true') {
                stuckPapers.push(paperId);
            }
        }
    });
    
    console.log(`🔍 发现 ${stuckPapers.length} 个卡住的论文:`, stuckPapers);
    
    if (stuckPapers.length > 0) {
        stuckPapers.forEach(paperId => {
            fixSpecificPaper(paperId);
        });
    }
    
    return stuckPapers;
};

// 创建开发者调试面板
window.createDebugPanel = function() {
    if (document.getElementById('debug-panel')) {
        document.getElementById('debug-panel').remove();
    }
    
    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 300px;
        background: #1a1a1a;
        color: #fff;
        padding: 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    panel.innerHTML = `
        <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
            <h3 style="margin: 0; color: #60a5fa;">🔧 调试面板</h3>
            <button onclick="document.getElementById('debug-panel').remove()" 
                    style="background: #ef4444; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer;">✕</button>
        </div>
        
        <div style="margin-bottom: 10px;">
            <button onclick="checkAppState()" 
                    style="background: #3b82f6; color: white; border: none; padding: 5px 8px; border-radius: 3px; margin-right: 5px; cursor: pointer;">检查状态</button>
            <button onclick="autoFixStuckPapers()" 
                    style="background: #10b981; color: white; border: none; padding: 5px 8px; border-radius: 3px; margin-right: 5px; cursor: pointer;">🤖 自动修复</button>
        </div>
        
        <div style="margin-bottom: 10px;">
            <button onclick="fixAllStuckPapers()" 
                    style="background: #ef4444; color: white; border: none; padding: 5px 8px; border-radius: 3px; margin-right: 5px; cursor: pointer;">修复卡住</button>
            <button onclick="forceLoadVisiblePapers()" 
                    style="background: #f59e0b; color: white; border: none; padding: 5px 8px; border-radius: 3px; cursor: pointer;">强制加载</button>
        </div>
        
        <div style="margin-bottom: 10px;">
            <input type="text" id="debug-paper-id" placeholder="输入论文ID (如: 2507.11950)" 
                   style="width: 100%; padding: 5px; margin-bottom: 5px; border: 1px solid #666; border-radius: 3px; background: #333; color: #fff;">
            <button onclick="debugPaper(document.getElementById('debug-paper-id').value)" 
                    style="background: #10b981; color: white; border: none; padding: 5px 8px; border-radius: 3px; margin-right: 5px; cursor: pointer;">调试</button>
            <button onclick="fixSpecificPaper(document.getElementById('debug-paper-id').value)" 
                    style="background: #f59e0b; color: white; border: none; padding: 5px 8px; border-radius: 3px; cursor: pointer;">修复</button>
        </div>
        
        <div style="margin-bottom: 10px;">
            <button onclick="enableLazyLoading()" 
                    style="background: #8b5cf6; color: white; border: none; padding: 5px 8px; border-radius: 3px; margin-right: 5px; cursor: pointer;">重置懒加载</button>
            <button onclick="fixStuckLoading()" 
                    style="background: #f97316; color: white; border: none; padding: 5px 8px; border-radius: 3px; cursor: pointer;">重置状态</button>
        </div>
        
        <div style="margin-bottom: 10px;">
            <button onclick="findStuckLoadingElements()" 
                    style="background: #dc2626; color: white; border: none; padding: 5px 8px; border-radius: 3px; margin-right: 5px; cursor: pointer;">🔍 找卡住元素</button>
            <button onclick="startLoadingElementMonitor()" 
                    style="background: #059669; color: white; border: none; padding: 5px 8px; border-radius: 3px; cursor: pointer;">👁️ 启动监听</button>
        </div>
        
        <div style="font-size: 10px; color: #9ca3af;">
            快捷键：F12打开控制台查看详细日志
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // 自动填入问题论文ID
    const input = document.getElementById('debug-paper-id');
    input.value = '2507.11950'; // 默认填入用户提到的第一个问题论文
    
    console.log(`🎛️ 调试面板已创建，右上角可见`);
};

// 检查并修复可见的懒加载元素
window.checkAndFixVisibleLazyElements = function() {
    console.log(`🔍 检查可见的懒加载元素...`);
    
    const lazyElements = document.querySelectorAll('.lazy-load');
    const visibleLazyElements = [];
    
    lazyElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        
        if (isVisible) {
            visibleLazyElements.push(el);
            const paperId = el.dataset.paperId;
            console.log(`📄 发现可见的懒加载元素: ${paperId}`);
        }
    });
    
    console.log(`🎯 发现 ${visibleLazyElements.length} 个可见的懒加载元素`);
    
    if (visibleLazyElements.length > 0) {
        console.log(`🔄 开始修复可见的懒加载元素...`);
        visibleLazyElements.forEach(el => {
            const paperId = el.dataset.paperId;
            if (paperId) {
                console.log(`🚀 强制加载可见论文: ${paperId}`);
                setTimeout(() => loadPaperDetails(paperId), Math.random() * 100);
            }
        });
    }
    
    return visibleLazyElements.length;
};

// 强制加载所有可见的论文（备用方案）
window.forceLoadVisiblePapers = function() {
    console.log(`💪 强制加载所有可见论文（备用方案）...`);
    
    const cards = document.querySelectorAll('.paper-card');
    let loadedCount = 0;
    
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        
        if (isVisible) {
            const lazyElement = card.querySelector('.lazy-load');
            if (lazyElement) {
                const paperId = lazyElement.dataset.paperId;
                if (paperId) {
                    console.log(`💪 强制加载: ${paperId}`);
                    loadPaperDetails(paperId);
                    loadedCount++;
                }
            }
        }
    });
    
    console.log(`✅ 强制加载了 ${loadedCount} 个可见论文`);
    return loadedCount;
};

// 简单的问题检测和自动修复
window.autoFixStuckPapers = function() {
    console.log(`🤖 启动自动修复系统...`);
    
    // 1. 检查应用状态
    const appState = checkAppState();
    console.log(`📊 应用状态:`, appState);
    
    // 2. 如果有卡住的卡片，修复它们
    if (appState.loadingCards > 0) {
        console.log(`🔧 发现 ${appState.loadingCards} 个卡住的卡片，开始修复...`);
        fixAllStuckPapers();
    }
    
    // 3. 如果有懒加载元素但没有观察器，重新设置
    if (appState.lazyElements > 0 && !window.lazyObserver) {
        console.log(`👁️ 重新设置懒加载观察器...`);
        enableLazyLoading();
    }
    
    // 4. 检查可见的懒加载元素
    setTimeout(() => {
        const visibleLazyCount = checkAndFixVisibleLazyElements();
        if (visibleLazyCount > 0) {
            console.log(`✅ 自动修复完成，处理了 ${visibleLazyCount} 个可见的懒加载元素`);
        }
    }, 1000);
    
    console.log(`🎉 自动修复系统运行完成`);
};

// 全局检查页面上的"正在加载"元素
window.findStuckLoadingElements = function() {
    console.log(`🔍 搜索页面上所有的"正在加载"元素...`);
    
    const loadingText = '正在为您准备论文详情';
    const allElements = document.querySelectorAll('*');
    const stuckElements = [];
    
    allElements.forEach(el => {
        if (el.textContent && el.textContent.includes(loadingText)) {
            stuckElements.push({
                element: el,
                paperId: el.dataset?.paperId || el.closest('[data-paper-id]')?.dataset?.paperId,
                cardId: el.closest('.paper-card')?.id,
                className: el.className,
                parentInfo: {
                    id: el.parentElement?.id,
                    className: el.parentElement?.className
                }
            });
        }
    });
    
    console.log(`🎯 发现 ${stuckElements.length} 个包含加载文本的元素:`);
    stuckElements.forEach((item, index) => {
        console.log(`${index + 1}. 论文ID: ${item.paperId}, 卡片ID: ${item.cardId}`);
        console.log(`   元素类名: ${item.className}`);
        console.log(`   父级信息:`, item.parentInfo);
    });
    
    // 尝试修复这些元素
    if (stuckElements.length > 0) {
        console.log(`🔧 开始修复这些卡住的元素...`);
        stuckElements.forEach(item => {
            if (item.paperId) {
                console.log(`🚀 修复论文: ${item.paperId}`);
                fixSpecificPaper(item.paperId);
            }
        });
    }
    
    return stuckElements;
};

// 监听DOM变化，自动检测新出现的加载元素
window.startLoadingElementMonitor = function() {
    if (window.loadingMonitor) {
        window.loadingMonitor.disconnect();
    }
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const text = node.textContent;
                        if (text && text.includes('正在为您准备论文详情')) {
                            console.log(`🚨 检测到新的加载元素:`, node);
                            
                            // 尝试获取论文ID并修复
                            const paperId = node.dataset?.paperId || 
                                          node.closest('[data-paper-id]')?.dataset?.paperId ||
                                          node.closest('.paper-card')?.id?.replace('card-', '');
                            
                            if (paperId) {
                                console.log(`🔧 自动修复新检测到的加载元素: ${paperId}`);
                                setTimeout(() => fixSpecificPaper(paperId), 100);
                            }
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    window.loadingMonitor = observer;
    console.log(`👁️ 已启动加载元素监听器`);
};

// 全局状态检查函数
window.checkAppState = function() {
    console.log(`📊 应用状态检查:`);
    console.log(`- 已加载月份: ${Array.from(state.loadedMonths).join(', ')}`);
    console.log(`- 论文总数: ${state.allPapers.size}`);
    console.log(`- 当前是否在获取数据: ${state.isFetching}`);
    console.log(`- 是否在搜索模式: ${state.isSearchMode}`);
    console.log(`- 懒加载元素数量: ${document.querySelectorAll('.lazy-load').length}`);
    console.log(`- 论文卡片数量: ${document.querySelectorAll('.paper-card').length}`);
    
    // 检查最近的几个懒加载元素
    const lazyElements = document.querySelectorAll('.lazy-load');
    console.log(`📝 前5个懒加载元素:`);
    Array.from(lazyElements).slice(0, 5).forEach((el, index) => {
        const paperId = el.dataset.paperId;
        console.log(`  ${index + 1}. ${paperId} - 在数据中: ${state.allPapers.has(paperId)}`);
    });
};

// 全局清理函数
window.fixStuckLoading = function() {
    console.log(`🔧 修复卡住的加载状态...`);
    const stuckElements = document.querySelectorAll('[data-loading="true"]');
    console.log(`发现 ${stuckElements.length} 个卡住的元素`);
    
    stuckElements.forEach(el => {
        el.dataset.loading = 'false';
        console.log(`重置元素加载状态: ${el.id}`);
    });
    
    // 重新启用懒加载
    enableLazyLoading();
    console.log(`✅ 修复完成`);
};

function createPaperCard(paper, isLazy = false) {
    // 🔥 新增：详细的调试信息
    console.log(`📋 创建论文卡片: ${paper.id}, isLazy: ${isLazy}, 标题: ${paper.title?.substring(0, 50)}...`);
    
    const card = document.createElement('article');
    card.id = `card-${paper.id}`;
    card.style.viewTransitionName = `card-${paper.id}`;
    card.className = 'paper-card bg-white p-6 rounded-lg shadow-md border border-gray-200';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', `论文: ${paper.title || '无标题'}`);

    if (isLazy) {
        // 懒加载模式：只渲染基本信息
        console.log(`🔄 使用懒加载模式创建 ${paper.id}`);
        card.innerHTML = createLazyPaperContent(paper);
    } else {
        // 正常模式：渲染完整内容
        console.log(`✅ 使用完整模式创建 ${paper.id}`);
        card.innerHTML = createDetailedPaperContent(paper);
        // 初始化用户功能显示
        setTimeout(() => {
            updatePaperRatingDisplay(paper.id);
            updatePaperTagsDisplay(paper.id);
        }, 0);
    }

    return card;
}

function createLazyPaperContent(paper) {
    const isFavorited = state.favorites.has(paper.id);
    const categoriesHTML = (paper.categories && paper.categories.length > 0) ?
        paper.categories.slice(0, 2).map(cat => `<span class="keyword-tag inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">${cat}</span>`).join('') : '';

    let updatedInfoHTML = '';
    if (paper.updated) {
        updatedInfoHTML = ` | <span class="text-green-600 text-xs font-semibold">Updated: ${paper.updated.split('T')[0]}</span>`;
    }

    return `
            <div class="flex justify-between items-start">
                <p class="text-sm text-gray-500 mb-2 flex-grow">Published: ${paper.date ? paper.date.split('T')[0] : '未知日期'} ${categoriesHTML ? '| ' : ''}${categoriesHTML}${updatedInfoHTML}</p>
                <button data-action="toggle-favorite" data-paper-id="${paper.id}" title="收藏/取消收藏" class="favorite-btn ${isFavorited ? 'favorited' : ''}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                </button>
            </div>
            <h2 class="text-lg font-bold mb-2 paper-title">${paper.title || '无标题'}</h2>
            <p class="text-sm text-gray-600 mb-2">${paper.authors ? paper.authors.slice(0, 100) + (paper.authors.length > 100 ? '...' : '') : '未知作者'}</p>
            <div id="lazy-${paper.id}" class="lazy-load paper-content-placeholder" data-paper-id="${paper.id}">
                <div class="paper-loading-indicator">
                    <div class="loading-shimmer">
                        <div class="shimmer-line w-3/4 mb-3"></div>
                        <div class="shimmer-line w-1/2 mb-3"></div>
                        <div class="shimmer-line w-full mb-3"></div>
                        <div class="shimmer-line w-2/3"></div>
                    </div>
                    <div class="loading-text">
                        <div class="inline-block w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mr-2"></div>
                        <span class="text-sm text-gray-500">正在为您准备论文详情...</span>
                    </div>
                </div>
            </div>
            <style>
                .paper-content-placeholder {
                    min-height: 150px;
                    position: relative;
                }
                .paper-loading-indicator {
                    padding: 1rem;
                }
                .loading-shimmer {
                    margin-bottom: 1rem;
                }
                .shimmer-line {
                    height: 12px;
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: shimmer 2s infinite linear;
                    border-radius: 4px;
                }
                .loading-text {
                    text-align: center;
                    padding-top: 1rem;
                    border-top: 1px solid #eee;
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            </style>
        `;
}

function createDetailedPaperContent(paper) {
    // 🔥 新增：数据完整性检查和调试信息
    console.log(`🔍 创建详细内容 for ${paper.id}:`, {
        hasTitle: !!paper.title,
        hasAbstract: !!paper.abstract,
        hasTranslation: !!paper.translation,
        hasCategories: !!(paper.categories && paper.categories.length > 0),
        hasKeywords: !!(paper.keywords && paper.keywords.length > 0),
        paperKeys: Object.keys(paper)
    });
    
    // 如果关键数据缺失，先返回一个占位符
    if (!paper.title && !paper.abstract && !paper.translation) {
        console.warn(`⚠️ 论文 ${paper.id} 数据不完整，返回占位符`);
        return `
            <div class="text-center py-8">
                <div class="text-yellow-600 mb-4">
                    <svg class="mx-auto h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <p class="font-semibold">论文数据不完整</p>
                    <p class="text-sm mt-1">论文ID: ${paper.id}</p>
                </div>
                <button class="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" 
                        onclick="forceLoadPaper('${paper.id}')" 
                        title="重新加载完整数据">
                    🔄 重新加载
                </button>
            </div>
        `;
    }
    
    let title = paper.title || '无标题';
    if (state.isSearchMode && state.currentQuery && !state.categoryIndex[state.currentQuery] && state.currentQuery !== 'favorites') {
        const queryTerms = state.currentQuery.toLowerCase().split(/\s+/).filter(Boolean);
        const regex = new RegExp(queryTerms.map(escapeRegex).join('|'), 'gi');
        title = title.replace(regex, match => `<span class="highlight">${match}</span>`);
    }

    const keywordsHTML = (paper.keywords && paper.keywords.length > 0) ? paper.keywords.map(kw => `<span class="keyword-tag inline-block bg-blue-100 text-blue-800 text-sm font-medium mr-2 mb-2 px-3 py-1 rounded-full" data-action="search-tag" data-tag-value="${escapeCQ(kw)}">${kw}</span>`).join('') : '无';
    const categoriesHTML = (paper.categories && paper.categories.length > 0) ? paper.categories.map(cat => `<span class="keyword-tag inline-block bg-gray-100 text-gray-600 text-sm font-medium mr-2 mb-2 px-3 py-1 rounded-full" data-action="search-tag" data-tag-value="${escapeCQ(cat)}">${cat}</span>`).join('') : '';
    const absUrl = paper.id ? `https://arxiv.org/abs/${paper.id}` : '#';
    const pdfUrl = paper.id ? `https://arxiv.org/pdf/${paper.id}` : '#';
    const isFavorited = state.favorites.has(paper.id);

    const createInfoBox = (title, content, color, forceItalic = false) => {
        if (!content) return '';
        const isTldr = title === 'TL;DR';
        const isAiComment = title === 'AI点评';

        const titleClass = isTldr ? 'italic' : '';
        let contentClasses = [''];
        if (isTldr || isAiComment || forceItalic) {
            contentClasses.push('italic', 'text-sm');
        }
        return `<div class="info-box info-box-${color}"><p class="info-box-title ${titleClass}">${title}:</p><p class="${contentClasses.join(' ')}">${content}</p></div>`;
    };

    let updatedInfoHTML = '';
    if (paper.updated) {
        updatedInfoHTML = ` | <span class="text-green-600 font-semibold">Updated: ${paper.updated.split('T')[0]}</span>`;
    }

    let firstPublishedInfoHTML = '';
    if (paper.first_published && paper.first_published == paper.updated) {
        firstPublishedInfoHTML = `<span class="text-gray-500"> | First Published</span> `;
    } else if (paper.first_published) {
        firstPublishedInfoHTML = `<span class="text-gray-500"> | First Published: ${paper.first_published.split('T')[0]}</span>`;
    }

    return `
            <div class="flex justify-between items-start">
                <p class="text-sm text-gray-500 mb-2 flex-grow">Published: ${paper.date ? paper.date.split('T')[0] : '未知日期'} ${categoriesHTML ? '| ' : ''}${categoriesHTML}
                    ${firstPublishedInfoHTML}${updatedInfoHTML}</p>
                <div class="flex items-center space-x-2">
                    <button data-action="toggle-notes" data-paper-id="${paper.id}" title="添加/编辑笔记" class="text-gray-500 hover:text-blue-600 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                    </button>
                    <button data-action="share-paper" data-paper-id="${paper.id}" title="分享论文链接" class="share-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                    </button>
                    <button data-action="toggle-favorite" data-paper-id="${paper.id}" title="收藏/取消收藏" aria-label="收藏或取消收藏" class="favorite-btn ${isFavorited ? 'favorited' : ''}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    </button>
                </div>
            </div>
            <h2 class="text-xl md:text-2xl font-bold mb-2 paper-title">${title}</h2>
            <h3 class="text-base font-semibold mb-3 paper-title-zh italic">${paper.zh_title || ''}</h3>
            
            <!-- 新增：用户评分 -->
            <div id="paper-rating-${paper.id}" class="paper-rating compact-hidden"></div>
            
            <!-- 新增：用户标签 -->
            <div id="paper-tags-${paper.id}" class="paper-tags compact-hidden"></div>
            
            <div class="text-sm text-gray-600 mb-3 compact-hidden">
                <p><strong>作者:</strong> ${paper.authors || '未知作者'}</p>
                <p class="mt-2"><strong>Keyword:</strong> ${keywordsHTML}</p>
            </div>
            
            <!-- 新增：用户笔记 -->
            <div id="paper-notes-${paper.id}" class="paper-notes compact-hidden">
                <textarea class="notes-textarea" placeholder="在这里记录您的想法和笔记..." data-paper-id="${paper.id}"></textarea>
                <div class="flex justify-end mt-2">
                    <button class="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700" data-action="save-note" data-paper-id="${paper.id}">保存笔记</button>
                </div>
            </div>
            
            <div class="compact-hidden">
                ${createInfoBox('Comment', paper.comment, 'yellow')}
                ${createInfoBox('TL;DR', paper.tldr, 'green')}
                ${paper.ai_comments
            ? createInfoBox('AI点评', paper.ai_comments, 'indigo')
            : `<div class="info-box info-box-indigo"><p class="info-box-title">AI点评:</p><p class="italic text-sm text-gray-500 dark:text-gray-400">暂无AI点评</p></div>`
        }
            </div>
            <div id="ai-details-${paper.id}" class="details-section ai-details-section compact-hidden">
                 <h2 class="text-xl font-bold mb-4 ai-analysis-title">AI分析与摘要</h2>
                ${paper.motivation ? `<h3>研究动机</h3><p class="text-sm">${paper.motivation}</p><br/>` : ''}
                ${paper.method ? `<h3>研究方法</h3><p class="text-sm">${paper.method}</p><br/>` : ''}
                ${paper.results ? `<h3>研究结果</h3><p class="text-sm">${paper.results}</p><br/>` : ''}
                ${paper.conclusion ? `<h3>研究结论</h3><p class="text-sm">${paper.conclusion}</p><br/>` : ''}
                <h3>摘要翻译</h3><p class="text-sm italic">${paper.translation || '无'}</p><br/>
                <h3>原文摘要</h3><p class="text-sm italic">${paper.abstract || '无'}</p>
            </div>
            <div class="flex items-center space-x-4 mt-4 text-sm">
                <a href="${absUrl}" target="_blank" class="paper-link-abstract font-semibold">摘要页</a>
                <a href="${pdfUrl}" target="_blank" class="paper-link-pdf font-semibold">PDF</a>
                <a href="https://www.alphaxiv.org/overview/${paper.id}" target="_blank" class="paper-link-alphaxiv font-semibold">AlphaXiv</a>
                <button data-action="toggle-ai-details" data-paper-id="${paper.id}" class="ml-auto ai-toggle-btn font-bold py-2 px-4 rounded-lg transition compact-hidden">AI分析</button>
            </div>
        `;
}

function toggleAIDetails(paperId) {
    const detailsSection = document.getElementById(`ai-details-${paperId}`);
    if (detailsSection) detailsSection.classList.toggle('expanded');
}

function loadFavorites() {
    const favs = localStorage.getItem('arxiv_favorites');
    if (favs) {
        try {
            state.favorites = new Set(JSON.parse(favs));
        } catch (e) {
            state.favorites = new Set();
        }
    }
}

function saveFavorites() {
    localStorage.setItem('arxiv_favorites', JSON.stringify(Array.from(state.favorites)));
}
function toggleFavorite(event, paperId, btn) {
    event.stopPropagation();
    const update = () => {
        if (state.favorites.has(paperId)) {
            state.favorites.delete(paperId); btn.classList.remove('favorited');
            if (state.currentQuery === 'favorites') btn.closest('.paper-card').remove();
        } else {
            state.favorites.add(paperId); btn.classList.add('favorited');
        }
        saveFavorites();
        document.getElementById('favorites-count').textContent = state.favorites.size;
        updateMobileFavoritesCount(); // 更新移动端计数
    }
    if (state.currentQuery === 'favorites' && state.favorites.has(paperId)) {
        applyViewTransition(update, 'fav-remove');
    } else { update(); }
}

function loadViewMode() {
    const savedMode = localStorage.getItem('arxiv_view_mode') || 'detailed';
    state.viewMode = savedMode;
    mainContainer.className = `${savedMode}-view`;
}
function toggleViewMode(mode) {
    if (state.viewMode === mode) return;
    applyViewTransition(() => {
        state.viewMode = mode;
        localStorage.setItem('arxiv_view_mode', mode);
        mainContainer.className = `${mode}-view`;
        updateViewModeUI();
    }, 'view-toggle');
}
function updateViewModeUI() {
    document.getElementById('view-detailed-btn')?.classList.toggle('active', state.viewMode === 'detailed');
    document.getElementById('view-compact-btn')?.classList.toggle('active', state.viewMode === 'compact');
}

// --- 核心逻辑：状态切换与导航 ---
// 修复：重构月份导航逻辑，确保其行为正确 (isChildCall 用于处理嵌套调用)
async function navigateToMonth(month, isChildCall = false) {
    console.log(`=== NAVIGATE TO MONTH START ===`);
    performanceTracker.startTracking(`Navigate to ${month}`);

    console.log(`navigateToMonth called with month: ${month}, isChildCall: ${isChildCall}`);
    console.log(`isFetching: ${state.isFetching}`);

    // 只有顶层调用才检查和设置锁
    if (!isChildCall && state.isFetching) {
        console.log('Already fetching, returning early');
        return;
    }

    if (!isChildCall) {
        state.isFetching = true;
        console.log('Set isFetching to true');
        showProgress('准备导航...');
    }

    try {
        // 在开始加载前，显示骨架屏
        papersContainer.innerHTML = '';
        papersContainer.classList.add('skeleton-view');
        const numSkeletons = Math.floor(Math.random() * 3) + 3; // 3-5 个骨架屏
        for (let i = 0; i < numSkeletons; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-card skeleton-animate';
            skeleton.innerHTML = `
                <div class="skeleton h-4 w-3/4 mb-2"></div>
                <div class="skeleton h-4 w-1/2 mb-2"></div>
                <div class="skeleton h-4 w-full mb-2"></div>
            `;
            papersContainer.appendChild(skeleton);
        }

        if (state.isSearchMode) {
            console.log('Resetting search mode...');
            resetToDefaultView(false); // 仅重置UI，不重载数据以保留缓存
        }
        console.log(`Available months: ${JSON.stringify(state.manifest.availableMonths)}`);
        const targetIndex = state.manifest.availableMonths.indexOf(month);
        console.log(`Target index for ${month}: ${targetIndex}`);

        if (targetIndex === -1) {
            console.error(`无效的月份: ${month}`);
            showToast(`无效的月份: ${month}`);
            return;
        }

        // 对大数据文件显示警告
        if (month === '2025-06' || month === '2025-05') {
            showToast(`${month} 包含大量数据，加载可能需要较长时间...`);
        }

        console.log('Starting fetchWithProgress...');
        await fetchWithProgress([month]);
        console.log('fetchWithProgress complete');

        console.log('Starting UI updates...');
        updateProgress('渲染论文...', 95);
        papersContainer.innerHTML = ''; // 彻底清空容器
        console.log('Papers container cleared');

        if (state.navObserver) {
            state.navObserver.disconnect();
            console.log('navObserver disconnected');
        } else {
            console.log('navObserver is null, skipping disconnect');
        }
        state.activeDateFilters.clear();
        console.log('Date filters cleared');

        // 渲染目标月份
        console.log('Filtering papers for month...');
        const papersInMonth = Array.from(state.allPapers.values()).filter(p => p.id.startsWith(month.replace('-', '').substring(2)));
        console.log(`Found ${papersInMonth.length} papers for month ${month}`);

        console.log('Calling renderPapers...');
        papersContainer.classList.remove('skeleton-view'); // 在渲染前移除骨架屏样式
        renderPapers(papersInMonth.sort((a, b) => b.date.localeCompare(a.date)), month); // 正确传递排序后的数据
        console.log('renderPapers completed');

        // 正确设置当前月份索引，为无限滚动做准备
        state.currentMonthIndex = targetIndex;
        console.log(`Set currentMonthIndex to ${targetIndex}`);

        window.scrollTo({ top: 0, behavior: 'auto' });
        console.log('Scrolled to top');
        console.log('Navigation completed successfully');

        performanceTracker.endTracking(`Navigate to ${month}`);

    } catch (error) {
        console.error('Navigation error:', error);
        console.error('Error stack:', error.stack);
        showToast('导航失败，请重试');
    } finally {
        console.log('=== FINALLY BLOCK START ===');
        // 只有顶层调用才解除锁和隐藏进度条
        if (!isChildCall) {
            state.isFetching = false;
            console.log('Set isFetching to false');
            hideProgress();
            console.log('Hidden progress indicator');
        }
        console.log('=== NAVIGATE TO MONTH END ===');
    }
}

// 修复：确保loadNextMonth仅追加内容
async function loadNextMonth(triggeredByScroll = true) {
    if (state.isFetching || state.isSearchMode) return;
    loader.classList.remove('hidden');
    state.isFetching = true;
    try {
        const nextIndex = state.currentMonthIndex + 1;
        if (state.manifest && state.manifest.availableMonths && nextIndex < state.manifest.availableMonths.length) {
            const nextMonth = state.manifest.availableMonths[nextIndex];
            console.log(`Loading month: ${nextMonth}`);
            await fetchMonth(nextMonth);
            
            // 修改为基于ID的过滤逻辑，与navigateToMonth保持一致
            const monthIdPrefix = nextMonth.replace('-', '').substring(2);
            console.log(`Filtering papers for month ${nextMonth} using ID prefix: ${monthIdPrefix}`);
            const papersInMonth = Array.from(state.allPapers.values()).filter(p => 
                p.id && p.id.startsWith(monthIdPrefix)
            );
            
            console.log(`Found ${papersInMonth.length} papers for month ${nextMonth}`);
            // 关键修复：renderPapers现在只接收新月份的数据，并将其追加到容器中
            renderPapers(papersInMonth.sort((a, b) => b.date.localeCompare(a.date)), nextMonth);
            state.currentMonthIndex = nextIndex;
        } else {
            if (endOfListMessage && triggeredByScroll) endOfListMessage.classList.remove('hidden');
        }
    } finally {
        state.isFetching = false;
        loader.classList.add('hidden');
    }
}

async function handleSearch() {
    if (state.isFetching) return;
    state.isFetching = true;

    try {
        const query = searchInput.value.trim();

        // 新增：如果是一个新的搜索查询（而不是在现有结果中筛选），则重置日期筛选器
        if (query !== state.currentQuery) {
            currentDateFilter = { startDate: null, endDate: null, period: null };
            updateDateFilterDisplay('');
            const quickFilterBtns = document.querySelectorAll('.date-quick-filter');
            quickFilterBtns.forEach(btn => btn.classList.remove('active'));
        }

        // 新增：检查查询是否为论文ID
        if (/^\d{4}\.\d{4,5}$/.test(query)) {
            const paperId = query;
            addToSearchHistory(paperId);

            // 检查论文卡片是否已在当前页面渲染
            const paperCard = document.getElementById(`card-${paperId}`);
            if (paperCard) {
                // 如果已渲染，则滚动到该位置并高亮显示
                paperCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                paperCard.classList.add('highlight-shared-paper');
                setTimeout(() => {
                    paperCard.classList.remove('highlight-shared-paper');
                }, 3000); // 高亮3秒
                showToast(`已在当前页面定位到论文: ${paperId}`);
                // 找到后直接返回，不执行后续的全文搜索
                return;
            }

            // 如果未渲染，则使用 handleDirectLink 功能加载并跳转
            // 这将导航到正确的月份并高亮显示论文
            showProgress(`正在查找并跳转到论文 ${paperId}...`);
            await handleDirectLink(paperId, true); // 传递 isChildCall = true
            return; // 操作完成后返回
        }

        if (query !== state.currentQuery) {
            showProgress(`正在搜索 "${query}"...`);
        }

        await applyViewTransition(async () => {
            state.currentQuery = query;
            const url = new URL(window.location);
            url.searchParams.delete('paper');
            query ? url.searchParams.set('q', query) : url.searchParams.delete('q');
            history.pushState({}, '', url);

            if (!query) { resetToDefaultView(); return; }

            state.isSearchMode = true;
            state.activeCategoryFilter = 'all';
            papersContainer.classList.add('hidden');
            searchResultsContainer.classList.remove('hidden');
            quickNavContainer.style.display = 'none';
            categoryFilterContainer.classList.remove('hidden');
            searchInfoEl.classList.remove('hidden');
            searchResultsContainer.innerHTML = '';

            let results = [];
            let requiredMonths = new Set();

            if (query === 'favorites') {
                const favoriteIds = Array.from(state.favorites);
                if (favoriteIds.length > 0) {
                    requiredMonths = new Set(favoriteIds.map(id => `20${id.substring(0, 2)}-${id.substring(2, 4)}`));
                }
            } else {
                try {
                    if (!state.categoryIndex) {
                        updateProgress('加载分类索引...', 10);
                        state.categoryIndex = await (await fetch('./data/category_index.json')).json();
                    }
                    if (!state.searchIndex) {
                        updateProgress('加载搜索索引...', 20);
                        state.searchIndex = await (await fetch('./data/search_index.json')).json();
                    }
                } catch (error) { searchResultsContainer.innerHTML = `<p class="text-center text-red-500">索引文件加载失败: ${error.message}。</p>`; return; }

                let matchingIds;
                if (state.categoryIndex[query]) { matchingIds = new Set(state.categoryIndex[query]); }
                else { matchingIds = new Set(); const queryTokens = query.toLowerCase().split(/\s+/).filter(Boolean); queryTokens.forEach((token, index) => { const foundIds = new Set(); for (const key in state.searchIndex) { if (key.includes(token)) state.searchIndex[key].forEach(id => foundIds.add(id)); } if (index === 0) { matchingIds = foundIds; } else { matchingIds = new Set([...matchingIds].filter(id => foundIds.has(id))); } }); }

                requiredMonths = new Set([...matchingIds].map(id => `20${id.substring(0, 2)}-${id.substring(2, 4)}`));
            }

            const monthsToLoad = [...requiredMonths].filter(m => !state.loadedMonths.has(m));
            await fetchWithProgress(monthsToLoad);

            updateProgress('整理结果...', 95);

            if (query === 'favorites') {
                results = Array.from(state.favorites).map(id => state.allPapers.get(id)).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
            } else {
                let finalMatchingIds;
                if (state.categoryIndex[query]) { finalMatchingIds = new Set(state.categoryIndex[query]); }
                else {
                    finalMatchingIds = new Set();
                    const queryTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
                    queryTokens.forEach((token, index) => {
                        const foundIds = new Set();
                        for (const key in state.searchIndex) {
                            if (key.includes(token)) {
                                state.searchIndex[key].forEach(id => foundIds.add(id));
                            }
                        }
                        if (index === 0) {
                            finalMatchingIds = foundIds;
                        } else {
                            finalMatchingIds = new Set([...finalMatchingIds].filter(id => foundIds.has(id)));
                        }
                    });
                }
                results = Array.from(finalMatchingIds).map(id => state.allPapers.get(id)).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
            }

            state.currentSearchResults = results;
            renderCategoryFiltersForSearch(results);
            // 新增：渲染每日分布筛选器
            renderDailyDistributionFilters(results);

            renderFilteredResults();
        });
    } finally {
        state.isFetching = false;
        // handleSearch 总是管理锁，所以它总是应该隐藏进度条
        hideProgress();
    }
}

function renderFilteredResults() {
    const { currentSearchResults, activeCategoryFilter, currentQuery } = state;

    let filtered = activeCategoryFilter === 'all'
        ? currentSearchResults
        : currentSearchResults.filter(paper => paper.categories && paper.categories.includes(activeCategoryFilter));

    // 应用日期筛选 (新增)
    const originalCountBeforeDateFilter = filtered.length;
    let dateFilterActive = false;
    if (currentDateFilter.startDate && currentDateFilter.endDate) {
        filtered = applyDateFilterToResults(filtered);
        dateFilterActive = true;
    }

    searchResultsContainer.innerHTML = '';

    let infoText;
    if (currentQuery === 'favorites') {
        infoText = `正在显示您的 <strong>${currentSearchResults.length}</strong> 篇收藏`;
    } else {
        infoText = `为您找到 <strong>${currentSearchResults.length}</strong> 篇关于 "<strong>${currentQuery}</strong>" 的论文`;
    }

    if (activeCategoryFilter !== 'all') {
        infoText += `，其中 <strong>${filtered.length}</strong> 篇属于 <strong>${activeCategoryFilter}</strong> 分类`;
    }

    if (dateFilterActive) {
        if (originalCountBeforeDateFilter !== filtered.length) {
            infoText += `，日期筛选后剩 <strong>${filtered.length}</strong> 篇`;
        } else {
            infoText += ` (已应用日期筛选)`;
        }
    }

    infoText += '：';

    searchInfoEl.innerHTML = infoText;

    if (filtered.length > 0) {
        renderInChunks(filtered, searchResultsContainer);
    } else {
        searchResultsContainer.innerHTML = `<p class="text-center text-gray-500">在此分类下未找到相关论文。</p>`;
    }
    document.querySelectorAll('.category-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === activeCategoryFilter);
    });
    // 在搜索结果列表前添加返回按钮
    if (!document.getElementById('back-to-home-btn')) {
        createBackToHomeButton();
    }
}
function createBackToHomeButton() {
    const backToHomeBtn = document.createElement('button');
    backToHomeBtn.textContent = '回到首页'; // 修改文案
    backToHomeBtn.id = 'back-to-home-btn';
    backToHomeBtn.className = 'back-to-home-button'; // 使用新的 CSS 类
    backToHomeBtn.addEventListener('click', () => {
        resetToDefaultView();
    });
    searchResultsContainer.parentNode.insertBefore(backToHomeBtn, searchResultsContainer);
}

function resetToDefaultView(reload = true) {
    state.isSearchMode = false;
    searchInput.value = '';
    state.currentQuery = '';

    const url = new URL(window.location);
    url.searchParams.delete('q');
    url.searchParams.delete('paper');
    history.pushState({}, '', url);

    searchResultsContainer.classList.add('hidden');
    papersContainer.classList.remove('hidden');
    quickNavContainer.style.display = 'block';
    searchInfoEl.classList.add('hidden');
    categoryFilterContainer.classList.remove('hidden'); // 确保分类栏可见
    setupCategoryFilters(); // 恢复默认的分类按钮
    document.getElementById('daily-distribution-container')?.classList.add('hidden');
    state.currentSearchResults = [];
    state.activeCategoryFilter = 'all';

    updateClearButtonVisibility();

    if (reload) {
        papersContainer.innerHTML = '';
        state.currentMonthIndex = -1;
        loadNextMonth(false);
    }
    updateSearchStickiness();
}

function performTagSearch(tag) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    searchInput.value = tag;
    updateClearButtonVisibility();
    handleSearch();
};

function setupIntersectionObserver() {
    const options = { root: null, rootMargin: '0px', threshold: 0.1 };
    const observer = new IntersectionObserver((entries, observer) => { entries.forEach(entry => { if (entry.isIntersecting && !state.isFetching && !state.isSearchMode) { loadNextMonth(); } }); }, options);
    if (loader) observer.observe(loader);
}

// --- 新增和优化的事件处理 ---

async function handleDirectLink(paperId, isChildCall = false) {
    // 只有顶层调用才检查和设置锁
    if (!isChildCall && state.isFetching) {
        return;
    }
    if (!isChildCall) {
        state.isFetching = true;
        showProgress('正在定位论文...');
    }

    try {
        if (!/^\d{4}\.\d{4,5}$/.test(paperId)) {
            // 这个错误处理主要由顶层调用者负责
            showToast(`无效的论文ID格式: ${paperId}`);
            console.error(`无效的论文ID格式: ${paperId}`);
            const url = new URL(window.location);
            url.searchParams.delete('paper');
            history.replaceState({}, '', url);
            await loadNextMonth(false);
            return;
        }

        const month = `20${paperId.substring(0, 2)}-${paperId.substring(2, 4)}`;
        await navigateToMonth(month, true); // 传递 isChildCall = true

        if (!state.allPapers.has(paperId)) {
            console.error(`论文 ID ${paperId} 在数据中未找到。`);
            showToast(`找不到指定的论文 (ID: ${paperId})`);
            const url = new URL(window.location);
            url.searchParams.delete('paper');
            history.replaceState({}, '', url);
            return;
        }

        const card = await new Promise((resolve, reject) => {
            const startTime = Date.now();
            const timeout = 5000; // 5秒超时

            const checkCardExists = () => {
                const card = document.getElementById(`card-${paperId}`);
                if (card) {
                    resolve(card);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`定位论文卡片超时: ${paperId}`));
                } else {
                    requestAnimationFrame(checkCardExists);
                }
            };
            checkCardExists();
        });

        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('highlight-shared-paper');
        setTimeout(() => card.classList.remove('highlight-shared-paper'), 3000);
    } catch (error) {
        console.error("Direct link failed:", error);
        showToast(error.message, 'error');
    } finally {
        if (!isChildCall) {
            state.isFetching = false;
            hideProgress();
        }
    }
}

function showToast(message, type = 'success', duration = 3000) {
    toastNotificationEl.textContent = message;
    toastNotificationEl.className = `toast ${type}`;
    toastNotificationEl.classList.add('show');
    setTimeout(() => {
        toastNotificationEl.classList.remove('show');
    }, duration);
}

// 新增：更健壮的错误显示功能
function showLoadError(message) {
    if (errorContainer && errorMessageSpan) {
        // 隐藏骨架屏和内容区
        if (skeletonContainer) skeletonContainer.classList.add('hidden');
        if (papersContainer) papersContainer.innerHTML = '';
        if (searchResultsContainer) searchResultsContainer.classList.add('hidden');

        errorMessageSpan.textContent = ` ${message}`;
        errorContainer.classList.remove('hidden');
    } else {
        // 如果专用错误容器不存在，则使用后备方案
        console.error("错误提示容器未在DOM中找到。");
        if (papersContainer) papersContainer.innerHTML = `<p class="text-center text-red-500 p-8">加载失败: ${message}</p>`;
    }
    hideProgress(); // 隐藏顶部的加载条
}

function hideLoadError() {
    if (errorContainer) errorContainer.classList.add('hidden');
}
// 新增：集中管理清除按钮的可见性
function updateClearButtonVisibility() {
    const clearBtn = document.getElementById('clear-search-btn');
    if (clearBtn) {
        const hasText = searchInput.value.trim().length > 0;
        clearBtn.classList.toggle('hidden', !hasText);
    }
}

// 显示收藏夹
function showFavorites() {
    searchInput.value = 'favorites';
    handleSearch();
}

function setupEventListeners() {
    // 新增：错误重试按钮
    if (retryLoadBtn) {
        retryLoadBtn.addEventListener('click', () => {
            showToast('正在尝试重新加载...', 'info');
            // 使用 location.reload() 是处理致命初始化错误后最简单和最稳健的重试方法。
            setTimeout(() => location.reload(), 500);
        });
    }
    // 新增：清除搜索按钮事件
    const clearSearchBtn = document.getElementById('clear-search-btn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            resetToDefaultView();
            searchInput.focus();
        });
    }

    // 新增：为支持的分类列表容器添加事件监听器，修复点击无效问题
    const supportedCategoriesContainer = document.getElementById('supported-categories-container');
    if (supportedCategoriesContainer) {
        supportedCategoriesContainer.addEventListener('click', (event) => {
            const target = event.target.closest('[data-action="search-tag"]');
            if (target) {
                const tagValue = target.dataset.tagValue;
                if (tagValue) {
                    performTagSearch(tagValue);
                }
            }
        });
    }

    // 主容器事件代理
    mainContainer.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]');
        if (!target || state.isFetching) return;
        const { action, paperId, tagValue, month, day, tag, rating, fullDate } = target.dataset;

        switch (action) {
            case 'toggle-ai-details': toggleAIDetails(paperId); break;
            case 'search-tag': performTagSearch(tagValue); break;
            case 'toggle-favorite': toggleFavorite(event, paperId, target); break;
            case 'share-paper': sharePaper(paperId); break;
            case 'toggle-notes': togglePaperNotes(paperId); break;
            case 'save-note':
                const textarea = document.querySelector(`#paper-notes-${paperId} textarea`);
                if (textarea) savePaperNote(paperId, textarea.value);
                showToast('笔记已保存');
                break;
            case 'remove-tag': removePaperTag(paperId, tag); break;
            case 'rate-paper': setPaperRating(paperId, parseInt(rating)); break;
            case 'filter-by-date':
                const filterValue = fullDate || day;
                state.activeDateFilters.set(month, filterValue);
                const papersForMonth = Array.from(state.allPapers.values())
                    .filter(p => p.id.startsWith(month.replace('-', '').substring(2)))
                    .sort((a, b) => b.date.localeCompare(a.date)); // 对数据进行排序
                updateMonthView(month, papersForMonth);
                break;
        }
    });

    // 快速导航容器事件
    quickNavContainer.addEventListener('click', async (event) => {
        const target = event.target.closest('[data-action]');
        if (!target || state.isFetching) return;
        const { action, month, mode, tagValue } = target.dataset;

        switch (action) {
            case 'navigate-month': await navigateToMonth(month); break;
            case 'toggle-view': toggleViewMode(mode); break;
            case 'search-tag': performTagSearch(tagValue); break;
        }
    });

    // 分类筛选容器事件
    categoryFilterContainer.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]');
        if (!target || state.isFetching) return;

        const { action, category, tagValue } = target.dataset;

        if (action === 'filter-category') {
            state.activeCategoryFilter = category;
            renderFilteredResults();
        } else if (action === 'search-tag') {
            performTagSearch(tagValue);
        }
    });

    // 新增：每日分布筛选器事件
    const dailyDistContainer = document.getElementById('daily-distribution-container');
    if (dailyDistContainer) {
        dailyDistContainer.addEventListener('click', (event) => {
            const target = event.target.closest('[data-action="filter-by-distribution-date"]');
            if (!target || state.isFetching) return;
 
            const date = target.dataset.date;
 
            // 新增：清除快捷筛选按钮的激活状态，确保筛选互斥
            const quickFilterBtns = document.querySelectorAll('.date-quick-filter');
            quickFilterBtns.forEach(btn => btn.classList.remove('active'));
 
            // 手动管理每日分布筛选器的激活状态，以提高响应速度
            const dailyFilterBtns = dailyDistContainer.querySelectorAll('.date-filter-btn');
            dailyFilterBtns.forEach(btn => btn.classList.remove('active'));
            target.classList.add('active');
 
            if (date === 'all') {
                currentDateFilter = { startDate: null, endDate: null, period: null };
                updateDateFilterDisplay('');
            } else {
                currentDateFilter = { startDate: date, endDate: date, period: 'custom' };
                updateDateFilterDisplay(`${new Date(date).getMonth() + 1}/${new Date(date).getDate()}`);
            }
            renderFilteredResults();
        });
    }

    // 主题切换
    themeToggle.addEventListener('click', toggleTheme);

    // 搜索历史控制
    searchHistoryToggle.addEventListener('click', () => {
        state.searchHistoryVisible = !state.searchHistoryVisible;
        searchHistoryPanel.classList.toggle('hidden', !state.searchHistoryVisible);
        searchHistoryToggle.textContent = state.searchHistoryVisible ? '隐藏历史' : '搜索历史';
    });

    // 清除搜索历史
    document.getElementById('clear-history')?.addEventListener('click', clearSearchHistory);

    // 搜索历史项点击
    searchHistoryItems.addEventListener('click', (event) => {
        const query = event.target.dataset.query;
        if (query) {
            searchInput.value = query;
            handleSearch();
            searchHistoryPanel.classList.add('hidden');
            state.searchHistoryVisible = false;
            searchHistoryToggle.textContent = '搜索历史';
        }
    });

    // 搜索建议交互
    searchSuggestions.addEventListener('click', (event) => {
        const suggestion = event.target.closest('.suggestion-item')?.dataset.suggestion;
        if (suggestion) selectSuggestion(suggestion);
    });

    // 搜索输入框事件
    let searchTimeout;
    searchInput.addEventListener('input', (event) => {
        clearTimeout(searchTimeout);
        updateClearButtonVisibility();
        showSearchSuggestions(event.target.value);
        searchTimeout = setTimeout(() => {
            if (!state.isFetching) handleSearch();
        }, 300);
    });

    // 键盘导航支持
    searchInput.addEventListener('keydown', (event) => {
        if (searchSuggestions.classList.contains('visible')) {
            const items = searchSuggestions.querySelectorAll('.suggestion-item');
            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    state.currentSuggestionIndex = Math.min(state.currentSuggestionIndex + 1, items.length - 1);
                    updateSuggestionHighlight();
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    state.currentSuggestionIndex = Math.max(state.currentSuggestionIndex - 1, -1);
                    updateSuggestionHighlight();
                    break;
                case 'Enter':
                    if (state.currentSuggestionIndex >= 0) {
                        event.preventDefault();
                        const suggestion = items[state.currentSuggestionIndex]?.dataset.suggestion;
                        if (suggestion) selectSuggestion(suggestion);
                    }
                    break;
                case 'Escape':
                    hideSearchSuggestions();
                    break;
            }
        }
    });

    // 点击外部隐藏搜索建议
    document.addEventListener('click', (event) => {
        if (!searchBarContainer.contains(event.target)) {
            hideSearchSuggestions();
        }
    });

    // 滚动事件：阅读进度和返回顶部
    window.addEventListener('scroll', () => {
        updateReadingProgress();
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    // 返回顶部按钮
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 键盘访问性支持
    document.addEventListener('keydown', handleGlobalKeyNavigation);

    // 移动端底部导航事件
    if (mobileBottomNav) {
        mobileBottomNav.addEventListener('click', (event) => {
            const target = event.target.closest('[data-action]');
            if (target) {
                handleMobileBottomNavClick(event);
            }
        });
    }

    // 移动端触摸优化
    if (state.mobile.isTouchDevice) {
        // 为所有可点击元素添加触摸反馈
        setTimeout(() => {
            const clickableElements = document.querySelectorAll('button:not(.no-ripple), .keyword-tag, .month-btn');
            clickableElements.forEach(addRippleEffect);
            optimizeMobileTouchTargets();
        }, 1000);

        // 防止双击缩放（但保留捏合缩放）
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    // 日期筛选快捷操作 (新增)
    function handleDateFilterClick(month, day) {
        if (day === 'all') {
            state.activeDateFilters.delete(month);
        } else {
            state.activeDateFilters.set(month, day);
        }
        const papersInMonth = Array.from(state.allPapers.values()).filter(p => p.id.startsWith(month.replace('-', '').substring(2)));
        updateMonthView(month, papersInMonth.sort((a, b) => b.date.localeCompare(a.date))); // 对数据进行排序
    }

    // 个性化功能事件监听器
    setupPersonalizationEventListeners();
}

// 个性化功能事件监听器设置
function setupPersonalizationEventListeners() {
    // 设置按钮
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            openSettingsModal();
        });
    }

    // 数据管理按钮
    if (dataManagementBtn) {
        dataManagementBtn.addEventListener('click', () => {
            openDataManagementModal();
        });
    }

    // 模态框关闭按钮
    if (closeSettingsModal) {
        closeSettingsModal.addEventListener('click', () => {
            closeModal('settings-modal');
        });
    }

    if (closeDataModal) {
        closeDataModal.addEventListener('click', () => {
            closeModal('data-management-modal');
        });
    }

    if (closeRecommendations) {
        closeRecommendations.addEventListener('click', () => {
            hideRecommendationsPanel();
        });
    }

    // 设置面板中的控件事件
    document.addEventListener('click', (event) => {
        const target = event.target;

        // 导出功能
        if (target.id === 'export-favorites-json') exportFavorites('json');
        else if (target.id === 'export-favorites-csv') exportFavorites('csv');
        else if (target.id === 'export-favorites-bibtex') exportFavorites('bibtex');
        else if (target.id === 'export-favorites-markdown') exportFavorites('markdown');
        else if (target.id === 'export-notes-json') exportNotes('json');
        else if (target.id === 'export-tags-json') exportTags('json');
        else if (target.id === 'export-ratings-json') exportRatings('json');
        else if (target.id === 'export-all-data') exportAllData();

        // 数据导入
        else if (target.id === 'import-favorites') importData('favorites');
        else if (target.id === 'import-notes') importData('notes');

        // 设置保存和重置
        else if (target.id === 'save-settings') savePersonalizationSettings();
        else if (target.id === 'reset-settings') resetPersonalizationSettings();
        else if (target.id === 'backup-now') createManualBackup();
        else if (target.id === 'clear-all-data') clearAllData();
    });

    // 文件导入
    const importFile = document.getElementById('import-file');
    if (importFile) {
        importFile.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    importUserData(e.target.result);
                };
                reader.readAsText(file);
            }
        });
    }

    // 点击模态框外部关闭
    [settingsModal, dataManagementModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        }
    });

    // ESC键关闭模态框
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const visibleModals = document.querySelectorAll('.fixed:not(.hidden)');
            visibleModals.forEach(modal => {
                if (modal.id === 'settings-modal' || modal.id === 'data-management-modal') {
                    modal.classList.add('hidden');
                }
            });
        }
    });

    // 监听论文卡片的交互事件，用于记录阅读历史
    document.addEventListener('click', (event) => {
        const paperCard = event.target.closest('.paper-card');
        if (paperCard) {
            const paperId = paperCard.id.replace('card-', '');
            if (paperId && state.allPapers.has(paperId)) {
                recordPaperInteraction(paperId, 'click');
            }
        }
    });

    // 监听AI详情展开事件
    document.addEventListener('click', (event) => {
        if (event.target.closest('[data-action="toggle-ai-details"]')) {
            const paperCard = event.target.closest('.paper-card');
            if (paperCard) {
                const paperId = paperCard.id.replace('card-', '');
                recordPaperInteraction(paperId, 'ai_details_view');
            }
        }
    });
}

// 打开设置模态框
function openSettingsModal() {
    try {
        loadSettingsValues();
        updatePersonalizationUI();
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.classList.remove('hidden');
        }
    } catch (error) {
        console.error('打开设置模态框时出错:', error);
        showToast('打开设置失败', 'error');
    }
}

// 打开数据管理模态框
function openDataManagementModal() {
    try {
        updatePersonalizationUI();
        updateLastBackupTime();
        const dataManagementModal = document.getElementById('data-management-modal');
        if (dataManagementModal) {
            dataManagementModal.classList.remove('hidden');
        }
    } catch (error) {
        console.error('打开数据管理模态框时出错:', error);
        showToast('打开数据管理失败', 'error');
    }
}

// 关闭模态框
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

// 加载设置值到UI
function loadSettingsValues() {
    try {
        const themeSelect = document.getElementById('theme-preference');
        const viewSelect = document.getElementById('view-preference');
        const dailyTarget = document.getElementById('daily-target');
        const weeklyTarget = document.getElementById('weekly-target');
        const recommendationEnabled = document.getElementById('recommendation-enabled');
        const tooltipsEnabled = document.getElementById('tooltips-enabled');
        const keyboardNavEnabled = document.getElementById('keyboard-nav-enabled');
        const autoBackupEnabled = document.getElementById('auto-backup-enabled');
        const backupFrequency = document.getElementById('backup-frequency');

        if (themeSelect) themeSelect.value = state.userPreferences.preferredTheme || 'system';
        if (viewSelect) viewSelect.value = state.userPreferences.defaultView || 'detailed';
        if (dailyTarget) dailyTarget.value = state.userPreferences.readingGoals.dailyTarget || 5;
        if (weeklyTarget) weeklyTarget.value = state.userPreferences.readingGoals.weeklyTarget || 30;
        if (recommendationEnabled) recommendationEnabled.checked = state.userPreferences.recommendationEnabled;
        if (tooltipsEnabled) tooltipsEnabled.checked = state.userPreferences.showTooltips;
        if (keyboardNavEnabled) keyboardNavEnabled.checked = state.userPreferences.enableKeyboardNav;
        if (autoBackupEnabled) autoBackupEnabled.checked = state.dataManagement?.autoBackup || false;
        if (backupFrequency) backupFrequency.value = (state.dataManagement?.backupInterval || 24 * 60 * 60 * 1000) / (60 * 60 * 1000);
    } catch (error) {
        console.error('加载设置值失败:', error);
    }
}

// 保存个性化设置
function savePersonalizationSettings() {
    const themeSelect = document.getElementById('theme-preference');
    const viewSelect = document.getElementById('view-preference');
    const dailyTarget = document.getElementById('daily-target');
    const weeklyTarget = document.getElementById('weekly-target');
    const recommendationEnabled = document.getElementById('recommendation-enabled');
    const tooltipsEnabled = document.getElementById('tooltips-enabled');
    const keyboardNavEnabled = document.getElementById('keyboard-nav-enabled');
    const autoBackupEnabled = document.getElementById('auto-backup-enabled');
    const backupFrequency = document.getElementById('backup-frequency');

    // 更新状态
    if (themeSelect) state.userPreferences.preferredTheme = themeSelect.value;
    if (viewSelect) state.userPreferences.defaultView = viewSelect.value;
    if (dailyTarget) state.userPreferences.readingGoals.dailyTarget = parseInt(dailyTarget.value) || 5;
    if (weeklyTarget) state.userPreferences.readingGoals.weeklyTarget = parseInt(weeklyTarget.value) || 30;
    if (recommendationEnabled) state.userPreferences.recommendationEnabled = recommendationEnabled.checked;
    if (tooltipsEnabled) state.userPreferences.showTooltips = tooltipsEnabled.checked;
    if (keyboardNavEnabled) state.userPreferences.enableKeyboardNav = keyboardNavEnabled.checked;
    if (autoBackupEnabled) state.dataManagement.autoBackup = autoBackupEnabled.checked;
    if (backupFrequency) state.dataManagement.backupInterval = parseInt(backupFrequency.value) * 60 * 60 * 1000;

    // 应用设置
    if (themeSelect) setTheme(themeSelect.value);
    if (viewSelect) {
        state.viewMode = viewSelect.value;
        mainContainer.className = `${viewSelect.value}-view`;
        updateViewModeUI();
    }

    // 保存到本地存储
    saveUserPreferences();

    showToast('设置已保存', 'success');
    closeModal('settings-modal');
}

// 重置个性化设置
function resetPersonalizationSettings() {
    if (confirm('确定要重置所有个性化设置吗？这将恢复到默认设置。')) {
        // 重置为默认值
        state.userPreferences = {
            hasSeenTutorial: false,
            preferredTheme: 'system',
            defaultView: 'detailed',
            autoHideWelcome: false,
            showTooltips: true,
            enableKeyboardNav: true,
            autoSaveInterval: 30000,
            recommendationEnabled: true,
            maxRecentPapers: 50,
            customCategories: new Map(),
            paperInteractions: new Map(),
            readingGoals: {
                dailyTarget: 5,
                weeklyTarget: 30,
                currentStreak: 0,
                longestStreak: 0
            }
        };

        saveUserPreferences();
        loadSettingsValues();
        showToast('设置已重置', 'success');
    }
}

// 创建手动备份
function createManualBackup() {
    exportUserData('all');
    state.dataManagement.lastBackup = new Date().toISOString();
    updateLastBackupTime();
    showToast('备份已创建', 'success');
}

// 清除所有用户数据
function clearAllUserData() {
    if (confirm('警告：这将删除所有用户数据，包括收藏、笔记、标签、评分和设置。此操作不可逆。\n\n确定要继续吗？')) {
        if (confirm('请再次确认：您真的要删除所有数据吗？')) {
            // 清除所有数据
            state.favorites.clear();
            state.paperNotes.clear();
            state.paperTags.clear();
            state.paperRatings.clear();
            state.favoriteGroups.clear();
            state.readingHistory.viewedPapers.clear();
            state.readingHistory.readingSessions = [];
            state.readingHistory.preferences.clear();
            state.readingHistory.recommendations = [];

            // 清除本地存储
            localStorage.removeItem('arxiv_favorites');
            localStorage.removeItem('arxiv_paper_notes');
            localStorage.removeItem('arxiv_paper_tags');
            localStorage.removeItem('arxiv_paper_ratings');
            localStorage.removeItem('arxiv_user_preferences');
            localStorage.removeItem('arxiv_reading_history');
            localStorage.removeItem('arxiv_search_history');

            showToast('所有数据已清除', 'success');
            updatePersonalizationUI();
            closeModal('data-management-modal');
        }
    }
}

// 添加自定义分类
function addCustomCategory() {
    const nameInput = document.getElementById('new-category-name');
    const keywordsInput = document.getElementById('new-category-keywords');

    if (nameInput && keywordsInput) {
        const name = nameInput.value.trim();
        const keywords = keywordsInput.value.trim().split(',').map(k => k.trim()).filter(Boolean);

        if (name && keywords.length > 0) {
            state.userPreferences.customCategories.set(name, keywords);
            saveUserPreferences();
            updateCustomCategoriesList();
            nameInput.value = '';
            keywordsInput.value = '';
            showToast(`已添加自定义分类：${name}`, 'success');
        } else {
            showToast('请输入分类名称和关键词', 'error');
        }
    }
}

// 更新自定义分类列表
function updateCustomCategoriesList() {
    const container = document.getElementById('custom-categories-list');
    if (!container) return;

    if (state.userPreferences.customCategories.size === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500">暂无自定义分类</p>';
        return;
    }

    let html = '';
    state.userPreferences.customCategories.forEach((keywords, name) => {
        html += `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                        <h5 class="font-medium text-gray-900">${name}</h5>
                        <p class="text-sm text-gray-600">${keywords.join(', ')}</p>
                    </div>
                    <button onclick="removeCustomCategory('${name}')" 
                            class="text-red-600 hover:text-red-800 transition-colors"
                            title="删除分类">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            `;
    });

    container.innerHTML = html;
}

// 删除自定义分类
function removeCustomCategory(name) {
    if (confirm(`确定要删除分类"${name}"吗？`)) {
        state.userPreferences.customCategories.delete(name);
        saveUserPreferences();
        updateCustomCategoriesList();
        showToast(`已删除分类：${name}`, 'success');
    }
}

// 更新最后备份时间显示
function updateLastBackupTime() {
    const lastBackupEl = document.getElementById('last-backup-time');
    if (lastBackupEl) {
        if (state.dataManagement.lastBackup) {
            const date = new Date(state.dataManagement.lastBackup);
            lastBackupEl.textContent = date.toLocaleString();
        } else {
            lastBackupEl.textContent = '从未备份';
        }
    }
}

// 显示推荐面板
function showRecommendationsPanel() {
    const recommendations = generateRecommendations();
    updateRecommendationsDisplay(recommendations);
    recommendationsPanel.classList.remove('hidden');
}

// 隐藏推荐面板
function hideRecommendationsPanel() {
    recommendationsPanel.classList.add('hidden');
}

// 更新推荐显示
function updateRecommendationsDisplay(recommendations) {
    const content = document.getElementById('recommendations-content');
    if (!content) return;

    if (!recommendations || recommendations.length === 0) {
        content.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                    <p class="text-sm">暂无推荐内容</p>
                    <p class="text-xs text-gray-400 mt-1">继续阅读论文以获得个性化推荐</p>
                </div>
            `;
        return;
    }

    let html = `<div class="space-y-3">`;
    recommendations.forEach((rec, index) => {
        const paper = rec.paper;
        html += `
                <div class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer" 
                     onclick="scrollToPaper('${paper.id}')">
                    <h4 class="font-medium text-sm text-gray-900 mb-1 line-clamp-2">${paper.title || '无标题'}</h4>
                    <p class="text-xs text-gray-600 mb-2">${(paper.authors || '').slice(0, 80)}${(paper.authors || '').length > 80 ? '...' : ''}</p>
                    <div class="flex items-center justify-between">
                        <div class="flex flex-wrap gap-1">
                            ${(paper.categories || []).slice(0, 2).map(cat =>
            `<span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">${cat}</span>`
        ).join('')}
                        </div>
                        <span class="text-xs text-gray-500">匹配度: ${Math.round(rec.score * 10) / 10}</span>
                    </div>
                </div>
            `;
    });
    html += `</div>`;

    content.innerHTML = html;
}

// 滚动到指定论文
function scrollToPaper(paperId) {
    const paperCard = document.getElementById(`card-${paperId}`);
    if (paperCard) {
        paperCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        paperCard.style.backgroundColor = 'var(--bg-tertiary)';
        setTimeout(() => {
            paperCard.style.backgroundColor = '';
        }, 2000);
        hideRecommendationsPanel();
    }
}

function updateSuggestionHighlight() {
    const items = searchSuggestions.querySelectorAll('.suggestion-item');
    items.forEach((item, index) => {
        item.classList.toggle('highlighted', index === state.currentSuggestionIndex);
    });
}

function handleGlobalKeyNavigation(event) {
    // ESC键重置焦点
    if (event.key === 'Escape') {
        document.activeElement?.blur();
        hideSearchSuggestions();
    }

    // Ctrl/Cmd + K 快速聚焦搜索框
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        searchInput.focus();
    }

    // Ctrl/Cmd + D 切换深色模式
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        toggleTheme();
    }
}

window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    if (searchInput.value !== query) {
        searchInput.value = query;
        handleSearch();
    }
});

window.addEventListener('resize', updateSearchStickiness);

// 监听系统主题变化
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('arxiv_theme')) {
        setTheme(e.matches ? 'dark' : 'light');
    }
});

// --- 用户引导和教程系统 ---

// 检测首次访问
function detectFirstVisit() {
    const hasVisited = localStorage.getItem('arxiv_has_visited');
    if (!hasVisited) {
        state.tutorial.isFirstVisit = true;
        localStorage.setItem('arxiv_has_visited', 'true');
        showFirstVisitWelcome();
    }

    // 检查是否已看过教程
    const hasSeenTutorial = localStorage.getItem('arxiv_tutorial_completed');
    state.userPreferences.hasSeenTutorial = hasSeenTutorial === 'true';

    // 加载用户偏好
    loadUserPreferences();
}

// 显示首次访问欢迎信息
function showFirstVisitWelcome() {
    // 显示欢迎指示器
    setTimeout(() => {
        firstVisitIndicator.classList.add('show');
        setTimeout(() => {
            firstVisitIndicator.classList.remove('show');
        }, 5000);
    }, 1000);

    // 显示欢迎卡片和快速功能面板
    setTimeout(() => {
        showWelcomeContent();
    }, 500);
}

// 显示欢迎内容
function showWelcomeContent() {
    if (!state.userPreferences.hasSeenTutorial) {
        welcomeCard.classList.remove('hidden');
        quickActions.classList.remove('hidden');
        popularKeywords.classList.remove('hidden');
    }
}

// 隐藏欢迎内容
function hideWelcomeContent() {
    welcomeCard.classList.add('hidden');
    quickActions.classList.add('hidden');
    popularKeywords.classList.add('hidden');
}

// 开始教程
function startTutorial() {
    state.tutorial.isActive = true;
    state.tutorial.currentStep = 0;
    hideWelcomeContent();
    showTutorialStep(0);
    tutorialOverlay.classList.add('active');
    tutorialProgress.classList.add('active');

    // 暂停其他交互
    document.body.style.overflow = 'hidden';
}

// 显示教程步骤
function showTutorialStep(stepIndex) {
    const step = state.tutorial.steps[stepIndex];
    if (!step) return;

    // 更新进度
    updateTutorialProgress();

    // 更新内容
    updateTutorialContent(step);

    // 高亮目标元素
    highlightElement(step.target);

    // 定位教程卡片
    positionTutorialCard(step);

    // 更新按钮状态
    updateTutorialButtons();

    // 激活卡片
    setTimeout(() => {
        tutorialCard.classList.add('active');
    }, 300);
}

// 更新教程进度
function updateTutorialProgress() {
    const progress = ((state.tutorial.currentStep + 1) / state.tutorial.totalSteps) * 100;
    tutorialProgressText.textContent = `步骤 ${state.tutorial.currentStep + 1} / ${state.tutorial.totalSteps}`;
    tutorialProgressFill.style.width = `${progress}%`;
}

// 更新教程内容
function updateTutorialContent(step) {
    tutorialTitle.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ${step.title}
        `;
    tutorialContent.textContent = step.content;

    // 隐藏功能列表（只在第一步显示）
    if (state.tutorial.currentStep === 0) {
        tutorialFeatures.style.display = 'block';
    } else {
        tutorialFeatures.style.display = 'none';
    }
}

// 高亮目标元素
function highlightElement(selector) {
    const element = document.querySelector(selector);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // 设置高亮位置
    tutorialHighlight.style.top = `${rect.top + scrollTop - 10}px`;
    tutorialHighlight.style.left = `${rect.left + scrollLeft - 10}px`;
    tutorialHighlight.style.width = `${rect.width + 20}px`;
    tutorialHighlight.style.height = `${rect.height + 20}px`;

    // 滚动到元素位置
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
    });
}

// 定位教程卡片
function positionTutorialCard(step) {
    const element = document.querySelector(step.target);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const cardWidth = 400;
    const cardHeight = 300;
    const margin = 20;

    let top, left;

    if (step.position === 'bottom') {
        top = rect.bottom + margin;
        left = Math.max(margin, Math.min(window.innerWidth - cardWidth - margin, rect.left));
    } else if (step.position === 'top') {
        top = Math.max(margin, rect.top - cardHeight - margin);
        left = Math.max(margin, Math.min(window.innerWidth - cardWidth - margin, rect.left));
    } else {
        // 默认居中
        top = window.innerHeight / 2 - cardHeight / 2;
        left = window.innerWidth / 2 - cardWidth / 2;
    }

    // 确保卡片在视窗内
    top = Math.max(margin, Math.min(window.innerHeight - cardHeight - margin, top));
    left = Math.max(margin, Math.min(window.innerWidth - cardWidth - margin, left));

    tutorialCard.style.top = `${top}px`;
    tutorialCard.style.left = `${left}px`;
}

// 更新教程按钮
function updateTutorialButtons() {
    // 上一步按钮
    if (state.tutorial.currentStep === 0) {
        tutorialPrevBtn.style.display = 'none';
    } else {
        tutorialPrevBtn.style.display = 'inline-block';
    }

    // 下一步/完成按钮
    if (state.tutorial.currentStep === state.tutorial.totalSteps - 1) {
        tutorialNextBtn.textContent = '完成教程';
    } else {
        tutorialNextBtn.textContent = '下一步';
    }
}

// 下一步教程
function nextTutorialStep() {
    tutorialCard.classList.remove('active');

    setTimeout(() => {
        if (state.tutorial.currentStep < state.tutorial.totalSteps - 1) {
            state.tutorial.currentStep++;
            showTutorialStep(state.tutorial.currentStep);
        } else {
            completeTutorial();
        }
    }, 200);
}

// 上一步教程
function prevTutorialStep() {
    if (state.tutorial.currentStep > 0) {
        tutorialCard.classList.remove('active');

        setTimeout(() => {
            state.tutorial.currentStep--;
            showTutorialStep(state.tutorial.currentStep);
        }, 200);
    }
}

// 跳过教程
function skipTutorial() {
    if (confirm('确定要跳过新手教程吗？您可以随时点击右上角的"新手教程"按钮重新开始。')) {
        completeTutorial(false);
    }
}

// 完成教程
function completeTutorial(showCompleteMessage = true) {
    state.tutorial.isActive = false;
    tutorialOverlay.classList.remove('active');
    tutorialProgress.classList.remove('active');
    tutorialCard.classList.remove('active');

    // 恢复页面交互
    document.body.style.overflow = '';

    // 保存完成状态
    localStorage.setItem('arxiv_tutorial_completed', 'true');
    state.userPreferences.hasSeenTutorial = true;

    if (showCompleteMessage) {
        showToast('🎉 教程完成！现在您可以开始探索论文了', 'success');
    }

    // 如果是首次访问，显示一些提示
    if (state.tutorial.isFirstVisit) {
        setTimeout(() => {
            showFeatureTooltip('#searchInput', '💡 提示：试试输入"transformer"或"diffusion"开始搜索');
        }, 2000);
    }
}

// 重置教程状态
function resetTutorial() {
    localStorage.removeItem('arxiv_tutorial_completed');
    state.userPreferences.hasSeenTutorial = false;
    showToast('教程状态已重置，刷新页面后将重新显示引导');
}

// --- 功能提示系统 ---

// 显示功能提示
function showFeatureTooltip(targetSelector, message, duration = 3000, position = 'top') {
    const target = document.querySelector(targetSelector);
    if (!target || !state.userPreferences.showTooltips) return;

    const rect = target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    featureTooltip.textContent = message;
    featureTooltip.className = `feature-tooltip ${position === 'bottom' ? 'tooltip-bottom' : ''}`;

    let top, left;
    if (position === 'bottom') {
        top = rect.bottom + scrollTop + 10;
    } else {
        top = rect.top + scrollTop - featureTooltip.offsetHeight - 10;
    }

    left = rect.left + scrollLeft + (rect.width / 2) - (featureTooltip.offsetWidth / 2);

    // 确保在视窗内
    left = Math.max(10, Math.min(window.innerWidth - featureTooltip.offsetWidth - 10, left));

    featureTooltip.style.top = `${top}px`;
    featureTooltip.style.left = `${left}px`;
    featureTooltip.classList.add('show');

    setTimeout(() => {
        featureTooltip.classList.remove('show');
    }, duration);
}



// --- 智能推荐和个性化 ---

// 基于用户行为的推荐
function generatePersonalizedRecommendations() {
    // 分析用户搜索历史
    const searchTerms = state.searchHistory.slice(-10);
    const favoriteCategories = Array.from(state.favorites).map(id => {
        const paper = state.allPapers.get(id);
        return paper ? paper.primary_category : null;
    }).filter(Boolean);

    // 生成推荐关键词
    const recommendations = [];

    // 基于搜索历史
    searchTerms.forEach(term => {
        if (term.length > 3) {
            recommendations.push({
                keyword: term,
                reason: '基于搜索历史',
                score: 0.8
            });
        }
    });

    // 基于收藏的论文类别
    favoriteCategories.forEach(category => {
        const categoryKeywords = getCategoryKeywords(category);
        categoryKeywords.forEach(keyword => {
            recommendations.push({
                keyword,
                reason: '基于收藏偏好',
                score: 0.9
            });
        });
    });

    return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(r => r.keyword);
}

// 获取类别相关关键词
function getCategoryKeywords(category) {
    const keywordMap = {
        'cs.CV': ['computer vision', 'image', 'video', 'detection', 'segmentation'],
        'cs.LG': ['machine learning', 'neural network', 'deep learning', 'optimization'],
        'cs.CL': ['natural language', 'nlp', 'language model', 'text', 'translation'],
        'cs.AI': ['artificial intelligence', 'reasoning', 'knowledge', 'planning'],
        'cs.RO': ['robotics', 'robot', 'control', 'navigation', 'manipulation'],
        'stat.ML': ['statistical learning', 'bayesian', 'inference', 'probability']
    };
    return keywordMap[category] || [];
}

// 初始化用户引导系统
function initializeUserGuidance() {
    // 检测首次访问
    detectFirstVisit();

    // 绑定教程按钮事件
    if (tutorialBtn) {
        tutorialBtn.addEventListener('click', startTutorial);
    }

    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            showHelpDialog();
        });
    }

    // 绑定欢迎卡片按钮
    if (startTutorialBtn) {
        startTutorialBtn.addEventListener('click', startTutorial);
    }

    if (exploreNowBtn) {
        exploreNowBtn.addEventListener('click', () => {
            hideWelcomeContent();
            showToast('开始探索吧！💫');
        });
    }

    // 绑定教程控制按钮
    if (tutorialNextBtn) {
        tutorialNextBtn.addEventListener('click', nextTutorialStep);
    }

    if (tutorialPrevBtn) {
        tutorialPrevBtn.addEventListener('click', prevTutorialStep);
    }

    if (tutorialSkipBtn) {
        tutorialSkipBtn.addEventListener('click', skipTutorial);
    }

    // 绑定快速功能卡片
    document.querySelectorAll('.quick-action-card').forEach(card => {
        card.addEventListener('click', () => {
            const action = card.dataset.action;
            handleQuickAction(action);
        });
    });

    // 绑定热门关键词
    document.querySelectorAll('.popular-keyword').forEach(keyword => {
        keyword.addEventListener('click', () => {
            const term = keyword.dataset.keyword;
            searchInput.value = term;
            addToSearchHistory(term);
            handleSearch();
            hideWelcomeContent();
        });
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (state.tutorial.isActive) {
            if (e.key === 'Escape') {
                skipTutorial();
            } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
                nextTutorialStep();
            } else if (e.key === 'ArrowLeft') {
                prevTutorialStep();
            }
        }
    });

    // 监听窗口大小变化，调整教程卡片位置
    window.addEventListener('resize', () => {
        if (state.tutorial.isActive) {
            const currentStep = state.tutorial.steps[state.tutorial.currentStep];
            if (currentStep) {
                setTimeout(() => {
                    positionTutorialCard(currentStep);
                }, 100);
            }
        }
    });

    // 在移动端优化教程体验
    if (state.mobile.isTouchDevice) {
        // 禁用一些动画以提高性能
        document.documentElement.style.setProperty('--tutorial-animation-duration', '0.2s');
    }
}

// 处理快速功能操作
function handleQuickAction(action) {
    hideWelcomeContent();

    switch (action) {
        case 'search':
            searchInput.focus();
            showFeatureTooltip('#searchInput', '开始搜索论文吧！支持中英文关键词');
            break;
        case 'categories':
            if (categoryFiltersEl.children.length === 0) {
                buildCategoryFilters();
            }
            categoryFilterContainer.classList.remove('hidden');
            categoryFilterContainer.scrollIntoView({ behavior: 'smooth' });
            showFeatureTooltip('#category-filters', '选择感兴趣的领域进行筛选');
            break;
        case 'favorites':
            showFavorites();
            break;
        case 'timeline':
            document.getElementById('quick-nav').scrollIntoView({ behavior: 'smooth' });
            showFeatureTooltip('#quick-nav', '点击月份快速跳转到对应时间');
            break;
    }
}

// 显示帮助对话框
function showHelpDialog() {
    const helpContent = `
            <div class="space-y-4">
                <h3 class="text-lg font-bold text-gray-900">使用帮助</h3>
                
                <div class="space-y-3">
                    <div>
                        <h4 class="font-semibold text-gray-800">🔍 搜索功能</h4>
                        <p class="text-sm text-gray-600">支持搜索论文标题、作者、摘要内容，支持中英文关键词</p>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold text-gray-800">📁 分类筛选</h4>
                        <p class="text-sm text-gray-600">按计算机视觉、机器学习、自然语言处理等领域筛选</p>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold text-gray-800">⭐ 收藏管理</h4>
                        <p class="text-sm text-gray-600">点击星星图标收藏论文，支持收藏夹管理和导出</p>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold text-gray-800">🤖 AI 增强摘要</h4>
                        <p class="text-sm text-gray-600">每篇论文都有 AI 生成的中文摘要和核心观点解读</p>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold text-gray-800">🎨 个性化</h4>
                        <p class="text-sm text-gray-600">支持深色/浅色主题切换，视图模式选择</p>
                    </div>
                </div>
                
                <div class="pt-3 border-t">
                    <button onclick="startTutorial(); this.closest('.tutorial-card').remove();" 
                            class="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition">
                        开始新手教程
                    </button>
                </div>
            </div>
        `;

    // 创建临时帮助卡片
    const helpCard = document.createElement('div');
    helpCard.className = 'tutorial-card active';
    helpCard.style.position = 'fixed';
    helpCard.style.top = '50%';
    helpCard.style.left = '50%';
    helpCard.style.transform = 'translate(-50%, -50%)';
    helpCard.style.zIndex = '1003';
    helpCard.innerHTML = helpContent;

    const overlay = document.createElement('div');
    overlay.className = 'tutorial-overlay active';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.appendChild(helpCard);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    document.body.appendChild(overlay);
}

// 开发者测试功能：重置首次访问状态
function resetFirstVisitState() {
    localStorage.removeItem('arxiv_has_visited');
    localStorage.removeItem('arxiv_tutorial_completed');
    localStorage.removeItem('arxiv_user_preferences');
    showToast('已重置首次访问状态，刷新页面查看效果', 'success', 4000);
}

// 使全局函数可用于HTML onclick事件
window.removeCustomCategory = removeCustomCategory;
window.scrollToPaper = scrollToPaper;

// 自动备份功能
function setupAutoBackup() {
    if (state.dataManagement.autoBackup) {
        const backupInterval = state.dataManagement.backupInterval || 24 * 60 * 60 * 1000; // 默认24小时

        setInterval(() => {
            const lastBackup = state.dataManagement.lastBackup;
            const now = Date.now();

            if (!lastBackup || (now - new Date(lastBackup).getTime()) >= backupInterval) {
                exportUserData('all');
                state.dataManagement.lastBackup = new Date().toISOString();
                console.log('自动备份已完成');
            }
        }, 60 * 60 * 1000); // 每小时检查一次
    }
}

// 在页面初始化完成后设置自动备份
setTimeout(setupAutoBackup, 5000);

// 增强的论文搜索功能，支持自定义分类
function searchWithCustomCategories(query) {
    // 检查是否匹配自定义分类
    for (const [categoryName, keywords] of state.userPreferences.customCategories) {
        if (keywords.some(keyword => query.toLowerCase().includes(keyword.toLowerCase()))) {
            // 执行基于自定义分类的搜索
            performTagSearch(keywords.join(' OR '));
            return;
        }
    }

    // 否则执行普通搜索
    handleSearch();
}

// 智能推荐的定期更新
function scheduleRecommendationUpdates() {
    if (state.userPreferences.recommendationEnabled) {
        setInterval(() => {
            if (state.readingHistory.viewedPapers.size >= 3) {
                generateRecommendations();
            }
        }, 5 * 60 * 1000); // 每5分钟更新一次推荐
    }
}

// 在页面加载完成后启动推荐系统
setTimeout(scheduleRecommendationUpdates, 10000);

// 个性化快捷键支持
function setupPersonalizedKeyboardShortcuts() {
    if (state.userPreferences.enableKeyboardNav) {
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + K: 打开搜索
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                searchInput.focus();
            }

            // Ctrl/Cmd + Shift + S: 打开设置
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
                event.preventDefault();
                openSettingsModal();
            }

            // Ctrl/Cmd + Shift + D: 打开数据管理
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
                event.preventDefault();
                openDataManagementModal();
            }

            // Ctrl/Cmd + Shift + R: 显示推荐
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
                event.preventDefault();
                showRecommendationsPanel();
            }

            // F: 搜索收藏夹
            if (event.key === 'f' && !event.ctrlKey && !event.metaKey && event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
                event.preventDefault();
                performTagSearch('favorites');
            }
        });
    }
}

// --- Service Worker Registration and PWA Features ---
async function initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered successfully:', registration.scope);
            
            // 监听 Service Worker 更新
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showToast('应用有新版本可用，请刷新页面', 'info', 5000);
                    }
                });
            });
            
            // 监听来自 Service Worker 的消息
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
            
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

function handleServiceWorkerMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
        case 'CACHE_UPDATED':
            showToast('内容已更新并缓存', 'success');
            break;
        case 'OFFLINE_READY':
            showToast('应用已准备好离线使用', 'info');
            break;
        case 'SYNC_COMPLETED':
            showToast('数据同步完成', 'success');
            break;
    }
}

// --- Enhanced Mobile Features ---

// Pull to refresh functionality
function initializePullToRefresh() {
    if (!state.mobile.isTouchDevice) return;

    const pullToRefreshEl = document.getElementById('pull-to-refresh');
    const pullRefreshIcon = pullToRefreshEl.querySelector('.pull-refresh-icon');
    const pullRefreshText = document.getElementById('pull-refresh-text');
    
    let startY = 0;
    let currentY = 0;
    let pullDistance = 0;
    let isPulling = false;
    let isRefreshing = false;
    const threshold = 80; // 触发刷新的距离
    
    // 只在页面顶部时启用下拉刷新
    document.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0 && !isRefreshing) {
            startY = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (!isPulling || isRefreshing) return;
        
        currentY = e.touches[0].clientY;
        pullDistance = Math.max(0, currentY - startY);
        
        if (pullDistance > 0) {
            e.preventDefault(); // 防止页面滚动
            
            const progress = Math.min(pullDistance / threshold, 1);
            const translateY = Math.min(pullDistance * 0.5, 60);
            
            pullToRefreshEl.style.transform = `translateY(${translateY}px)`;
            pullRefreshIcon.style.transform = `rotate(${progress * 180}deg)`;
            
            if (pullDistance >= threshold) {
                pullRefreshText.textContent = '释放刷新';
                pullToRefreshEl.classList.add('visible');
                // 触觉反馈
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            } else {
                pullRefreshText.textContent = '下拉刷新';
            }
        }
    }, { passive: false });
    
    document.addEventListener('touchend', async (e) => {
        if (!isPulling || isRefreshing) return;
        
        isPulling = false;
        
        if (pullDistance >= threshold) {
            isRefreshing = true;
            pullRefreshText.textContent = '正在刷新...';
            pullRefreshIcon.classList.add('spinning');
            pullToRefreshEl.classList.add('refreshing');
            
            try {
                // 执行刷新逻辑
                await refreshAppData();
                showToast('刷新完成', 'success');
            } catch (error) {
                showToast('刷新失败，请重试', 'error');
                console.error('Refresh failed:', error);
            } finally {
                // 重置状态
                setTimeout(() => {
                    isRefreshing = false;
                    pullToRefreshEl.style.transform = 'translateY(-60px)';
                    pullToRefreshEl.classList.remove('visible', 'refreshing');
                    pullRefreshIcon.classList.remove('spinning');
                    pullRefreshIcon.style.transform = 'rotate(0deg)';
                    pullRefreshText.textContent = '下拉刷新';
                }, 500);
            }
        } else {
            // 未达到阈值，回弹
            pullToRefreshEl.style.transform = 'translateY(-60px)';
            pullToRefreshEl.classList.remove('visible');
            pullRefreshIcon.style.transform = 'rotate(0deg)';
            pullRefreshText.textContent = '下拉刷新';
        }
        
        pullDistance = 0;
    }, { passive: true });
}

// 刷新应用数据
async function refreshAppData() {
    // 如果有 Service Worker，清除缓存并重新获取数据
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        await clearAppCache();
    }
    
    // 重新加载数据
    await fetchManifest();
    
    // 重新渲染当前视图
    if (state.isSearchMode) {
        handleSearch();
    } else {
        const currentMonth = state.manifest?.availableMonths?.[state.currentMonthIndex];
        if (currentMonth) {
            await loadMonth(currentMonth);
        }
    }
}

// 清除应用缓存
async function clearAppCache() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const channel = new MessageChannel();
        return new Promise((resolve) => {
            channel.port1.onmessage = (event) => {
                resolve(event.data);
            };
            
            navigator.serviceWorker.controller.postMessage({
                type: 'CLEAR_CACHE'
            }, [channel.port2]);
        });
    }
}

// Enhanced haptic feedback support
function hapticFeedback(type = 'light') {
    if (!navigator.vibrate) return;
    
    const patterns = {
        light: [10],
        medium: [20],
        heavy: [50],
        success: [10, 50, 10],
        error: [50, 100, 50],
        warning: [30, 50, 30],
        tap: [5],
        longPress: [10, 20, 10]
    };
    
    navigator.vibrate(patterns[type] || patterns.light);
}

// Enhanced scroll performance with intersection observer
function initializeScrollOptimizations() {
    // 优化滚动性能
    let ticking = false;
    
    function updateScrollPosition() {
        updateReadingProgress();
        
        // 背景更新返回顶部按钮状态
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
        
        ticking = false;
    }
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateScrollPosition);
            ticking = true;
        }
    }, { passive: true });
    
    // 使用 Intersection Observer 优化元素可见性检测
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        };
        
        const cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const card = entry.target;
                if (entry.isIntersecting) {
                    // 卡片进入视窗
                    card.classList.add('visible');
                    // 记录阅读行为
                    const paperId = card.id.replace('card-', '');
                    if (paperId && state.allPapers.has(paperId)) {
                        recordPaperView(paperId);
                    }
                } else {
                    // 卡片离开视窗
                    card.classList.remove('visible');
                }
            });
        }, observerOptions);
        
        // 观察所有论文卡片
        setTimeout(() => {
            document.querySelectorAll('.paper-card').forEach(card => {
                cardObserver.observe(card);
            });
        }, 1000);
        
        // 存储 observer 以便后续使用
        state.cardObserver = cardObserver;
    }
}

// 记录论文浏览行为
function recordPaperView(paperId) {
    const now = Date.now();
    const lastView = state.readingHistory.viewedPapers.get(paperId);
    
    // 防止重复记录（5秒内的重复浏览）
    if (!lastView || (now - lastView.timestamp > 5000)) {
        state.readingHistory.viewedPapers.set(paperId, {
            timestamp: now,
            duration: 0,
            interactions: (lastView?.interactions || 0) + 1
        });
        
        // 更新阅读统计
        updateReadingStats();
    }
}

// 更新阅读统计
function updateReadingStats() {
    const today = new Date().toDateString();
    const todayViews = Array.from(state.readingHistory.viewedPapers.values())
        .filter(view => new Date(view.timestamp).toDateString() === today);
    
    // 更新每日阅读目标进度
    const dailyProgress = document.getElementById('daily-reading-progress');
    if (dailyProgress) {
        const target = state.userPreferences.readingGoals.dailyTarget || 5;
        const progress = Math.min((todayViews.length / target) * 100, 100);
        dailyProgress.style.width = `${progress}%`;
    }
    
    // 保存阅读历史
    try {
        localStorage.setItem('arxiv_reading_history', JSON.stringify({
            viewedPapers: Array.from(state.readingHistory.viewedPapers.entries()),
            lastUpdated: Date.now()
        }));
    } catch (error) {
        console.warn('Failed to save reading history:', error);
    }
}

// App shortcuts support (when installed as PWA)
function handleAppShortcuts() {
    // 监听快捷方式启动
    if ('launchQueue' in window && 'files' in LaunchParams.prototype) {
        launchQueue.setConsumer((launchParams) => {
            if (launchParams.targetURL) {
                const url = new URL(launchParams.targetURL);
                const action = url.searchParams.get('action');
                
                switch (action) {
                    case 'search':
                        searchInput.focus();
                        break;
                    case 'favorites':
                        performTagSearch('favorites');
                        break;
                }
            }
        });
    }
}

// Enhanced keyboard navigation for mobile
function enhanceKeyboardNavigation() {
    // 改进移动端键盘导航
    document.addEventListener('keydown', (e) => {
        // 如果是虚拟键盘上的搜索键
        if (e.key === 'Enter' && e.target === searchInput) {
            e.preventDefault();
            handleSearch();
            searchInput.blur(); // 隐藏虚拟键盘
        }
    });
    
    // 监听虚拟键盘显示/隐藏 (实验性API)
    if ('virtualKeyboard' in navigator) {
        navigator.virtualKeyboard.addEventListener('geometrychange', (event) => {
            const { height } = event.target.boundingRect;
            const isVisible = height > 0;
            
            document.documentElement.style.setProperty(
                '--keyboard-height', 
                isVisible ? `${height}px` : '0px'
            );
            
            // 调整底部导航栏位置
            const bottomNav = document.querySelector('.mobile-bottom-nav');
            if (bottomNav) {
                bottomNav.style.transform = isVisible ? `translateY(-${height}px)` : '';
            }
        });
    }
}

// Install prompt handling
function handleInstallPrompt() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        // 阻止默认的安装提示
        e.preventDefault();
        deferredPrompt = e;
        
        // 显示自定义安装按钮
        const installBtn = document.getElementById('install-app-btn');
        if (installBtn) {
            installBtn.style.display = 'block';
            installBtn.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    
                    if (outcome === 'accepted') {
                        showToast('应用安装成功！', 'success');
                        hapticFeedback('success');
                    }
                    
                    deferredPrompt = null;
                    installBtn.style.display = 'none';
                }
            });
        }
    });
    
    // 检测应用是否已安装
    window.addEventListener('appinstalled', () => {
        showToast('欢迎使用 InsightArxiv 应用！', 'success');
        hapticFeedback('success');
        
        // 隐藏安装提示
        const installBtn = document.getElementById('install-app-btn');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    });
}

// --- Network Status and Offline Handling ---
function initializeNetworkStatus() {
    const networkStatus = document.getElementById('network-status');
    const networkStatusText = document.getElementById('network-status-text');
    
    function updateNetworkStatus() {
        const isOnline = navigator.onLine;
        
        if (isOnline) {
            networkStatus.classList.add('hidden');
            networkStatus.classList.remove('bg-orange-500');
            networkStatus.classList.add('bg-green-500');
            networkStatusText.textContent = '网络连接已恢复';
            
            // 自动隐藏恢复提示
            setTimeout(() => {
                networkStatus.classList.add('hidden');
            }, 3000);
            
        } else {
            networkStatus.classList.remove('hidden', 'bg-green-500');
            networkStatus.classList.add('bg-orange-500');
            networkStatusText.textContent = '网络连接已断开，正在使用离线模式';
        }
    }
    
    // 监听网络状态变化
    window.addEventListener('online', () => {
        console.log('网络已连接');
        updateNetworkStatus();
        showToast('网络连接已恢复', 'success');
        
        // 尝试同步离线期间的数据
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SYNC_DATA'
            });
        }
    });
    
    window.addEventListener('offline', () => {
        console.log('网络已断开');
        updateNetworkStatus();
        showToast('网络连接已断开，将使用离线模式', 'warning');
    });
    
    // 初始状态检查
    updateNetworkStatus();
}

// 初始化所有移动端增强功能
function initializeMobileEnhancements() {
    initializeNetworkStatus();
    
    if (state.mobile.isTouchDevice) {
        initializePullToRefresh();
        enhanceKeyboardNavigation();
        
        // 添加触觉反馈到各种交互
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, .keyword-tag, .month-btn');
            if (target) {
                hapticFeedback('tap');
            }
        });
        
        // 长按反馈
        let longPressTimer;
        document.addEventListener('touchstart', (e) => {
            const target = e.target.closest('.paper-card, .favorite-btn');
            if (target) {
                longPressTimer = setTimeout(() => {
                    hapticFeedback('longPress');
                }, 500);
            }
        });
        
        document.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
        });
    }
    
    initializeScrollOptimizations();
    handleAppShortcuts();
    handleInstallPrompt();
}

// 导出引用格式的辅助函数
function formatPaperCitation(paper, format = 'apa') {
    const authors = paper.authors ? paper.authors.split(',').map(a => a.trim()).slice(0, 3) : ['Unknown'];
    const year = paper.date ? paper.date.split('-')[0] : new Date().getFullYear();
    const title = paper.title || 'Untitled';

    switch (format) {
        case 'apa':
            const authorList = authors.length > 3 ? `${authors[0]}, et al.` : authors.join(', ');
            return `${authorList} (${year}). ${title}. arXiv preprint arXiv:${paper.id}.`;

        case 'mla':
            const mlaAuthor = authors[0] ? authors[0].split(' ').reverse().join(', ') : 'Unknown';
            return `${mlaAuthor}. "${title}" arXiv preprint arXiv:${paper.id} (${year}).`;

        case 'chicago':
            return `${authors.join(', ')}. "${title}" arXiv preprint arXiv:${paper.id} (${year}).`;

        default:
            return `${authors.join(', ')} - ${title} (${year}) - arXiv:${paper.id}`;
    }
}

// 增强的分享功能
function enhancedSharePaper(paperId, format = 'link') {
    const paper = state.allPapers.get(paperId);
    if (!paper) return;

    let shareText = '';

    switch (format) {
        case 'citation':
            shareText = formatPaperCitation(paper, 'apa');
            break;
        case 'formatted':
            shareText = `📖 ${paper.title}\n👥 ${paper.authors || 'Unknown'}\n🔗 https://arxiv.org/abs/${paper.id}\n\n📄 ${(paper.abstract || '').slice(0, 200)}...`;
            break;
        case 'simple':
            shareText = `${paper.title} - https://arxiv.org/abs/${paper.id}`;
            break;
        default:
            shareText = `https://arxiv.org/abs/${paper.id}`;
    }

    if (navigator.share) {
        navigator.share({
            title: paper.title,
            text: shareText,
            url: `https://arxiv.org/abs/${paper.id}`
        });
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            showToast('分享内容已复制到剪贴板');
        });
    }

    // 记录分享行为
    recordPaperInteraction(paperId, 'share');
}

// 重写原有的sharePaper函数以使用增强版本
// 开发者工具：在控制台暴露一些有用的函数
if (typeof window !== 'undefined') {
    window.arxivDevTools = {
        resetFirstVisit: resetFirstVisitState,
        startTutorial: startTutorial,
        showTooltip: showFeatureTooltip,
        resetTutorial: resetTutorial,
        state: state,
        // 个性化功能调试接口
        personalization: {
            exportData: exportUserData,
            importData: importUserData,
            generateRecommendations: generateRecommendations,
            recordInteraction: recordPaperInteraction,
            updateStats: updatePersonalizationUI,
            clearAllData: clearAllUserData,
            showRecommendations: showRecommendationsPanel,
            addCategory: addCustomCategory,
            removeCategory: removeCustomCategory,
            getReadingStats: () => ({
                totalPapers: state.readingHistory.viewedPapers.size,
                favorites: state.favorites.size,
                notes: state.paperNotes.size,
                tags: state.paperTags.size,
                ratings: state.paperRatings.size,
                currentStreak: state.userPreferences.readingGoals.currentStreak,
                longestStreak: state.userPreferences.readingGoals.longestStreak
            }),
            simulateReading: (count = 10) => {
                // 模拟阅读行为用于测试
                const paperIds = Array.from(state.allPapers.keys()).slice(0, count);
                paperIds.forEach((id, index) => {
                    setTimeout(() => {
                        recordPaperInteraction(id, 'view', Math.random() * 30000 + 5000);
                    }, index * 100);
                });
                console.log(`模拟了${count}篇论文的阅读行为`);
            }
        }
    };
    console.log('🛠️ 开发者工具已加载，使用 window.arxivDevTools 访问');
    console.log('📊 个性化功能调试: window.arxivDevTools.personalization');
}

// Check if async image processing with OffscreenCanvas is supported
function checkAsyncImageProcessingSupport() {
    const preferences = state.userPreferences.workerPreferences;
    
    // Check user preference (add this to user preferences if not exists)
    if (preferences.enableAsyncImageProcessing === false) {
        return false;
    }
    
    // Check browser support
    if (typeof Worker === 'undefined') {
        return false;
    }
    
    // OffscreenCanvas is supported in Worker context if transferable objects are available
    try {
        return typeof OffscreenCanvas !== 'undefined' && 
               typeof Worker !== 'undefined' &&
               'transferControlToOffscreen' in document.createElement('canvas');
    } catch (e) {
        return false;
    }
}

// Initialize OffscreenCanvas for async processing if supported
function initializeAsyncImageProcessing() {
    if (!checkAsyncImageProcessingSupport()) {
        return null;
    }
    
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        
        if ('transferControlToOffscreen' in canvas) {
            const offscreen = canvas.transferControlToOffscreen();
            return offscreen;
        }
    } catch (error) {
        console.warn('Failed to initialize OffscreenCanvas:', error);
    }
    
    return null;
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 InsightArxiv 开始初始化...');
    
    try {
        // 基础初始化
        detectFirstVisit();
        initializeTheme();
        loadSearchHistory();
        initializeSearchSuggestions();
        setupEventListeners();
        updateSearchStickiness();
        
        // 移动端功能初始化
        if (state.mobile.isTouchDevice) {
            initializeMobileFeatures();
            initializeMobileEnhancements();
        }
        
        // PWA 和离线功能
        await initializeServiceWorker();
        
        // 用户引导系统
        initializeUserGuidance();
        
        // 性能优化
        preloadCriticalData();
        
        // 数据加载
        await init();
        
        console.log('✅ InsightArxiv 初始化完成');
        
    } catch (error) {
        console.error('❌ 初始化失败:', error);
        showToast('应用初始化失败，请刷新重试', 'error');
    }
});