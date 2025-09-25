    // 计算逻辑工具函数

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
        totalIncome: Number(totalIncome.toFixed(2))
    };
}

/**
 * 验证比赛数据
 * @param {object} data - 比赛数据
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

module.exports = {
    calculateFees,
    validateTournamentData
};
