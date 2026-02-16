/**
 * 物流管理模块 - logistics.js
 * 功能: 物流订单列表、物流配置管理、面单打印模板
 * 版本: 1.0.0
 */

// ===================== 模块状态管理 =====================
const LogisticsModule = {
    // 当前页面状态
    currentPage: 'orders',  // orders | config | templates
    
    // 分页状态
    ordersPage: 1,
    ordersPageSize: 20,
    ordersTotal: 0,
    
    // 筛选状态
    ordersFilter: {
        status: '',
        platform: '',
        search: ''
    },
    
    // 平台列表缓存
    platformsCache: [],
    
    // 配置列表缓存
    configsCache: [],
    
    // 当前选中的平台（配置页面）
    selectedPlatform: null,
    
    // 物流状态映射
    statusMap: {
        'pending': { label: '待发货', class: 'bg-gray-100 text-gray-600' },
        'shipped': { label: '已发货', class: 'bg-blue-100 text-blue-600' },
        'in_transit': { label: '运输中', class: 'bg-yellow-100 text-yellow-600' },
        'delivered': { label: '已签收', class: 'bg-green-100 text-green-600' },
        'exception': { label: '异常', class: 'bg-red-100 text-red-600' },
        'returned': { label: '退回', class: 'bg-purple-100 text-purple-600' }
    }
};

// ===================== 页面初始化 =====================

/**
 * 初始化物流订单列表页面
 */
function initLogisticsOrdersPage() {
    console.log('[Logistics] 初始化物流订单列表页面 - 重定向到物流账号管理');
    LogisticsModule.currentPage = 'orders';
    
    // V2.0: 调用新的租户物流账号管理页面
    if (typeof initLogisticsAccountsPage === 'function') {
        initLogisticsAccountsPage();
    } else {
        console.error('[Logistics] initLogisticsAccountsPage 函数未定义，请检查 logistics_tenant.js 是否正确加载');
    }
}

/**
 * 初始化物流配置管理页面
 */
function initLogisticsConfigPage() {
    console.log('[Logistics] 初始化物流配置管理页面 - 重定向到物流账号管理');
    LogisticsModule.currentPage = 'config';
    
    // V2.0: 调用新的租户物流账号管理页面
    if (typeof initLogisticsAccountsPage === 'function') {
        initLogisticsAccountsPage();
    } else {
        console.error('[Logistics] initLogisticsAccountsPage 函数未定义');
    }
}

/**
 * 初始化面单打印模板页面
 */
function initLogisticsTemplatesPage() {
    console.log('[Logistics] 初始化面单打印模板页面 - 重定向到发货地址管理');
    LogisticsModule.currentPage = 'templates';
    
    // V2.0: 调用新的租户发货地址管理页面
    if (typeof initWarehousesPage === 'function') {
        initWarehousesPage();
    } else {
        console.error('[Logistics] initWarehousesPage 函数未定义');
    }
}

// ===================== 物流订单列表 =====================

/**
 * 加载物流订单列表
 */
async function loadLogisticsOrders() {
    const container = document.getElementById('logisticsOrdersTableBody');
    if (!container) return;
    
    // 显示加载状态
    container.innerHTML = `
        <tr>
            <td colspan="9" class="px-6 py-8 text-center text-gray-500">
                <i class="fas fa-spinner fa-spin mr-2"></i>加载中...
            </td>
        </tr>
    `;
    
    try {
        const params = new URLSearchParams({
            page: LogisticsModule.ordersPage,
            page_size: LogisticsModule.ordersPageSize,
            status: LogisticsModule.ordersFilter.status,
            platform: LogisticsModule.ordersFilter.platform,
            search: LogisticsModule.ordersFilter.search
        });
        
        const response = await fetch(`/api/tenant/logistics_accounts?${params}`, {
            credentials: 'include'
        });
        
        // 添加响应状态检查
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            LogisticsModule.ordersTotal = result.total;
            renderLogisticsOrders(result.data);
            renderLogisticsOrdersPagination();
        } else {
            container.innerHTML = `
                <tr>
                    <td colspan="9" class="px-6 py-8 text-center text-red-500">
                        加载失败: ${result.message}
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('[Logistics] 加载订单失败:', error);
        
        // 区分错误类型，给出友好提示
        let errorMsg = '网络错误，请稍后重试';
        if (error.message.includes('HTTP 404')) {
            errorMsg = '接口不存在，请联系管理员';
        } else if (error.message.includes('HTTP 401')) {
            errorMsg = '未登录或登录已过期';
        } else if (error.message.includes('HTTP 403')) {
            errorMsg = '无权访问该资源';
        } else if (error.message.includes('HTTP 500')) {
            errorMsg = '服务器内部错误';
        }
        
        container.innerHTML = `
            <tr>
                <td colspan="9" class="px-6 py-8 text-center text-red-500">
                    <i class="fas fa-exclamation-circle mr-2"></i>${errorMsg}
                    <button onclick="loadLogisticsOrders()" class="ml-4 text-blue-600 hover:underline">
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
                <td colspan="9" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-box-open text-4xl mb-4 text-gray-300"></i>
                    <p>暂无物流订单</p>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = orders.map(order => {
        const statusInfo = LogisticsModule.statusMap[order.status] || { label: order.status, class: 'bg-gray-100 text-gray-600' };
        const isException = order.status === 'exception';
        
        return `
            <tr class="${isException ? 'bg-red-50' : 'hover:bg-gray-50'}">
                <td class="px-4 py-3">
                    <a href="javascript:void(0)" onclick="viewOrderDetail(${order.order_id})" 
                       class="text-blue-600 hover:underline font-medium">
                        ${order.order_no || '-'}
                    </a>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${order.platform_name || order.platform || '-'}
                    ${order.carrier ? `<br><span class="text-gray-400">${order.carrier}</span>` : ''}
                </td>
                <td class="px-4 py-3">
                    ${order.logistics_no ? `
                        <a href="javascript:void(0)" onclick="openTrackUrl('${order.carrier_code || ''}', '${order.logistics_no}')" 
                           class="text-blue-600 hover:underline text-sm">
                            ${order.logistics_no}
                        </a>
                    ` : '<span class="text-gray-400">-</span>'}
                </td>
                <td class="px-4 py-3 text-sm">
                    <div class="text-gray-800">${order.receiver_name || '-'}</div>
                    <div class="text-gray-400">${order.receiver_phone || '-'}</div>
                    <div class="text-gray-400 text-xs truncate max-w-xs" title="${order.receiver_address || ''}">
                        ${order.receiver_address || '-'}
                    </div>
                </td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 text-xs rounded-full ${statusInfo.class}">
                        ${statusInfo.label}
                    </span>
                    ${isException && order.exception_reason ? `
                        <div class="text-xs text-red-500 mt-1" title="${order.exception_reason}">
                            ${order.exception_reason.substring(0, 20)}${order.exception_reason.length > 20 ? '...' : ''}
                        </div>
                    ` : ''}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${order.last_track_desc ? `
                        <div class="text-xs">${order.last_track_time || ''}</div>
                        <div class="text-gray-500 truncate max-w-xs" title="${order.last_track_desc}">
                            ${order.last_track_desc.substring(0, 30)}${order.last_track_desc.length > 30 ? '...' : ''}
                        </div>
                    ` : '<span class="text-gray-400">-</span>'}
                </td>
                <td class="px-4 py-3 text-right space-x-2">
                    <button onclick="viewLogisticsTrack(${order.id})" 
                            class="text-blue-600 hover:text-blue-800 text-sm" title="查看轨迹">
                        <i class="fas fa-route"></i>
                    </button>
                    <button onclick="printLogisticsWaybill(${order.id})" 
                            class="text-green-600 hover:text-green-800 text-sm" title="打印面单">
                        <i class="fas fa-print"></i>
                    </button>
                    <button onclick="markLogisticsException(${order.id})" 
                            class="text-red-600 hover:text-red-800 text-sm" title="标记异常">
                        <i class="fas fa-exclamation-triangle"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * 渲染分页
 */
function renderLogisticsOrdersPagination() {
    const container = document.getElementById('logisticsOrdersPagination');
    if (!container) return;
    
    const totalPages = Math.ceil(LogisticsModule.ordersTotal / LogisticsModule.ordersPageSize);
    const currentPage = LogisticsModule.ordersPage;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let pages = [];
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        pages.push(i);
    }
    
    container.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">
                共 ${LogisticsModule.ordersTotal} 条记录
            </div>
            <div class="flex space-x-1">
                <button onclick="goLogisticsOrdersPage(1)" 
                        class="px-3 py-1 text-sm rounded ${currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}"
                        ${currentPage === 1 ? 'disabled' : ''}>
                    首页
                </button>
                <button onclick="goLogisticsOrdersPage(${currentPage - 1})" 
                        class="px-3 py-1 text-sm rounded ${currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}"
                        ${currentPage === 1 ? 'disabled' : ''}>
                    上一页
                </button>
                ${pages.map(p => `
                    <button onclick="goLogisticsOrdersPage(${p})" 
                            class="px-3 py-1 text-sm rounded ${p === currentPage ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}">
                        ${p}
                    </button>
                `).join('')}
                <button onclick="goLogisticsOrdersPage(${currentPage + 1})" 
                        class="px-3 py-1 text-sm rounded ${currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}"
                        ${currentPage === totalPages ? 'disabled' : ''}>
                    下一页
                </button>
                <button onclick="goLogisticsOrdersPage(${totalPages})" 
                        class="px-3 py-1 text-sm rounded ${currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}"
                        ${currentPage === totalPages ? 'disabled' : ''}>
                    末页
                </button>
            </div>
        </div>
    `;
}

/**
 * 跳转页面
 */
function goLogisticsOrdersPage(page) {
    if (page < 1) page = 1;
    const totalPages = Math.ceil(LogisticsModule.ordersTotal / LogisticsModule.ordersPageSize);
    if (page > totalPages) page = totalPages;
    
    LogisticsModule.ordersPage = page;
    loadLogisticsOrders();
}

/**
 * 筛选物流订单
 */
function filterLogisticsOrders() {
    const statusEl = document.getElementById('logisticsStatusFilter');
    const platformEl = document.getElementById('logisticsPlatformFilter');
    const searchEl = document.getElementById('logisticsSearchInput');
    
    LogisticsModule.ordersFilter.status = statusEl?.value || '';
    LogisticsModule.ordersFilter.platform = platformEl?.value || '';
    LogisticsModule.ordersFilter.search = searchEl?.value || '';
    LogisticsModule.ordersPage = 1;
    
    loadLogisticsOrders();
}

/**
 * 查看物流轨迹
 */
async function viewLogisticsTrack(orderId) {
    try {
        const response = await fetch(`/api/tenant/logistics_accounts/${orderId}/track`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        
        if (result.success) {
            showTrackModal(result.data);
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('[Logistics] 获取轨迹失败:', error);
        let errorMsg = '获取轨迹失败';
        if (error.message.includes('HTTP')) {
            errorMsg = '服务异常，请稍后重试';
        }
        showNotification(errorMsg, 'error');
    }
}

/**
 * 显示轨迹弹窗
 */
function showTrackModal(data) {
    const modal = document.getElementById('logisticsTrackModal');
    if (!modal) return;
    
    const titleEl = document.getElementById('trackModalTitle');
    const contentEl = document.getElementById('trackModalContent');
    
    if (titleEl) {
        titleEl.textContent = `物流轨迹 - ${data.logistics_no || ''}`;
    }
    
    if (contentEl) {
        const trackList = data.track_list || [];
        
        contentEl.innerHTML = `
            <div class="mb-4 p-3 bg-gray-50 rounded">
                <div class="flex justify-between text-sm">
                    <span class="text-gray-500">承运商:</span>
                    <span class="text-gray-800">${data.carrier || '-'}</span>
                </div>
                <div class="flex justify-between text-sm mt-1">
                    <span class="text-gray-500">运单号:</span>
                    <span class="text-gray-800">${data.logistics_no || '-'}</span>
                </div>
                <div class="flex justify-between text-sm mt-1">
                    <span class="text-gray-500">收件人:</span>
                    <span class="text-gray-800">${data.receiver_name || '-'} ${data.receiver_phone || ''}</span>
                </div>
            </div>
            
            <div class="space-y-3">
                ${trackList.length === 0 ? `
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-route text-3xl mb-2"></i>
                        <p>暂无物流轨迹信息</p>
                    </div>
                ` : trackList.map((track, index) => `
                    <div class="flex">
                        <div class="flex-shrink-0 w-3 flex flex-col items-center">
                            <div class="w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'}"></div>
                            ${index < trackList.length - 1 ? '<div class="w-0.5 flex-1 bg-gray-200 my-1"></div>' : ''}
                        </div>
                        <div class="ml-3 pb-3">
                            <div class="text-xs text-gray-400">${track.time || ''}</div>
                            <div class="text-sm text-gray-700 mt-1">${track.desc || track.context || ''}</div>
                            ${track.location ? `<div class="text-xs text-gray-400">${track.location}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    modal.classList.remove('hidden');
}

/**
 * 关闭轨迹弹窗
 */
function closeTrackModal() {
    const modal = document.getElementById('logisticsTrackModal');
    if (modal) modal.classList.add('hidden');
}

/**
 * 打印面单
 */
async function printLogisticsWaybill(orderId) {
    try {
        const response = await fetch(`/api/tenant/logistics_accounts/${orderId}/print`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({})
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('打印任务已提交', 'success');
            // 实际项目中这里需要调用打印机或打开打印预览
            console.log('[Logistics] 打印数据:', result.data);
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('[Logistics] 打印失败:', error);
        let errorMsg = '打印失败';
        if (error.message.includes('HTTP')) {
            errorMsg = '服务异常，请稍后重试';
        }
        showNotification(errorMsg, 'error');
    }
}

/**
 * 标记异常
 */
async function markLogisticsException(orderId) {
    const reason = prompt('请输入异常原因:');
    if (!reason) return;
    
    try {
        const response = await fetch(`/api/tenant/logistics_accounts/${orderId}/exception`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ reason })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('已标记为异常', 'success');
            loadLogisticsOrders();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('操作失败', 'error');
    }
}

/**
 * 打开物流平台官网查询
 */
function openTrackUrl(carrierCode, trackingNo) {
    // 常用物流平台查询URL
    const trackUrls = {
        'sf': `https://www.sf-express.com/cn/sc/dynamic_function/waybill/#search/bill-number/${trackingNo}`,
        'yd': `http://www.yundaex.com/cn/index/gscx?mailno=${trackingNo}`,
        'yt': `https://www.yto.net.cn/search/search?waybillNo=${trackingNo}`,
        'zt': `https://www.zto.com/GuestService/Bill?txtbill=${trackingNo}`,
        'st': `https://www.sto.cn/pc/queryBill.htm?bills=${trackingNo}`,
        'jd': `https://www.jdl.com/track?waybillCodes=${trackingNo}`,
        'ems': `https://www.ems.com.cn/queryList?mailNo=${trackingNo}`
    };
    
    const url = trackUrls[carrierCode] || `https://www.kuaidi100.com/chaxun?com=${carrierCode}&nu=${trackingNo}`;
    window.open(url, '_blank');
}

// ===================== 物流配置管理 =====================

/**
 * 加载物流平台列表
 */
async function loadLogisticsPlatforms() {
    const container = document.getElementById('logisticsPlatformList');
    if (!container) return;
    
    container.innerHTML = `
        <div class="p-4 text-center text-gray-500">
            <i class="fas fa-spinner fa-spin mr-2"></i>加载中...
        </div>
    `;
    
    try {
        const response = await fetch('/api/tenant/logistics_accounts', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            LogisticsModule.platformsCache = result.data;
            renderPlatformList(result.data);
        } else {
            container.innerHTML = `
                <div class="p-4 text-center text-red-500">
                    加载失败: ${result.message}
                </div>
            `;
        }
    } catch (error) {
        console.error('[Logistics] 加载平台列表失败:', error);
        
        let errorMsg = '网络错误，请稍后重试';
        if (error.message.includes('HTTP 404')) {
            errorMsg = '接口不存在，请联系管理员';
        }
        
        container.innerHTML = `
            <div class="p-4 text-center text-red-500">
                <i class="fas fa-exclamation-circle mr-2"></i>${errorMsg}
                <button onclick="loadLogisticsPlatforms()" class="ml-4 text-blue-600 hover:underline">
                    <i class="fas fa-redo mr-1"></i>重试
                </button>
            </div>
        `;
    }
}

/**
 * 渲染平台列表
 */
function renderPlatformList(platforms) {
    const container = document.getElementById('logisticsPlatformList');
    if (!container) return;
    
    // 按类型分组
    const expressPlatforms = platforms.filter(p => p.platform_type === 'express');
    const ecommercePlatforms = platforms.filter(p => p.platform_type === 'ecommerce');
    
    container.innerHTML = `
        <div class="mb-4">
            <h4 class="text-sm font-medium text-gray-500 mb-2 px-2">快递物流</h4>
            <div class="space-y-1">
                ${expressPlatforms.map(p => renderPlatformItem(p)).join('')}
            </div>
        </div>
        <div class="border-t pt-4">
            <h4 class="text-sm font-medium text-gray-500 mb-2 px-2">电商平台</h4>
            <div class="space-y-1">
                ${ecommercePlatforms.map(p => renderPlatformItem(p)).join('')}
            </div>
        </div>
    `;
}

/**
 * 渲染单个平台项
 */
function renderPlatformItem(platform) {
    const isConfigured = platform.is_configured;
    const isSelected = LogisticsModule.selectedPlatform === platform.platform_code;
    
    return `
        <div class="flex items-center justify-between px-3 py-2 rounded cursor-pointer transition
                    ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}"
             onclick="selectPlatform('${platform.platform_code}')">
            <div class="flex items-center">
                <i class="fas fa-truck text-gray-400 mr-2"></i>
                <span class="text-sm text-gray-700">${platform.platform_name}</span>
            </div>
            <span class="text-xs px-2 py-0.5 rounded ${isConfigured ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}">
                ${isConfigured ? '已配置' : '未配置'}
            </span>
        </div>
    `;
}

/**
 * 选择平台
 */
function selectPlatform(platformCode) {
    LogisticsModule.selectedPlatform = platformCode;
    
    // 重新渲染列表以更新选中状态
    renderPlatformList(LogisticsModule.platformsCache);
    
    // 加载该平台的配置表单
    loadPlatformConfigForm(platformCode);
}

/**
 * 加载平台配置表单
 */
async function loadPlatformConfigForm(platformCode) {
    const container = document.getElementById('logisticsConfigForm');
    if (!container) return;
    
    const platform = LogisticsModule.platformsCache.find(p => p.platform_code === platformCode);
    if (!platform) {
        container.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                请选择需配置的物流平台
            </div>
        `;
        return;
    }
    
    // 获取该平台已有的配置
    let existingConfig = null;
    try {
        const response = await fetch(`/api/tenant/logistics_accounts?cp_code=${platformCode}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        if (result.success && result.data.length > 0) {
            existingConfig = result.data[0];
        }
    } catch (e) {}
    
    const configFields = platform.config_fields?.fields || [];
    
    container.innerHTML = `
        <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-semibold text-gray-800">
                    ${platform.platform_name} 配置
                </h3>
                ${platform.api_doc_url ? `
                    <a href="${platform.api_doc_url}" target="_blank" 
                       class="text-sm text-blue-600 hover:underline">
                        <i class="fas fa-external-link-alt mr-1"></i>查看API文档
                    </a>
                ` : ''}
            </div>
            
            <form id="platformConfigForm" onsubmit="savePlatformConfig(event)">
                <input type="hidden" name="platform" value="${platformCode}">
                <input type="hidden" name="platform_name" value="${platform.platform_name}">
                ${existingConfig ? `<input type="hidden" name="id" value="${existingConfig.id}">` : ''}
                
                <div class="space-y-4">
                    ${configFields.map(field => `
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                ${field.label}
                                ${field.required ? '<span class="text-red-500">*</span>' : ''}
                            </label>
                            <input type="${field.type === 'password' ? 'password' : 'text'}" 
                                   name="${field.key}"
                                   value="${existingConfig?.[field.key] || existingConfig?.extra_config?.[field.key] || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="请输入${field.label}"
                                   ${field.required ? 'required' : ''}>
                        </div>
                    `).join('')}
                </div>
                
                <div class="flex justify-end space-x-3 mt-6 pt-4 border-t">
                    ${existingConfig ? `
                        <button type="button" onclick="togglePlatformConfig(${existingConfig.id}, '${existingConfig.status}')"
                                class="px-4 py-2 text-sm ${existingConfig.status === 'enabled' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'} rounded">
                            ${existingConfig.status === 'enabled' ? '禁用' : '启用'}
                        </button>
                        <button type="button" onclick="deletePlatformConfig(${existingConfig.id})"
                                class="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded">
                            删除配置
                        </button>
                    ` : ''}
                    <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        保存配置
                    </button>
                </div>
            </form>
        </div>
    `;
}

/**
 * 保存平台配置
 */
async function savePlatformConfig(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // 将非基础字段放入extra_config
    const baseFields = ['platform', 'platform_name', 'id', 'shop_id', 'shop_name', 'app_key', 'app_secret', 'access_token', 'refresh_token'];
    const extraConfig = {};
    
    for (const [key, value] of Object.entries(data)) {
        if (!baseFields.includes(key) && value) {
            extraConfig[key] = value;
        }
    }
    
    data.extra_config = extraConfig;
    
    try {
        const response = await fetch('/api/tenant/logistics_accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('配置保存成功', 'success');
            loadLogisticsPlatforms();
            loadPlatformConfigForm(data.platform);
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('保存失败', 'error');
    }
}

/**
 * 切换平台配置状态
 */
async function togglePlatformConfig(configId, currentStatus) {
    try {
        const response = await fetch(`/api/tenant/logistics_accounts/${configId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: currentStatus === 'enabled' ? 0 : 1 })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            loadLogisticsPlatforms();
            loadPlatformConfigForm(LogisticsModule.selectedPlatform);
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('操作失败', 'error');
    }
}

/**
 * 删除平台配置
 */
async function deletePlatformConfig(configId) {
    if (!confirm('确定要删除该配置吗？')) return;
    
    try {
        const response = await fetch(`/api/tenant/logistics_accounts/${configId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('配置已删除', 'success');
            loadLogisticsPlatforms();
            
            // 清空配置表单
            const container = document.getElementById('logisticsConfigForm');
            if (container) {
                container.innerHTML = `
                    <div class="p-8 text-center text-gray-500">
                        请选择需配置的物流平台
                    </div>
                `;
            }
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('删除失败', 'error');
    }
}

// ===================== 面单打印模板 =====================

/**
 * 加载打印模板列表
 */
async function loadPrintTemplates() {
    const container = document.getElementById('printTemplateList');
    if (!container) return;
    
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
        
        if (result.success) {
            renderPrintTemplates(result.data);
        } else {
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-red-500">
                        加载失败: ${result.message}
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('[Logistics] 加载模板列表失败:', error);
        
        let errorMsg = '网络错误，请稍后重试';
        if (error.message.includes('HTTP 404')) {
            errorMsg = '接口不存在，请联系管理员';
        }
        
        container.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-red-500">
                    <i class="fas fa-exclamation-circle mr-2"></i>${errorMsg}
                    <button onclick="loadPrintTemplates()" class="ml-4 text-blue-600 hover:underline">
                        <i class="fas fa-redo mr-1"></i>重试
                    </button>
                </td>
            </tr>
        `;
    }
}

/**
 * 渲染打印模板列表
 */
function renderPrintTemplates(templates) {
    const container = document.getElementById('printTemplateList');
    if (!container) return;
    
    if (!templates || templates.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-file-alt text-4xl mb-4 text-gray-300"></i>
                    <p>暂无打印模板，请点击"新增模板"创建</p>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = templates.map(tpl => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-800">
                ${tpl.name}
                ${tpl.is_default ? '<span class="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">默认</span>' : ''}
            </td>
            <td class="px-4 py-3 text-gray-600">${tpl.carrier || '-'}</td>
            <td class="px-4 py-3 text-gray-600">${tpl.paper_width}mm × ${tpl.paper_height}mm</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs rounded ${tpl.status === 'enabled' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}">
                    ${tpl.status === 'enabled' ? '启用' : '禁用'}
                </span>
            </td>
            <td class="px-4 py-3 text-gray-500 text-sm">${tpl.updated_at || tpl.created_at || '-'}</td>
            <td class="px-4 py-3 text-right space-x-2">
                <button onclick="editPrintTemplate(${tpl.id})" class="text-blue-600 hover:text-blue-800 text-sm">
                    <i class="fas fa-edit"></i>
                </button>
                ${!tpl.is_default ? `
                    <button onclick="setDefaultTemplate(${tpl.id})" class="text-green-600 hover:text-green-800 text-sm" title="设为默认">
                        <i class="fas fa-star"></i>
                    </button>
                ` : ''}
                <button onclick="deletePrintTemplate(${tpl.id})" class="text-red-600 hover:text-red-800 text-sm">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * 打开新增模板弹窗
 */
function openNewTemplateModal() {
    const modal = document.getElementById('printTemplateModal');
    const titleEl = document.getElementById('templateModalTitle');
    const form = document.getElementById('printTemplateForm');
    
    if (modal) modal.classList.remove('hidden');
    if (titleEl) titleEl.textContent = '新增面单模板';
    if (form) form.reset();
    
    // 清除隐藏的id字段
    const idField = form?.querySelector('input[name="id"]');
    if (idField) idField.value = '';
}

/**
 * 编辑模板
 */
async function editPrintTemplate(templateId) {
    // 获取模板详情后填充表单
    showNotification('编辑功能开发中', 'info');
}

/**
 * 保存模板
 */
async function savePrintTemplate(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch('/api/logistics/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('模板保存成功', 'success');
            closeTemplateModal();
            loadPrintTemplates();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('保存失败', 'error');
    }
}

/**
 * 设为默认模板
 */
async function setDefaultTemplate(templateId) {
    try {
        const response = await fetch(`/api/logistics/templates/${templateId}/default`, {
            method: 'POST',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('已设为默认模板', 'success');
            loadPrintTemplates();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('操作失败', 'error');
    }
}

/**
 * 删除模板
 */
async function deletePrintTemplate(templateId) {
    if (!confirm('确定要删除该模板吗？')) return;
    
    try {
        const response = await fetch(`/api/logistics/templates/${templateId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('模板已删除', 'success');
            loadPrintTemplates();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('删除失败', 'error');
    }
}

/**
 * 关闭模板弹窗
 */
function closeTemplateModal() {
    const modal = document.getElementById('printTemplateModal');
    if (modal) modal.classList.add('hidden');
}

// ===================== 工具函数 =====================

/**
 * 显示通知
 */
function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}

// ===================== 物流订单模态框 =====================

/**
 * 打开创建物流订单模态框
 */
function openCreateLogisticsOrderModal() {
    const modal = document.getElementById('logisticsOrderModal');
    if (!modal) return;
    
    // 重置表单
    const form = document.getElementById('logisticsOrderForm');
    if (form) form.reset();
    document.getElementById('logisticsOrderId').value = '';
    document.getElementById('logisticsOrderModalTitle').textContent = '新建物流订单';
    
    // 加载平台下拉选项
    loadPlatformOptions();
    
    // 加载关联订单下拉选项
    loadRelatedOrderOptions();
    
    modal.classList.remove('hidden');
}

/**
 * 加载平台下拉选项
 */
async function loadPlatformOptions() {
    const select = document.getElementById('logisticsPlatformSelect');
    if (!select) return;
    
    try {
        const response = await fetch('/api/logistics/config', { credentials: 'include' });
        const result = await response.json();
        
        select.innerHTML = '<option value="">请选择平台</option>';
        if (result.success && result.data) {
            result.data.filter(c => c.is_enabled).forEach(config => {
                const option = document.createElement('option');
                option.value = config.platform_code;
                option.textContent = config.platform_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('[Logistics] 加载平台选项失败:', error);
    }
}

/**
 * 加载关联订单下拉选项
 */
async function loadRelatedOrderOptions() {
    const select = document.getElementById('logisticsRelatedOrder');
    if (!select) return;
    
    try {
        const response = await fetch('/api/orders?status=confirmed&page_size=100', { credentials: 'include' });
        const result = await response.json();
        
        select.innerHTML = '<option value="">请选择订单</option>';
        if (result.success && result.data) {
            (result.data.orders || result.data).forEach(order => {
                const option = document.createElement('option');
                option.value = order.id;
                option.textContent = `${order.order_no} - ${order.customer_name}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('[Logistics] 加载订单选项失败:', error);
    }
}

/**
 * 关闭物流订单模态框
 */
function closeLogisticsOrderModal() {
    const modal = document.getElementById('logisticsOrderModal');
    if (modal) modal.classList.add('hidden');
}

/**
 * 提交物流订单
 */
async function submitLogisticsOrder() {
    const form = document.getElementById('logisticsOrderForm');
    if (!form) return;
    
    // 基本校验
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const data = {
        order_id: document.getElementById('logisticsRelatedOrder').value,
        platform_code: document.getElementById('logisticsPlatformSelect').value,
        tracking_no: document.getElementById('logisticsWaybillNo').value,
        receiver_name: document.getElementById('logisticsReceiverName').value,
        receiver_phone: document.getElementById('logisticsReceiverPhone').value,
        receiver_address: document.getElementById('logisticsReceiverAddress').value,
        remark: document.getElementById('logisticsRemark').value
    };
    
    const logisticsOrderId = document.getElementById('logisticsOrderId').value;
    const isEdit = !!logisticsOrderId;
    
    try {
        const response = await fetch(isEdit ? `/api/logistics/orders/${logisticsOrderId}` : '/api/logistics/orders', {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(isEdit ? '物流订单已更新' : '物流订单创建成功', 'success');
            closeLogisticsOrderModal();
            loadLogisticsOrders();
        } else {
            showNotification(result.message || '操作失败', 'error');
        }
    } catch (error) {
        console.error('[Logistics] 提交物流订单失败:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

/**
 * 关闭物流轨迹模态框
 */
function closeLogisticsTrackModal() {
    const modal = document.getElementById('logisticsTrackModal');
    if (modal) modal.classList.add('hidden');
}

/**
 * 刷新物流轨迹
 */
async function refreshLogisticsTrack() {
    // 获取当前显示的运单号，重新查询
    const trackingNo = document.getElementById('trackModalWaybillNo')?.textContent;
    if (!trackingNo || trackingNo === '-') {
        showNotification('运单号不存在', 'warning');
        return;
    }
    
    showNotification('正在刷新物流信息...', 'info');
    
    // 在实际应用中，这里会重新调用API获取最新轨迹
    // 当前仅模拟刷新
    setTimeout(() => {
        showNotification('物流信息已更新', 'success');
    }, 1000);
}

// ===================== 打印模板模态框 =====================

/**
 * 关闭打印模板模态框
 */
function closePrintTemplateModal() {
    const modal = document.getElementById('printTemplateModal');
    if (modal) modal.classList.add('hidden');
}

/**
 * 提交打印模板
 */
async function submitPrintTemplate() {
    const form = document.getElementById('printTemplateForm');
    if (!form) return;
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const data = {
        name: document.getElementById('printTemplateName').value,
        carrier_code: document.getElementById('printTemplateCarrier').value,
        paper_size: document.getElementById('printTemplatePaperSize').value,
        kuaidi100_template_id: document.getElementById('printTemplateKuaidi100Id').value,
        description: document.getElementById('printTemplateDescription').value,
        is_default: document.getElementById('printTemplateDefault').checked ? 1 : 0
    };
    
    const templateId = document.getElementById('printTemplateId').value;
    const isEdit = !!templateId;
    
    try {
        const response = await fetch(isEdit ? `/api/logistics/templates/${templateId}` : '/api/logistics/templates', {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(isEdit ? '模板已更新' : '模板创建成功', 'success');
            closePrintTemplateModal();
            loadPrintTemplates();
        } else {
            showNotification(result.message || '操作失败', 'error');
        }
    } catch (error) {
        console.error('[Logistics] 提交打印模板失败:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

// ===================== 批量打印模态框 =====================

/**
 * 关闭批量打印模态框
 */
function closeBatchPrintModal() {
    const modal = document.getElementById('batchPrintModal');
    if (modal) modal.classList.add('hidden');
}

/**
 * 执行批量打印
 */
async function executeBatchPrint() {
    const template = document.getElementById('batchPrintTemplate').value;
    if (!template) {
        showNotification('请选择打印模板', 'warning');
        return;
    }
    
    // 获取已选中的订单ID
    const selectedOrders = Array.from(document.querySelectorAll('.logistics-order-checkbox:checked'))
        .map(cb => cb.dataset.orderId);
    
    if (selectedOrders.length === 0) {
        showNotification('请选择要打印的订单', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/logistics/orders/batch-print', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                order_ids: selectedOrders,
                template_id: template
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`已提交 ${selectedOrders.length} 个打印任务`, 'success');
            closeBatchPrintModal();
        } else {
            showNotification(result.message || '批量打印失败', 'error');
        }
    } catch (error) {
        console.error('[Logistics] 批量打印失败:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

// ===================== 配置导入导出 =====================

/**
 * 关闭配置导入模态框
 */
function closeLogisticsConfigImportModal() {
    const modal = document.getElementById('logisticsConfigImportModal');
    if (modal) modal.classList.add('hidden');
}

/**
 * 执行配置导入
 */
async function executeLogisticsConfigImport() {
    const fileInput = document.getElementById('logisticsConfigFile');
    if (!fileInput || !fileInput.files.length) {
        showNotification('请选择配置文件', 'warning');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    try {
        const response = await fetch('/api/logistics/config/import', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('配置导入成功', 'success');
            closeLogisticsConfigImportModal();
            loadLogisticsPlatforms();
        } else {
            showNotification(result.message || '导入失败', 'error');
        }
    } catch (error) {
        console.error('[Logistics] 配置导入失败:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

// ===================== 全局导出 =====================
window.initLogisticsOrdersPage = initLogisticsOrdersPage;
window.initLogisticsConfigPage = initLogisticsConfigPage;
window.initLogisticsTemplatesPage = initLogisticsTemplatesPage;
window.loadLogisticsOrders = loadLogisticsOrders;
window.filterLogisticsOrders = filterLogisticsOrders;
window.goLogisticsOrdersPage = goLogisticsOrdersPage;
window.viewLogisticsTrack = viewLogisticsTrack;
window.closeTrackModal = closeTrackModal;
window.printLogisticsWaybill = printLogisticsWaybill;
window.markLogisticsException = markLogisticsException;
window.openTrackUrl = openTrackUrl;
window.selectPlatform = selectPlatform;
window.savePlatformConfig = savePlatformConfig;
window.togglePlatformConfig = togglePlatformConfig;
window.deletePlatformConfig = deletePlatformConfig;
window.openNewTemplateModal = openNewTemplateModal;
window.editPrintTemplate = editPrintTemplate;
window.savePrintTemplate = savePrintTemplate;
window.setDefaultTemplate = setDefaultTemplate;
window.deletePrintTemplate = deletePrintTemplate;
window.closeTemplateModal = closeTemplateModal;

// 新增模态框函数导出
window.openCreateLogisticsOrderModal = openCreateLogisticsOrderModal;
window.closeLogisticsOrderModal = closeLogisticsOrderModal;
window.submitLogisticsOrder = submitLogisticsOrder;
window.closeLogisticsTrackModal = closeLogisticsTrackModal;
window.refreshLogisticsTrack = refreshLogisticsTrack;
window.closePrintTemplateModal = closePrintTemplateModal;
window.submitPrintTemplate = submitPrintTemplate;
window.closeBatchPrintModal = closeBatchPrintModal;
window.executeBatchPrint = executeBatchPrint;
window.closeLogisticsConfigImportModal = closeLogisticsConfigImportModal;
window.executeLogisticsConfigImport = executeLogisticsConfigImport;

console.log('[Logistics] 物流管理模块加载完成 v1.0.0');
