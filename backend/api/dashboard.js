import cloud from '@lafjs/cloud'

// 获取数据库集合
const db = cloud.database()
const collection = db.collection('tournaments')

export default async function (ctx) {
    const { method, query } = ctx
    
    try {
        switch (method) {
            case 'GET':
                if (query.type === 'stats') {
                    return await getDashboardStats(query)
                } else if (query.type === 'monthly') {
                    return await getMonthlyStats(query.year, query.month)
                } else if (query.type === 'recent') {
                    return await getRecentTournaments(query.limit)
                } else {
                    // 默认返回完整的仪表板数据
                    return await getFullDashboardData()
                }
                
            default:
                return { success: false, error: '不支持的请求方法' }
        }
    } catch (error) {
        console.error('仪表板API错误:', error)
        return { 
            success: false, 
            error: error.message || '获取仪表板数据失败' 
        }
    }
}

/**
 * 获取完整的仪表板数据
 */
async function getFullDashboardData() {
    try {
        // 并行获取各种统计数据
        const [
            totalStats,
            monthlyStats,
            recentTournaments
        ] = await Promise.all([
            getTotalStatistics(),
            getCurrentMonthStatistics(),
            getRecentTournaments(5)
        ])
        
        return {
            success: true,
            data: {
                ...totalStats,
                ...monthlyStats,
                recentTournaments: recentTournaments.data
            }
        }
    } catch (error) {
        throw new Error('获取仪表板数据失败: ' + error.message)
    }
}

/**
 * 获取总体统计数据
 */
async function getTotalStatistics() {
    try {
        const result = await collection.aggregate()
            .group({
                _id: null,
                totalRevenue: cloud.database().command.sum('$totalRevenue'),
                totalIncome: cloud.database().command.sum('$totalIncome'),
                totalTournaments: cloud.database().command.sum(1),
                totalParticipants: cloud.database().command.sum('$participantCount'),
                settledCount: cloud.database().command.sum(
                    cloud.database().command.cond({
                        if: cloud.database().command.eq(['$isSettled', true]),
                        then: 1,
                        else: 0
                    })
                ),
                certifiedCount: cloud.database().command.sum(
                    cloud.database().command.cond({
                        if: cloud.database().command.eq(['$isCertified', true]),
                        then: 1,
                        else: 0
                    })
                )
            })
            .end()
        
        if (result.list.length === 0) {
            return {
                totalRevenue: 0,
                totalIncome: 0,
                totalTournaments: 0,
                totalParticipants: 0,
                settledCount: 0,
                certifiedCount: 0
            }
        }
        
        return result.list[0]
    } catch (error) {
        throw new Error('获取总体统计失败: ' + error.message)
    }
}

/**
 * 获取当前月度统计
 */
async function getCurrentMonthStatistics() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    
    return await getMonthlyStatisticsData(year, month)
}

/**
 * 获取指定月度统计数据
 */
async function getMonthlyStats(year, month) {
    try {
        if (!year || !month) {
            return { success: false, error: '缺少年份或月份参数' }
        }
        
        const monthlyData = await getMonthlyStatisticsData(parseInt(year), parseInt(month))
        
        return {
            success: true,
            data: monthlyData
        }
    } catch (error) {
        throw new Error('获取月度统计失败: ' + error.message)
    }
}

/**
 * 获取月度统计数据（内部函数）
 */
async function getMonthlyStatisticsData(year, month) {
    try {
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0, 23, 59, 59)
        
        const result = await collection.aggregate()
            .match({
                eventDate: cloud.database().command.gte(startDate).and(cloud.database().command.lte(endDate))
            })
            .group({
                _id: null,
                monthlyRevenue: cloud.database().command.sum('$totalRevenue'),
                monthlyIncome: cloud.database().command.sum('$totalIncome'),
                monthlyTournaments: cloud.database().command.sum(1),
                monthlyParticipants: cloud.database().command.sum('$participantCount')
            })
            .end()
        
        if (result.list.length === 0) {
            return {
                monthlyRevenue: 0,
                monthlyIncome: 0,
                monthlyTournaments: 0,
                monthlyParticipants: 0
            }
        }
        
        return result.list[0]
    } catch (error) {
        throw new Error('获取月度统计数据失败: ' + error.message)
    }
}

/**
 * 获取最近的比赛记录
 */
async function getRecentTournaments(limit = 10) {
    try {
        const tournaments = await collection
            .orderBy('createdAt', 'desc')
            .limit(parseInt(limit))
            .get()
        
        return {
            success: true,
            data: tournaments.data
        }
    } catch (error) {
        throw new Error('获取最近比赛失败: ' + error.message)
    }
}

/**
 * 获取仪表板统计数据（兼容旧接口）
 */
async function getDashboardStats(query = {}) {
    try {
        const { dateFrom, dateTo } = query
        
        let matchConditions = {}
        
        // 日期范围筛选
        if (dateFrom || dateTo) {
            matchConditions.eventDate = {}
            if (dateFrom) {
                matchConditions.eventDate[cloud.database().command.gte.name] = new Date(dateFrom)
            }
            if (dateTo) {
                matchConditions.eventDate[cloud.database().command.lte.name] = new Date(dateTo)
            }
        }
        
        const aggregateQuery = collection.aggregate()
        
        if (Object.keys(matchConditions).length > 0) {
            aggregateQuery.match(matchConditions)
        }
        
        const result = await aggregateQuery
            .group({
                _id: null,
                totalRevenue: cloud.database().command.sum('$totalRevenue'),
                totalIncome: cloud.database().command.sum('$totalIncome'),
                totalTournaments: cloud.database().command.sum(1),
                totalParticipants: cloud.database().command.sum('$participantCount'),
                settledCount: cloud.database().command.sum(
                    cloud.database().command.cond({
                        if: cloud.database().command.eq(['$isSettled', true]),
                        then: 1,
                        else: 0
                    })
                )
            })
            .end()
        
        const stats = result.list.length > 0 ? result.list[0] : {
            totalRevenue: 0,
            totalIncome: 0,
            totalTournaments: 0,
            totalParticipants: 0,
            settledCount: 0
        }
        
        return {
            success: true,
            data: stats
        }
    } catch (error) {
        throw new Error('获取统计数据失败: ' + error.message)
    }
}
