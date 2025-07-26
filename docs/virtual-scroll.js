// 虚拟滚动优化 - 立即可实施的性能提升
class VirtualScrollRenderer {
    constructor(container, itemHeight = 280, bufferSize = 5) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.bufferSize = bufferSize;
        this.scrollTop = 0;
        this.containerHeight = window.innerHeight;
        this.totalItems = 0;
        this.visibleStart = 0;
        this.visibleEnd = 0;
        this.renderedElements = new Map();
        this.papers = [];
        
        this.setupScrollListener();
        this.setupResizeListener();
    }
    
    setupScrollListener() {
        let ticking = false;
        
        const updateScroll = () => {
            this.scrollTop = window.pageYOffset;
            this.updateVisibleRange();
            this.render();
            ticking = false;
        };
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateScroll);
                ticking = true;
            }
        });
    }
    
    setupResizeListener() {
        window.addEventListener('resize', () => {
            this.containerHeight = window.innerHeight;
            this.updateVisibleRange();
            this.render();
        });
    }
    
    updateVisibleRange() {
        const start = Math.floor(this.scrollTop / this.itemHeight);
        const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
        const end = start + visibleCount;
        
        this.visibleStart = Math.max(0, start - this.bufferSize);
        this.visibleEnd = Math.min(this.totalItems, end + this.bufferSize);
    }
    
    setPapers(papers) {
        this.papers = papers;
        this.totalItems = papers.length;
        this.updateVisibleRange();
        this.render();
    }
    
    render() {
        if (this.papers.length === 0) return;
        
        // 创建或更新容器结构
        if (!this.scrollContainer) {
            this.setupContainer();
        }
        
        // 更新总高度
        this.scrollContainer.style.height = `${this.totalItems * this.itemHeight}px`;
        
        // 清理不再可见的元素
        this.cleanupInvisibleElements();
        
        // 渲染当前可见范围的元素
        this.renderVisibleElements();
        
        // 更新调试信息
        this.updateDebugInfo();
    }
    
    setupContainer() {
        // 创建滚动容器
        this.scrollContainer = document.createElement('div');
        this.scrollContainer.style.cssText = `
            position: relative;
            width: 100%;
            min-height: 100vh;
        `;
        
        // 创建内容容器
        this.contentContainer = document.createElement('div');
        this.contentContainer.style.cssText = `
            position: relative;
            width: 100%;
        `;
        
        this.scrollContainer.appendChild(this.contentContainer);
        
        // 替换原容器内容
        this.container.innerHTML = '';
        this.container.appendChild(this.scrollContainer);
        
        // 添加调试信息容器
        this.debugContainer = document.createElement('div');
        this.debugContainer.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 1000;
            display: none;
        `;
        document.body.appendChild(this.debugContainer);
    }
    
    cleanupInvisibleElements() {
        const toRemove = [];
        
        for (const [index, element] of this.renderedElements) {
            if (index < this.visibleStart || index >= this.visibleEnd) {
                element.remove();
                toRemove.push(index);
            }
        }
        
        toRemove.forEach(index => this.renderedElements.delete(index));
    }
    
    renderVisibleElements() {
        for (let i = this.visibleStart; i < this.visibleEnd; i++) {
            if (i >= this.papers.length) break;
            
            if (!this.renderedElements.has(i)) {
                const element = this.createPaperElement(this.papers[i], i);
                this.contentContainer.appendChild(element);
                this.renderedElements.set(i, element);
            }
        }
    }
    
    createPaperElement(paper, index) {
        const card = document.createElement('div');
        card.className = 'paper-card virtual-paper-card';
        card.style.cssText = `
            position: absolute;
            top: ${index * this.itemHeight}px;
            width: 100%;
            min-height: ${this.itemHeight - 20}px;
            background-color: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1rem;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            box-shadow: 0 2px 4px var(--shadow-light);
        `;
        
        // 简化的卡片内容，只包含关键信息
        card.innerHTML = this.createSimplifiedCardContent(paper);
        
        // 鼠标悬停效果
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 8px 25px var(--shadow-dark)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 2px 4px var(--shadow-light)';
        });
        
        // 点击展开完整内容
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button') && !e.target.closest('a')) {
                this.expandPaper(card, paper);
            }
        });
        
        return card;
    }
    
    createSimplifiedCardContent(paper) {
        const categories = paper.categories ? paper.categories.slice(0, 3).join(', ') : '';
        const keywords = paper.keywords ? paper.keywords.slice(0, 5) : [];
        
        return `
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center space-x-2 text-sm text-gray-500">
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        ${paper.date || '未知日期'}
                    </span>
                    ${categories ? `<span class="text-xs">${categories}</span>` : ''}
                </div>
                <div class="flex items-center space-x-1">
                    <button class="favorite-btn p-2 rounded-full hover:bg-gray-100 transition-colors" 
                            data-paper-id="${paper.id}" 
                            title="收藏论文">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                        </svg>
                    </button>
                    <button class="expand-btn p-2 rounded-full hover:bg-gray-100 transition-colors" 
                            title="展开详情">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M19 9l-7 7-7-7"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <h2 class="text-lg font-bold mb-2 text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors">
                ${paper.title || '无标题'}
            </h2>
            
            ${paper.title_zh ? `
                <h3 class="text-md font-semibold mb-2 text-blue-600 line-clamp-2">
                    ${paper.title_zh}
                </h3>
            ` : ''}
            
            <p class="text-sm text-gray-600 mb-3 line-clamp-2">
                ${paper.authors ? paper.authors.slice(0, 100) + (paper.authors.length > 100 ? '...' : '') : '未知作者'}
            </p>
            
            ${paper.summary ? `
                <div class="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3 rounded-r">
                    <p class="text-sm text-blue-800 font-medium line-clamp-2">
                        TL;DR: ${paper.summary}
                    </p>
                </div>
            ` : ''}
            
            ${keywords.length > 0 ? `
                <div class="flex flex-wrap gap-1 mb-3">
                    ${keywords.map(keyword => `
                        <span class="keyword-tag px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs cursor-pointer hover:bg-blue-100 hover:text-blue-800 transition-colors">
                            ${keyword}
                        </span>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="flex items-center justify-between pt-2 border-t border-gray-200">
                <div class="flex items-center space-x-3 text-sm">
                    ${paper.arxiv_id ? `
                        <a href="https://arxiv.org/abs/${paper.arxiv_id}" 
                           target="_blank" 
                           class="text-blue-600 hover:text-blue-800 transition-colors"
                           title="查看 arXiv 页面">
                            📄 Abstract
                        </a>
                    ` : ''}
                    ${paper.arxiv_id ? `
                        <a href="https://arxiv.org/pdf/${paper.arxiv_id}.pdf" 
                           target="_blank" 
                           class="text-red-600 hover:text-red-800 transition-colors"
                           title="下载 PDF">
                            📊 PDF
                        </a>
                    ` : ''}
                </div>
                <div class="text-xs text-gray-400">
                    点击展开详情
                </div>
            </div>
        `;
    }
    
    async expandPaper(cardElement, paper) {
        // 检查是否已经展开
        if (cardElement.classList.contains('expanded')) {
            this.collapsePaper(cardElement);
            return;
        }
        
        // 显示加载状态
        const expandBtn = cardElement.querySelector('.expand-btn svg');
        if (expandBtn) {
            expandBtn.style.transform = 'rotate(180deg)';
        }
        
        cardElement.classList.add('expanded');
        cardElement.style.minHeight = 'auto';
        cardElement.style.zIndex = '10';
        
        // 创建详细内容
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'paper-details-expanded';
        detailsContainer.style.cssText = `
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 2px solid var(--border-primary);
            animation: fadeIn 0.3s ease-out;
        `;
        
        // 获取完整的论文内容
        const fullContent = await this.loadFullPaperContent(paper);
        detailsContainer.innerHTML = fullContent;
        
        cardElement.appendChild(detailsContainer);
        
        // 滚动到卡片位置
        cardElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }
    
    collapsePaper(cardElement) {
        const detailsContainer = cardElement.querySelector('.paper-details-expanded');
        if (detailsContainer) {
            detailsContainer.remove();
        }
        
        cardElement.classList.remove('expanded');
        cardElement.style.minHeight = `${this.itemHeight - 20}px`;
        cardElement.style.zIndex = 'auto';
        
        const expandBtn = cardElement.querySelector('.expand-btn svg');
        if (expandBtn) {
            expandBtn.style.transform = 'rotate(0deg)';
        }
    }
    
    async loadFullPaperContent(paper) {
        try {
            // 模拟加载详细内容
            return `
                ${paper.abstract ? `
                    <div class="mb-4">
                        <h4 class="font-semibold text-gray-900 mb-2">摘要</h4>
                        <p class="text-sm text-gray-700 leading-relaxed">
                            ${paper.abstract}
                        </p>
                    </div>
                ` : ''}
                
                ${paper.translation && paper.translation.abstract ? `
                    <div class="mb-4">
                        <h4 class="font-semibold text-gray-900 mb-2">中文摘要</h4>
                        <p class="text-sm text-gray-700 leading-relaxed">
                            ${paper.translation.abstract}
                        </p>
                    </div>
                ` : ''}
                
                ${paper.translation && paper.translation.tldr ? `
                    <div class="mb-4">
                        <h4 class="font-semibold text-gray-900 mb-2">AI 解读</h4>
                        <div class="space-y-3 text-sm">
                            ${paper.translation.motivation ? `
                                <div>
                                    <strong class="text-blue-600">动机：</strong>
                                    <span class="text-gray-700">${paper.translation.motivation}</span>
                                </div>
                            ` : ''}
                            ${paper.translation.method ? `
                                <div>
                                    <strong class="text-green-600">方法：</strong>
                                    <span class="text-gray-700">${paper.translation.method}</span>
                                </div>
                            ` : ''}
                            ${paper.translation.result ? `
                                <div>
                                    <strong class="text-orange-600">结果：</strong>
                                    <span class="text-gray-700">${paper.translation.result}</span>
                                </div>
                            ` : ''}
                            ${paper.translation.conclusion ? `
                                <div>
                                    <strong class="text-purple-600">结论：</strong>
                                    <span class="text-gray-700">${paper.translation.conclusion}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
                
                <div class="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                    <button class="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                            onclick="this.closest('.paper-card').querySelector('.expand-btn').click()">
                        收起
                    </button>
                </div>
            `;
        } catch (error) {
            console.error('Failed to load paper details:', error);
            return `
                <div class="text-center py-4 text-red-500">
                    <p class="text-sm">加载详细内容失败</p>
                    <button class="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                            onclick="this.closest('.paper-card').querySelector('.expand-btn').click()">
                        重试
                    </button>
                </div>
            `;
        }
    }
    
    updateDebugInfo() {
        if (window.location.search.includes('debug=true')) {
            this.debugContainer.style.display = 'block';
            this.debugContainer.innerHTML = `
                <div>总数: ${this.totalItems}</div>
                <div>可见: ${this.visibleStart} - ${this.visibleEnd}</div>
                <div>已渲染: ${this.renderedElements.size}</div>
                <div>滚动: ${Math.round(this.scrollTop)}px</div>
                <div>内存: ${Math.round(performance.memory?.usedJSHeapSize / 1024 / 1024 || 0)}MB</div>
            `;
        }
    }
    
    // 公共 API
    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    scrollToIndex(index) {
        const targetY = index * this.itemHeight;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
    
    refresh() {
        this.renderedElements.clear();
        this.contentContainer.innerHTML = '';
        this.render();
    }
    
    destroy() {
        if (this.debugContainer) {
            this.debugContainer.remove();
        }
        this.renderedElements.clear();
        window.removeEventListener('scroll', this.scrollHandler);
        window.removeEventListener('resize', this.resizeHandler);
    }
}

// CSS 样式增强
const virtualScrollStyles = `
<style>
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.virtual-paper-card {
    will-change: transform;
    contain: layout style paint;
}

.virtual-paper-card.expanded {
    background-color: var(--bg-primary);
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    border-color: var(--accent-primary);
}

.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.keyword-tag {
    transition: all 0.2s ease;
}

.favorite-btn.favorited {
    color: #ef4444;
}

.expand-btn svg {
    transition: transform 0.3s ease;
}

/* 响应式优化 */
@media (max-width: 768px) {
    .virtual-paper-card {
        padding: 1rem;
        margin-bottom: 0.75rem;
    }
    
    .virtual-paper-card h2 {
        font-size: 1rem;
    }
    
    .virtual-paper-card .flex {
        flex-direction: column;
        gap: 0.5rem;
    }
}
</style>
`;

// 添加样式到页面
if (!document.querySelector('#virtual-scroll-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'virtual-scroll-styles';
    styleElement.innerHTML = virtualScrollStyles;
    document.head.appendChild(styleElement);
}

// 导出类供使用
window.VirtualScrollRenderer = VirtualScrollRenderer;
