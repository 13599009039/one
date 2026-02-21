/**
 * SaaS平台控制台前端逻辑
 * 连接后端API，管理租户公司和用户
 */

const API_BASE = window.location.origin;

// API请求封装
async function apiRequest(url, options = {}) {
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    const response = await fetch(`${API_BASE}${url}`, {
        ...defaultOptions,
        ...options
    });
    
    const data = await response.json();
    
    // 处理401/403未授权错误
    if (!data.success && (response.status === 401 || response.status === 403)) {
        // 未登录，跳转到登录页
        showLoginPage();
        throw new Error('未登录或无权限');
    }
    
    return data;
}

// 显示提示消息
function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-down ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.classList.add('animate-fade-out-up');
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// ==================== 登录相关 ====================

function showLoginPage() {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('consolePage').classList.add('hidden');
}

function showConsolePage() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('consolePage').classList.remove('hidden');
}

// 登录处理
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const data = await apiRequest('/api/users/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (data.success) {
            showMessage('登录成功');
            showConsolePage();
            // 更新管理员名称
            const sidebarUsername = document.getElementById('sidebarUsername');
            if (sidebarUsername) {
                sidebarUsername.textContent = data.user.name || username;
            }
            // 加载初始数据
            loadCompanyData();
            loadSystemStats();
        } else {
            showMessage(data.message || '登录失败', 'error');
        }
    } catch (error) {
        showMessage('登录失败：' + error.message, 'error');
    }
});

// 退出登录
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await apiRequest('/api/users/logout', { method: 'POST' });
        showMessage('已退出登录');
        showLoginPage();
    } catch (error) {
        showLoginPage();
    }
});

// ==================== 公司管理 ====================

let currentCompanies = [];
let currentPage = 1;
let pageSize = 20;

// 加载公司数据
async function loadCompanyData(page = 1, search = '') {
    try {
        const params = new URLSearchParams({ page, page_size: pageSize });
        if (search) params.append('search', search);
        
        const data = await apiRequest(`/api/admin/companies?${params}`);
        
        if (data.success) {
            currentCompanies = data.data.items;
            renderCompanyTable(currentCompanies);
            renderPagination('companyPagination', data.data);
        }
    } catch (error) {
        console.error('加载公司数据失败:', error);
    }
}

// 渲染公司表格
function renderCompanyTable(companies) {
    const tbody = document.getElementById('companyTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (companies.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" class="px-6 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2"></i>
                    <p>暂无公司数据</p>
                </td>
            </tr>
        `;
        return;
    }
    
    companies.forEach(company => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors';
        
        // 续费状态显示
        let renewalBadge = '';
        if (company.renewal_status === 'expired') {
            renewalBadge = '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">已到期</span>';
        } else if (company.renewal_status === 'expiring') {
            renewalBadge = '<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">即将到期</span>';
        } else {
            renewalBadge = '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">正常</span>';
        }
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <div class="font-medium text-gray-900">${escapeHtml(company.name)}</div>
                <div class="text-gray-500 text-xs">${escapeHtml(company.short_name || '')}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${escapeHtml(company.short_name || '-')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${escapeHtml(company.contact_person || '-')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${escapeHtml(company.contact_phone || '-')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formatDate(company.service_start_date)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${company.service_fee ? '¥' + company.service_fee : '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                ${escapeHtml(company.traffic_staff || '-')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                ${escapeHtml(company.business_staff || '-')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                ${escapeHtml(company.service_staff || '-')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" 
                           class="sr-only peer" 
                           ${company.mobile_access ? 'checked' : ''} 
                           onchange="toggleMobileAccess(${company.id}, this.checked)" 
                           data-company-id="${company.id}">
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    <span class="ml-2 text-xs text-gray-600">${company.mobile_access ? '开启' : '关闭'}</span>
                </label>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                ${renewalBadge}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onclick="viewCompanyDetail(${company.id})" class="text-indigo-600 hover:text-indigo-900">
                    查看
                </button>
                <button onclick="editCompany(${company.id})" class="text-blue-600 hover:text-blue-900">
                    编辑
                </button>
                <button onclick="generateOnboardingLink(${company.id})" class="text-green-600 hover:text-green-900">
                    开通链接
                </button>
                ${company.status === 'active' ? 
                    `<button onclick="disableCompany(${company.id})" class="text-red-600 hover:text-red-900">停用</button>` :
                    `<button onclick="enableCompany(${company.id})" class="text-green-600 hover:text-green-900">启用</button>`
                }
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 搜索公司
document.getElementById('searchCompany')?.addEventListener('input', (e) => {
    const search = e.target.value.trim();
    loadCompanyData(1, search);
});

// 新增公司
document.getElementById('addCompanyBtn')?.addEventListener('click', () => {
    showCompanyModal();
});

// 显示公司模态框
function showCompanyModal(company = null) {
    const modal = document.getElementById('companyModal');
    const form = document.getElementById('companyForm');
    const title = document.getElementById('modalTitle');
    
    if (!modal || !form) return;
    
    if (company) {
        title.textContent = '编辑公司';
        form.dataset.companyId = company.id;
        document.getElementById('companyName').value = company.name || '';
        document.getElementById('shortName').value = company.short_name || '';
        document.getElementById('contactPerson').value = company.contact_person || '';
        document.getElementById('contactPhone').value = company.contact_phone || '';
        document.getElementById('taxNumber').value = company.tax_number || '';
        document.getElementById('address').value = company.address || '';
        document.getElementById('industry').value = company.industry || '';
        // 销售字段
        document.getElementById('trafficStaff').value = company.traffic_staff || '';
        document.getElementById('businessStaff').value = company.business_staff || '';
        document.getElementById('serviceStaff').value = company.service_staff || '';
        document.getElementById('notes').value = company.notes || '';
    } else {
        title.textContent = '新增公司';
        delete form.dataset.companyId;
        form.reset();
    }
    
    modal.classList.remove('hidden');
}

// 隐藏公司模态框
document.getElementById('cancelCompanyModal')?.addEventListener('click', () => {
    document.getElementById('companyModal').classList.add('hidden');
});

document.getElementById('cancelCompanyBtn')?.addEventListener('click', () => {
    document.getElementById('companyModal').classList.add('hidden');
});

// 提交公司表单
document.getElementById('companyForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const companyId = form.dataset.companyId;
    
    const companyData = {
        name: document.getElementById('companyName').value,
        short_name: document.getElementById('shortName').value,
        contact_person: document.getElementById('contactPerson').value,
        contact_phone: document.getElementById('contactPhone').value,
        tax_number: document.getElementById('taxNumber').value,
        address: document.getElementById('address').value,
        industry: document.getElementById('industry').value,
        // 销售字段
        traffic_staff: document.getElementById('trafficStaff').value,
        business_staff: document.getElementById('businessStaff').value,
        service_staff: document.getElementById('serviceStaff').value,
        notes: document.getElementById('notes').value
    };
    
    try {
        const url = companyId ? `/api/admin/companies/${companyId}` : '/api/admin/companies';
        const method = companyId ? 'PUT' : 'POST';
        
        const data = await apiRequest(url, {
            method,
            body: JSON.stringify(companyData)
        });
        
        if (data.success) {
            showMessage(companyId ? '公司信息已更新' : '公司创建成功');
            document.getElementById('companyModal').classList.add('hidden');
            loadCompanyData(currentPage);
        } else {
            showMessage(data.message || '操作失败', 'error');
        }
    } catch (error) {
        showMessage('操作失败：' + error.message, 'error');
    }
});

// 编辑公司
async function editCompany(id) {
    try {
        const data = await apiRequest(`/api/admin/companies/${id}`);
        if (data.success) {
            showCompanyModal(data.data);
        }
    } catch (error) {
        showMessage('获取公司信息失败', 'error');
    }
}

// 查看公司详情
async function viewCompanyDetail(id) {
    try {
        const data = await apiRequest(`/api/admin/companies/${id}`);
        if (data.success) {
            const company = data.data;
            alert(`公司详情：\n\n` +
                `ID: ${company.id}\n` +
                `名称: ${company.name}\n` +
                `简称: ${company.short_name || '-'}\n` +
                `联系人: ${company.contact_person || '-'}\n` +
                `电话: ${company.contact_phone || '-'}\n` +
                `活跃用户: ${company.active_users || 0}人\n` +
                `总用户: ${company.total_users || 0}人\n` +
                `状态: ${company.status}`
            );
        }
    } catch (error) {
        showMessage('获取公司详情失败', 'error');
    }
}

// 生成开通链接
async function generateOnboardingLink(id) {
    try {
        const data = await apiRequest(`/api/admin/companies/${id}/generate-onboarding`, {
            method: 'POST'
        });
        
        if (data.success) {
            const url = data.data.url;
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 class="text-lg font-bold mb-4">开通链接</h3>
                    <p class="text-sm text-gray-600 mb-4">请将以下链接发送给客户管理员：</p>
                    <div class="bg-gray-100 p-3 rounded mb-4 break-all text-sm">
                        ${url}
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="copyToClipboard('${url}')" class="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
                            复制链接
                        </button>
                        <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">
                            关闭
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
    } catch (error) {
        showMessage('生成开通链接失败', 'error');
    }
}

// 停用公司
async function disableCompany(id) {
    if (!confirm('确定要停用该公司吗？')) return;
    
    try {
        const data = await apiRequest(`/api/admin/companies/${id}`, {
            method: 'DELETE'
        });
        
        if (data.success) {
            showMessage('公司已停用');
            loadCompanyData(currentPage);
        } else {
            showMessage(data.message || '操作失败', 'error');
        }
    } catch (error) {
        showMessage('操作失败：' + error.message, 'error');
    }
}

// ==================== 用户管理 ====================

let currentUsers = [];

// 加载用户数据
async function loadUserData(page = 1, search = '') {
    try {
        const params = new URLSearchParams({ page, page_size: pageSize });
        if (search) params.append('search', search);
        
        const data = await apiRequest(`/api/admin/users?${params}`);
        
        if (data.success) {
            currentUsers = data.data.items;
            renderUserTable(currentUsers);
            renderPagination('userPagination', data.data);
        }
    } catch (error) {
        console.error('加载用户数据失败:', error);
    }
}

// 渲染用户表格
function renderUserTable(users) {
    const tbody = document.getElementById('userTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                    <i class="fas fa-user-slash text-4xl mb-2"></i>
                    <p>暂无用户数据</p>
                </td>
            </tr>
        `;
        return;
    }
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${user.id}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <div class="font-medium text-gray-900">${escapeHtml(user.username)}</div>
                <div class="text-gray-500">${escapeHtml(user.name || '')}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${escapeHtml(user.phone || '-')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="max-w-xs truncate" title="${escapeHtml(user.company_names || '-')}">
                    ${escapeHtml(user.company_names || '-')}
                </div>
                <div class="text-xs text-gray-400">${user.company_count || 0}个公司</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${escapeHtml(user.role || '-')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.status === 'enabled' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }">
                    ${user.status === 'enabled' ? '正常' : '已停用'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onclick="viewUserDetail(${user.id})" class="text-indigo-600 hover:text-indigo-900">
                    查看
                </button>
                <button onclick="manageUserCompanies(${user.id})" class="text-blue-600 hover:text-blue-900">
                    管理公司
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 搜索用户
document.getElementById('searchUser')?.addEventListener('input', (e) => {
    const search = e.target.value.trim();
    loadUserData(1, search);
});

// 查看用户详情
async function viewUserDetail(id) {
    try {
        const data = await apiRequest(`/api/admin/users/${id}`);
        if (data.success) {
            const user = data.data;
            const companies = user.companies || [];
            alert(`用户详情：\n\n` +
                `ID: ${user.id}\n` +
                `用户名: ${user.username}\n` +
                `姓名: ${user.name || '-'}\n` +
                `电话: ${user.phone || '-'}\n` +
                `角色: ${user.role || '-'}\n` +
                `状态: ${user.status}\n` +
                `关联公司数: ${companies.length}\n` +
                `公司列表: ${companies.map(c => c.company_name).join(', ')}`
            );
        }
    } catch (error) {
        showMessage('获取用户详情失败', 'error');
    }
}

// 管理用户公司
async function manageUserCompanies(id) {
    showMessage('用户-公司管理功能开发中...', 'error');
}

// ==================== 系统统计 ====================

async function loadSystemStats() {
    try {
        const data = await apiRequest('/api/admin/system-config');
        if (data.success) {
            const stats = data.data.statistics;
            // 安全地更新DOM元素
            const activeCompanies = document.getElementById('activeCompanies');
            const totalCompanies = document.getElementById('totalCompanies');
            const activeUsers = document.getElementById('activeUsers');
            const totalUsers = document.getElementById('totalUsers');
            
            if (activeCompanies) activeCompanies.textContent = stats.active_companies;
            if (totalCompanies) totalCompanies.textContent = stats.total_companies;
            if (activeUsers) activeUsers.textContent = stats.active_users;
            if (totalUsers) totalUsers.textContent = stats.total_users;
        }
    } catch (error) {
        console.error('加载系统统计失败:', error);
        // 不抛出错误，避免影响初始化流程
    }
}

// ==================== 分页 ====================

function renderPagination(elementId, pageData) {
    const pagination = document.getElementById(elementId);
    if (!pagination) return;
    
    const { page, total_pages } = pageData;
    
    pagination.innerHTML = `
        <button onclick="changePage('${elementId}', ${page - 1})" 
                ${page <= 1 ? 'disabled' : ''} 
                class="px-4 py-2 border rounded ${page <= 1 ? 'bg-gray-100 text-gray-400' : 'hover:bg-gray-50'}">
            上一页
        </button>
        <span class="px-4 py-2">第 ${page} / ${total_pages} 页</span>
        <button onclick="changePage('${elementId}', ${page + 1})" 
                ${page >= total_pages ? 'disabled' : ''} 
                class="px-4 py-2 border rounded ${page >= total_pages ? 'bg-gray-100 text-gray-400' : 'hover:bg-gray-50'}">
            下一页
        </button>
    `;
}

function changePage(paginationId, newPage) {
    if (paginationId === 'companyPagination') {
        loadCompanyData(newPage);
    } else if (paginationId === 'userPagination') {
        loadUserData(newPage);
    }
}

// ==================== 工具函数 ====================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showMessage('已复制到剪贴板');
    }).catch(() => {
        showMessage('复制失败', 'error');
    });
}

// ==================== 导航切换 ====================

function setupNavigation() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const navLinks = document.querySelectorAll('.nav-link[data-target]');
    const navParents = document.querySelectorAll('.nav-link[data-toggle]');
    
    // 导航映射配置
    const moduleMapping = {
        'companies': 'companiesModule',
        'users': 'usersModule',
        'system': 'systemModule',
        'provider-config': 'providerConfigModule',  // 服务商配置中心
        'express-rules': 'expressRulesModule',
        'express-orders': 'expressOrdersModule',
        'tenant-quotas': 'tenantQuotasModule',
        'cainiao-logs': 'cainiaoLogsModule'
    };
    
    // 侧边栏折叠/展开
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
            
            // 保存状态到localStorage
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', isCollapsed);
        });
        
        // 恢复上次的折叠状态
        if (localStorage.getItem('sidebarCollapsed') === 'true') {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
        }
    }
    
    // 子菜单展开/收起
    navParents.forEach(parent => {
        parent.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = parent.dataset.toggle;
            const submenu = document.getElementById(targetId);
            const arrow = parent.querySelector('.submenu-arrow');
            
            if (submenu) {
                const isOpen = submenu.style.maxHeight && submenu.style.maxHeight !== '0px';
                
                if (isOpen) {
                    submenu.style.maxHeight = '0px';
                    if (arrow) arrow.classList.remove('expanded');
                } else {
                    submenu.style.maxHeight = submenu.scrollHeight + 'px';
                    if (arrow) arrow.classList.add('expanded');
                }
            }
        });
    });
    
    // 导航链接点击
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.dataset.target;
            const moduleId = moduleMapping[target];
            
            if (!moduleId) return;
            
            // 更新导航样式
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // 隐藏所有模块
            document.querySelectorAll('.module-content').forEach(m => {
                m.classList.add('hidden');
            });
            
            // 显示目标模块
            const targetModule = document.getElementById(moduleId);
            if (targetModule) {
                targetModule.classList.remove('hidden');
            }
            
            // 如果是服务商配置菜单，同步标签页状态
            if (link.classList.contains('provider-menu')) {
                const providerId = link.dataset.provider;
                if (providerId) {
                    // 延迟执行以确保 DOM 已渲染
                    setTimeout(() => {
                        switchProviderTab(providerId);
                    }, 50);
                }
            } else {
                // 加载对应数据
                loadModuleData(target);
            }
        });
    });
}

// 加载模块数据
function loadModuleData(target) {
    switch(target) {
        case 'companies':
            loadCompanyData();
            break;
        case 'users':
            loadUserData();
            break;
        case 'system':
            loadSystemStats();
            break;
        case 'provider-config':
            // 初始化服务商标签页（首次进入时）
            if (!document.querySelector('.provider-tab')) {
                initProviderTabs();
            }
            // 显示标签页容器
            const tabsContainer = document.getElementById('providerTabsContainer');
            if (tabsContainer) {
                tabsContainer.parentElement.style.display = 'block';
            }
            // 加载当前激活服务商配置
            loadProviderConfig(currentProvider);
            break;
        case 'express-rules':
            // 隐藏标签页（业务管理模块不需要标签页）
            hideProviderTabs();
            loadExpressRules();
            break;
        case 'express-orders':
            hideProviderTabs();
            loadExpressOrders();
            break;
        case 'tenant-quotas':
            hideProviderTabs();
            loadTenantQuotas();
            break;
        case 'cainiao-logs':
            hideProviderTabs();
            loadCainiaoLogs();
            break;
    }
}

// 隐藏服务商标签页（业务管理模块不需要）
function hideProviderTabs() {
    const tabsContainer = document.getElementById('providerTabsContainer');
    if (tabsContainer && tabsContainer.parentElement) {
        tabsContainer.parentElement.style.display = 'none';
    }
}

// ==================== 页面初始化 ====================

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    
    // 初始状态：显示登录页
    showLoginPage();
    
    // 尝试检查登录状态（静默检查）
    checkLoginStatus().then(isLoggedIn => {
        if (isLoggedIn) {
            showConsolePage();
            loadCompanyData();
            loadSystemStats();
        }
    });
});

// 检查登录状态（静默检查，不触发登录页跳转）
async function checkLoginStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/system-config`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        return data.success && response.ok;
    } catch (error) {
        return false;
    }
}

// ==================== 物流控制台 - 服务商配置中心 ====================

// 服务商配置
const LOGISTICS_PROVIDERS = [
    { id: 'cainiao', name: '菜鸟物流', icon: 'truck', enabled: true },
    { id: 'jd', name: '京东物流', icon: 'box', enabled: false },
    { id: 'kuaidi100', name: '快递100', icon: 'shipping-fast', enabled: false }
];

let currentProvider = 'cainiao'; // 当前激活的服务商

// 初始化服务商标签页
function initProviderTabs() {
    const container = document.getElementById('providerTabsContainer');
    if (!container) return;
    
    container.innerHTML = LOGISTICS_PROVIDERS.map(provider => `
        <div class="provider-tab ${provider.id === 'cainiao' ? 'active' : ''}" 
             data-provider="${provider.id}" 
             onclick="switchProviderTab('${provider.id}')">
            <i class="fas fa-${provider.icon} mr-2"></i>
            ${provider.name}
            ${!provider.enabled ? '<span class="badge">即将开放</span>' : ''}
        </div>
    `).join('');
}

// 切换服务商标签
function switchProviderTab(providerId) {
    currentProvider = providerId;
    
    // 更新标签样式
    document.querySelectorAll('.provider-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.provider === providerId);
    });
    
    // 切换表单显示
    document.querySelectorAll('.provider-form').forEach(form => {
        form.classList.toggle('hidden', form.dataset.provider !== providerId);
    });
    
    // 同步左侧导航菜单激活状态
    document.querySelectorAll('.provider-menu').forEach(menu => {
        if (menu.dataset.provider === providerId) {
            menu.classList.add('active');
        } else {
            menu.classList.remove('active');
        }
    });
    
    // 加载对应服务商配置
    loadProviderConfig(providerId);
}

// 加载服务商配置（根据 providerId 路由到对应加载函数）
function loadProviderConfig(providerId) {
    switch(providerId) {
        case 'cainiao':
            loadCainiaoConfig();
            break;
        case 'jd':
            // 京东物流配置加载功能待开发
            console.log('京东物流配置加载功能待开发');
            break;
        case 'kuaidi100':
            loadKuaidi100Config();
            break;
    }
}

// 统一测试连接方法（根据 currentProvider 路由）
function testProviderConnection() {
    switch(currentProvider) {
        case 'cainiao':
            testCainiaoConnection();
            break;
        case 'jd':
            showMessage('京东物流测试功能待开发', 'error');
            break;
        case 'kuaidi100':
            testKuaidi100Connection();
            break;
    }
}

// ==================== 菜鸟配置加载与测试（原逻辑保留） ====================

async function loadCainiaoConfig() {
    try {
        const data = await apiRequest('/api/platform/cainiao/config');
        if (data.success && data.data) {
            const config = data.data;
            document.getElementById('cnAppKey').value = config.app_key || '';
            document.getElementById('cnAppSecret').value = config.app_secret || '';
            document.getElementById('cnEndpointUrl').value = config.endpoint_url || 'https://link.cainiao.com/gateway/link.do';
            document.getElementById('cnSignMethod').value = config.sign_method || 'md5';
            document.getElementById('cnCallbackUrl').value = config.callback_url || '';
            document.getElementById('cnCallbackSecret').value = config.callback_secret || '';
            
            // 显示测试状态
            const testStatus = document.getElementById('cnTestStatus');
            if (config.test_passed) {
                testStatus.innerHTML = `<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>连接正常 (最后测试: ${formatDateTime(config.last_test_at)})</span>`;
            } else if (config.last_test_at) {
                testStatus.innerHTML = `<span class="text-red-600"><i class="fas fa-times-circle mr-1"></i>连接失败: ${config.test_error || '未知错误'}</span>`;
            }
        }
    } catch (error) {
        console.error('加载菜鸟配置失败:', error);
    }
}

async function testCainiaoConnection() {
    const testStatus = document.getElementById('cnTestStatus');
    testStatus.innerHTML = '<span class="text-gray-500"><i class="fas fa-spinner fa-spin mr-1"></i>测试中...</span>';
    
    try {
        const data = await apiRequest('/api/platform/cainiao/config/test', { method: 'POST' });
        if (data.success) {
            testStatus.innerHTML = `<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>连接成功，耗时 ${data.duration_ms}ms</span>`;
            showMessage('连接测试成功');
        } else {
            testStatus.innerHTML = `<span class="text-red-600"><i class="fas fa-times-circle mr-1"></i>${data.message}</span>`;
            showMessage(data.message, 'error');
        }
    } catch (error) {
        testStatus.innerHTML = `<span class="text-red-600"><i class="fas fa-times-circle mr-1"></i>测试失败</span>`;
        showMessage('连接测试失败', 'error');
    }
}

document.getElementById('cainiaoConfigForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const configData = {
        app_key: document.getElementById('cnAppKey').value,
        app_secret: document.getElementById('cnAppSecret').value,
        endpoint_url: document.getElementById('cnEndpointUrl').value,
        sign_method: document.getElementById('cnSignMethod').value,
        callback_url: document.getElementById('cnCallbackUrl').value,
        callback_secret: document.getElementById('cnCallbackSecret').value
    };
    
    try {
        const data = await apiRequest('/api/platform/cainiao/config', {
            method: 'POST',
            body: JSON.stringify(configData)
        });
        
        if (data.success) {
            showMessage('配置保存成功');
        } else {
            showMessage(data.message || '保存失败', 'error');
        }
    } catch (error) {
        showMessage('保存失败: ' + error.message, 'error');
    }
});

// ==================== 物流控制台 - 快递规则 ====================

async function loadExpressRules() {
    try {
        const data = await apiRequest('/api/platform/cainiao/rules');
        const tbody = document.getElementById('expressRulesTable');
        
        if (!data.success || !data.data.items.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">暂无规则数据</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.data.items.map(rule => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm font-medium text-gray-900">${escapeHtml(rule.rule_name)}</td>
                <td class="px-6 py-4 text-sm text-gray-600">
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">${rule.cp_code}</span>
                    ${rule.cp_name || ''}
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">
                    ${rule.sender_name || '-'}<br>
                    <span class="text-xs text-gray-400">${rule.sender_phone || ''}</span>
                </td>
                <td class="px-6 py-4">
                    ${rule.is_default ? '<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">默认</span>' : ''}
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded text-xs ${rule.status === 'enabled' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                        ${rule.status === 'enabled' ? '启用' : '禁用'}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm space-x-2">
                    <button onclick="editExpressRule(${rule.id})" class="text-blue-600 hover:text-blue-900">编辑</button>
                    <button onclick="deleteExpressRule(${rule.id})" class="text-red-600 hover:text-red-900">删除</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载快递规则失败:', error);
    }
}

function showExpressRuleModal(rule = null) {
    // TODO: 实现规则编辑模态框
    showMessage('规则编辑功能开发中...', 'error');
}

async function deleteExpressRule(ruleId) {
    if (!confirm('确定要删除这个规则吗？')) return;
    
    try {
        const data = await apiRequest(`/api/platform/cainiao/rules/${ruleId}`, { method: 'DELETE' });
        if (data.success) {
            showMessage('规则已删除');
            loadExpressRules();
        } else {
            showMessage(data.message || '删除失败', 'error');
        }
    } catch (error) {
        showMessage('删除失败: ' + error.message, 'error');
    }
}

// ==================== 物流控制台 - 快递订单 ====================

let expressOrdersPage = 1;

async function loadExpressOrders(page = 1) {
    expressOrdersPage = page;
    const status = document.getElementById('orderStatusFilter')?.value || '';
    const cpCode = document.getElementById('orderCpFilter')?.value || '';
    const search = document.getElementById('orderSearchInput')?.value || '';
    
    try {
        const params = new URLSearchParams({ page, page_size: 20 });
        if (status) params.append('status', status);
        if (cpCode) params.append('cp_code', cpCode);
        if (search) params.append('search', search);
        
        const data = await apiRequest(`/api/platform/cainiao/orders?${params}`);
        const tbody = document.getElementById('expressOrdersTable');
        
        if (!data.success || !data.data.items.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">暂无订单数据</td></tr>';
            return;
        }
        
        const statusLabels = {
            'created': { text: '已创建', class: 'bg-gray-100 text-gray-800' },
            'waybill_created': { text: '已获取面单', class: 'bg-blue-100 text-blue-800' },
            'dispatched': { text: '已派单', class: 'bg-yellow-100 text-yellow-800' },
            'picked': { text: '已取件', class: 'bg-indigo-100 text-indigo-800' },
            'in_transit': { text: '运输中', class: 'bg-purple-100 text-purple-800' },
            'delivering': { text: '派送中', class: 'bg-cyan-100 text-cyan-800' },
            'signed': { text: '已签收', class: 'bg-green-100 text-green-800' },
            'rejected': { text: '已拒收', class: 'bg-orange-100 text-orange-800' },
            'exception': { text: '异常', class: 'bg-red-100 text-red-800' },
            'cancelled': { text: '已取消', class: 'bg-gray-100 text-gray-500' }
        };
        
        tbody.innerHTML = data.data.items.map(order => {
            const statusInfo = statusLabels[order.status] || { text: order.status, class: 'bg-gray-100' };
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-sm">
                        <div class="font-medium text-gray-900">${order.waybill_no || order.mail_no || '-'}</div>
                        <div class="text-xs text-gray-400">ID: ${order.id}</div>
                    </td>
                    <td class="px-4 py-3 text-sm">
                        <div>${escapeHtml(order.sender_name)}</div>
                        <div class="text-xs text-gray-400">${order.sender_phone}</div>
                    </td>
                    <td class="px-4 py-3 text-sm">
                        <div>${escapeHtml(order.receiver_name)}</div>
                        <div class="text-xs text-gray-400">${order.receiver_phone}</div>
                    </td>
                    <td class="px-4 py-3 text-sm">
                        <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">${order.cp_code}</span>
                    </td>
                    <td class="px-4 py-3">
                        <span class="px-2 py-1 rounded text-xs ${statusInfo.class}">${statusInfo.text}</span>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500">${formatDateTime(order.created_at)}</td>
                    <td class="px-4 py-3 text-sm space-x-1">
                        <button onclick="viewExpressOrder(${order.id})" class="text-indigo-600 hover:text-indigo-900">查看</button>
                        ${['created', 'waybill_created'].includes(order.status) ? 
                            `<button onclick="cancelExpressOrder(${order.id})" class="text-red-600 hover:text-red-900">取消</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
        
        // 渲染分页
        renderLogisticsPagination('expressOrdersPagination', data.data, 'loadExpressOrders');
    } catch (error) {
        console.error('加载快递订单失败:', error);
    }
}

function showCreateOrderModal() {
    // TODO: 实现创建订单模态框
    showMessage('创建订单功能开发中...', 'error');
}

async function viewExpressOrder(orderId) {
    try {
        const data = await apiRequest(`/api/platform/cainiao/orders/${orderId}`);
        if (data.success) {
            const order = data.data;
            alert(`订单详情

ID: ${order.id}
面单号: ${order.waybill_no || '-'}
运单号: ${order.mail_no || '-'}
状态: ${order.status}

寄件人: ${order.sender_name} ${order.sender_phone}
收件人: ${order.receiver_name} ${order.receiver_phone}

物品: ${order.goods_name || '-'}
备注: ${order.remark || '-'}`);
        }
    } catch (error) {
        showMessage('获取订单详情失败', 'error');
    }
}

async function cancelExpressOrder(orderId) {
    const reason = prompt('请输入取消原因:');
    if (reason === null) return;
    
    try {
        const data = await apiRequest(`/api/platform/cainiao/orders/${orderId}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
        
        if (data.success) {
            showMessage('订单已取消');
            loadExpressOrders(expressOrdersPage);
        } else {
            showMessage(data.message || '取消失败', 'error');
        }
    } catch (error) {
        showMessage('取消失败: ' + error.message, 'error');
    }
}

// ==================== 物流控制台 - 租户配额 ====================

async function loadTenantQuotas() {
    try {
        const data = await apiRequest('/api/platform/cainiao/quotas');
        const tbody = document.getElementById('tenantQuotasTable');
        
        if (!data.success || !data.data.items.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">暂无配额数据</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.data.items.map(quota => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <div class="text-sm font-medium text-gray-900">${escapeHtml(quota.company_name || quota.tenant_name || '-')}</div>
                    <div class="text-xs text-gray-400">ID: ${quota.tenant_id}</div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">${quota.monthly_free_quota} 单/月</td>
                <td class="px-6 py-4 text-sm">
                    <span class="${quota.monthly_used >= quota.monthly_free_quota ? 'text-red-600 font-medium' : 'text-gray-600'}">
                        ${quota.monthly_used} / ${quota.monthly_free_quota}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">
                    ${quota.overage_enabled ? 
                        `<span class="text-green-600">允许超额 ¥${quota.overage_price}/单</span>` : 
                        '<span class="text-gray-400">不允许超额</span>'}
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded text-xs ${quota.status === 'enabled' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}">
                        ${quota.status === 'enabled' ? '启用' : '禁用'}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm space-x-2">
                    <button onclick="editTenantQuota(${quota.id}, ${quota.tenant_id})" class="text-blue-600 hover:text-blue-900">编辑</button>
                    <button onclick="deleteTenantQuota(${quota.id})" class="text-red-600 hover:text-red-900">删除</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载租户配额失败:', error);
    }
}

function showQuotaModal() {
    // TODO: 实现配额编辑模态框
    showMessage('配额编辑功能开发中...', 'error');
}

async function deleteTenantQuota(quotaId) {
    if (!confirm('确定要删除这个配额配置吗？')) return;
    
    try {
        const data = await apiRequest(`/api/platform/cainiao/quotas/${quotaId}`, { method: 'DELETE' });
        if (data.success) {
            showMessage('配额已删除');
            loadTenantQuotas();
        } else {
            showMessage(data.message || '删除失败', 'error');
        }
    } catch (error) {
        showMessage('删除失败: ' + error.message, 'error');
    }
}

// ==================== 物流控制台 - 调用日志 ====================

let cainiaoLogsPage = 1;

async function loadCainiaoLogs(page = 1) {
    cainiaoLogsPage = page;
    const apiMethod = document.getElementById('logApiFilter')?.value || '';
    const success = document.getElementById('logSuccessFilter')?.value || '';
    
    try {
        const params = new URLSearchParams({ page, page_size: 20 });
        if (apiMethod) params.append('api_method', apiMethod);
        if (success !== '') params.append('success', success);
        
        const data = await apiRequest(`/api/platform/cainiao/logs?${params}`);
        const tbody = document.getElementById('cainiaoLogsTable');
        
        if (!data.success || !data.data.items.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">暂无日志数据</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.data.items.map(log => `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-600">${formatDateTime(log.request_time)}</td>
                <td class="px-4 py-3 text-sm">
                    <span class="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">${log.api_method}</span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">${log.duration_ms}ms</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded text-xs ${log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${log.success ? '成功' : '失败'}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title="${escapeHtml(log.response_msg || '')}">
                    ${escapeHtml(log.response_msg || '-')}
                </td>
                <td class="px-4 py-3 text-sm">
                    <button onclick="viewLogDetail(${log.id})" class="text-indigo-600 hover:text-indigo-900">详情</button>
                </td>
            </tr>
        `).join('');
        
        renderLogisticsPagination('cainiaoLogsPagination', data.data, 'loadCainiaoLogs');
    } catch (error) {
        console.error('加载调用日志失败:', error);
    }
}

async function viewLogDetail(logId) {
    try {
        const data = await apiRequest(`/api/platform/cainiao/logs/${logId}`);
        if (data.success) {
            const log = data.data;
            alert(`日志详情

API: ${log.api_method}
请求ID: ${log.request_id || '-'}
耗时: ${log.duration_ms}ms
状态: ${log.success ? '成功' : '失败'}

响应码: ${log.response_code || '-'}
响应消息: ${log.response_msg || '-'}

关联订单: ${log.order_id || '-'}
关联租户: ${log.tenant_id || '-'}`);
        }
    } catch (error) {
        showMessage('获取日志详情失败', 'error');
    }
}

// ==================== 物流控制台 - 分页 ====================

function renderLogisticsPagination(containerId, pageData, loadFn) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const { page, total_pages } = pageData;
    
    container.innerHTML = `
        <button onclick="${loadFn}(${page - 1})" 
                ${page <= 1 ? 'disabled' : ''} 
                class="px-4 py-2 border rounded ${page <= 1 ? 'bg-gray-100 text-gray-400' : 'hover:bg-gray-50'}">
            上一页
        </button>
        <span class="px-4 py-2">第 ${page} / ${total_pages} 页</span>
        <button onclick="${loadFn}(${page + 1})" 
                ${page >= total_pages ? 'disabled' : ''} 
                class="px-4 py-2 border rounded ${page >= total_pages ? 'bg-gray-100 text-gray-400' : 'hover:bg-gray-50'}">
            下一页
        </button>
    `;
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ==================== 快递100物流服务商配置 ====================

// 加载快递100配置
function loadKuaidi100Config() {
    fetch('/api/platform/kuaidi100/config')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data) {
                const config = data.data;
                document.getElementById('kd100Customer').value = config.customer || '';
                document.getElementById('kd100AuthKey').value = config.auth_key || '';
                document.getElementById('kd100Secret').value = config.secret || '';
                document.getElementById('kd100EndpointUrl').value = config.endpoint_url || 'https://poll.kuaidi100.com';
                document.getElementById('kd100CallbackUrl').value = config.callback_url || '';
                document.getElementById('kd100CallbackSecret').value = config.callback_secret || '';
                
                // 显示测试状态
                if (config.test_passed) {
                    document.getElementById('kd100TestStatus').innerHTML = 
                        '<span class="text-green-600"><i class="fas fa-check-circle"></i> 连接测试已通过</span>';
                } else if (config.test_error) {
                    document.getElementById('kd100TestStatus').innerHTML = 
                        '<span class="text-red-600"><i class="fas fa-times-circle"></i> 测试失败: ' + config.test_error + '</span>';
                }
            }
        })
        .catch(error => {
            console.error('加载快递100配置失败:', error);
        });
}

// 测试快递100连接
function testKuaidi100Connection() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 测试中...';
    
    fetch('/api/platform/kuaidi100/config/test', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showMessage('快递100接口连接成功', 'success');
            document.getElementById('kd100TestStatus').innerHTML = 
                '<span class="text-green-600"><i class="fas fa-check-circle"></i> 连接测试已通过</span>';
        } else {
            showMessage('测试失败: ' + data.message, 'error');
            document.getElementById('kd100TestStatus').innerHTML = 
                '<span class="text-red-600"><i class="fas fa-times-circle"></i> ' + data.message + '</span>';
        }
    })
    .catch(error => {
        showMessage('测试失败: ' + error.message, 'error');
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
    });
}

// 保存快递100配置
function saveKuaidi100Config(event) {
    event.preventDefault();
    
    const customer = document.getElementById('kd100Customer').value.trim();
    const authKey = document.getElementById('kd100AuthKey').value.trim();
    const secret = document.getElementById('kd100Secret').value.trim();
    const endpointUrl = document.getElementById('kd100EndpointUrl').value.trim() || 'https://poll.kuaidi100.com';
    const callbackUrl = document.getElementById('kd100CallbackUrl').value.trim();
    const callbackSecret = document.getElementById('kd100CallbackSecret').value.trim();
    
    if (!customer || !authKey || !secret) {
        showMessage('客户编码、授权Key和签名密钥不能为空', 'error');
        return;
    }
    
    fetch('/api/platform/kuaidi100/config', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            customer,
            auth_key: authKey,
            secret,
            endpoint_url: endpointUrl,
            callback_url: callbackUrl,
            callback_secret: callbackSecret
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showMessage('快递100配置保存成功', 'success');
            loadKuaidi100Config();
        } else {
            showMessage('保存失败: ' + data.message, 'error');
        }
    })
    .catch(error => {
        showMessage('保存失败: ' + error.message, 'error');
    });
}

// 绑定快递100表单提交事件
document.addEventListener('DOMContentLoaded', function() {
    const kuaidi100Form = document.getElementById('kuaidi100ConfigForm');
    if (kuaidi100Form) {
        kuaidi100Form.addEventListener('submit', saveKuaidi100Config);
    }
});

// ==================== 快递100功能操作面板 ====================

// 切换快递100功能标签页
function switchKd100Tab(tabName) {
    // 更新标签样式
    document.querySelectorAll('.kd100-tab').forEach(tab => {
        tab.classList.remove('active', 'border-purple-600', 'text-purple-600');
        tab.classList.add('border-transparent', 'text-gray-600');
    });
    
    const activeTab = document.getElementById(`kd100Tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (activeTab) {
        activeTab.classList.add('active', 'border-purple-600', 'text-purple-600');
        activeTab.classList.remove('border-transparent', 'text-gray-600');
    }
    
    // 切换面板
    document.querySelectorAll('.kd100-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
    
    const activePanel = document.getElementById(`kd100Panel${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (activePanel) {
        activePanel.classList.remove('hidden');
        
        // 如果切换到订单列表，自动加载
        if (tabName === 'list') {
            loadKd100Orders();
        }
    }
}

// 物流查询
function queryKd100Express() {
    const com = document.getElementById('kd100QueryCom').value;
    const num = document.getElementById('kd100QueryNum').value.trim();
    const phone = document.getElementById('kd100QueryPhone').value.trim();
    
    if (!num) {
        showMessage('请输入快递单号', 'error');
        return;
    }
    
    // 顺丰必须提供手机号
    if (com === 'shunfeng' && !phone) {
        showMessage('顺丰快递必须提供手机号后4位', 'error');
        return;
    }
    
    fetch('/api/platform/kuaidi100/query', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ com, num, phone })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.data && data.data.data) {
            displayKd100QueryResult(data.data.data);
            showMessage('查询成功', 'success');
        } else {
            showMessage('查询失败: ' + (data.message || '暂无物流信息'), 'error');
            document.getElementById('kd100QueryResult').classList.add('hidden');
        }
    })
    .catch(error => {
        showMessage('查询失败: ' + error.message, 'error');
    });
}

// 显示物流查询结果
function displayKd100QueryResult(traces) {
    const resultDiv = document.getElementById('kd100QueryResult');
    const timeline = document.getElementById('kd100QueryTimeline');
    
    if (!traces || traces.length === 0) {
        resultDiv.classList.add('hidden');
        showMessage('暂无物流信息', 'error');
        return;
    }
    
    timeline.innerHTML = traces.map((trace, index) => `
        <div class="flex items-start space-x-3 ${index === 0 ? 'text-green-600' : 'text-gray-600'}">
            <div class="flex-shrink-0 w-2 h-2 mt-2 rounded-full ${index === 0 ? 'bg-green-600' : 'bg-gray-400'}"></div>
            <div class="flex-1">
                <div class="text-sm font-medium">${trace.context || '未知'}</div>
                <div class="text-xs text-gray-500 mt-1">${trace.time || ''}</div>
            </div>
        </div>
    `).join('');
    
    resultDiv.classList.remove('hidden');
}

// 电子面单下单表单提交
document.addEventListener('DOMContentLoaded', function() {
    const orderForm = document.getElementById('kd100OrderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createKd100Order();
        });
    }
});

// 创建电子面单订单
function createKd100Order() {
    const formData = {
        kuaidicom: document.getElementById('kd100OrderCom').value,
        cargo: document.getElementById('kd100OrderCargo').value,
        recman_name: document.getElementById('kd100OrderRecName').value.trim(),
        recman_mobile: document.getElementById('kd100OrderRecMobile').value.trim(),
        recman_address: document.getElementById('kd100OrderRecAddress').value.trim(),
        sendman_name: document.getElementById('kd100OrderSendName').value.trim(),
        sendman_mobile: document.getElementById('kd100OrderSendMobile').value.trim(),
        sendman_address: document.getElementById('kd100OrderSendAddress').value.trim()
    };
    
    // 验证必填字段
    if (!formData.recman_name || !formData.recman_mobile || !formData.recman_address ||
        !formData.sendman_name || !formData.sendman_mobile || !formData.sendman_address) {
        showMessage('请填写完整的收寄件人信息', 'error');
        return;
    }
    
    fetch('/api/platform/kuaidi100/order/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showMessage('电子面单创建成功', 'success');
            resetKd100OrderForm();
            switchKd100Tab('list'); // 切换到订单列表
        } else {
            showMessage('创建失败: ' + data.message, 'error');
        }
    })
    .catch(error => {
        showMessage('创建失败: ' + error.message, 'error');
    });
}

// 重置电子面单表单
function resetKd100OrderForm() {
    document.getElementById('kd100OrderForm').reset();
    document.getElementById('kd100OrderCargo').value = '商品';
}

// 加载订单列表
function loadKd100Orders(page = 1) {
    fetch(`/api/platform/kuaidi100/orders?page=${page}&page_size=20`)
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayKd100Orders(data.data.orders);
            displayKd100Pagination(data.data.page, data.data.total, data.data.page_size);
        } else {
            showMessage('加载订单失败: ' + data.message, 'error');
        }
    })
    .catch(error => {
        showMessage('加载订单失败: ' + error.message, 'error');
    });
}

// 显示订单列表
function displayKd100Orders(orders) {
    const tbody = document.getElementById('kd100OrderTableBody');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-500">暂无订单数据</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.map(order => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-sm text-gray-900">${order.order_id || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${getExpressName(order.kuaidicom)}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${order.waybill_no || '待生成'}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${order.recman_name}</td>
            <td class="px-4 py-3 text-sm">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(order.status)}">
                    ${getStatusText(order.status)}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">${formatDateTime(order.created_at)}</td>
        </tr>
    `).join('');
}

// 显示分页
function displayKd100Pagination(currentPage, total, pageSize) {
    const totalPages = Math.ceil(total / pageSize);
    const pagination = document.getElementById('kd100OrderPagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            html += `<button class="px-3 py-1 bg-purple-600 text-white rounded">${i}</button>`;
        } else {
            html += `<button onclick="loadKd100Orders(${i})" class="px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">${i}</button>`;
        }
    }
    pagination.innerHTML = html;
}

// 获取快递公司名称
function getExpressName(code) {
    const names = {
        'yuantong': '圆通速递',
        'shunfeng': '顺丰速运',
        'zhongtong': '中通快递',
        'shentong': '申通快递',
        'yunda': '韵达快递',
        'jtexpress': '极兔速递',
        'jd': '京东物流',
        'ems': '邮政EMS'
    };
    return names[code] || code;
}

// 获取状态文本
function getStatusText(status) {
    const texts = {
        'created': '已创建',
        'unused': '未使用',
        'used': '已使用',
        'invalid': '已失效'
    };
    return texts[status] || status;
}

// 获取状态徽章样式
function getStatusBadgeClass(status) {
    const classes = {
        'created': 'bg-blue-100 text-blue-800',
        'unused': 'bg-green-100 text-green-800',
        'used': 'bg-gray-100 text-gray-800',
        'invalid': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
}

// 格式化日期时间
function formatDateTime(datetime) {
    if (!datetime) return '-';
    const date = new Date(datetime);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ==================== 菜鸟ISV多租户完整功能 ====================

// 全局变量存储当前选中的租户ID
let currentCainiaoTenantId = null;

// 1. 加载ISV配置
async function loadCainiaoISVConfig() {
    try {
        const result = await apiRequest('/api/cainiao_isv/config');
        if (result.success && result.data) {
            document.getElementById('cnIsvAppKey').value = result.data.app_key || '';
            document.getElementById('cnIsvAppSecret').value = result.data.app_secret || '';
            document.getElementById('cnCallbackUrl').value = result.data.callback_url || '';
            document.getElementById('cnEnv').value = result.data.env || 'prod';
        }
    } catch (error) {
        console.error('加载ISV配置失败', error);
    }
}

// 2. 保存ISV配置
document.getElementById('cainiaoISVConfigForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        app_key: document.getElementById('cnIsvAppKey').value.trim(),
        app_secret: document.getElementById('cnIsvAppSecret').value.trim(),
        callback_url: document.getElementById('cnCallbackUrl').value.trim(),
        env: document.getElementById('cnEnv').value
    };
    
    if (!data.app_key || !data.app_secret) {
        showMessage('AppKey和AppSecret不能为空', 'error');
        return;
    }
    
    try {
        const result = await apiRequest('/api/cainiao_isv/config', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (result.success) {
            showMessage('ISV配置保存成功');
        } else {
            showMessage(result.message || '保存失败', 'error');
        }
    } catch (error) {
        showMessage('保存失败：' + error.message, 'error');
    }
});

// 3. 加载租户列表
async function loadCainiaoTenants() {
    try {
        const result = await apiRequest('/api/cainiao_isv/tenants');
        const listEl = document.getElementById('tenantList');
        
        if (result.success && result.data && result.data.length > 0) {
            listEl.innerHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">租户名称</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">联系人</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">联系电话</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${result.data.map(tenant => `
                            <tr class="${currentCainiaoTenantId === tenant.id ? 'bg-purple-50' : ''}">
                                <td class="px-4 py-3 text-sm font-medium text-gray-900">${tenant.tenant_name}</td>
                                <td class="px-4 py-3 text-sm text-gray-700">${tenant.contact || '-'}</td>
                                <td class="px-4 py-3 text-sm text-gray-700">${tenant.phone || '-'}</td>
                                <td class="px-4 py-3 text-sm">
                                    <span class="px-2 py-1 text-xs rounded ${tenant.status === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        ${tenant.status === 1 ? '正常' : '禁用'}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-sm">
                                    <button onclick="selectCainiaoTenant(${tenant.id}, '${tenant.tenant_name}')" class="text-purple-600 hover:text-purple-800 mr-2">
                                        选择
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            listEl.innerHTML = '<div class="text-center text-gray-500 py-8">暂无租户数据</div>';
        }
    } catch (error) {
        console.error('加载租户列表失败', error);
    }
}

// 4. 选择租户
function selectCainiaoTenant(tenantId, tenantName) {
    currentCainiaoTenantId = tenantId;
    document.getElementById('currentTenantName').textContent = tenantName;
    showMessage(`已选择租户：${tenantName}`);
    
    // 重新加载相关数据
    loadCainiaoWarehouses();
    loadCainiaoLogisticsAccounts();
    loadCainiaoTenants(); // 刷新列表高亮
}

// 5. 打开创建租户模态框
function openCreateTenantModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 class="text-lg font-bold mb-4">新增租户</h3>
            <form id="createTenantForm">
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">租户名称 <span class="text-red-500">*</span></label>
                        <input type="text" id="newTenantName" class="w-full px-3 py-2 border rounded" required>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">联系人</label>
                        <input type="text" id="newTenantContact" class="w-full px-3 py-2 border rounded">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">联系电话</label>
                        <input type="text" id="newTenantPhone" class="w-full px-3 py-2 border rounded">
                    </div>
                </div>
                <div class="flex justify-end space-x-3 mt-6">
                    <button type="button" onclick="this.closest('.fixed').remove()" class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">取消</button>
                    <button type="submit" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">创建</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('createTenantForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            tenant_name: document.getElementById('newTenantName').value.trim(),
            contact: document.getElementById('newTenantContact').value.trim(),
            phone: document.getElementById('newTenantPhone').value.trim()
        };
        
        try {
            const result = await apiRequest('/api/cainiao_isv/tenant', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            if (result.success) {
                showMessage('租户创建成功');
                modal.remove();
                loadCainiaoTenants();
            } else {
                showMessage(result.message || '创建失败', 'error');
            }
        } catch (error) {
            showMessage('创建失败：' + error.message, 'error');
        }
    });
}

// 6. 加载仓库列表
async function loadCainiaoWarehouses() {
    if (!currentCainiaoTenantId) {
        document.getElementById('warehouseList').innerHTML = '<div class="text-center text-gray-500 py-8">请先选择租户</div>';
        return;
    }
    
    try {
        // 模拟租户session
        const result = await apiRequest('/api/cainiao_isv/warehouses');
        const listEl = document.getElementById('warehouseList');
        
        if (result.success && result.data && result.data.length > 0) {
            listEl.innerHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">仓库名称</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">联系人</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">地址</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">默认</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${result.data.map(wh => `
                            <tr>
                                <td class="px-4 py-3 text-sm">${wh.warehouse_name}</td>
                                <td class="px-4 py-3 text-sm">${wh.contact || '-'}</td>
                                <td class="px-4 py-3 text-sm">${wh.address || '-'}</td>
                                <td class="px-4 py-3 text-sm">${wh.is_default ? '✅' : ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            listEl.innerHTML = '<div class="text-center text-gray-500 py-8">暂无仓库数据</div>';
        }
    } catch (error) {
        console.error('加载仓库列表失败', error);
    }
}

// 7. 打开创建仓库模态框
function openCreateWarehouseModal() {
    if (!currentCainiaoTenantId) {
        showMessage('请先选择租户', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 class="text-lg font-bold mb-4">新增仓库</h3>
            <form id="createWarehouseForm">
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">仓库名称 <span class="text-red-500">*</span></label>
                        <input type="text" id="newWarehouseName" class="w-full px-3 py-2 border rounded" required>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">联系人</label>
                        <input type="text" id="newWarehouseContact" class="w-full px-3 py-2 border rounded">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">地址</label>
                        <input type="text" id="newWarehouseAddress" class="w-full px-3 py-2 border rounded">
                    </div>
                </div>
                <div class="flex justify-end space-x-3 mt-6">
                    <button type="button" onclick="this.closest('.fixed').remove()" class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">取消</button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">创建</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('createWarehouseForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            warehouse_name: document.getElementById('newWarehouseName').value.trim(),
            contact: document.getElementById('newWarehouseContact').value.trim(),
            address: document.getElementById('newWarehouseAddress').value.trim()
        };
        
        try {
            const result = await apiRequest('/api/cainiao_isv/warehouse', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            if (result.success) {
                showMessage('仓库创建成功');
                modal.remove();
                loadCainiaoWarehouses();
            } else {
                showMessage(result.message || '创建失败', 'error');
            }
        } catch (error) {
            showMessage('创建失败：' + error.message, 'error');
        }
    });
}

// 8. 加载物流账号列表（多网点）
async function loadCainiaoLogisticsAccounts() {
    if (!currentCainiaoTenantId) {
        document.getElementById('logisticsAccountList').innerHTML = '<div class="text-center text-gray-500 py-8">请先选择租户</div>';
        return;
    }
    
    try {
        const result = await apiRequest('/api/cainiao_isv/logistics_accounts');
        const listEl = document.getElementById('logisticsAccountList');
        
        if (result.success && result.data && result.data.length > 0) {
            listEl.innerHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">快递公司</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">网点/分部</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">客户编码</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">仓库</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">状态</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">操作</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${result.data.map(acc => `
                            <tr>
                                <td class="px-4 py-3 text-sm font-medium">${acc.cp_name} (${acc.cp_code})</td>
                                <td class="px-4 py-3 text-sm">${acc.branch_name || '-'}</td>
                                <td class="px-4 py-3 text-sm">${acc.partner_id || '-'}</td>
                                <td class="px-4 py-3 text-sm">${acc.warehouse_name || '-'}</td>
                                <td class="px-4 py-3 text-sm">
                                    <span class="px-2 py-1 text-xs rounded ${acc.status === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        ${acc.status === 1 ? '启用' : '禁用'}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-sm">
                                    <button onclick="getCainiaoAuthUrl(${acc.id})" class="text-blue-600 hover:text-blue-800">授权</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            // 同时更新下单表单的物流账号选项
            updateLogisticsAccountOptions(result.data);
        } else {
            listEl.innerHTML = '<div class="text-center text-gray-500 py-8">暂无物流账号</div>';
        }
    } catch (error) {
        console.error('加载物流账号列表失败', error);
    }
}

// 更新下单表单的物流账号选项
function updateLogisticsAccountOptions(accounts) {
    const select = document.getElementById('cnLogisticsAccount');
    if (select) {
        select.innerHTML = '<option value="">请选择物流账号（含网点）</option>' +
            accounts.map(acc => `
                <option value="${acc.id}">
                    ${acc.cp_name} - ${acc.branch_name || '默认网点'}
                </option>
            `).join('');
    }
}

// 9. 打开创建物流账号模态框
function openCreateLogisticsAccountModal() {
    if (!currentCainiaoTenantId) {
        showMessage('请先选择租户', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-lg w-full max-h-screen overflow-y-auto">
            <h3 class="text-lg font-bold mb-4">新增物流账号（支持多网点）</h3>
            <form id="createLogisticsAccountForm">
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">快递公司 <span class="text-red-500">*</span></label>
                        <select id="newCpCode" class="w-full px-3 py-2 border rounded" required>
                            <option value="">请选择</option>
                            <option value="ZTO">中通快递 (ZTO)</option>
                            <option value="YTO">圆通速递 (YTO)</option>
                            <option value="YD">韵达速递 (YD)</option>
                            <option value="SF">顺丰速运 (SF)</option>
                            <option value="STO">申通快递 (STO)</option>
                            <option value="HTKY">百世快递 (HTKY)</option>
                            <option value="JD">京东物流 (JD)</option>
                            <option value="EMS">EMS (EMS)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">快递名称 <span class="text-red-500">*</span></label>
                        <input type="text" id="newCpName" class="w-full px-3 py-2 border rounded" placeholder="如：中通快递" required>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">网点/分部名称</label>
                        <input type="text" id="newBranchName" class="w-full px-3 py-2 border rounded" placeholder="如：北京一部、上海分公司">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">客户编码</label>
                        <input type="text" id="newPartnerId" class="w-full px-3 py-2 border rounded">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">账号</label>
                        <input type="text" id="newAccount" class="w-full px-3 py-2 border rounded">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">密码/密钥</label>
                        <input type="password" id="newPassword" class="w-full px-3 py-2 border rounded">
                    </div>
                </div>
                <div class="flex justify-end space-x-3 mt-6">
                    <button type="button" onclick="this.closest('.fixed').remove()" class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">取消</button>
                    <button type="submit" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded">创建</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('createLogisticsAccountForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            cp_code: document.getElementById('newCpCode').value,
            cp_name: document.getElementById('newCpName').value.trim(),
            branch_name: document.getElementById('newBranchName').value.trim(),
            partner_id: document.getElementById('newPartnerId').value.trim(),
            account: document.getElementById('newAccount').value.trim(),
            password: document.getElementById('newPassword').value.trim()
        };
        
        try {
            const result = await apiRequest('/api/cainiao_isv/logistics_account', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            if (result.success) {
                showMessage('物流账号创建成功');
                modal.remove();
                loadCainiaoLogisticsAccounts();
            } else {
                showMessage(result.message || '创建失败', 'error');
            }
        } catch (error) {
            showMessage('创建失败：' + error.message, 'error');
        }
    });
}

// 10. 获取授权链接
async function getCainiaoAuthUrl(accountId) {
    try {
        const result = await apiRequest('/api/cainiao_isv/auth/url', {
            method: 'POST',
            body: JSON.stringify({ account_id: accountId })
        });
        
        if (result.success && result.data.auth_url) {
            window.open(result.data.auth_url, '_blank');
            showMessage('已打开授权页面，请完成授权');
        } else {
            showMessage(result.message || '获取授权链接失败', 'error');
        }
    } catch (error) {
        showMessage('获取授权链接失败：' + error.message, 'error');
    }
}

// 11. 切换功能标签页
function switchCainiaoTab(tabName) {
    // 更新标签按钮样式
    document.querySelectorAll('.cn-tab-btn').forEach(btn => {
        btn.className = 'cn-tab-btn px-4 py-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700';
    });
    event.target.className = 'cn-tab-btn px-4 py-2 border-b-2 border-purple-600 text-purple-600 font-medium';
    
    // 切换面板
    document.querySelectorAll('.cn-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
    document.getElementById(`cnPanel${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.remove('hidden');
}

// 12. 订单下单（获取面单）
document.getElementById('cainiaoOrderForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentCainiaoTenantId) {
        showMessage('请先选择租户', 'error');
        return;
    }
    
    const data = {
        order_no: document.getElementById('cnOrderNo').value.trim(),
        logistics_account_id: document.getElementById('cnLogisticsAccount').value,
        receiver_name: document.getElementById('cnReceiverName').value.trim(),
        receiver_phone: document.getElementById('cnReceiverPhone').value.trim(),
        receiver_address: document.getElementById('cnReceiverAddress').value.trim(),
        sender_name: document.getElementById('cnSenderName').value.trim(),
        sender_phone: document.getElementById('cnSenderPhone').value.trim(),
        sender_address: document.getElementById('cnSenderAddress').value.trim()
    };
    
    try {
        const result = await apiRequest('/api/cainiao_isv/waybill/get', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (result.success) {
            showMessage('面单获取成功！运单号：' + result.data.waybill_code);
            e.target.reset();
            
            // 询问是否立即打印
            if (confirm('面单已获取，是否立即打印？')) {
                printCainiaoWaybill(result.data.waybill_id);
            }
        } else {
            showMessage(result.message || '获取面单失败', 'error');
        }
    } catch (error) {
        showMessage('获取面单失败：' + error.message, 'error');
    }
});

// 13. 加载面单列表
async function loadCainiaoWaybills() {
    if (!currentCainiaoTenantId) {
        return;
    }
    
    const printStatus = document.getElementById('cnFilterPrintStatus')?.value;
    
    try {
        const result = await apiRequest(`/api/cainiao_isv/waybills?print_status=${printStatus || ''}`);
        const listEl = document.getElementById('cainiaoWaybillList');
        
        if (result.success && result.data && result.data.list.length > 0) {
            listEl.innerHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">订单号</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">运单号</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">快递公司</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">收件人</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">打印状态</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">操作</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${result.data.list.map(wb => `
                            <tr>
                                <td class="px-4 py-3 text-sm">${wb.order_no}</td>
                                <td class="px-4 py-3 text-sm font-mono">${wb.waybill_code || '-'}</td>
                                <td class="px-4 py-3 text-sm">${wb.cp_name || wb.cp_code}</td>
                                <td class="px-4 py-3 text-sm">${wb.receiver_name}</td>
                                <td class="px-4 py-3 text-sm">
                                    <span class="px-2 py-1 text-xs rounded ${
                                        wb.print_status === 0 ? 'bg-gray-100 text-gray-800' :
                                        wb.print_status === 1 ? 'bg-green-100 text-green-800' :
                                        'bg-red-100 text-red-800'
                                    }">
                                        ${wb.print_status === 0 ? '未打印' : wb.print_status === 1 ? '已打印' : '打印失败'}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-sm space-x-2">
                                    <button onclick="printCainiaoWaybill(${wb.id})" class="text-blue-600 hover:text-blue-800">打印</button>
                                    ${wb.cancel_status === 0 ? `<button onclick="cancelCainiaoWaybill(${wb.id})" class="text-red-600 hover:text-red-800">取消</button>` : ''}
                                    ${wb.confirm_status === 0 ? `<button onclick="confirmCainiaoShipment(${wb.id})" class="text-green-600 hover:text-green-800">发货</button>` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            listEl.innerHTML = '<div class="text-center text-gray-500 py-8">暂无面单数据</div>';
        }
    } catch (error) {
        console.error('加载面单列表失败', error);
    }
}

// 14. 打印面单（单个）
async function printCainiaoWaybill(waybillId) {
    try {
        const result = await apiRequest('/api/cainiao_isv/print/single', {
            method: 'POST',
            body: JSON.stringify({ waybill_id: waybillId })
        });
        
        if (result.success) {
            // 这里应调用本地打印组件
            // ws://localhost:13000
            showMessage('打印任务已发送');
            loadCainiaoWaybills(); // 刷新列表
        } else {
            showMessage(result.message || '打印失败', 'error');
        }
    } catch (error) {
        showMessage('打印失败：' + error.message, 'error');
    }
}

// 15. 取消面单
async function cancelCainiaoWaybill(waybillId) {
    if (!confirm('确认取消该面单吗？取消后运单号将被回收。')) {
        return;
    }
    
    const reason = prompt('请输入取消原因（可选）：');
    
    try {
        const result = await apiRequest(`/api/cainiao_isv/waybill/cancel/${waybillId}`, {
            method: 'POST',
            body: JSON.stringify({ cancel_reason: reason || '' })
        });
        
        if (result.success) {
            showMessage('面单已取消');
            loadCainiaoWaybills();
        } else {
            showMessage(result.message || '取消失败', 'error');
        }
    } catch (error) {
        showMessage('取消失败：' + error.message, 'error');
    }
}

// 16. 确认发货
async function confirmCainiaoShipment(waybillId) {
    if (!confirm('确认已发货吗？')) {
        return;
    }
    
    try {
        const result = await apiRequest(`/api/cainiao_isv/waybill/confirm/${waybillId}`, {
            method: 'POST'
        });
        
        if (result.success) {
            showMessage('发货确认成功');
            loadCainiaoWaybills();
        } else {
            showMessage(result.message || '确认失败', 'error');
        }
    } catch (error) {
        showMessage('确认失败：' + error.message, 'error');
    }
}

// 17. 测试打印机连接
function testCainiaoPrinter() {
    try {
        const ws = new WebSocket('ws://localhost:13000');
        
        ws.onopen = () => {
            showMessage('打印机连接正常');
            ws.close();
        };
        
        ws.onerror = () => {
            showMessage('打印机连接失败，请检查打印组件是否运行', 'error');
        };
    } catch (error) {
        showMessage('打印机连接失败：' + error.message, 'error');
    }
}

// ============================================================
// 移动端权限管理功能（M7.2 - 前端界面，后端功能待实现）
// ============================================================

/**
 * 切换公司移动端访问权限
 * @param {number} companyId - 公司ID
 * @param {boolean} enabled - 是否开启
 */
async function toggleMobileAccess(companyId, enabled) {
    try {
        console.log(`[移动端权限] 公司ID: ${companyId}, 状态: ${enabled ? '开启' : '关闭'}`);
        
        // 调用后端API更新companies表的mobile_access字段
        const result = await apiRequest(`/api/admin/companies/${companyId}/mobile_access`, {
            method: 'PUT',
            body: JSON.stringify({ mobile_access: enabled })
        });
        
        // 更新UI显示
        const checkbox = document.querySelector(`input[data-company-id="${companyId}"]`);
        const label = checkbox?.nextElementSibling?.nextElementSibling;
        
        if (label) {
            label.textContent = enabled ? '开启' : '关闭';
        }
        
        // 显示成功提示
        showMessage(result.message || `移动端权限已${enabled ? '开启' : '关闭'}`, 'success');
        
    } catch (error) {
        console.error('[移动端权限错误]', error);
        showMessage('操作失败：' + error.message, 'error');
        
        // 恢复复选框状态
        const checkbox = document.querySelector(`input[data-company-id="${companyId}"]`);
        if (checkbox) {
            checkbox.checked = !enabled;
        }
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    // 如果在菜鸟配置页面，自动加载数据
    if (document.getElementById('cnIsvAppKey')) {
        loadCainiaoISVConfig();
        loadCainiaoTenants();
    }
});

