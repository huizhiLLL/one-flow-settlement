// 工具函数库

/**
 * 格式化货币显示
 * @param {number} amount - 金额
 * @param {string} currency - 货币符号
 * @returns {string} 格式化后的货币字符串
 */
function formatCurrency(amount, currency = '¥') {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return `${currency}0.00`;
    }
    return `${currency}${Number(amount).toFixed(2)}`;
}

/**
 * 格式化日期显示
 * @param {string|Date} date - 日期
 * @param {string} format - 格式类型
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date, format = 'YYYY-MM-DD') {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    switch (format) {
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        case 'YYYY年MM月DD日':
            return `${year}年${month}月${day}日`;
        case 'MM-DD':
            return `${month}-${day}`;
        default:
            return `${year}-${month}-${day}`;
    }
}

/**
 * 获取当前日期字符串
 * @param {string} format - 格式类型
 * @returns {string} 当前日期字符串
 */
function getCurrentDate(format = 'YYYY年MM月DD日') {
    return formatDate(new Date(), format);
}

/**
 * 获取月份信息
 * @param {Date} date - 日期对象
 * @returns {object} 月份信息对象
 */
function getMonthInfo(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    return {
        year,
        month: month + 1,
        firstDay,
        lastDay,
        monthName: `${year}年${String(month + 1).padStart(2, '0')}月`
    };
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 显示加载动画
 */
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

/**
 * 隐藏加载动画
 */
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

/**
 * 显示错误消息
 * @param {string} message - 错误消息
 * @param {number} duration - 显示时长
 */
function showError(message, duration = 5000) {
    // 创建错误提示元素
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-toast';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(245, 101, 101, 0.4);
        z-index: 3000;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
        font-weight: 500;
    `;
    errorDiv.textContent = message;
    
    // 添加关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        margin-left: 1rem;
        padding: 0;
        line-height: 1;
    `;
    closeBtn.onclick = () => errorDiv.remove();
    errorDiv.appendChild(closeBtn);
    
    document.body.appendChild(errorDiv);
    
    // 自动删除
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, duration);
}

/**
 * 显示成功消息
 * @param {string} message - 成功消息
 * @param {number} duration - 显示时长
 */
function showSuccess(message, duration = 3000) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-toast';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
        z-index: 3000;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
        font-weight: 500;
    `;
    successDiv.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        margin-left: 1rem;
        padding: 0;
        line-height: 1;
    `;
    closeBtn.onclick = () => successDiv.remove();
    successDiv.appendChild(closeBtn);
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, duration);
}

/**
 * 计算比赛手续费和相关费用
 * @param {object} data - 比赛数据
 * @returns {object} 计算结果
 */
function calculateFees(data) {
    const { 
        totalRevenue = 0, 
        participantCount = 0, 
        tournamentType = '', 
        isCertified = false, 
        medalCount = 0, 
        medalPrice = 18 
    } = data;

    // 手续费计算
    let processingFee = 0;
    if (tournamentType === '协会机构' || tournamentType === '高校联赛') {
        processingFee = totalRevenue * 0.0108; // 1.08%
    } else if (tournamentType === '高校校园赛') {
        processingFee = totalRevenue * 0.004;  // 0.4%
    }

    // 微信手续费
    const wechatFee = totalRevenue * 0.006; // 0.6%

    // 认证费
    let certificationFee = 0;
    if (tournamentType === '协会机构' && isCertified) {
        certificationFee = participantCount;
    }

    // 总手续费
    let totalFee = processingFee + wechatFee + certificationFee;

    // 最低收费处理
    if (tournamentType === '协会机构' && totalFee < 100) {
        totalFee = 100;
    }

    // 奖牌费用
    const medalCost = medalCount * medalPrice;

    // 主办结算费用
    const hostSettlement = totalRevenue - totalFee - medalCost;

    // 总收入
    const totalIncome = certificationFee + processingFee;

    return {
        processingFee: Number(processingFee.toFixed(2)),
        wechatFee: Number(wechatFee.toFixed(2)),
        certificationFee: Number(certificationFee.toFixed(2)),
        totalFee: Number(totalFee.toFixed(2)),
        medalCost: Number(medalCost.toFixed(2)),
        hostSettlement: Number(hostSettlement.toFixed(2)),
        totalIncome: totalIncome  // 不四舍五入，保持精度
    };
}

/**
 * 验证表单数据
 * @param {object} data - 表单数据
 * @returns {object} 验证结果
 */
function validateTournamentData(data) {
    const errors = [];
    
    if (!data.tournamentName || data.tournamentName.trim() === '') {
        errors.push('比赛名称不能为空');
    }
    
    if (!data.eventDate) {
        errors.push('举办日期不能为空');
    }
    
    if (data.participantCount === null || data.participantCount === undefined || data.participantCount < 0) {
        errors.push('参赛人数必须大于等于0');
    }
    
    if (data.withdrawalCount === null || data.withdrawalCount === undefined || data.withdrawalCount < 0) {
        errors.push('退赛人数必须大于等于0');
    }
    
    if (data.totalRevenue === null || data.totalRevenue === undefined || data.totalRevenue < 0) {
        errors.push('流水总计必须大于等于0');
    }
    
    if (data.wechatPayment === null || data.wechatPayment === undefined || data.wechatPayment < 0) {
        errors.push('微信支付必须大于等于0');
    }
    
    if (data.refundBalance === null || data.refundBalance === undefined || data.refundBalance < 0) {
        errors.push('退款结余必须大于等于0');
    }
    
    if (data.medalCount === null || data.medalCount === undefined || data.medalCount < 0) {
        errors.push('奖牌数量必须大于等于0');
    }
    
    if (data.medalPrice === null || data.medalPrice === undefined || data.medalPrice < 0) {
        errors.push('奖牌单价必须大于等于0');
    }
    
    if (!data.tournamentType || !['协会机构', '高校联赛', '高校校园赛'].includes(data.tournamentType)) {
        errors.push('请选择正确的比赛类型');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 导出数据到Excel (客户端实现)
 * @param {Array} data - 要导出的数据
 * @param {string} filename - 文件名
 */
function exportToExcel(data, filename = 'tournament_data') {
    if (!data || data.length === 0) {
        showError('没有数据可以导出');
        return;
    }
    
    // 创建CSV内容
    const headers = [
        '比赛名称', '举办日期', '参赛人数', '退赛人数', '流水总计', 
        '微信支付', '退款结余', '手续费', '微信手续费', '认证费', 
        '总手续费', '奖牌数量', '奖牌费用', '主办结算费用', '总收入', '是否结算'
    ];
    
    let csvContent = '\uFEFF' + headers.join(',') + '\n';
    
    data.forEach(row => {
        const values = [
            `"${row.tournamentName || ''}"`,
            formatDate(row.eventDate),
            row.participantCount || 0,
            row.withdrawalCount || 0,
            row.totalRevenue || 0,
            row.wechatPayment || 0,
            row.refundBalance || 0,
            row.processingFee || 0,
            row.wechatFee || 0,
            row.certificationFee || 0,
            row.totalFee || 0,
            row.medalCount || 0,
            row.medalCost || 0,
            row.hostSettlement || 0,
            row.totalIncome || 0,
            row.isSettled ? '已结算' : '未结算'
        ];
        csvContent += values.join(',') + '\n';
    });
    
    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${formatDate(new Date()).replace(/-/g, '')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('数据导出成功');
}

/**
 * 深拷贝对象
 * @param {any} obj - 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 添加动画样式到页面
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}

// 导出所有函数（如果在模块环境中）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatCurrency,
        formatDate,
        getCurrentDate,
        getMonthInfo,
        debounce,
        throttle,
        showLoading,
        hideLoading,
        showError,
        showSuccess,
        calculateFees,
        validateTournamentData,
        exportToExcel,
        deepClone,
        generateId
    };
}
