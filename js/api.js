// API 调用封装

// API 基础配置
const API_CONFIG = {
    // 后端API地址
    BASE_URL: 'https://fcabackend.hzcubing.club',
    TIMEOUT: 30000,
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

/**
 * HTTP 请求封装
 * @param {string} url - 请求URL
 * @param {object} options - 请求选项
 * @returns {Promise} 请求结果
 */
async function request(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}${url}`;
    
    const config = {
        method: 'GET',
        headers: { ...API_CONFIG.HEADERS },
        ...options
    };
    
    // 如果有请求体，序列化为JSON
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }
    
    try {
        showLoading();
        
        // 设置超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
        config.signal = controller.signal;
        
        const response = await fetch(fullUrl, config);
        clearTimeout(timeoutId);
        
        // 检查响应状态
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
        }
        
        // 解析响应
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        
        // 如果后端已经返回了标准格式，直接返回
        if (data && typeof data === 'object' && 'success' in data) {
            return data;
        }
        
        // 否则包装成标准格式
        return {
            success: true,
            data: data,
            status: response.status
        };
        
    } catch (error) {
        console.error('API请求错误:', error);
        
        let errorMessage = '请求失败';
        if (error.name === 'AbortError') {
            errorMessage = '请求超时';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        return {
            success: false,
            error: errorMessage,
            data: null
        };
    } finally {
        hideLoading();
    }
}

/**
 * 比赛数据相关API
 */
const TournamentAPI = {
    /**
     * 获取所有比赛记录
     * @param {object} params - 查询参数
     * @returns {Promise} 比赛记录列表
     */
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `/tournaments${queryString ? `?${queryString}` : ''}`;
        return await request(url);
    },

    /**
     * 根据ID获取单个比赛记录
     * @param {string} id - 比赛ID
     * @returns {Promise} 比赛记录
     */
    async getById(id) {
        return await request(`/tournaments?id=${id}`);
    },

    /**
     * 创建新的比赛记录
     * @param {object} data - 比赛数据
     * @returns {Promise} 创建结果
     */
    async create(data) {
        // 计算相关费用
        const calculatedData = calculateFees(data);
        
        const tournamentData = {
            ...data,
            ...calculatedData,
            isSettled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return await request('/tournaments', {
            method: 'POST',
            body: tournamentData
        });
    },

    /**
     * 更新比赛记录
     * @param {string} id - 比赛ID
     * @param {object} data - 更新数据
     * @returns {Promise} 更新结果
     */
    async update(id, data) {
        // 重新计算相关费用
        const calculatedData = calculateFees(data);
        
        const tournamentData = {
            ...data,
            ...calculatedData,
            id: id,
            updatedAt: new Date().toISOString()
        };
        
        return await request('/tournaments', {
            method: 'PUT',
            body: tournamentData
        });
    },

    /**
     * 删除比赛记录
     * @param {string} id - 比赛ID
     * @returns {Promise} 删除结果
     */
    async delete(id) {
        return await request('/tournaments', {
            method: 'DELETE',
            body: { id }
        });
    },

    /**
     * 切换结算状态
     * @param {string} id - 比赛ID
     * @param {boolean} isSettled - 结算状态
     * @returns {Promise} 更新结果
     */
    async toggleSettlement(id, isSettled) {
        return await request('/tournaments', {
            method: 'PATCH',
            body: { 
                id,
                isSettled,
                updatedAt: new Date().toISOString()
            }
        });
    },

    /**
     * 批量操作
     * @param {string} action - 操作类型
     * @param {Array} ids - 比赛ID列表
     * @param {object} data - 操作数据
     * @returns {Promise} 操作结果
     */
    async batchOperation(action, ids, data = {}) {
        return await request('/tournaments/batch', {
            method: 'POST',
            body: {
                action,
                ids,
                data
            }
        });
    }
};

/**
 * 仪表板数据API
 */
const DashboardAPI = {
    /**
     * 获取仪表板统计数据
     * @param {object} params - 查询参数
     * @returns {Promise} 统计数据
     */
    async getStats(params = {}) {
        const queryString = new URLSearchParams({type: 'stats', ...params}).toString();
        const url = `/dashboard?${queryString}`;
        return await request(url);
    },

    /**
     * 获取月度统计数据
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @returns {Promise} 月度统计数据
     */
    async getMonthlyStats(year, month) {
        return await request(`/dashboard?type=monthly&year=${year}&month=${month}`);
    },

    /**
     * 获取最近比赛记录
     * @param {number} limit - 限制数量
     * @returns {Promise} 最近比赛记录
     */
    async getRecentTournaments(limit = 10) {
        return await request(`/dashboard?type=recent&limit=${limit}`);
    },

    /**
     * 获取仪表板统计数据（兼容函数名）
     * @param {object} params - 查询参数
     * @returns {Promise} 统计数据
     */
    async getDashboardStats(params = {}) {
        return await this.getStats(params);
    },

    /**
     * 获取统计图表数据
     * @param {string} type - 图表类型
     * @param {object} params - 查询参数
     * @returns {Promise} 图表数据
     */
    async getChartData(type, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `/dashboard/charts/${type}${queryString ? `?${queryString}` : ''}`;
        return await request(url);
    }
};

/**
 * 数据导出API
 */
const ExportAPI = {
    /**
     * 导出Excel数据
     * @param {object} params - 导出参数
     * @returns {Promise} 导出结果
     */
    async exportExcel(params = {}) {
        return await request('/export', {
            method: 'POST',
            body: params
        });
    },

    /**
     * 获取导出任务状态
     * @param {string} taskId - 任务ID
     * @returns {Promise} 任务状态
     */
    async getExportStatus(taskId) {
        return await request(`/export/status/${taskId}`);
    }
};

// 模拟数据（开发阶段使用）
const MOCK_DATA = {
    tournaments: [
        {
            _id: '1',
            tournamentName: '2024年第一届魔方公开赛',
            eventDate: '2024-03-15',
            participantCount: 120,
            withdrawalCount: 5,
            totalRevenue: 3600,
            wechatPayment: 3600,
            refundBalance: 150,
            medalCount: 15,
            medalPrice: 18,
            tournamentType: '协会机构',
            isCertified: true,
            processingFee: 38.88,
            wechatFee: 21.6,
            certificationFee: 120,
            totalFee: 180.48,
            medalCost: 270,
            hostSettlement: 3149.52,
            totalIncome: 158.88,
            isSettled: false,
            createdAt: '2024-03-10T10:00:00Z',
            updatedAt: '2024-03-10T10:00:00Z'
        },
        {
            _id: '2',
            tournamentName: '某某大学魔方联赛春季赛',
            eventDate: '2024-04-20',
            participantCount: 80,
            withdrawalCount: 2,
            totalRevenue: 2400,
            wechatPayment: 2400,
            refundBalance: 60,
            medalCount: 10,
            medalPrice: 18,
            tournamentType: '高校联赛',
            isCertified: false,
            processingFee: 25.92,
            wechatFee: 14.4,
            certificationFee: 0,
            totalFee: 100,
            medalCost: 180,
            hostSettlement: 2120,
            totalIncome: 25.92,
            isSettled: true,
            createdAt: '2024-04-15T10:00:00Z',
            updatedAt: '2024-04-15T10:00:00Z'
        }
    ]
};

/**
 * 模拟API调用（开发阶段使用）
 */
const MockAPI = {
    async getAll(params = {}) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 模拟网络延迟
        return {
            success: true,
            data: {
                tournaments: MOCK_DATA.tournaments,
                total: MOCK_DATA.tournaments.length,
                page: 1,
                limit: 20
            }
        };
    },

    async getById(id) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const tournament = MOCK_DATA.tournaments.find(t => t._id === id);
        return {
            success: !!tournament,
            data: tournament || null,
            error: tournament ? null : '记录不存在'
        };
    },

    async create(data) {
        await new Promise(resolve => setTimeout(resolve, 800));
        const newTournament = {
            _id: generateId(),
            ...data,
            ...calculateFees(data),
            isSettled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        MOCK_DATA.tournaments.unshift(newTournament);
        return {
            success: true,
            data: newTournament
        };
    },

    async update(id, data) {
        await new Promise(resolve => setTimeout(resolve, 600));
        const index = MOCK_DATA.tournaments.findIndex(t => t._id === id);
        if (index === -1) {
            return {
                success: false,
                error: '记录不存在'
            };
        }
        
        const updatedTournament = {
            ...MOCK_DATA.tournaments[index],
            ...data,
            ...calculateFees(data),
            updatedAt: new Date().toISOString()
        };
        MOCK_DATA.tournaments[index] = updatedTournament;
        
        return {
            success: true,
            data: updatedTournament
        };
    },

    async delete(id) {
        await new Promise(resolve => setTimeout(resolve, 400));
        const index = MOCK_DATA.tournaments.findIndex(t => t._id === id);
        if (index === -1) {
            return {
                success: false,
                error: '记录不存在'
            };
        }
        
        MOCK_DATA.tournaments.splice(index, 1);
        return {
            success: true,
            data: { deleted: true }
        };
    },

    async toggleSettlement(id, isSettled) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const tournament = MOCK_DATA.tournaments.find(t => t._id === id);
        if (!tournament) {
            return {
                success: false,
                error: '记录不存在'
            };
        }
        
        tournament.isSettled = isSettled;
        tournament.updatedAt = new Date().toISOString();
        
        return {
            success: true,
            data: tournament
        };
    },

    async getDashboardStats() {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const tournaments = MOCK_DATA.tournaments;
        const totalRevenue = tournaments.reduce((sum, t) => sum + t.totalRevenue, 0);
        const totalIncome = tournaments.reduce((sum, t) => sum + t.totalIncome, 0);
        const totalParticipants = tournaments.reduce((sum, t) => sum + t.participantCount, 0);
        
        // 当前月份数据
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyTournaments = tournaments.filter(t => {
            const date = new Date(t.eventDate);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        
        const monthlyRevenue = monthlyTournaments.reduce((sum, t) => sum + t.totalRevenue, 0);
        const monthlyIncome = monthlyTournaments.reduce((sum, t) => sum + t.totalIncome, 0);
        
        return {
            success: true,
            data: {
                totalRevenue,
                totalIncome,
                totalTournaments: tournaments.length,
                totalParticipants,
                monthlyRevenue,
                monthlyIncome,
                monthlyTournaments: monthlyTournaments.length,
                recentTournaments: tournaments.slice(0, 5)
            }
        };
    },

    async getStats() {
        return await this.getDashboardStats();
    },

    async getMonthlyStats(year, month) {
        await new Promise(resolve => setTimeout(resolve, 400));
        
        const tournaments = MOCK_DATA.tournaments.filter(t => {
            const date = new Date(t.eventDate);
            return date.getMonth() === month - 1 && date.getFullYear() === year;
        });
        
        const monthlyRevenue = tournaments.reduce((sum, t) => sum + t.totalRevenue, 0);
        const monthlyIncome = tournaments.reduce((sum, t) => sum + t.totalIncome, 0);
        
        return {
            success: true,
            data: {
                monthlyRevenue,
                monthlyIncome,
                monthlyTournaments: tournaments.length,
                monthlyParticipants: tournaments.reduce((sum, t) => sum + t.participantCount, 0)
            }
        };
    },

    async getRecentTournaments(limit = 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        return {
            success: true,
            data: MOCK_DATA.tournaments.slice(0, limit)
        };
    }
};

// 根据环境选择使用真实API还是模拟API
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 强制使用真实API (调试用)
// 如果后端接口已准备好，请将下面这行设置为 false
const FORCE_USE_REAL_API = true;

// 导出API对象
const API = {
    Tournament: (isDevelopment && !FORCE_USE_REAL_API) ? MockAPI : TournamentAPI,
    Dashboard: (isDevelopment && !FORCE_USE_REAL_API) ? MockAPI : DashboardAPI,
    Export: ExportAPI
};

// 如果在模块环境中，导出API
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API, TournamentAPI, DashboardAPI, ExportAPI };
}
