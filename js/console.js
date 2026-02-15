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
            const adminName = document.querySelector('.text-gray-700');
            if (adminName) {
                adminName.textContent = data.user.name || username;
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
                <td colspan="11" class="px-6 py-8 text-center text-gray-500">
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
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = {
        'companies': document.getElementById('companiesSection'),
        'users': document.getElementById('usersSection'),
        'system': document.getElementById('systemSection')
    };
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.dataset.target;
            
            // 更新导航样式
            navLinks.forEach(l => {
                l.classList.remove('text-purple-600', 'border-purple-200');
                l.classList.add('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            });
            link.classList.remove('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            link.classList.add('text-purple-600', 'border-purple-200');
            
            // 切换内容
            Object.keys(sections).forEach(key => {
                if (sections[key]) {
                    sections[key].classList.add('hidden');
                }
            });
            if (sections[target]) {
                sections[target].classList.remove('hidden');
            }
            
            // 加载对应数据
            if (target === 'companies') {
                loadCompanyData();
            } else if (target === 'users') {
                loadUserData();
            } else if (target === 'system') {
                loadSystemStats();
            }
        });
    });
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
