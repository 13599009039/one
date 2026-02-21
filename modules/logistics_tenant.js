/**
 * 物流管理模块 - 租户端 (logistics_tenant.js)
 * 功能: 物流账号管理、发货地址管理
 * 版本: 2.0.0
 * 对接后端: tenant_logistics_api.py, tenant_warehouse_api.py
 */

// ===================== 物流账号管理 =====================

/**
 * 初始化物流账号管理页面
 */
async function initLogisticsAccountsPage() {
    console.log('[Logistics] 初始化物流账号管理页面');
    await loadExpressCompanies();
    await populateFilterExpressCompanies();
    await loadLogisticsAccounts();
}

/**
 * 加载物流账号列表
 */
async function loadLogisticsAccounts() {
    const container = document.getElementById('logisticsAccountsTableBody');
    if (!container) {
        console.warn('[Logistics] 物流账号表格容器不存在');
        return;
    }
    
    container.innerHTML = `
        <tr>
            <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                <i class="fas fa-spinner fa-spin mr-2"></i>加载中...
            </td>
        </tr>
    `;
    
    try {
        const response = await fetch('/api/tenant/logistics_accounts', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[Logistics] 物流账号列表:', result);
        
        if (result.success && result.data) {
            renderLogisticsAccounts(result.data);
        } else {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-8 text-center text-red-500">
                        ${result.message || '加载失败'}
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('[Logistics] 加载物流账号失败:', error);
        
        let errorMsg = '网络错误，请稍后重试';
        if (error.message.includes('HTTP 404')) {
            errorMsg = '接口不存在';
        } else if (error.message.includes('HTTP 401')) {
            errorMsg = '未登录或登录已过期';
        } else if (error.message.includes('HTTP 403')) {
            errorMsg = '无权访问';
        }
        
        container.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center">
                    <div class="text-red-500 mb-2">
                        <i class="fas fa-exclamation-circle mr-2"></i>${errorMsg}
                    </div>
                    <button onclick="loadLogisticsAccounts()" 
                            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        <i class="fas fa-redo mr-1"></i>重试
                    </button>
                </td>
            </tr>
        `;
    }
}

/**
 * 渲染物流账号列表
 */
function renderLogisticsAccounts(accounts) {
    const container = document.getElementById('logisticsAccountsTableBody');
    if (!container) return;
    
    if (!accounts || accounts.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-box-open text-4xl mb-4 text-gray-300"></i>
                    <p>暂无物流账号</p>
                    <button onclick="openAddLogisticsAccountModal()" 
                            class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>添加物流账号
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = accounts.map(account => {
        // 授权状态映射（兼容字符串和数字）
        const authStatusMap = {
            // 数字格式
            0: { label: '未授权', class: 'bg-gray-100 text-gray-600' },
            1: { label: '已授权', class: 'bg-green-100 text-green-600' },
            2: { label: '已过期', class: 'bg-red-100 text-red-600' },
            // 字符串格式（兼容旧数据）
            'unauthorized': { label: '未授权', class: 'bg-gray-100 text-gray-600' },
            'authorized': { label: '已授权', class: 'bg-green-100 text-green-600' },
            'expired': { label: '已过期', class: 'bg-red-100 text-red-600' }
        };
        
        const statusInfo = authStatusMap[account.auth_status] || authStatusMap[0];
        const isEnabled = account.status === 1;
        
        // 判断是否已授权（兼容数字和字符串）
        const isAuthorized = account.auth_status === 1 || account.auth_status === '1' || account.auth_status === 'authorized';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3">
                    <div class="font-medium text-gray-800">${account.account_name || account.branch_name || '-'}</div>
                    ${account.is_default === 1 ? '<span class="text-xs text-blue-600">默认</span>' : ''}
                </td>
                <td class="px-4 py-3">
                    <div class="text-sm text-gray-800">${account.cp_name || '-'}</div>
                    <div class="text-xs text-gray-400">${account.cp_code || ''}</div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${account.branch_code || account.site_code || '-'}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${account.customer_code || account.partner_id || '-'}
                </td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 text-xs rounded-full ${statusInfo.class}">
                        ${statusInfo.label}
                    </span>
                </td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 text-xs rounded-full ${isEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}">
                        ${isEnabled ? '已启用' : '已禁用'}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-400">
                    ${account.created_at ? new Date(account.created_at).toLocaleString('zh-CN') : '-'}
                </td>
                <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end space-x-2">
                        ${!isAuthorized ? `
                            <button onclick="authorizeLogisticsAccount(${account.id}, '${account.cp_code}')" 
                                    class="text-blue-600 hover:text-blue-800 text-sm" title="授权">
                                <i class="fas fa-key"></i>
                            </button>
                        ` : `
                            <button onclick="testLogisticsAccount(${account.id})" 
                                    class="text-purple-600 hover:text-purple-800 text-sm" title="测试连接">
                                <i class="fas fa-plug"></i>
                            </button>
                        `}
                        <button onclick="editLogisticsAccount(${account.id})" 
                                class="text-green-600 hover:text-green-800 text-sm" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteLogisticsAccount(${account.id})" 
                                class="text-red-600 hover:text-red-800 text-sm" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * 加载快递公司列表
 */
async function loadExpressCompanies() {
    try {
        const response = await fetch('/api/tenant/express_companies', {
            credentials: 'include'
        });
        
        if (!response.ok) return;
        
        const result = await response.json();
        
        if (result.success && result.data) {
            window._expressCompanies = result.data;
            console.log('[Logistics] 快递公司列表已加载:', result.data.length);
        }
    } catch (error) {
        console.error('[Logistics] 加载快递公司列表失败:', error);
    }
}

/**
 * 填充筛选下拉框的快递公司列表
 */
function populateFilterExpressCompanies() {
    const filterSelect = document.getElementById('expressCompanyFilter');
    if (!filterSelect) return;
    
    const companies = window._expressCompanies || [];
    
    filterSelect.innerHTML = '<option value="">全部</option>' + 
        companies.map(company => `
            <option value="${company.code}">${company.name}</option>
        `).join('');
}

/**
 * 授权物流账号（支持菜鸟OAuth授权）
 */
async function authorizeLogisticsAccount(accountId, cpCode) {
    try {
        console.log('[Logistics] 开始授权流程:', accountId, cpCode);
        
        // 如果是菜鸟，调用菜鸚ISV授权接口
        if (cpCode === 'CAINIAO') {
            const response = await fetch('/api/cainiao_isv/auth/url', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    account_id: accountId
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data.auth_url) {
                // 打开菜鸟授权页面（新窗口）
                const authWindow = window.open(
                    result.data.auth_url, 
                    'cainiao_auth', 
                    'width=800,height=600,left=200,top=100'
                );
                
                if (!authWindow) {
                    showNotification('请允许弹窗打开授权页面', 'error');
                    return;
                }
                
                // 监听授权回调消息
                const messageHandler = function(event) {
                    if (event.data.type === 'cainiao_auth_success') {
                        console.log('[Logistics] 收到授权成功消息:', event.data);
                        showNotification('菜鸟授权成功！', 'success');
                        loadLogisticsAccounts(); // 刷新列表
                        window.removeEventListener('message', messageHandler);
                    } else if (event.data.type === 'cainiao_auth_error') {
                        console.error('[Logistics] 授权失败:', event.data.message);
                        showNotification('授权失败: ' + (event.data.message || '未知错误'), 'error');
                        window.removeEventListener('message', messageHandler);
                    }
                };
                
                window.addEventListener('message', messageHandler);
                
                // 10分钟后移除监听器（防止内存泄漏）
                setTimeout(() => {
                    window.removeEventListener('message', messageHandler);
                }, 600000);
                
                showNotification('已打开菜鸟授权页面，请登录并授权', 'info');
            } else {
                showNotification(result.message || '生成授权链接失败', 'error');
            }
        } else {
            // 传统API密钥模式：测试连接
            showNotification('传统API模式不需要授权，请直接使用', 'info');
        }
    } catch (error) {
        console.error('[Logistics] 授权失败:', error);
        showNotification('授权操作失败: ' + error.message, 'error');
    }
}

/**
 * 打开新增物流账号模态框
 */
function openAddLogisticsAccountModal() {
    const modal = document.getElementById('logisticsAccountModal');
    const form = document.getElementById('logisticsAccountForm');
    const title = document.getElementById('logisticsAccountModalTitle');
    
    if (!modal || !form) {
        console.error('[Logistics] 模态框元素不存在');
        return;
    }
    
    // 重置表单
    form.reset();
    document.getElementById('accountId').value = '';
    
    // 设置标题
    if (title) title.textContent = '新增物流账号';
    
    // 加载快递公司列表到下拉框
    populateExpressCompanies();
    
    // 显示模态框
    modal.classList.remove('hidden');
    console.log('[Logistics] 打开新增物流账号模态框');
}

/**
 * 关闭物流账号模态框
 */
function closeLogisticsAccountModal() {
    const modal = document.getElementById('logisticsAccountModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * 填充快递公司下拉框
 */
function populateExpressCompanies() {
    const select = document.getElementById('expressCompanySelect');
    if (!select) return;
    
    const companies = window._expressCompanies || [];
    
    select.innerHTML = '<option value="">请选择快递公司</option>' + 
        companies.map(company => {
            const authTag = company.auth_type === 'oauth' ? ' [授权模式]' : '';
            return `<option value="${company.code}" data-auth-type="${company.auth_type}">${company.name}${authTag}</option>`;
        }).join('');
}

/**
 * 快递公司改变事件处理（切换字段显示）
 */
function onExpressCompanyChange() {
    const select = document.getElementById('expressCompanySelect');
    const selectedOption = select.options[select.selectedIndex];
    const authType = selectedOption?.getAttribute('data-auth-type') || 'api_key';
    
    // 获取元素
    const apiKeyFieldsGroup = document.getElementById('apiKeyFieldsGroup');
    const cainiaoOAuthHint = document.getElementById('cainiaoOAuthHint');
    const authTypeHint = document.getElementById('authTypeHint');
    
    if (authType === 'oauth') {
        // 菜鸟 OAuth 模式：隐藏API密钥字段，显示授权提示
        if (apiKeyFieldsGroup) apiKeyFieldsGroup.style.display = 'none';
        if (cainiaoOAuthHint) cainiaoOAuthHint.style.display = 'block';
        if (authTypeHint) {
            authTypeHint.textContent = 'ISV授权模式，保存后需点击授权按钮';
            authTypeHint.style.display = 'block';
            authTypeHint.className = 'mt-1 text-xs text-blue-600';
        }
        
        // 清空API密钥字段（避免提交无用数据）
        const apiKeyInputs = ['branchCode', 'customerCode', 'apiKey', 'apiSecret'];
        apiKeyInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });
    } else {
        // API密钥模式：显示API密钥字段，隐藏授权提示
        if (apiKeyFieldsGroup) apiKeyFieldsGroup.style.display = 'block';
        if (cainiaoOAuthHint) cainiaoOAuthHint.style.display = 'none';
        if (authTypeHint) {
            authTypeHint.textContent = 'API密钥模式，填写接口密钥后保存';
            authTypeHint.style.display = 'block';
            authTypeHint.className = 'mt-1 text-xs text-gray-500';
        }
    }
    
    console.log('[Logistics] 快递公司切换:', select.value, 'authType:', authType);
}

// 全局导出
 window.onExpressCompanyChange = onExpressCompanyChange;

/**
 * 保存物流账号
 */
async function saveLogisticsAccount() {
    const form = document.getElementById('logisticsAccountForm');
    if (!form) return;
    
    // 验证表单
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // 获取选中的快递公司
    const cpCodeSelect = document.getElementById('expressCompanySelect');
    const cpCode = cpCodeSelect.value;
    const selectedOption = cpCodeSelect.options[cpCodeSelect.selectedIndex];
    const cpName = selectedOption.text.replace(' [授权模式]', ''); // 移除标签
    const authType = selectedOption?.getAttribute('data-auth-type') || 'api_key';
    
    if (!cpCode) {
        showNotification('请选择快递公司', 'error');
        return;
    }
    
    // 收集表单数据（根据授权类型不同）
    const accountId = document.getElementById('accountId').value;
    const accountName = document.getElementById('accountName').value;
    
    const formData = {
        cp_code: cpCode,
        cp_name: cpName,
        account_name: accountName,
        is_default: document.getElementById('isDefault').checked ? 1 : 0
    };
    
    // 如果是API密钥模式，添加额外字段
    if (authType === 'api_key') {
        formData.branch_name = document.getElementById('branchCode').value || '默认网点';
        formData.partner_id = document.getElementById('customerCode').value || '';
        formData.account = document.getElementById('apiKey').value || '';
        formData.password = document.getElementById('apiSecret').value || '';
    } else {
        // OAuth模式：只保存基本信息，授权信息在回调时更新
        formData.branch_name = '默认网点';
        formData.auth_status = 0; // 未授权
        console.log('[Logistics] 菜鸟模式，保存后需进行授权');
    }
    
    try {
        const url = accountId ? 
            `/api/tenant/logistics_accounts/${accountId}` : 
            '/api/tenant/logistics_accounts';
        const method = accountId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(accountId ? '修改成功' : '创建成功', 'success');
            closeLogisticsAccountModal();
            loadLogisticsAccounts();
        } else {
            showNotification(result.message || '保存失败', 'error');
        }
    } catch (error) {
        console.error('[Logistics] 保存失败:', error);
        showNotification('保存操作失败', 'error');
    }
}

/**
 * 测试物流账号连接
 */
async function testLogisticsAccount(accountId) {
    try {
        showNotification('正在测试连接...', 'info');
        
        const response = await fetch(`/api/tenant/logistics_accounts/${accountId}/test`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`测试成功！${result.message || ''}`, 'success');
        } else {
            showNotification(`测试失败: ${result.message || '未知错误'}`, 'error');
        }
    } catch (error) {
        console.error('[Logistics] 测试失败:', error);
        showNotification('测试操作失败', 'error');
    }
}

/**
 * 编辑物流账号
 */
function editLogisticsAccount(accountId) {
    // 查找当前账号数据
    fetch(`/api/tenant/logistics_accounts?account_id=${accountId}`, {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(result => {
        if (result.success && result.data && result.data.length > 0) {
            const account = result.data.find(a => a.id == accountId);
            if (account) {
                // 打开模态框
                const modal = document.getElementById('logisticsAccountModal');
                const title = document.getElementById('logisticsAccountModalTitle');
                
                if (title) title.textContent = '编辑物流账号';
                if (modal) modal.classList.remove('hidden');
                
                // 填充表单（匹配数据库字段）
                document.getElementById('accountId').value = account.id;
                document.getElementById('accountName').value = account.branch_name || '';
                
                // 填充快递公司下拉框
                populateExpressCompanies();
                setTimeout(() => {
                    document.getElementById('expressCompanySelect').value = account.cp_code || '';
                }, 100);
                
                document.getElementById('branchCode').value = account.branch_name || '';
                document.getElementById('customerCode').value = account.partner_id || '';
                document.getElementById('apiKey').value = account.account || '';
                // password 不显示，如需修改用户重新输入
                document.getElementById('apiSecret').value = '';
                document.getElementById('isDefault').checked = account.is_default === 1;
            }
        } else {
            showNotification('账号不存在', 'error');
        }
    })
    .catch(error => {
        console.error('[Logistics] 加载账号信息失败:', error);
        showNotification('加载账号信息失败', 'error');
    });
}

/**
 * 删除物流账号
 */
async function deleteLogisticsAccount(accountId) {
    if (!confirm('确定要删除该物流账号吗？')) return;
    
    try {
        const response = await fetch(`/api/tenant/logistics_accounts/${accountId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('删除成功', 'success');
            loadLogisticsAccounts();
        } else {
            showNotification(result.message || '删除失败', 'error');
        }
    } catch (error) {
        console.error('[Logistics] 删除失败:', error);
        showNotification('删除操作失败', 'error');
    }
}

// ===================== 物流订单管理 =====================

/**
 * 初始化物流订单列表页面
 */
async function initLogisticsOrdersPage() {
    console.log('[Logistics] 初始化物流订单列表页面');
    await loadLogisticsOrders();
}

/**
 * 加载物流订单列表
 */
async function loadLogisticsOrders() {
    const container = document.getElementById('logisticsOrdersTableBody');
    if (!container) {
        console.warn('[Logistics] 物流订单表格容器不存在');
        return;
    }
    
    container.innerHTML = `
        <tr>
            <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                <i class="fas fa-spinner fa-spin mr-2"></i>加载中...
            </td>
        </tr>
    `;
    
    try {
        const response = await fetch('/api/logistics/orders', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[Logistics] 物流订单列表:', result);
        
        if (result.success && result.data) {
            renderLogisticsOrders(result.data);
        } else {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-8 text-center text-red-500">
                        ${result.message || '加载失败'}
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('[Logistics] 加载物流订单失败:', error);
        
        let errorMsg = '网络错误，请稍后重试';
        if (error.message.includes('HTTP 404')) {
            errorMsg = '接口不存在';
        } else if (error.message.includes('HTTP 401')) {
            errorMsg = '未登录或登录已过期';
        } else if (error.message.includes('HTTP 403')) {
            errorMsg = '无权访问';
        }
        
        container.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center">
                    <div class="text-red-500 mb-2">
                        <i class="fas fa-exclamation-circle mr-2"></i>${errorMsg}
                    </div>
                    <button onclick="loadLogisticsOrders()" 
                            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        <i class="fas fa-redo mr-1"></i>重试
                    </button>
                </td>
            </tr>
        `;
    }
}

/**
 * 渲染物流订单列表
 */
function renderLogisticsOrders(orders) {
    const container = document.getElementById('logisticsOrdersTableBody');
    if (!container) return;
    
    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-box-open text-4xl mb-4 text-gray-300"></i>
                    <p>暂无物流订单</p>
                    <p class="text-sm mt-2">创建订单并发货后会自动生成物流订单</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const rows = orders.map(order => {
        const statusClass = getOrderStatusClass(order.status);
        const statusText = getOrderStatusText(order.status);
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${order.order_number || '-'}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    ${order.customer_name || '-'}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    ${order.express_company || '-'}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    ${order.tracking_number || '-'}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    ${formatDate(order.created_at)}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="viewLogisticsOrder(${order.id})" 
                            class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-eye mr-1"></i>查看
                    </button>
                    ${order.tracking_number ? `
                    <button onclick="printWaybill(${order.id})" 
                            class="text-green-600 hover:text-green-900 mr-3">
                        <i class="fas fa-print mr-1"></i>打印
                    </button>
                    ` : ''}
                    <button onclick="cancelLogisticsOrder(${order.id})" 
                            class="text-red-600 hover:text-red-900">
                        <i class="fas fa-times mr-1"></i>取消
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    container.innerHTML = rows;
}

/**
 * 刷新物流订单列表
 */
window.refreshLogisticsOrders = function() {
    loadLogisticsOrders();
    showNotification('订单列表已刷新', 'success');
};

/**
 * 获取订单状态样式类
 */
function getOrderStatusClass(status) {
    const statusMap = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'shipped': 'bg-blue-100 text-blue-800',
        'in_transit': 'bg-purple-100 text-purple-800',
        'delivered': 'bg-green-100 text-green-800',
        'cancelled': 'bg-red-100 text-red-800',
        'exception': 'bg-orange-100 text-orange-800'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
}

/**
 * 获取订单状态文本
 */
function getOrderStatusText(status) {
    const textMap = {
        'pending': '待发货',
        'shipped': '已发货',
        'in_transit': '运输中',
        'delivered': '已签收',
        'cancelled': '已取消',
        'exception': '异常'
    };
    return textMap[status] || '未知';
}

/**
 * 格式化日期
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

/**
 * 批量打印面单
 */
window.openBatchPrintModal = function() {
    showNotification('批量打印功能开发中', 'info');
};

/**
 * 查看物流订单详情
 */
window.viewLogisticsOrder = function(orderId) {
    showNotification(`查看订单 ${orderId} 详情`, 'info');
};

/**
 * 打印运单
 */
window.printWaybill = function(orderId) {
    showNotification(`正在打印订单 ${orderId} 的运单`, 'success');
};

/**
 * 取消物流订单
 */
window.cancelLogisticsOrder = async function(orderId) {
    if (!confirm('确定要取消此物流订单吗？')) return;
    
    try {
        const response = await fetch(`/api/tenant/logistics_orders/${orderId}/cancel`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('订单取消成功', 'success');
            loadLogisticsOrders();
        } else {
            showNotification(result.message || '取消失败', 'error');
        }
    } catch (error) {
        console.error('[Logistics] 取消订单失败:', error);
        showNotification('网络错误，取消失败', 'error');
    }
};

// ===================== 物流配置管理 =====================

/**
 * 初始化物流配置管理页面
 */
async function initLogisticsConfigPage() {
    console.log('[Logistics] 初始化物流配置管理页面');
    await loadLogisticsRules();
}

/**
 * 加载物流规则
 */
async function loadLogisticsRules() {
    const container = document.getElementById('logisticsRulesTableBody');
    if (!container) return;
    
    // 模拟数据
    const rules = [
        {
            id: 1,
            name: '默认快递选择规则',
            condition: '订单金额 >= 100元',
            action: '自动选择顺丰速运',
            status: 'enabled',
            created_at: '2024-01-15 10:30:00'
        }
    ];
    
    renderLogisticsRules(rules);
}

/**
 * 渲染物流规则
 */
function renderLogisticsRules(rules) {
    const container = document.getElementById('logisticsRulesTableBody');
    if (!container) return;
    
    if (!rules || rules.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-info-circle text-blue-500 text-2xl mb-2 block"></i>
                    <p>暂无物流规则，请点击上方"添加物流规则"创建</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const rows = rules.map(rule => {
        const statusClass = rule.status === 'enabled' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
        const statusText = rule.status === 'enabled' ? '已启用' : '已禁用';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${rule.name}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    ${rule.condition}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    ${rule.action}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    ${formatDate(rule.created_at)}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="editLogisticsRule(${rule.id})" 
                            class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-edit mr-1"></i>编辑
                    </button>
                    <button onclick="deleteLogisticsRule(${rule.id})" 
                            class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash mr-1"></i>删除
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    container.innerHTML = rows;
}

/**
 * 添加物流规则
 */
window.openAddLogisticsRuleModal = function() {
    showNotification('添加物流规则功能开发中', 'info');
};

/**
 * 编辑物流规则
 */
window.editLogisticsRule = function(ruleId) {
    showNotification(`编辑规则 ${ruleId}`, 'info');
};

/**
 * 删除物流规则
 */
window.deleteLogisticsRule = function(ruleId) {
    if (!confirm('确定要删除此物流规则吗？')) return;
    showNotification(`删除规则 ${ruleId} 成功`, 'success');
    loadLogisticsRules();
};

/**
 * 显示物流账号配置
 */
window.showLogisticsAccountsConfig = function() {
    // 切换到物流账号管理页面
    window.showPage('logisticsAccounts');
};

/**
 * 显示发货地址配置
 */
window.showWarehousesConfig = function() {
    // 切换到发货地址管理页面
    window.showPage('warehouses');
};

/**
 * 显示模板配置
 */
window.showTemplatesConfig = function() {
    // 切换到面单模板页面
    window.showPage('logisticsTemplates');
};

// ===================== 面单模板管理 =====================

/**
 * 初始化面单模板页面
 */
async function initLogisticsTemplatesPage() {
    console.log('[Logistics] 初始化面单模板页面');
    await loadTemplates();
}

/**
 * 加载模板列表
 */
async function loadTemplates() {
    const container = document.getElementById('templatesTableBody');
    if (!container) return;
    
    // 模拟数据
    const templates = [
        {
            id: 1,
            name: '默认模板',
            express_companies: ['圆通速递', '中通快递', '申通快递'],
            size: '标准A4',
            status: 'enabled',
            is_default: true,
            created_at: '2024-01-01 00:00:00'
        }
    ];
    
    renderTemplates(templates);
}

/**
 * 渲染模板列表
 */
function renderTemplates(templates) {
    const container = document.getElementById('templatesTableBody');
    if (!container) return;
    
    if (!templates || templates.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-info-circle text-blue-500 text-2xl mb-2 block"></i>
                    <p>暂无打印模板，请点击"新增模板"创建</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const rows = templates.map(template => {
        const statusClass = template.status === 'enabled' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
        const statusText = template.status === 'enabled' ? '已启用' : '已禁用';
        const defaultText = template.is_default ? '是' : '否';
        const defaultClass = template.is_default ? 'text-green-600 font-semibold' : 'text-gray-500';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${template.name}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    ${template.express_companies.join(', ')}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    ${template.size}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm ${defaultClass}">
                    ${defaultText}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    ${formatDate(template.created_at)}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="previewTemplate(${template.id})" 
                            class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-eye mr-1"></i>预览
                    </button>
                    <button onclick="editTemplate(${template.id})" 
                            class="text-indigo-600 hover:text-indigo-900 mr-3">
                        <i class="fas fa-edit mr-1"></i>编辑
                    </button>
                    ${!template.is_default ? `
                    <button onclick="setAsDefault(${template.id})" 
                            class="text-green-600 hover:text-green-900 mr-3">
                        <i class="fas fa-check mr-1"></i>设为默认
                    </button>
                    ` : ''}
                    <button onclick="deleteTemplate(${template.id})" 
                            class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash mr-1"></i>删除
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    container.innerHTML = rows;
}

/**
 * 新增模板
 */
window.openAddTemplateModal = function() {
    showNotification('新增模板功能开发中', 'info');
};

/**
 * 预览模板
 */
window.previewTemplate = function(templateId) {
    showNotification(`预览模板 ${templateId}`, 'info');
};

/**
 * 编辑模板
 */
window.editTemplate = function(templateId) {
    showNotification(`编辑模板 ${templateId}`, 'info');
};

/**
 * 设为默认模板
 */
window.setAsDefault = async function(templateId) {
    try {
        showNotification(`模板 ${templateId} 已设为默认`, 'success');
        loadTemplates();
    } catch (error) {
        console.error('[Logistics] 设置默认模板失败:', error);
        showNotification('设置失败', 'error');
    }
};

/**
 * 删除模板
 */
window.deleteTemplate = function(templateId) {
    if (!confirm('确定要删除此模板吗？')) return;
    showNotification(`删除模板 ${templateId} 成功`, 'success');
    loadTemplates();
};

// ===================== 订单模块联动 =====================

/**
 * 初始化订单模块联动页面
 */
async function initOrderLinkagePage() {
    console.log('[OrderLinkage] 初始化订单模块联动页面');
    
    // 绑定配置开关事件
    bindLinkageConfigEvents();
    
    // 加载联动记录
    await loadLinkageRecords();
}

/**
 * 绑定联动配置事件
 */
function bindLinkageConfigEvents() {
    const configs = ['autoFillAddress', 'autoUpdateStatus', 'autoMarkShipped'];
    
    configs.forEach(configId => {
        const checkbox = document.getElementById(configId);
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                saveLinkageConfig(configId, this.checked);
            });
        }
    });
}

/**
 * 保存联动配置
 */
function saveLinkageConfig(configId, value) {
    // 保存到localStorage或发送到后端
    localStorage.setItem(`linkage_${configId}`, value);
    showNotification(`${configId} 配置已保存`, 'success');
}

/**
 * 加载联动记录
 */
async function loadLinkageRecords() {
    const tableBody = document.getElementById('linkageRecordsTable');
    if (!tableBody) return;
    
    try {
        // 模拟加载记录数据
        const records = [
            {
                time: '2024-01-15 14:30:25',
                orderNumber: 'ORD20240115001',
                operation: '自动填充',
                statusChange: '待处理 → 已打印',
                operator: '系统'
            },
            {
                time: '2024-01-15 14:25:10',
                orderNumber: 'ORD20240115002',
                operation: '状态同步',
                statusChange: '已打印 → 已发货',
                operator: '张三'
            }
        ];
        
        renderLinkageRecords(records);
    } catch (error) {
        console.error('[OrderLinkage] 加载联动记录失败:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center text-red-500">
                    <i class="fas fa-exclamation-circle mr-2"></i>加载失败: ${error.message}
                </td>
            </tr>
        `;
    }
}

/**
 * 渲染联动记录
 */
function renderLinkageRecords(records) {
    const tableBody = document.getElementById('linkageRecordsTable');
    if (!tableBody) return;
    
    if (records.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-history text-4xl mb-3 text-gray-300"></i>
                    <p>暂无联动记录</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const rows = records.map(record => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">${record.time}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${record.orderNumber}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">${record.operation}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">${record.statusChange}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">${record.operator}</td>
        </tr>
    `).join('');
    
    tableBody.innerHTML = rows;
}

/**
 * 同步订单状态
 */
window.syncOrderStatus = async function() {
    showNotification('开始同步订单状态...', 'info');
    
    try {
        // 模拟同步过程
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        showNotification('订单状态同步完成', 'success');
        await loadLinkageRecords();
    } catch (error) {
        showNotification('同步失败: ' + error.message, 'error');
    }
};

/**
 * 自动填充物流信息
 */
window.autoFillLogistics = async function() {
    if (!confirm('确定要为符合条件的订单自动填充物流信息吗？')) return;
    
    showNotification('正在自动填充物流信息...', 'info');
    
    try {
        // 模拟自动填充过程
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        showNotification('物流信息自动填充完成', 'success');
        await loadLinkageRecords();
    } catch (error) {
        showNotification('自动填充失败: ' + error.message, 'error');
    }
};

// ===================== 面单模板管理 =====================

/**
 * 初始化面单模板管理页面
 */
async function initTemplateManagePage() {
    console.log('[TemplateManage] 初始化面单模板管理页面');
    
    // 绑定筛选事件
    bindTemplateFilterEvents();
    
    // 加载模板列表
    await loadTemplates();
}

/**
 * 绑定模板筛选事件
 */
function bindTemplateFilterEvents() {
    const filters = ['templateTypeFilter', 'templateStatusFilter'];
    
    filters.forEach(filterId => {
        const filterElement = document.getElementById(filterId);
        if (filterElement) {
            filterElement.addEventListener('change', loadTemplates);
        }
    });
    
    // 搜索输入框回车事件
    const searchInput = document.getElementById('templateSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchTemplates();
            }
        });
    }
}

/**
 * 加载模板列表
 */
async function loadTemplates() {
    const container = document.getElementById('templatesContainer');
    if (!container) return;
    
    // 显示加载状态
    container.innerHTML = `
        <div class="col-span-full text-center py-12 text-gray-500">
            <i class="fas fa-spinner fa-spin text-2xl mb-3"></i>
            <p>加载模板中...</p>
        </div>
    `;
    
    try {
        // 获取筛选条件
        const filters = getTemplateFilters();
        
        // 模拟模板数据
        const templates = [
            {
                id: 1,
                name: '默认快递面单',
                type: 'express',
                typeName: '快递面单',
                status: 'active',
                statusName: '启用',
                preview: '标准快递面单模板，适用于大多数快递公司',
                createdAt: '2024-01-01'
            },
            {
                id: 2,
                name: '圆通专用模板',
                type: 'express',
                typeName: '快递面单',
                status: 'active',
                statusName: '启用',
                preview: '专为圆通速递设计的面单模板',
                createdAt: '2024-01-10'
            },
            {
                id: 3,
                name: '发票模板',
                type: 'invoice',
                typeName: '发票模板',
                status: 'inactive',
                statusName: '停用',
                preview: '标准发票打印模板',
                createdAt: '2023-12-15'
            }
        ];
        
        // 应用筛选
        const filteredTemplates = filterTemplates(templates, filters);
        
        renderTemplates(filteredTemplates);
    } catch (error) {
        console.error('[TemplateManage] 加载模板失败:', error);
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-red-500">
                <i class="fas fa-exclamation-circle text-2xl mb-3"></i>
                <p>加载失败: ${error.message}</p>
            </div>
        `;
    }
}

/**
 * 获取模板筛选条件
 */
function getTemplateFilters() {
    return {
        type: document.getElementById('templateTypeFilter')?.value || '',
        status: document.getElementById('templateStatusFilter')?.value || '',
        search: document.getElementById('templateSearch')?.value || ''
    };
}

/**
 * 筛选模板
 */
function filterTemplates(templates, filters) {
    return templates.filter(template => {
        // 类型筛选
        if (filters.type && template.type !== filters.type) return false;
        
        // 状态筛选
        if (filters.status && template.status !== filters.status) return false;
        
        // 搜索筛选
        if (filters.search && !template.name.toLowerCase().includes(filters.search.toLowerCase())) {
            return false;
        }
        
        return true;
    });
}

/**
 * 渲染模板列表
 */
function renderTemplates(templates) {
    const container = document.getElementById('templatesContainer');
    if (!container) return;
    
    if (templates.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500">
                <i class="fas fa-file-alt text-4xl mb-3 text-gray-300"></i>
                <p>暂无匹配的模板</p>
                <button onclick="openCreateTemplateModal()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    <i class="fas fa-plus mr-2"></i>创建模板
                </button>
            </div>
        `;
        return;
    }
    
    const templateCards = templates.map(template => `
        <div class="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden">
            <div class="p-5">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="text-lg font-semibold text-gray-900">${template.name}</h3>
                    <span class="px-2 py-1 text-xs rounded-full ${template.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                        ${template.statusName}
                    </span>
                </div>
                
                <div class="mb-3">
                    <span class="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        ${template.typeName}
                    </span>
                </div>
                
                <p class="text-gray-600 text-sm mb-4">${template.preview}</p>
                
                <div class="flex justify-between items-center text-xs text-gray-500 mb-4">
                    <span>创建时间: ${template.createdAt}</span>
                </div>
                
                <div class="flex space-x-2">
                    <button onclick="editTemplate(${template.id})" class="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition">
                        <i class="fas fa-edit mr-1"></i>编辑
                    </button>
                    <button onclick="previewTemplate(${template.id})" class="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition">
                        <i class="fas fa-eye mr-1"></i>预览
                    </button>
                    ${template.status === 'active' ? 
                        `<button onclick="disableTemplate(${template.id})" class="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition">
                            <i class="fas fa-times mr-1"></i>停用
                        </button>` : 
                        `<button onclick="enableTemplate(${template.id})" class="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition">
                            <i class="fas fa-check mr-1"></i>启用
                        </button>`
                    }
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = templateCards;
}

/**
 * 搜索模板
 */
window.searchTemplates = async function() {
    await loadTemplates();
};

/**
 * 打开创建模板模态框
 */
window.openCreateTemplateModal = function() {
    showNotification('创建模板功能待实现', 'info');
};

/**
 * 导入模板
 */
window.importTemplates = function() {
    showNotification('导入模板功能待实现', 'info');
};

/**
 * 编辑模板
 */
window.editTemplate = function(templateId) {
    showNotification(`编辑模板 ${templateId} 功能待实现`, 'info');
};

/**
 * 预览模板
 */
window.previewTemplate = function(templateId) {
    showNotification(`预览模板 ${templateId} 功能待实现`, 'info');
};

/**
 * 启用模板
 */
window.enableTemplate = async function(templateId) {
    showNotification(`启用模板 ${templateId}`, 'success');
    await loadTemplates();
};

/**
 * 停用模板
 */
window.disableTemplate = async function(templateId) {
    showNotification(`停用模板 ${templateId}`, 'success');
    await loadTemplates();
};

// ===================== 物流订单列表 =====================

/**
 * 初始化物流订单列表页面
 */
async function initLogisticsOrderPage() {
    console.log('[LogisticsOrder] 初始化物流订单列表页面');
    
    // 绑定筛选事件
    bindLogisticsFilterEvents();
    
    // 绑定全选事件
    bindLogisticsSelectAllEvent();
    
    // 加载物流订单列表
    await loadLogisticsOrders();
}

/**
 * 绑定物流筛选事件
 */
function bindLogisticsFilterEvents() {
    const filters = ['logisticsStatusFilter', 'logisticsExpressFilter', 'logisticsTimeFilter'];
    
    filters.forEach(filterId => {
        const filterElement = document.getElementById(filterId);
        if (filterElement) {
            filterElement.addEventListener('change', loadLogisticsOrders);
        }
    });
    
    // 搜索输入框回车事件
    const searchInput = document.getElementById('logisticsSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchLogisticsOrders();
            }
        });
    }
}

/**
 * 绑定物流全选事件
 */
function bindLogisticsSelectAllEvent() {
    const selectAllCheckbox = document.getElementById('selectAllLogistics');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('#logisticsOrdersTable input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
            updateLogisticsSelectedCount();
        });
    }
}

/**
 * 更新物流选中数量
 */
function updateLogisticsSelectedCount() {
    const checkboxes = document.querySelectorAll('#logisticsOrdersTable input[type="checkbox"]:checked');
    const selectedCountSpan = document.getElementById('selectedLogisticsCount');
    if (selectedCountSpan) {
        selectedCountSpan.textContent = `已选中 ${checkboxes.length} 项`;
    }
}

/**
 * 加载物流订单列表
 */
async function loadLogisticsOrders(page = 1) {
    const tableBody = document.getElementById('logisticsOrdersTable');
    const totalCountSpan = document.getElementById('totalLogisticsOrders');
    
    if (!tableBody) return;
    
    // 显示加载状态
    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="px-6 py-12 text-center text-gray-500">
                <i class="fas fa-spinner fa-spin mr-2"></i>加载中...
            </td>
        </tr>
    `;
    
    try {
        // 获取筛选条件
        const filters = getLogisticsFilters();
        
        // 模拟物流订单数据
        const logisticsOrders = [
            {
                id: 1,
                orderNumber: 'ORD20240115001',
                waybillNumber: 'YT1234567890123',
                expressCompany: '圆通速递',
                expressCode: 'yto',
                consignee: '张三',
                consigneePhone: '138****8888',
                shippingAddress: '北京市朝阳区xxx街道xxx号',
                logisticsStatus: 'printed',
                statusText: '已打印',
                statusClass: 'bg-blue-100 text-blue-800',
                printTime: '2024-01-15 14:30:25',
                shipTime: '2024-01-15 15:00:00'
            },
            {
                id: 2,
                orderNumber: 'ORD20240115002',
                waybillNumber: 'ST9876543210987',
                expressCompany: '申通快递',
                expressCode: 'sto',
                consignee: '李四',
                consigneePhone: '139****9999',
                shippingAddress: '上海市浦东新区xxx路xxx号',
                logisticsStatus: 'shipped',
                statusText: '已发货',
                statusClass: 'bg-purple-100 text-purple-800',
                printTime: '2024-01-15 14:25:10',
                shipTime: '2024-01-15 14:45:30'
            },
            {
                id: 3,
                orderNumber: 'ORD20240115003',
                waybillNumber: '',
                expressCompany: '中通快递',
                expressCode: 'zto',
                consignee: '王五',
                consigneePhone: '137****7777',
                shippingAddress: '广州市天河区xxx大道xxx号',
                logisticsStatus: 'pending',
                statusText: '待处理',
                statusClass: 'bg-yellow-100 text-yellow-800',
                printTime: '-',
                shipTime: '-'
            }
        ];
        
        // 应用筛选
        const filteredOrders = filterLogisticsOrders(logisticsOrders, filters);
        
        renderLogisticsOrders(filteredOrders);
        
        if (totalCountSpan) {
            totalCountSpan.textContent = filteredOrders.length;
        }
        
    } catch (error) {
        console.error('[LogisticsOrder] 加载物流订单失败:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="px-6 py-12 text-center text-red-500">
                    <i class="fas fa-exclamation-circle mr-2"></i>加载失败: ${error.message}
                </td>
            </tr>
        `;
    }
}

/**
 * 获取物流筛选条件
 */
function getLogisticsFilters() {
    return {
        status: document.getElementById('logisticsStatusFilter')?.value || '',
        express: document.getElementById('logisticsExpressFilter')?.value || '',
        time: document.getElementById('logisticsTimeFilter')?.value || '',
        search: document.getElementById('logisticsSearch')?.value || ''
    };
}

/**
 * 筛选物流订单
 */
function filterLogisticsOrders(orders, filters) {
    return orders.filter(order => {
        // 状态筛选
        if (filters.status && order.logisticsStatus !== filters.status) return false;
        
        // 快递公司筛选
        if (filters.express && order.expressCode !== filters.express) return false;
        
        // 时间筛选（简化处理）
        if (filters.time) {
            // 这里可以根据实际需求实现时间筛选逻辑
        }
        
        // 搜索筛选
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            if (!order.orderNumber.toLowerCase().includes(searchTerm) && 
                !order.waybillNumber.toLowerCase().includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });
}

/**
 * 渲染物流订单列表
 */
function renderLogisticsOrders(orders) {
    const tableBody = document.getElementById('logisticsOrdersTable');
    if (!tableBody) return;
    
    if (orders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-truck text-4xl mb-3 text-gray-300"></i>
                    <p>暂无物流订单数据</p>
                </td>
            </tr>
        `;
        hideLogisticsPagination();
        return;
    }
    
    const rows = orders.map(order => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 whitespace-nowrap">
                <input type="checkbox" 
                       data-order-id="${order.id}" 
                       data-order-number="${order.orderNumber}"
                       class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 logistics-checkbox"
                       onchange="updateLogisticsSelectedCount()">
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                ${order.orderNumber}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                ${order.waybillNumber || '<span class="text-gray-400">-</span>'}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                ${order.expressCompany}
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">
                <div>${order.consignee}</div>
                <div class="text-xs text-gray-500">${order.consigneePhone}</div>
                <div class="text-xs text-gray-500">${order.shippingAddress}</div>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="px-2 py-1 rounded-full text-xs ${order.statusClass}">
                    ${order.statusText}
                </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                ${order.printTime}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                ${order.shipTime}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                ${order.waybillNumber ? 
                    `<button onclick="reprintWaybill('${order.waybillNumber}')" class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-print mr-1"></i>重打
                    </button>` : 
                    `<button onclick="generateWaybill(${order.id})" class="text-green-600 hover:text-green-900 mr-3">
                        <i class="fas fa-magic mr-1"></i>生成
                    </button>`
                }
                <button onclick="viewLogisticsDetail(${order.id})" class="text-gray-600 hover:text-gray-900">
                    <i class="fas fa-eye mr-1"></i>详情
                </button>
            </td>
        </tr>
    `).join('');
    
    tableBody.innerHTML = rows;
    
    // 更新分页（简化处理）
    updateLogisticsPagination({ total_count: orders.length, current_page: 1, total_pages: 1 });
}

/**
 * 更新物流分页
 */
function updateLogisticsPagination(pagination) {
    const paginationDiv = document.getElementById('logisticsPagination');
    if (!paginationDiv) return;
    
    if (pagination.total_pages <= 1) {
        paginationDiv.classList.add('hidden');
        return;
    }
    
    paginationDiv.classList.remove('hidden');
    
    const pageStartSpan = document.getElementById('logisticsPageStart');
    const pageEndSpan = document.getElementById('logisticsPageEnd');
    const totalCountSpan = document.getElementById('logisticsTotalCount');
    const currentPageSpan = document.getElementById('logisticsCurrentPage');
    const prevBtn = document.getElementById('logisticsPrevPage');
    const nextBtn = document.getElementById('logisticsNextPage');
    
    if (pageStartSpan) pageStartSpan.textContent = 1;
    if (pageEndSpan) pageEndSpan.textContent = pagination.total_count;
    if (totalCountSpan) totalCountSpan.textContent = pagination.total_count;
    if (currentPageSpan) currentPageSpan.textContent = `第 ${pagination.current_page} 页`;
    
    if (prevBtn) prevBtn.disabled = pagination.current_page <= 1;
    if (nextBtn) nextBtn.disabled = pagination.current_page >= pagination.total_pages;
}

/**
 * 隐藏物流分页
 */
function hideLogisticsPagination() {
    const paginationDiv = document.getElementById('logisticsPagination');
    if (paginationDiv) {
        paginationDiv.classList.add('hidden');
    }
}

/**
 * 刷新物流订单列表
 */
window.refreshLogisticsOrders = async function() {
    // 清空筛选条件
    const filters = ['logisticsStatusFilter', 'logisticsExpressFilter', 'logisticsTimeFilter'];
    filters.forEach(filterId => {
        const filterElement = document.getElementById(filterId);
        if (filterElement) filterElement.selectedIndex = 0;
    });
    
    const searchInput = document.getElementById('logisticsSearch');
    if (searchInput) searchInput.value = '';
    
    // 重置全选
    const selectAllCheckbox = document.getElementById('selectAllLogistics');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    
    await loadLogisticsOrders(1);
    showNotification('物流订单列表已刷新', 'success');
};

/**
 * 搜索物流订单
 */
window.searchLogisticsOrders = async function() {
    await loadLogisticsOrders(1);
};

/**
 * 切换物流分页
 */
window.changeLogisticsPage = async function(direction) {
    const currentPageSpan = document.getElementById('logisticsCurrentPage');
    if (!currentPageSpan) return;
    
    const currentPage = parseInt(currentPageSpan.textContent.match(/\d+/)[0]) || 1;
    const newPage = currentPage + direction;
    
    if (newPage >= 1) {
        await loadLogisticsOrders(newPage);
    }
};

/**
 * 批量发货
 */
window.batchShipOrders = async function() {
    const selectedCheckboxes = document.querySelectorAll('#logisticsOrdersTable input[type="checkbox"]:checked');
    
    if (selectedCheckboxes.length === 0) {
        showNotification('请先选择要发货的订单', 'warning');
        return;
    }
    
    if (!confirm(`确定要批量发货选中的 ${selectedCheckboxes.length} 个订单吗？`)) {
        return;
    }
    
    showNotification(`正在批量发货 ${selectedCheckboxes.length} 个订单...`, 'info');
    
    try {
        // 模拟批量发货过程
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        showNotification('批量发货完成', 'success');
        await loadLogisticsOrders();
    } catch (error) {
        showNotification('批量发货失败: ' + error.message, 'error');
    }
};

/**
 * 导出物流数据
 */
window.exportLogisticsData = function() {
    showNotification('导出物流数据功能待实现', 'info');
};

/**
 * 重新打印面单
 */
window.reprintWaybill = async function(waybillNumber) {
    showNotification(`重新打印面单: ${waybillNumber}`, 'success');
};

/**
 * 生成面单
 */
window.generateWaybill = async function(orderId) {
    showNotification(`为订单 ${orderId} 生成面单`, 'success');
    await loadLogisticsOrders();
};

/**
 * 查看物流详情
 */
window.viewLogisticsDetail = function(orderId) {
    showNotification(`查看物流详情 (ID: ${orderId})`, 'info');
};

// ===================== 按订单打印模块 =====================

/**
 * 初始化按订单打印页面
 */
async function initOrderPrintPage() {
    console.log('[OrderPrint] 初始化按订单打印页面');
    
    // 绑定筛选事件
    bindOrderFilterEvents();
    
    // 绑定全选事件
    bindSelectAllEvent();
    
    // 加载订单列表
    await loadOrderList();
}

/**
 * 绑定筛选事件
 */
function bindOrderFilterEvents() {
    const filters = ['orderStatusFilter', 'orderTimeFilter', 'expressCompanyFilter'];
    
    filters.forEach(filterId => {
        const filterElement = document.getElementById(filterId);
        if (filterElement) {
            filterElement.addEventListener('change', loadOrderList);
        }
    });
    
    // 搜索输入框回车事件
    const searchInput = document.getElementById('orderSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchOrders();
            }
        });
    }
}

/**
 * 绑定全选事件
 */
function bindSelectAllEvent() {
    const selectAllCheckbox = document.getElementById('selectAllOrders');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('#orderPrintTableBody input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
            updateSelectedCount();
        });
    }
}

/**
 * 更新选中数量显示
 */
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('#orderPrintTableBody input[type="checkbox"]:checked');
    const selectedCountSpan = document.getElementById('selectedCount');
    if (selectedCountSpan) {
        selectedCountSpan.textContent = `已选中 ${checkboxes.length} 项`;
    }
}

/**
 * 加载订单列表
 */
async function loadOrderList(page = 1) {
    const tableBody = document.getElementById('orderPrintTableBody');
    if (!tableBody) return;
    
    // 显示加载状态
    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="px-6 py-12 text-center text-gray-500">
                <i class="fas fa-spinner fa-spin mr-2"></i>加载中...
            </td>
        </tr>
    `;
    
    try {
        // 获取筛选条件
        const filters = getOrderFilters();
        
        // 构造查询参数
        const params = new URLSearchParams({
            page: page,
            page_size: 20,
            ...filters
        });
        
        const response = await fetch(`/api/orders?${params}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                renderOrderList(result.data.orders || [], result.data.pagination || {});
            } else {
                throw new Error(result.message || '加载失败');
            }
        } else {
            throw new Error('网络请求失败');
        }
    } catch (error) {
        console.error('[OrderPrint] 加载订单列表失败:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="px-6 py-12 text-center text-red-500">
                    <i class="fas fa-exclamation-circle mr-2"></i>加载失败: ${error.message}
                </td>
            </tr>
        `;
    }
}

/**
 * 获取筛选条件
 */
function getOrderFilters() {
    return {
        status: document.getElementById('orderStatusFilter')?.value || '',
        time_range: document.getElementById('orderTimeFilter')?.value || '',
        express_company: document.getElementById('expressCompanyFilter')?.value || '',
        search: document.getElementById('orderSearchInput')?.value || ''
    };
}

/**
 * 渲染订单列表
 */
function renderOrderList(orders, pagination) {
    const tableBody = document.getElementById('orderPrintTableBody');
    const totalOrdersSpan = document.getElementById('totalOrders');
    
    if (!tableBody) return;
    
    if (orders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-3 text-gray-300"></i>
                    <p>暂无订单数据</p>
                </td>
            </tr>
        `;
        if (totalOrdersSpan) totalOrdersSpan.textContent = '0';
        hidePagination();
        return;
    }
    
    // 渲染订单行
    const rows = orders.map(order => {
        const customerInfo = order.customer_name ? 
            `${order.customer_name}<br><span class="text-xs text-gray-500">${order.customer_phone || ''}</span>` : 
            '<span class="text-gray-400">-</span>';
            
        const shippingInfo = order.shipping_address ? 
            `${order.consignee_name || ''}<br><span class="text-xs text-gray-500">${order.consignee_phone || ''}</span><br><span class="text-xs text-gray-500">${order.shipping_address}</span>` : 
            '<span class="text-gray-400">-</span>';
            
        const statusClass = getOrderStatusClass(order.status);
        const statusText = getOrderStatusText(order.status);
        
        const printStatus = order.waybill_number ? 
            `<span class="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">已打印</span>` :
            `<span class="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs">未打印</span>`;
            
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 whitespace-nowrap">
                    <input type="checkbox" 
                           data-order-id="${order.id}" 
                           data-order-number="${order.order_number}"
                           class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 order-checkbox"
                           onchange="updateSelectedCount()">
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${order.order_number}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                    ${customerInfo}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                    ${shippingInfo}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    ¥${(order.total_amount || 0).toFixed(2)}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-2 py-1 rounded-full text-xs ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    ${formatDate(order.created_at)}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                    ${printStatus}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="printOrderByOrderId(${order.id})" 
                            class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-print mr-1"></i>打印
                    </button>
                    <button onclick="viewOrderDetail(${order.id})" 
                            class="text-gray-600 hover:text-gray-900">
                        <i class="fas fa-eye mr-1"></i>详情
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    tableBody.innerHTML = rows;
    
    // 更新总数显示
    if (totalOrdersSpan) {
        totalOrdersSpan.textContent = pagination.total_count || orders.length;
    }
    
    // 更新分页
    updatePagination(pagination);
}

/**
 * 获取订单状态样式类
 */
function getOrderStatusClass(status) {
    const statusMap = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'confirmed': 'bg-blue-100 text-blue-800',
        'shipped': 'bg-purple-100 text-purple-800',
        'delivered': 'bg-green-100 text-green-800',
        'cancelled': 'bg-red-100 text-red-800'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
}

/**
 * 获取订单状态文本
 */
function getOrderStatusText(status) {
    const statusMap = {
        'pending': '待处理',
        'confirmed': '已确认',
        'shipped': '已发货',
        'delivered': '已送达',
        'cancelled': '已取消'
    };
    return statusMap[status] || status;
}

/**
 * 格式化日期
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * 更新分页
 */
function updatePagination(pagination) {
    const paginationDiv = document.getElementById('orderPagination');
    const pageStartSpan = document.getElementById('pageStart');
    const pageEndSpan = document.getElementById('pageEnd');
    const totalCountSpan = document.getElementById('totalCount');
    const currentPageInfoSpan = document.getElementById('currentPageInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (!paginationDiv || !pagination.total_pages || pagination.total_pages <= 1) {
        if (paginationDiv) paginationDiv.classList.add('hidden');
        return;
    }
    
    paginationDiv.classList.remove('hidden');
    
    const currentPage = pagination.current_page || 1;
    const pageSize = pagination.page_size || 20;
    const totalCount = pagination.total_count || 0;
    
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalCount);
    
    if (pageStartSpan) pageStartSpan.textContent = start;
    if (pageEndSpan) pageEndSpan.textContent = end;
    if (totalCountSpan) totalCountSpan.textContent = totalCount;
    if (currentPageInfoSpan) currentPageInfoSpan.textContent = `第 ${currentPage} 页`;
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
    }
    if (nextBtn) {
        nextBtn.disabled = currentPage >= pagination.total_pages;
    }
}

/**
 * 隐藏分页
 */
function hidePagination() {
    const paginationDiv = document.getElementById('orderPagination');
    if (paginationDiv) {
        paginationDiv.classList.add('hidden');
    }
}

/**
 * 刷新订单列表
 */
window.refreshOrderList = async function() {
    // 清空搜索条件
    const searchInput = document.getElementById('orderSearchInput');
    if (searchInput) searchInput.value = '';
    
    const filters = ['orderStatusFilter', 'orderTimeFilter', 'expressCompanyFilter'];
    filters.forEach(filterId => {
        const filterElement = document.getElementById(filterId);
        if (filterElement) filterElement.selectedIndex = 0;
    });
    
    // 重置全选
    const selectAllCheckbox = document.getElementById('selectAllOrders');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    
    await loadOrderList(1);
    showNotification('列表已刷新', 'success');
};

/**
 * 搜索订单
 */
window.searchOrders = async function() {
    await loadOrderList(1);
};

/**
 * 切换分页
 */
window.changeOrderPage = async function(direction) {
    const currentPageInfo = document.getElementById('currentPageInfo');
    if (!currentPageInfo) return;
    
    const currentPage = parseInt(currentPageInfo.textContent.match(/\d+/)[0]) || 1;
    const newPage = currentPage + direction;
    
    if (newPage >= 1) {
        await loadOrderList(newPage);
    }
};

/**
 * 批量打印订单
 */
window.batchPrintOrders = async function() {
    const selectedCheckboxes = document.querySelectorAll('#orderPrintTableBody input[type="checkbox"]:checked');
    
    if (selectedCheckboxes.length === 0) {
        showNotification('请先选择要打印的订单', 'warning');
        return;
    }
    
    if (!confirm(`确定要批量打印选中的 ${selectedCheckboxes.length} 个订单吗？`)) {
        return;
    }
    
    try {
        // 收集选中的订单ID
        const orderIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.orderId);
        
        // 调用批量打印API
        const response = await fetch('/api/tenant/batch_print_orders', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ order_ids: orderIds })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`成功打印 ${orderIds.length} 个订单`, 'success');
            // 刷新列表以更新打印状态
            await loadOrderList();
        } else {
            showNotification(result.message || '批量打印失败', 'error');
        }
    } catch (error) {
        console.error('[OrderPrint] 批量打印失败:', error);
        showNotification('网络错误，批量打印失败', 'error');
    }
};

/**
 * 导出选中订单
 */
window.exportSelectedOrders = function() {
    const selectedCheckboxes = document.querySelectorAll('#orderPrintTableBody input[type="checkbox"]:checked');
    
    if (selectedCheckboxes.length === 0) {
        showNotification('请先选择要导出的订单', 'warning');
        return;
    }
    
    // 收集选中的订单信息
    const ordersData = Array.from(selectedCheckboxes).map(cb => ({
        orderId: cb.dataset.orderId,
        orderNumber: cb.dataset.orderNumber
    }));
    
    // 生成CSV内容
    const csvContent = generateOrdersCSV(ordersData);
    
    // 下载文件
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `选中订单_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification(`已导出 ${ordersData.length} 个订单`, 'success');
};

/**
 * 生成订单CSV内容
 */
function generateOrdersCSV(ordersData) {
    const headers = ['订单ID', '订单号', '导出时间'];
    const rows = ordersData.map(data => [
        data.orderId,
        data.orderNumber,
        new Date().toLocaleString('zh-CN')
    ]);
    
    const csvRows = [headers, ...rows];
    return csvRows.map(row => row.join(',')).join('\n');
}

/**
 * 打印指定订单
 */
window.printOrderByOrderId = async function(orderId) {
    try {
        // 调用打印API
        const response = await fetch(`/api/tenant/orders/${orderId}/print_waybill`, {
            method: 'POST',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('面单打印成功', 'success');
            // 刷新列表以更新打印状态
            await loadOrderList();
        } else {
            showNotification(result.message || '打印失败', 'error');
        }
    } catch (error) {
        console.error('[OrderPrint] 打印订单失败:', error);
        showNotification('网络错误，打印失败', 'error');
    }
};

/**
 * 查看订单详情
 */
window.viewOrderDetail = function(orderId) {
    // 这里可以跳转到订单详情页面或打开模态框
    showNotification(`查看订单详情功能待实现 (ID: ${orderId})`, 'info');
};

// ===================== 快递打印模块 =====================

/**
 * 初始化快递打印页面
 */
async function initExpressPrintPage() {
    console.log('[ExpressPrint] 初始化快递打印页面');
    
    // 绑定表单事件
    bindExpressFormEvents();
    
    // 加载默认发货地址
    loadDefaultSenderInfo();
    
    // 初始化预览
    updateWaybillPreview();
}

/**
 * 绑定表单事件
 */
function bindExpressFormEvents() {
    // 快递公司选择变化
    const expressCompanySelect = document.getElementById('expressCompany');
    if (expressCompanySelect) {
        expressCompanySelect.addEventListener('change', updateWaybillPreview);
    }
    
    // 模板选择变化
    const printTemplateSelect = document.getElementById('printTemplate');
    if (printTemplateSelect) {
        printTemplateSelect.addEventListener('change', updateWaybillPreview);
    }
    
    // 表单字段变化
    const formFields = [
        'senderName', 'senderPhone', 'senderAddress',
        'receiverName', 'receiverPhone', 'receiverAddress',
        'goodsName', 'goodsWeight', 'goodsQuantity', 'expressRemark'
    ];
    
    formFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', updateWaybillPreview);
        }
    });
}

/**
 * 加载默认发件人信息
 */
async function loadDefaultSenderInfo() {
    try {
        const response = await fetch('/api/tenant/warehouses/default', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                const warehouse = result.data;
                
                // 填充发件人信息
                const senderNameField = document.getElementById('senderName');
                const senderPhoneField = document.getElementById('senderPhone');
                const senderAddressField = document.getElementById('senderAddress');
                
                if (senderNameField) senderNameField.value = warehouse.contact || '';
                if (senderPhoneField) senderPhoneField.value = warehouse.phone || '';
                if (senderAddressField) {
                    const address = `${warehouse.province || ''}${warehouse.city || ''}${warehouse.district || ''}${warehouse.address || ''}`;
                    senderAddressField.value = address;
                }
                
                updateWaybillPreview();
            }
        }
    } catch (error) {
        console.warn('[ExpressPrint] 加载默认发货地址失败:', error);
    }
}

/**
 * 更新面单预览
 */
function updateWaybillPreview() {
    const previewContainer = document.getElementById('waybillPreview');
    const trackingNumberSpan = document.getElementById('previewTrackingNumber');
    const printStatusSpan = document.getElementById('previewPrintStatus');
    
    if (!previewContainer) return;
    
    // 获取表单数据
    const formData = getExpressFormData();
    
    // 检查必填字段
    const requiredFields = [
        formData.expressCompany, formData.printTemplate,
        formData.senderName, formData.senderPhone, formData.senderAddress,
        formData.receiverName, formData.receiverPhone, formData.receiverAddress
    ];
    
    const isComplete = requiredFields.every(field => field && field.trim() !== '');
    
    if (!isComplete) {
        // 显示提示信息
        previewContainer.innerHTML = `
            <div class="text-gray-500">
                <i class="fas fa-file-alt text-4xl mb-3 text-gray-300"></i>
                <p>填写快递信息后将在此预览面单</p>
                <p class="text-sm mt-1">请选择快递公司和模板</p>
            </div>
        `;
        if (trackingNumberSpan) trackingNumberSpan.textContent = '-';
        if (printStatusSpan) {
            printStatusSpan.textContent = '未打印';
            printStatusSpan.className = 'text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-800';
        }
        return;
    }
    
    // 生成预览内容
    const previewHtml = generateWaybillPreview(formData);
    previewContainer.innerHTML = previewHtml;
    
    // 更新运单号和状态
    if (trackingNumberSpan) trackingNumberSpan.textContent = formData.trackingNumber || '待生成';
    if (printStatusSpan) {
        printStatusSpan.textContent = formData.printStatus || '未打印';
        printStatusSpan.className = 'text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-800';
    }
}

/**
 * 获取快递表单数据
 */
function getExpressFormData() {
    return {
        expressCompany: document.getElementById('expressCompany')?.value || '',
        printTemplate: document.getElementById('printTemplate')?.value || '',
        senderName: document.getElementById('senderName')?.value || '',
        senderPhone: document.getElementById('senderPhone')?.value || '',
        senderAddress: document.getElementById('senderAddress')?.value || '',
        receiverName: document.getElementById('receiverName')?.value || '',
        receiverPhone: document.getElementById('receiverPhone')?.value || '',
        receiverAddress: document.getElementById('receiverAddress')?.value || '',
        goodsName: document.getElementById('goodsName')?.value || '',
        goodsWeight: document.getElementById('goodsWeight')?.value || '',
        goodsQuantity: document.getElementById('goodsQuantity')?.value || '1',
        expressRemark: document.getElementById('expressRemark')?.value || '',
        trackingNumber: '', // 待生成
        printStatus: '未打印'
    };
}

/**
 * 生成面单预览HTML
 */
function generateWaybillPreview(formData) {
    const companyNames = {
        'yto': '圆通速递',
        'sto': '申通快递',
        'zto': '中通快递',
        'sf': '顺丰速运',
        'ems': 'EMS',
        'jd': '京东物流'
    };
    
    const companyName = companyNames[formData.expressCompany] || formData.expressCompany;
    
    return `
        <div class="w-full max-w-md mx-auto bg-white border border-gray-300 rounded p-4 text-sm">
            <!-- 快递公司标识 -->
            <div class="text-center mb-3">
                <div class="text-lg font-bold text-blue-600">${companyName}</div>
                <div class="text-xs text-gray-500">电子面单</div>
            </div>
            
            <!-- 条形码区域 -->
            <div class="border border-gray-400 rounded p-2 mb-3 text-center">
                <div class="bg-white h-8 flex items-center justify-center mb-1">
                    <div class="text-xs text-gray-400">[条形码区域]</div>
                </div>
                <div class="font-mono text-sm">${formData.trackingNumber || 'XXXXXXXXXXXX'}</div>
            </div>
            
            <!-- 收件人信息 -->
            <div class="mb-3">
                <div class="font-semibold mb-1">收件人:</div>
                <div class="mb-1">${formData.receiverName}</div>
                <div class="mb-1">${formData.receiverPhone}</div>
                <div class="text-xs">${formData.receiverAddress}</div>
            </div>
            
            <!-- 发件人信息 -->
            <div class="mb-3 pt-2 border-t border-gray-300">
                <div class="font-semibold mb-1">发件人:</div>
                <div class="mb-1">${formData.senderName}</div>
                <div class="mb-1">${formData.senderPhone}</div>
                <div class="text-xs">${formData.senderAddress}</div>
            </div>
            
            <!-- 货物信息 -->
            <div class="pt-2 border-t border-gray-300">
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <span class="font-medium">物品:</span>
                        <span>${formData.goodsName || '商品'}</span>
                    </div>
                    <div>
                        <span class="font-medium">重量:</span>
                        <span>${formData.goodsWeight ? formData.goodsWeight + 'kg' : '-'}</span>
                    </div>
                    <div>
                        <span class="font-medium">数量:</span>
                        <span>${formData.goodsQuantity}</span>
                    </div>
                    <div>
                        <span class="font-medium">日期:</span>
                        <span>${new Date().toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
            
            <!-- 备注 -->
            ${formData.expressRemark ? `
            <div class="mt-2 pt-2 border-t border-gray-300 text-xs">
                <span class="font-medium">备注:</span>
                <span>${formData.expressRemark}</span>
            </div>
            ` : ''}
        </div>
    `;
}

/**
 * 清空快递表单
 */
window.clearExpressForm = function() {
    if (!confirm('确定要清空所有已填写的信息吗？')) return;
    
    // 清空所有表单字段
    const formFields = [
        'expressCompany', 'printTemplate',
        'senderName', 'senderPhone', 'senderAddress',
        'receiverName', 'receiverPhone', 'receiverAddress',
        'goodsName', 'goodsWeight', 'goodsQuantity', 'expressRemark'
    ];
    
    formFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            if (field.tagName === 'SELECT') {
                field.selectedIndex = 0;
            } else {
                field.value = '';
            }
        }
    });
    
    // 重新加载默认发件人信息
    loadDefaultSenderInfo();
    
    showNotification('表单已清空', 'success');
};

/**
 * 保存快递记录
 */
window.saveExpressRecord = async function() {
    const formData = getExpressFormData();
    
    // 验证必填字段
    const requiredFields = {
        'expressCompany': '快递公司',
        'printTemplate': '打印模板',
        'senderName': '发件人姓名',
        'senderPhone': '发件人电话',
        'senderAddress': '发件地址',
        'receiverName': '收件人姓名',
        'receiverPhone': '收件人电话',
        'receiverAddress': '收件地址'
    };
    
    for (const [field, fieldName] of Object.entries(requiredFields)) {
        if (!formData[field] || formData[field].trim() === '') {
            showNotification(`请填写${fieldName}`, 'error');
            return;
        }
    }
    
    try {
        const response = await fetch('/api/tenant/express_records', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('快递记录保存成功', 'success');
            // 可以在这里更新预览状态
            updateWaybillPreview();
        } else {
            showNotification(result.message || '保存失败', 'error');
        }
    } catch (error) {
        console.error('[ExpressPrint] 保存记录失败:', error);
        showNotification('网络错误，保存失败', 'error');
    }
};

/**
 * 打印快递面单
 */
window.printExpressWaybill = function() {
    const formData = getExpressFormData();
    
    // 验证必填字段
    if (!formData.expressCompany || !formData.printTemplate) {
        showNotification('请先选择快递公司和打印模板', 'error');
        return;
    }
    
    // 生成打印内容
    const printWindow = window.open('', '_blank');
    const printContent = generatePrintContent(formData);
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // 等待内容加载完成后打印
    printWindow.onload = function() {
        printWindow.print();
        printWindow.close();
    };
    
    showNotification('正在准备打印...', 'success');
};

/**
 * 生成打印内容
 */
function generatePrintContent(formData) {
    const companyNames = {
        'yto': '圆通速递',
        'sto': '申通快递',
        'zto': '中通快递',
        'sf': '顺丰速运',
        'ems': 'EMS',
        'jd': '京东物流'
    };
    
    const companyName = companyNames[formData.expressCompany] || formData.expressCompany;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>快递面单打印</title>
        <style>
            body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial, sans-serif; 
                font-size: 12px;
            }
            .waybill {
                width: 100mm;
                height: 150mm;
                border: 1px solid #000;
                padding: 10px;
                box-sizing: border-box;
            }
            .header {
                text-align: center;
                margin-bottom: 10px;
            }
            .header .company {
                font-size: 16px;
                font-weight: bold;
                color: #1a73e8;
            }
            .barcode-area {
                border: 1px solid #666;
                padding: 5px;
                text-align: center;
                margin-bottom: 10px;
            }
            .section {
                margin-bottom: 8px;
            }
            .section-title {
                font-weight: bold;
                margin-bottom: 3px;
            }
            .info-row {
                margin-bottom: 2px;
            }
            .divider {
                border-top: 1px dashed #999;
                margin: 8px 0;
            }
            .goods-info {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 5px;
                font-size: 10px;
            }
        </style>
    </head>
    <body>
        <div class="waybill">
            <div class="header">
                <div class="company">${companyName}</div>
                <div>电子面单</div>
            </div>
            
            <div class="barcode-area">
                <div>[条形码区域]</div>
                <div style="font-family: monospace; font-size: 14px; margin-top: 5px;">
                    ${formData.trackingNumber || 'XXXXXXXXXXXX'}
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">收件人:</div>
                <div class="info-row">${formData.receiverName}</div>
                <div class="info-row">${formData.receiverPhone}</div>
                <div class="info-row">${formData.receiverAddress}</div>
            </div>
            
            <div class="divider"></div>
            
            <div class="section">
                <div class="section-title">发件人:</div>
                <div class="info-row">${formData.senderName}</div>
                <div class="info-row">${formData.senderPhone}</div>
                <div class="info-row">${formData.senderAddress}</div>
            </div>
            
            <div class="divider"></div>
            
            <div class="section">
                <div class="section-title">货物信息:</div>
                <div class="goods-info">
                    <div><strong>物品:</strong> ${formData.goodsName || '商品'}</div>
                    <div><strong>重量:</strong> ${formData.goodsWeight ? formData.goodsWeight + 'kg' : '-'}</div>
                    <div><strong>数量:</strong> ${formData.goodsQuantity}</div>
                    <div><strong>日期:</strong> ${new Date().toLocaleDateString()}</div>
                </div>
            </div>
            
            ${formData.expressRemark ? `
            <div class="divider"></div>
            <div class="section">
                <div class="section-title">备注:</div>
                <div>${formData.expressRemark}</div>
            </div>
            ` : ''}
        </div>
    </body>
    </html>
    `;
}

// ===================== 发货地址管理 =====================

/**
 * 初始化发货地址管理页面
 */
async function initWarehousesPage() {
    console.log('[Logistics] 初始化发货地址管理页面');
    await loadWarehouses();
}

// ===================== 辅助函数 =====================

/**
 * 获取订单状态样式类
 */
function getOrderStatusClass(status) {
    const statusMap = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'processing': 'bg-blue-100 text-blue-800',
        'shipped': 'bg-green-100 text-green-800',
        'delivered': 'bg-purple-100 text-purple-800',
        'cancelled': 'bg-red-100 text-red-800'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
}

/**
 * 获取订单状态文本
 */
function getOrderStatusText(status) {
    const statusMap = {
        'pending': '待处理',
        'processing': '处理中',
        'shipped': '已发货',
        'delivered': '已送达',
        'cancelled': '已取消'
    };
    return statusMap[status] || status;
}

/**
 * 格式化日期
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * 显示通知
 */
function showNotification(message, type = 'info') {
    // 简单的通知实现
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 text-white ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 
        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

/**
 * 初始化发货地址管理页面
 */
async function initWarehousesPage() {
    console.log('[Logistics] 初始化发货地址管理页面');
    await loadWarehouses();
}

/**
 * 加载发货地址列表
 */
async function loadWarehouses() {
    const container = document.getElementById('warehousesTableBody');
    if (!container) {
        console.warn('[Logistics] 发货地址表格容器不存在');
        return;
    }
    
    container.innerHTML = `
        <tr>
            <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                <i class="fas fa-spinner fa-spin mr-2"></i>加载中...
            </td>
        </tr>
    `;
    
    try {
        const response = await fetch('/api/tenant/warehouses', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[Logistics] 发货地址列表:', result);
        
        if (result.success && result.data) {
            renderWarehouses(result.data);
        } else {
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-red-500">
                        ${result.message || '加载失败'}
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('[Logistics] 加载发货地址失败:', error);
        
        let errorMsg = '网络错误，请稍后重试';
        if (error.message.includes('HTTP 404')) {
            errorMsg = '接口不存在';
        }
        
        container.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center">
                    <div class="text-red-500 mb-2">
                        <i class="fas fa-exclamation-circle mr-2"></i>${errorMsg}
                    </div>
                    <button onclick="loadWarehouses()" 
                            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        <i class="fas fa-redo mr-1"></i>重试
                    </button>
                </td>
            </tr>
        `;
    }
}

/**
 * 渲染发货地址列表
 */
function renderWarehouses(warehouses) {
    const container = document.getElementById('warehousesTableBody');
    if (!container) return;
    
    if (!warehouses || warehouses.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-warehouse text-4xl mb-4 text-gray-300"></i>
                    <p>暂无发货地址</p>
                    <button onclick="openAddWarehouseModal()" 
                            class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>添加发货地址
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = warehouses.map(wh => {
        const isDefault = wh.is_default === 1;
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3">
                    <div class="font-medium text-gray-800">${wh.warehouse_name || '-'}</div>
                    ${isDefault ? '<span class="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">默认</span>' : ''}
                </td>
                <td class="px-4 py-3 text-sm">
                    <div class="text-gray-800">${wh.contact || '-'}</div>
                    <div class="text-gray-400">${wh.phone || '-'}</div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${wh.province || ''} ${wh.city || ''} ${wh.district || ''}
                    <div class="text-xs text-gray-400 truncate max-w-xs" title="${wh.address || ''}">
                        ${wh.address || '-'}
                    </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-400">
                    ${wh.created_at || '-'}
                </td>
                <td class="px-4 py-3 text-right space-x-2">
                    ${!isDefault ? `
                        <button onclick="setDefaultWarehouse(${wh.id})" 
                                class="text-blue-600 hover:text-blue-800 text-sm" title="设为默认">
                            <i class="fas fa-star"></i>
                        </button>
                    ` : ''}
                    <button onclick="editWarehouse(${wh.id})" 
                            class="text-green-600 hover:text-green-800 text-sm" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteWarehouse(${wh.id})" 
                            class="text-red-600 hover:text-red-800 text-sm" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * 设置默认发货地址
 */
async function setDefaultWarehouse(warehouseId) {
    try {
        const response = await fetch(`/api/tenant/warehouses/${warehouseId}/set_default`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('已设为默认地址', 'success');
            loadWarehouses();
        } else {
            showNotification(result.message || '操作失败', 'error');
        }
    } catch (error) {
        console.error('[Logistics] 设置默认地址失败:', error);
        showNotification('操作失败', 'error');
    }
}

/**
 * 编辑发货地址
 */
function editWarehouse(warehouseId) {
    showNotification('编辑功能开发中', 'info');
}

/**
 * 删除发货地址
 */
async function deleteWarehouse(warehouseId) {
    if (!confirm('确定要删除该发货地址吗？')) return;
    
    try {
        const response = await fetch(`/api/tenant/warehouses/${warehouseId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('删除成功', 'success');
            loadWarehouses();
        } else {
            showNotification(result.message || '删除失败', 'error');
        }
    } catch (error) {
        console.error('[Logistics] 删除失败:', error);
        showNotification('删除操作失败', 'error');
    }
}

// ===================== 工具函数 =====================

/**
 * 显示通知
 */
function showNotification(message, type = 'info') {
    // showMessage函数不存在，直接使用alert
    console.log(`[通知] ${type}: ${message}`);
    alert(message);
}



// 新增发货地址弹窗
window.openAddWarehouseModal = function() {
    const modalHTML = `
        <div id="add-warehouse-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center px-4 hidden modal" style="z-index: 10000 !important;">
            <div class="relative w-full max-w-lg shadow-lg rounded-md bg-white p-5 max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4 pb-3 border-b">
                    <h3 class="text-lg font-bold text-gray-900"><i class="fas fa-warehouse mr-2 text-green-600"></i>新增发货地址</h3>
                    <button type="button" class="text-gray-400 hover:text-gray-500" onclick="closeModal('add-warehouse-modal')">
                        <span class="text-2xl">&times;</span>
                    </button>
                </div>
                <form id="add-warehouse-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">地址名称 <span class="text-red-500">*</span></label>
                        <input type="text" class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="warehouse_name" required 
                               placeholder="如：北京总仓、上海分仓">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">联系人 <span class="text-red-500">*</span></label>
                        <input type="text" class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="contact" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">联系电话 <span class="text-red-500">*</span></label>
                        <input type="text" class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="phone" required placeholder="11位手机号">
                    </div>
                    
                    <!-- 省市区三级联动 -->
                    <div class="grid grid-cols-3 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">省份 <span class="text-red-500">*</span></label>
                            <select id="warehouse-province" class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="province" required>
                                <option value="">请选择</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">城市 <span class="text-red-500">*</span></label>
                            <select id="warehouse-city" class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="city" required disabled>
                                <option value="">请选择</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">区/县 <span class="text-red-500">*</span></label>
                            <select id="warehouse-district" class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="district" required disabled>
                                <option value="">请选择</option>
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">详细地址 <span class="text-red-500">*</span></label>
                        <textarea class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="address" required rows="3" placeholder="请输入街道、楼栋号、房间号等详细信息"></textarea>
                    </div>
                    <div class="flex items-center">
                        <input type="checkbox" name="is_default" value="1" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                        <label class="ml-2 block text-sm text-gray-700">设为默认发货地址</label>
                    </div>
                    <div class="flex justify-end space-x-3 pt-4 border-t">
                        <button type="button" onclick="closeModal('add-warehouse-modal')" class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
                        <button type="submit" class="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700">保存</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 初始化省市区联动
    initWarehouseRegionSelector();
    
    // 绑定form submit事件
    document.getElementById('add-warehouse-form').addEventListener('submit', function(e) {
        e.preventDefault();
        submitWarehouse();
    });
    
    openModal('add-warehouse-modal');
};

// 提交新增发货地址
window.submitWarehouse = async function() {
    const form = document.getElementById('add-warehouse-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // 处理checkbox
    data.is_default = data.is_default ? 1 : 0;
    
    try {
        const response = await fetch('/api/tenant/warehouses', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        const result = await response.json();
        
        if (result.success) {
            closeModal('add-warehouse-modal');
            alert('添加成功！');
            loadWarehouses();
        } else {
            alert(result.message || '添加失败');
        }
    } catch (error) {
        console.error('添加失败:', error);
        alert('添加失败');
    }
};

// ===================== 省市区三级联动数据 =====================
const CHINA_REGIONS = {
    '北京市': {
        '北京市': ['东城区', '西城区', '朝阳区', '丰台区', '石景山区', '海淀区', '门头沟区', '房山区', '通州区', '顺义区', '昌平区', '大兴区', '怀柔区', '平谷区', '密云区', '延庆区']
    },
    '上海市': {
        '上海市': ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区', '宝山区', '嘉定区', '浦东新区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区']
    },
    '广东省': {
        '广州市': ['越秀区', '海珠区', '荔湾区', '天河区', '白云区', '黄埔区', '番禺区', '花都区', '南沙区', '增城区', '从化区'],
        '深圳市': ['罗湖区', '福田区', '南山区', '宝安区', '龙岗区', '盐田区', '坤山新区', '龙华区', '光明区'],
        '东莞市': ['东城街道', '南城街道', '莫鹤街道', '塘厦镇', '长安镇', '虎门镇', '松山湖', '常平镇'],
        '佛山市': ['禅城区', '南海区', '顾德区', '三水区', '高明区'],
        '珠海市': ['香洲区', '斗门区', '金湾区'],
        '中山市': ['东区', '西区', '南区', '五桂区', '火炬开发区'],
        '惠州市': ['惠城区', '惠阳区', '惠东县', '博罗县', '龙门县'],
        '江门市': ['蓬江区', '江海区', '新会区', '台山市', '开平市', '恩平市', '鹤山市']
    },
    '浙江省': {
        '杭州市': ['上城区', '拱墟区', '西湖区', '滨江区', '萧山区', '余杭区', '富阳区', '临安区', '钱塘区', '桐庐县', '淳安县', '建德市'],
        '宁波市': ['海曙区', '江北区', '北仑区', '镇海区', '鲞州区', '奉化区', '余姚市', '慈溪市', '宁海县', '象山县'],
        '温州市': ['鹿城区', '龙湾区', '瓯海区', '洞头区', '永嘉县', '平阳县', '苍南县', '文成县', '泰顺县', '瑞安市', '乐清市'],
        '绍兴市': ['越城区', '柯桥区', '上虞区', '诸暨市', '嵊州市', '新昌县'],
        '嘉兴市': ['南湖区', '秀洲区', '嘉善县', '海盐县', '海宁市', '平湖市', '桐乡市'],
        '湖州市': ['吴兴区', '南浔区', '德清县', '长兴县', '安吉县'],
        '金华市': ['婺城区', '金东区', '武义县', '浦江县', '磐安县', '兰溪市', '义乌市', '东阳市', '永康市'],
        '衢州市': ['柯城区', '衢江区', '常山县', '开化县', '龙游县', '江山市'],
        '台州市': ['椒江区', '黄岩区', '路桥区', '三门县', '天台县', '仙居县', '温岭市', '临海市', '玉环市'],
        '丽水市': ['莲都区', '青田县', '缙云县', '遂昌县', '松阳县', '云和县', '庆元县', '景宁畲族自治县', '龙泉市'],
        '舟山市': ['定海区', '普陀区', '岱山县', '嵊泗县']
    },
    '江苏省': {
        '南京市': ['玄武区', '秦淮区', '建邺区', '鼓楼区', '栖霞区', '雨花台区', '江宁区', '浦口区', '六合区', '溧水区', '高淳区'],
        '苏州市': ['姑苏区', '虎丘区', '吴中区', '相城区', '吴江区', '昆山市', '太仓市', '常熟市', '张家港市'],
        '无锡市': ['梁溪区', '锡山区', '惠山区', '滨湖区', '江阴市', '宜兴市'],
        '常州市': ['天宁区', '钟楼区', '新北区', '武进区', '金坛区', '溧阳市'],
        '南通市': ['崇川区', '海门区', '通州区', '启东市', '海安市', '如皋市'],
        '连云港市': ['连云区', '海州区', '赣榆区', '东海县', '灌云县', '灌南县'],
        '淮安市': ['清江浦区', '淮阴区', '淮安区', '涂阳县', '洪泽县', '盱眙县', '金湖县'],
        '盐城市': ['亭湖区', '盐都区', '大丰区', '响水县', '滨海县', '阜宁县', '射阳县', '建湖县', '东台市'],
        '扬州市': ['广陵区', '郗江区', '江都区', '宝应县', '仪征市', '高邮市'],
        '镇江市': ['京口区', '润州区', '丹徒区', '丹阳市', '扬中市', '句容市'],
        '泰州市': ['海陵区', '高港区', '姜堰区', '兴化市', '靖江市', '泰兴市'],
        '宿迁市': ['宿城区', '宿豫区', '沐阳县', '泗阳县', '泗洪县']
    },
    '山东省': {
        '青岛市': ['市南区', '市北区', '黄岛区', '崂山区', '李沧区', '城阳区', '即墨区', '胶州市', '平度市', '莱西市'],
        '济南市': ['历下区', '市中区', '槐荫区', '天桥区', '历城区', '长清区', '章丘区', '济阳区', '莱芙区', '平阴县', '商河县'],
        '烟台市': ['芝罘区', '福山区', '牟平区', '莱山区', '龙口市', '莱阳市', '莱州市', '招远市', '蓬莱区', '栖霞市', '海阳市', '长岛县'],
        '潍坊市': ['潍城区', '寒亭区', '坊子区', '奎文区', '临朐县', '昌乐县', '青州市', '诸城市', '寿光市', '安丘市', '高密市', '昌邑市'],
        '临沂市': ['兰山区', '罗庄区', '河东区', '沂南县', '郯城县', '沂水县', '兰陵县', '费县', '平邑县', '莒南县', '蒙阴县', '临沭县'],
        '淄博市': ['淄川区', '张店区', '博山区', '周村区', '临淄区', '桓台县', '高青县', '沂源县'],
        '东营市': ['东营区', '河口区', '垦利区', '利津县', '广饶县'],
        '济宁市': ['任城区', '兖州区', '微山县', '鱼台县', '金乡县', '嘉祥县', '汶上县', '泗水县', '梁山县', '曲阜市', '邹城市'],
        '泰安市': ['泰山区', '岱岳区', '宁阳县', '东平县', '新泰市', '肥城市'],
        '威海市': ['环翠区', '文登区', '荣成市', '乳山市'],
        '日照市': ['东港区', '岚山区', '五莲县', '莒县'],
        '滨州市': ['滨城区', '沾化区', '惠民县', '阳信县', '无棣县', '博兴县', '邹平市'],
        '德州市': ['德城区', '陵城区', '宁津县', '庆云县', '临邑县', '齐河县', '平原县', '夏津县', '武城县', '乐陵市', '禹城市'],
        '聊城市': ['东昌府区', '茌平区', '阳谷县', '莘县', '茌平县', '东阿县', '冠县', '高唐县', '临清市'],
        '菏泽市': ['牡丹区', '定陶区', '曹县', '单县', '成武县', '巨野县', '郓城县', '鄄城县', '东明县']
    },
    '河南省': {
        '郑州市': ['中原区', '二七区', '管城回族区', '金水区', '上街区', '惠济区', '中牟县', '巩义市', '荥阳市', '新密市', '新郑市', '登封市'],
        '洛阳市': ['老城区', '西工区', '瀍河回族区', '吉利区', '洛龙区', '孟津县', '新安县', '栾川县', '偃师县', '宜阳县', '洛宁县', '伊川县'],
        '开封市': ['龙亭区', '顺河回族区', '鼓楼区', '禹王台区', '祥符区', '兰考县', '杞县', '通许县', '尉氏县'],
        '平顶山市': ['卫东区', '石龙区', '湛河区', '宝丰县', '叶县', '鲁山县', '郏县', '舞钢市', '汝州市'],
        '安阳市': ['文峰区', '北关区', '殷都区', '龙安区', '汤阴县', '滑县', '内黄县', '林州市'],
        '鹤壁市': ['鹤山区', '山城区', '淇县', '浚县'],
        '新乡市': ['红旗区', '卫滨区', '凤泉区', '牧野区', '新乡县', '获嘉县', '原阳县', '延津县', '封丘县', '长垣市', '卫辉市', '辉县市'],
        '焦作市': ['解放区', '中站区', '马村区', '山阳区', '修武县', '博爱县', '武陟县', '温县', '沁阳市', '孟州市'],
        '濮阳市': ['华龙区', '清丰县', '南乐县', '范县', '台前县', '濮阳县'],
        '许昌市': ['魏都区', '建安区', '鄢陵县', '襄城县', '禹州市', '长葛市'],
        '漯河市': ['源汇区', '郾城区', '召陵区', '舞阳县', '临颍县'],
        '三门峡市': ['湖滨区', '陕州区', '渑池县', '卢氏县', '义马市', '灵宝市'],
        '南阳市': ['宛城区', '卧龙区', '南召县', '方城县', '西峡县', '镇平县', '内乡县', '淅川县', '社旗县', '唐河县', '新野县', '桐柏县', '邓州市'],
        '商丘市': ['梁园区', '睢阳区', '民权县', '睢县', '宁陵县', '柘城县', '虞城县', '夏邑县', '永城市'],
        '信阳市': ['浉河区', '平桥区', '罗山县', '光山县', '新县', '商城县', '固始县', '潢川县', '淮滨县', '息县'],
        '周口市': ['川汇区', '淮阳区', '扶沟县', '西华县', '商水县', '沈丘县', '郸城县', '淮阳县', '太康县', '鹿邑县', '项城市'],
        '驻马店市': ['驿城区', '西平县', '上蔡县', '平舆县', '正阳县', '确山县', '泌阳县', '汝南县', '遂平县', '新蔡县']
    },
    '湖北省': {
        '武汉市': ['江岸区', '江汉区', '硚口区', '汉阳区', '武昌区', '青山区', '洪山区', '东西湖区', '蔡甸区', '江夏区', '黄陂区', '新洲区', '汉南区'],
        '宜昌市': ['西陵区', '伍家岗区', '点军区', '猇亭区', '当阳市', '枝江市', '宜都市', '远安县', '兴山县', '秭归县', '长阳土家族自治县', '五峰土家族自治县'],
        '襄阳市': ['襄城区', '樊城区', '南漳县', '谷城县', '保康县', '老河口市', '枣阳市', '宜城市'],
        '荆州市': ['沙市区', '荆州区', '公安县', '监利县', '江陵县', '石首市', '洪湖市', '松滋市'],
        '十堰市': ['茅箭区', '张湾区', '郧阳区', '郧西县', '竹山县', '竹溪县', '房县', '丹江口市'],
        '黄冈市': ['黄州区', '团风县', '红安县', '罗田县', '英山县', '浠水县', '蕲春县', '黄梅县', '麻城市', '武穴市'],
        '孝感市': ['孝南区', '孝昌县', '大悉县', '云梦县', '应城市', '安陆市', '汉川市'],
        '咸宁市': ['咸安区', '嘉鱼县', '通城县', '崇阳县', '通山县', '赤壁市'],
        '随州市': ['曾都区', '随县', '广水市'],
        '恩施土家族苗族自治州': ['恩施市', '利川市', '建始县', '巴东县', '宣恩县', '咸丰县', '来凤县', '鹤峰县'],
        '仙桃市': ['仙桃市'],
        '潜江市': ['潜江市'],
        '天门市': ['天门市'],
        '神农架林区': ['神农架林区']
    },
    '湖南省': {
        '长沙市': ['芙蓉区', '天心区', '岳麓区', '开福区', '雨花区', '望城区', '长沙县', '浏阳市', '宁乡市'],
        '株洲市': ['荷塘区', '芦淞区', '石峰区', '天元区', '渌口县', '茶陵县', '炎陵县', '醜陵市'],
        '湘潭市': ['雨湖区', '岳塘区', '湘潭县', '湘乡市', '韶山市'],
        '衡阳市': ['珠晖区', '雁峰区', '石鼓区', '蒸湘区', '南岳区', '衡阳县', '衡南县', '衡山县', '耒阳县', '祁东县', '常宁市', '耒阳市'],
        '邵阳市': ['双清区', '大祥区', '北塔区', '邵东县', '新邵县', '邵阳县', '隆回县', '洞口县', '绥宁县', '新宁县', '城步苗族自治县', '武冈市'],
        '岳阳市': ['岳阳楼区', '云溪区', '君山区', '岳阳县', '华容县', '湘阴县', '平江县', '汨罗市', '临湘市'],
        '常德市': ['武陵区', '鼎城区', '安乡县', '汉寿县', '澧县', '临澧县', '桃源县', '石门县', '津市市'],
        '张家界市': ['永定区', '武陵源区', '慈利县', '桑植县'],
        '益阳市': ['资阳区', '赫山区', '南县', '桃江县', '安化县', '沅江市'],
        '郴州市': ['北湖区', '苏仙区', '桂阳县', '宜章县', '永兴县', '嘉禾县', '临武县', '汝城县', '桂东县', '安仁县', '资兴市'],
        '永州市': ['零陵区', '冷水滩区', '祁阳县', '东安县', '双牌县', '道县', '江永县', '宁远县', '蓝山县', '新田县', '江华瑶族自治县'],
        '怀化市': ['鹤城区', '中方县', '沅陵县', '辰溪县', '靖州苗族侗族自治县', '会同县', '麻阳苗族自治县', '新晃侗族自治县', '芗江侗族自治县', '靖州侗族苗族自治县', '通道侗族自治县', '洪江市'],
        '娄底市': ['娄星区', '双峰县', '新化县', '冷水江市', '涟源市'],
        '湘西土家族苗族自治州': ['吉首市', '泸溪县', '凤凰县', '花垣县', '保靖县', '古丈县', '永顺县', '龙山县']
    },
    '四川省': {
        '成都市': ['锦江区', '青羊区', '金牛区', '武侯区', '成华区', '龙泉驿区', '青白江区', '新都区', '温江区', '双流区', '郫都区', '崇州市', '都江堰市', '彭州市', '邵陵市', '金堂县', '大邑县', '蒲江县', '新津县', '简阳市'],
        '绵阳市': ['涪城区', '游仙区', '安州区', '三台县', '盐亭县', '梓潼县', '北川羌族自治县', '平武县', '江油市']
    },
    '重庆市': {
        '重庆市': ['渝中区', '渝北区', '渝东区', '渝西区', '南岸区', '北碚区', '南碚区', '巴南区', '江北区', '沙坪坝区', '九龙坡区', '大渡口区', '渝中区', '渝北区', '渝东区', '渝西区']
    },
    '陕西省': {
        '西安市': ['新城区', '碑林区', '莲湖区', '灰埕区', '未央区', '雁塔区', '高陵区', '鄙邑区', '长安区', '蓝田县', '周至县', '户县', '高陵区']
    },
    '天津市': {
        '天津市': ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '东丽区', '西青区', '津南区', '北辰区', '武清区', '宝坻区', '宁河区', '静海区', '蓟县', '宝坡区']
    },
    '河北省': {
        '石家庄市': ['长安区', '桥西区', '新华区', '裕华区', '藁城区', '井陉矿区', '栈城区', '鹿泉区', '藁城区', '正定县', '行唐县', '灵寿县', '高邑县', '赞皇县', '无极县'],
        '唐山市': ['路南区', '路北区', '古冶区', '开平区', '丰南区', '丰润区', '曹妃甸区', '滦州市', '滦南县', '乐亭县', '迁西县', '玉田县', '遵化县', '迁安市']
    },
    '福建省': {
        '福州市': ['鼓楼区', '台江区', '仓山区', '马尾区', '晋安区', '长乐区', '闽侯区', '闽清县', '连江县', '罗源县', '闽侯县', '永泰县', '福清市'],
        '厦门市': ['思明区', '海沧区', '湖里区', '集美区', '同安区', '翔安区'],
        '泉州市': ['鲤城区', '丰泽区', '洛江区', '泉港区', '洗江区', '惠安县', '安溪县', '永春县', '德化县', '金门县', '石狮市', '南安市', '晋江市']
    },
    '安徽省': {
        '合肥市': ['瑶海区', '庐阳区', '蜀山区', '包河区', '长丰县', '肥东县', '肥西县', '庐江县', '巢湖市'],
        '芍湖市': ['镜湖区', '弋江区', '鸠江区', '三山区', '苜湖县', '繁昌县', '南陵县', '无为县']
    },
    '江西省': {
        '南昌市': ['东湖区', '西湖区', '青云谱区', '青山湖区', '新建区', '红谷滩区', '南昌县', '进贤县', '安义县'],
        '赣州市': ['章贡区', '南康区', '赣县', '南康市', '瑞金市', '于都县', '宁都县', '会昌县', '寻乌县', '石城县', '安远县', '龙南县']
    },
    '辽宁省': {
        '沈阳市': ['和平区', '沈河区', '大东区', '皇姑区', '铁西区', '苏家屯区', '浑南区', '沈北区', '于洪区', '辽中县', '康平县', '法库县', '新民市'],
        '大连市': ['中山区', '西岗区', '沙河口区', '甘井子区', '旅顺口区', '金州区', '普兰店区', '瓦房店市', '庄河市', '长海县']
    },
    '吉林省': {
        '长春市': ['南关区', '宽城区', '朝阳区', '二道区', '绿园区', '双阳区', '九台区', '农安县', '德惠市', '榆树市']
    },
    '黑龙江省': {
        '哈尔滨市': ['道里区', '南岗区', '道外区', '香坊区', '平房区', '松北区', '呼兰区', '阿城区', '双城区', '呼兰县', '宾县', '巴彦县', '木兰县', '通河县', '延寿县', '尚志市', '依兰县']
    },
    '山西省': {
        '太原市': ['小店区', '迎泽区', '杏花岭区', '尖草坪区', '万柏林区', '晋源区', '清徐县', '阳曲县', '娄烦县', '古交县']
    },
    '云南省': {
        '昆明市': ['五华区', '盘龙区', '官渡区', '西山区', '东川区', '呈贡区', '晋宁区', '富民县', '宜良县', '嵩明县', '石林彝族自治县', '禄劝彝族苗族自治县', '寻甸回族彝族自治县', '安宁市']
    },
    '贵州省': {
        '贵阳市': ['南明区', '云岩区', '花溪区', '乌当区', '白云区', '观山湖区', '开阳县', '息烽县', '修文县', '清镇县']
    },
    '海南省': {
        '海口市': ['秀英区', '龙华区', '琼山区', '美兰区'],
        '三亚市': ['海棠区', '吉阳区', '天涯区', '崖州区']
    },
    '内蒙古自治区': {
        '呼和浩特市': ['新城区', '回民区', '玉泉区', '赛罕区', '土默特左旗', '托克托县', '和林格尔县', '清水河县', '武川县']
    }
};

// 初始化仓库地址的省市区选择器
function initWarehouseRegionSelector() {
    const provinceSelect = document.getElementById('warehouse-province');
    const citySelect = document.getElementById('warehouse-city');
    const districtSelect = document.getElementById('warehouse-district');
    
    if (!provinceSelect || !citySelect || !districtSelect) {
        console.error('省市区选择器初始化失败：未找到元素');
        return;
    }
    
    // 填充省份
    Object.keys(CHINA_REGIONS).sort().forEach(province => {
        const option = document.createElement('option');
        option.value = province;
        option.textContent = province;
        provinceSelect.appendChild(option);
    });
    
    // 省份变化时更新城市
    provinceSelect.addEventListener('change', function() {
        const selectedProvince = this.value;
        
        // 清空城市和区县
        citySelect.innerHTML = '<option value="">请选择</option>';
        districtSelect.innerHTML = '<option value="">请选择</option>';
        districtSelect.disabled = true;
        
        if (selectedProvince && CHINA_REGIONS[selectedProvince]) {
            citySelect.disabled = false;
            const cities = CHINA_REGIONS[selectedProvince];
            Object.keys(cities).sort().forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });
        } else {
            citySelect.disabled = true;
        }
    });
    
    // 城市变化时更新区县
    citySelect.addEventListener('change', function() {
        const selectedProvince = provinceSelect.value;
        const selectedCity = this.value;
        
        // 清空区县
        districtSelect.innerHTML = '<option value="">请选择</option>';
        
        if (selectedProvince && selectedCity && CHINA_REGIONS[selectedProvince][selectedCity]) {
            districtSelect.disabled = false;
            const districts = CHINA_REGIONS[selectedProvince][selectedCity];
            districts.sort().forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
            });
        } else {
            districtSelect.disabled = true;
        }
    });
}

// ===================== 全局导出 =====================
window.initLogisticsAccountsPage = initLogisticsAccountsPage;
window.loadLogisticsAccounts = loadLogisticsAccounts;
window.authorizeLogisticsAccount = authorizeLogisticsAccount;
window.editLogisticsAccount = editLogisticsAccount;
window.deleteLogisticsAccount = deleteLogisticsAccount;
window.openAddLogisticsAccountModal = openAddLogisticsAccountModal;  // 新增导出
window.submitLogisticsAccount = submitLogisticsAccount;  // 新增导出

window.initWarehousesPage = initWarehousesPage;
window.loadWarehouses = loadWarehouses;
window.setDefaultWarehouse = setDefaultWarehouse;
window.editWarehouse = editWarehouse;
window.deleteWarehouse = deleteWarehouse;
window.openAddWarehouseModal = openAddWarehouseModal;  // 新增导出
window.submitWarehouse = submitWarehouse;  // 新增导出

console.log('[Logistics] 租户物流管理模块加载完成 v2.0.0');
