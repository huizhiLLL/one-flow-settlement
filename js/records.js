// 流水详情页面逻辑

// 页面状态
let currentPage = 1;
let pageSize = 20;
let totalPages = 1;
let totalRecords = 0;
let currentSort = { field: 'eventDate', direction: 'desc' };
let currentFilters = {};
let allTournaments = [];
let filteredTournaments = [];

/**
 * 页面初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    // 确保筛选器初始状态为空
    clearAllFilters();
    setupEventListeners();
    loadTournamentData();
});

/**
 * 清空所有筛选器的值
 */
function clearAllFilters() {
    const filterElements = [
        'searchInput',
        'typeFilter',
        'certifiedFilter',
        'settledFilter'
    ];
    
    filterElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = '';
        }
    });
    
    currentFilters = {};
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 搜索功能
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                handleSearch();
            }
        });
        
        // 实时搜索（防抖）
        searchInput.addEventListener('input', debounce(handleSearch, 500));
    }
    
    // 筛选功能
    const filterElements = [
        'typeFilter',
        'certifiedFilter', 
        'settledFilter'
    ];
    
    filterElements.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', handleFilter);
        }
    });
    
    // 清空筛选
    const clearFiltersBtn = document.getElementById('clearFilters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    
    // 排序功能
    const sortableHeaders = document.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => handleSort(header));
    });
    
    // 分页功能
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageSizeSelect = document.getElementById('pageSize');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => changePage(currentPage - 1));
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => changePage(currentPage + 1));
    }
    
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', (event) => {
            pageSize = parseInt(event.target.value);
            currentPage = 1;
            renderTable();
        });
    }
    
    // 导出功能
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }
    
    // 模态框事件
    setupModalEvents();
}

/**
 * 加载比赛数据
 */
async function loadTournamentData() {
    try {
        console.log('开始加载比赛数据...');
        const result = await API.Tournament.getAll();
        console.log('API返回结果:', result);
        
        if (result.success && result.data) {
            // 检查数据格式
            let tournaments = [];
            
            if (result.data.tournaments && Array.isArray(result.data.tournaments)) {
                tournaments = result.data.tournaments;
            } else if (Array.isArray(result.data)) {
                // 兼容直接返回数组的情况
                tournaments = result.data;
            } else {
                console.warn('数据格式不符合预期:', result.data);
                showError('数据格式错误：期望tournaments数组');
                return;
            }
            
            console.log(`成功获取 ${tournaments.length} 条比赛记录`);
            allTournaments = tournaments;
            filteredTournaments = [...allTournaments];
            totalRecords = allTournaments.length;
            
            // 页面初始化时直接显示所有数据，不应用筛选
            applySortOnly();
            renderTable();
        } else {
            console.error('API调用失败:', result);
            showError('加载数据失败：' + (result.error || '未知错误'));
        }
    } catch (error) {
        console.error('加载比赛数据失败:', error);
        showError('加载数据失败，请稍后重试：' + error.message);
    }
}

/**
 * 处理搜索
 */
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    currentFilters.search = searchTerm;
    currentPage = 1;
    
    // 检查是否有任何筛选条件
    const hasAnyFilter = searchTerm || currentFilters.type || currentFilters.certified || currentFilters.settled;
    
    if (hasAnyFilter) {
        // 有筛选条件时应用筛选
        applyFiltersAndSort();
    } else {
        // 没有筛选条件时只排序
        applySortOnly();
    }
    
    renderTable();
}

/**
 * 处理筛选
 */
function handleFilter() {
    // 获取筛选值，确保空字符串被认为是无筛选
    const searchValue = document.getElementById('searchInput')?.value.trim() || '';
    const typeValue = document.getElementById('typeFilter')?.value || '';
    const certifiedValue = document.getElementById('certifiedFilter')?.value || '';
    const settledValue = document.getElementById('settledFilter')?.value || '';
    
    currentFilters = {
        search: searchValue,
        type: typeValue,
        certified: certifiedValue,
        settled: settledValue
    };
    
    // 检查是否有任何筛选条件
    const hasAnyFilter = searchValue || typeValue || certifiedValue || settledValue;
    
    currentPage = 1;
    
    if (hasAnyFilter) {
        // 有筛选条件时应用筛选
        applyFiltersAndSort();
    } else {
        // 没有筛选条件时只排序
        applySortOnly();
    }
    
    renderTable();
}

/**
 * 清空筛选
 */
function clearFilters() {
    // 清空输入框
    const filterElements = [
        'searchInput',
        'typeFilter',
        'certifiedFilter',
        'settledFilter'
    ];
    
    filterElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = '';
        }
    });
    
    currentFilters = {};
    currentPage = 1;
    
    // 清空筛选后显示所有数据
    applySortOnly();
    renderTable();
}

/**
 * 仅应用排序（不筛选）
 */
function applySortOnly() {
    // 复制所有数据
    filteredTournaments = [...allTournaments];
    
    // 应用排序
    filteredTournaments.sort((a, b) => {
        const { field, direction } = currentSort;
        
        let aValue = a[field];
        let bValue = b[field];
        
        // 处理日期类型
        if (field === 'eventDate') {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
        }
        
        // 处理数字类型
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        // 处理字符串类型
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
        
        if (direction === 'asc') {
            return aValue.localeCompare(bValue);
        } else {
            return bValue.localeCompare(aValue);
        }
    });
    
    totalRecords = filteredTournaments.length;
    totalPages = Math.ceil(totalRecords / pageSize);
}

/**
 * 应用筛选和排序
 */
function applyFiltersAndSort() {
    // 应用筛选
    filteredTournaments = allTournaments.filter(tournament => {
        // 搜索筛选
        if (currentFilters.search) {
            const searchFields = [
                tournament.tournamentName?.toLowerCase() || '',
                tournament.tournamentType?.toLowerCase() || ''
            ].join(' ');
            
            if (!searchFields.includes(currentFilters.search)) {
                return false;
            }
        }
        
        // 比赛类型筛选
        if (currentFilters.type && tournament.tournamentType !== currentFilters.type) {
            return false;
        }
        
        // 认证状态筛选
        if (currentFilters.certified !== '') {
            const isCertified = currentFilters.certified === 'true';
            if (tournament.isCertified !== isCertified) {
                return false;
            }
        }
        
        // 结算状态筛选
        if (currentFilters.settled !== '') {
            const isSettled = currentFilters.settled === 'true';
            if (tournament.isSettled !== isSettled) {
                return false;
            }
        }
        
        
        return true;
    });
    
    // 应用排序
    filteredTournaments.sort((a, b) => {
        const { field, direction } = currentSort;
        
        let aValue = a[field];
        let bValue = b[field];
        
        // 处理日期类型
        if (field === 'eventDate') {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
        }
        
        // 处理数字类型
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        // 处理字符串类型
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
        
        if (direction === 'asc') {
            return aValue.localeCompare(bValue);
        } else {
            return bValue.localeCompare(aValue);
        }
    });
    
    totalRecords = filteredTournaments.length;
    totalPages = Math.ceil(totalRecords / pageSize);
}

/**
 * 处理排序
 */
function handleSort(header) {
    const field = header.getAttribute('data-sort');
    
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    
    // 更新排序图标
    updateSortIcons();
    
    // 重新应用排序（保持当前筛选状态）
    const hasAnyFilter = currentFilters.search || currentFilters.type || currentFilters.certified || currentFilters.settled;
    
    if (hasAnyFilter) {
        // 有筛选条件时应用筛选和排序
        applyFiltersAndSort();
    } else {
        // 没有筛选条件时只排序
        applySortOnly();
    }
    
    renderTable();
}

/**
 * 更新排序图标
 */
function updateSortIcons() {
    const sortableHeaders = document.querySelectorAll('.sortable');
    
    sortableHeaders.forEach(header => {
        const icon = header.querySelector('.sort-icon');
        const field = header.getAttribute('data-sort');
        
        if (field === currentSort.field) {
            header.classList.add('sorted');
            icon.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
        } else {
            header.classList.remove('sorted');
            icon.textContent = '⇅';
        }
    });
}

/**
 * 渲染表格
 */
function renderTable() {
    const tbody = document.getElementById('tournamentsTableBody');
    if (!tbody) return;
    
    // 计算当前页面的数据
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageData = filteredTournaments.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="17" style="text-align: center; padding: 3rem; color: #718096;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                    <p>暂无数据</p>
                    <a href="input.html" style="
                        display: inline-block;
                        margin-top: 1rem;
                        padding: 0.75rem 1.5rem;
                        background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 500;
                    ">录入数据</a>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = pageData.map(tournament => createTableRow(tournament)).join('');
    }
    
    // 更新分页信息
    updatePagination();
}

/**
 * 创建表格行
 */
function createTableRow(tournament) {
    return `
        <tr>
            <td title="${tournament.tournamentName}">${tournament.tournamentName}</td>
            <td>${formatDate(tournament.eventDate)}</td>
            <td>${tournament.participantCount}</td>
            <td>${tournament.withdrawalCount}</td>
            <td>${formatCurrency(tournament.totalRevenue)}</td>
            <td>${formatCurrency(tournament.wechatPayment)}</td>
            <td>${formatCurrency(tournament.refundBalance)}</td>
            <td>${formatCurrency(tournament.processingFee)}</td>
            <td>${formatCurrency(tournament.wechatFee)}</td>
            <td>${formatCurrency(tournament.certificationFee)}</td>
            <td>${formatCurrency(tournament.totalFee)}</td>
            <td>${tournament.medalCount}</td>
            <td>${formatCurrency(tournament.medalCost)}</td>
            <td>${formatCurrency(tournament.hostSettlement)}</td>
            <td>${formatCurrency(tournament.totalIncome)}</td>
            <td>
                <span class="status-badge ${tournament.isSettled ? 'status-settled' : 'status-pending'}">
                    ${tournament.isSettled ? '已结算' : '未结算'}
                </span>
                ${tournament.isCertified ? '<span class="status-badge status-certified">认证赛</span>' : ''}
            </td>
            <td>
                <div class="action-buttons-table">
                    <button class="action-btn-small edit-btn" onclick="editTournament('${tournament._id}')">
                        编辑
                    </button>
                    <button class="action-btn-small delete-btn" onclick="deleteTournament('${tournament._id}', '${tournament.tournamentName}')">
                        删除
                    </button>
                    <button class="action-btn-small toggle-btn ${tournament.isSettled ? 'pending' : ''}" 
                            onclick="toggleSettlement('${tournament._id}', ${!tournament.isSettled})">
                        ${tournament.isSettled ? '取消结算' : '标记结算'}
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * 更新分页信息
 */
function updatePagination() {
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (pageInfo) {
        pageInfo.textContent = `第 ${currentPage} 页，共 ${totalPages} 页（共 ${totalRecords} 条记录）`;
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
    }
}

/**
 * 切换页面
 */
function changePage(newPage) {
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderTable();
    }
}

/**
 * 编辑比赛
 */
function editTournament(id) {
    const tournament = allTournaments.find(t => t._id === id);
    if (!tournament) {
        showError('找不到指定的比赛记录');
        return;
    }
    
    // 填充编辑表单
    fillEditForm(tournament);
    
    // 显示编辑模态框
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * 填充编辑表单
 */
function fillEditForm(tournament) {
    const formFields = {
        editId: tournament._id,
        editTournamentName: tournament.tournamentName,
        editEventDate: formatDate(tournament.eventDate, 'YYYY-MM-DD'),
        editParticipantCount: tournament.participantCount,
        editWithdrawalCount: tournament.withdrawalCount,
        editTotalRevenue: tournament.totalRevenue,
        editWechatPayment: tournament.wechatPayment,
        editRefundBalance: tournament.refundBalance,
        editMedalCount: tournament.medalCount,
        editMedalPrice: tournament.medalPrice,
        editTournamentType: tournament.tournamentType,
        editIsCertified: tournament.isCertified
    };
    
    Object.entries(formFields).forEach(([fieldId, value]) => {
        const element = document.getElementById(fieldId);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = value;
            } else {
                element.value = value;
            }
        }
    });
}

/**
 * 删除比赛
 */
function deleteTournament(id, name) {
    const tournament = allTournaments.find(t => t._id === id);
    if (!tournament) {
        showError('找不到指定的比赛记录');
        return;
    }
    
    // 显示删除确认模态框
    const modal = document.getElementById('deleteModal');
    const nameElement = modal?.querySelector('.delete-tournament-name');
    
    if (nameElement) {
        nameElement.textContent = `比赛名称：${name}`;
    }
    
    if (modal) {
        modal.style.display = 'block';
        
        // 设置确认删除按钮的点击事件
        const confirmBtn = document.getElementById('confirmDelete');
        if (confirmBtn) {
            confirmBtn.onclick = () => confirmDeleteTournament(id);
        }
    }
}

/**
 * 确认删除比赛
 */
async function confirmDeleteTournament(id) {
    try {
        const result = await API.Tournament.delete(id);
        
        if (result.success) {
            showSuccess('删除成功');
            closeModal('deleteModal');
            await loadTournamentData(); // 重新加载数据
        } else {
            showError('删除失败：' + (result.error || '未知错误'));
        }
    } catch (error) {
        console.error('删除比赛失败:', error);
        showError('删除失败，请稍后重试');
    }
}

/**
 * 切换结算状态
 */
async function toggleSettlement(id, isSettled) {
    try {
        const result = await API.Tournament.toggleSettlement(id, isSettled);
        
        if (result.success) {
            showSuccess(isSettled ? '已标记为结算' : '已取消结算');
            await loadTournamentData(); // 重新加载数据
        } else {
            showError('操作失败：' + (result.error || '未知错误'));
        }
    } catch (error) {
        console.error('切换结算状态失败:', error);
        showError('操作失败，请稍后重试');
    }
}

/**
 * 处理导出
 */
async function handleExport() {
    try {
        // 使用当前筛选后的数据导出
        const dataToExport = filteredTournaments.length > 0 ? filteredTournaments : allTournaments;
        exportToExcel(dataToExport, 'tournament_records');
    } catch (error) {
        console.error('导出数据失败:', error);
        showError('导出失败，请稍后重试');
    }
}

/**
 * 设置模态框事件
 */
function setupModalEvents() {
    // 编辑模态框
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    
    if (editModal) {
        // 点击外部关闭
        editModal.addEventListener('click', (event) => {
            if (event.target === editModal) {
                closeModal('editModal');
            }
        });
        
        // 关闭按钮
        const closeBtn = editModal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal('editModal'));
        }
        
        // 取消按钮
        const cancelBtn = editModal.querySelector('[data-action="cancel"]');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => closeModal('editModal'));
        }
    }
    
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
    
    // 删除模态框
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) {
        // 点击外部关闭
        deleteModal.addEventListener('click', (event) => {
            if (event.target === deleteModal) {
                closeModal('deleteModal');
            }
        });
        
        // 关闭按钮
        const closeBtn = deleteModal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal('deleteModal'));
        }
        
        // 取消按钮
        const cancelBtn = deleteModal.querySelector('[data-action="cancel"]');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => closeModal('deleteModal'));
        }
    }
    
    // ESC键关闭模态框
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModal('editModal');
            closeModal('deleteModal');
        }
    });
}

/**
 * 关闭模态框
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * 处理编辑表单提交
 */
async function handleEditSubmit(event) {
    event.preventDefault();
    
    try {
        const formData = getEditFormData();
        const id = formData.id;
        delete formData.id;
        
        const result = await API.Tournament.update(id, formData);
        
        if (result.success) {
            showSuccess('更新成功');
            closeModal('editModal');
            await loadTournamentData(); // 重新加载数据
        } else {
            showError('更新失败：' + (result.error || '未知错误'));
        }
    } catch (error) {
        console.error('更新比赛失败:', error);
        showError('更新失败，请稍后重试');
    }
}

/**
 * 获取编辑表单数据
 */
function getEditFormData() {
    return {
        id: document.getElementById('editId')?.value,
        tournamentName: document.getElementById('editTournamentName')?.value.trim(),
        eventDate: document.getElementById('editEventDate')?.value,
        participantCount: parseInt(document.getElementById('editParticipantCount')?.value) || 0,
        withdrawalCount: parseInt(document.getElementById('editWithdrawalCount')?.value) || 0,
        totalRevenue: parseFloat(document.getElementById('editTotalRevenue')?.value) || 0,
        wechatPayment: parseFloat(document.getElementById('editWechatPayment')?.value) || 0,
        refundBalance: parseFloat(document.getElementById('editRefundBalance')?.value) || 0,
        medalCount: parseInt(document.getElementById('editMedalCount')?.value) || 0,
        medalPrice: parseFloat(document.getElementById('editMedalPrice')?.value) || 0,
        tournamentType: document.getElementById('editTournamentType')?.value,
        isCertified: document.getElementById('editIsCertified')?.checked || false
    };
}

// 将函数暴露到全局作用域，供HTML中的onclick使用
window.editTournament = editTournament;
window.deleteTournament = deleteTournament;
window.toggleSettlement = toggleSettlement;

// 导出函数供其他模块使用
if (typeof window !== 'undefined') {
    window.RecordsTable = {
        loadTournamentData,
        applyFiltersAndSort,
        renderTable,
        editTournament,
        deleteTournament,
        toggleSettlement
    };
}
