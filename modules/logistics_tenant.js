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
                        <input type="text" class="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500" name="contact_phone" required placeholder="11位手机号">
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
        '杭州市': ['上城区', '下城区', '江干区', '拱墅区', '西湖区', '滨江区', '萧山区', '余杭区', '富阳区', '临安区', '桐庐市', '建德市', '淳安县'],
        '宁波市': ['海曙区', '江北区', '北仑区', '镇海区', '鲑州区', '奉化区', '余姚市', '慈溪市', '宁海市', '象山县'],
        '温州市': ['鹿城区', '龙湾区', '瓯海区', '洞头区', '永嘉市', '瑞安市', '乐清市', '苍南县', '平阳县', '泰顺县', '文成县'],
        '绍兴市': ['越城区', '柯桥区', '上虑区', '诸暨市', '嵊州市', '新昌县']
    },
    '江苏省': {
        '南京市': ['玄武区', '秦淮区', '建邺区', '鼓楼区', '栖霞区', '雨花台区', '江宁区', '浦口区', '六合区', '溧水区', '高淳区'],
        '苏州市': ['姑苏区', '虎丘区', '吴中区', '相城区', '吴江区', '昆山市', '太仓市', '常熟市', '张家港市'],
        '无锡市': ['梁溪区', '锡山区', '惠山区', '滨湖区', '江阴市', '宜兴市'],
        '常州市': ['天宁区', '钟楼区', '新北区', '武进区', '金坛区', '溧阳市'],
        '南通市': ['崇川区', '海门区', '通州区', '启东市', '海安市', '如皋市']
    },
    '山东省': {
        '青岛市': ['市南区', '市北区', '黄岛区', '崂山区', '李沧区', '城阳区', '即墨区', '胶州市', '平度市', '莱西市'],
        '济南市': ['历下区', '市中区', '槐荫区', '天桥区', '历城区', '长清区', '章丘区', '济阳区', '莆中区', '平阴区', '商河县'],
        '烟台市': ['芗苝区', '福山区', '牡丹区', '莱山区', '龙口市', '莱阳市', '莱州市', '招远市', '蓬莱市', '栖霞市', '海阳市', '长岛县'],
        '潍坊市': ['潍城区', '寒亭区', '坊城区', '奎文区', '临朐市', '诸城市', '高密市', '安丘市', '昌邑县', '昌乐县'],
        '临沂市': ['兰山区', '罗庄区', '河东区', '郯城区', '兰陵县', '费县', '平邑县', '蒙阴县', '临沭县']
    },
    '河南省': {
        '郑州市': ['中原区', '二七区', '管城回族区', '金水区', '上街区', '惠济区', '中牟县', '巩义市', '荥阳市', '新密市', '新郑市', '登封市'],
        '洛阳市': ['老城区', '西工区', '瀍河回族区', '吉利区', '洛龙区', '孟津县', '新安县', '栾川县', '偃师县', '宜阳县', '洛宁县'],
        '开封市': ['龙亭区', '顺河回族区', '鼓楼区', '禹王台区', '祥符区', '兰考县', '杞县', '通许县', '尉氏县']
    },
    '湖北省': {
        '武汉市': ['江岸区', '江汉区', '硚口区', '汉阳区', '武昌区', '青山区', '洪山区', '东西湖区', '蔡甸区', '江夏区', '黄陂区', '新洲区', '汉南区'],
        '宜昌市': ['西陵区', '伍家岗区', '点军区', '猇亭区', '当阳市', '枝江市', '宜都市'],
        '襄阳市': ['襄城区', '樊城区', '南漳区', '谷城区', '保康县', '老河口市', '枣阳市']
    },
    '湖南省': {
        '长沙市': ['芝麻区', '天心区', '岳麓区', '开福区', '雨花区', '望城区', '长沙县', '浏阳市', '宁乡市'],
        '株洲市': ['荷塘区', '芦淞区', '石峰区', '天元区', '渌县', '茶陵县', '炎陵县', '醴陵市']
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
