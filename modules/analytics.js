/**
 * 统计分析模块
 * 版本: v1.0.1
 * 功能: 多维度统计数据展示与分析
 */

// 全局状态
const AnalyticsState = {
    startDate: '', // 开始日期
    endDate: '', // 结束日期
    currentTab: 'company', // 当前标签页
    companyData: null,
    teamsData: [],
    businessStaffData: [], // 业务人员
    operationStaffData: [], // 运营人员
    serviceStaffData: [], // 服务人员
    projectData: [], // 项目数据
    customerData: []
};

/**
 * 初始化统计分析页面
 */
window.initAnalyticsPage = async function() {
    console.log('[Analytics] 🚀 初始化统计分析页面...');
    
    // 初始化日期选择器
    initDateSelector();
    
    // 加载数据
    await loadAnalyticsData();
};

/**
 * 初始化日期选择器
 */
function initDateSelector() {
    const startInput = document.getElementById('analyticsStartDate');
    const endInput = document.getElementById('analyticsEndDate');
    
    if (!startInput || !endInput) return;
    
    // 默认显示本月数据
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    AnalyticsState.startDate = formatDate(firstDay);
    AnalyticsState.endDate = formatDate(lastDay);
    
    startInput.value = AnalyticsState.startDate;
    endInput.value = AnalyticsState.endDate;
    
    // 更新快捷按钮状态
    updateQuickDateButtons('month');
}

/**
 * 快捷日期设置（今天、本周、本月、本年、全部）
 */
window.setAnalyticsQuickDate = async function(type) {
    const now = new Date();
    let startDate, endDate;
    
    switch(type) {
        case 'today':
            startDate = formatDate(now);
            endDate = formatDate(now);
            break;
        case 'week':
            // 本周（周一到周日）
            const dayOfWeek = now.getDay() || 7; // 周日为0，转换为7
            const monday = new Date(now);
            monday.setDate(now.getDate() - dayOfWeek + 1);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            startDate = formatDate(monday);
            endDate = formatDate(sunday);
            break;
        case 'month':
            // 本月
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            startDate = formatDate(firstDayOfMonth);
            endDate = formatDate(lastDayOfMonth);
            break;
        case 'year':
            // 本年
            const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
            const lastDayOfYear = new Date(now.getFullYear(), 11, 31);
            startDate = formatDate(firstDayOfYear);
            endDate = formatDate(lastDayOfYear);
            break;
        case 'all':
            // 全部（从2020年到当前）
            startDate = '2020-01-01';
            endDate = formatDate(now);
            break;
        default:
            return;
    }
    
    // 更新输入框
    const startInput = document.getElementById('analyticsStartDate');
    const endInput = document.getElementById('analyticsEndDate');
    if (startInput) startInput.value = startDate;
    if (endInput) endInput.value = endDate;
    
    // 更新状态
    AnalyticsState.startDate = startDate;
    AnalyticsState.endDate = endDate;
    
    // 更新按钮高亮状态
    updateQuickDateButtons(type);
    
    // 直接加载数据（不弹窗确认）
    console.log('[Analytics] 📅 快捷日期切换:', type, startDate, '~', endDate);
    showLoadingIndicator();
    try {
        await loadAnalyticsData();
    } catch (error) {
        console.error('[Analytics] ⚠️ 数据加载失败:', error);
    } finally {
        hideLoadingIndicator();
    }
};

/**
 * 更新快捷日期按钮高亮状态
 */
function updateQuickDateButtons(activeType) {
    const buttons = document.querySelectorAll('.analytics-quick-btn');
    buttons.forEach(btn => {
        const btnType = btn.getAttribute('onclick')?.match(/'(\w+)'/)?.[1];
        if (btnType === activeType) {
            btn.classList.add('bg-blue-50', 'text-blue-600');
            btn.classList.remove('text-gray-700');
        } else {
            btn.classList.remove('bg-blue-50', 'text-blue-600');
            btn.classList.add('text-gray-700');
        }
    });
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 切换统计周期
 */
window.changeAnalyticsPeriod = async function() {
    const startInput = document.getElementById('analyticsStartDate');
    const endInput = document.getElementById('analyticsEndDate');
    
    AnalyticsState.startDate = startInput.value;
    AnalyticsState.endDate = endInput.value;
    
    if (!AnalyticsState.startDate || !AnalyticsState.endDate) {
        alert('请选择统计日期范围');
        return;
    }
    
    console.log('[Analytics] 📅 切换统计周期:', AnalyticsState.startDate, '~', AnalyticsState.endDate);
    
    // 显示加载提示
    showLoadingIndicator();
    
    try {
        await loadAnalyticsData();
    } catch (error) {
        console.error('[Analytics] ⚠️ 数据加载失败:', error);
        alert('数据加载失败: ' + error.message);
    } finally {
        hideLoadingIndicator();
    }
};

/**
 * 显示加载提示
 */
function showLoadingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'analyticsLoadingIndicator';
    indicator.className = 'fixed top-20 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    indicator.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>加载统计数据...';
    document.body.appendChild(indicator);
}

/**
 * 隐藏加载提示
 */
function hideLoadingIndicator() {
    const indicator = document.getElementById('analyticsLoadingIndicator');
    if (indicator) indicator.remove();
}

/**
 * 加载统计数据
 */
async function loadAnalyticsData() {
    console.log('[Analytics] 📊 加载统计数据...', AnalyticsState.startDate, '~', AnalyticsState.endDate);
    
    // ✅ 临时方案: 提取月份调用现有API
    const yearMonth = AnalyticsState.startDate.substring(0, 7); // YYYY-MM
    
    try {
        // 加载公司概览数据
        await loadCompanyAnalytics(yearMonth);
        
        // 加载团队数据
        await loadTeamsAnalytics(yearMonth);
        
        // 根据当前标签加载对应数据
        if (AnalyticsState.currentTab === 'business') {
            await loadBusinessStaffAnalytics(yearMonth);
        } else if (AnalyticsState.currentTab === 'operation') {
            await loadOperationStaffAnalytics(yearMonth);
        } else if (AnalyticsState.currentTab === 'service') {
            await loadServiceStaffAnalytics(yearMonth);
        } else if (AnalyticsState.currentTab === 'project') {
            await loadProjectAnalytics(yearMonth);
        }
        
        console.log('[Analytics] ✅ 统计数据加载完成');
    } catch (error) {
        console.error('[Analytics] ❌ 数据加载失败:', error);
        throw error;
    }
}

/**
 * 加载公司概览数据
 */
async function loadCompanyAnalytics(period) {
    try {
        const response = await fetch(`/api/analytics/summary?dimension_type=company&dimension_id=1&period_type=month&period_value=${period}`, {
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            AnalyticsState.companyData = result.data;
            renderCompanyAnalytics(result.data);
        } else {
            console.warn('[Analytics] 未找到公司统计数据');
            renderCompanyAnalytics(null);
        }
    } catch (error) {
        console.error('[Analytics] 加载公司数据失败:', error);
        renderCompanyAnalytics(null);
    }
}

/**
 * 渲染公司概览数据
 */
function renderCompanyAnalytics(data) {
    if (!data) {
        document.getElementById('companyTotalSales').textContent = '¥0';
        document.getElementById('companyTotalOrders').textContent = '0';
        document.getElementById('companyTotalCostCard').textContent = '¥0';
        document.getElementById('companyTotalExpense').textContent = '¥0';
        document.getElementById('companyGrossProfit').textContent = '¥0';
        document.getElementById('companyTotalCost').textContent = '¥0';
        document.getElementById('companyStaffCount').textContent = '0人';
        document.getElementById('companyPerCapitaSales').textContent = '¥0';
        document.getElementById('companyPerCapitaProfit').textContent = '¥0';
        return;
    }
    
    // 核心指标
    document.getElementById('companyTotalSales').textContent = '¥' + formatNumber(data.total_sales);
    document.getElementById('companyTotalOrders').textContent = formatNumber(data.total_orders);
    document.getElementById('companyTotalCostCard').textContent = '¥' + formatNumber(data.total_cost);
    document.getElementById('companyTotalExpense').textContent = '¥' + formatNumber(data.total_expense);
    document.getElementById('companyGrossProfit').textContent = '¥' + formatNumber(data.gross_profit);
    
    // 成本构成
    document.getElementById('companyTotalCost').textContent = '¥' + formatNumber(data.total_cost);
    
    // 人效指标
    document.getElementById('companyStaffCount').textContent = data.staff_count + '人';
    document.getElementById('companyPerCapitaSales').textContent = '¥' + formatNumber(data.per_capita_sales);
    document.getElementById('companyPerCapitaProfit').textContent = '¥' + formatNumber(data.per_capita_profit);
}

/**
 * 加载团队统计数据
 */
async function loadTeamsAnalytics(period) {
    try {
        const response = await fetch(`/api/analytics/team-summary?period_type=month&period_value=${period}`, {
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            AnalyticsState.teamsData = result.data;
            renderTeamsAnalytics(result.data);
        } else {
            renderTeamsAnalytics([]);
        }
    } catch (error) {
        console.error('[Analytics] 加载团队数据失败:', error);
        renderTeamsAnalytics([]);
    }
}

/**
 * 渲染团队统计表格
 */
function renderTeamsAnalytics(teams) {
    const tbody = document.getElementById('teamsAnalyticsList');
    if (!tbody) return;
    
    if (teams.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="px-6 py-4 text-center text-sm text-gray-500">暂无团队统计数据</td></tr>';
        return;
    }
    
    let html = '';
    teams.forEach(team => {
        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${team.team || '未分配'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${formatNumber(team.total_sales)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${team.total_orders}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${formatNumber(team.total_cost)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-orange-600 text-right">¥${formatNumber(team.total_expense)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-semibold">¥${formatNumber(team.gross_profit)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${team.profit_margin.toFixed(1)}%</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${team.staff_count}人</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${formatNumber(team.per_capita_sales)}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

/**
 * 加载业务人员数据
 */
async function loadBusinessStaffAnalytics(period) {
    try {
        const response = await fetch(`/api/analytics/staff-performance?period_type=month&period_value=${period}`, {
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            AnalyticsState.businessStaffData = result.data;
            renderBusinessStaffAnalytics(result.data);
        } else {
            renderBusinessStaffAnalytics([]);
        }
    } catch (error) {
        console.error('[Analytics] 加载业务人员数据失败:', error);
        renderBusinessStaffAnalytics([]);
    }
}

/**
 * 渲染业务人员表格
 */
function renderBusinessStaffAnalytics(staffList) {
    const tbody = document.getElementById('businessStaffList');
    if (!tbody) return;
    
    if (staffList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="px-6 py-4 text-center text-sm text-gray-500">暂无业务人员数据</td></tr>';
        return;
    }
    
    let html = '';
    staffList.forEach(staff => {
        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${staff.staff_name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${staff.department || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${staff.new_customers || 0}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${staff.follow_customers || 0}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${staff.signed_orders || 0}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${formatNumber(staff.total_sales)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${formatNumber(staff.cost)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-orange-600 text-right">¥${formatNumber(staff.expense)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-semibold">¥${formatNumber(staff.profit)}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

/**
 * 加载运营人员数据
 */
async function loadOperationStaffAnalytics(period) {
    try {
        // 按角色筛选运营人员
        const response = await fetch(`/api/analytics/staff-performance?period_type=month&period_value=${period}&role=operation`, {
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            AnalyticsState.operationStaffData = result.data;
            renderOperationStaffAnalytics(result.data);
        } else {
            renderOperationStaffAnalytics([]);
        }
    } catch (error) {
        console.error('[Analytics] 加载运营人员数据失败:', error);
        renderOperationStaffAnalytics([]);
    }
}

/**
 * 渲染运营人员表格
 */
function renderOperationStaffAnalytics(staffList) {
    const tbody = document.getElementById('operationStaffList');
    if (!tbody) return;
    
    if (staffList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">暂无运营人员数据</td></tr>';
        return;
    }
    
    let html = '';
    staffList.forEach(staff => {
        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${staff.staff_name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${staff.department || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${staff.order_count || 0}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${formatNumber(staff.total_sales)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${formatNumber(staff.cost)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-orange-600 text-right">¥${formatNumber(staff.expense)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-semibold">¥${formatNumber(staff.profit)}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

/**
 * 加载服务人员数据
 */
async function loadServiceStaffAnalytics(period) {
    try {
        // 按角色筛选服务人员
        const response = await fetch(`/api/analytics/staff-performance?period_type=month&period_value=${period}&role=service`, {
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            AnalyticsState.serviceStaffData = result.data;
            renderServiceStaffAnalytics(result.data);
        } else {
            renderServiceStaffAnalytics([]);
        }
    } catch (error) {
        console.error('[Analytics] 加载服务人员数据失败:', error);
        renderServiceStaffAnalytics([]);
    }
}

/**
 * 渲染服务人员表格
 */
function renderServiceStaffAnalytics(staffList) {
    const tbody = document.getElementById('serviceStaffList');
    if (!tbody) return;
    
    if (staffList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">暂无服务人员数据</td></tr>';
        return;
    }
    
    let html = '';
    staffList.forEach(staff => {
        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${staff.staff_name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${staff.department || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${staff.order_count || 0}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${formatNumber(staff.total_sales)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${formatNumber(staff.cost)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-orange-600 text-right">¥${formatNumber(staff.expense)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-semibold">¥${formatNumber(staff.profit)}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

/**
 * 加载项目数据
 */
async function loadProjectAnalytics(period) {
    try {
        // 调用项目API获取项目数据
        const response = await fetch(`/api/projects`, {
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            // 只显示进行中和计划中的项目
            const activeProjects = result.data.filter(p => 
                p.status === 'active' || p.status === 'planning'
            );
            AnalyticsState.projectData = activeProjects;
            renderProjectAnalytics(activeProjects);
        } else {
            renderProjectAnalytics([]);
        }
    } catch (error) {
        console.error('[Analytics] 加载项目数据失败:', error);
        renderProjectAnalytics([]);
    }
}

/**
 * 渲染项目数据表格
 */
function renderProjectAnalytics(projects) {
    const tbody = document.getElementById('projectAnalyticsList');
    if (!tbody) return;
    
    if (projects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="px-6 py-4 text-center text-sm text-gray-500">暂无项目数据</td></tr>';
        return;
    }
    
    let html = '';
    projects.forEach(project => {
        const statusMap = {
            'planning': '<span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">计划中</span>',
            'active': '<span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">进行中</span>',
            'completed': '<span class="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">已完成</span>',
            'cancelled': '<span class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">已取消</span>'
        };
        const statusHtml = statusMap[project.status] || project.status;
        
        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${project.name || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${project.code || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${project.manager || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${formatNumber(project.budget)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${project.start_date || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${project.end_date || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">${statusHtml}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">-</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-semibold">-</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

/**
 * 加载人员绩效数据 (旧版,保留兼容)
 */
async function loadStaffAnalytics() {
    const yearMonth = AnalyticsState.startDate.substring(0, 7);
    try {
        const response = await fetch(`/api/analytics/staff-performance?period_type=month&period_value=${yearMonth}`, {
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            AnalyticsState.staffData = result.data;
            renderStaffAnalytics(result.data);
        } else {
            renderStaffAnalytics([]);
        }
    } catch (error) {
        console.error('[Analytics] 加载人员数据失败:', error);
        renderStaffAnalytics([]);
    }
}

/**
 * 渲染人员绩效表格
 */
function renderStaffAnalytics(staffList) {
    const tbody = document.getElementById('staffAnalyticsList');
    if (!tbody) return;
    
    if (staffList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="px-6 py-4 text-center text-sm text-gray-500">暂无人员绩效数据，请先触发统计计算</td></tr>';
        return;
    }
    
    let html = '';
    staffList.forEach(staff => {
        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${staff.staff_name || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${staff.department || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${staff.new_customers}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${staff.follow_customers}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${staff.signed_orders}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${formatNumber(staff.total_sales)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${formatNumber(staff.avg_order_amount)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${staff.conversion_rate.toFixed(1)}%</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-semibold">¥${formatNumber(staff.profit)}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

/**
 * 加载客户价值分析数据
 */
async function loadCustomerAnalytics() {
    try {
        const response = await fetch('/api/analytics/customer-value', {
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            AnalyticsState.customerData = result.data;
            renderCustomerAnalytics(result.data);
        } else {
            renderCustomerAnalytics([]);
        }
    } catch (error) {
        console.error('[Analytics] 加载客户数据失败:', error);
        renderCustomerAnalytics([]);
    }
}

/**
 * 渲染客户价值表格
 */
function renderCustomerAnalytics(customers) {
    const tbody = document.getElementById('customerAnalyticsList');
    if (!tbody) return;
    
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="px-6 py-4 text-center text-sm text-gray-500">暂无客户价值数据，请点击"批量计算客户价值"按钮</td></tr>';
        return;
    }
    
    let html = '';
    customers.forEach(customer => {
        const isActive = customer.is_active === 1;
        const statusBadge = isActive 
            ? '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">活跃</span>'
            : '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">沉默</span>';
        
        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${customer.shop_name || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${customer.company_name || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${customer.total_orders}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${formatNumber(customer.total_sales)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${formatNumber(customer.total_cost)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-semibold">¥${formatNumber(customer.total_profit)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${formatNumber(customer.avg_order_amount)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-semibold">¥${formatNumber(customer.ltv)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-purple-600 text-right">${customer.roi.toFixed(1)}%</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-center">${statusBadge}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

/**
 * 切换标签页
 */
window.switchAnalyticsTab = async function(tabName) {
    console.log('[Analytics] 🔄 切换标签页:', tabName);
    AnalyticsState.currentTab = tabName;
    
    // 更新标签按钮样式
    document.querySelectorAll('.analytics-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.remove('border-transparent', 'text-gray-500');
            btn.classList.add('border-blue-500', 'text-blue-600');
        } else {
            btn.classList.remove('border-blue-500', 'text-blue-600');
            btn.classList.add('border-transparent', 'text-gray-500');
        }
    });
    
    // 显示对应的标签页内容
    document.querySelectorAll('.analytics-tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(`analytics-tab-${tabName}`).classList.remove('hidden');
    
    // 根据标签页加载对应数据
    const yearMonth = AnalyticsState.startDate.substring(0, 7);
    
    if (tabName === 'teams') {
        await loadTeamsAnalytics(yearMonth);
    } else if (tabName === 'business') {
        await loadBusinessStaffAnalytics(yearMonth);
    } else if (tabName === 'operation') {
        await loadOperationStaffAnalytics(yearMonth);
    } else if (tabName === 'service') {
        await loadServiceStaffAnalytics(yearMonth);
    } else if (tabName === 'project') {
        await loadProjectAnalytics(yearMonth);
    } else if (tabName === 'customers' && AnalyticsState.customerData.length === 0) {
        await loadCustomerAnalytics();
    }
};

/**
 * 触发月度统计计算
 * @param {boolean} autoTrigger - 是否为自动触发（不显示确认对话框）
 */
window.triggerMonthlyCalculation = async function(autoTrigger = false) {
    const period = AnalyticsState.startDate.substring(0, 7); // 使用startDate
    const [year, month] = period.split('-').map(Number);
    
    // 移除确认弹窗，直接刷新
    console.log('[Analytics] 🔄 触发统计计算:', { year, month, autoTrigger });
    
    // 显示计算提示
    const calculatingIndicator = document.createElement('div');
    calculatingIndicator.id = 'calculatingIndicator';
    calculatingIndicator.className = 'fixed top-20 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    calculatingIndicator.innerHTML = '<i class="fas fa-calculator fa-spin mr-2"></i>正在刷新统计数据...';
    document.body.appendChild(calculatingIndicator);
    
    try {
        const response = await fetch('/api/analytics/calculate-monthly', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ year, month, company_id: 1 })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 重新加载数据（不显示完成弹窗）
            await loadAnalyticsData();
            showNotification('统计数据已刷新', 'success');
        } else {
            showNotification('刷新失败: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('[Analytics] 统计计算失败:', error);
        showNotification('刷新失败: ' + error.message, 'error');
    } finally {
        // 移除计算提示
        const indicator = document.getElementById('calculatingIndicator');
        if (indicator) indicator.remove();
    }
};

/**
 * 批量计算所有客户价值
 */
window.calculateAllCustomersValue = async function() {
    if (!confirm('确认要批量计算所有客户的价值分析吗？\n\n此操作可能需要较长时间（客户数量越多越慢）。')) {
        return;
    }
    
    console.log('[Analytics] 🔄 批量计算客户价值...');
    
    try {
        const response = await fetch('/api/analytics/calculate-customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ all: true, company_id: 1 })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
            // 重新加载客户数据
            await loadCustomerAnalytics();
        } else {
            alert('计算失败: ' + result.message);
        }
    } catch (error) {
        console.error('[Analytics] 客户价值计算失败:', error);
        alert('计算失败: ' + error.message);
    }
};

/**
 * 格式化数字（千分位）
 */
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

console.log('[Analytics] ✅ 统计分析模块加载完成 v1.0.0');
