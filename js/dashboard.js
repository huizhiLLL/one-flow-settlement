// 数据看板页面逻辑

// 页面状态

/**
 * 页面初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    loadDashboardData();
    setupEventListeners();
});

/**
 * 初始化页面
 */
function initializePage() {
    // 设置当前日期
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        currentDateElement.textContent = getCurrentDate();
    }
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 导出按钮
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }
    
    // 页面可见性变化时刷新数据
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            loadDashboardData();
        }
    });
}

/**
 * 加载仪表板数据
 */
async function loadDashboardData() {
    try {
        console.log('开始加载仪表板数据...');
        
        // 调用默认的仪表板接口（不传type参数，使用getFullDashboardData）
        const result = await request('/dashboard');
        console.log('仪表板API返回结果:', result);
        
        if (result.success) {
            updateStatistics(result.data);
            updateRecentTournaments(result.data.recentTournaments || []);
        } else {
            console.error('仪表板API调用失败:', result);
            showError('加载数据失败：' + (result.error || '未知错误'));
        }
    } catch (error) {
        console.error('加载仪表板数据失败:', error);
        showError('加载数据失败，请稍后重试：' + error.message);
    }
}

/**
 * 更新统计数据显示
 */
function updateStatistics(data) {
    console.log('更新统计数据，收到的data:', data);
    console.log('总收入原始值:', data.totalIncome);
    
    // 总流水
    const totalRevenueElement = document.getElementById('totalRevenue');
    if (totalRevenueElement) {
        totalRevenueElement.textContent = formatCurrency(data.totalRevenue || 0);
    }
    
    // 总收入
    const totalIncomeElement = document.getElementById('totalIncome');
    if (totalIncomeElement) {
        totalIncomeElement.textContent = formatCurrency(data.totalIncome || 0);
        console.log('总收入显示值:', formatCurrency(data.totalIncome || 0));
    }
    
    // 比赛场数
    const totalTournamentsElement = document.getElementById('totalTournaments');
    if (totalTournamentsElement) {
        totalTournamentsElement.textContent = (data.totalTournaments || 0).toString();
    }
    
    // 参赛总人数
    const totalParticipantsElement = document.getElementById('totalParticipants');
    if (totalParticipantsElement) {
        totalParticipantsElement.textContent = (data.totalParticipants || 0).toString();
    }
    
    // 添加动画效果
    animateNumbers();
}


/**
 * 更新最近比赛列表
 */
function updateRecentTournaments(tournaments) {
    const container = document.getElementById('recentTournaments');
    if (!container) return;
    
    if (!tournaments || tournaments.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无比赛记录</div>';
        return;
    }
    
    const html = tournaments.map(tournament => `
        <div class="tournament-item">
            <div class="tournament-info">
                <h4>${tournament.tournamentName}</h4>
                <div class="tournament-meta">
                    ${formatDate(tournament.eventDate, 'YYYY年MM月DD日')} • 
                    ${tournament.participantCount}人参赛 • 
                    ${tournament.tournamentType}
                    ${tournament.isCertified ? ' • 认证赛' : ''}
                </div>
            </div>
            <div class="tournament-amount">
                ${formatCurrency(tournament.totalRevenue)}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}


/**
 * 处理数据导出
 */
async function handleExport() {
    try {
        showLoading();
        
        // 获取所有比赛数据
        const result = await API.Tournament.getAll();
        
        if (result.success && result.data && result.data.tournaments) {
            const tournaments = result.data.tournaments;
            exportToExcel(tournaments, 'one_cube_tournaments');
        } else {
            showError('获取数据失败，无法导出');
        }
    } catch (error) {
        console.error('导出数据失败:', error);
        showError('导出数据失败，请稍后重试');
    } finally {
        hideLoading();
    }
}

/**
 * 数字动画效果
 */
function animateNumbers() {
    const statValues = document.querySelectorAll('.stat-value');
    
    statValues.forEach(element => {
        const finalValue = element.textContent;
        
        // 如果是货币格式，提取数字部分
        let numericValue = 0;
        if (finalValue.includes('¥')) {
            numericValue = parseFloat(finalValue.replace('¥', '').replace(',', '')) || 0;
        } else {
            numericValue = parseFloat(finalValue.replace(',', '')) || 0;
        }
        
        if (numericValue > 0) {
            animateNumber(element, 0, numericValue, finalValue.includes('¥'));
        }
    });
}

/**
 * 数字增长动画
 */
function animateNumber(element, start, end, isCurrency = false) {
    const duration = 1500; // 动画持续时间
    const stepTime = 50; // 步进时间
    const steps = duration / stepTime;
    const increment = (end - start) / steps;
    
    let current = start;
    let step = 0;
    
    const timer = setInterval(() => {
        step++;
        current += increment;
        
        if (step >= steps) {
            current = end;
            clearInterval(timer);
        }
        
        if (isCurrency) {
            // 货币保持两位小数，不进行整数四舍五入
            element.textContent = formatCurrency(current);
        } else {
            // 非货币使用整数显示
            const displayValue = Math.round(current);
            element.textContent = displayValue.toLocaleString();
        }
    }, stepTime);
}

/**
 * 创建空状态显示
 */
function createEmptyState(message = '暂无数据') {
    return `
        <div class="empty-state" style="
            text-align: center;
            padding: 3rem 1rem;
            color: #718096;
            font-size: 1.1rem;
        ">
            <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
            <p>${message}</p>
            <a href="input.html" style="
                display: inline-block;
                margin-top: 1rem;
                padding: 0.75rem 1.5rem;
                background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 500;
            ">录入第一条数据</a>
        </div>
    `;
}

/**
 * 刷新数据
 */
function refreshData() {
    loadDashboardData();
}

/**
 * 定期刷新数据（每5分钟）
 */
setInterval(() => {
    if (!document.hidden) {
        refreshData();
    }
}, 5 * 60 * 1000);

// 导出函数供其他模块使用
if (typeof window !== 'undefined') {
    window.Dashboard = {
        refreshData,
        loadDashboardData,
        updateStatistics,
        updateRecentTournaments
    };
}
