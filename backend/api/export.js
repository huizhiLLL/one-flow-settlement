import cloud from '@lafjs/cloud'

// 获取数据库
const db = cloud.database()

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
        
        console.log(`处理Export ${method}请求, query:`, query, 'body:', body)
        
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
        console.log('获取导出数据, 参数:', query)
        
        const { 
            dateFrom, 
            dateTo, 
            tournamentType, 
            isSettled, 
            isCertified,
            format = 'json'
        } = query
        
        const collection = db.collection('tournaments')
        let dbQuery = collection
        
        // 构建查询条件
        const whereConditions = {}
        
        // 日期范围筛选
        if (dateFrom || dateTo) {
            if (dateFrom && dateTo) {
                whereConditions.eventDate = db.command.gte(new Date(dateFrom)).and(db.command.lte(new Date(dateTo)))
            } else if (dateFrom) {
                whereConditions.eventDate = db.command.gte(new Date(dateFrom))
            } else if (dateTo) {
                whereConditions.eventDate = db.command.lte(new Date(dateTo))
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
        
        // 应用筛选条件
        if (Object.keys(whereConditions).length > 0) {
            dbQuery = dbQuery.where(whereConditions)
        }
        
        // 获取数据
        const result = await dbQuery.orderBy('eventDate', 'desc').get()
        const tournaments = result.data || []
        
        console.log(`导出查询到${tournaments.length}条记录`)
        
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
        console.error('获取导出数据失败:', error)
        throw new Error('获取导出数据失败: ' + error.message)
    }
}

/**
 * 导出比赛数据（POST方式，支持复杂筛选）
 */
async function exportTournamentsData(options = {}) {
    try {
        console.log('导出比赛数据, 选项:', options)
        
        const { 
            filters = {}, 
            format = 'json',
            fields = null // 可以指定导出的字段
        } = options
        
        const collection = db.collection('tournaments')
        let dbQuery = collection
        
        // 构建查询条件
        const whereConditions = {}
        
        if (filters.dateFrom || filters.dateTo) {
            if (filters.dateFrom && filters.dateTo) {
                whereConditions.eventDate = db.command.gte(new Date(filters.dateFrom)).and(db.command.lte(new Date(filters.dateTo)))
            } else if (filters.dateFrom) {
                whereConditions.eventDate = db.command.gte(new Date(filters.dateFrom))
            } else if (filters.dateTo) {
                whereConditions.eventDate = db.command.lte(new Date(filters.dateTo))
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
        
        // 搜索条件（模糊匹配比赛名称）
        if (filters.search) {
            whereConditions.tournamentName = db.command.includes(filters.search)
        }
        
        // 应用筛选条件
        if (Object.keys(whereConditions).length > 0) {
            dbQuery = dbQuery.where(whereConditions)
        }
        
        dbQuery = dbQuery.orderBy('eventDate', 'desc')
        
        const result = await dbQuery.get()
        const tournaments = result.data || []
        
        console.log(`根据筛选条件导出${tournaments.length}条记录`)
        
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
        console.error('导出数据失败:', error)
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
