import cloud from '@lafjs/cloud'

// 获取数据库
const db = cloud.database()

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
        totalIncome: totalIncome  // 不四舍五入，保持精度
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
        // 设置CORS头
        ctx.response.setHeader('Access-Control-Allow-Origin', '*')
        ctx.response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
        ctx.response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        
        // 处理预检请求
        if (method === 'OPTIONS') {
            return { success: true }
        }
        
        console.log(`处理${method}请求, query:`, query, 'body:', body)
        
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
                if (!body.id) {
                    return { success: false, error: '缺少比赛ID' }
                }
                return await updateTournament(body.id, body)
                
            case 'DELETE':
                // 删除比赛
                if (!body.id) {
                    return { success: false, error: '缺少比赛ID' }
                }
                return await deleteTournament(body.id)
                
            case 'PATCH':
                // 切换结算状态
                if (!body.id) {
                    return { success: false, error: '缺少比赛ID' }
                }
                return await toggleSettlement(body.id, body.isSettled)
                
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
        console.log('开始获取比赛列表，参数:', query)
        
        const { page = 1, limit = 20, sort = 'eventDate', order = 'desc' } = query
        
        // 获取tournaments集合
        const collection = db.collection('tournaments')
        
        // 构建查询
        let dbQuery = collection
        
        // 添加排序
        const sortField = sort || 'eventDate'
        const sortOrder = order === 'asc' ? 1 : -1
        dbQuery = dbQuery.orderBy(sortField, sortOrder === 1 ? 'asc' : 'desc')
        
        // 分页
        const skip = (parseInt(page) - 1) * parseInt(limit)
        if (skip > 0) {
            dbQuery = dbQuery.skip(skip)
        }
        dbQuery = dbQuery.limit(parseInt(limit))
        
        // 执行查询
        console.log('执行数据库查询...')
        const result = await dbQuery.get()
        console.log('查询结果:', result)
        
        // 获取总数
        const countResult = await collection.count()
        console.log('总数查询结果:', countResult)
        
        const tournaments = result.data || []
        const total = countResult.total || 0
        
        console.log(`成功获取${tournaments.length}条记录，总计${total}条`)
        
        return {
            success: true,
            data: {
                tournaments: tournaments,
                total: total,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        }
    } catch (error) {
        console.error('获取比赛列表失败:', error)
        throw new Error('获取比赛列表失败: ' + error.message)
    }
}

/**
 * 根据ID获取比赛
 */
async function getTournamentById(id) {
    try {
        console.log('获取比赛详情, ID:', id)
        
        const collection = db.collection('tournaments')
        const result = await collection.doc(id).get()
        
        if (!result.data) {
            return { success: false, error: '比赛记录不存在' }
        }
        
        return {
            success: true,
            data: result.data
        }
    } catch (error) {
        console.error('获取比赛详情失败:', error)
        throw new Error('获取比赛详情失败: ' + error.message)
    }
}

/**
 * 创建新比赛
 */
async function createTournament(data) {
    try {
        console.log('创建新比赛:', data)
        
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
        
        console.log('保存数据:', tournamentData)
        
        const collection = db.collection('tournaments')
        const result = await collection.add(tournamentData)
        
        console.log('创建结果:', result)
        
        return {
            success: true,
            data: {
                _id: result.id,
                ...tournamentData
            }
        }
    } catch (error) {
        console.error('创建比赛失败:', error)
        throw new Error('创建比赛失败: ' + error.message)
    }
}

/**
 * 更新比赛信息
 */
async function updateTournament(id, data) {
    try {
        console.log('更新比赛:', id, data)
        
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
        
        const collection = db.collection('tournaments')
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
        console.error('更新比赛失败:', error)
        throw new Error('更新比赛失败: ' + error.message)
    }
}

/**
 * 删除比赛
 */
async function deleteTournament(id) {
    try {
        console.log('删除比赛:', id)
        
        const collection = db.collection('tournaments')
        const result = await collection.doc(id).remove()
        
        if (result.deleted === 0) {
            return { success: false, error: '比赛记录不存在' }
        }
        
        return {
            success: true,
            data: { deleted: true }
        }
    } catch (error) {
        console.error('删除比赛失败:', error)
        throw new Error('删除比赛失败: ' + error.message)
    }
}

/**
 * 切换结算状态
 */
async function toggleSettlement(id, isSettled) {
    try {
        console.log('切换结算状态:', id, isSettled)
        
        const collection = db.collection('tournaments')
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
        console.error('切换结算状态失败:', error)
        throw new Error('切换结算状态失败: ' + error.message)
    }
}
