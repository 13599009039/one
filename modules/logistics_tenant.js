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
    await loadLogisticsAccounts();
    await loadExpressCompanies();
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
                <td colspan="7" class="px-6 py-12 text-center text-gray-500">
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
        const authStatusMap = {
            'unauthorized': { label: '未授权', class: 'bg-gray-100 text-gray-600' },
            'authorized': { label: '已授权', class: 'bg-green-100 text-green-600' },
            'expired': { label: '已过期', class: 'bg-red-100 text-red-600' }
        };
        
        const statusInfo = authStatusMap[account.auth_status] || authStatusMap['unauthorized'];
        const isDefault = account.is_default === 1;
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3">
                    <div class="font-medium text-gray-800">${account.cp_name || '-'}</div>
                    <div class="text-xs text-gray-400">${account.cp_code || ''}</div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${account.branch_name || '默认网点'}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${account.partner_id || '-'}
                </td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 text-xs rounded-full ${statusInfo.class}">
                        ${statusInfo.label}
                    </span>
                </td>
                <td class="px-4 py-3">
                    ${isDefault ? '<span class="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">默认</span>' : '-'}
                </td>
                <td class="px-4 py-3 text-sm text-gray-400">
                    ${account.created_at || '-'}
                </td>
                <td class="px-4 py-3 text-right space-x-2">
                    ${account.auth_status !== 'authorized' ? `
                        <button onclick="authorizeLogisticsAccount(${account.id})" 
                                class="text-blue-600 hover:text-blue-800 text-sm" title="授权">
                            <i class="fas fa-key"></i>
                        </button>
                    ` : ''}
                    <button onclick="editLogisticsAccount(${account.id})" 
                            class="text-green-600 hover:text-green-800 text-sm" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteLogisticsAccount(${account.id})" 
                            class="text-red-600 hover:text-red-800 text-sm" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
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
 * 授权物流账号
 */
async function authorizeLogisticsAccount(accountId) {
    try {
        const response = await fetch(`/api/tenant/logistics_accounts/${accountId}/auth`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.auth_url) {
            // 打开菜鸟授权页面
            const authWindow = window.open(result.auth_url, '_blank', 'width=800,height=600');
            
            // 监听授权回调
            window.addEventListener('message', function(event) {
                if (event.data.type === 'auth_success' && event.data.account_id == accountId) {
                    showNotification('授权成功', 'success');
                    loadLogisticsAccounts();
                }
            });
        } else {
            showNotification(result.message || '生成授权链接失败', 'error');
        }
    } catch (error) {
        console.error('[Logistics] 授权失败:', error);
        showNotification('授权操作失败', 'error');
    }
}

/**
 * 编辑物流账号
 */
function editLogisticsAccount(accountId) {
    showNotification('编辑功能开发中', 'info');
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

// ===================== 发货地址管理 =====================

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
    if (typeof window.showMessage === 'function') {
        window.showMessage(message, type);
    } else if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        console.log(`[通知] ${type}: ${message}`);
        alert(message);
    }
}

// 新增物流账号弹窗
window.openAddLogisticsAccountModal = function() {
    const modalHTML = `
        <div id="add-logistics-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center px-4 hidden modal" style="z-index: 10000 !important;">
            <div class="relative w-full max-w-lg shadow-lg rounded-md bg-white p-5 max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4 pb-3 border-b">
                    <h3 class="text-lg font-bold text-gray-900"><i class="fas fa-truck mr-2 text-blue-600"></i>新增物流账号</h3>
                    <button type="button" class="text-gray-400 hover:text-gray-500" onclick="closeModal('add-logistics-modal')">
                        <span class="text-2xl">&times;</span>
                    </button>
                </div>
                <form id="add-logistics-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">快递公司 <span class="text-red-500">*</span></label>
                        <select class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="cp_code" required>
                            <option value="">请选择</option>
                            <option value="ZTO">中通快递</option>
                            <option value="YTO">圆通快递</option>
                            <option value="YD">韵达快递</option>
                            <option value="SF">顺丰速运</option>
                            <option value="STO">申通快递</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">网点/分部名称</label>
                        <input type="text" class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="branch_name" 
                               placeholder="如：北京一部、上海分公司（可为空则显示默认网点）">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">快递客户编码 <span class="text-red-500">*</span></label>
                        <input type="text" class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="partner_id" 
                               placeholder="快递公司提供的partner_id" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">账号</label>
                        <input type="text" class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="account">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">密码/密钥</label>
                        <input type="password" class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="password">
                    </div>
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p class="text-sm text-blue-800"><i class="fas fa-info-circle mr-1"></i>添加后需要完成菜鸟授权才能使用</p>
                    </div>
                    <div class="flex justify-end space-x-3 pt-4 border-t">
                        <button type="button" onclick="closeModal('add-logistics-modal')" class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
                        <button type="submit" class="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700">添加并授权</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 绑定form submit事件
    document.getElementById('add-logistics-form').addEventListener('submit', function(e) {
        e.preventDefault();
        submitLogisticsAccount();
    });
    
    openModal('add-logistics-modal');  // 使用utils.js中的openModal而非jQuery
};

// 提交新增物流账号
window.submitLogisticsAccount = async function() {
    const form = document.getElementById('add-logistics-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch('/api/tenant/logistics_accounts', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        const result = await response.json();
        
        if (result.success) {
            closeModal('add-logistics-modal');
            showMessage('添加成功！', 'success');
            loadLogisticsAccounts();
        } else {
            showMessage(result.message || '添加失败', 'error');
        }
    } catch (error) {
        console.error('添加失败:', error);
        showMessage('添加失败', 'error');
    }
};

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
                        <input type="text" class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="name" required 
                               placeholder="如：北京总仓、上海分仓">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">联系人 <span class="text-red-500">*</span></label>
                        <input type="text" class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="contact" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">联系电话 <span class="text-red-500">*</span></label>
                        <input type="text" class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="contact_phone" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">省份 <span class="text-red-500">*</span></label>
                        <input type="text" class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="province" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">城市 <span class="text-red-500">*</span></label>
                        <input type="text" class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="city" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">区/县 <span class="text-red-500">*</span></label>
                        <input type="text" class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="district" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">详细地址 <span class="text-red-500">*</span></label>
                        <textarea class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="address" required rows="3"></textarea>
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
            showMessage('添加成功！', 'success');
            loadWarehouses();
        } else {
            showMessage(result.message || '添加失败', 'error');
        }
    } catch (error) {
        console.error('添加失败:', error);
        showMessage('添加失败', 'error');
    }
};

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
