import cloud from '@lafjs/cloud'

// 获取数据库集合
const db = cloud.database()
const collection = db.collection('tournaments')

export default async function (ctx) {
    const { method, body, query } = ctx
    
    try {
        switch (method) {
            case 'POST':
                // 导出Excel数据
                return await exportTournamentsData(body)
                
            case 'GET':
                // 获取导出状态或直接返回数据
                return await getTournamentsForExport(query)
                
            default:
                return { success: false, error: '不支持的请求方法' }
        }
    } catch (error) {
        console.error('导出API错误:', error)
        return { 
            success: false, 
            error: error.message || '导出数据失败' 
        }
    }
}

/**
 * 获取用于导出的比赛数据
 */
async function getTournamentsForExport(query = {}) {
    try {
        const { 
            dateFrom, 
            dateTo, 
            tournamentType, 
            isSettled, 
            isCertified,
            format = 'json'
        } = query
        
        // 构建查询条件
        let whereConditions = {}
        
        // 日期范围筛选
        if (dateFrom || dateTo) {
            whereConditions.eventDate = {}
            if (dateFrom) {
                whereConditions.eventDate = cloud.database().command.gte(new Date(dateFrom))
            }
            if (dateTo) {
                whereConditions.eventDate = whereConditions.eventDate 
                    ? whereConditions.eventDate.and(cloud.database().command.lte(new Date(dateTo)))
                    : cloud.database().command.lte(new Date(dateTo))
            }
        }
        
        // 比赛类型筛选
        if (tournamentType) {
            whereConditions.tournamentType = tournamentType
        }
        
        // 结算状态筛选
        if (isSettled !== undefined) {
            whereConditions.isSettled = isSettled === 'true'
        }
        
        // 认证状态筛选
        if (isCertified !== undefined) {
            whereConditions.isCertified = isCertified === 'true'
        }
        
        // 获取数据
        const result = await collection
            .where(whereConditions)
            .orderBy('eventDate', 'desc')
            .get()
        
        const tournaments = result.data
        
        if (format === 'csv') {
            return {
                success: true,
                data: convertToCSV(tournaments),
                contentType: 'text/csv',
                filename: `tournaments_${formatDate(new Date())}.csv`
            }
        }
        
        return {
            success: true,
            data: {
                tournaments,
                total: tournaments.length,
                exportTime: new Date().toISOString()
            }
        }
        
    } catch (error) {
        throw new Error('获取导出数据失败: ' + error.message)
    }
}

/**
 * 导出比赛数据（POST方式，支持复杂筛选）
 */
async function exportTournamentsData(options = {}) {
    try {
        const { 
            filters = {}, 
            format = 'json',
            fields = null // 可以指定导出的字段
        } = options
        
        // 构建查询条件
        let whereConditions = {}
        
        if (filters.dateFrom || filters.dateTo) {
            whereConditions.eventDate = {}
            if (filters.dateFrom) {
                whereConditions.eventDate = cloud.database().command.gte(new Date(filters.dateFrom))
            }
            if (filters.dateTo) {
                whereConditions.eventDate = whereConditions.eventDate 
                    ? whereConditions.eventDate.and(cloud.database().command.lte(new Date(filters.dateTo)))
                    : cloud.database().command.lte(new Date(filters.dateTo))
            }
        }
        
        if (filters.tournamentType) {
            whereConditions.tournamentType = filters.tournamentType
        }
        
        if (filters.isSettled !== undefined) {
            whereConditions.isSettled = filters.isSettled
        }
        
        if (filters.isCertified !== undefined) {
            whereConditions.isCertified = filters.isCertified
        }
        
        // 搜索条件
        if (filters.search) {
            whereConditions.tournamentName = cloud.database().command.includes(filters.search)
        }
        
        let query = collection.where(whereConditions).orderBy('eventDate', 'desc')
        
        // 字段选择
        if (fields && Array.isArray(fields)) {
            const fieldObj = {}
            fields.forEach(field => {
                fieldObj[field] = true
            })
            query = query.field(fieldObj)
        }
        
        const result = await query.get()
        const tournaments = result.data
        
        if (format === 'csv') {
            return {
                success: true,
                data: convertToCSV(tournaments),
                contentType: 'text/csv',
                filename: `tournaments_export_${formatDate(new Date())}.csv`
            }
        }
        
        return {
            success: true,
            data: {
                tournaments,
                total: tournaments.length,
                filters: filters,
                exportTime: new Date().toISOString()
            }
        }
        
    } catch (error) {
        throw new Error('导出数据失败: ' + error.message)
    }
}

/**
 * 将数据转换为CSV格式
 */
function convertToCSV(tournaments) {
    if (!tournaments || tournaments.length === 0) {
        return ''
    }
    
    // CSV头部
    const headers = [
        '比赛名称',
        '举办日期', 
        '参赛人数',
        '退赛人数',
        '流水总计',
        '微信支付',
        '退款结余',
        '手续费',
        '微信手续费', 
        '认证费',
        '总手续费',
        '奖牌数量',
        '奖牌费用',
        '主办结算费用',
        '总收入',
        '比赛类型',
        '是否认证赛',
        '是否结算',
        '创建时间'
    ]
    
    // 添加BOM以支持中文
    let csvContent = '\ufeff' + headers.join(',') + '\n'
    
    // 数据行
    tournaments.forEach(tournament => {
        const row = [
            `"${tournament.tournamentName || ''}"`,
            formatDate(tournament.eventDate),
            tournament.participantCount || 0,
            tournament.withdrawalCount || 0,
            tournament.totalRevenue || 0,
            tournament.wechatPayment || 0,
            tournament.refundBalance || 0,
            tournament.processingFee || 0,
            tournament.wechatFee || 0,
            tournament.certificationFee || 0,
            tournament.totalFee || 0,
            tournament.medalCount || 0,
            tournament.medalCost || 0,
            tournament.hostSettlement || 0,
            tournament.totalIncome || 0,
            `"${tournament.tournamentType || ''}"`,
            tournament.isCertified ? '是' : '否',
            tournament.isSettled ? '已结算' : '未结算',
            formatDateTime(tournament.createdAt)
        ]
        
        csvContent += row.join(',') + '\n'
    })
    
    return csvContent
}

/**
 * 格式化日期
 */
function formatDate(date) {
    if (!date) return ''
    
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
}

/**
 * 格式化日期时间
 */
function formatDateTime(date) {
    if (!date) return ''
    
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}`
}
