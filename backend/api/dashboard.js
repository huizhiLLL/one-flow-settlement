import cloud from '@lafjs/cloud'

// 获取数据库
const db = cloud.database()

export default async function (ctx) {
    const { method, query } = ctx
    
    try {
        // 设置CORS头
        ctx.response.setHeader('Access-Control-Allow-Origin', '*')
        ctx.response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
        ctx.response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        
        // 处理预检请求
        if (method === 'OPTIONS') {
            return { success: true }
        }
        
        console.log(`处理Dashboard ${method}请求, query:`, query)
        
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
        console.log('开始获取完整仪表板数据...')
        
        // 并行获取各种统计数据
        const [
            totalStats,
            monthlyStats,
            recentTournaments
        ] = await Promise.all([
            getTotalStatistics(),
            getCurrentMonthStatistics(),
            getRecentTournamentsData(5)
        ])
        
        console.log('所有数据获取完成')
        
        return {
            success: true,
            data: {
                ...totalStats,
                ...monthlyStats,
                recentTournaments: recentTournaments
            }
        }
    } catch (error) {
        console.error('获取仪表板数据失败:', error)
        throw new Error('获取仪表板数据失败: ' + error.message)
    }
}

/**
 * 获取总体统计数据
 */
async function getTotalStatistics() {
    try {
        console.log('开始获取总体统计...')
        
        const collection = db.collection('tournaments')
        
        // 获取所有比赛数据
        const allTournaments = await collection.get()
        const tournaments = allTournaments.data || []
        
        console.log(`获取到${tournaments.length}条比赛记录`)
        
        // 手动计算统计数据
        let totalRevenue = 0
        let totalIncome = 0
        let totalParticipants = 0
        let settledCount = 0
        let certifiedCount = 0
        
        tournaments.forEach((tournament, index) => {
            console.log(`比赛${index + 1}: ${tournament.tournamentName}`)
            console.log(`  - totalRevenue: ${tournament.totalRevenue}`)
            console.log(`  - totalIncome: ${tournament.totalIncome}`)
            
            totalRevenue += tournament.totalRevenue || 0
            totalIncome += tournament.totalIncome || 0
            totalParticipants += tournament.participantCount || 0
            
            console.log(`  累计totalIncome: ${totalIncome}`)
            
            if (tournament.isSettled) {
                settledCount++
            }
            
            if (tournament.isCertified) {
                certifiedCount++
            }
        })
        
        const result = {
            totalRevenue: Number(totalRevenue.toFixed(2)),
            totalIncome: Number(totalIncome.toFixed(2)),
            totalTournaments: tournaments.length,
            totalParticipants,
            settledCount,
            certifiedCount
        }
        
        console.log('总体统计结果:', result)
        return result
        
    } catch (error) {
        console.error('获取总体统计失败:', error)
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
        console.log(`获取月度统计: ${year}年${month}月`)
        
        if (!year || !month) {
            return { success: false, error: '缺少年份或月份参数' }
        }
        
        const monthlyData = await getMonthlyStatisticsData(parseInt(year), parseInt(month))
        
        return {
            success: true,
            data: monthlyData
        }
    } catch (error) {
        console.error('获取月度统计失败:', error)
        throw new Error('获取月度统计失败: ' + error.message)
    }
}

/**
 * 获取月度统计数据（内部函数）
 */
async function getMonthlyStatisticsData(year, month) {
    try {
        console.log(`开始计算${year}年${month}月统计...`)
        
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0, 23, 59, 59)
        
        console.log('日期范围:', startDate, '到', endDate)
        
        const collection = db.collection('tournaments')
        
        // 获取指定月份的比赛数据
        const result = await collection
            .where({
                eventDate: db.command.gte(startDate).and(db.command.lte(endDate))
            })
            .get()
            
        const tournaments = result.data || []
        console.log(`${year}年${month}月找到${tournaments.length}条记录`)
        
        // 手动计算月度统计
        let monthlyRevenue = 0
        let monthlyIncome = 0
        let monthlyParticipants = 0
        
        tournaments.forEach(tournament => {
            monthlyRevenue += tournament.totalRevenue || 0
            monthlyIncome += tournament.totalIncome || 0
            monthlyParticipants += tournament.participantCount || 0
        })
        
        const monthlyData = {
            monthlyRevenue,
            monthlyIncome,
            monthlyTournaments: tournaments.length,
            monthlyParticipants
        }
        
        console.log('月度统计结果:', monthlyData)
        return monthlyData
        
    } catch (error) {
        console.error('获取月度统计数据失败:', error)
        throw new Error('获取月度统计数据失败: ' + error.message)
    }
}

/**
 * 获取最近的比赛记录
 */
async function getRecentTournaments(limit = 10) {
    try {
        console.log(`获取最近${limit}条比赛记录`)
        
        const tournaments = await getRecentTournamentsData(parseInt(limit))
        
        return {
            success: true,
            data: tournaments
        }
    } catch (error) {
        console.error('获取最近比赛失败:', error)
        throw new Error('获取最近比赛失败: ' + error.message)
    }
}

/**
 * 获取最近的比赛记录（内部函数）
 */
async function getRecentTournamentsData(limit = 10) {
    try {
        const collection = db.collection('tournaments')
        
        const result = await collection
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get()
        
        const tournaments = result.data || []
        console.log(`获取到${tournaments.length}条最近比赛记录`)
        
        return tournaments
        
    } catch (error) {
        console.error('获取最近比赛数据失败:', error)
        throw new Error('获取最近比赛数据失败: ' + error.message)
    }
}

/**
 * 获取仪表板统计数据（兼容旧接口）
 */
async function getDashboardStats(query = {}) {
    try {
        console.log('获取仪表板统计数据, 参数:', query)
        
        const { dateFrom, dateTo } = query
        
        const collection = db.collection('tournaments')
        let dbQuery = collection
        
        // 日期范围筛选
        if (dateFrom || dateTo) {
            const whereCondition = {}
            if (dateFrom && dateTo) {
                whereCondition.eventDate = db.command.gte(new Date(dateFrom)).and(db.command.lte(new Date(dateTo)))
            } else if (dateFrom) {
                whereCondition.eventDate = db.command.gte(new Date(dateFrom))
            } else if (dateTo) {
                whereCondition.eventDate = db.command.lte(new Date(dateTo))
            }
            
            dbQuery = dbQuery.where(whereCondition)
        }
        
        const result = await dbQuery.get()
        const tournaments = result.data || []
        
        console.log(`根据条件筛选出${tournaments.length}条记录`)
        
        // 手动计算统计数据
        let totalRevenue = 0
        let totalIncome = 0
        let totalParticipants = 0
        let settledCount = 0
        
        tournaments.forEach(tournament => {
            totalRevenue += tournament.totalRevenue || 0
            totalIncome += tournament.totalIncome || 0
            totalParticipants += tournament.participantCount || 0
            
            if (tournament.isSettled) {
                settledCount++
            }
        })
        
        const stats = {
            totalRevenue,
            totalIncome,
            totalTournaments: tournaments.length,
            totalParticipants,
            settledCount
        }
        
        console.log('统计结果:', stats)
        
        return {
            success: true,
            data: stats
        }
    } catch (error) {
        console.error('获取统计数据失败:', error)
        throw new Error('获取统计数据失败: ' + error.message)
    }
}
