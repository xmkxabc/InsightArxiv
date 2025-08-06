
// --- 全局状态管理 ---
const state = {
    manifest: null, searchIndex: null, categoryIndex: null, allPapers: new Map(),
    loadedMonths: new Set(), currentMonthIndex: -1, isFetching: false, isSearchMode: false,
    navObserver: null, currentQuery: '', favorites: new Set(), viewMode: 'detailed',
    allCategories: [],
    mainCategories: ['cs.CV', 'cs.LG', 'cs.CL', 'cs.AI', 'cs.RO', 'stat.ML'],
    // 新增：用户提供的支持分类列表 (已去重)
    supportedCategories: [
        "cs.AI", "cs.AR", "cs.CC", "cs.CE", "cs.CG", "cs.CL", "cs.CR", "cs.CV", "cs.CY", "cs.DB", "cs.DC", "cs.DL", "cs.DM", "cs.DS", "cs.ET", "cs.FL", "cs.GL", "cs.GR", "cs.GT", "cs.HC", "cs.IR", "cs.IT", "cs.LG", "cs.LO", "cs.MA", "cs.MM", "cs.MS", "cs.NA", "cs.NE", "cs.NI", "cs.OH", "cs.OS", "cs.PF", "cs.PL", "cs.RO", "cs.SC", "cs.SD", "cs.SE", "cs.SI", "cs.SY", "eess.AS", "eess.IV", "eess.SP", "eess.SY", "math.NA", "stat.AP", "q-fin.MF"
    ],
    currentSearchResults: [],
    activeCategoryFilter: null, // 修改：用于日期下的分类筛选
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
    },
    lazyObserver: null, // [FINAL-FIX] 用于存储懒加载观察器实例
    // [FINAL-FIX] 新增：用于防止异步渲染冲突的会话ID
    renderSessionId: 0,
    // monthLoaderObserver: null, // [NEW] 用于存储“加载下一月”的观察者实例
    // [NEW] 添加用于虚拟滚动的状态
    virtualScroll: {
        enabled: true,
        allPapersToRender: [], // 当前需要渲染的所有论文
        renderedIndex: 0,      // 已经渲染到的索引
        batchSize: 20,         // 每次加载20篇
        observer: null         // 用于监听哨兵元素的 observer
    }
};

// --- 工具函数 ---

// 调试函数：检查日期处理是否正确
function debugDateParsing(dateString, description = '') {
    console.log(`🔍 日期解析调试 ${description}:`, {
        原始字符串: dateString,
        '使用new Date()': new Date(dateString).toString(),
        '本地时间': new Date(dateString).toLocaleString(),
        '仅日期部分': new Date(dateString).toLocaleDateString(),
        '字符串解析': {
            年: dateString.split('-')[0],
            月: parseInt(dateString.split('-')[1], 10),
            日: parseInt(dateString.split('-')[2], 10)
        }
    });
}

// 根据月份字符串获取论文ID前缀
function getMonthPrefix(month) {
    // 例如: "2025-07" -> "2507"
    return month.replace('-', '').substring(2);
}

// 筛选指定月份的论文 - 基于日期字段而不是ID前缀
function filterPapersByMonth(month) {
    console.log(`筛选月份: ${month}`);
    const filtered = Array.from(state.allPapers.values())
        .filter(p => p.date && p.date.startsWith(month))
        .sort((a, b) => b.date.localeCompare(a.date));
    console.log(`找到 ${filtered.length} 篇 ${month} 的论文`);
    return filtered;
}

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
// 移动端底部导航
const mobileBottomNav = document.querySelector('.mobile-bottom-nav');
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
        
        
         // [CRITICAL FIX] 智能卸载旧月份数据，防止状态污染
        // 仅在非搜索模式下运行，以避免意外清理搜索所需的数据
        if (!state.isSearchMode) {
            const maxLoadedMonths = 3; // 内存中仅保留最近的3个（或更少）月份的数据

            if (state.loadedMonths.size > maxLoadedMonths) {
                // 获取所有已加载的月份，并按时间倒序排序（最新的在前）
                const sortedLoadedMonths = Array.from(state.loadedMonths).sort().reverse();
                
                // 确定要卸载的月份（保留最新的 maxLoadedMonths 个）
                const monthsToUnload = sortedLoadedMonths.slice(maxLoadedMonths);
                
                if (monthsToUnload.length > 0) {
                    console.log(`🧹 Memory cleanup: Unloading ${monthsToUnload.length} old month(s): ${monthsToUnload.join(', ')}`);
                    const monthsToUnloadSet = new Set(monthsToUnload);
                    let keysToDeleteCount = 0;

                    // 从 state.allPapers 中删除属于这些旧月份的论文
                    for (const paperId of state.allPapers.keys()) {
                        // 从论文ID推断月份，例如 '2507.12345' -> '2025-07'
                        const paperMonth = `20${paperId.substring(0, 2)}-${paperId.substring(2, 4)}`;
                        if (monthsToUnloadSet.has(paperMonth)) {
                            state.allPapers.delete(paperId);
                            keysToDeleteCount++;
                        }
                    }

                    // 从 state.loadedMonths 中移除已卸载的月份记录
                    monthsToUnload.forEach(month => state.loadedMonths.delete(month));

                    console.log(`🧹 Memory cleanup: Removed ${keysToDeleteCount} papers. New total: ${state.allPapers.size}.`);
                }
            }
        }
        // Also cleanup old worker tracking data
        this.cleanupWorkerData();
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

/**
 * [NEW] 在文本中高亮显示搜索查询（短语优先）
 * @param {string} text - 要处理的原始文本
 * @param {string} query - 用户的搜索查询
 * @returns {string} - 包含高亮HTML的文本
 */
function highlightText(text, query) {
    if (!text || !query || query.length < 2) { // 不高亮过短的查询
        return text;
    }

    // 策略1：优先高亮完整短语（不区分大小写）
    const escapedQuery = escapeRegex(query);
    const phraseRegex = new RegExp(escapedQuery, 'gi');
    
    if (phraseRegex.test(text)) {
        return text.replace(phraseRegex, match => `<span class="highlight">${match}</span>`);
    }

    // 策略2：如果找不到完整短语，则高亮所有单个词
    const queryTokens = query.toLowerCase().split(/\s+/).filter(token => token.length > 1);
    if (queryTokens.length === 0) {
        return text;
    }
    
    // 使用 | 连接所有词，并用括号捕获，确保只替换匹配的部分
    const tokenRegex = new RegExp(`(${queryTokens.map(escapeRegex).join('|')})`, 'gi');
    
    return text.replace(tokenRegex, match => `<span class="highlight">${match}</span>`);
}

// 智能搜索索引加载函数
async function loadSearchIndex() {
    console.log('🔍 开始智能加载搜索索引...');
    
    try {
        // 首先尝试加载分块清单
        console.log('🔍 尝试加载分块清单...');
        const manifestResponse = await fetch('./data/search_index_manifest.json');
        console.log('📋 分块清单响应状态:', manifestResponse.status);
        
        if (manifestResponse.ok) {
            const manifestText = await manifestResponse.text();
            console.log('📋 清单文件内容长度:', manifestText.length);
            console.log('📋 清单文件开头:', manifestText.substring(0, 100));
            console.log('📋 清单文件结尾:', manifestText.substring(manifestText.length - 100));
            
            try {
                const manifest = JSON.parse(manifestText);
                console.log('📋 找到分块索引清单，使用分块加载模式');
                return await loadChunkedSearchIndex(manifest);
            } catch (parseError) {
                console.error('❌ 分块清单JSON解析失败:', parseError);
                console.error('📋 导致解析失败的内容:', manifestText.substring(0, 200));
                throw new Error(`分块清单JSON解析失败: ${parseError.message}`);
            }
        } else {
            console.log('📋 分块清单响应不成功，状态码:', manifestResponse.status);
        }
    } catch (error) {
        console.warn('📋 分块清单加载失败:', error.message);
    }
    
    
}

// 分块搜索索引加载器
async function loadChunkedSearchIndex(manifest) {
    console.log(`📦 开始加载 ${manifest.chunks.length} 个搜索索引分块...`);
    
    const searchIndex = {};
    let loadedChunks = 0;
    
    // 并行加载所有分块（但限制并发数）
    const chunkPromises = manifest.chunks.map(async (chunk, index) => {
        try {
            const response = await fetch(`./data/${chunk.filename}`);
            const chunkData = await response.json();
            
            // 合并到主索引
            Object.assign(searchIndex, chunkData);
            
            loadedChunks++;
            const progress = (loadedChunks / manifest.chunks.length) * 100;
            updateProgress(`加载搜索索引分块 ${loadedChunks}/${manifest.chunks.length}...`, 20 + progress * 0.3);
            
            console.log(`✅ 分块 ${chunk.key} 加载完成 (${chunk.wordCount} 词汇)`);
        } catch (error) {
            console.error(`❌ 分块 ${chunk.filename} 加载失败:`, error);
            throw error;
        }
    });
    
    await Promise.all(chunkPromises);
    
    console.log(`🎉 所有搜索索引分块加载完成！总计 ${Object.keys(searchIndex).length} 词汇`);
    return searchIndex;
}

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

// --- 日期筛选功能 (全面重构) ---
// 统一的日期筛选状态
let currentDateFilter = {
    startDate: null,
    endDate: null,
    period: null,
    source: null  // 记录筛选来源：'quick', 'custom', 'daily', 'monthly'
};

// 🔧 核心日期筛选函数 - 统一处理所有类型的日期筛选
function applyDateFilter(startDate, endDate, period = 'custom', source = 'unknown') {
    console.log(`🎯 应用日期筛选:`, { startDate, endDate, period, source });
    
    // 清除所有其他筛选器的激活状态
    clearAllDateFilterActiveStates();
    
    // 设置新的筛选条件
    currentDateFilter = { startDate, endDate, period, source };
    
    // 更新显示
    if (startDate && endDate) {
        if (startDate === endDate) {
            // 单日筛选
            const dateParts = startDate.split('-');
            const month = parseInt(dateParts[1], 10);
            const day = parseInt(dateParts[2], 10);
            updateDateFilterDisplay(`${month}月${day}日`);
        } else {
            // 日期范围筛选
            const startParts = startDate.split('-');
            const endParts = endDate.split('-');
            const startMonth = parseInt(startParts[1], 10);
            const startDay = parseInt(startParts[2], 10);
            const endMonth = parseInt(endParts[1], 10);
            const endDay = parseInt(endParts[2], 10);
            updateDateFilterDisplay(`${startMonth}/${startDay} - ${endMonth}/${endDay}`);
        }
    } else {
        updateDateFilterDisplay('');
    }
    
    // 应用筛选
    if (state.isSearchMode && state.currentSearchResults.length > 0) {
        renderFilteredResults_FIXED();
    } else {
        showToast('日期筛选主要用于搜索结果。', 'info');
    }
    
    console.log(`✅ 日期筛选已应用:`, currentDateFilter);
    
    // 🔧 调试：立即验证筛选结果
    if (state.isSearchMode && state.currentSearchResults.length > 0 && currentDateFilter.startDate === currentDateFilter.endDate) {
        const targetDate = currentDateFilter.startDate;
        console.log(`🔬 立即验证筛选效果，目标日期: ${targetDate}`);
        
        setTimeout(() => {
            // 检查当前显示的论文卡片
            const displayedCards = document.querySelectorAll('#search-results-container .paper-card');
            console.log(`🔍 当前显示的论文卡片数量: ${displayedCards.length}`);
            
            let correctCount = 0;
            let incorrectCount = 0;
            
            displayedCards.forEach((card, index) => {
                const paperId = card.id.replace('card-', '');
                const paper = state.allPapers.get(paperId);
                
                if (paper && paper.date) {
                    const paperDate = paper.date.includes('T') ? paper.date.split('T')[0] : paper.date;
                    if (paperDate === targetDate) {
                        correctCount++;
                    } else {
                        incorrectCount++;
                        console.error(`❌ 发现错误显示的论文: ${paperId}, 日期 ${paperDate}, 期望 ${targetDate}`);
                    }
                }
            });
            
            console.log(`🎯 验证结果: 正确 ${correctCount} 篇, 错误 ${incorrectCount} 篇`);
            
            if (incorrectCount > 0) {
                console.error(`🚨 发现 ${incorrectCount} 篇错误显示的论文！`);
                showToast(`检测到显示错误，正在自动修复...`, 'warning');
                // 如果发现错误，重新渲染
                renderFilteredResults_FIXED();
            } else if (correctCount > 0) {
                // 显示成功消息
                const dateParts = targetDate.split('-');
                const month = parseInt(dateParts[1], 10);
                const day = parseInt(dateParts[2], 10);
                showToast(`✅ 已筛选出 ${month}月${day}日 的 ${correctCount} 篇论文`, 'success');
            }
        }, 100); // 延迟100ms等待DOM更新
    }
}

// 🧹 清除所有日期筛选按钮的激活状态
function clearAllDateFilterActiveStates() {
    // 快捷筛选按钮
    document.querySelectorAll('.date-quick-filter').forEach(btn => 
        btn.classList.remove('active'));
    
    // 每日分布筛选按钮
    document.querySelectorAll('#daily-distribution-filters .date-filter-btn').forEach(btn => 
        btn.classList.remove('active'));
    
    // 月份内日期筛选按钮
    document.querySelectorAll('[data-action="filter-by-date"]').forEach(btn => 
        btn.classList.remove('active'));
}

// 🔄 重置日期筛选
function clearDateFilter() {
    console.log(`🔄 清除日期筛选`);
    
    currentDateFilter = { startDate: null, endDate: null, period: null, source: null };
    updateDateFilterDisplay('');
    clearAllDateFilterActiveStates();

    // 清除输入值
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';

    // 应用更改
    if (state.isSearchMode && state.currentSearchResults.length > 0) {
        renderFilteredResults_FIXED();
    } else {
        resetToDefaultView();
    }

    showToast('已清除日期筛选');
}

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

                    applyDateFilter(startDate, endDate, 'custom', 'custom');
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
    console.log(`📅 应用快捷日期筛选: ${period}`);
    
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
            // 清除筛选
            applyDateFilter(null, null, null, 'quick');
            return;
    }

    // 设置按钮激活状态
    document.querySelectorAll('.date-quick-filter').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === period);
    });

    // 隐藏面板
    const dateFilterPanel = document.getElementById('date-filter-panel');
    if (dateFilterPanel) dateFilterPanel.classList.add('hidden');

    // 应用筛选
    applyDateFilter(startDate, endDate, period, 'quick');
    showToast(`已应用${displayText}筛选`);
}

// 🔧 弃用的函数 - 使用统一的 applyDateFilter
function applyCustomDateFilter(startDate, endDate) {
    console.warn('⚠️ applyCustomDateFilter 已弃用，请使用 applyDateFilter');
    applyDateFilter(startDate, endDate, 'custom', 'custom');
}

// 🔧 统一的显示更新函数
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

// 🔧 弃用的函数 - 使用统一的 applyDateFilter 或 renderFilteredResults
function filterPapersByDate() {
    console.warn('⚠️ filterPapersByDate 已弃用，筛选逻辑已集成到 applyDateFilter 中');
    if (state.isSearchMode && state.currentSearchResults.length > 0) {
        renderFilteredResults_FIXED();
    } else {
        showToast('日期筛选主要用于搜索结果。', 'info');
    }
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// 🔥 超级严格的日期筛选函数 - 确保绝对准确
function applySuperStrictDateFilter(papers) {
    if (!currentDateFilter.startDate || !currentDateFilter.endDate) {
        console.log(`🔍 无日期筛选条件，返回全部 ${papers.length} 篇论文`);
        return papers;
    }

    console.log(`🔥 SUPER STRICT 日期筛选开始:`, {
        筛选条件: currentDateFilter,
        输入论文数量: papers.length,
        是否单日筛选: currentDateFilter.startDate === currentDateFilter.endDate
    });

    const isSingleDayFilter = currentDateFilter.startDate === currentDateFilter.endDate;
    const targetDate = currentDateFilter.startDate;
    
    console.log(`🎯 筛选模式: ${isSingleDayFilter ? '单日筛选' : '日期范围筛选'}, 目标日期: ${targetDate}`);
    
    // 🔥 超级严格筛选：多重验证
    const filtered = papers.filter((paper, index) => {
        console.log(`🔍 检查论文 ${index + 1}/${papers.length}: ${paper.id}`);
        
        // 检查1: 论文必须有日期
        if (!paper.date) {
            console.warn(`❌ 论文 ${paper.id} 没有日期信息`);
            return false;
        }
        
        // 检查2: 提取日期字符串
        let paperDateStr;
        if (typeof paper.date !== 'string') {
            console.warn(`❌ 论文 ${paper.id} 日期不是字符串: ${typeof paper.date}`);
            return false;
        }
        
        if (paper.date.includes('T')) {
            paperDateStr = paper.date.split('T')[0];
        } else {
            paperDateStr = paper.date;
        }
        
        // 检查3: 验证日期格式
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(paperDateStr)) {
            console.warn(`❌ 论文 ${paper.id} 日期格式无效: "${paperDateStr}"`);
            return false;
        }
        
        // 检查4: 验证目标日期格式
        if (!dateRegex.test(targetDate)) {
            console.error(`❌ 目标日期格式无效: "${targetDate}"`);
            return false;
        }
        
        // 检查5: 执行匹配
        let matches = false;
        
        if (isSingleDayFilter) {
            // 单日筛选：必须完全匹配
            matches = paperDateStr === targetDate;
            
            // 额外验证：字符串长度和内容
            if (matches) {
                if (paperDateStr.length === 10 && targetDate.length === 10) {
                    console.log(`✅ 论文 ${paper.id} 完全匹配目标日期 ${targetDate}`);
                } else {
                    console.warn(`⚠️ 日期长度异常: ${paperDateStr}(${paperDateStr.length}) vs ${targetDate}(${targetDate.length})`);
                    matches = false;
                }
            } else {
                console.log(`❌ 论文 ${paper.id} 日期 "${paperDateStr}" 不匹配目标 "${targetDate}"`);
            }
        } else {
            // 范围筛选
            matches = paperDateStr >= currentDateFilter.startDate && paperDateStr <= currentDateFilter.endDate;
            if (matches) {
                console.log(`✅ 论文 ${paper.id} 在日期范围内`);
            }
        }
        
        return matches;
    });

    console.log(`🔥 SUPER STRICT 筛选完成:`, {
        筛选前数量: papers.length,
        筛选后数量: filtered.length,
        筛选模式: isSingleDayFilter ? '单日筛选' : '范围筛选',
        目标日期: targetDate
    });

    // 🔥 终极验证：再次检查结果
    if (isSingleDayFilter && filtered.length > 0) {
        console.log(`🔥 执行终极验证...`);
        const allDates = filtered.map(p => {
            const paperDate = p.date.includes('T') ? p.date.split('T')[0] : p.date;
            return paperDate;
        });
        
        const uniqueDates = [...new Set(allDates)];
        console.log(`🔍 结果中的所有日期: [${allDates.join(', ')}]`);
        console.log(`🔍 去重后的日期: [${uniqueDates.join(', ')}]`);
        
        if (uniqueDates.length === 1 && uniqueDates[0] === targetDate) {
            console.log(`🎉 终极验证成功：所有 ${filtered.length} 篇论文都属于 ${targetDate}`);
        } else {
            console.error(`🚨 终极验证失败！期望只有 [${targetDate}]，实际有 [${uniqueDates.join(', ')}]`);
            
            // 最后的强制修正
            const corrected = filtered.filter(p => {
                const paperDate = p.date.includes('T') ? p.date.split('T')[0] : p.date;
                return paperDate === targetDate;
            });
            
            console.log(`🔧 强制修正：从 ${filtered.length} 修正为 ${corrected.length} 篇论文`);
            return corrected;
        }
    }

    return filtered;
}

// 修改搜索函数以支持日期筛选
function applyDateFilterToResults(papers) {
    if (!currentDateFilter.startDate || !currentDateFilter.endDate) {
        console.log(`🔍 无日期筛选条件，返回全部 ${papers.length} 篇论文`);
        return papers;
    }

    console.log(`🔍 应用日期筛选调试:`, {
        筛选条件: currentDateFilter,
        输入论文数量: papers.length,
        是否单日筛选: currentDateFilter.startDate === currentDateFilter.endDate
    });

    // 确定是单日筛选还是范围筛选
    const isSingleDayFilter = currentDateFilter.startDate === currentDateFilter.endDate;
    const targetDate = currentDateFilter.startDate;
    
    console.log(`🎯 筛选模式: ${isSingleDayFilter ? '单日筛选' : '日期范围筛选'}, 目标日期: ${targetDate}`);
    
    const filtered = papers.filter(paper => {
        if (!paper.date) {
            console.warn(`⚠️ 论文 ${paper.id} 没有日期信息`);
            return false;
        }
        
        // 提取论文的日期部分，确保格式统一为 YYYY-MM-DD
        let paperDateStr;
        if (paper.date.includes('T')) {
            paperDateStr = paper.date.split('T')[0];
        } else {
            paperDateStr = paper.date;
        }
        
        // 验证日期格式
        const isValidDateFormat = /^\d{4}-\d{2}-\d{2}$/.test(paperDateStr);
        if (!isValidDateFormat) {
            console.warn(`⚠️ 论文 ${paper.id} 日期格式无效: ${paper.date} -> ${paperDateStr}`);
            return false;
        }
        
        let matches = false;
        
        if (isSingleDayFilter) {
            // 单日筛选：必须完全匹配目标日期
            matches = paperDateStr === targetDate;
            
            // 🔧 额外验证：确保字符串比较的严格性
            if (matches) {
                // 再次验证日期字符串格式和内容
                if (paperDateStr.length !== 10 || targetDate.length !== 10 || 
                    !/^\d{4}-\d{2}-\d{2}$/.test(paperDateStr) || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
                    console.warn(`⚠️ 日期格式验证失败: ${paperDateStr} vs ${targetDate}`);
                    matches = false;
                } else {
                    console.log(`✅ 论文 ${paper.id} 严格匹配目标日期 ${targetDate}`);
                }
            } else {
                console.log(`❌ 论文 ${paper.id} 日期 ${paperDateStr} 不匹配目标日期 ${targetDate}`);
            }
        } else {
            // 范围筛选：在开始和结束日期之间
            matches = paperDateStr >= currentDateFilter.startDate && paperDateStr <= currentDateFilter.endDate;
        }
        
        return matches;
    });

    console.log(`🎯 日期筛选结果摘要:`, {
        筛选前数量: papers.length,
        筛选后数量: filtered.length,
        筛选模式: isSingleDayFilter ? '单日筛选' : '范围筛选',
        目标日期: targetDate
    });

    // 验证筛选结果：如果是单日筛选，确保所有结果都是目标日期
    if (isSingleDayFilter && filtered.length > 0) {
        const resultDates = [...new Set(filtered.map(p => 
            p.date.includes('T') ? p.date.split('T')[0] : p.date
        ))];
        
        console.log(`� 筛选结果包含的日期: ${resultDates.join(', ')}`);
        
        if (resultDates.length === 1 && resultDates[0] === targetDate) {
            console.log(`✅ 单日筛选成功：所有 ${filtered.length} 篇论文都属于 ${targetDate}`);
        } else {
            console.error(`❌ 单日筛选失败！期望只有 ${targetDate}，但包含: ${resultDates.join(', ')}`);
            
            // 🔧 无论如何都强制过滤，确保只返回目标日期的论文
            const correctedFiltered = filtered.filter(p => {
                const paperDate = p.date.includes('T') ? p.date.split('T')[0] : p.date;
                return paperDate === targetDate;
            });
            
            console.log(`🔧 强制修正：从 ${filtered.length} 修正为 ${correctedFiltered.length} 篇论文`);
            
            // 显示有问题的论文信息（调试用）
            const problemPapers = filtered.filter(p => {
                const paperDate = p.date.includes('T') ? p.date.split('T')[0] : p.date;
                return paperDate !== targetDate;
            });
            
            if (problemPapers.length > 0) {
                console.error(`❌ 被过滤掉的论文 (${problemPapers.length}篇):`, 
                    problemPapers.slice(0, 3).map(p => ({
                        id: p.id,
                        date: p.date,
                        paperDate: p.date.includes('T') ? p.date.split('T')[0] : p.date,
                        title: p.title.substring(0, 30) + '...'
                    }))
                );
            }
            
            filtered = correctedFiltered; // 使用修正后的结果
        }
    }

    return filtered;
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
/**
 * [FINAL & VERIFIED] 应用初始化函数
 * 
 * 职责:
 * 1. 加载所有基础设置（收藏、主题、历史等）。
 * 2. 加载核心数据清单（index.json）和分类索引。
 * 3. 设置UI组件和全局事件监听器。
 * 4. 解析URL参数，决定应用的初始状态：
 *    - 如果有 paper ID，则直接导航到该论文。
 *    - 如果有搜索查询，则执行搜索。
 *    - 否则，加载默认的首页视图（最新的月份）。
 * 5. 处理所有可能的初始化错误，并向用户显示清晰的错误信息。
 */
async function init() {
    console.log('开始初始化...');
    showProgress('正在初始化...');
    
    try {
        // --- 1. 基础设置加载 ---
        injectStyles();
        hideLoadError();
        console.log('加载基础设置...');
        
        // 使用 try-catch 包装每个设置加载，增加容错性
        try { loadFavorites(); } catch (e) { console.warn('loadFavorites error:', e); }
        try { loadViewMode(); } catch (e) { console.warn('loadViewMode error:', e); }
        try { loadSearchHistory(); } catch (e) { console.warn('loadSearchHistory error:', e); }
        try { initializeTheme(); } catch (e) { console.warn('initializeTheme error:', e); }
        try { initializeSearchSuggestions(); } catch (e) { console.warn('initializeSearchSuggestions error:', e); }
        try {
            loadPaperTags();
            loadPaperNotes();
            loadPaperRatings();
            loadUserPreferences();
            loadReadingHistory();
        } catch (e) {
            console.warn('加载用户个性化设置时出现警告:', e);
        }
        try {
            if (typeof initializeUserGuidance === 'function') {
                initializeUserGuidance();
            }
        } catch (e) {
            console.warn('初始化用户引导时出现警告:', e);
        }

        // --- 2. 核心数据清单加载 ---
        console.log('开始加载数据清单...');
        const response = await fetch('./data/index.json');
        if (!response.ok) {
            throw new Error(`无法获取核心数据清单 (HTTP ${response.status})`);
        }
        state.manifest = await response.json();
        console.log('数据清单加载成功:', state.manifest);

        // 加载分类索引
        try {
            const catResponse = await fetch('./data/category_index.json');
            if (catResponse.ok) {
                state.categoryIndex = await catResponse.json();
                state.allCategories = Object.keys(state.categoryIndex).sort();
                console.log(`分类加载成功，共找到 ${state.allCategories.length} 个分类。`);
            } else {
                 console.warn('分类索引加载失败，部分功能受限。');
            }
        } catch (e) {
            console.warn('加载 category_index.json 失败:', e);
        }

        // --- 3. UI 设置和事件绑定 ---
        if (state.manifest && state.manifest.availableMonths && state.manifest.availableMonths.length > 0) {
            console.log('数据清单有效，开始设置UI和事件...');
            setupUI();
            setupGlobalEventListeners();

            // --- 4. 根据URL参数决定初始视图 ---
            const urlParams = new URLSearchParams(window.location.search);
            const queryFromUrl = urlParams.get('q');
            const paperFromUrl = urlParams.get('paper');

            if (paperFromUrl) {
                console.log(`初始加载：处理直接链接到论文 ${paperFromUrl}`);
                await handleDirectLink(paperFromUrl);
            } else if (queryFromUrl) {
                console.log(`初始加载：处理URL中的搜索查询 "${queryFromUrl}"`);
                searchInput.value = queryFromUrl;
                updateClearButtonVisibility();
                await handleSearch();
            } else {
                // [CRITICAL FIX] 默认加载首页视图
                console.log('初始加载：加载默认首页视图...');
                
                // 确保至少有一个月份可用
                if (state.manifest.availableMonths.length > 0) {
                    // 假设 availableMonths 数组已按降序排列，第一个元素即为最新的月份
                    const latestMonth = state.manifest.availableMonths[0];
                    console.log(`🚀 导航到最新的月份: ${latestMonth}`);
                    
                    // 调用 navigateToMonth 来处理所有事情：骨架屏、数据获取、渲染、UI状态设置。
                    // 这是最健壮和一致的初始加载方式。
                    await navigateToMonth(latestMonth);
                } else {
                    // 如果清单中没有月份，显示错误
                    throw new Error('数据清单中没有可用的月份。');
                }
            }
        } else {
            throw new Error('数据清单为空或无效。');
        }
    } catch (error) {
        console.error("初始化失败:", error);
        // 使用更具体的错误信息
        let errorMessage = '加载应用失败。';
        if (error.message.includes('fetch') || error.message.includes('HTTP')) {
            errorMessage += '请检查您的网络连接以及数据文件是否存在。';
        } else {
            errorMessage += `错误详情: ${error.message}`;
        }
        showLoadError(errorMessage);
    } finally {
        // 无论成功或失败，最后都隐藏顶部的加载进度条
        hideProgress();
        console.log("初始化流程结束。");
    }
}

// [FIX] 添加一个占位函数来解决 'initPaperIdSearch is not defined' 的错误。
// 目前，通过论文ID搜索的逻辑已经集成在 handleSearch 函数中。
// 这个函数暂时留空，以防未来需要为ID搜索添加特定的UI初始化，例如特殊的工具提示或输入框行为。
function initPaperIdSearch() {
    console.log("初始化：论文ID搜索功能 (initPaperIdSearch) 的占位符被调用。");
    // 此处可以添加未来的功能代码
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

// [FIXED] 让 renderPapers 接收 sessionId
function renderPapers(papersForMonth, month, sessionId) {
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
        }

        // [FIXED] 将接收到的 sessionId 传递给 updateMonthView
        updateMonthView(month, papersForMonth, sessionId);

    }, `renderPapers-${month}`);
}

function updateMonthView(month, allPapersForMonth, sessionId) {
    if (sessionId !== state.renderSessionId) {
        console.warn(`👋 渲染会话 ${sessionId} (月份视图) 已过时，中止。`);
        return;
    }

    const dateFilterWrapper = document.getElementById(`date-filter-wrapper-${month}`);
    const papersListWrapper = document.getElementById(`papers-list-wrapper-${month}`);
    
    if (!papersListWrapper) {
        console.error(`Error: Cannot find papers container for month ${month}.`);
        return;
    }

    // --- 1. 确定筛选条件 ---
    const activeDate = (currentDateFilter.startDate && currentDateFilter.startDate === currentDateFilter.endDate) 
        ? currentDateFilter.startDate : null;
    const activeCategory = state.activeCategoryFilter;

    console.log(`🔄 Updating view for ${month}: Date='${activeDate || 'all'}', Category='${activeCategory || 'all'}', Session=${sessionId}`);

    // --- 2. 渲染UI组件 ---
    if (dateFilterWrapper) {
        renderDateFilter(month, allPapersForMonth, dateFilterWrapper);
    }
    if (activeDate) {
        renderDateCategoryFilter(month, activeDate, allPapersForMonth);
    } else {
        const categoryContainer = document.getElementById(`category-filter-${month}`);
        if (categoryContainer) categoryContainer.style.display = 'none';
    }

    // --- 3. 应用筛选 ---
    let filteredPapers = [...allPapersForMonth];
    if (activeDate) {
        filteredPapers = filteredPapers.filter(p => normalizeDateString(p.date) === normalizeDateString(activeDate));
    }
    if (activeCategory) {
        filteredPapers = filteredPapers.filter(p => p.categories && p.categories.includes(activeCategory));
    }

    console.log(`📊 Filtering for ${month}: ${allPapersForMonth.length} initial -> ${filteredPapers.length} final papers.`);
    
    // --- 4. [CRITICAL FIX] 渲染前彻底重置滚动状态和容器 ---
    papersListWrapper.innerHTML = ''; // 清空旧内容
    // 将筛选后的完整列表存入 virtualScroll 状态
    state.virtualScroll.allPapersToRender = filteredPapers;
    state.virtualScroll.renderedIndex = 0; // 重置渲染索引

    // 断开旧的观察者，以防万一
    if (state.virtualScroll.observer) {
        state.virtualScroll.observer.disconnect();
    }
    // --- 重置结束 ---

    // --- 5. 渲染 ---
    if (filteredPapers.length > 0) {
        // 立即渲染第一批
        renderNextBatch();
        // 重新设置观察者来处理后续的滚动
        setupIntersectionObserver();
    } else {
        papersListWrapper.innerHTML = `<p class="text-center text-gray-500 py-4">没有找到符合条件的论文。</p>`;
        loader.classList.add('hidden');
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
        // 修复时区问题：直接从日期字符串解析，避免时区转换导致的日期偏移
        const dateParts = date.split('-');
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10);
        const day = parseInt(dateParts[2], 10);
        const displayDate = `${month}月${day}日`;
        buttonsHTML += `<button class="date-filter-btn flex-shrink-0 ${activeDate === date ? 'active' : ''}" data-action="filter-by-distribution-date" data-date="${date}">${displayDate} <span class="filter-count">${count}</span></button>`;
    });

    filtersEl.innerHTML = buttonsHTML;
    container.classList.remove('hidden');
}

function renderDateFilter(month, papers, container) {
    // 🔥 修复：使用统一的 currentDateFilter 而不是 state.activeDateFilters
    const activeDateFilter = currentDateFilter.startDate && currentDateFilter.endDate 
        ? (currentDateFilter.startDate === currentDateFilter.endDate ? currentDateFilter.startDate : 'range')
        : 'all';

    console.log(`🏠 渲染首页日期筛选器: ${month}, 活跃筛选: ${activeDateFilter}`);

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
    // 优化：直接使用字符串比较而不是Date对象，避免潜在的时区问题
    const sortedDates = Object.keys(dateCounts).sort((a, b) => b.localeCompare(a));

    // "All" button with total count
    let buttonsHTML = `<button class="date-filter-btn ${activeDateFilter === 'all' ? 'active' : ''}" data-action="filter-by-date" data-month="${month}" data-day="all">全部 <span class="filter-count">${papers.length}</span></button>`;

    // Buttons for each day
    sortedDates.forEach(fullDate => {
        const dayOfMonth = parseInt(fullDate.split('-')[2], 10); // Display '15' instead of '15日'
        const count = dateCounts[fullDate];
        // 🔥 修复：比较日期时使用标准化格式
        const normalizedFullDate = normalizeDateString(fullDate);
        const normalizedActiveDate = activeDateFilter !== 'all' && activeDateFilter !== 'range' 
            ? normalizeDateString(activeDateFilter) 
            : activeDateFilter;
        const isActive = normalizedActiveDate === normalizedFullDate;

        buttonsHTML += `
                <button class="date-filter-btn ${isActive ? 'active' : ''}" data-action="filter-by-date" data-month="${month}" data-full-date="${fullDate}">
                    ${dayOfMonth}日 <span class="filter-count">${count}</span>
                </button>
            `;
    });
    
    // 添加分类筛选容器
    buttonsHTML += `
        <div id="category-filter-${month}" class="category-filter-section" style="display: none;">
            <div class="category-filter-scroll-wrapper">
                <!-- 分类按钮将在这里动态生成 -->
            </div>
        </div>
    `;
    
    container.innerHTML = buttonsHTML;
}

// 🆕 渲染日期下的分类筛选器
function renderDateCategoryFilter(month, selectedDate, allPapers) {
    const categoryContainer = document.getElementById(`category-filter-${month}`);
    if (!categoryContainer) return;
    
    // 获取该日期的论文
    const papersForDate = allPapers.filter(paper => {
        const paperDate = normalizeDateString(paper.date);
        const targetDate = normalizeDateString(selectedDate);
        return paperDate === targetDate;
    });
    
    if (papersForDate.length === 0) {
        categoryContainer.style.display = 'none';
        return;
    }
    
    // 统计分类
    const categoryStats = {};
    papersForDate.forEach(paper => {
        if (paper.categories && Array.isArray(paper.categories)) {
            paper.categories.forEach(cat => {
                categoryStats[cat] = (categoryStats[cat] || 0) + 1;
            });
        }
    });
    
    // 按论文数量排序分类，显示全部分类（不限制数量）
    const sortedCategories = Object.entries(categoryStats)
        .sort(([,a], [,b]) => b - a);
    
    if (sortedCategories.length === 0) {
        categoryContainer.style.display = 'none';
        return;
    }
    
    // Apple风格简洁分类按钮HTML
    let categoryHTML = `
        <div class="category-filter-header">
            <div class="flex items-center gap-2">
                <span class="category-filter-title">${selectedDate.split('-')[2]}日分类</span>
                <span class="category-total-count">${papersForDate.length}篇</span>
            </div>
            <button class="category-clear-btn" data-action="clear-category-filter" data-month="${month}">
                清除
            </button>
        </div>
        <div class="category-filter-scroll-wrapper">
            <div class="category-filter-buttons">
    `;
    
    sortedCategories.forEach(([category, count]) => {
        const isActive = state.activeCategoryFilter === category;
        const activeClass = isActive ? 'category-filter-btn-active' : '';
        
        categoryHTML += `
            <button class="category-filter-btn ${activeClass}" 
                    data-action="filter-by-category" 
                    data-category="${category}" 
                    data-month="${month}"
                    data-date="${selectedDate}"
                    title="筛选 ${category} 分类">
                <span class="category-name">${category}</span>
                <span class="category-count">${count}</span>
            </button>
        `;
    });
    
    categoryHTML += `
            </div>
            <div class="category-scroll-indicator">
                <div class="scroll-hint">›</div>
            </div>
        </div>
    `;
    
    const scrollContainer = categoryContainer.querySelector('.category-filter-scroll-wrapper');
    if (scrollContainer) {
        scrollContainer.innerHTML = categoryHTML;
        categoryContainer.style.display = 'block';
        console.log(`🏷️ 分类筛选器已显示: ${month} - ${selectedDate}, 共 ${sortedCategories.length} 个分类`);
        
        // 🆕 增强滚动体验和视觉提示
        setTimeout(() => {
            const buttonsContainer = categoryContainer.querySelector('.category-filter-buttons');
            const scrollIndicator = categoryContainer.querySelector('.category-scroll-indicator');
            const scrollWrapper = categoryContainer.querySelector('.category-filter-scroll-wrapper');
            
            if (buttonsContainer && scrollIndicator && scrollWrapper) {
                // 检查滚动状态并更新指示器
                const updateScrollIndicators = () => {
                    const hasOverflow = buttonsContainer.scrollWidth > buttonsContainer.clientWidth;
                    const scrollLeft = buttonsContainer.scrollLeft;
                    const maxScroll = buttonsContainer.scrollWidth - buttonsContainer.clientWidth;
                    const isAtEnd = Math.abs(maxScroll - scrollLeft) < 5;
                    const isAtStart = scrollLeft < 5;
                    
                    console.log(`📏 滚动状态检查:`, {
                        hasOverflow,
                        scrollWidth: buttonsContainer.scrollWidth,
                        clientWidth: buttonsContainer.clientWidth,
                        scrollLeft,
                        maxScroll,
                        isAtEnd,
                        isAtStart
                    });
                    
                    // 右侧指示器：有溢出且未到末端时显示
                    if (hasOverflow && !isAtEnd) {
                        scrollIndicator.classList.add('visible');
                    } else {
                        scrollIndicator.classList.remove('visible');
                    }
                    
                    // 左侧渐变：已滚动时显示
                    if (hasOverflow && !isAtStart) {
                        scrollWrapper.classList.add('scrolled');
                    } else {
                        scrollWrapper.classList.remove('scrolled');
                    }
                };
                
                // 初始检查
                updateScrollIndicators();
                
                // 监听滚动事件
                buttonsContainer.addEventListener('scroll', updateScrollIndicators, { passive: true });
                
                // 监听窗口大小变化
                if (window.ResizeObserver) {
                    const resizeObserver = new ResizeObserver(() => {
                        setTimeout(updateScrollIndicators, 100);
                    });
                    resizeObserver.observe(buttonsContainer);
                } else {
                    window.addEventListener('resize', () => {
                        setTimeout(updateScrollIndicators, 100);
                    });
                }
                
                // 增强鼠标滚轮支持
                buttonsContainer.addEventListener('wheel', (e) => {
                    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                        e.preventDefault();
                        const scrollAmount = e.deltaY > 0 ? 100 : -100;
                        buttonsContainer.scrollBy({
                            left: scrollAmount,
                            behavior: 'smooth'
                        });
                    }
                }, { passive: false });
                
                // 添加键盘支持和调试信息
                buttonsContainer.setAttribute('tabindex', '0');
                buttonsContainer.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        buttonsContainer.scrollBy({ left: -100, behavior: 'smooth' });
                        console.log('⬅️ 键盘向左滚动');
                    } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        buttonsContainer.scrollBy({ left: 100, behavior: 'smooth' });
                        console.log('➡️ 键盘向右滚动');
                    }
                });
                
                // 添加点击滚动提示功能
                if (scrollIndicator) {
                    scrollIndicator.style.cursor = 'pointer';
                    scrollIndicator.addEventListener('click', () => {
                        buttonsContainer.scrollBy({ left: 150, behavior: 'smooth' });
                        console.log('🖱️ 点击指示器滚动');
                    });
                }
                
                console.log('🎯 滚动功能已初始化完成');
            }
        }, 150);
    }
}

function renderInChunksEnhanced(papers, container, expectedDate = null) {
    console.log(`🔥 ENHANCED RENDER START ===`);
    console.log(`- Papers to render: ${papers.length}`);
    console.log(`- Container ID: ${container.id}`);
    console.log(`- Expected date: ${expectedDate}`);
    
    // 🔧 渲染前验证（如果有期望日期）
    if (expectedDate) {
        console.log(`🔍 渲染前验证期望日期: ${expectedDate}`);
        const invalidPapers = papers.filter(p => {
            if (!p.date) return true;
            const paperDate = p.date.includes('T') ? p.date.split('T')[0] : p.date;
            return paperDate !== expectedDate;
        });
        
        if (invalidPapers.length > 0) {
            console.error(`🚨 发现 ${invalidPapers.length} 篇日期不符的论文:`, 
                invalidPapers.map(p => ({
                    id: p.id,
                    date: p.date,
                    paperDate: p.date.includes('T') ? p.date.split('T')[0] : p.date
                }))
            );
            
            // 强制过滤掉无效论文
            papers = papers.filter(p => {
                if (!p.date) return false;
                const paperDate = p.date.includes('T') ? p.date.split('T')[0] : p.date;
                return paperDate === expectedDate;
            });
            
            console.log(`🔧 强制过滤后剩余: ${papers.length} 篇论文`);
        }
    }
    
    // 使用标准渲染函数
    renderInChunks(papers, container);
    
    // 🔧 渲染后验证
    if (expectedDate) {
        setTimeout(() => {
            console.log(`🔍 渲染后验证...`);
            const renderedCards = container.querySelectorAll('.paper-card');
            console.log(`📊 已渲染的卡片数量: ${renderedCards.length}`);
            
            let correctCount = 0;
            let incorrectCount = 0;
            const incorrectCards = [];
            
            renderedCards.forEach(card => {
                const paperId = card.id.replace('card-', '');
                const paper = state.allPapers.get(paperId);
                
                if (paper && paper.date) {
                    const paperDate = paper.date.includes('T') ? paper.date.split('T')[0] : paper.date;
                    if (paperDate === expectedDate) {
                        correctCount++;
                    } else {
                        incorrectCount++;
                        incorrectCards.push({
                            id: paperId,
                            expected: expectedDate,
                            actual: paperDate,
                            element: card
                        });
                    }
                }
            });
            
            console.log(`🎯 渲染后验证结果:`, {
                正确: correctCount,
                错误: incorrectCount,
                期望日期: expectedDate
            });
            
            if (incorrectCount > 0) {
                console.error(`🚨 发现 ${incorrectCount} 个错误渲染的卡片！`);
                incorrectCards.forEach(({id, expected, actual, element}) => {
                    console.error(`❌ 移除错误卡片: ${id}, 期望 ${expected}, 实际 ${actual}`);
                    if (element && element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                });
                
                showToast(`已自动移除 ${incorrectCount} 篇日期不符的论文`, 'warning');
            } else {
                console.log(`✅ 渲染后验证完全通过！`);
                if (correctCount > 0) {
                    const dateParts = expectedDate.split('-');
                    const month = parseInt(dateParts[1], 10);
                    const day = parseInt(dateParts[2], 10);
                    showToast(`✅ 已准确显示 ${month}月${day}日 的 ${correctCount} 篇论文`, 'success');
                }
            }
        }, 200); // 给渲染更多时间
    }
}
// [FINAL-FIX] 全局的、可重用的懒加载启动函数
function enableLazyLoading() {
    // 1. 如果已存在观察器，先断开并销毁，防止内存泄漏和重复观察
    if (state.lazyObserver) {
        state.lazyObserver.disconnect();
    }

    // 2. 查找所有需要懒加载的占位符元素
    const lazyElements = document.querySelectorAll('.lazy-load');
    if (lazyElements.length === 0) {
        console.log("没有需要懒加载的元素。");
        return;
    }

    console.log(`👁️ 启动懒加载观察器，观察 ${lazyElements.length} 个元素...`);

    // 3. 创建新的 IntersectionObserver
    const observer = new IntersectionObserver((entries, observerInstance) => {
        entries.forEach(entry => {
            // 当元素进入或即将进入视口时
            if (entry.isIntersecting) {
                const placeholder = entry.target;
                const paperId = placeholder.dataset.paperId;

                if (paperId) {
                    // 停止观察该元素，避免重复触发
                    observerInstance.unobserve(placeholder);
                    // 异步加载论文详情
                    loadPaperDetails(paperId);
                }
            }
        });
    }, {
        // 在元素离视口底部还有 300px 时就开始加载，提供更流畅的体验
        rootMargin: '0px 0px 300px 0px',
        threshold: 0.01
    });

    // 4. 让观察器开始观察所有目标元素
    lazyElements.forEach(el => observer.observe(el));

    // 5. 将新的观察器实例存入全局状态
    state.lazyObserver = observer;
}

/**
 * [FINAL-VERIFIED v3] 分块渲染论文卡片
 * 修复了筛选模式下懒加载失效的问题。
 *
 * @param {Array} papers - 要渲染的论文对象数组。
 * @param {HTMLElement} container - 论文卡片将被添加到的父容器元素。
 * @param {number} [index=0] - 当前渲染的起始索引。
 * @param {number} sessionId - 当前的渲染会话ID。
 */
function renderInChunks(papers, container, index = 0, sessionId) {
    // 1. 会话ID检查 (保持不变)
    if (sessionId !== state.renderSessionId) {
        console.warn(`👋 渲染会话 ${sessionId} 已过时 (当前为 ${state.renderSessionId})，渲染中止。`);
        return;
    }

    // 2. 终止条件 (保持不变)
    if (index >= papers.length) {
        console.log(`✅ === 渲染完成 (会话: ${sessionId}) ===`);
        
        // [CRITICAL FIX] 这里的逻辑也要修改，确保懒加载在需要时启动
        const LAZY_LOAD_THRESHOLD = 15;
        // 只要论文总数超过阈值，就应该准备懒加载观察器
        if (papers.length > LAZY_LOAD_THRESHOLD) {
            console.log(`-> 论文数量 (${papers.length}) 超过阈值，启用懒加载...`);
            setTimeout(() => {
                try {
                    enableLazyLoading();
                } catch (error) {
                    console.error('❌ 启用懒加载失败:', error);
                }
            }, 100); // 延迟以确保所有占位符已添加到DOM
        } else {
            console.log(`-> 论文数量 (${papers.length}) 未超过阈值，无需懒加载。`);
        }
        
        hideProgress();
        return;
    }

    // 3. 分块处理 (保持不变)
    const CHUNK_SIZE = 5;
    const fragment = document.createDocumentFragment();
    const endIndex = Math.min(index + CHUNK_SIZE, papers.length);

    for (let i = index; i < endIndex; i++) {
        const paper = papers[i];

        if (paper && paper.id) {
            try {
                if (!state.allPapers.has(paper.id)) {
                    state.allPapers.set(paper.id, paper);
                }

                // ============================================================
                // [CRITICAL FIX] 修正懒加载决策逻辑
                // ============================================================
                const LAZY_LOAD_THRESHOLD = 15;
                let useLazyLoad = false;
                
                // 新逻辑：只要当前渲染的论文索引大于等于阈值，就使用懒加载。
                // 这与是否在筛选模式、是否在首页完全无关，逻辑变得简单而健壮。
                if (i >= LAZY_LOAD_THRESHOLD) {
                    useLazyLoad = true;
                }
                
                const card = createPaperCard(paper, useLazyLoad);
                fragment.appendChild(card);
                console.log(`🎨 Card created for ${paper.id} (index: ${i}, lazy: ${useLazyLoad})`);

            } catch (e) {
                console.error(`❌ 创建卡片失败: paper ID ${paper.id} at index ${i}`, e);
            }
        } else {
            console.warn(`⚠️ 跳过无效的论文数据 at index ${i}`, paper);
        }
    }

    // 5. DOM操作 (保持不变)
    container.appendChild(fragment);

    // 6. 预约下一个分块 (保持不变)
    if (window.requestIdleCallback) {
        requestIdleCallback(() => renderInChunks(papers, container, endIndex, sessionId), { timeout: 200 });
    } else {
        setTimeout(() => renderInChunks(papers, container, endIndex, sessionId), 16);
    }
}

/**
 * [NEW & SIMPLIFIED] 渲染一个批次的论文卡片
 * @param {Array} papers - 要渲染的这一批次的论文
 * @param {HTMLElement} container - 目标容器
 */
function renderBatch(papers, container) {
    if (!papers || papers.length === 0) return;

    const fragment = document.createDocumentFragment();
    const LAZY_LOAD_THRESHOLD = 5; // 超过5篇就懒加载

    papers.forEach((paper, index) => {
        if (paper && paper.id) {
            // 在虚拟滚动模式下，除了第一批的前几篇，其余都应该懒加载
            const useLazyLoad = state.virtualScroll.renderedIndex > 0 || index >= LAZY_LOAD_THRESHOLD;
            const card = createPaperCard(paper, useLazyLoad);
            fragment.appendChild(card);
        }
    });

    container.appendChild(fragment);

    // 渲染完一批后，立即启动懒加载，确保可见内容被加载
    setTimeout(() => enableLazyLoading(), 100);
}

/**
 * [FINAL & VERIFIED] 渲染下一批论文（用于无限滚动）
 * 修复了渲染容器作用域问题。
 */
function renderNextBatch() {
    const { allPapersToRender, renderedIndex, batchSize } = state.virtualScroll;

    if (renderedIndex >= allPapersToRender.length) {
        console.log('✅ All papers have been rendered.');
        loader.classList.add('hidden');
        if (state.virtualScroll.observer) {
            state.virtualScroll.observer.disconnect();
        }
        return;
    }

    console.log(`🔄 Rendering next batch: from index ${renderedIndex}`);
    
    const batchPapers = allPapersToRender.slice(renderedIndex, renderedIndex + batchSize);
    
    // ===================================================================
    // [CRITICAL FIX] 动态查找正确的渲染容器
    // ===================================================================
    let renderContainer = null;
    
    if (state.isSearchMode) {
        // 如果是搜索模式，容器是固定的
        renderContainer = searchResultsContainer;
    } else {
        // 如果是首页模式，容器ID是根据当前月份动态生成的
        // 我们需要从 state.currentMonthIndex 获取当前正在显示的月份
        if (state.currentMonthIndex > -1 && state.manifest.availableMonths[state.currentMonthIndex]) {
            const currentMonth = state.manifest.availableMonths[state.currentMonthIndex];
            const containerId = `papers-list-wrapper-${currentMonth}`;
            renderContainer = document.getElementById(containerId);
        }
    }
    
    if (renderContainer) {
        // 调用简单的、无状态的渲染函数
        renderBatch(batchPapers, renderContainer);
    } else {
        // 这是一个重要的保护，如果找不到容器，就中止并报错，而不是让应用崩溃
        console.error("Fatal Error: Could not find a valid container to render the next batch.");
        // 停止后续操作
        if (state.virtualScroll.observer) {
            state.virtualScroll.observer.disconnect();
        }
        loader.classList.add('hidden');
        return; // 中止执行
    }
    // ===================================================================
    
    // 更新已渲染的索引
    state.virtualScroll.renderedIndex += batchSize;
    
    // 如果还有更多论文，确保加载指示器可见
    if (state.virtualScroll.renderedIndex < allPapersToRender.length) {
        loader.classList.remove('hidden');
    } else {
        // 如果这是最后一批，渲染完后隐藏加载器并断开观察
        loader.classList.add('hidden');
        if (state.virtualScroll.observer) {
            state.virtualScroll.observer.disconnect();
        }
    }
}

/**
 * [NEW] 设置或重置无限滚动观察器
 */
function setupVirtualScrollObserver() {
    // 先断开旧的观察器
    if (state.virtualScroll.observer) {
        state.virtualScroll.observer.disconnect();
    }

    // 如果没有论文需要渲染，或者已经渲染完毕，则不设置
    if (state.virtualScroll.renderedIndex >= state.virtualScroll.allPapersToRender.length) {
        loader.classList.add('hidden');
        return;
    }

    const options = { root: null, rootMargin: '200px', threshold: 0 };
    state.virtualScroll.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                renderNextBatch();
            }
        });
    }, options);

    loader.classList.remove('hidden');
    state.virtualScroll.observer.observe(loader);
}

async function loadPaperDetails(paperId) {
    const card = document.getElementById(`card-${paperId}`);
    if (!card || card.dataset.loading === 'true') {
        return; // 防止重复加载
    }
    card.dataset.loading = 'true';

    try {
        // 现在我们可以确信数据是存在的
        const paper = state.allPapers.get(paperId);
        
        if (!paper || !paper.abstract) {
            // 这个错误现在只会在源数据本身有问题时触发
            throw new Error('源数据缺失关键信息(摘要)。');
        }

        const detailedContentHTML = createDetailedPaperContent(paper);
        
        requestAnimationFrame(() => {
            card.innerHTML = detailedContentHTML;
            updatePaperRatingDisplay(paperId);
            updatePaperTagsDisplay(paperId);
            card.removeAttribute('data-loading');
        });
    } catch (error) {
        console.error(`💥 [${paperId}] 论文加载失败:`, error);
        card.innerHTML = `<div class="p-6 text-center text-red-500">${error.message}</div>`;
    }
}

// 确保 window.forceLoadPaper 函数在全局可用，以便 onclick 可以调用它。
// 这个函数现在是用户手动触发数据修复的唯一入口。
if (!window.forceLoadPaper) {
    window.forceLoadPaper = async (id) => {
        const cardToReload = document.getElementById(`card-${id}`);
        if (cardToReload) {
            console.log(`🔧 [${id}] 用户手动触发重试...`);
            
            // 显示正在重试的状态
            cardToReload.dataset.loading = 'true';
            cardToReload.innerHTML = `
                <div class="p-6 text-center text-blue-600">
                    <div class="inline-block w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                    <p class="mt-2 text-sm">正在尝试重新加载数据...</p>
                </div>
            `;
            
            try {
                // 在这里执行一次性的、有针对性的数据获取
                const paperMonth = `20${id.substring(0, 2)}-${id.substring(2, 4)}`;
                await fetchMonth(paperMonth, true); // 强制刷新该月数据
                
                // 再次尝试加载详情
                await loadPaperDetails(id);
            } catch (e) {
                console.error(`💥 [${id}] 手动重试失败:`, e);
                cardToReload.innerHTML = `
                    <div class="p-6 text-center text-red-600">
                        <p class="font-semibold">重试失败</p>
                        <p class="text-sm mt-1">${e.message}</p>
                    </div>
                `;
            }
        }
    };
}

// 暴露到全局，以便HTML中的onclick可以访问
window.loadPaperDetails = loadPaperDetails;

// 全局调试函数 - 新增日期筛选调试
window.debugDateFilter = function() {
    console.log(`🗓️ 日期筛选调试信息:`);
    console.log(`- 当前日期筛选条件:`, currentDateFilter);
    console.log(`- 搜索模式:`, state.isSearchMode);
    console.log(`- 当前查询:`, state.currentQuery);
    console.log(`- 搜索结果总数:`, state.currentSearchResults.length);
    
    if (state.currentSearchResults.length > 0) {
        const dates = [...new Set(state.currentSearchResults.map(p => 
            p.date.includes('T') ? p.date.split('T')[0] : p.date
        ))].sort();
        console.log(`- 搜索结果包含的日期:`, dates);
        
        // 检查每个日期的论文数量
        const dateCounts = {};
        state.currentSearchResults.forEach(p => {
            const dateStr = p.date.includes('T') ? p.date.split('T')[0] : p.date;
            dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
        });
        console.log(`- 各日期论文数量:`, dateCounts);
    }
    
    // 如果有日期筛选，测试筛选结果
    if (currentDateFilter.startDate) {
        const filtered = applyDateFilterToResults(state.currentSearchResults);
        console.log(`- 筛选后结果数量:`, filtered.length);
        if (filtered.length > 0) {
            const filteredDates = [...new Set(filtered.map(p => 
                p.date.includes('T') ? p.date.split('T')[0] : p.date
            ))].sort();
            console.log(`- 筛选后包含的日期:`, filteredDates);
        }
    }
};

// 检查特定日期的论文
window.checkDatePapers = function(date) {
    console.log(`📊 检查日期 ${date} 的论文:`);
    const papers = state.currentSearchResults.filter(p => {
        const paperDate = p.date.includes('T') ? p.date.split('T')[0] : p.date;
        return paperDate === date;
    });
    
    console.log(`- 找到 ${papers.length} 篇论文:`);
    papers.forEach(p => {
        console.log(`  📄 ${p.id}: ${p.title.substring(0, 50)}...`);
    });
    
    return papers;
};

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
        // [FINAL-FIX] 仅在需要时渲染懒加载骨架屏
        card.innerHTML = createLazyPaperContent(paper);
    } else {
        // 正常模式：渲染完整内容
        console.log(`✅ 使用完整模式创建 ${paper.id}`);
        card.innerHTML = createDetailedPaperContent(paper);
        // 异步更新交互元素，防止阻塞渲染
        requestAnimationFrame(() => {
            updatePaperRatingDisplay(paper.id);
            updatePaperTagsDisplay(paper.id);
        });
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
    
    // --- 智能高亮逻辑 ---
    const shouldHighlight = state.isSearchMode && state.currentQuery && !state.categoryIndex[state.currentQuery] && state.currentQuery !== 'favorites';
    const query = state.currentQuery;

    const title = shouldHighlight ? highlightText(paper.title || '无标题', query) : (paper.title || '无标题');
    const zhTitle = shouldHighlight ? highlightText(paper.zh_title || '', query) : (paper.zh_title || '');
    const abstractText = shouldHighlight ? highlightText(paper.abstract || '无', query) : (paper.abstract || '无');
    const translationText = shouldHighlight ? highlightText(paper.translation || '无', query) : (paper.translation || '无');
    const aiCommentsText = shouldHighlight ? highlightText(paper.ai_comments || '', query) : (paper.ai_comments || '');
    const tldrText = shouldHighlight ? highlightText(paper.tldr || '', query) : (paper.tldr || '');

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
                ${createInfoBox('TL;DR', tldrText, 'green')}
                ${aiCommentsText
            ? createInfoBox('AI点评', aiCommentsText, 'indigo')
            : `<div class="info-box info-box-indigo"><p class="info-box-title">AI点评:</p><p class="italic text-sm text-gray-500 dark:text-gray-400">暂无AI点评</p></div>`
        }
            </div>
            <div id="ai-details-${paper.id}" class="details-section ai-details-section compact-hidden">
                 <h2 class="text-xl font-bold mb-4 ai-analysis-title">AI分析与摘要</h2>
                ${paper.motivation ? `<h3>研究动机</h3><p class="text-sm">${paper.motivation}</p><br/>` : ''}
                ${paper.method ? `<h3>研究方法</h3><p class="text-sm">${paper.method}</p><br/>` : ''}
                ${paper.results ? `<h3>研究结果</h3><p class="text-sm">${paper.results}</p><br/>` : ''}
                ${paper.conclusion ? `<h3>研究结论</h3><p class="text-sm">${paper.conclusion}</p><br/>` : ''}
                <h3>摘要翻译</h3><p class="text-sm italic">${translationText}</p><br/>
                <h3>原文摘要</h3><p class="text-sm italic">${abstractText}</p>
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

/**
 * [FINAL-VERIFIED & ROBUST] 导航到指定月份并渲染其内容
 * 修复了因状态更新时序错误导致的初始加载/切换月份时页面空白的问题。
 */
async function navigateToMonth(month, isChildCall = false) {
    if (!isChildCall && state.isFetching) {
        console.warn(`Navigation to ${month} blocked: another fetch operation is in progress.`);
        return;
    }

    // --- 核心修复 #1：在函数开头重置所有全局筛选状态 ---
    console.log(`[Nav] 导航到新月份 ${month}，重置筛选器。`);
    currentDateFilter = { startDate: null, endDate: null, period: null, source: null };
    state.activeCategoryFilter = null; // 同时重置分类筛选

    state.renderSessionId++;
    const currentSessionId = state.renderSessionId;
    console.log(`🚀 启动新的渲染会话 (导航至 ${month}): ID ${currentSessionId}`);
    
    if (!isChildCall) {
        state.isFetching = true;
        showProgress(`准备导航至 ${month}...`);
    }

    try {
        if (!isChildCall) {
            performance.cleanup();
        }

        if (state.isSearchMode) {
            // 注意：调用 resetToDefaultView(false) 会重置 currentMonthIndex 为 -1
            // 这没关系，因为我们马上就会在下面设置正确的值。
            await resetToDefaultView(false); 
        }
        
        // UI 准备 (骨架屏)
        papersContainer.innerHTML = '';
        papersContainer.classList.add('skeleton-view');
        const numSkeletons = Math.floor(Math.random() * 2) + 3;
        for (let i = 0; i < numSkeletons; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-card skeleton-animate';
            skeleton.innerHTML = `<div class="skeleton h-4 w-3/4 mb-3"></div><div class="skeleton h-4 w-1/2 mb-3"></div><div class="skeleton h-4 w-full"></div>`;
            papersContainer.appendChild(skeleton);
        }

        const targetIndex = state.manifest.availableMonths.indexOf(month);
        if (targetIndex === -1) {
            throw new Error(`无效的月份: ${month}`);
        }

        // --- 核心修复 #2：在执行任何渲染逻辑之前，立即更新月份索引！---
        state.currentMonthIndex = targetIndex;
        console.log(`[Nav] 月份索引已更新为: ${state.currentMonthIndex} for month ${month}`);
        // --- 修复结束 ---

        // 1. 先获取数据
        await fetchMonth(month);
        
        // 2. 数据获取完全结束后，才从全局 state 中过滤，确保数据源纯净
        const papersInMonth = filterPapersByMonth(month);
        console.log(`[navigateToMonth] Found ${papersInMonth.length} pure papers for month ${month}`);

        updateProgress('渲染论文...', 95);

        // 清理UI准备渲染
        papersContainer.classList.remove('skeleton-view');
        papersContainer.innerHTML = '';
        if (state.navObserver) state.navObserver.disconnect();

        // 3. 将纯净的数据传递给渲染函数
        // 渲染函数现在可以安全地依赖 state.currentMonthIndex
        renderPapers(papersInMonth.sort((a, b) => b.date.localeCompare(a.date)), month, currentSessionId);
        
        // 滚动到顶部并记录日志
        window.scrollTo({ top: 0, behavior: 'auto' });
        console.log(`Navigation to ${month} completed successfully.`);

    } catch (error) {
        console.error(`Navigation to ${month} failed:`, error);
        const errorMessage = (error && error.message) ? error.message : "未知错误";
        showLoadError(`导航至 ${month} 失败: ${errorMessage}`);
    } finally {
        if (!isChildCall) {
            state.isFetching = false;
            hideProgress();
        }
    }
}

/**
 * [FINAL-VERIFIED] (无限滚动) 加载并追加下一个月份的内容
 */
async function loadNextMonth(triggeredByScroll = true) {
    if (state.isFetching || state.isSearchMode) {
        return;
    }

    state.isFetching = true;
    loader.classList.remove('hidden');

    try {
        // 在追加新内容前，进行内存清理，防止内存无限增长
        performance.cleanup();

        const nextIndex = state.currentMonthIndex + 1;
        if (state.manifest && state.manifest.availableMonths && nextIndex < state.manifest.availableMonths.length) {
            const nextMonth = state.manifest.availableMonths[nextIndex];
            
            // 启动新的渲染会话，这是防止异步冲突的关键
            state.renderSessionId++;
            const currentSessionId = state.renderSessionId;
            console.log(`🚀 启动新的渲染会话 (追加 ${nextMonth}): ID ${currentSessionId}`);

            // 1. 先获取数据
            await fetchMonth(nextMonth);
            
            // 2. [CRITICAL FIX] 在数据获取完全结束后，再从全局 state 中过滤出刚刚加载的、纯净的数据
            const papersInNextMonth = filterPapersByMonth(nextMonth);
            
            console.log(`[loadNextMonth] Found ${papersInNextMonth.length} pure papers for month ${nextMonth}`);

            // 3. 将纯净的数据传递给渲染函数
            renderPapers(papersInNextMonth.sort((a, b) => b.date.localeCompare(a.date)), nextMonth, currentSessionId);
            
            state.currentMonthIndex = nextIndex;
        } else {
            console.log('End of list reached.');
            if (endOfListMessage && triggeredByScroll) {
                endOfListMessage.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Failed to load next month:', error);
        showToast(`加载下一月份失败: ${error.message}`, 'error');
    } finally {
        state.isFetching = false;
        loader.classList.add('hidden');
    }
}

/**
 * [NEW & OPTIMIZED] 执行搜索查询的核心函数
 * @param {string} query - 用户输入的搜索字符串
 * @returns {Set<string>} - 匹配的论文ID集合
 */
function executeSearch(query) {
    const lowerCaseQuery = query.toLowerCase().trim();
    if (!lowerCaseQuery || !state.searchIndex) return new Set();

    // 策略1：精确短语匹配 (最高优先级)
    // 这能完美匹配 "Vision Transformer" 这样的多词关键词。
    if (state.searchIndex[lowerCaseQuery]) {
        console.log(`🔍 精确短语匹配成功: "${lowerCaseQuery}"`);
        return new Set(state.searchIndex[lowerCaseQuery]);
    }

    // 策略2：分词后的"与"逻辑搜索 (AND)
    console.log(`🔍 未找到精确短语，执行分词搜索: "${lowerCaseQuery}"`);
    const queryTokens = lowerCaseQuery.split(/\s+/).filter(Boolean);
    if (queryTokens.length === 0) return new Set();

    let resultSet = null;

    for (const token of queryTokens) {
        // 直接从索引中获取，O(1)复杂度，非常高效
        const tokenIds = new Set(state.searchIndex[token] || []);
        
        if (resultSet === null) { // 第一个词
            resultSet = tokenIds;
        } else { // 后续的词，求交集
            resultSet = new Set([...resultSet].filter(id => tokenIds.has(id)));
        }
        if (resultSet.size === 0) break; // 如果交集为空，提前结束
    }
    return resultSet || new Set();
}

async function handleSearch() {
    if (state.isFetching) return;
    state.isFetching = true;

    try {
        const query = searchInput.value.trim();

        // --- 核心优化 V2：检测并直接显示ID搜索结果 ---
        if (/^\d{4}\.\d{4,5}$/.test(query)) {
            const paperId = query;
            console.log(`🔍 ID搜索 - 直接显示模式: ${paperId}`);
            addToSearchHistory(paperId);

            // 1. 立即切换UI到单页显示模式
            state.isSearchMode = true;
            state.currentQuery = query;
            papersContainer.classList.add('hidden');
            searchResultsContainer.classList.remove('hidden');
            searchResultsContainer.innerHTML = ''; // 彻底清空
            quickNavContainer.style.display = 'none';
            // 隐藏在单页模式下无意义的筛选器和信息
            categoryFilterContainer.classList.add('hidden');
            searchInfoEl.classList.add('hidden');
            const dailyDistContainer = document.getElementById('daily-distribution-container');
            if (dailyDistContainer) dailyDistContainer.classList.add('hidden');
            
            showProgress(`正在查找论文 ${paperId}...`);

            // 2. 获取论文数据
            const month = `20${paperId.substring(0, 2)}-${paperId.substring(2, 4)}`;
            if (!state.loadedMonths.has(month)) {
                await fetchMonth(month);
            }

            // 3. 独立渲染单个论文
            const paper = state.allPapers.get(paperId);
            if (paper) {
                // 成功找到论文数据
                const cardElement = createPaperCard(paper, false); // 创建完整的、非懒加载的卡片
                
                // 为单页模式添加一些样式，使其居中，更像详情页
                cardElement.classList.add('shadow-xl', 'max-w-4xl', 'mx-auto');
                
                searchResultsContainer.appendChild(cardElement);
                createBackToHomeButton(); // 确保用户可以返回
            } else {
                // 数据加载后依然找不到该论文
                searchResultsContainer.innerHTML = `
                    <div class="text-center p-8">
                        <p class="text-red-500 font-semibold">错误：找不到论文 ID: ${paperId}</p>
                        <p class="text-gray-500 text-sm mt-2">请确认ID是否正确，或该论文是否存在于我们的数据库中。</p>
                    </div>
                `;
                createBackToHomeButton();
            }

            // 4. 关键：结束函数，不再执行后续的列表搜索
            return; 
        }
        // --- 核心优化结束 ---

        // [CACHE] 缓存逻辑保持不变
        const cacheKey = `search_results_${query}`;
        const cachedResults = CacheManager.get(cacheKey);

        if (cachedResults) {
            console.log(`🚀 从缓存加载搜索结果: "${query}"`);
            showProgress(`从缓存加载 "${query}"...`);
            await applyViewTransition(async () => {
                state.currentQuery = query;
                state.isSearchMode = true;
                state.currentSearchResults = cachedResults;
                papersContainer.classList.add('hidden');
                searchResultsContainer.classList.remove('hidden');
                quickNavContainer.style.display = 'none';
                categoryFilterContainer.classList.remove('hidden'); // 列表模式需要显示
                searchInfoEl.classList.remove('hidden');             // 列表模式需要显示
                searchResultsContainer.innerHTML = '';
                renderCategoryFiltersForSearch(cachedResults);
                renderDailyDistributionFilters(cachedResults);
                renderFilteredResults_FIXED(); 
            });
            return; 
        }

        // --- 常规关键词/分类搜索逻辑（保持不变）---
        if (query !== state.currentQuery) {
            currentDateFilter = { startDate: null, endDate: null, period: null };
            updateDateFilterDisplay('');
            document.querySelectorAll('.date-quick-filter').forEach(btn => btn.classList.remove('active'));
        }
        
        if (query !== state.currentQuery) {
            showProgress(`正在搜索 "${query}"...`);
            addToSearchHistory(query);
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

            let matchingIds = new Set();
            let requiredMonths = new Set();

            if (query === 'favorites') {
                matchingIds = new Set(state.favorites);
            } else {
                if (!state.searchIndex) {
                    updateProgress('加载搜索索引...', 20);
                    state.searchIndex = await loadSearchIndex();
                }
                if (state.categoryIndex[query]) {
                    matchingIds = new Set(state.categoryIndex[query]);
                } else {
                    matchingIds = executeSearch(query);
                }
            }
            
            requiredMonths = new Set([...matchingIds].map(id => `20${id.substring(0, 2)}-${id.substring(2, 4)}`));

            await fetchWithProgress([...requiredMonths].filter(m => !state.loadedMonths.has(m)));
            updateProgress('整理搜索结果...', 95);

            const results = [...matchingIds].map(id => state.allPapers.get(id)).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));

            state.currentSearchResults = results;
            if (results.length > 0) {
                CacheManager.set(cacheKey, results, 600000);
            }
            renderCategoryFiltersForSearch(results);
            renderDailyDistributionFilters(results);
            renderFilteredResults_FIXED();
        });
    } finally {
        state.isFetching = false;
        hideProgress();
    }
}

function renderFilteredResults() {
    console.log(`� ENHANCED renderFilteredResults 开始执行`);
    console.log(`📊 输入数据:`, {
        搜索结果总数: state.currentSearchResults.length,
        当前查询: state.currentQuery,
        分类筛选: state.activeCategoryFilter,
        日期筛选状态: currentDateFilter
    });
    
    const { currentSearchResults, activeCategoryFilter, currentQuery } = state;

    // 🔧 Step 0: 彻底清理容器，确保没有残留内容
    console.log(`🧹 彻底清理搜索结果容器`);
    if (searchResultsContainer) {
        // 移除所有子元素
        while (searchResultsContainer.firstChild) {
            searchResultsContainer.removeChild(searchResultsContainer.firstChild);
        }
        // 强制清空 HTML
        searchResultsContainer.innerHTML = '';
        // 重置所有可能的样式和状态
        searchResultsContainer.className = searchResultsContainer.className.replace(/\s*hidden\s*/g, '');
    }

    // Step 1: 应用分类筛选
    let filtered = activeCategoryFilter === 'all'
        ? [...currentSearchResults]  // 创建副本避免修改原数组
        : currentSearchResults.filter(paper => 
            paper.categories && paper.categories.includes(activeCategoryFilter)
        );

    console.log(`🏷️ 分类筛选后: ${filtered.length} 篇论文`);

    // Step 2: 应用日期筛选 - 完全重写，确保绝对准确
    let dateFilterActive = false;
    if (currentDateFilter.startDate && currentDateFilter.endDate) {
        console.log(`� 开始ENHANCED日期筛选`, currentDateFilter);
        const beforeDateFilter = filtered.length;
        
        // 🔧 使用新的超级严格筛选函数
        filtered = applySuperStrictDateFilter(filtered);
        dateFilterActive = true;
        
        console.log(`📅 ENHANCED日期筛选: ${beforeDateFilter} → ${filtered.length} 篇论文`);
        
        // 🔧 三重验证：确保结果绝对正确
        if (currentDateFilter.startDate === currentDateFilter.endDate && filtered.length > 0) {
            const targetDate = currentDateFilter.startDate;
            console.log(`� 开始三重验证，目标日期: ${targetDate}`);
            
            // 验证1: 检查每个论文的日期
            const validation1 = filtered.every(p => {
                if (!p.date) return false;
                const paperDate = p.date.includes('T') ? p.date.split('T')[0] : p.date;
                return paperDate === targetDate;
            });
            
            // 验证2: 统计日期分布
            const dateDistribution = {};
            filtered.forEach(p => {
                if (p.date) {
                    const paperDate = p.date.includes('T') ? p.date.split('T')[0] : p.date;
                    dateDistribution[paperDate] = (dateDistribution[paperDate] || 0) + 1;
                }
            });
            
            // 验证3: 确保只有目标日期
            const uniqueDates = Object.keys(dateDistribution);
            const validation3 = uniqueDates.length === 1 && uniqueDates[0] === targetDate;
            
            console.log(`🔍 三重验证结果:`, {
                验证1_每个论文日期正确: validation1,
                验证2_日期分布: dateDistribution,
                验证3_只有目标日期: validation3,
                唯一日期: uniqueDates
            });
            
            if (!validation1 || !validation3) {
                console.error(`� 验证失败！强制重新筛选`);
                // 最后的救命稻草：手动重新筛选
                filtered = filtered.filter(p => {
                    if (!p.date) return false;
                    const paperDate = p.date.includes('T') ? p.date.split('T')[0] : p.date;
                    const isCorrect = paperDate === targetDate;
                    if (!isCorrect) {
                        console.error(`🔥 强制移除: ${p.id}, 日期 ${paperDate}, 应为 ${targetDate}`);
                    }
                    return isCorrect;
                });
            } else {
                console.log(`✅ 三重验证全部通过！${filtered.length} 篇论文全部正确`);
            }
        }
    }

    // Step 3: 更新UI显示
    searchResultsContainer.innerHTML = '';

    // 构建信息文本
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
        if (currentDateFilter.startDate === currentDateFilter.endDate) {
            // 单日筛选
            const targetDateParts = currentDateFilter.startDate.split('-');
            const month = parseInt(targetDateParts[1], 10);
            const day = parseInt(targetDateParts[2], 10);
            infoText += `，筛选 <strong>${month}月${day}日</strong> 共 <strong>${filtered.length}</strong> 篇`;
        } else {
            // 日期范围筛选
            infoText += `，日期筛选后剩 <strong>${filtered.length}</strong> 篇`;
        }
    }

    infoText += '：';
    searchInfoEl.innerHTML = infoText;

    // Step 4: ENHANCED渲染结果 - 带额外验证
    if (filtered.length > 0) {
        console.log(`🔥 开始ENHANCED渲染 ${filtered.length} 篇论文`);
        
        // 🔧 渲染前最后一次验证（如果是单日筛选）
        if (dateFilterActive && currentDateFilter.startDate === currentDateFilter.endDate) {
            const targetDate = currentDateFilter.startDate;
            console.log(`🔍 渲染前最后验证，目标日期: ${targetDate}`);
            
            const preRenderCheck = filtered.every(p => {
                if (!p.date) return false;
                const paperDate = p.date.includes('T') ? p.date.split('T')[0] : p.date;
                return paperDate === targetDate;
            });
            
            if (!preRenderCheck) {
                console.error(`🚨 渲染前验证失败！重新过滤...`);
                filtered = filtered.filter(p => {
                    if (!p.date) return false;
                    const paperDate = p.date.includes('T') ? p.date.split('T')[0] : p.date;
                    return paperDate === targetDate;
                });
                console.log(`🔧 重新过滤后: ${filtered.length} 篇论文`);
            } else {
                console.log(`✅ 渲染前验证通过`);
            }
        }
        
        // 🔥 Enhanced渲染函数调用
        renderInChunksEnhanced(filtered, searchResultsContainer, dateFilterActive ? currentDateFilter.startDate : null);
    } else {
        searchResultsContainer.innerHTML = `<p class="text-center text-gray-500">没有找到符合条件的论文。</p>`;
    }

    // Step 5: 更新分类按钮状态
    document.querySelectorAll('.category-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === activeCategoryFilter);
    });

    // Step 6: 确保返回按钮存在
    if (!document.getElementById('back-to-home-btn')) {
        createBackToHomeButton();
    }
    
    console.log(`✅ 【最终修复版】renderFilteredResults 完成，最终显示 ${results.length} 篇论文`);
}

/**
 * [FINAL & UNIFIED v2] 渲染搜索和筛选结果的函数
 * 集成了新的“无限滚动”渲染系统，用于处理搜索结果页。
 */
function renderFilteredResults_FIXED() {
    // 启动新的渲染会话，让所有旧的搜索渲染任务失效
    state.renderSessionId++;
    const currentSessionId = state.renderSessionId;
    console.log(`🚀 启动新的渲染会话 (搜索视图), ID: ${currentSessionId}`);

    // --- 1. 应用所有当前筛选，生成最终待渲染列表 ---
    let results = [...state.currentSearchResults]; // 从原始搜索结果开始

    // 应用日期筛选
    if (currentDateFilter.startDate && currentDateFilter.endDate) {
        results = applyDateFilterToResults(results);
    }

    // 应用分类筛选
    if (state.activeCategoryFilter && state.activeCategoryFilter !== 'all') {
        results = results.filter(paper => paper.categories && paper.categories.includes(state.activeCategoryFilter));
    }

    console.log(`📊 Final search results to render: ${results.length} papers.`);

    // --- 2. 更新UI信息 ---
    updateSearchInfoFixed(results.length);
    searchResultsContainer.innerHTML = ''; // 清空旧内容

    // --- 3. 使用新的“无限滚动”逻辑进行渲染 ---
    if (results.length > 0) {
        // a. 将完整的、筛选后的列表存入 virtualScroll 状态
        state.virtualScroll.allPapersToRender = results;
        state.virtualScroll.renderedIndex = 0; // 重置渲染索引

        // b. 立即渲染第一批内容
        console.log("-> Rendering initial batch for search results.");
        renderNextBatch();

        // c. 设置观察器，以便在用户滚动时加载后续批次
        setupVirtualScrollObserver();
    } else {
        // 如果没有结果，显示提示信息并确保加载动画被隐藏
        searchResultsContainer.innerHTML = `<p class="text-center text-gray-500 py-8">没有找到符合条件的论文。</p>`;
        loader.classList.add('hidden');
        // 断开可能存在的旧观察器
        if (state.virtualScroll.observer) {
            state.virtualScroll.observer.disconnect();
        }
    }

    // --- 4. 确保UI元素（如返回按钮）正确显示 ---
    if (!document.getElementById('back-to-home-btn')) {
        createBackToHomeButton();
    }
}

// 🔥 关键函数：标准化日期字符串
function normalizeDateString(dateStr) {
    if (!dateStr) return '';
    
    // 如果包含 T，提取日期部分
    if (dateStr.includes('T')) {
        dateStr = dateStr.split('T')[0];
    }
    
    // 确保格式为 YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const year = parts[0].padStart(4, '0');
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    return dateStr;
}


// �🏠 更新所有月份的视图（首页模式）
function updateAllMonthViews() {
    console.log('🏠 更新所有月份视图');
    
    // 获取所有已加载的月份
    state.loadedMonths.forEach(month => {
        const papersForMonth = filterPapersByMonth(month);
        updateMonthView(month, papersForMonth);
        
        // 🆕 如果有活跃的日期筛选且不是"全部"，尝试重新渲染分类筛选器
        if (currentDateFilter.startDate && currentDateFilter.startDate === currentDateFilter.endDate) {
            renderDateCategoryFilter(month, currentDateFilter.startDate, papersForMonth);
        }
    });
}

// 🎯 更新所有日期按钮的状态
function updateAllDateButtonStates() {
    console.log('🎯 更新所有日期按钮状态');
    
    // 更新所有首页日期按钮状态
    document.querySelectorAll('.date-filter-btn').forEach(btn => {
        const action = btn.dataset.action;
        const fullDate = btn.dataset.fullDate;
        const day = btn.dataset.day;
        
        if (action === 'filter-by-date') {
            // 首页日期按钮
            const filterValue = fullDate || day;
            const isActive = determineButtonActiveState(filterValue);
            btn.classList.toggle('active', isActive);
        }
    });
    
    // 更新搜索结果日期按钮状态
    document.querySelectorAll('[data-action="filter-by-distribution-date"]').forEach(btn => {
        const date = btn.dataset.date;
        const isActive = determineButtonActiveState(date);
        btn.classList.toggle('active', isActive);
    });
}

// 🎯 判断按钮是否应该激活
function determineButtonActiveState(filterValue) {
    if (!filterValue) return false;
    
    if (filterValue === 'all') {
        return !currentDateFilter.startDate || !currentDateFilter.endDate;
    }
    
    if (currentDateFilter.startDate && currentDateFilter.endDate) {
        if (currentDateFilter.startDate === currentDateFilter.endDate) {
            // 单日筛选
            const normalizedFilterValue = normalizeDateString(filterValue);
            const normalizedCurrentDate = normalizeDateString(currentDateFilter.startDate);
            return normalizedFilterValue === normalizedCurrentDate;
        }
    }
    
    return false;
}

// 🎯 简化的信息更新函数
function updateSearchInfoFixed(resultCount) {
    const { currentSearchResults, activeCategoryFilter, currentQuery } = state;
    
    let infoText;
    if (currentQuery === 'favorites') {
        infoText = `正在显示您的 <strong>${currentSearchResults.length}</strong> 篇收藏`;
    } else {
        infoText = `为您找到 <strong>${currentSearchResults.length}</strong> 篇关于 "<strong>${currentQuery}</strong>" 的论文`;
    }

    if (activeCategoryFilter !== 'all') {
        infoText += `，分类筛选后`;
    }

    if (currentDateFilter.startDate && currentDateFilter.endDate) {
        if (currentDateFilter.startDate === currentDateFilter.endDate) {
            const dateParts = currentDateFilter.startDate.split('-');
            const month = parseInt(dateParts[1], 10);
            const day = parseInt(dateParts[2], 10);
            infoText += `，${month}月${day}日筛选后`;
        } else {
            infoText += `，日期筛选后`;
        }
    }

    infoText += ` 共 <strong>${resultCount}</strong> 篇：`;
    searchInfoEl.innerHTML = infoText;
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

/**
 * [OPTIMIZED & FINAL] 重置为默认的首页视图
 * 
 * 功能：
 * - 彻底退出搜索模式。
 * - 重置所有相关状态（查询、筛选、搜索结果）。
 * - 清理UI，移除所有搜索相关的元素。
 * - 更新URL，移除搜索参数。
 * - 执行严格的内存清理，防止因搜索导致的数据污染。
 * - 可靠地重新加载并显示最新的月份作为首页。
 *
 * @param {boolean} [reload=true] - 如果为 true，则在重置后自动加载最新的月份。
 *                                  如果为 false，仅重置状态和UI，不加载新内容（主要用于内部函数调用）。
 */
async function resetToDefaultView(reload = true) {
    console.log(`🔄 Resetting to default view. Reload: ${reload}`);

    // --- 1. 启动新的渲染会话，让所有正在进行的旧渲染任务失效 ---
    state.renderSessionId++;
    console.log(`🚀 启动新的渲染会话 (重置视图): ID ${state.renderSessionId}`);

    // --- 2. 重置核心应用状态 ---
    state.isSearchMode = false;
    state.currentQuery = '';
    state.currentSearchResults = [];
    state.activeCategoryFilter = 'all'; // 恢复默认分类筛选
    currentDateFilter = { startDate: null, endDate: null, period: null, source: null }; // 重置日期筛选状态

    // --- 核心修复：将月份索引也恢复到初始状态 ---
    state.currentMonthIndex = -1; 
    // --- 修复结束 ---

    // --- 3. 重置UI输入和显示 ---
    searchInput.value = '';
    updateDateFilterDisplay(''); // 清除显示的日期范围
    clearAllDateFilterActiveStates(); // 清除所有日期按钮的激活状态

    // --- 4. 更新浏览器URL和历史记录 ---
    const url = new URL(window.location);
    url.searchParams.delete('q');
    url.searchParams.delete('paper');
    // 使用 replaceState 而不是 pushState，因为返回首页不应被视为一个新的历史记录条目
    history.replaceState({}, '', url);

    // --- 5. 立即清理UI布局和元素 ---
    // 隐藏搜索结果容器并彻底清空其内容
    searchResultsContainer.classList.add('hidden');
    searchResultsContainer.innerHTML = '';
    
    // 隐藏所有仅在搜索模式下显示的UI组件
    searchInfoEl.classList.add('hidden');
    document.getElementById('daily-distribution-container')?.classList.add('hidden');
    
    // 移除“返回首页”按钮（如果存在）
    const backToHomeBtn = document.getElementById('back-to-home-btn');
    if (backToHomeBtn) {
        backToHomeBtn.remove();
    }
    
    // 确保首页相关的容器和导航是可见的
    papersContainer.classList.remove('hidden');
    quickNavContainer.style.display = 'block';
    categoryFilterContainer.classList.remove('hidden');
    
    // 恢复UI到默认状态
    setupCategoryFilters(); // 恢复默认的顶部分类按钮
    updateClearButtonVisibility(); // 根据输入框内容（已清空）隐藏清除按钮
    updateSearchStickiness(); // 重新计算搜索栏的粘性定位

    // --- 6. 关键步骤：执行智能内存清理 ---
    // 这是为了清除从搜索操作中可能残留的不相关月份的数据，防止污染首页视图。
    performance.cleanup();
    console.log('🧹 Performed memory cleanup after resetting view.');


    // --- 7. 如果需要，重新加载首页内容 ---
    if (reload) {
        // 先清空当前的论文容器，为加载新内容做准备
        papersContainer.innerHTML = '';
        
        // 检查清单文件是否已加载且包含可用月份
        if (state.manifest && state.manifest.availableMonths && state.manifest.availableMonths.length > 0) {
            // 假设 availableMonths 数组已按降序排列，第一个元素即为最新的月份
            const latestMonth = state.manifest.availableMonths[0];
            console.log(`🚀 Navigating to the latest month: ${latestMonth}`);
            
            // 调用 navigateToMonth 来处理加载和渲染。
            // 这是一个健壮的函数，它内部已经处理了会话ID、骨架屏和错误情况。
            await navigateToMonth(latestMonth);
        } else {
            console.warn('No available months in manifest to display on default view.');
            papersContainer.innerHTML = '<p class="text-center text-gray-500 p-8">没有可用的论文数据。</p>';
        }
    }
}

function performTagSearch(tag) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    searchInput.value = tag;
    updateClearButtonVisibility();
    handleSearch();
};

function setupIntersectionObserver() {
    // 如果已存在观察者，先断开
    if (state.virtualScroll.observer) {
        state.virtualScroll.observer.disconnect();
    }

    const options = { root: null, rootMargin: '400px', threshold: 0 };

    state.virtualScroll.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !state.isFetching) {
                // 检查当前是否有待渲染的论文
                if (state.virtualScroll.renderedIndex < state.virtualScroll.allPapersToRender.length) {
                    console.log(`[Observer] 渲染下一批次...`);
                    renderNextBatch();
                } 
                // 如果当前列表渲染完了，并且不在搜索模式，就加载下一月
                else if (!state.isSearchMode) {
                    console.log(`[Observer] 当前月份渲染完毕，加载下一月...`);
                    loadNextMonth();
                }
            }
        });
    }, options);

    if (loader) {
        state.virtualScroll.observer.observe(loader);
    }
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

function setupGlobalEventListeners() {
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
        if (!target) return; // 移除 isFetching 检查，由每个 case 自己处理

        const { action, paperId, tagValue, month, day, tag, rating, fullDate } = target.dataset;

        switch (action) {
            case 'toggle-ai-details': toggleAIDetails(paperId); break;
            case 'search-tag': performTagSearch(tagValue); break;
            case 'toggle-favorite': toggleFavorite(event, paperId, target); break;
            // 将分享改为打开分享菜单，并传入触发元素用于定位
            case 'share-paper': sharePaper(paperId, target); break;
            case 'toggle-notes': togglePaperNotes(paperId); break;
            case 'save-note':
                const textarea = document.querySelector(`#paper-notes-${paperId} textarea`);
                if (textarea) savePaperNote(paperId, textarea.value);
                showToast('笔记已保存');
                break;
            case 'remove-tag': removePaperTag(paperId, tag); break;
            case 'rate-paper': setPaperRating(paperId, parseInt(rating)); break;

            
            case 'filter-by-date': {
                // 这个 case 现在只负责更新状态和调用核心渲染函数
                // 所有关于观察者和锁的复杂逻辑都已移除

                const selectedMonth = target.dataset.month;
                const selectedDay = target.dataset.day;
                const selectedFullDate = target.dataset.fullDate;

                console.log(`[ACTION] Filter by Date: month=${selectedMonth}, day=${selectedDay}, fullDate=${selectedFullDate}`);

                // 1. 更新全局日期筛选状态
                if (selectedDay === 'all') {
                    currentDateFilter = { startDate: null, endDate: null, period: null };
                } else {
                    const normalizedDate = normalizeDateString(selectedFullDate);
                    currentDateFilter = { startDate: normalizedDate, endDate: normalizedDate, period: 'custom' };
                }
                
                // 2. CRITICAL: 当日期改变时，必须重置子筛选器（分类）
                state.activeCategoryFilter = null;
                
                // 3. [THE FIX] 只更新当前被操作的月份的视图
                const papersForMonth = filterPapersByMonth(selectedMonth);
                state.renderSessionId++; // 启动新会话
                updateMonthView(selectedMonth, papersForMonth, state.renderSessionId);

                // 4. 更新所有日期按钮的UI状态
                updateAllDateButtonStates();
                break;
            }

            // [FINAL-VERIFIED FIX]
            case 'filter-by-category': {
                // 同样，这个 case 现在也非常简洁

                const selectedMonth = target.dataset.month;
                const selectedCategory = target.dataset.category;
                
                console.log(`[ACTION] Filter by Category: month=${selectedMonth}, category=${selectedCategory}`);

                // 1. 更新分类状态
                state.activeCategoryFilter = selectedCategory;

                // 2. 只重新渲染当前月份的视图
                const papersForMonth = filterPapersByMonth(selectedMonth);
                state.renderSessionId++; // 启动新会话
                updateMonthView(selectedMonth, papersForMonth, state.renderSessionId);
                break;
            }
            // ========================================================================

            case 'clear-category-filter': {
                // 清理这个 case，移除不必要的逻辑
                const selectedMonth = target.dataset.month;
                
                // 清除分类筛选
                state.activeCategoryFilter = null;
                
                // 重新渲染当前月份的视图
                const papersForMonth = filterPapersByMonth(selectedMonth);
                state.renderSessionId++; // 启动新会话
                updateMonthView(selectedMonth, papersForMonth, state.renderSessionId);
                break;
            }
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
            renderFilteredResults_FIXED();
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
            console.log(`🗓️ 点击日期筛选按钮: ${date}`);
            console.log(`📊 点击前状态:`, {
                当前搜索结果数量: state.currentSearchResults.length,
                当前查询: state.currentQuery,
                搜索模式: state.isSearchMode
            });
 
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
                console.log(`🔄 重置日期筛选`);
            } else {
                currentDateFilter = { startDate: date, endDate: date, period: 'custom' };
                // 修复时区问题：直接从日期字符串解析，避免时区转换导致的日期偏移
                const dateParts = date.split('-');
                const month = parseInt(dateParts[1], 10);
                const day = parseInt(dateParts[2], 10);
                updateDateFilterDisplay(`${month}/${day}`);
                console.log(`🔥 设置ENHANCED日期筛选:`, currentDateFilter);
                
                // 详细检查搜索结果中的日期分布
                const dateStats = {};
                state.currentSearchResults.forEach(paper => {
                    const paperDate = paper.date.includes('T') ? paper.date.split('T')[0] : paper.date;
                    dateStats[paperDate] = (dateStats[paperDate] || 0) + 1;
                });
                console.log(`� 搜索结果日期分布:`, dateStats);
                
                // 检查即将筛选的特定日期
                const targetPapers = state.currentSearchResults.filter(paper => {
                    const paperDate = paper.date.includes('T') ? paper.date.split('T')[0] : paper.date;
                    return paperDate === date;
                });
                console.log(`🎯 目标日期 ${date} 的论文数量: ${targetPapers.length}`);
                if (targetPapers.length > 0) {
                    console.log(`📄 目标日期论文样例:`, targetPapers.slice(0, 3).map(p => ({
                        id: p.id,
                        title: p.title.substring(0, 50) + '...',
                        date: p.date
                    })));
                }
            }
            
            console.log(`�📊 筛选前搜索结果数量: ${state.currentSearchResults.length}`);
            renderFilteredResults_FIXED();
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
    searchInput.addEventListener('input', (event) => {
        // 输入时只更新UI（如清除按钮和搜索建议），不自动搜索
        updateClearButtonVisibility();
        showSearchSuggestions(event.target.value);
    });

    // 键盘导航支持
    searchInput.addEventListener('keydown', (event) => {
        // 当搜索建议可见时，处理上下键和回车键
        if (searchSuggestions.classList.contains('visible') && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) {
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
                    event.preventDefault(); // 阻止任何默认行为，如表单提交
                    if (state.currentSuggestionIndex >= 0) {
                        const suggestion = items[state.currentSuggestionIndex]?.dataset.suggestion;
                        if (suggestion) {
                            selectSuggestion(suggestion); // selectSuggestion 内部会调用 handleSearch
                        }
                    } else {
                        // 如果没有高亮建议，则直接使用输入框内容进行搜索
                        handleSearch();
                        hideSearchSuggestions();
                    }
                    break;
                case 'Escape':
                    hideSearchSuggestions();
                    break;
            }
        } else if (event.key === 'Enter') {
            // 当搜索建议不可见时，回车键直接触发搜索
            event.preventDefault();
            handleSearch();
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
        const papersInMonth = filterPapersByMonth(month);
        updateMonthView(month, papersInMonth); // filterPapersByMonth 已经包含排序
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
                // 自动备份功能会触发文件下载，如果不需要可以注释掉下面这行
                // exportUserData('all');
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

// 初始化个性化快捷键
setTimeout(setupPersonalizedKeyboardShortcuts, 3000);

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

// 基础分享实现
function sharePaperCopyLink(paperId) {
    const paper = state.allPapers.get(paperId);
    if (!paper) return;
    const url = `https://arxiv.org/abs/${paper.id}`;
    navigator.clipboard.writeText(url).then(() => showToast('链接已复制到剪贴板'));
    recordPaperInteraction(paperId, 'share_copy_link');
}

function sharePaperCopyCitation(paperId) {
    const paper = state.allPapers.get(paperId);
    if (!paper) return;
    const text = formatPaperCitation(paper, 'apa');
    navigator.clipboard.writeText(text).then(() => showToast('引用已复制到剪贴板'));
    recordPaperInteraction(paperId, 'share_copy_citation');
}

function sharePaperViaEmail(paperId) {
    const paper = state.allPapers.get(paperId);
    if (!paper) return;
    const subject = encodeURIComponent(`分享论文: ${paper.title}`);
    const body = encodeURIComponent(`${paper.title}\n${paper.authors || 'Unknown'}\nhttps://arxiv.org/abs/${paper.id}\n\n${(paper.abstract || '').slice(0, 300)}...`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    recordPaperInteraction(paperId, 'share_email');
}

function sharePaperViaSMS(paperId) {
    const paper = state.allPapers.get(paperId);
    if (!paper) return;
    const text = encodeURIComponent(`${paper.title} - https://arxiv.org/abs/${paper.id}`);
    // 桌面端多数无效，移动端生效
    window.location.href = `sms:?&body=${text}`;
    recordPaperInteraction(paperId, 'share_sms');
}

// 复制 AlphaXiv 链接
function sharePaperCopyAlphaXiv(paperId) {
    const paper = state.allPapers.get(paperId);
    if (!paper) return;
    const url = `https://www.alphaxiv.org/overview/${paper.id}`;
    navigator.clipboard.writeText(url).then(() => showToast('AlphaXiv 链接已复制到剪贴板'));
    recordPaperInteraction(paperId, 'share_alphaxiv_copy');
}

// 系统分享（带兜底复制）
function enhancedSharePaper(paperId, format = 'formatted') {
    const paper = state.allPapers.get(paperId);
    if (!paper) return;

    let text = '';
    switch (format) {
        case 'citation':
            text = formatPaperCitation(paper, 'apa');
            break;
        case 'simple':
            text = `${paper.title} - https://arxiv.org/abs/${paper.id}`;
            break;
        case 'formatted':
        default:
            text = `📖 ${paper.title}\n👥 ${paper.authors || 'Unknown'}\n🔗 https://arxiv.org/abs/${paper.id}\n\n📄 ${(paper.abstract || '').slice(0, 200)}...`;
    }

    if (navigator.share) {
        navigator.share({ title: paper.title, text, url: `https://arxiv.org/abs/${paper.id}` }).catch(()=>{});
    } else {
        navigator.clipboard.writeText(text).then(() => showToast('分享内容已复制到剪贴板'));
    }
    recordPaperInteraction(paperId, 'share_system');
}

// 轻量分享菜单
function openShareMenu(paperId, anchorEl) {
    closeShareMenu();

    const menu = document.createElement('div');
    menu.id = 'share-menu';
    menu.className = 'share-menu';
    menu.innerHTML = `
        <button data-share-action="system">系统分享</button>
        <button data-share-action="copy-link">复制链接</button>
        <button data-share-action="copy-citation">复制引用</button>
        <button data-share-action="alphaxiv-copy">复制 AlphaXiv 链接</button>
        <button data-share-action="email">邮件发送</button>
        <button data-share-action="sms">短信发送</button>
    `;

    // 基础样式（不依赖外部CSS）
    menu.style.cssText = `
        position: absolute;
        z-index: 10000;
        background: var(--bg, #fff);
        color: var(--fg, #111);
        border: 1px solid rgba(0,0,0,0.1);
        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        border-radius: 10px;
        padding: 6px;
        display: flex;
        flex-direction: column;
        min-width: 180px;
    `;
    document.body.appendChild(menu);

    [...menu.querySelectorAll('button')].forEach(btn => {
        btn.style.cssText = `
            padding: 8px 10px;
            text-align: left;
            background: transparent;
            border: none;
            cursor: pointer;
            border-radius: 8px;
        `;
        btn.addEventListener('mouseover', () => btn.style.background = 'rgba(0,0,0,0.05)');
        btn.addEventListener('mouseout', () => btn.style.background = 'transparent');
    });

    // 定位菜单
    const rect = anchorEl.getBoundingClientRect();
    const top = window.scrollY + rect.bottom + 8;
    // 先临时设置以获取真实宽度
    menu.style.top = `-9999px`;
    menu.style.left = `-9999px`;
    const menuWidth = menu.offsetWidth || 180;
    const left = Math.min(window.scrollX + rect.left, window.scrollX + window.innerWidth - menuWidth - 12);
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;

    // 点击处理
    menu.addEventListener('click', (e) => {
        const action = e.target?.dataset?.shareAction;
        if (!action) return;

        switch (action) {
            case 'system': enhancedSharePaper(paperId, 'formatted'); break;
            case 'copy-link': sharePaperCopyLink(paperId); break;
            case 'copy-citation': sharePaperCopyCitation(paperId); break;
            case 'alphaxiv-copy': sharePaperCopyAlphaXiv(paperId); break;
            case 'email': sharePaperViaEmail(paperId); break;
            case 'sms': sharePaperViaSMS(paperId); break;
        }
        closeShareMenu();
    });

    // 点击外部或 Esc 关闭
    setTimeout(() => {
        document.addEventListener('click', onOutside, { capture: true });
        document.addEventListener('keydown', onEsc, { capture: true });
    }, 0);

    function onOutside(ev) {
        if (!menu.contains(ev.target) && ev.target !== anchorEl) {
            closeShareMenu();
        }
    }
    function onEsc(ev) {
        if (ev.key === 'Escape') closeShareMenu();
    }
    function closeShareMenu() {
        const el = document.getElementById('share-menu');
        if (el) el.remove();
        document.removeEventListener('click', onOutside, { capture: true });
        document.removeEventListener('keydown', onEsc, { capture: true });
    }
}

function closeShareMenu() {
    const el = document.getElementById('share-menu');
    if (el) el.remove();
}


// 将全局 sharePaper 指向“打开菜单”
window.sharePaper = function(paperId, anchorEl) {
    openShareMenu(paperId, anchorEl || document.body);
};

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

document.addEventListener('DOMContentLoaded', init);