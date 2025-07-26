// 调试日期筛选问题的测试脚本
// 在浏览器控制台中运行此脚本来诊断问题

function debugDateFilter() {
    console.log('=== 日期筛选调试信息 ===');
    
    // 1. 检查当前状态
    console.log('当前活跃的日期筛选:', Object.fromEntries(state.activeDateFilters));
    console.log('当前月份索引:', state.currentMonthIndex);
    console.log('当前加载的月份:', Array.from(state.loadedMonths));
    
    // 2. 检查论文数据
    const currentMonth = state.manifest?.availableMonths?.[state.currentMonthIndex];
    if (currentMonth) {
        console.log('当前月份:', currentMonth);
        
        const monthPrefix = currentMonth.replace('-', '').substring(2);
        console.log('月份前缀:', monthPrefix);
        
        const papersInCurrentMonth = Array.from(state.allPapers.values())
            .filter(p => p.id && p.id.startsWith(monthPrefix));
        
        console.log(`${currentMonth} 月份论文数量:`, papersInCurrentMonth.length);
        
        // 按日期分组统计
        const dateGroups = {};
        papersInCurrentMonth.forEach(paper => {
            if (paper.date) {
                dateGroups[paper.date] = (dateGroups[paper.date] || 0) + 1;
            }
        });
        
        console.log('各日期论文数量:', dateGroups);
        
        // 检查特定日期的论文
        const sampleDate = Object.keys(dateGroups)[0];
        if (sampleDate) {
            const papersOnDate = papersInCurrentMonth.filter(p => p.date === sampleDate);
            console.log(`${sampleDate} 的论文:`, papersOnDate.slice(0, 3).map(p => ({
                id: p.id,
                title: p.title?.substring(0, 50) + '...',
                date: p.date
            })));
        }
    }
    
    // 3. 检查日期筛选按钮
    const dateButtons = document.querySelectorAll('.date-filter-btn');
    console.log('日期筛选按钮数量:', dateButtons.length);
    
    dateButtons.forEach(btn => {
        const month = btn.dataset.month;
        const fullDate = btn.dataset.fullDate;
        const day = btn.dataset.day;
        const isActive = btn.classList.contains('active');
        
        if (fullDate || day === 'all') {
            console.log('按钮信息:', {
                text: btn.textContent.trim(),
                month: month,
                fullDate: fullDate,
                day: day,
                isActive: isActive
            });
        }
    });
    
    console.log('=== 调试信息结束 ===');
}

// 检查日期按钮点击事件
function testDateButtonClick(targetDate) {
    console.log(`模拟点击日期: ${targetDate}`);
    
    const targetButton = Array.from(document.querySelectorAll('.date-filter-btn'))
        .find(btn => btn.dataset.fullDate === targetDate);
    
    if (targetButton) {
        console.log('找到目标按钮:', targetButton);
        targetButton.click();
        
        // 延迟检查结果
        setTimeout(() => {
            console.log('点击后的状态:');
            debugDateFilter();
        }, 100);
    } else {
        console.log('未找到目标按钮');
    }
}

// 导出到全局作用域
window.debugDateFilter = debugDateFilter;
window.testDateButtonClick = testDateButtonClick;

console.log('调试函数已加载。使用 debugDateFilter() 查看当前状态，使用 testDateButtonClick("2025-07-23") 测试点击。');
