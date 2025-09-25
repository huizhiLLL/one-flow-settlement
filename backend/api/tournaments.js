import cloud from '@lafjs/cloud'

// 获取数据库集合
const db = cloud.database()
const collection = db.collection('tournaments')

/**
 * 计算比赛手续费和相关费用
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
    
    if (!data.tournamentType || !['协会机构', '高校联赛', '高校校园赛'].includes(data.tournamentType)) {
        errors.push('请选择正确的比赛类型');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

export default async function (ctx) {
    const { method, body, query } = ctx
    
    try {
        switch (method) {
            case 'GET':
                // 获取比赛列表或单个比赛
                if (query.id) {
                    return await getTournamentById(query.id)
                } else {
                    return await getAllTournaments(query)
                }
                
            case 'POST':
                // 创建新比赛
                return await createTournament(body)
                
            case 'PUT':
                // 更新比赛信息
                if (!query.id) {
                    return { success: false, error: '缺少比赛ID' }
                }
                return await updateTournament(query.id, body)
                
            case 'DELETE':
                // 删除比赛
                if (!query.id) {
                    return { success: false, error: '缺少比赛ID' }
                }
                return await deleteTournament(query.id)
                
            case 'PATCH':
                // 切换结算状态
                if (!query.id) {
                    return { success: false, error: '缺少比赛ID' }
                }
                return await toggleSettlement(query.id, body.isSettled)
                
            default:
                return { success: false, error: '不支持的请求方法' }
        }
    } catch (error) {
        console.error('API错误:', error)
        return { 
            success: false, 
            error: error.message || '服务器内部错误' 
        }
    }
}

/**
 * 获取所有比赛
 */
async function getAllTournaments(query = {}) {
    try {
        const { page = 1, limit = 20, sort = 'eventDate', order = 'desc' } = query
        
        const skip = (page - 1) * limit
        const sortObj = { [sort]: order === 'desc' ? -1 : 1 }
        
        const tournaments = await collection
            .orderBy(sortObj)
            .skip(skip)
            .limit(parseInt(limit))
            .get()
            
        const total = await collection.count()
        
        return {
            success: true,
            data: {
                tournaments: tournaments.data,
                total: total.total,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        }
    } catch (error) {
        throw new Error('获取比赛列表失败: ' + error.message)
    }
}

/**
 * 根据ID获取比赛
 */
async function getTournamentById(id) {
    try {
        const result = await collection.doc(id).get()
        
        if (!result.data) {
            return { success: false, error: '比赛记录不存在' }
        }
        
        return {
            success: true,
            data: result.data
        }
    } catch (error) {
        throw new Error('获取比赛详情失败: ' + error.message)
    }
}

/**
 * 创建新比赛
 */
async function createTournament(data) {
    try {
        // 验证数据
        const validation = validateTournamentData(data)
        if (!validation.isValid) {
            return {
                success: false,
                error: validation.errors.join('; ')
            }
        }
        
        // 计算费用
        const calculatedData = calculateFees(data)
        
        // 准备保存的数据
        const tournamentData = {
            ...data,
            ...calculatedData,
            isSettled: false,
            createdAt: new Date(),
            updatedAt: new Date()
        }
        
        const result = await collection.add(tournamentData)
        
        return {
            success: true,
            data: {
                _id: result.id,
                ...tournamentData
            }
        }
    } catch (error) {
        throw new Error('创建比赛失败: ' + error.message)
    }
}

/**
 * 更新比赛信息
 */
async function updateTournament(id, data) {
    try {
        // 验证数据
        const validation = validateTournamentData(data)
        if (!validation.isValid) {
            return {
                success: false,
                error: validation.errors.join('; ')
            }
        }
        
        // 重新计算费用
        const calculatedData = calculateFees(data)
        
        const updateData = {
            ...data,
            ...calculatedData,
            updatedAt: new Date()
        }
        
        const result = await collection.doc(id).update(updateData)
        
        if (result.updated === 0) {
            return { success: false, error: '比赛记录不存在' }
        }
        
        // 获取更新后的数据
        const updated = await collection.doc(id).get()
        
        return {
            success: true,
            data: updated.data
        }
    } catch (error) {
        throw new Error('更新比赛失败: ' + error.message)
    }
}

/**
 * 删除比赛
 */
async function deleteTournament(id) {
    try {
        const result = await collection.doc(id).remove()
        
        if (result.deleted === 0) {
            return { success: false, error: '比赛记录不存在' }
        }
        
        return {
            success: true,
            data: { deleted: true }
        }
    } catch (error) {
        throw new Error('删除比赛失败: ' + error.message)
    }
}

/**
 * 切换结算状态
 */
async function toggleSettlement(id, isSettled) {
    try {
        const result = await collection.doc(id).update({
            isSettled,
            updatedAt: new Date()
        })
        
        if (result.updated === 0) {
            return { success: false, error: '比赛记录不存在' }
        }
        
        // 获取更新后的数据
        const updated = await collection.doc(id).get()
        
        return {
            success: true,
            data: updated.data
        }
    } catch (error) {
        throw new Error('切换结算状态失败: ' + error.message)
    }
}
