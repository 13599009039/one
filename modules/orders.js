// 订单管理模块
// 版本: v24.3.22 - 使用SafeUtils防御性编程，全部getElementById改为safeGetElement
console.log('📦 [orders.js] 文件开始加载... v24.3.22');

// 全局变量：分页配置
let orderCurrentPage = 1;
let orderPageSize = 20;
let orderTotalCount = 0;

console.log('✅ [orders.js] 全局变量初始化完成');

// 全局测试函数：验证函数是否可用
window.testEditOrder = function(orderId) {
    if (typeof window.openEditOrderModal === 'function') {
        window.openEditOrderModal(orderId || '6');
    } else {
        console.error('❌ openEditOrderModal 函数不存在!');
    }
};

// 全局变量：当前日期筛选范围
let currentOrderDateRange = 'month'; // 默认显示本月
let orderFilterStartDate = null;
let orderFilterEndDate = null;

// 设置订单日期范围
function setOrderDateRange(range) {
    currentOrderDateRange = range;
    const today = new Date();
    let startDate, endDate;
    
    switch (range) {
        case 'today':
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            updateOrderFilterStatus('显示今天订单');
            break;
            
        case 'week':
            const dayOfWeek = today.getDay();
            const monday = new Date(today);
            monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            startDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            updateOrderFilterStatus('显示本周订单');
            break;
            
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            updateOrderFilterStatus('显示本月订单');
            break;
            
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            updateOrderFilterStatus('显示本年订单');
            break;
            
        case 'all':
            orderFilterStartDate = null;
            orderFilterEndDate = null;
            updateOrderDateButtonStyles('all');
            updateOrderFilterStatus('显示全部订单');
            loadOrdersData();
            return;
            
        default:
            return;
    }
    
    // 格式化为 YYYY-MM-DD
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    orderFilterStartDate = formatDate(startDate);
    orderFilterEndDate = formatDate(endDate);
    
    // 设置日期输入框的值
    const startDateInput = SafeUtils.safeGetElement('orderStartDate', 'setOrderDateRange');
    const endDateInput = SafeUtils.safeGetElement('orderEndDate', 'setOrderDateRange');
    
    if (startDateInput) startDateInput.value = orderFilterStartDate;
    if (endDateInput) endDateInput.value = orderFilterEndDate;
    
    // 更新按钮样式
    updateOrderDateButtonStyles(range);
    
    // 自动触发筛选
    loadOrdersData();
}

// 自定义日期筛选
function filterOrdersByCustomDate() {
    const startDateInput = SafeUtils.safeGetElement('orderStartDate', 'filterOrdersByCustomDate');
    const endDateInput = SafeUtils.safeGetElement('orderEndDate', 'filterOrdersByCustomDate');
    
    if (!startDateInput || !endDateInput) return;
    
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    
    if (!startDate || !endDate) {
        alert('请选择开始日期和结束日期');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        alert('开始日期不能大于结束日期');
        return;
    }
    
    currentOrderDateRange = 'custom';
    orderFilterStartDate = startDate;
    orderFilterEndDate = endDate;
    // 更新按钮样式
    updateOrderDateButtonStyles('custom');
    
    // 更新状态显示
    updateOrderFilterStatus(`显示 ${startDate} 至 ${endDate} 订单`);
    
    // 触发筛选
    loadOrdersData();
}

// 订单类型筛选
function filterOrdersByType() {
    // 重置到第一页
    orderCurrentPage = 1;
    // 重新加载数据
    loadOrdersData();
}
window.filterOrdersByType = filterOrdersByType;

// 更新日期范围按钮样式
function updateOrderDateButtonStyles(activeRange) {
    const buttons = {
        'today': SafeUtils.safeGetElement('btnOrderToday', 'updateOrderDateButtonStyles'),
        'week': SafeUtils.safeGetElement('btnOrderWeek', 'updateOrderDateButtonStyles'),
        'month': SafeUtils.safeGetElement('btnOrderMonth', 'updateOrderDateButtonStyles'),
        'year': SafeUtils.safeGetElement('btnOrderYear', 'updateOrderDateButtonStyles'),
        'all': SafeUtils.safeGetElement('btnOrderAll', 'updateOrderDateButtonStyles')
    };
    
    Object.keys(buttons).forEach(key => {
        const btn = buttons[key];
        if (btn) {
            if (key === activeRange) {
                btn.className = 'px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500';
            } else {
                btn.className = 'px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500';
            }
        }
    });
}

// 更新筛选状态显示
function updateOrderFilterStatus(text) {
    const statusElement = SafeUtils.safeGetElement('orderFilterStatus', 'updateOrderFilterStatus');
    if (statusElement) {
        statusElement.textContent = text;
    }
}

// 获取当前订单日期范围
function getOrderDateRangeFilter() {
    return {
        startDate: orderFilterStartDate,
        endDate: orderFilterEndDate
    };
}

// ==================== 工具函数 ====================

/**
 * 获取订单状态样式类
 */
function getStatusClass(status) {
    const statusColors = {
        '待确认': 'bg-yellow-100 text-yellow-800',
        '服务中': 'bg-blue-100 text-blue-800',
        '已完成': 'bg-green-100 text-green-800',
        '已取消': 'bg-gray-100 text-gray-800',
        '售后中': 'bg-red-100 text-red-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * 获取收款状态样式类
 */
function getPaymentStatusClass(status) {
    const classMap = {
        '未收款': 'bg-gray-200 text-gray-700',
        '部分收款': 'bg-yellow-100 text-yellow-700',
        '已收款': 'bg-green-100 text-green-700',
        '已退款': 'bg-red-100 text-red-700',
        '部分退款': 'bg-orange-100 text-orange-700'
    };
    return classMap[status] || 'bg-gray-200 text-gray-700';
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        // 检查是否为有效日期
        if (isNaN(date.getTime())) return dateString;
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return dateString;
    }
}

// ==================== 页面初始化 ====================

window.initOrdersPage = function() {
    console.log('🚀 [订单页面] 开始初始化...');
    
    loadOrdersData();
    
    // 绑定新增订单按钮
    const addOrderBtn = SafeUtils.safeGetElement('addOrderBtn', 'initOrdersPage');
    console.log('🔍 [订单页面] 查找按钮:', addOrderBtn);
    
    if (addOrderBtn) {
        console.log('✅ [订单页面] 按钮存在，绑定点击事件...');
        addOrderBtn.onclick = function() {
            console.log('👆 [按钮点击] 创建订单按钮被点击！');
            openAddOrderModal();
        };
        console.log('✅ [订单页面] 按钮点击事件绑定完成！');
    } else {
        console.error('❌ [订单页面] 按钮不存在！DOM未加载或ID错误');
    }
    
    // 绑定表单提交
    const orderForm = SafeUtils.safeGetElement('orderForm', 'initOrdersPage');
    if (orderForm) {
        orderForm.onsubmit = function(e) {
            e.preventDefault();
            saveNewOrder();
        };
    }
    
    // 绑定收款表单提交
    const paymentForm = SafeUtils.safeGetElement('paymentForm', 'initOrdersPage');
    if (paymentForm) {
        paymentForm.onsubmit = function(e) {
            e.preventDefault();
            savePayment();
        };
    }
    
    // 绑定售后表单提交
    const afterSalesForm = SafeUtils.safeGetElement('afterSalesForm', 'initOrdersPage');
    if (afterSalesForm) {
        afterSalesForm.onsubmit = function(e) {
            e.preventDefault();
            saveAfterSales();
        };
    }
};

function openAddOrderModal() {
    console.log('[开始] 打开创建订单模态框...');
    
    const modal = SafeUtils.safeGetElement('addOrderModal', 'openAddOrderModal');
    if (!modal) {
        console.error('❌ 模态框元素未找到！');
        alert('模态框未加载，请刷新页面');
        return;
    }
    
    console.log('✅ 模态框元素存在:', modal);
    
    // 关键修复：强制显示模态框
    modal.classList.remove('hidden');
    modal.style.display = 'flex';  // 强制设置 display
    modal.style.visibility = 'visible';  // 强制设置可见
    modal.style.opacity = '1';  // 强制设置不透明度
    modal.style.zIndex = '10000';  // 提高z-index
    
    console.log('✅ 模态框样式已设置:', {
        display: modal.style.display,
        visibility: modal.style.visibility,
        opacity: modal.style.opacity,
        zIndex: modal.style.zIndex
    });
    
    // 清除编辑模式标志
    window.currentEditingOrderId = null;
    
    // 重置标题
    const modalTitle = modal.querySelector('h3');
    if (modalTitle) {
        modalTitle.textContent = '创建新订单';
    }
    
    // 关键修复：重置按钮文字
    const submitBtn = document.getElementById('orderSubmitBtn');
    if (submitBtn) {
        submitBtn.textContent = '创建订单';
    }
    
    // ✅ 隐藏操作日志入口（创建模式不显示）
    const orderLogEntry = document.getElementById('orderLogEntry');
    if (orderLogEntry) {
        orderLogEntry.style.display = 'none';
    }
    
    // 重置表单
    const form = document.getElementById('orderForm');
    if (form) {
        form.reset();
        
        // ✅ 关键修复: 绑定form submit事件
        // 注意：不再使用cloneNode替换表单，避免破坏DOM结构和事件绑定
        // 改用移除旧事件+重新绑定的方式
        
        // 先移除旧的事件监听器（通过标记检查是否已绑定）
        if (!form._submitBound) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault(); // 阻止默认提交
                console.log('📝 [orderForm] 表单提交事件触发');
                await saveNewOrder();
            });
            form._submitBound = true;
            console.log('✅ [orderForm] submit事件已绑定');
        } else {
            console.log('ℹ️ [orderForm] submit事件已存在，跳过重复绑定');
        }
    }
    
    // 重置备注列表
    const remarksList = document.getElementById('orderRemarksList');
    if (remarksList) {
        remarksList.innerHTML = `
            <div class="flex gap-2">
                <input type="text" class="order-remark-item block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="请输入备注内容">
            </div>
        `;
    }
    
    // 重置商品/服务项列表
    resetOrderItemsList();
    
    // 重置附件列表
    const attachmentsList = document.getElementById('orderAttachmentsList');
    if (attachmentsList) attachmentsList.innerHTML = '';
    orderAttachments = [];
    
    // ✅ 重置议价相关输入框
    const negotiationAmount = document.getElementById('negotiationAmount');
    const negotiationPercent = document.getElementById('negotiationPercent');
    const finalPriceInput = document.getElementById('finalPriceInput');
    if (negotiationAmount) negotiationAmount.value = '0';
    if (negotiationPercent) negotiationPercent.value = '0';
    if (finalPriceInput) finalPriceInput.value = '0';
    
    // ✅ 重置其他成本列表
    const otherCostsList = document.getElementById('otherCostsList');
    if (otherCostsList) {
        otherCostsList.innerHTML = '<div class="text-xs text-gray-500 text-center py-1">暂无其他成本</div>';
    }
    const otherCostsTotal = document.getElementById('otherCostsTotal');
    if (otherCostsTotal) otherCostsTotal.textContent = '¥0.00';
    
    // 加载客户下拉
    loadCustomersToSelect();
    // 加载人员、团队、公司、项目下拉
    loadOrderFormSelects();
    
    // 设置默认日期
    document.getElementById('orderDate').value = new Date().toISOString().split('T')[0];
    
    console.log('✅ 模态框打开完成！');
}

// 存储附件数据
let orderAttachments = [];

// 重置商品/服务项列表
function resetOrderItemsList() {
    const tbody = document.getElementById('orderItemsList');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr class="order-item-row border-t border-gray-200">
            <td class="py-1">
                <select class="order-item-select w-full border border-gray-300 rounded py-1 px-2 text-xs" onchange="updateOrderItemPrice(this)">
                    <option value="">请选择...</option>
                </select>
            </td>
            <td class="py-1 order-item-type text-xs text-gray-500 text-center">-</td>
            <td class="py-1"><input type="number" class="order-item-quantity w-full border border-gray-300 rounded py-1 px-2 text-xs text-center" value="1" min="1" onchange="calculateOrderItemTotal(this)"></td>
            <td class="py-1"><input type="number" step="0.01" class="order-item-price w-full border border-gray-300 rounded py-1 px-2 text-xs text-right" value="0" onchange="calculateOrderItemTotal(this)"></td>
            <td class="py-1 order-item-total text-xs text-right font-medium">¥0.00</td>
            <td class="py-1 text-center"><button type="button" onclick="removeOrderItem(this)" class="text-red-500 hover:text-red-700 text-xs"><i class="fas fa-trash-alt"></i></button></td>
        </tr>
    `;
    
    // 加载商品/服务选项
    loadServicesToItemSelect(tbody.querySelector('.order-item-select'));
    // 绑定Enter键跳转
    bindEnterKeyNavigation(tbody.querySelector('.order-item-row'));
    updateOrderItemsTotal();
}

async function loadOrderFormSelects() {
    let users = [];
    let teams = [];
    let companies = [];
    let projects = [];
    
    try {
        const [userRes, teamRes, companyRes, projectRes] = await Promise.all([
            fetch('/api/users', { credentials: 'include' }),
            fetch('/api/teams', { credentials: 'include' }),
            fetch('/api/companies', { credentials: 'include' }),
            fetch('/api/projects', { credentials: 'include' })
        ]);
        
        const [userResult, teamResult, companyResult, projectResult] = await Promise.all([
            userRes.json(),
            teamRes.json(),
            companyRes.json(),
            projectRes.json()
        ]);
        
        if (userResult.success) {
            users = userResult.data || [];
        }
        if (teamResult.success) {
            teams = teamResult.data || [];
        }
        if (companyResult.success) {
            companies = companyResult.data || [];
        }
        if (projectResult.success) {
            projects = projectResult.data || [];
        }
    } catch (error) {
        console.error('❌ API加载失败:', error);
        showNotification('加载表单数据失败，请刷新页面重试', 'error');
    }
    
    // 加载人员列表（只显示启用状态的用户）
    const activeUsers = users.filter(u => u.status === 'enabled');
    const staffSelects = ['orderBusinessStaff', 'orderServiceStaff', 'orderOperationStaff'];
    staffSelects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">请选择</option>';
            activeUsers.forEach(u => {
                select.innerHTML += `<option value="${u.id}" data-id="${u.id}">${u.name}</option>`;
            });
        }
    });
    
    // 自动设置业务人员为当前登录用户
    try {
        // ✅ 使用 API 替代 database.js
        const userResult = await window.api.getCurrentUser();
        if (userResult.success && userResult.data) {
            const currentUser = userResult.data;
            const businessStaffSelect = document.getElementById('orderBusinessStaff');
            if (businessStaffSelect) {
                // 查找当前用户在下拉框中的选项（按ID匹配）
                const userOption = Array.from(businessStaffSelect.options).find(
                    option => parseInt(option.value) === currentUser.id
                );
                if (userOption) {
                    businessStaffSelect.value = currentUser.id;
                }
            }
        }
    } catch (error) {
        console.error('设置默认业务人员失败:', error);
    }
    
    // 加载团队列表
    const teamSelect = document.getElementById('orderTeam');
    if (teamSelect) {
        teamSelect.innerHTML = '<option value="">请选择</option>';
        teams.forEach(t => {
            teamSelect.innerHTML += `<option value="${t.id}" data-id="${t.id}">${t.name}</option>`;
        });
    }
    
    // 归属公司字段已移除，自动使用当前用户公司
    
    // 加载项目列表（使用API动态加载）
    const projectSelect = document.getElementById('orderProject');
    if (projectSelect) {
        projectSelect.innerHTML = '<option value="">请选择</option>';
        // 只显示进行中和计划中的项目
        const activeProjects = projects.filter(p => ['active', 'planning'].includes(p.status));
        activeProjects.forEach(p => {
            const statusText = p.status === 'active' ? '进行中' : '计划中';
            projectSelect.innerHTML += `<option value="${p.id}" data-id="${p.id}">${p.name} (${statusText})</option>`;
        });
    }
    
    // ✅ 初始化可搜索下拉框（支持拼音首字母搜索）
    initSearchableStaffSelects(activeUsers);
    initSearchableTeamSelect(teams);
    initSearchableProjectSelect(projects);
}

// 加载商品/服务到项目下拉
async function loadServicesToItemSelect(select) {
    console.log('📦 [loadServicesToItemSelect] 开始加载服务列表...', select);
    if (!select) {
        console.error('❌ [loadServicesToItemSelect] select元素为null');
        return;
    }
    
    let services = [];
    
    // 如果已有缓存，直接使用
    if (cachedServices.length > 0) {
        services = cachedServices;
        console.log('✅ [loadServicesToItemSelect] 使用缓存的服务列表:', services.length);
    } else {
        try {
            console.log('🔍 [loadServicesToItemSelect] 调用API...');
            // ✅ 修复: 改用fetch直接调用,避免window.api的问题
            const response = await fetch('/api/services', { credentials: 'include' });
            const result = await response.json();
            console.log('📊 [loadServicesToItemSelect] API返回:', result);
            if (result.success) {
                services = result.data || [];
                cachedServices = services; // 缓存服务列表
                console.log('✅ [loadServicesToItemSelect] 获取到服务数量:', services.length);
            } else {
                console.error('❌ [loadServicesToItemSelect] API返回失败:', result.message);
            }
        } catch (error) {
            console.error('❌ [loadServicesToItemSelect] API加载服务列表失败:', error);
        }
    }
    
    // ✅ 关键修复: 先清空再填充
    select.innerHTML = '<option value="">请选择...</option>';
    
    if (services.length === 0) {
        console.warn('⚠️ [loadServicesToItemSelect] 服务列表为空!');
        select.innerHTML += '<option value="" disabled>暂无可用服务</option>';
        return;
    }
    
    services.forEach(s => {
        // 使用item_type字段区分类型(兼容旧type字段)
        const itemType = s.item_type || s.type || 'service';
        let typeLabel = '服务';
        if (itemType === 'product') {
            typeLabel = '商品';
        } else if (itemType === 'package') {
            typeLabel = '服务包';
        }
        // ✅ 强制转换为数字类型
        const price = parseFloat(s.retail_price || s.price || 0);
        const supplyPrice = parseFloat(s.supply_price || 0);
        
        // ✅ 关键检查: 确保s.id存在
        if (!s.id) {
            console.error(`❌ [loadServicesToItemSelect] 服务缺少id字段:`, s);
            return;
        }
        
        // ✅ 阶段6: 订单商品选择框增加类型标注 - 显示为 "名称 (商品)" 或 "名称 (服务)"
        select.innerHTML += `<option value="${s.id}" data-price="${price}" data-supply-price="${supplyPrice}" data-type="${typeLabel}">${s.name} (${typeLabel}) ¥${price.toFixed(2)}</option>`;
    });
    console.log('✅ [loadServicesToItemSelect] 下拉框选项已生成，总数:', select.options.length - 1);
    
    // ✅ 升级为可搜索下拉框（支持拼音首字母搜索）
    initSearchableServiceSelect(select, services);
}

// ==================== 可搜索下拉框功能 ====================

// 缓存服务列表数据
let cachedServices = [];

/**
 * 初始化可搜索的商品/服务下拉框
 */
function initSearchableServiceSelect(select, services) {
    if (!select) return;
    
    // 缓存服务数据
    cachedServices = services || [];
    
    // 创建搜索容器
    const container = document.createElement('div');
    container.className = 'searchable-service-container relative';
    
    // 创建搜索输入框
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'searchable-service-input w-full border border-gray-300 rounded py-1 px-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
    searchInput.placeholder = '输入搜索商品/服务...';
    
    // 创建下拉列表
    const dropdown = document.createElement('div');
    dropdown.className = 'searchable-service-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg hidden max-h-48 overflow-y-auto';
    
    container.appendChild(searchInput);
    container.appendChild(dropdown);
    
    // 替换原select
    select.style.display = 'none';
    select.parentNode.insertBefore(container, select);
    
    // 渲染下拉选项
    function renderOptions(keyword = '') {
        let filtered = cachedServices;
        if (keyword && window.PinyinSearch) {
            filtered = cachedServices.filter(s => 
                window.PinyinSearch.fuzzyMatch(s.name, keyword)
            );
        }
        
        if (filtered.length === 0) {
            dropdown.innerHTML = '<div class="px-3 py-2 text-xs text-gray-500 text-center">无匹配结果</div>';
            return;
        }
        
        dropdown.innerHTML = filtered.map(s => {
            const typeLabel = s.type === 'product' ? '商品' : '服务';
            const price = parseFloat(s.retail_price || s.price || 0);
            return `<div class="searchable-service-option px-3 py-2 text-xs cursor-pointer hover:bg-blue-50" 
                data-id="${s.id}" 
                data-price="${price}" 
                data-supply-price="${s.supply_price || 0}"
                data-type="${typeLabel}">
                ${s.name} <span class="text-gray-400">(¥${price.toFixed(2)})</span>
            </div>`;
        }).join('');
        
        // 绑定点击事件
        dropdown.querySelectorAll('.searchable-service-option').forEach(opt => {
            opt.addEventListener('click', () => selectServiceOption(opt, select, searchInput, dropdown));
        });
    }
    
    // 选择选项
    function selectServiceOption(opt, select, input, dropdown) {
        const id = opt.dataset.id;
        const price = opt.dataset.price;
        const supplyPrice = opt.dataset.supplyPrice;
        const type = opt.dataset.type;
        const text = opt.textContent.trim().split('(')[0].trim();
        
        // 更新隐藏的select
        select.value = id;
        
        // 更新输入框显示
        input.value = text;
        
        // 触发原有的价格更新逻辑
        const row = select.closest('tr');
        if (row) {
            row.querySelector('.order-item-type').textContent = type;
            row.querySelector('.order-item-price').value = parseFloat(price);
            
            const supplyPriceEl = row.querySelector('.order-item-supply-price');
            if (supplyPriceEl) {
                supplyPriceEl.textContent = `¥${parseFloat(supplyPrice).toFixed(2)}`;
            }
            
            calculateOrderItemTotal(row.querySelector('.order-item-price'));
        }
        
        dropdown.classList.add('hidden');
    }
    
    // 搜索输入事件
    searchInput.addEventListener('input', (e) => {
        renderOptions(e.target.value);
        dropdown.classList.remove('hidden');
    });
    
    // 聚焦时显示下拉
    searchInput.addEventListener('focus', () => {
        renderOptions(searchInput.value);
        dropdown.classList.remove('hidden');
    });
    
    // 点击外部关闭
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
    
    // 初始渲染
    renderOptions();
}

/**
 * 初始化人员下拉框为可搜索模式
 * ✅ 选择业务人员后自动带出负责团队和归属项目
 */
let cachedUsersData = []; // 缓存用户数据用于联动

function initSearchableStaffSelects(users) {
    cachedUsersData = users; // 缓存用户数据
    const staffSelectIds = ['orderBusinessStaff', 'orderServiceStaff', 'orderOperationStaff'];
    
    staffSelectIds.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select || select.dataset.searchableInit === 'true') return;
        
        select.dataset.searchableInit = 'true';
        
        const container = document.createElement('div');
        container.className = 'searchable-staff-container relative';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'searchable-staff-input w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
        searchInput.placeholder = '输入姓名或拼音首字母搜索...';
        
        const dropdown = document.createElement('div');
        dropdown.className = 'searchable-staff-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg hidden max-h-48 overflow-y-auto';
        
        container.appendChild(searchInput);
        container.appendChild(dropdown);
        
        select.style.display = 'none';
        select.parentNode.insertBefore(container, select);
        
        function renderOptions(keyword = '') {
            let filtered = users;
            if (keyword && window.PinyinSearch) {
                filtered = users.filter(u => window.PinyinSearch.fuzzyMatch(u.name, keyword));
            }
            
            if (filtered.length === 0) {
                dropdown.innerHTML = '<div class="px-3 py-2 text-sm text-gray-500 text-center">无匹配结果</div>';
                return;
            }
            
            dropdown.innerHTML = '<div class="px-3 py-2 text-sm text-gray-400 cursor-pointer hover:bg-gray-50" data-id="">请选择</div>' + 
                filtered.map(u => `<div class="searchable-staff-option px-3 py-2 text-sm cursor-pointer hover:bg-blue-50" data-id="${u.id}">${u.name}</div>`).join('');
            
            dropdown.querySelectorAll('[data-id]').forEach(opt => {
                opt.addEventListener('click', () => {
                    const userId = opt.dataset.id;
                    select.value = userId;
                    searchInput.value = userId ? opt.textContent : '';
                    dropdown.classList.add('hidden');
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // ✅ 只有业务人员才触发团队和项目联动
                    if (selectId === 'orderBusinessStaff' && userId) {
                        autoFillTeamAndProject(userId);
                    }
                });
            });
        }
        
        searchInput.addEventListener('input', (e) => {
            renderOptions(e.target.value);
            dropdown.classList.remove('hidden');
        });
        
        searchInput.addEventListener('focus', () => {
            renderOptions(searchInput.value);
            dropdown.classList.remove('hidden');
        });
        
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
        
        // 设置初始值
        if (select.value) {
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption) searchInput.value = selectedOption.textContent;
        }
        
        renderOptions();
    });
}

/**
 * ✅ 选择业务人员后自动带出团队和项目
 * - 如果只有1个团队：自动选中
 * - 如果有多个团队：显示选择提示，让用户手动选择
 */
async function autoFillTeamAndProject(userId) {
    console.log('🔗 [autoFillTeamAndProject] 业务人员联动:', userId);
    
    try {
        // 查找用户数据
        const user = cachedUsersData.find(u => u.id == userId);
        if (!user) {
            console.warn('未找到用户数据:', userId);
            return;
        }
        
        // ✅ 使用用户的teams数组（一人多团队）
        const userTeams = user.teams || [];
        console.log('用户团队列表:', userTeams);
        
        // 获取团队下拉框
        const teamSelect = document.getElementById('orderTeam');
        const teamSearchInput = teamSelect?.parentNode?.querySelector('.searchable-team-input');
        
        if (userTeams.length === 0) {
            // 无团队，清空
            if (teamSelect) teamSelect.value = '';
            if (teamSearchInput) teamSearchInput.value = '';
        } else if (userTeams.length === 1) {
            // 只有1个团队，自动选中
            const team = userTeams[0];
            if (teamSelect) {
                teamSelect.value = team.team_id;
                teamSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (teamSearchInput) teamSearchInput.value = team.team_name || '';
            console.log('✅ 自动选中团队:', team.team_name);
        } else {
            // 多个团队，优先选择主团队
            const primaryTeam = userTeams.find(t => t.is_primary) || userTeams[0];
            if (teamSelect) {
                teamSelect.value = primaryTeam.team_id;
                teamSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (teamSearchInput) {
                teamSearchInput.value = primaryTeam.team_name || '';
                teamSearchInput.placeholder = `${userTeams.length}个团队可选，可重新选择...`;
            }
            console.log('✅ 自动选中主团队:', primaryTeam.team_name, '(共', userTeams.length, '个团队)');
        }
        
        // ✅ 自动带出项目
        const projectSelect = document.getElementById('orderProject');
        const projectSearchInput = projectSelect?.parentNode?.querySelector('.searchable-project-input');
        
        if (user.project_id) {
            if (projectSelect) {
                projectSelect.value = user.project_id;
                projectSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
            // 更新搜索框显示
            if (projectSearchInput && projectSelect) {
                const selectedOpt = projectSelect.querySelector(`option[value="${user.project_id}"]`);
                if (selectedOpt) projectSearchInput.value = selectedOpt.textContent;
            }
            console.log('✅ 自动选中项目:', user.project_id);
        }
        
    } catch (error) {
        console.error('❌ 自动带出团队/项目失败:', error);
    }
}

/**
 * 初始化团队下拉框为可搜索模式
 */
function initSearchableTeamSelect(teams) {
    const select = document.getElementById('orderTeam');
    if (!select || select.dataset.searchableInit === 'true') return;
    
    select.dataset.searchableInit = 'true';
    
    const container = document.createElement('div');
    container.className = 'searchable-team-container relative';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'searchable-team-input w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
    searchInput.placeholder = '输入团队名称搜索...';
    
    const dropdown = document.createElement('div');
    dropdown.className = 'searchable-team-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg hidden max-h-48 overflow-y-auto';
    
    container.appendChild(searchInput);
    container.appendChild(dropdown);
    
    select.style.display = 'none';
    select.parentNode.insertBefore(container, select);
    
    function renderOptions(keyword = '') {
        let filtered = teams;
        if (keyword && window.PinyinSearch) {
            filtered = teams.filter(t => window.PinyinSearch.fuzzyMatch(t.name, keyword));
        }
        
        if (filtered.length === 0) {
            dropdown.innerHTML = '<div class="px-3 py-2 text-sm text-gray-500 text-center">无匹配结果</div>';
            return;
        }
        
        dropdown.innerHTML = '<div class="px-3 py-2 text-sm text-gray-400 cursor-pointer hover:bg-gray-50" data-id="">请选择</div>' + 
            filtered.map(t => `<div class="searchable-team-option px-3 py-2 text-sm cursor-pointer hover:bg-blue-50" data-id="${t.id}">${t.name}</div>`).join('');
        
        dropdown.querySelectorAll('[data-id]').forEach(opt => {
            opt.addEventListener('click', () => {
                select.value = opt.dataset.id;
                searchInput.value = opt.dataset.id ? opt.textContent : '';
                dropdown.classList.add('hidden');
                select.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });
    }
    
    searchInput.addEventListener('input', (e) => {
        renderOptions(e.target.value);
        dropdown.classList.remove('hidden');
    });
    
    searchInput.addEventListener('focus', () => {
        renderOptions(searchInput.value);
        dropdown.classList.remove('hidden');
    });
    
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
    
    renderOptions();
}

/**
 * 初始化项目下拉框为可搜索模式
 */
function initSearchableProjectSelect(projects) {
    const select = document.getElementById('orderProject');
    if (!select || select.dataset.searchableInit === 'true') return;
    
    select.dataset.searchableInit = 'true';
    
    const container = document.createElement('div');
    container.className = 'searchable-project-container relative';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'searchable-project-input w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
    searchInput.placeholder = '输入项目名称搜索...';
    
    const dropdown = document.createElement('div');
    dropdown.className = 'searchable-project-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg hidden max-h-48 overflow-y-auto';
    
    container.appendChild(searchInput);
    container.appendChild(dropdown);
    
    select.style.display = 'none';
    select.parentNode.insertBefore(container, select);
    
    // 过滤活跃项目
    const activeProjects = projects.filter(p => ['active', 'planning'].includes(p.status));
    
    function renderOptions(keyword = '') {
        let filtered = activeProjects;
        if (keyword && window.PinyinSearch) {
            filtered = activeProjects.filter(p => window.PinyinSearch.fuzzyMatch(p.name, keyword));
        }
        
        if (filtered.length === 0) {
            dropdown.innerHTML = '<div class="px-3 py-2 text-sm text-gray-500 text-center">无匹配结果</div>';
            return;
        }
        
        dropdown.innerHTML = '<div class="px-3 py-2 text-sm text-gray-400 cursor-pointer hover:bg-gray-50" data-id="">请选择</div>' + 
            filtered.map(p => {
                const statusText = p.status === 'active' ? '进行中' : '计划中';
                return `<div class="searchable-project-option px-3 py-2 text-sm cursor-pointer hover:bg-blue-50" data-id="${p.id}">${p.name} <span class="text-gray-400">(${statusText})</span></div>`;
            }).join('');
        
        dropdown.querySelectorAll('[data-id]').forEach(opt => {
            opt.addEventListener('click', () => {
                select.value = opt.dataset.id;
                searchInput.value = opt.dataset.id ? opt.textContent.split('(')[0].trim() : '';
                dropdown.classList.add('hidden');
                select.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });
    }
    
    searchInput.addEventListener('input', (e) => {
        renderOptions(e.target.value);
        dropdown.classList.remove('hidden');
    });
    
    searchInput.addEventListener('focus', () => {
        renderOptions(searchInput.value);
        dropdown.classList.remove('hidden');
    });
    
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
    
    renderOptions();
}

// 添加商品/服务项
window.addOrderItem = function() {
    const tbody = document.getElementById('orderItemsList');
    if (!tbody) return;
    
    const tr = document.createElement('tr');
    tr.className = 'order-item-row border-t border-gray-200';
    tr.innerHTML = `
        <td class="py-1">
            <select class="order-item-select w-full border border-gray-300 rounded py-1 px-2 text-xs" onchange="updateOrderItemPrice(this)">
                <option value="">请选择...</option>
            </select>
        </td>
        <td class="py-1 order-item-type text-xs text-gray-500 text-center">-</td>
        <td class="py-1"><input type="number" class="order-item-quantity w-full border border-gray-300 rounded py-1 px-2 text-xs text-center" value="1" min="1" onchange="calculateOrderItemTotal(this)"></td>
        <td class="py-1"><input type="number" step="0.01" class="order-item-price w-full border border-gray-300 rounded py-1 px-2 text-xs text-right" value="0" onchange="calculateOrderItemTotal(this)"></td>
        <td class="py-1 order-item-total text-xs text-right font-medium">¥0.00</td>
        <td class="py-1 text-center"><button type="button" onclick="removeOrderItem(this)" class="text-red-500 hover:text-red-700 text-xs"><i class="fas fa-trash-alt"></i></button></td>
    `;
    tbody.appendChild(tr);
    
    loadServicesToItemSelect(tr.querySelector('.order-item-select'));
    // 绑定Enter键跳转
    bindEnterKeyNavigation(tr);
};

// 删除商品/服务项
window.removeOrderItem = function(btn) {
    const row = btn.closest('tr');
    const tbody = document.getElementById('orderItemsList');
    
    // 至少保留一行
    if (tbody && tbody.querySelectorAll('.order-item-row').length > 1) {
        row.remove();
        updateOrderItemsTotal();
    }
};

// 更新商品/服务项的价格
window.updateOrderItemPrice = function(select) {
    const row = select.closest('tr');
    const option = select.options[select.selectedIndex];
    
    // 安全检查：如果option没有dataset，说明是"请选择..."选项
    if (!option || !option.dataset) {
        console.warn('⚠️ updateOrderItemPrice: option没有dataset，selectedIndex=' + select.selectedIndex);
        return;
    }
    
    const price = parseFloat(option.dataset.price || 0);
    const type = option.dataset.type || '-';
    
    row.querySelector('.order-item-type').textContent = type;
    row.querySelector('.order-item-price').value = price;
    
    calculateOrderItemTotal(row.querySelector('.order-item-price'));
};

// 计算单项小计
window.calculateOrderItemTotal = function(input) {
    const row = input.closest('tr');
    const price = parseFloat(row.querySelector('.order-item-price').value) || 0;
    const quantity = parseInt(row.querySelector('.order-item-quantity').value) || 1;
    
    // 计算金额
    const amount = price * quantity;
    
    // 更新金额
    row.querySelector('.order-item-total').textContent = `¥${amount.toFixed(2)}`;
    
    updateOrderItemsTotal();
};

/**
 * 绑定 Enter 键跳转到下一个输入框
 * 顺序：商品选择 → 数量 → 单价 → 下一行商品选择
 */
function bindEnterKeyNavigation(row) {
    if (!row) return;
    
    const select = row.querySelector('.order-item-select');
    const quantityInput = row.querySelector('.order-item-quantity');
    const priceInput = row.querySelector('.order-item-price');
    
    // 商品选择后，按Enter跳到数量
    if (select) {
        select.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (quantityInput) {
                    quantityInput.focus();
                    quantityInput.select();
                }
            }
        });
        // 选择商品后自动跳到数量
        select.addEventListener('change', function() {
            if (this.value && quantityInput) {
                setTimeout(() => {
                    quantityInput.focus();
                    quantityInput.select();
                }, 50);
            }
        });
    }
    
    // 数量输入后，按Enter跳到单价
    if (quantityInput) {
        quantityInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (priceInput) {
                    priceInput.focus();
                    priceInput.select();
                }
            }
        });
    }
    
    // 单价输入后，按Enter跳到下一行的商品选择（或自动添加新行）
    if (priceInput) {
        priceInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tbody = document.getElementById('orderItemsList');
                const rows = tbody.querySelectorAll('.order-item-row');
                const currentIndex = Array.from(rows).indexOf(row);
                
                if (currentIndex === rows.length - 1) {
                    // 最后一行，添加新行并聚焦
                    addOrderItem();
                    setTimeout(() => {
                        const newRows = tbody.querySelectorAll('.order-item-row');
                        const newRow = newRows[newRows.length - 1];
                        const newSelect = newRow.querySelector('.order-item-select');
                        if (newSelect) newSelect.focus();
                    }, 50);
                } else {
                    // 跳到下一行的商品选择
                    const nextRow = rows[currentIndex + 1];
                    const nextSelect = nextRow.querySelector('.order-item-select');
                    if (nextSelect) nextSelect.focus();
                }
            }
        });
    }
}

// 更新总计
function updateOrderItemsTotal() {
    let totalAmount = 0;
    let totalCost = 0;
    let totalCount = 0;  // 商品数量统计
    
    document.querySelectorAll('.order-item-row').forEach(row => {
        const price = parseFloat(row.querySelector('.order-item-price')?.value) || 0;
        const quantity = parseInt(row.querySelector('.order-item-quantity')?.value) || 1;
        const selectEl = row.querySelector('.order-item-select');
        
        // 只统计已选择商品的行
        if (selectEl && selectEl.value) {
            totalCount += quantity;
        }
        
        totalAmount += price * quantity;
        // 成本计算保持兼容（隐藏显示）
        totalCost += 0;
    });
    
    const totalProfit = totalAmount - totalCost;
    
    // 更新商品总计显示
    const totalCountEl = document.getElementById('orderItemsTotalCount');
    const totalAmountEl = document.getElementById('orderItemsTotalAmount');
    const totalCostEl = document.getElementById('orderItemsTotalCost');
    const totalProfitEl = document.getElementById('orderItemsTotalProfit');
    
    if (totalCountEl) totalCountEl.textContent = totalCount;
    if (totalAmountEl) totalAmountEl.textContent = `¥${totalAmount.toFixed(2)}`;
    if (totalCostEl) totalCostEl.textContent = `¥${totalCost.toFixed(2)}`;
    if (totalProfitEl) {
        totalProfitEl.textContent = `¥${totalProfit.toFixed(2)}`;
        totalProfitEl.style.color = totalProfit >= 0 ? '#10b981' : '#ef4444';
    }
    
    // 关键修复：调用议价计算函数（已从折扣改为议价）
    calculateNegotiation();
    
    // 兼容旧版本总计显示
    const totalEl = document.getElementById('orderItemsTotal');
    if (totalEl) {
        totalEl.textContent = `¥${totalAmount.toFixed(2)}`;
    }
}

/**
 * 计算议价后的最终成交价（内部核心函数）
 */
window.calculateNegotiation = function() {
    // 获取商品总销售额
    const totalAmountText = document.getElementById('orderItemsTotalAmount')?.textContent || '¥0.00';
    const totalAmount = parseFloat(totalAmountText.replace('¥', '').replace(',', '')) || 0;
    
    // 获取议价金额（正数加价，负数减价）
    const negotiationAmount = parseFloat(document.getElementById('negotiationAmount')?.value) || 0;
    
    // 计算最终成交价 = 总销售额 + 议价金额
    const finalTransactionPrice = totalAmount + negotiationAmount;
    
    // 更新最终成交价显示
    const finalPriceEl = document.getElementById('finalTransactionPrice');
    if (finalPriceEl) {
        finalPriceEl.textContent = `¥${finalTransactionPrice.toFixed(2)}`;
        finalPriceEl.style.color = negotiationAmount > 0 ? '#2563eb' : (negotiationAmount < 0 ? '#dc2626' : '#6b7280');
    }
    
    // 同步更新最终成交价输入框
    const finalPriceInput = document.getElementById('finalPriceInput');
    if (finalPriceInput && document.activeElement !== finalPriceInput) {
        finalPriceInput.value = finalTransactionPrice.toFixed(2);
    }
    
    // 触发总计计算
    calculateOrderTotal();
};

/**
 * 议价方式1：输入加价/减价金额 -> 自动计算最终成交价和百分比
 */
window.onNegotiationAmountChange = function() {
    const totalAmountText = document.getElementById('orderItemsTotalAmount')?.textContent || '¥0.00';
    const totalAmount = parseFloat(totalAmountText.replace('¥', '').replace(',', '')) || 0;
    
    const negotiationAmount = parseFloat(document.getElementById('negotiationAmount')?.value) || 0;
    
    // 计算百分比
    const negotiationPercent = totalAmount > 0 ? (negotiationAmount / totalAmount * 100) : 0;
    const percentInput = document.getElementById('negotiationPercent');
    if (percentInput) {
        percentInput.value = negotiationPercent.toFixed(1);
    }
    
    // 更新最终成交价
    calculateNegotiation();
};

/**
 * 议价方式2：输入百分比 -> 自动计算加减价金额和最终成交价
 */
window.onNegotiationPercentChange = function() {
    const totalAmountText = document.getElementById('orderItemsTotalAmount')?.textContent || '¥0.00';
    const totalAmount = parseFloat(totalAmountText.replace('¥', '').replace(',', '')) || 0;
    
    const negotiationPercent = parseFloat(document.getElementById('negotiationPercent')?.value) || 0;
    
    // 计算加减价金额 = 总销售额 * 百分比 / 100
    const negotiationAmount = totalAmount * negotiationPercent / 100;
    const amountInput = document.getElementById('negotiationAmount');
    if (amountInput) {
        amountInput.value = negotiationAmount.toFixed(2);
    }
    
    // 更新最终成交价
    calculateNegotiation();
};

/**
 * 议价方式3：输入最终成交价 -> 反算加减价金额和百分比
 */
window.onFinalPriceChange = function() {
    const totalAmountText = document.getElementById('orderItemsTotalAmount')?.textContent || '¥0.00';
    const totalAmount = parseFloat(totalAmountText.replace('¥', '').replace(',', '')) || 0;
    
    const finalPrice = parseFloat(document.getElementById('finalPriceInput')?.value) || 0;
    
    // 反算加减价金额 = 最终成交价 - 总销售额
    const negotiationAmount = finalPrice - totalAmount;
    const amountInput = document.getElementById('negotiationAmount');
    if (amountInput) {
        amountInput.value = negotiationAmount.toFixed(2);
    }
    
    // 计算百分比
    const negotiationPercent = totalAmount > 0 ? (negotiationAmount / totalAmount * 100) : 0;
    const percentInput = document.getElementById('negotiationPercent');
    if (percentInput) {
        percentInput.value = negotiationPercent.toFixed(1);
    }
    
    // 更新显示（不更新finalPriceInput，因为用户正在输入）
    const finalPriceEl = document.getElementById('finalTransactionPrice');
    if (finalPriceEl) {
        finalPriceEl.textContent = `¥${finalPrice.toFixed(2)}`;
        finalPriceEl.style.color = negotiationAmount > 0 ? '#2563eb' : (negotiationAmount < 0 ? '#dc2626' : '#6b7280');
    }
    
    // 触发总计计算
    calculateOrderTotal();
};

/**
 * 处理额外成本类型切换
 */
window.handleExtraCostTypeChange = function() {
    const type = document.getElementById('extraCostType')?.value;
    const nameInput = document.getElementById('extraCostName');
    const amountInput = document.getElementById('extraCostAmount');
    
    if (type === 'custom') {
        // 自定义成本：显示名称输入框
        if (nameInput) nameInput.classList.remove('hidden');
        if (amountInput) amountInput.disabled = false;
    } else if (type === '') {
        // 无额外成本
        if (nameInput) nameInput.classList.add('hidden');
        if (amountInput) {
            amountInput.disabled = true;
            amountInput.value = 0;
        }
    } else {
        // 预设成本类型
        if (nameInput) nameInput.classList.add('hidden');
        if (amountInput) amountInput.disabled = false;
    }
    
    calculateOrderTotal();
};

/**
 * 计算订单最终总计
 */
window.calculateOrderTotal = function() {
    // 1. 获取商品总销售额
    const totalAmountText = document.getElementById('orderItemsTotalAmount')?.textContent || '¥0.00';
    const totalAmount = parseFloat(totalAmountText.replace('¥', '').replace(',', '')) || 0;
    
    // 2. 获取商品总成本
    const totalCostText = document.getElementById('orderItemsTotalCost')?.textContent || '¥0.00';
    const itemsCost = parseFloat(totalCostText.replace('¥', '').replace(',', '')) || 0;
    
    // 3. 获取议价金额
    const negotiationAmount = parseFloat(document.getElementById('negotiationAmount')?.value) || 0;
    
    // 4. 获取稳定成本和特殊成本（新逻辑）
    const stableCost = typeof getStableCostsTotal === 'function' ? getStableCostsTotal() : 0;
    const specialCost = typeof getSpecialCostsTotal === 'function' ? getSpecialCostsTotal() : 0;
    
    // 5. 计算最终值
    const finalAmount = totalAmount + negotiationAmount;  // 实际销售额 = 总销售额 + 议价金额
    const finalCost = itemsCost + stableCost + specialCost;  // 实际成本 = 商品成本 + 稳定成本 + 特殊成本
    const finalProfit = finalAmount - finalCost;        // 实际利润 = 实际销售额 - 实际成本
    const profitRate = finalAmount > 0 ? (finalProfit / finalAmount * 100) : 0;  // 利润率
    
    // 6. 计算优惠金额 = 总金额 - 最终成交价（负数表示优惠，正数表示加价）
    const discountAmount = totalAmount - finalAmount;  // 如果 negotiationAmount < 0，则 discountAmount > 0
    
    // 7. 更新显示
    const discountAmountEl = document.getElementById('orderDiscountAmount');
    const finalAmountEl = document.getElementById('orderFinalAmount');
    const finalCostEl = document.getElementById('orderFinalCost');
    const finalProfitEl = document.getElementById('orderFinalProfit');
    const profitRateEl = document.getElementById('orderProfitRate');
    
    // 优惠金额显示（正数显示优惠，负数显示加价）
    if (discountAmountEl) {
        if (discountAmount > 0) {
            discountAmountEl.textContent = `-¥${discountAmount.toFixed(2)}`;
            discountAmountEl.style.color = '#dc2626';  // 红色表示优惠
        } else if (discountAmount < 0) {
            discountAmountEl.textContent = `+¥${Math.abs(discountAmount).toFixed(2)}`;
            discountAmountEl.style.color = '#2563eb';  // 蓝色表示加价
        } else {
            discountAmountEl.textContent = '¥0.00';
            discountAmountEl.style.color = '#6b7280';  // 灰色表示无优惠
        }
    }
    
    if (finalAmountEl) finalAmountEl.textContent = `¥${finalAmount.toFixed(2)}`;
    if (finalCostEl) finalCostEl.textContent = `¥${finalCost.toFixed(2)}`;
    if (finalProfitEl) {
        finalProfitEl.textContent = `¥${finalProfit.toFixed(2)}`;
        finalProfitEl.style.color = finalProfit >= 0 ? '#15803d' : '#dc2626';
    }
    if (profitRateEl) {
        profitRateEl.textContent = `${profitRate.toFixed(1)}%`;
        profitRateEl.style.color = profitRate >= 0 ? '#15803d' : '#dc2626';
    }
};

// 关键修复：移除全局事件监听器，改为在模态框打开时绑定
// 原因：模态框内容是动态加载的，页面加载时DOM还不存在
// const discountTypeRadios = document.querySelectorAll('input[name="discountType"]');
// discountTypeRadios.forEach(radio => {
//     radio.addEventListener('change', calculateOrderDiscount);
// });

// 处理附件上传
window.handleOrderAttachments = function(input) {
    const list = document.getElementById('orderAttachmentsList');
    if (!list) return;
    
    Array.from(input.files).forEach(file => {
        orderAttachments.push(file);
        
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between py-1 px-2 bg-white rounded border mt-1';
        div.innerHTML = `
            <span class="text-gray-700 truncate flex-1"><i class="fas fa-file mr-2 text-gray-400"></i>${file.name}</span>
            <button type="button" onclick="removeOrderAttachment(this, '${file.name}')" class="text-red-500 ml-2"><i class="fas fa-times"></i></button>
        `;
        list.appendChild(div);
    });
    
    input.value = '';
};

window.removeOrderAttachment = function(btn, fileName) {
    orderAttachments = orderAttachments.filter(f => f.name !== fileName);
    btn.closest('div').remove();
};

window.closeAddOrderModal = function() {
    console.log('🔴 [closeAddOrderModal] 关闭模态框被调用');
    const modal = document.getElementById('addOrderModal');
    console.log('🔍 [closeAddOrderModal] 模态框元素:', modal);
    if (modal) {
        // 关键修复：必须清除inline style，否则hidden类不生效
        modal.style.display = 'none';
        modal.style.visibility = '';
        modal.style.opacity = '';
        modal.classList.add('hidden');
        console.log('✅ [closeAddOrderModal] 已清除inline style并添加hidden类');
    } else {
        console.error('❌ [closeAddOrderModal] 找不到模态框元素');
    }
    
    // 清除编辑模式标志
    window.currentEditingOrderId = null;
    
    // 重置标题为默认"创建新订单"
    const modalTitle = modal?.querySelector('h3');
    if (modalTitle) {
        modalTitle.textContent = '创建新订单';
    }
    
    // 关键修复：重置按钮文字为"创建订单"
    const submitBtn = document.getElementById('orderSubmitBtn');
    if (submitBtn) {
        submitBtn.textContent = '创建订单';
    }
    
    // ✅ 关键修复：隐藏操作日志入口（关闭后重置为默认状态）
    const orderLogEntry = document.getElementById('orderLogEntry');
    if (orderLogEntry) {
        orderLogEntry.style.display = 'none';
        console.log('✅ [closeAddOrderModal] 操作日志入口已隐藏');
    }
    
    console.log('✅ [closeAddOrderModal] 模态框关闭完成');
};

async function loadCustomersToSelect() {
    // ✅ 修复: 不再预加载全部客户(避免504超时),改用API实时搜索
    console.log('✅ [loadCustomersToSelect] 跳过客户列表加载,使用API实时搜索');
    
    // 只初始化搜索输入框
    initCustomerSearch();
}

// 初始化客户搜索功能
function initCustomerSearch() {
    const searchInput = document.getElementById('orderCustomerSearch');
    const dropdown = document.getElementById('customerSearchDropdown');
    const hiddenInput = document.getElementById('orderCustomer');
    
    if (!searchInput || !dropdown) return;
    
    // 搜索输入事件
    let searchTimer = null;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimer);
        const keyword = this.value.trim().toLowerCase();
        
        if (keyword.length === 0) {
            dropdown.classList.add('hidden');
            hiddenInput.value = '';
            return;
        }
        
        searchTimer = setTimeout(() => {
            filterAndShowCustomers(keyword);
        }, 300);
    });
    
    // 点击外部关闭下拉框
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
    
    // 获取焦点时不显示下拉框(等待用户输入关键词再搜索)
    searchInput.addEventListener('focus', function() {
        // 空白时不显示下拉框,等待输入再触发API搜索
    });
}

// 筛选并显示客户列表(改用API实时搜索)
async function filterAndShowCustomers(keyword) {
    const dropdown = document.getElementById('customerSearchDropdown');
    
    // 如果关键词为空,不显示下拉框
    if (!keyword || keyword.trim().length === 0) {
        dropdown.classList.add('hidden');
        return;
    }
    
    try {
        // ✅ 修复: 使用API实时搜索,不再依赖预加载列表
        const response = await fetch(`/api/customers?search=${encodeURIComponent(keyword)}&page_size=50`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`API返回${response.status}`);
        }
        
        const result = await response.json();
        const customers = result.success ? result.data : [];
        
        if (customers.length === 0) {
            dropdown.innerHTML = '<div class="px-4 py-3 text-sm text-gray-500 text-center">未找到匹配的客户</div>';
            dropdown.classList.remove('hidden');
            return;
        }
        
        // 渲染客户列表
        dropdown.innerHTML = customers.map(c => `
            <div class="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 customer-item" 
                 data-id="${c.id}" 
                 data-name="${c.shop_name}">
                <div class="text-sm font-medium text-gray-900">${c.shop_name}</div>
                ${c.contact_person || c.phone ? `<div class="text-xs text-gray-500">${c.contact_person || ''} ${c.phone || ''}</div>` : ''}
            </div>
        `).join('');
        
        dropdown.classList.remove('hidden');
        
        // 添加点击事件
        dropdown.querySelectorAll('.customer-item').forEach(item => {
            item.addEventListener('click', function() {
                const id = this.dataset.id;
                const name = this.dataset.name;
                
                document.getElementById('orderCustomerSearch').value = name;
                document.getElementById('orderCustomer').value = id;
                dropdown.classList.add('hidden');
                console.log('✅ 已选择客户:', {id, name});
            });
        });
    } catch (error) {
        console.error('❌ [filterAndShowCustomers] API搜索失败:', error);
        dropdown.innerHTML = '<div class="px-4 py-3 text-sm text-red-500 text-center">搜索失败,请重试</div>';
        dropdown.classList.remove('hidden');
    }
}

// 显示快速创建客户模态框（复用客户模块的完整模态框）
window.showQuickAddCustomer = function() {
    // 标记从订单页打开，保存后需要回填
    window._addCustomerFromOrder = true;
    
    // 获取搜索框的值作为预填客户名称
    const searchValue = document.getElementById('orderCustomerSearch')?.value?.trim();
    
    // 调用客户模块的openCustomerModal（新增模式）
    if (typeof window.openCustomerModal === 'function') {
        window.openCustomerModal(null);
        
        // 延迟填入搜索框的内容到客户名称
        if (searchValue) {
            setTimeout(() => {
                const shopNameInput = document.getElementById('shopName');
                if (shopNameInput) {
                    shopNameInput.value = searchValue;
                }
            }, 100);
        }
    } else {
        showNotification('客户模态框未加载', 'error');
    }
};

// 关闭快速创建客户模态框（兼容旧调用）
window.closeQuickAddCustomer = function() {
    window._addCustomerFromOrder = false;
    if (typeof window.closeCustomerModalFunc === 'function') {
        window.closeCustomerModalFunc();
    }
};

// 客户保存成功后的回调（从订单页新增时自动回填）
window.onCustomerSavedFromOrder = function(customerId, customerName) {
    if (window._addCustomerFromOrder && customerId) {
        // 回填到订单表单
        const searchInput = document.getElementById('orderCustomerSearch');
        const hiddenInput = document.getElementById('orderCustomer');
        
        if (searchInput) searchInput.value = customerName || '';
        if (hiddenInput) hiddenInput.value = customerId;
        
        // 清除标记
        window._addCustomerFromOrder = false;
        
        // 自动聚焦到下一个必填项（下单日期）
        setTimeout(() => {
            const dateInput = document.getElementById('orderDate');
            if (dateInput) dateInput.focus();
        }, 100);
        
        showNotification('客户已添加并选中', 'success');
    }
};

async function loadPackagesToSelect() {
    const select = document.getElementById('orderPackage');
    if (!select) return;
    
    try {
        // 使用 fetch API 加载服务包
        const response = await fetch('/api/services', { credentials: 'include' });
        const result = await response.json();
        
        if (result.success) {
            select.innerHTML = '<option value="">请选择服务包</option>';
            const packages = result.data.filter(s => s.type === 'package');
            packages.forEach(p => {
                select.innerHTML += `<option value="${p.id}">${p.name} (¥${p.base_price || p.price})</option>`;
            });
        }
    } catch (error) {
        console.error('加载服务包失败:', error);
    }
    
    select.onchange = function() {
        const pkgId = this.value;
        if (pkgId) {
            const pkg = result.data.find(p => p.id == pkgId);
            if (pkg) {
                document.getElementById('orderTotal').value = pkg.price;
            }
        }
    };
}

/**
 * 获取下拉框的ID值（用于保存关联外键）
 */
function getSelectId(elementId) {
    const selectEl = document.getElementById(elementId);
    if (!selectEl) return null;
    
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    if (!selectedOption) return null;
    
    // 尝试从 dataset 获取 id
    if (selectedOption.dataset && selectedOption.dataset.id) {
        return parseInt(selectedOption.dataset.id);
    }
    
    // 如果 value是数字，则认为是ID
    const value = parseInt(selectEl.value);
    if (!isNaN(value) && value > 0) {
        return value;
    }
    
    return null;
}

/**
 * 构建订单数据对象（优化版）
 * ✅ 架构升级 v1.1 - 使用 Utils 工具层，提高稳定性和可维护性
 * 解决问题：orderData 包含40+字段，易出错且缺少验证
 * 修复日期：2026-02-13
 * @returns {Object|null} 返回格式化的订单数据，验证失败返回null
 */
async function buildOrderData() {
    // ===== 第一部分：必填字段验证 =====
    const customer_id = parseInt(document.getElementById('orderCustomer')?.value);
    if (!customer_id || isNaN(customer_id)) {
        showNotification('请选择客户', 'error');
        return null;
    }
    
    const order_date = document.getElementById('orderDate')?.value;
    if (!order_date) {
        showNotification('请选择下单日期', 'error');
        return null;
    }
    
    const business_staff_id = getSelectId('orderBusinessStaff');
    if (!business_staff_id) {
        showNotification('请选择业务人员', 'error');
        return null;
    }
    
    const team_id = getSelectId('orderTeam');
    if (!team_id) {
        showNotification('请选择负责团队', 'error');
        return null;
    }
    
    // 获取人员和团队的名称（用于显示）
    const getSelectText = (elementId) => {
        const el = document.getElementById(elementId);
        if (!el) return '';
        const option = el.options[el.selectedIndex];
        return option ? option.textContent : '';
    };
    
    const business_staff = getSelectText('orderBusinessStaff');
    const team = getSelectText('orderTeam');
    
    // ===== 第二部分：收集商品明细 =====
    const items = [];
    let hasEmptyService = false;
    
    console.log('🛒 [getOrderFormData] 开始收集商品明细...');
    document.querySelectorAll('.order-item-row').forEach((row, index) => {
        const select = row.querySelector('.order-item-select');
        const serviceId = select ? parseInt(select.value) : null;
        const price = parseFloat(row.querySelector('.order-item-price')?.value) || 0;
        const quantity = parseInt(row.querySelector('.order-item-quantity')?.value) || 1;
        
        console.log(`📝 [行${index + 1}] select.value="${select?.value}", serviceId=${serviceId}, price=${price}, quantity=${quantity}`);
        
        // 获取供货价
        const supplyPriceEl = row.querySelector('.order-item-supply-price');
        const supplyPriceText = supplyPriceEl ? supplyPriceEl.textContent.replace('¥', '') : '0';
        const supply_price = parseFloat(supplyPriceText) || 0;
        
        if (serviceId && !isNaN(serviceId)) {
            items.push({
                service_id: serviceId,
                service_name: select.options[select.selectedIndex].text.split(' (')[0],
                price: price,
                quantity: quantity,
                supply_price: supply_price,
                subtotal: price * quantity
            });
            console.log(`✅ [行${index + 1}] 已添加商品: service_id=${serviceId}, name="${select.options[select.selectedIndex].text}"`);
        } else if (price > 0 || quantity > 1) {
            // ✅ 修复: 只有当用户实际修改了价格(>0)或数量(>1)时才报错
            // 默认的空行(price=0, quantity=1)会被跳过
            hasEmptyService = true;
            console.warn(`⚠️ 第${index + 1}行商品未选择服务 (select.value="${select?.value}", serviceId=${serviceId})`);
        } else {
            console.log(`ℹ️ [行${index + 1}] 跳过空行 (price=0, quantity=1)`);
        }
    });
    
    if (hasEmptyService) {
        showNotification('有商品行未选择服务，请选择服务或删除该行', 'error');
        return null;
    }
    
    if (items.length === 0) {
        showNotification('请至少添加一个商品/服务', 'error');
        return null;
    }
    
    // ===== 第三部分：计算金额 =====
    const total_amount = items.reduce((sum, item) => sum + item.subtotal, 0);
    const total_cost = items.reduce((sum, item) => sum + (item.supply_price * item.quantity), 0);
    
    // 议价金额（正数加价，负数减价）
    const negotiation_amount = parseFloat(document.getElementById('negotiationAmount')?.value) || 0;
    const final_transaction_price = total_amount + negotiation_amount;
    
    // 额外成本
    const extra_cost_type = document.getElementById('extraCostType')?.value || '';
    const extra_cost_name = extra_cost_type === 'custom' ? 
        (document.getElementById('extraCostName')?.value || '') : 
        (extra_cost_type === 'travel' ? '差旅费' :
         extra_cost_type === 'logistics' ? '物流费' :
         extra_cost_type === 'tax' ? '税费' : '');
    const extra_cost_amount = parseFloat(document.getElementById('extraCostAmount')?.value) || 0;
    
    // 最终金额计算
    const final_amount = final_transaction_price;  // 实际销售额 = 总销售额 + 议价
    const final_cost = total_cost + extra_cost_amount;  // 实际成本 = 商品成本 + 额外成本
    
    console.log('📊 订单金额计算:', {
        total_amount,
        negotiation_amount,
        final_transaction_price,
        extra_cost_amount,
        final_amount,
        final_cost
    });
    
    // ===== 第四部分：构建订单对象 =====
    const orderData = {
        // 基本信息
        customer_id,
        order_date,
        
        // 人员信息（同时保存name和ID）
        business_staff,
        business_staff_id,
        service_staff: getSelectText('orderServiceStaff'),
        service_staff_id: getSelectId('orderServiceStaff'),
        operation_staff: getSelectText('orderOperationStaff'),
        operation_staff_id: getSelectId('orderOperationStaff'),
        management_staff: getSelectText('orderManagementStaff'),
        management_staff_id: getSelectId('orderManagementStaff'),
        
        // 组织信息
        team,
        team_id,
        department_id: getSelectId('orderDepartment'),
        position_id: getSelectId('orderPosition'),
        region: document.getElementById('orderRegion')?.value || '',
        region_id: getSelectId('orderRegion'),
        project: document.getElementById('orderProject')?.value || '',
        project_id: getSelectId('orderProject'),
        
        // 合同信息
        contract_number: document.getElementById('contractNumber')?.value || '',
        contract_sign_date: document.getElementById('contractSignDate')?.value || null,
        no_contract_required: document.getElementById('noContractRequired')?.checked || false,
        contract_amount: total_amount,
        
        // 金额信息
        total_amount,
        total_cost,
        
        // 议价信息（新架构）
        negotiation_amount,
        final_transaction_price,
        
        // 额外成本
        extra_cost_type,
        extra_cost_name,
        extra_cost_amount,
        
        // 最终金额
        final_amount,
        final_cost,
        
        // 状态和备注
        status: document.getElementById('orderStatus')?.value || '待签约',
        remarks: collectOrderRemarks(),
        
        // 商品明细
        items: items
    };
    
    // 获取公司信息
    try {
        // ✅ 使用 API 替代 database.js
        const userResult = await window.api.getCurrentUser();
        if (userResult.success && userResult.data) {
            orderData.company_id = userResult.data.company_id;
        }
    } catch (error) {
        console.error('获取用户公司信息失败:', error);
    }
    
    return orderData;
}

/**
 * 收集订单备注
 */
function collectOrderRemarks() {
    const remarks = [];
    document.querySelectorAll('.order-remark-item').forEach(input => {
        if (input.value.trim()) {
            remarks.push({
                date: new Date().toISOString().split('T')[0],
                content: input.value.trim()
            });
        }
    });
    return remarks;
}

async function saveNewOrder() {
    // 关键修复：判断是新增还是编辑模式
    const orderId = window.currentEditingOrderId;
    const isEditMode = !!orderId;
    
    // 使用优化的构建函数
    const orderData = await buildOrderData();
    if (!orderData) {
        return; // 验证失败，已显示错误提示
    }
    
    // 添加成本汇总数据到订单
    orderData.stable_cost = typeof getStableCostsTotal === 'function' ? getStableCostsTotal() : 0;
    orderData.special_cost = typeof getSpecialCostsTotal === 'function' ? getSpecialCostsTotal() : 0;
    
    // 尝试使用 API 保存
    try {
        let result;
        if (isEditMode) {
            // 编辑模式：调用 PUT 更新接口
            result = await window.api.updateOrder(orderId, orderData);
            
            if (result.success) {
                // 保存成本数据
                await saveOrderCosts(orderId);
                
                showNotification('订单修改成功！', 'success');
                closeAddOrderModal();
                window.currentEditingOrderId = null;  // 清除编辑模式标志
                loadOrdersData();
                return;
            } else {
                throw new Error(result.message || 'API返回失败');
            }
        } else {
            // 新增模式：调用 POST 创建接口
            const result = await window.api.addOrder(orderData);
            
            if (result.success) {
                const newOrderId = result.data?.id || result.data;
                
                // 保存成本数据（新版）
                if (newOrderId) {
                    await saveOrderCosts(newOrderId);
                }
                
                showNotification('订单创建成功！', 'success');
                closeAddOrderModal();
                clearAllCosts();  // 清空成本数据（新版）
                loadOrdersData();
                return;
            } else {
                throw new Error(result.message || 'API返回失败');
            }
        }
    } catch (error) {
        console.error('❌ API 保存失败:', error);
        showNotification(`订单${isEditMode ? '修改' : '创建'}失败: ${error.message}`, 'error');
    }
}

/**
 * 保存订单成本（稳定成本 + 特殊成本）
 */
async function saveOrderCosts(orderId) {
    // 保存稳定成本
    if (stableCostsData.length > 0) {
        try {
            const stableResponse = await fetch(`/api/orders/${orderId}/stable-costs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ costs: stableCostsData })
            });
            const stableResult = await stableResponse.json();
            if (!stableResult.success) {
                console.error('保存稳定成本失败:', stableResult.message);
            }
        } catch (err) {
            console.error('保存稳定成本异常:', err);
        }
    }
    
    // 保存特殊成本
    const validSpecialCosts = specialCostsData.filter(sc => sc.name && parseFloat(sc.amount) > 0);
    if (validSpecialCosts.length > 0) {
        try {
            const specialResponse = await fetch(`/api/orders/${orderId}/special-costs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ costs: validSpecialCosts })
            });
            const specialResult = await specialResponse.json();
            if (!specialResult.success) {
                console.error('保存特殊成本失败:', specialResult.message);
            }
        } catch (err) {
            console.error('保存特殊成本异常:', err);
        }
    }
}

window.addOrderRemarkRow = function() {
    const list = document.getElementById('orderRemarksList');
    const div = document.createElement('div');
    div.className = 'flex gap-2';
    div.innerHTML = `
        <input type="text" class="order-remark-item mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="请输入备注内容">
        <button type="button" onclick="this.parentElement.remove()" class="text-red-500 text-xs">删除</button>
    `;
    list.appendChild(div);
};

async function loadOrdersData() {
    console.log('📦 [loadOrdersData] 开始加载订单数据...');
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) {
        console.error('❌ [loadOrdersData] ordersList元素不存在');
        return;
    }
    
    let result, customersResult, packagesResult;
    
    // 调用 API 加载（传递日期筛选参数 + 分页参数 + 类型筛选）
    try {
        
        // 构建 API 参数
        const apiParams = {
            page: orderCurrentPage,
            page_size: orderPageSize
        };
        if (orderFilterStartDate && orderFilterEndDate) {
            apiParams.start_date = orderFilterStartDate;
            apiParams.end_date = orderFilterEndDate;
            apiParams.date_type = 'contract_date'; // 使用签约日期筛选
        }
        
        // 新增：订单类型筛选
        const orderTypeFilter = document.getElementById('orderTypeFilter');
        if (orderTypeFilter && orderTypeFilter.value) {
            apiParams.order_type = orderTypeFilter.value;
        }
        
        console.log('🔍 [loadOrdersData] API参数:', apiParams);
        
        // ✅ 修复: 不再预加载客户列表(避免504超时),使用API实时搜索
        const ordersRes = await fetch('/api/orders?' + new URLSearchParams(apiParams), { credentials: 'include' });
        
        result = await ordersRes.json();
        
        console.log('📊 [loadOrdersData] 订单API返回:', result);
        
        // ✅ 修复: 加载订单中涉及的客户信息(用于显示客户名称)
        // 提取所有订单中的customer_id
        if (result.success && result.data && result.data.length > 0) {
            const customerIds = [...new Set(result.data.map(o => o.customer_id).filter(id => id))];
            if (customerIds.length > 0) {
                try {
                    // 批量获取客户信息
                    const customersRes = await fetch(`/api/customers?ids=${customerIds.join(',')}`, { credentials: 'include' });
                    customersResult = await customersRes.json();
                    console.log('👥 [loadOrdersData] 客户API返回数量:', customersResult?.data?.length);
                } catch (err) {
                    console.error('加载客户信息失败:', err);
                    customersResult = { success: false, data: [] };
                }
            }
        }
        
        // 服务包使用 API
        try {
            const servicesRes = await fetch('/api/services', { credentials: 'include' });
            const servicesResult = await servicesRes.json();
            console.log('📦 [loadOrdersData] 服务API返回数量:', servicesResult?.data?.length);
            
            // ✅ 关键修复: 同步更新cachedServices缓存，供订单模态框使用
            if (servicesResult.success && servicesResult.data) {
                cachedServices = servicesResult.data;
            }
            
            packagesResult = {
                success: servicesResult.success,
                data: servicesResult.data.filter(s => s.type === 'package')
            };
        } catch (error) {
            console.error('加载服务包失败:', error);
            packagesResult = { success: false, data: [] };
        }
        
        if (!result.success) throw new Error('API 返回失败: ' + (result.message || '未知错误'));
        
        // 保存总数
        orderTotalCount = result.total || result.data.length;
        console.log('✅ [loadOrdersData] 订单总数:', orderTotalCount);
        
    } catch (error) {
        console.error('❌ API 加载失败:', error);
        showNotification('加载订单列表失败，请刷新页面', 'error');
        return;
    }
    
    if (result.success) {
        ordersList.innerHTML = '';
        
        // 安全获取客户和服务包数据
        const customers = customersResult?.data || [];
        const packages = packagesResult?.data || [];
        
        // 后端已经筛选，直接使用返回的数据
        result.data.forEach(order => {
            const customer = customers.find(c => c.id === order.customer_id);
            // P1-UI-6修复：使用后端返回的paid_amount字段（已包含收款统计）
            const paidAmount = parseFloat(order.paid_amount || 0) || 0;
            
            // 状态样式
            const statusColors = {
                '待确认': 'bg-yellow-100 text-yellow-800',
                '服务中': 'bg-blue-100 text-blue-800',
                '已完成': 'bg-green-100 text-green-800',
                '已取消': 'bg-gray-100 text-gray-800',
                '售后中': 'bg-red-100 text-red-800',
                '处理中': 'bg-orange-100 text-orange-800'
            };
            const statusClass = statusColors[order.status] || 'bg-gray-100 text-gray-800';
            
            // P1-UI-5: 收款状态样式和文本
            const paymentStatus = order.payment_status || '未收款';
            const paymentStatusClass = getPaymentStatusClass(paymentStatus);
            
            // 订单类型标签
            const isAftersaleOrder = order.order_type === 'aftersale';
            const orderTypeBadge = isAftersaleOrder 
                ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">售后</span>'
                : '';
            
            // 审核状态（双审核：业务审核 + 财务审核）
            const businessAudited = order.business_audit_status === 1 || order.is_audited === 1;  // 兼容旧数据
            const financeAudited = order.finance_audit_status === 1;
            
            let auditBadge = '';
            if (financeAudited) {
                auditBadge = '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">财务已审</span>';
            } else if (businessAudited) {
                auditBadge = '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">业务已审</span>';
            } else {
                auditBadge = '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">未审核</span>';
            }
            
            // 操作按钮（根据审核状态动态显示）
            let actionButtons = `
                <button class="text-blue-600 hover:text-blue-900 mr-1" onclick="viewOrder('${order.id}')" title="查看">查看</button>
                <button class="text-green-600 hover:text-green-900 mr-1" onclick="openPaymentModal('${order.id}')" title="${isAftersaleOrder ? '登记退款' : '登记收款'}">${isAftersaleOrder ? '退款' : '收款'}</button>
            `;
            
            // 销售订单才显示售后按钮
            if (!isAftersaleOrder) {
                actionButtons += `
                    <button class="text-red-600 hover:text-red-900 mr-1" onclick="openAftersaleOrderModal('${order.id}')" title="发起售后">售后</button>
                `;
            }
            
            if (financeAudited) {
                // 财务已审：完全锁定，只能反财务审核
                actionButtons += `
                    <button class="text-orange-600 hover:text-orange-900" onclick="unauditFinance('${order.id}')" title="反财务审核">反财审</button>
                `;
            } else if (businessAudited) {
                // 业务已审：不可编辑，可进行财务审核或反业务审核
                actionButtons += `
                    <button class="text-purple-600 hover:text-purple-900 mr-1" onclick="auditFinance('${order.id}')" title="财务审核">财审</button>
                    <button class="text-orange-600 hover:text-orange-900" onclick="unauditBusiness('${order.id}')" title="反业务审核">反业审</button>
                `;
            } else {
                // 未审核：可编辑、业务审核、删除
                actionButtons += `
                    <button class="text-indigo-600 hover:text-indigo-900 mr-1" onclick="openEditOrderModal('${order.id}')" title="编辑">编辑</button>
                    <button class="text-emerald-600 hover:text-emerald-900 mr-1" onclick="auditBusiness('${order.id}')" title="业务审核">业审</button>
                    <button class="text-red-600 hover:text-red-900" onclick="deleteOrder('${order.id}')" title="删除">删除</button>
                `;
            }
            
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50';
            // 金额展示优化：优先使用final_amount（最终成交金额），其次使用contract_amount
            const displayAmount = parseFloat(order.final_amount || order.contract_amount || order.total_amount || 0) || 0;
            
            // 售后订单显示关联原订单号，原订单显示"有售后"标记
            let orderIdDisplay = `${order.id}`;
            if (isAftersaleOrder && order.parent_order_id) {
                // 售后订单：显示关联的原订单号
                orderIdDisplay = `${order.id} <span class="text-red-500">(关联#${order.parent_order_id})</span>`;
            } else if (order.has_aftersale) {
                // 原订单：如果有售后订单，显示红色"有售后"标记
                orderIdDisplay = `${order.id} <span class="text-red-500 text-xs">[有售后]</span>`;  
            }
            
            tr.innerHTML = `
                <td class="px-4 py-3 text-sm">
                    <div class="font-medium text-gray-900">${customer ? customer.shop_name : '未知客户'}</div>
                    <div class="text-xs text-gray-500">${orderIdDisplay} ${orderTypeBadge}</div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">${order.business_staff || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${order.service_staff || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${order.team || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${order.service_name || '自定义服务'}</td>
                <td class="px-4 py-3 text-sm">
                    <div class="font-medium text-gray-900">¥${displayAmount.toFixed(2)}</div>
                    <div class="text-xs text-green-600">已收: ¥${(parseFloat(paidAmount) || 0).toFixed(2)}</div>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="flex flex-col items-center space-y-1">
                        <span class="px-2 py-0.5 text-xs font-semibold rounded-full ${statusClass}">
                            ${order.status}
                        </span>
                        <span class="px-2 py-0.5 text-xs font-medium rounded-full ${paymentStatusClass}">
                            ${paymentStatus}
                        </span>
                        ${auditBadge}
                    </div>
                </td>
                <td class="px-4 py-3 text-center text-sm">
                    ${actionButtons}
                </td>
            `;
            ordersList.appendChild(tr);
        });
        
        // 渲染分页控件
        renderOrderPagination();
    }
}

/**
 * 加载原订单的完整信息（用于售后订单详情页展示）
 */
async function loadParentOrderInfo(parentOrderId) {
    try {
        const result = await window.api.getOrder(parentOrderId);
        if (!result.success || !result.data) {
            console.error('加载原订单信息失败');
            return;
        }
        
        const parentOrder = result.data;
        
        // 获取客户信息
        let customerName = '未知客户';
        try {
            const customersResult = await window.api.getCustomers();
            if (customersResult.success && customersResult.data) {
                const customer = customersResult.data.find(c => c.id === parentOrder.customer_id);
                if (customer) customerName = customer.shop_name;
            }
        } catch (e) {}
        
        // 填充摘要信息
        const parentCustomer = document.getElementById('parentCustomer');
        const parentAmount = document.getElementById('parentAmount');
        const parentService = document.getElementById('parentService');
        const parentStatus = document.getElementById('parentStatus');
        
        if (parentCustomer) parentCustomer.textContent = customerName;
        
        const finalAmount = parseFloat(parentOrder.final_amount || parentOrder.total_amount || 0) || 0;
        if (parentAmount) parentAmount.textContent = `¥${finalAmount.toFixed(2)}`;
        
        if (parentService) parentService.textContent = parentOrder.service_name || '未指定';
        
        if (parentStatus) {
            parentStatus.textContent = parentOrder.status || '-';
            parentStatus.className = `font-medium ${getStatusClass(parentOrder.status).replace('bg-', 'text-').replace('-100', '-600')}`;
        }
        
        // 填充详细信息
        const parentOrderDate = document.getElementById('parentOrderDate');
        const parentBusinessStaff = document.getElementById('parentBusinessStaff');
        const parentTeam = document.getElementById('parentTeam');
        const parentPaidAmount = document.getElementById('parentPaidAmount');
        
        if (parentOrderDate) parentOrderDate.textContent = formatDate(parentOrder.order_date);
        if (parentBusinessStaff) parentBusinessStaff.textContent = parentOrder.business_staff || '-';
        if (parentTeam) parentTeam.textContent = parentOrder.team || '-';
        
        const paidAmount = parseFloat(parentOrder.paid_amount || parentOrder.net_paid || 0) || 0;
        if (parentPaidAmount) parentPaidAmount.textContent = `¥${paidAmount.toFixed(2)}`;
        
        // 填充收款记录
        const parentPaymentRecords = document.getElementById('parentPaymentRecords');
        if (parentPaymentRecords) {
            if (Array.isArray(parentOrder.payments) && parentOrder.payments.length > 0) {
                const recordsHtml = parentOrder.payments.map(p => {
                    const amount = parseFloat(p.amount) || 0;
                    const isRefund = p.type === '退款' || amount < 0;
                    return `<div class="flex justify-between py-1 border-b border-blue-100 last:border-0">
                        <span>${formatDate(p.payment_date)} - ${p.type || '收款'}</span>
                        <span class="${isRefund ? 'text-red-600' : 'text-green-600'} font-medium">¥${Math.abs(amount).toFixed(2)}</span>
                    </div>`;
                }).join('');
                parentPaymentRecords.innerHTML = recordsHtml;
            } else {
                parentPaymentRecords.innerHTML = '<p class="text-gray-400 italic">暂无收款记录</p>';
            }
        }
    } catch (error) {
        console.error('加载原订单信息异常:', error);
    }
}

window.viewOrder = async function(id) {
    // P1-UI-4: 存储当前查看的订单ID，供退款功能使用
    window.currentViewingOrderId = id;
    
    const modal = document.getElementById('orderDetailModal');
    if (!modal) return;
    
    let order;
    
    // 尝试使用 API 获取订单详情
    try {
        const result = await window.api.getOrder(id);
        if (result.success) {
            order = result.data;
        } else {
            throw new Error('API 返回失败');
        }
    } catch (error) {
        console.error('❌ API 获取订单失败:', error);
        showNotification('加载订单详情失败', 'error');
        return;
    }
    
    if (!order) return;
    
    let customer;
    try {
        const customersResult = await window.api.getCustomers();
        if (customersResult.success && customersResult.data) {
            customer = customersResult.data.find(c => c.id === order.customer_id);
        }
    } catch (error) {
        console.error('❌ API加载客户失败:', error);
    }
    
    // 基本信息
    document.getElementById('detailOrderId').textContent = order.id;
    document.getElementById('detailCustomer').textContent = customer ? customer.shop_name : (order.customer_name || '未知客户');
    document.getElementById('detailDate').textContent = formatDate(order.order_date);
    
    // 订单类型标签
    const orderTypeTag = document.getElementById('detailOrderTypeTag');
    if (orderTypeTag) {
        if (order.order_type === 'aftersale') {
            orderTypeTag.textContent = '售后订单';
            orderTypeTag.className = 'ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800';
            orderTypeTag.classList.remove('hidden');
        } else {
            orderTypeTag.textContent = '销售订单';
            orderTypeTag.className = 'ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800';
            orderTypeTag.classList.remove('hidden');
        }
    }
    
    // 售后订单特有信息
    const aftersaleInfo = document.getElementById('aftersaleInfo');
    const parentOrderInfo = document.getElementById('parentOrderInfo');
    if (order.order_type === 'aftersale') {
        // 显示售后类型和原因
        if (aftersaleInfo) {
            aftersaleInfo.classList.remove('hidden');
            document.getElementById('detailAftersaleType').textContent = order.aftersale_type || '-';
            document.getElementById('detailAftersaleReason').textContent = order.aftersale_reason || '-';
        }
        // 显示关联原订单完整信息
        if (parentOrderInfo && order.parent_order_id) {
            parentOrderInfo.classList.remove('hidden');
            const parentLink = document.getElementById('parentOrderLink');
            parentLink.textContent = `订单号 ${order.parent_order_id}`;
            parentLink.onclick = () => viewOrder(order.parent_order_id);
            
            // 加载原订单的完整信息
            loadParentOrderInfo(order.parent_order_id);
            
            // 绑定展开/收起按钮
            const toggleBtn = document.getElementById('toggleParentDetails');
            const detailsDiv = document.getElementById('parentOrderDetails');
            if (toggleBtn && detailsDiv) {
                toggleBtn.onclick = () => {
                    const isHidden = detailsDiv.classList.contains('hidden');
                    if (isHidden) {
                        detailsDiv.classList.remove('hidden');
                        toggleBtn.innerHTML = '<i class="fas fa-chevron-up mr-1"></i>收起详情';
                    } else {
                        detailsDiv.classList.add('hidden');
                        toggleBtn.innerHTML = '<i class="fas fa-chevron-down mr-1"></i>展开详情';
                    }
                };
                // 重置为收起状态
                detailsDiv.classList.add('hidden');
                toggleBtn.innerHTML = '<i class="fas fa-chevron-down mr-1"></i>展开详情';
            }
        }
    } else {
        if (aftersaleInfo) aftersaleInfo.classList.add('hidden');
        if (parentOrderInfo) parentOrderInfo.classList.add('hidden');
    }
    
    // 金额信息展示
    const totalAmount = parseFloat(order.total_amount) || 0;
    const negotiationAmount = parseFloat(order.negotiation_amount) || 0;
    const finalAmount = parseFloat(order.final_amount) || totalAmount + negotiationAmount;
    const paidAmount = parseFloat(order.paid_amount) || parseFloat(order.net_paid) || 0;
    const unpaidAmount = finalAmount - paidAmount;
    
    document.getElementById('detailTotalAmount').textContent = `¥${totalAmount.toFixed(2)}`;
    
    const negotiationEl = document.getElementById('detailNegotiationAmount');
    negotiationEl.textContent = `${negotiationAmount >= 0 ? '+' : ''}¥${negotiationAmount.toFixed(2)}`;
    negotiationEl.className = negotiationAmount > 0 ? 'text-blue-600' : (negotiationAmount < 0 ? 'text-red-600' : 'text-gray-500');
    
    document.getElementById('detailFinalAmount').textContent = `¥${finalAmount.toFixed(2)}`;
    document.getElementById('detailPaidAmount').textContent = `¥${paidAmount.toFixed(2)}`;
    document.getElementById('detailUnpaidAmount').textContent = `¥${unpaidAmount.toFixed(2)}`;
    
    // 业务团队字段
    document.getElementById('detailBusinessStaff').textContent = order.business_staff || '-';
    document.getElementById('detailServiceStaff').textContent = order.service_staff || '-';
    document.getElementById('detailOperationStaff').textContent = order.operation_staff || '-';
    document.getElementById('detailTeam').textContent = order.team || '-';
    
    // 归属项目：确保显示名称而非ID
    let projectDisplay = order.project || '-';
    if (/^\d+$/.test(projectDisplay) && order.project_id) {
        // 如果project字段是纯数字，尝试从缓存获取名称
        try {
            const projectsResult = await window.api.getProjects();
            if (projectsResult.success && projectsResult.data) {
                const proj = projectsResult.data.find(p => p.id === order.project_id);
                if (proj) projectDisplay = proj.name;
            }
        } catch (e) {}
    }
    document.getElementById('detailProject').textContent = projectDisplay;
    document.getElementById('detailCompany').textContent = order.company || '-';
    
    // 订单状态
    const statusEl = document.getElementById('detailStatus');
    statusEl.textContent = order.status;
    statusEl.className = `px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusClass(order.status)}`;
    
    // 加载备注
    const remarksList = document.getElementById('detailRemarksList');
    remarksList.innerHTML = '';
    if (Array.isArray(order.remarks) && order.remarks.length > 0) {
        order.remarks.forEach(r => {
            const div = document.createElement('div');
            div.className = 'p-2 bg-white rounded border border-gray-100';
            div.innerHTML = `<p class="text-gray-500 mb-1">${formatDate(r.date)}</p><p class="text-gray-800">${r.content}</p>`;
            remarksList.appendChild(div);
        });
    } else {
        remarksList.innerHTML = '<p class="text-gray-400 italic">暂无备注</p>';
    }
    
    // 加载合同状态（纯展示，无操作按钮）
    const contractInfo = document.getElementById('contractInfo');
    if (order.contract_number) {
        contractInfo.innerHTML = `
            <div class="space-y-1">
                <p class="text-green-600 font-medium"><i class="fas fa-check-circle mr-1"></i>已签署</p>
                <p class="text-gray-600">合同编号: ${order.contract_number}</p>
                ${order.contract_sign_date ? `<p class="text-gray-600">签署日期: ${order.contract_sign_date}</p>` : ''}
            </div>
        `;
    } else if (order.no_contract_required) {
        contractInfo.innerHTML = `<p class="text-gray-500 italic"><i class="fas fa-minus-circle mr-1"></i>无需合同</p>`;
    } else {
        contractInfo.innerHTML = `<p class="text-orange-500 italic"><i class="fas fa-exclamation-circle mr-1"></i>未签署</p>`;
    }
    
    // 加载收款记录
    loadOrderPaymentRecordsFromData(order);
    
    // 加载售后记录
    const afterSalesList = document.getElementById('afterSalesList');
    afterSalesList.innerHTML = '<p class="text-gray-400 italic">加载中...</p>';
    try {
        const aftersalesResult = await api.getOrderAfterSales(id);
        if (aftersalesResult.success && Array.isArray(aftersalesResult.data) && aftersalesResult.data.length > 0) {
            afterSalesList.innerHTML = '';
            aftersalesResult.data.forEach(a => {
                const div = document.createElement('div');
                div.className = 'p-2 bg-red-50 rounded border border-red-100';
                div.innerHTML = `<p class="font-medium text-red-800">${a.aftersales_type} (${formatDate(a.created_at)})</p><p class="text-red-600">${a.content || ''}</p>`;
                if (a.aftersales_amount > 0) div.innerHTML += `<p class="font-bold">退款金额: ¥${a.aftersales_amount.toFixed(2)}</p>`;
                afterSalesList.appendChild(div);
            });
        } else {
            afterSalesList.innerHTML = '<p class="text-gray-400 italic">暂无售后记录</p>';
        }
    } catch (error) {
        console.error('❌ 加载售后记录失败:', error);
        afterSalesList.innerHTML = '<p class="text-red-400 italic">加载失败</p>';
    }
    
    // 加载关联的售后订单列表（销售订单才显示）
    const aftersaleOrdersList = document.getElementById('aftersaleOrdersList');
    const aftersaleOrdersContent = document.getElementById('aftersaleOrdersContent');
    if (aftersaleOrdersList && aftersaleOrdersContent) {
        if (order.aftersale_orders && order.aftersale_orders.length > 0) {
            aftersaleOrdersList.classList.remove('hidden');
            aftersaleOrdersContent.innerHTML = '';
            order.aftersale_orders.forEach(ao => {
                const div = document.createElement('div');
                div.className = 'flex justify-between items-center p-2 bg-white rounded border cursor-pointer hover:bg-gray-50';
                div.innerHTML = `
                    <span class="text-blue-600">订单#${ao.id} - ${ao.aftersale_type || '售后'}</span>
                    <span class="text-xs text-gray-500">${ao.status}</span>
                `;
                div.onclick = () => viewOrder(ao.id);
                aftersaleOrdersContent.appendChild(div);
            });
        } else {
            aftersaleOrdersList.classList.add('hidden');
        }
    }
    
    // 显示模态框
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.zIndex = '10000';
};

/**
 * 关闭订单详情模态框
 */
window.closeOrderDetailModal = function() {
    const modal = document.getElementById('orderDetailModal');
    if (modal) {
        // 清除inline style
        modal.style.display = 'none';
        modal.style.visibility = '';
        modal.style.opacity = '';
        modal.classList.add('hidden');
    }
};

/**
 * 打开收款模态框（从订单列表直接调用）
 */
window.openPaymentModal = async function(orderId) {
    
    const modal = document.getElementById('addPaymentModal');
    if (!modal) {
        console.error('⚠️ addPaymentModal not found in DOM!');
        showNotification('收款模态框未加载，请刷新页面', 'error');
        return;
    }
    
    // 设置订单ID
    const paymentOrderIdInput = document.getElementById('paymentOrderId');
    if (paymentOrderIdInput) {
        paymentOrderIdInput.value = orderId;
    }
    
    // 设置当前日期
    const paymentDateInput = document.getElementById('paymentDate');
    if (paymentDateInput) {
        paymentDateInput.value = new Date().toISOString().split('T')[0];
    }
    
    // 加载账户
    const accountSelect = document.getElementById('paymentAccount');
    if (accountSelect) {
        try {
            // ✅ 使用 API 替代 database.js
            const accountsResult = await window.api.getAccounts();
            if (accountsResult.success) {
                const accounts = accountsResult.data;
                accountSelect.innerHTML = '<option value="">请选择账户</option>';
                accounts.forEach(acc => {
                    accountSelect.innerHTML += `<option value="${acc.id}">${acc.name} (余额: ¥${acc.balance || 0})</option>`;
                });
            }
        } catch (error) {
            console.error('加载账户失败:', error);
        }
    }
    
    // 显示模态框
    modal.classList.remove('hidden');
};

window.openAddPaymentModal = async function() {
    
    const orderId = document.getElementById('detailOrderId').textContent;
    
    const modal = document.getElementById('addPaymentModal');
    
    if (!modal) {
        console.error('⚠️ addPaymentModal not found in DOM!');
        alert('登记收款模态框未加载，请刷新页面');
        return;
    }
    
    document.getElementById('paymentOrderId').value = orderId;
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    
    // 加载账户
    const accountSelect = document.getElementById('paymentAccount');
    try {
        const accountsResult = await window.api.getAccounts();
        if (accountsResult.success) {
            const accounts = accountsResult.data;
            accountSelect.innerHTML = '<option value="">请选择账户</option>';
            accounts.forEach(acc => {
                accountSelect.innerHTML += `<option value="${acc.id}">${acc.name} (余额: ¥${acc.balance || 0})</option>`;
            });
        }
    } catch (error) {
        console.error('加载账户失败:', error);
    }
    
    
    // 检查内层白框的z-index
    const modalContent = modal.querySelector('div');
    if (modalContent) {
    }
    
    modal.classList.remove('hidden');
};

window.closeAddPaymentModal = function() {
    document.getElementById('addPaymentModal').classList.add('hidden');
    document.getElementById('addPaymentModal').style.display = 'none';
};

window.savePayment = async function(event) {
    // 防止默认表单提交（安全检查）
    if (event && event.preventDefault) {
        event.preventDefault();
    }
    
    const orderId = document.getElementById('paymentOrderId').value;
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const date = document.getElementById('paymentDate').value;
    const type = document.getElementById('paymentType').value;
    const account_id = parseInt(document.getElementById('paymentAccount').value);
    const notes = document.getElementById('paymentNotes').value.trim();
    
    if (isNaN(amount) || !date || !account_id) {
        alert('请填写完整收款信息');
        return;
    }
    
    // 验证金额不超过应收款
    const unpaidAmountElement = document.querySelector('#orderDetailModal .text-red-600');
    if (unpaidAmountElement) {
        const unpaidText = unpaidAmountElement.textContent || unpaidAmountElement.innerText;
        const unpaidMatch = unpaidText.match(/应收：￥([\d,.]+)/);
        if (unpaidMatch) {
            const unpaidAmount = parseFloat(unpaidMatch[1].replace(/,/g, ''));
            if (amount > unpaidAmount) {
                alert(`收款金额￥${amount.toFixed(2)}不能超过应收款￥${unpaidAmount.toFixed(2)}！`);
                return;
            }
        }
    }
    
    try {
        // 调用后端API
        const response = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: orderId,
                payment_amount: amount,
                payment_date: date,
                payment_method: type,
                account_id: account_id,
                remark: notes,
                created_by: window.currentUserId || 1
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('收款登记成功，并已同步生成财务流水！', 'success');
            closeAddPaymentModal();
            viewOrder(orderId); // 刷新详情
            loadOrdersData(); // 刷新列表
        } else {
            alert(`收款登记失败：${result.message}`);
        }
    } catch (error) {
        console.error('收款登记错误:', error);
        alert('收款登记失败，请检查网络连接');
    }
};

// ==================== 售后订单功能（新版：独立订单） ====================

/**
 * 打开售后订单创建弹窗
 * @param {number|string} parentOrderId - 原订单ID
 */
window.openAftersaleOrderModal = async function(parentOrderId) {
    const modal = document.getElementById('aftersaleOrderModal');
    if (!modal) {
        showNotification('售后订单弹窗未加载，请刷新页面', 'error');
        return;
    }
    
    // 获取原订单信息
    try {
        const result = await window.api.getOrder(parentOrderId);
        if (!result.success) {
            showNotification('获取原订单信息失败', 'error');
            return;
        }
        const parentOrder = result.data;
        
        // 填充关联订单信息
        document.getElementById('aftersaleParentId').value = parentOrderId;
        document.getElementById('aftersaleParentOrderId').textContent = `#${parentOrderId}`;
        document.getElementById('aftersaleCustomerName').textContent = parentOrder.customer_name || '未知客户';
        
        // 设置默认日期
        document.getElementById('aftersaleOrderDate').value = new Date().toISOString().split('T')[0];
        
        // 加载人员下拉框（可选）
        await loadAftersaleStaffOptions();
        
        // 清空表单
        document.getElementById('aftersaleType').value = '';
        document.getElementById('aftersaleReason').value = '';
        document.getElementById('aftersaleTotalAmount').value = '0';
        document.getElementById('aftersaleTotalCost').value = '0';
        document.getElementById('aftersaleNegotiationAmount').value = '0';
        document.getElementById('aftersaleFinalAmount').textContent = '¥0.00';
        document.getElementById('aftersaleRemarks').value = '';
        
        // 绑定金额计算事件
        ['aftersaleTotalAmount', 'aftersaleNegotiationAmount'].forEach(id => {
            document.getElementById(id).onchange = calculateAftersaleFinalAmount;
        });
        
        // 显示弹窗
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    } catch (error) {
        console.error('打开售后订单弹窗失败:', error);
        showNotification('打开售后订单弹窗失败', 'error');
    }
};

/**
 * 加载售后订单人员下拉框选项
 */
async function loadAftersaleStaffOptions() {
    try {
        const usersResult = await window.api.getUsers();
        if (usersResult.success) {
            const users = usersResult.data || [];
            const staffOptions = '<option value="">继承原订单</option>' + 
                users.map(u => `<option value="${u.id}" data-name="${u.name}">${u.name}</option>`).join('');
            
            document.getElementById('aftersaleBusinessStaff').innerHTML = staffOptions;
            document.getElementById('aftersaleServiceStaff').innerHTML = staffOptions;
        }
        
        const teamsResult = await window.api.getTeams();
        if (teamsResult.success) {
            const teams = teamsResult.data || [];
            document.getElementById('aftersaleTeam').innerHTML = '<option value="">继承原订单</option>' + 
                teams.map(t => `<option value="${t.id}" data-name="${t.name}">${t.name}</option>`).join('');
        }
    } catch (error) {
        console.error('加载人员选项失败:', error);
    }
}

/**
 * 计算售后订单最终金额
 */
function calculateAftersaleFinalAmount() {
    const totalAmount = parseFloat(document.getElementById('aftersaleTotalAmount').value) || 0;
    const negotiationAmount = parseFloat(document.getElementById('aftersaleNegotiationAmount').value) || 0;
    const finalAmount = totalAmount + negotiationAmount;
    document.getElementById('aftersaleFinalAmount').textContent = `¥${finalAmount.toFixed(2)}`;
}

/**
 * 关闭售后订单弹窗
 */
window.closeAftersaleOrderModal = function() {
    const modal = document.getElementById('aftersaleOrderModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

/**
 * 提交售后订单
 */
window.submitAftersaleOrder = async function(event) {
    if (event) event.preventDefault();
    
    const parentOrderId = document.getElementById('aftersaleParentId').value;
    const aftersaleType = document.getElementById('aftersaleType').value;
    const aftersaleReason = document.getElementById('aftersaleReason').value;
    const orderDate = document.getElementById('aftersaleOrderDate').value;
    
    if (!parentOrderId || !aftersaleType || !aftersaleReason || !orderDate) {
        showNotification('请填写必填项', 'error');
        return;
    }
    
    // 收集表单数据
    const totalAmount = parseFloat(document.getElementById('aftersaleTotalAmount').value) || 0;
    const totalCost = parseFloat(document.getElementById('aftersaleTotalCost').value) || 0;
    const negotiationAmount = parseFloat(document.getElementById('aftersaleNegotiationAmount').value) || 0;
    const finalAmount = totalAmount + negotiationAmount;
    
    // 人员配置
    const businessStaffSelect = document.getElementById('aftersaleBusinessStaff');
    const serviceStaffSelect = document.getElementById('aftersaleServiceStaff');
    const teamSelect = document.getElementById('aftersaleTeam');
    
    const businessStaffId = businessStaffSelect.value ? parseInt(businessStaffSelect.value) : null;
    const businessStaff = businessStaffId ? businessStaffSelect.options[businessStaffSelect.selectedIndex].dataset.name : null;
    const serviceStaffId = serviceStaffSelect.value ? parseInt(serviceStaffSelect.value) : null;
    const serviceStaff = serviceStaffId ? serviceStaffSelect.options[serviceStaffSelect.selectedIndex].dataset.name : null;
    const teamId = teamSelect.value ? parseInt(teamSelect.value) : null;
    const team = teamId ? teamSelect.options[teamSelect.selectedIndex].dataset.name : null;
    
    // 备注
    const remarksText = document.getElementById('aftersaleRemarks').value.trim();
    const remarks = remarksText ? [{ date: orderDate, content: remarksText }] : [];
    
    // 提交数据
    const submitData = {
        parent_order_id: parseInt(parentOrderId),
        aftersale_type: aftersaleType,
        aftersale_reason: aftersaleReason,
        order_date: orderDate,
        total_amount: totalAmount,
        total_cost: totalCost,
        negotiation_amount: negotiationAmount,
        final_transaction_price: finalAmount,
        final_amount: finalAmount,
        final_cost: totalCost,
        business_staff: businessStaff,
        business_staff_id: businessStaffId,
        service_staff: serviceStaff,
        service_staff_id: serviceStaffId,
        team: team,
        team_id: teamId,
        remarks: remarks,
        status: '处理中'
    };
    
    // 禁用提交按钮
    const submitBtn = document.getElementById('aftersaleSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>创建中...';
    
    try {
        const response = await fetch('/api/orders/aftersale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(submitData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`售后订单创建成功，订单号: ${result.data.id}`, 'success');
            closeAftersaleOrderModal();
            loadOrdersData(); // 刷新订单列表
        } else {
            showNotification('创建失败: ' + (result.message || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('提交售后订单失败:', error);
        showNotification('提交失败: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus mr-1"></i>创建售后订单';
    }
};

// ==================== 售后记录功能（旧版：订单内记录） ====================

window.openAfterSalesModal = async function() {
    const orderId = document.getElementById('detailOrderId').textContent;
    document.getElementById('afterSalesOrderId').value = orderId;
    
    const accountSelect = document.getElementById('afterSalesAccount');
    try {
        const accountsResult = await window.api.getAccounts();
        if (accountsResult.success) {
            const accounts = accountsResult.data;
            accountSelect.innerHTML = '<option value="">请选择退款账户</option>';
            accounts.forEach(acc => {
                accountSelect.innerHTML += `<option value="${acc.id}">${acc.name}</option>`;
            });
        }
    } catch (error) {
        console.error('加载账户失败:', error);
    }
    
    document.getElementById('afterSalesModal').classList.remove('hidden');
    document.getElementById('afterSalesModal').style.display = 'flex';
    
    // 监听类型变化
    document.getElementById('afterSalesType').onchange = function() {
        if (this.value === '退款申请') {
            document.getElementById('refundAccountSection').classList.remove('hidden');
        } else {
            document.getElementById('refundAccountSection').classList.add('hidden');
        }
    };
};

window.closeAfterSalesModal = function() {
    document.getElementById('afterSalesModal').classList.add('hidden');
    document.getElementById('afterSalesModal').style.display = 'none';
};

async function saveAfterSales() {
    const orderId = document.getElementById('afterSalesOrderId').value;
    const type = document.getElementById('afterSalesType').value;
    const amount = parseFloat(document.getElementById('afterSalesAmount').value) || 0;
    const content = document.getElementById('afterSalesContent').value;
    const account_id = parseInt(document.getElementById('afterSalesAccount').value) || null;
    
    if (type === '退款申请' && (amount <= 0 || !account_id)) {
        showNotification('退款必须填写金额和账户', 'error');
        return;
    }
    
    try {
        // ✅ 使用新API
        const result = await api.addOrderAfterSales({
            order_id: parseInt(orderId),
            aftersales_type: type,
            aftersales_amount: amount,
            account_id: account_id,
            content: content,
            created_by: window.currentUser?.id || null
        });
        
        if (result.success) {
            showNotification('售后记录保存成功！', 'success');
            closeAfterSalesModal();
            await viewOrder(orderId);
            await loadOrdersData();
        } else {
            showNotification('售后记录保存失败: ' + (result.message || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('售后保存异常:', error);
        showNotification('售后记录保存失败: ' + error.message, 'error');
    }
}


// ==================== P1阶段：订单收款记录显示 ====================

/**
 * 加载订单收款记录（使用已获取的订单数据）
 * @param {Object} orderData - 订单完整数据对象
 */
function loadOrderPaymentRecordsFromData(orderData) {
    const paymentList = document.getElementById('paymentRecordsList');
    const payments = orderData.payment_records || [];
    const contractAmount = parseFloat(orderData.contract_amount || orderData.total_amount || 0) || 0;
    
    // 清空列表
    paymentList.innerHTML = '';
    
    if (payments.length > 0) {
        // 渲染收款记录
        payments.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-100';
            
            // 判断是否为退款
            const isRefund = p.is_refund === 1;
            const amountClass = isRefund ? 'text-red-600' : 'text-green-600';
            const amountPrefix = isRefund ? '-' : '+';
            
            tr.innerHTML = `
                <td class="py-2 text-gray-700">${formatDate(p.transaction_date)}</td>
                <td class="py-2">
                    <span class="text-gray-600">${p.type || '收款'}</span>
                    ${isRefund ? '<span class="ml-1 text-xs bg-red-100 text-red-600 px-1 rounded">退款</span>' : ''}
                </td>
                <td class="py-2 ${amountClass} font-medium text-right">${amountPrefix}¥${Math.abs(p.amount).toFixed(2)}</td>
            `;
            paymentList.appendChild(tr);
        });
        
        // 添加统计行
        const summaryTr = document.createElement('tr');
        summaryTr.className = 'bg-blue-50 font-bold';
        summaryTr.innerHTML = `
            <td class="py-3 text-gray-700" colspan="2">
                合同金额：¥${contractAmount.toFixed(2)} | 
                已收：¥${(parseFloat(orderData.paid_amount) || 0).toFixed(2)} | 
                <span class="${(parseFloat(orderData.unpaid_amount) || 0) > 0 ? 'text-red-600' : 'text-green-600'}">
                    应收：¥${(parseFloat(orderData.unpaid_amount) || 0).toFixed(2)}
                </span>
            </td>
            <td class="py-3 text-right">
                <span class="px-2 py-1 rounded text-xs ${getPaymentStatusClass(orderData.payment_status)}">
                    ${orderData.payment_status || '未收款'}
                </span>
            </td>
        `;
        paymentList.appendChild(summaryTr);
    } else {
        paymentList.innerHTML = `
            <tr>
                <td colspan="3" class="py-4 text-center text-gray-400">
                    暂无收款记录
                    <div class="mt-2 text-xs text-gray-500">
                        合同金额：¥${contractAmount.toFixed(2)} | 应收：¥${contractAmount.toFixed(2)}
                    </div>
                </td>
            </tr>
        `;
    }
}

/**
 * 加载订单收款记录（通过API获取，已废弃）
 * @param {string} orderId - 订单ID
 * @param {number} contractAmount - 合同金额
 */
async function loadOrderPaymentRecords(orderId, contractAmount) {
    const paymentList = document.getElementById('paymentRecordsList');
    
    try {
        // 调用后端API获取订单收款记录
        const response = await fetch(`${window.api.baseURL}/api/orders/${orderId}`);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || '获取收款记录失败');
        }
        
        const orderData = result.data;
        const payments = orderData.payment_records || [];
        
        // 清空列表
        paymentList.innerHTML = '';
        
        if (payments.length > 0) {
            // 渲染收款记录
            payments.forEach(p => {
                const tr = document.createElement('tr');
                tr.className = 'border-b border-gray-100';
                
                // 判断是否为退款
                const isRefund = p.is_refund === 1;
                const amountClass = isRefund ? 'text-red-600' : 'text-green-600';
                const amountPrefix = isRefund ? '-' : '+';
                
                tr.innerHTML = `
                    <td class="py-2 text-gray-700">${p.transaction_date}</td>
                    <td class="py-2">
                        <span class="text-gray-600">${p.type || '收款'}</span>
                        ${isRefund ? '<span class="ml-1 text-xs bg-red-100 text-red-600 px-1 rounded">退款</span>' : ''}
                    </td>
                    <td class="py-2 ${amountClass} font-medium text-right">${amountPrefix}¥${Math.abs(p.amount).toFixed(2)}</td>
                `;
                paymentList.appendChild(tr);
            });
            
            // 添加统计行
            const summaryTr = document.createElement('tr');
            summaryTr.className = 'bg-blue-50 font-bold';
            summaryTr.innerHTML = `
                <td class="py-3 text-gray-700" colspan="2">
                    合同金额：¥${contractAmount.toFixed(2)} | 
                    已收：¥${(orderData.paid_amount || 0).toFixed(2)} | 
                    <span class="${(orderData.unpaid_amount || 0) > 0 ? 'text-red-600' : 'text-green-600'}">
                        应收：¥${(orderData.unpaid_amount || 0).toFixed(2)}
                    </span>
                </td>
                <td class="py-3 text-right">
                    <span class="px-2 py-1 rounded text-xs ${getPaymentStatusClass(orderData.payment_status)}">
                        ${orderData.payment_status || '未收款'}
                    </span>
                </td>
            `;
            paymentList.appendChild(summaryTr);
        } else {
            paymentList.innerHTML = `
                <tr>
                    <td colspan="3" class="py-4 text-center text-gray-400">
                        暂无收款记录
                        <div class="mt-2 text-xs text-gray-500">
                            合同金额：¥${contractAmount.toFixed(2)} | 应收：¥${contractAmount.toFixed(2)}
                        </div>
                    </td>
                </tr>
            `;
        }
        
        
    } catch (error) {
        console.error('❌ 加载收款记录失败:', error);
        paymentList.innerHTML = `
            <tr>
                <td colspan="3" class="py-4 text-center text-red-500">
                    加载失败：${error.message}
                </td>
            </tr>
        `;
    }
}

// ==================== P1-UI-4: 订单退款功能 ====================

/**
 * 打开退款模态框（使用表单模态框）
 */
function openRefundModal() {
    const orderId = window.currentViewingOrderId;
    if (!orderId) {
        alert('无法获取订单信息');
        return;
    }
    
    // 设置订单ID
    document.getElementById('refundOrderId').value = orderId;
    document.getElementById('refundAmount').value = '';
    document.getElementById('refundReason').value = '';
    
    // 显示模态框
    const modal = document.getElementById('refundModal');
    modal.classList.remove('hidden');
}

/**
 * 关闭退款模态框
 */
window.closeRefundModal = function() {
    const modal = document.getElementById('refundModal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

/**
 * 提交退款表单
 */
window.submitRefund = function(event) {
    // 防止默认表单提交（安全检查）
    if (event && event.preventDefault) {
        event.preventDefault();
    }
    
    const orderId = document.getElementById('refundOrderId').value;
    const amount = parseFloat(document.getElementById('refundAmount').value);
    const reason = document.getElementById('refundReason').value.trim();
    
    if (!orderId || isNaN(amount) || amount <= 0 || !reason) {
        alert('请填写完整的退款信息');
        return;
    }
    
    if (!confirm(`确认退款 ¥${amount.toFixed(2)} 元？\n退款原因：${reason}`)) {
        return;
    }
    
    processRefund(orderId, amount, reason);
};

/**
 * 处理退款请求
 */
async function processRefund(orderId, amount, reason) {
    try {
        // 使用统一的API模块创建退款流水
        const result = await window.api.addTransaction({
            order_id: parseInt(orderId),
            transaction_type: '支出',  // 退款是支出
            transaction_date: new Date().toISOString().split('T')[0],
            amount: Math.abs(amount), // 使用正数
            account_id: 1, // 默认账户
            payer_name: '公司', // 退款方
            payee_name: '客户', // 收款方
            purpose: '订单退款',
            remark: reason,
            is_refund: 1,
            refund_type: '订单退款',
            original_order_id: parseInt(orderId)
        });
        
        if (result.success) {
            showNotification(`退款成功！退款金额：￥${amount.toFixed(2)}`, 'success');
            closeRefundModal();
            // 刷新订单详情和列表
            viewOrder(orderId);
            loadOrdersData();
        } else {
            showNotification(`退款失败：${result.message || '未知错误'}`, 'error');
        }
    } catch (error) {
        console.error('退款请求失败:', error);
        showNotification(`退款失败：${error.message}`, 'error');
    }
}

// ==================== P1-UI-6: 缺失函数补全 ====================

/**
 * 订单流转（状态变更）
 */
window.processOrder = async function(orderId) {
    try {
        const result = await api.getOrder(orderId);
        if (!result.success || !result.data) {
            showNotification('订单查询失败: ' + (result.message || '订单不存在'), 'error');
            return;
        }
        
        const order = result.data;
        const statusOptions = ['待确认', '服务中', '已完成', '已取消', '售后中'];
        const currentStatus = order.status || '待确认';
        const currentIndex = statusOptions.indexOf(currentStatus);
        
        let optionsHtml = '';
        statusOptions.forEach((status, index) => {
            if (index !== currentIndex) {
                optionsHtml += `\n${index + 1}. ${status}`;
            }
        });
        
        const newStatusInput = prompt(
            `当前状态：${currentStatus}\n\n请输入新状态编号：${optionsHtml}`,
            ''
        );
        
        if (!newStatusInput) return;
        
        const newIndex = parseInt(newStatusInput) - 1;
        if (isNaN(newIndex) || newIndex < 0 || newIndex >= statusOptions.length) {
            alert('无效的状态编号');
            return;
        }
        
        const newStatus = statusOptions[newIndex];
        if (newStatus === currentStatus) {
            alert('新状态与当前状态相同');
            return;
        }
        
        if (!confirm(`确认将订单状态从"${currentStatus}"变更为"${newStatus}"？`)) {
            return;
        }
        
        // 更新订单状态
        // 先获取完整订单数据
        const orderResult = await api.getOrder(orderId);
        if (!orderResult.success || !orderResult.data) {
            showNotification('获取订单数据失败', 'error');
            return;
        }
        
        // 修改状态
        const fullOrderData = orderResult.data;
        fullOrderData.status = newStatus;
        
        // 提交完整数据
        const updateResult = await api.updateOrder(orderId, fullOrderData);
        if (updateResult.success) {
            showNotification(`订单状态已更新为：${newStatus}`, 'success');
            await loadOrdersData();
        } else {
            showNotification(`状态更新失败：${updateResult.message || '未知错误'}`, 'error');
        }
    } catch (error) {
        console.error('订单流转异常:', error);
        showNotification(`订单流转失败：${error.message}`, 'error');
    }
};

/**
 * 打开签署合同模态框
 */
window.openSignContractModal = function(orderId) {
    // 设置默认值
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('signContractOrderId').value = orderId;
    document.getElementById('signContractNumber').value = '';
    document.getElementById('signContractDate').value = today;
    document.getElementById('signContractStatus').value = '服务中';
    
    // 显示模态框
    const modal = document.getElementById('signContractModal');
    modal.classList.remove('hidden');
    
    // 聚焦合同编号输入框
    setTimeout(() => {
        document.getElementById('signContractNumber').focus();
    }, 100);
};

/**
 * 关闭签署合同模态框
 */
window.closeSignContractModal = function() {
    const modal = document.getElementById('signContractModal');
    modal.classList.add('hidden');
};

/**
 * 保存合同签署
 */
window.saveContractSign = async function() {
    const orderId = document.getElementById('signContractOrderId').value;
    const contractNumber = document.getElementById('signContractNumber').value.trim();
    const signDate = document.getElementById('signContractDate').value;
    const status = document.getElementById('signContractStatus').value;
    
    // 验证
    if (!contractNumber) {
        alert('请输入合同编号');
        document.getElementById('signContractNumber').focus();
        return;
    }
    
    if (!signDate) {
        alert('请选择签署日期');
        document.getElementById('signContractDate').focus();
        return;
    }
    
    try {
        // 调用后端API更新订单
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contract_number: contractNumber,
                contract_sign_date: signDate,
                status: status,
                no_contract_required: false
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`合同签署成功！\n合同编号：${contractNumber}`);
            closeSignContractModal();
            // 刷新订单详情和列表
            viewOrder(orderId);
            loadOrdersData();
        } else {
            alert(`合同签署失败：${result.message}`);
        }
    } catch (error) {
        console.error('签署合同错误:', error);
        alert('签署失败，请检查网络连接');
    }
};

/**
 * 标记为无需合同
 */
window.markNoContractRequired = async function(orderId) {
    if (!confirm('确认标记此订单为“无需合同”？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                no_contract_required: true,
                contract_number: null,
                contract_sign_date: null
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('已标记为无需合同');
            // 刷新订单详情和列表
            viewOrder(orderId);
            loadOrdersData();
        } else {
            alert(`操作失败：${result.message}`);
        }
    } catch (error) {
        console.error('标记无需合同错误:', error);
        alert('操作失败，请检查网络连接');
    }
};

// ==================== 订单全生命周期管理功能 ====================

/**
 * 打开编辑订单模态框
 */
window.openEditOrderModal = async function(orderId) {
    console.log('📝 [编辑订单] 开始加载，订单ID:', orderId);
    
    try {
        // 检查模态框是否存在
        const modal = document.getElementById('addOrderModal');
        if (!modal) {
            console.error('❌ 模态框未找到!');
            showNotification('模态框未找到，请刷新页面', 'error');
            return;
        }
        
        // 🔍 关键调试：检查orderLogEntry元素是否存在
        const orderLogEntryCheck = document.getElementById('orderLogEntry');
        console.log('🔍 [编辑订单] 打开时orderLogEntry元素状态:', {
            exists: !!orderLogEntryCheck,
            element: orderLogEntryCheck,
            hidden: orderLogEntryCheck?.classList.contains('hidden'),
            display: orderLogEntryCheck?.style.display,
            innerHTML: orderLogEntryCheck?.innerHTML.substring(0, 100)
        });
        
        // 获取订单详情
        const result = await window.api.getOrder(orderId);
        
        if (!result.success) {
            throw new Error(result.message || '获取订单失败');
        }
        
        const order = result.data;
        
        // 检查审核状态（双审核）
        const businessAudited = order.business_audit_status === 1 || order.is_audited === 1;
        const financeAudited = order.finance_audit_status === 1;
        
        if (financeAudited) {
            console.warn('⚠️ 订单已财务审核，不可编辑');
            showNotification('已财务审核订单不可编辑，请先反财务审核', 'error');
            return;
        }
        
        if (businessAudited) {
            console.warn('⚠️ 订单已业务审核，不可编辑');
            showNotification('已业务审核订单不可编辑，请先反业务审核', 'error');
            return;
        }
        
        // 设置编辑模式标志
        window.currentEditingOrderId = orderId;
        
        // 修改标题
        const modalTitle = modal.querySelector('h3');
        if (modalTitle) {
            modalTitle.textContent = '编辑订单';
        }
        
        // 关键修复：修改按钮文字为"保存修改"
        const submitBtn = document.getElementById('orderSubmitBtn');
        if (submitBtn) {
            submitBtn.textContent = '保存修改';
        }
                
        // 🔧 核心修复：预加载服务列表缓存，确保商品选择框有数据
        if (cachedServices.length === 0) {
            try {
                const servicesRes = await fetch('/api/services', { credentials: 'include' });
                const servicesResult = await servicesRes.json();
                if (servicesResult.success && servicesResult.data) {
                    cachedServices = servicesResult.data;
                    console.log('✅ [编辑订单] 预加载服务列表:', cachedServices.length);
                }
            } catch (e) {
                console.error('❌ 预加载服务列表失败:', e);
            }
        }
                
        // 关键修复：先加载人员、团队、项目下拉框数据
        await loadCustomersToSelect();  // 加载客户下拉框
        await loadOrderFormSelects();   // 加载人员/团队/项目下拉框
        
        // 🔧 修复：等待下拉框DOM渲染完成
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // 🔧 修复：清除表单验证残留样式（防止红框显示）
        modal.querySelectorAll('.border-red-500, .ring-red-500').forEach(el => {
            el.classList.remove('border-red-500', 'ring-red-500');
        });
        modal.querySelectorAll('input, select').forEach(el => {
            el.setCustomValidity('');
        });
        
        // 填充表单数据（安全访问，检查元素是否存在）
        const customerEl = document.getElementById('orderCustomer');  // 隐藏字段
        const customerSearchEl = document.getElementById('orderCustomerSearch');  // 显示搜索框
        const dateEl = document.getElementById('orderDate');
        const businessStaffEl = document.getElementById('orderBusinessStaff');
        const serviceStaffEl = document.getElementById('orderServiceStaff');
        const operationStaffEl = document.getElementById('orderOperationStaff');
        const teamEl = document.getElementById('orderTeam');
        const projectEl = document.getElementById('orderProject');
        const companyEl = document.getElementById('orderCompany');
        const remarksEl = document.getElementById('orderRemarks');
        
        
        // 填充客户信息（需要同时设置ID和名称）
        if (customerEl && order.customer_id) {
            customerEl.value = order.customer_id;
        }
        
        // 设置客户搜索框显示名称（需要查找客户名称）
        if (customerSearchEl && order.customer_id) {
            // 从订单数据中获取客户名称（如果后端返回了）
            const customerName = order.customer_name || order.shop_name || '';
            customerSearchEl.value = customerName;
        }
        if (dateEl) {
            // 修复：将后端返回的日期转换为HTML5 date input所需的yyyy-MM-dd格式
            let orderDate = order.order_date || '';
            if (orderDate) {
                try {
                    // 如果是"Thu, 12 Feb 2026 00:00:00 GMT"类型的字符串，转换为Date对象
                    const dateObj = new Date(orderDate);
                    // 转换为yyyy-MM-dd格式
                    orderDate = dateObj.toISOString().split('T')[0];
                } catch (e) {
                    console.warn('日期格式转换失败:', e);
                }
            }
            dateEl.value = orderDate;
        }
        
        // 🔧 关键修复：人员、团队、项目下拉框需要设置ID，并同步更新searchInput显示值
        
        // 辅助函数：设置select值并同步更新可搜索输入框
        const setSelectAndSyncInput = (selectEl, value, displayText) => {
            if (!selectEl || !value) return;
            selectEl.value = String(value);
            
            // 🔧 修复：查找可搜索输入框，支持多种容器结构
            // 结构可能是：
            // 1. container > [searchInput, select] - select.parentNode是container
            // 2. td > [container > searchInput], [select] - 需要在父元素中查找
            let searchInput = selectEl.parentNode?.querySelector('.searchable-staff-input, .searchable-team-input, .searchable-project-input');
            
            // 如果在parentNode中找不到，尝试在前一个兄弟元素中查找
            if (!searchInput && selectEl.previousElementSibling) {
                searchInput = selectEl.previousElementSibling.querySelector?.('input') || 
                              (selectEl.previousElementSibling.tagName === 'INPUT' ? selectEl.previousElementSibling : null);
            }
            
            if (searchInput) {
                searchInput.value = displayText || '';
                console.log('✅ [同步显示]', selectEl.id, '->', displayText);
            } else {
                console.warn('⚠️ 未找到searchInput:', selectEl.id);
            }
        };
        
        if (businessStaffEl && order.business_staff_id) {
            setSelectAndSyncInput(businessStaffEl, order.business_staff_id, order.business_staff || '');
        }
        if (serviceStaffEl && order.service_staff_id) {
            setSelectAndSyncInput(serviceStaffEl, order.service_staff_id, order.service_staff || '');
        }
        if (operationStaffEl && order.operation_staff_id) {
            setSelectAndSyncInput(operationStaffEl, order.operation_staff_id, order.operation_staff || '');
        }
        if (teamEl && order.team_id) {
            setSelectAndSyncInput(teamEl, order.team_id, order.team || '');
        }
        if (projectEl && order.project_id) {
            // 🔧 核心修复：如果order.project是数字（历史数据问题），从select中查找对应名称
            let projectDisplayName = order.project || '';
            if (/^\d+$/.test(projectDisplayName)) {
                // project字段存的是ID，需要查找对应名称
                const projectOpt = projectEl.querySelector(`option[value="${order.project_id}"]`);
                if (projectOpt) {
                    projectDisplayName = projectOpt.textContent.split(' (')[0]; // 去掉状态后缀
                }
            }
            setSelectAndSyncInput(projectEl, order.project_id, projectDisplayName);
        }
        if (companyEl) {
            companyEl.value = order.company || '';
        }
        if (remarksEl) {
            remarksEl.value = order.remarks || '';
        }
        
        
        // 关键修复：填充商品明细之前，先清空现有的商品行
        resetOrderItemsList();
        
        // 🔧 关键修复：等待第一行服务选项加载完成
        const firstSelect = document.querySelector('.order-item-select');
        if (firstSelect && firstSelect.options.length <= 1) {
            await loadServicesToItemSelect(firstSelect);
        }
        
        // 填充商品明细（加载order_items）
        if (order.items && order.items.length > 0) {
            console.log('📦 [编辑订单] 开始填充商品明细，共', order.items.length, '项');
            
            // 关键修复：循环填充所有商品，而不是只填充第一个
            for (let i = 0; i < order.items.length; i++) {
                const item = order.items[i];
                let row;
                
                if (i === 0) {
                    // 第一行使用现有的
                    row = document.querySelector('.order-item-row');
                } else {
                    // 额外的商品需要添加新行
                    window.addOrderItem();
                    const allRows = document.querySelectorAll('.order-item-row');
                    row = allRows[allRows.length - 1];
                    // 等待新行的服务选项加载
                    await new Promise(r => setTimeout(r, 50));
                }
                
                if (row) {
                    const select = row.querySelector('.order-item-select');
                    
                    if (select) {
                        // 确保服务选项已加载
                        if (select.options.length <= 1) {
                            await loadServicesToItemSelect(select);
                        }
                        
                        console.log(`📦 [编辑订单] 设置商品${i+1}:`, item.service_name, 'service_id=', item.service_id);
                        
                        // 设置选中值
                        let setSuccess = false;
                        let selectedText = '';
                        if (item.service_id) {
                            select.value = String(item.service_id);
                            setSuccess = (select.value == item.service_id);
                            if (setSuccess) {
                                selectedText = select.options[select.selectedIndex]?.text || item.service_name;
                            }
                        }
                        
                        // 如果ID匹配失败，尝试按名称匹配
                        if (!setSuccess && item.service_name) {
                            for (let j = 0; j < select.options.length; j++) {
                                const optText = select.options[j].text;
                                if (optText.includes(item.service_name)) {
                                    select.selectedIndex = j;
                                    selectedText = optText;
                                    setSuccess = true;
                                    break;
                                }
                            }
                        }
                        
                        if (setSuccess) {
                            select.dispatchEvent(new Event('change'));
                            
                            // 🔧 核心修复：同步更新可搜索输入框的显示值
                            const serviceSearchInput = select.parentNode?.querySelector('.searchable-service-input') ||
                                                       select.previousElementSibling?.querySelector?.('input');
                            if (serviceSearchInput) {
                                // 去掉价格后缀，只显示服务名称
                                const cleanName = item.service_name || selectedText.split(' (')[0];
                                serviceSearchInput.value = cleanName;
                                console.log(`✅ [商品${i+1}] 同步显示:`, cleanName);
                            }
                        } else {
                            console.warn(`⚠️ 商品${i+1}匹配失败:`, item.service_name);
                        }
                        
                        // 设置数量和价格
                        const priceInput = row.querySelector('.order-item-price');
                        const quantityInput = row.querySelector('.order-item-quantity');
                        if (priceInput) priceInput.value = item.price || 0;
                        if (quantityInput) quantityInput.value = item.quantity || 1;
                        
                        // 计算该行小计
                        const totalCell = row.querySelector('.order-item-total');
                        if (totalCell) {
                            const total = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
                            totalCell.textContent = `¥${total.toFixed(2)}`;
                        }
                    }
                }
            }
        }
        
        // 关键新增：回显优惠和成本数据
        
        // 🔧 核心修复：回显议价金额（negotiation_amount）
        const negotiationAmountEl = document.getElementById('negotiationAmount');
        if (negotiationAmountEl) {
            // 优先使用 negotiation_amount，其次计算：final_amount - total_amount
            let negotiationValue = 0;
            if (order.negotiation_amount != null) {
                negotiationValue = parseFloat(order.negotiation_amount) || 0;
            } else if (order.final_amount != null && order.total_amount != null) {
                // 议价金额 = 最终成交价 - 商品原价合计
                negotiationValue = parseFloat(order.final_amount) - parseFloat(order.total_amount);
            } else if (order.final_transaction_price != null && order.total_amount != null) {
                negotiationValue = parseFloat(order.final_transaction_price) - parseFloat(order.total_amount);
            }
            negotiationAmountEl.value = negotiationValue;
        }
        
        // 优惠类型和金额（旧版兼容）
        if (order.discount_type) {
            const discountTypeRadio = document.querySelector(`input[name="discountType"][value="${order.discount_type}"]`);
            if (discountTypeRadio) {
                discountTypeRadio.checked = true;
            }
        }
        
        const discountPercentEl = document.getElementById('discountPercent');
        const discountAmountEl = document.getElementById('discountAmount');
        if (discountPercentEl && order.discount_percent != null) {
            discountPercentEl.value = order.discount_percent;
        }
        if (discountAmountEl && order.discount_amount != null) {
            discountAmountEl.value = order.discount_amount;
        }
        
        // 额外成本
        const extraCostTypeEl = document.getElementById('extraCostType');
        const extraCostNameEl = document.getElementById('extraCostName');
        const extraCostAmountEl = document.getElementById('extraCostAmount');
        
        if (extraCostTypeEl && order.extra_cost_type) {
            extraCostTypeEl.value = order.extra_cost_type;
            
            // 如果是自定义类型，显示名称输入框
            if (order.extra_cost_type === 'custom' && extraCostNameEl) {
                extraCostNameEl.classList.remove('hidden');
                extraCostNameEl.value = order.extra_cost_name || '';
            }
            
            // 启用金额输入框
            if (extraCostAmountEl && order.extra_cost_type !== '') {
                extraCostAmountEl.disabled = false;
            }
        }
        
        if (extraCostAmountEl && order.extra_cost_amount != null) {
            extraCostAmountEl.value = order.extra_cost_amount;
        }
        
        // 触发计算，更新总计显示
        updateOrderItemsTotal();
        
        // 🔧 核心修复：延时触发议价计算，确保成交价正确显示
        setTimeout(() => {
            calculateNegotiation();
        }, 200);
        
        // ✅ 显示操作日志入口（编辑模式）
        const orderLogEntry = document.getElementById('orderLogEntry');
        console.log('🔍 [编辑订单] 查找操作日志入口:', orderLogEntry);
        if (orderLogEntry) {
            // 使用flex而不是block，确保在flex布局中正确显示
            orderLogEntry.style.display = 'flex';
            orderLogEntry.style.visibility = 'visible';
            orderLogEntry.style.opacity = '1';
            console.log('✅ [编辑订单] 操作日志入口已显示, display=flex, visibility=visible');
        } else {
            console.error('❌ [编辑订单] 操作日志入口元素未找到！请检查模板是否正确加载');
        }
        
        // 显示模态框（关键修复：和创建订单一样，必须设置inline style）
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = '10000';
        
        
    } catch (error) {
        console.error('❗ 加载订单详情失败:', error);
        showNotification(error.message || '加载失败', 'error');
    }
};

// 验证函数是否正确注册

/**
 * 保存编辑后的订单
 */
window.saveEditOrder = async function() {
    const orderId = window.currentEditingOrderId;
    if (!orderId) {
        showNotification('订单ID丢失', 'error');
        return;
    }
    
    
    // 收集表单数据（复用 saveNewOrder 的逻辑）
    const orderData = {
        customer_id: parseInt(document.getElementById('orderCustomer').value),
        order_date: document.getElementById('orderDate').value,
        business_staff: document.getElementById('orderBusinessStaff').value,
        service_staff: document.getElementById('orderServiceStaff').value,
        operation_staff: document.getElementById('orderOperationStaff').value,
        team: document.getElementById('orderTeam').value,
        project: document.getElementById('orderProject').value,
        company: document.getElementById('orderCompany').value,
        remarks: document.getElementById('orderRemarks').value
        // TODO: 添加商品明细
    };
    
    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('订单修改成功', 'success');
            document.getElementById('addOrderModal').classList.add('hidden');
            window.currentEditingOrderId = null;
            loadOrdersData();
        } else {
            showNotification(result.message || '修改失败', 'error');
        }
    } catch (error) {
        console.error('❗ 修改订单失败:', error);
        showNotification('修改失败', 'error');
    }
};

/**
 * 业务审核订单
 */
window.auditBusiness = async function(orderId) {
    if (!confirm('确认进行业务审核？\n业务审核后订单将不可编辑，需进行财务审核。')) {
        return;
    }
    
    
    try {
        const response = await fetch(`/api/orders/${orderId}/audit-business`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('业务审核成功', 'success');
            loadOrdersData();
        } else {
            showNotification(result.message || '业务审核失败', 'error');
        }
    } catch (error) {
        console.error('❗ 业务审核失败:', error);
        showNotification('业务审核失败', 'error');
    }
};

/**
 * 财务审核订单
 */
window.auditFinance = async function(orderId) {
    if (!confirm('确认进行财务审核？\n财务审核后订单将完全锁定，不可做任何修改。')) {
        return;
    }
    
    
    try {
        const response = await fetch(`/api/orders/${orderId}/audit-finance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('财务审核成功', 'success');
            loadOrdersData();
        } else {
            showNotification(result.message || '财务审核失败', 'error');
        }
    } catch (error) {
        console.error('❗ 财务审核失败:', error);
        showNotification('财务审核失败', 'error');
    }
};

/**
 * 反业务审核
 */
window.unauditBusiness = async function(orderId) {
    if (!confirm('确认反业务审核？\n反审核后订单可再次编辑。')) {
        return;
    }
    
    
    try {
        const response = await fetch(`/api/orders/${orderId}/unaudit-business`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('反业务审核成功', 'success');
            loadOrdersData();
        } else {
            showNotification(result.message || '反业务审核失败', 'error');
        }
    } catch (error) {
        console.error('❗ 反业务审核失败:', error);
        showNotification('反业务审核失败', 'error');
    }
};

/**
 * 反财务审核
 */
window.unauditFinance = async function(orderId) {
    if (!confirm('确认反财务审核？\n反审核后订单回到业务审核状态。')) {
        return;
    }
    
    
    try {
        const response = await fetch(`/api/orders/${orderId}/unaudit-finance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('反财务审核成功', 'success');
            loadOrdersData();
        } else {
            showNotification(result.message || '反财务审核失败', 'error');
        }
    } catch (error) {
        console.error('❗ 反财务审核失败:', error);
        showNotification('反财务审核失败', 'error');
    }
};

// 兼容旧的审核函数（映射到业务审核）
window.auditOrder = window.auditBusiness;
window.unauditOrder = window.unauditBusiness;

/**
 * 删除订单（软删除）
 */
window.deleteOrder = async function(orderId) {
    if (!confirm('确认删除该订单？\n订单将移入回收站，可以恢复。')) {
        return;
    }
    
    
    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('订单已移入回收站', 'success');
            loadOrdersData();
        } else {
            showNotification(result.message || '删除失败', 'error');
        }
    } catch (error) {
        console.error('❗ 删除订单失败:', error);
        showNotification('删除失败', 'error');
    }
};

/**
 * 恢复订单（从回收站）
 */
window.restoreOrder = async function(orderId) {
    if (!confirm('确认恢复该订单？')) {
        return;
    }
    
    
    try {
        const response = await fetch(`/api/orders/${orderId}/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('订单恢复成功', 'success');
            loadRecycleOrders(); // 刷新回收站列表
        } else {
            showNotification(result.message || '恢复失败', 'error');
        }
    } catch (error) {
        console.error('❗ 恢复订单失败:', error);
        showNotification('恢复失败', 'error');
    }
};

/**
 * 加载回收站订单列表
 */
window.loadRecycleOrders = async function() {
    
    const recycleList = document.getElementById('recycleOrdersList');
    if (!recycleList) return;
    
    try {
        const response = await fetch('/api/orders/recycle?page=1&page_size=50');
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || '加载失败');
        }
        
        recycleList.innerHTML = '';
        
        if (result.data.length === 0) {
            recycleList.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-gray-400">回收站为空</td></tr>';
            return;
        }
        
        result.data.forEach(order => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50';
            tr.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-600">${order.id}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${order.customer_name || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${order.business_staff || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-600">¥${(parseFloat(order.contract_amount) || 0).toFixed(2)}</td>
                <td class="px-4 py-3 text-sm text-gray-400">${order.deleted_at || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-400">${order.deleted_by || '-'}</td>
                <td class="px-4 py-3 text-center text-sm">
                    <button class="text-green-600 hover:text-green-900 mr-2" onclick="restoreOrder('${order.id}')" title="恢复">
                        <i class="fas fa-undo"></i> 恢复
                    </button>
                    <button class="text-red-600 hover:text-red-900" onclick="permanentlyDeleteOrder('${order.id}')" title="彻底删除">
                        <i class="fas fa-trash-alt"></i> 彻底删除
                    </button>
                </td>
            `;
            recycleList.appendChild(tr);
        });
        
    } catch (error) {
        console.error('❗ 加载回收站失败:', error);
        showNotification('加载回收站失败', 'error');
    }
};

/**
 * 导出订单（Excel格式）
 */
window.exportOrders = async function() {
    
    // 收集筛选条件
    const params = new URLSearchParams();
    if (orderFilterStartDate) params.append('start_date', orderFilterStartDate);
    if (orderFilterEndDate) params.append('end_date', orderFilterEndDate);
    params.append('date_type', 'contract_date');
    
    try {
        const response = await fetch(`/api/orders/export?${params.toString()}`);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || '导出失败');
        }
        
        // 转换为CSV格式（简单实现）
        const orders = result.data;
        let csv = '订单ID,客户名称,业务人员,服务人员,团队,合同金额,订单日期,状态,审核状态\n';
        
        orders.forEach(order => {
            csv += `${order.id},${order.customer_name || '-'},${order.business_staff || '-'},${order.service_staff || '-'},${order.team || '-'},${order.contract_amount || 0},${order.order_date || '-'},${order.status || '-'},${order.is_audited === 1 ? '已审核' : '未审核'}\n`;
        });
        
        // 触发下载
        const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `订单导出_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        showNotification(`已导出 ${orders.length} 条订单`, 'success');
        
    } catch (error) {
        console.error('❗ 导出订单失败:', error);
        showNotification('导出失败', 'error');
    }
};

// ==================== 分页功能 ====================

/**
 * 渲染分页控件
 */
function renderOrderPagination() {
    const totalPages = Math.ceil(orderTotalCount / orderPageSize);
    const startIndex = (orderCurrentPage - 1) * orderPageSize + 1;
    const endIndex = Math.min(orderCurrentPage * orderPageSize, orderTotalCount);
    
    // 更新信息显示
    const infoEl = document.getElementById('orderPaginationInfo');
    if (infoEl) {
        infoEl.textContent = `显示 ${startIndex}-${endIndex} / 共 ${orderTotalCount} 条`;
    }
    
    // 更新页码显示
    const pageNumbersEl = document.getElementById('orderPageNumbers');
    if (pageNumbersEl) {
        pageNumbersEl.textContent = `第 ${orderCurrentPage} / ${totalPages} 页`;
    }
    
    // 更新按钮状态
    const firstBtn = document.getElementById('orderFirstPage');
    const prevBtn = document.getElementById('orderPrevPage');
    const nextBtn = document.getElementById('orderNextPage');
    const lastBtn = document.getElementById('orderLastPage');
    
    if (firstBtn) firstBtn.disabled = orderCurrentPage === 1;
    if (prevBtn) prevBtn.disabled = orderCurrentPage === 1;
    if (nextBtn) nextBtn.disabled = orderCurrentPage >= totalPages;
    if (lastBtn) lastBtn.disabled = orderCurrentPage >= totalPages;
}

/**
 * 切换页码
 */
window.changeOrderPage = function(page) {
    const totalPages = Math.ceil(orderTotalCount / orderPageSize);
    
    if (page === 'prev') {
        if (orderCurrentPage > 1) orderCurrentPage--;
    } else if (page === 'next') {
        if (orderCurrentPage < totalPages) orderCurrentPage++;
    } else if (page === 'last') {
        orderCurrentPage = totalPages;
    } else if (typeof page === 'number') {
        orderCurrentPage = Math.max(1, Math.min(page, totalPages));
    }
    
    loadOrdersData();
    
    // 滚动到顶部
    const mainContent = document.querySelector('main');
    if (mainContent) mainContent.scrollTop = 0;
};

/**
 * 改变每页显示数量
 */
window.changeOrderPageSize = function(size) {
    orderPageSize = parseInt(size);
    orderCurrentPage = 1; // 重置到第一页
    loadOrdersData();
};

// ==================== 其他成本管理功能 ====================

// 全局变量：其他成本数据
 let otherCostsData = [];
 let otherCostIdCounter = 0; // 临时ID计数器

/**
 * 添加其他成本项
 */
window.addOtherCost = function() {
    const costName = prompt('请输入成本名称（例：差旅费、物流费、税费）：');
    if (!costName || costName.trim() === '') {
        return;
    }
    
    const costAmountStr = prompt('请输入成本金额：');
    const costAmount = parseFloat(costAmountStr);
    if (isNaN(costAmount) || costAmount < 0) {
        alert('请输入有效的成本金额！');
        return;
    }
    
    const costNote = prompt('请输入成本说明（可选）：') || '';
    
    // 添加到数据数组
    otherCostsData.push({
        id: ++otherCostIdCounter,
        cost_name: costName.trim(),
        cost_amount: costAmount,
        cost_note: costNote.trim()
    });
    
    // 重新渲染列表
    renderOtherCostsList();
    // 重新计算总计
    calculateOrderTotal();
};

/**
 * 渲染其他成本列表
 */
function renderOtherCostsList() {
    const listContainer = document.getElementById('otherCostsList');
    if (!listContainer) return;
    
    if (otherCostsData.length === 0) {
        listContainer.innerHTML = '<div class="text-xs text-gray-500 text-center py-2">暂无其他成本</div>';
        updateOtherCostsTotal();
        return;
    }
    
    let html = '';
    otherCostsData.forEach((cost, index) => {
        html += `
            <div class="flex items-center justify-between gap-2 p-2 bg-white border border-orange-200 rounded text-xs">
                <div class="flex-1">
                    <span class="font-medium text-gray-800">${cost.cost_name}</span>
                    ${cost.cost_note ? `<span class="text-gray-500 ml-2">- ${cost.cost_note}</span>` : ''}
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-orange-700 font-medium">¥${cost.cost_amount.toFixed(2)}</span>
                    <button type="button" onclick="removeOtherCost(${cost.id})" class="text-red-500 hover:text-red-700">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    listContainer.innerHTML = html;
    updateOtherCostsTotal();
}

/**
 * 删除其他成本项
 */
window.removeOtherCost = function(costId) {
    otherCostsData = otherCostsData.filter(cost => cost.id !== costId);
    renderOtherCostsList();
    calculateOrderTotal();
};

/**
 * 更新其他成本总计
 */
function updateOtherCostsTotal() {
    const total = otherCostsData.reduce((sum, cost) => sum + cost.cost_amount, 0);
    const totalEl = document.getElementById('otherCostsTotal');
    if (totalEl) {
        totalEl.textContent = `¥${total.toFixed(2)}`;
    }
}

/**
 * 获取其他成本总额
 */
function getOtherCostsTotal() {
    return otherCostsData.reduce((sum, cost) => sum + cost.cost_amount, 0);
}

/**
 * 清空其他成本数据
 */
function clearOtherCosts() {
    otherCostsData = [];
    renderOtherCostsList();
}

/**
 * 保存单条其他成本到数据库
 */
async function saveOrderOtherCost(orderId, cost) {
    const response = await fetch(`/api/orders/${orderId}/other-costs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cost_name: cost.cost_name,
            cost_amount: cost.cost_amount,
            cost_note: cost.cost_note || ''
        })
    });
    
    const result = await response.json();
    if (!result.success) {
        throw new Error(result.message || '保存失败');
    }
    
    return result;
}

// ==================== 选择商品模态框 ====================
let selectedProductIds = new Set(); // 已选商品ID集合
let allProductsList = []; // 全部商品列表

/**
 * 打开选择商品模态框
 */
window.openSelectProductsModal = async function() {
    const modal = document.getElementById('selectProductsModal');
    if (!modal) return;
    
    // 加载商品列表
    try {
        if (cachedServices.length > 0) {
            allProductsList = cachedServices;
        } else {
            const response = await fetch('/api/services', { credentials: 'include' });
            const result = await response.json();
            if (result.success) {
                allProductsList = result.data || [];
                cachedServices = allProductsList;
            }
        }
    } catch (error) {
        console.error('加载商品列表失败:', error);
        allProductsList = [];
    }
    
    // 清空已选
    selectedProductIds.clear();
    document.getElementById('selectedProductsCount').textContent = '0';
    document.getElementById('selectAllProducts').checked = false;
    document.getElementById('productSearchInput').value = '';
    
    // 渲染列表
    renderProductsList();
    
    modal.classList.remove('hidden');
};

/**
 * 关闭选择商品模态框
 */
window.closeSelectProductsModal = function() {
    const modal = document.getElementById('selectProductsModal');
    if (modal) modal.classList.add('hidden');
};

/**
 * 渲染商品列表
 */
function renderProductsList(keyword = '') {
    const tbody = document.getElementById('productsListBody');
    if (!tbody) return;
    
    let filtered = allProductsList;
    if (keyword && window.PinyinSearch) {
        filtered = allProductsList.filter(p => window.PinyinSearch.fuzzyMatch(p.name, keyword));
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-gray-500">无匹配商品</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(p => {
        const typeLabel = p.type === 'product' ? '商品' : '服务';
        const statusLabel = p.status === 'active' ? '<span class="text-green-600">启用</span>' : '<span class="text-gray-400">停用</span>';
        const isChecked = selectedProductIds.has(p.id) ? 'checked' : '';
        
        return `<tr class="hover:bg-gray-50 border-t">
            <td class="py-2 px-3"><input type="checkbox" class="product-checkbox" data-id="${p.id}" ${isChecked} onchange="toggleProductSelect(${p.id})"></td>
            <td class="py-2 px-3 text-sm">${p.name}</td>
            <td class="py-2 px-3 text-xs text-gray-500">${typeLabel}</td>
            <td class="py-2 px-3 text-right text-xs">¥${parseFloat(p.supply_price || 0).toFixed(2)}</td>
            <td class="py-2 px-3 text-right text-xs">¥${parseFloat(p.retail_price || p.price || 0).toFixed(2)}</td>
            <td class="py-2 px-3 text-center">${statusLabel}</td>
        </tr>`;
    }).join('');
}

/**
 * 过滤商品列表（搜索）
 */
window.filterProductsList = function() {
    const keyword = document.getElementById('productSearchInput')?.value || '';
    renderProductsList(keyword);
};

/**
 * 切换单个商品选中状态
 */
window.toggleProductSelect = function(productId) {
    if (selectedProductIds.has(productId)) {
        selectedProductIds.delete(productId);
    } else {
        selectedProductIds.add(productId);
    }
    document.getElementById('selectedProductsCount').textContent = selectedProductIds.size;
    
    // 更新全选框状态
    const allCheckboxes = document.querySelectorAll('.product-checkbox');
    const checkedCount = document.querySelectorAll('.product-checkbox:checked').length;
    document.getElementById('selectAllProducts').checked = allCheckboxes.length > 0 && checkedCount === allCheckboxes.length;
};

/**
 * 全选/取消全选商品
 */
window.toggleSelectAllProducts = function() {
    const selectAll = document.getElementById('selectAllProducts').checked;
    const checkboxes = document.querySelectorAll('.product-checkbox');
    
    checkboxes.forEach(cb => {
        const productId = parseInt(cb.dataset.id);
        cb.checked = selectAll;
        if (selectAll) {
            selectedProductIds.add(productId);
        } else {
            selectedProductIds.delete(productId);
        }
    });
    
    document.getElementById('selectedProductsCount').textContent = selectedProductIds.size;
};

/**
 * 确认添加选中的商品到订单
 */
window.confirmSelectProducts = function() {
    if (selectedProductIds.size === 0) {
        alert('请至少选择一个商品');
        return;
    }
    
    // 获取选中的商品数据
    const selectedProducts = allProductsList.filter(p => selectedProductIds.has(p.id));
    
    // 清空现有订单项（如果只有一个空行）
    const orderItemsList = document.getElementById('orderItemsList');
    const existingRows = orderItemsList.querySelectorAll('.order-item-row');
    if (existingRows.length === 1) {
        const firstSelect = existingRows[0].querySelector('.order-item-select');
        if (!firstSelect?.value) {
            orderItemsList.innerHTML = '';
        }
    }
    
    // 添加选中的商品
    selectedProducts.forEach(product => {
        addOrderItemWithProduct(product);
    });
    
    // 关闭模态框
    closeSelectProductsModal();
    
    // 重新计算总额
    calculateAllOrderItemsTotal();
};

/**
 * 添加带商品数据的订单项
 */
function addOrderItemWithProduct(product) {
    const tbody = document.getElementById('orderItemsList');
    if (!tbody) return;
    
    const typeLabel = product.type === 'product' ? '商品' : '服务';
    const retailPrice = parseFloat(product.retail_price || product.price || 0);
    
    const row = document.createElement('tr');
    row.className = 'order-item-row border-t border-gray-200';
    row.innerHTML = `
        <td class="py-1">
            <select class="order-item-select w-full border border-gray-300 rounded py-1 px-2 text-xs" onchange="updateOrderItemPrice(this)" style="display:none;">
                <option value="${product.id}" selected>${product.name}</option>
            </select>
            <input type="text" class="w-full border border-gray-300 rounded py-1 px-2 text-xs bg-gray-50" value="${product.name}" readonly>
        </td>
        <td class="py-1 order-item-type text-xs text-gray-500 text-center">${typeLabel}</td>
        <td class="py-1"><input type="number" class="order-item-quantity w-full border border-gray-300 rounded py-1 px-2 text-xs text-center" value="1" min="1" onchange="calculateOrderItemTotal(this)"></td>
        <td class="py-1"><input type="number" step="0.01" class="order-item-price w-full border border-gray-300 rounded py-1 px-2 text-xs text-right" value="${retailPrice.toFixed(2)}" onchange="calculateOrderItemTotal(this)"></td>
        <td class="py-1 order-item-total text-xs text-right font-medium">¥${retailPrice.toFixed(2)}</td>
        <td class="py-1 text-center"><button type="button" onclick="removeOrderItem(this)" class="text-red-500 hover:text-red-700 text-xs"><i class="fas fa-trash-alt"></i></button></td>
    `;
    
    tbody.appendChild(row);
    // 绑定Enter键跳转
    bindEnterKeyNavigation(row);
}

// ==================== 导出全局函数 ====================
// 注：部分函数已经用 window.functionName = function() 方式定义，无需重复导出
// 只导出确实存在且未导出的函数

// 模态框控制
window.openAddOrderModal = openAddOrderModal;
console.log('✅ [orders.js] openAddOrderModal 已导出到 window');

// 页面初始化已在 line 218 定义为 window.initOrdersPage

// ==================== 订单成本管理（稳定成本 + 特殊成本） ====================

// 成本数据缓存
let cachedCostCategories = [];  // 成本类别模板
let stableCostsData = [];       // 当前订单的稳定成本（勾选项）
let specialCostsData = [];      // 当前订单的特殊成本（手动录入）
let specialCostIdCounter = 0;   // 特殊成本ID计数器

/**
 * 加载成本类别模板
 */
async function loadCostCategories() {
    try {
        const response = await fetch('/api/cost-categories');
        const result = await response.json();
        if (result.success) {
            cachedCostCategories = result.data || [];
            renderStableCostsList();
        }
    } catch (error) {
        console.error('加载成本类别失败:', error);
        cachedCostCategories = [];
    }
}

/**
 * 渲染稳定成本列表（可勾选模板）
 */
function renderStableCostsList() {
    const listContainer = document.getElementById('stableCostsList');
    if (!listContainer) return;
    
    if (cachedCostCategories.length === 0) {
        listContainer.innerHTML = '<div class="text-xs text-gray-500 text-center py-1">暂无成本模板，请先在【业务成本设置】中添加</div>';
        return;
    }
    
    let html = '';
    cachedCostCategories.forEach(cat => {
        const isChecked = stableCostsData.some(sc => sc.category_id === cat.id);
        const existingCost = stableCostsData.find(sc => sc.category_id === cat.id);
        const amount = existingCost ? existingCost.amount : (cat.default_value || 0);
        const calcTypeLabel = cat.calc_type === 'percent' ? `按${cat.default_value}%` : '固定';
        
        html += `
            <div class="flex items-center gap-2 text-xs py-1 border-b border-orange-100 last:border-0">
                <input type="checkbox" id="stableCost_${cat.id}" class="stable-cost-check" 
                       data-id="${cat.id}" data-calc-type="${cat.calc_type}" data-rate="${cat.default_value || 0}"
                       ${isChecked ? 'checked' : ''} onchange="onStableCostCheckChange(this)">
                <label for="stableCost_${cat.id}" class="flex-1 cursor-pointer">
                    <span class="text-gray-700">${cat.name}</span>
                    <span class="text-gray-400 text-[10px] ml-1">(${calcTypeLabel})</span>
                </label>
                <input type="number" step="0.01" class="stable-cost-amount w-16 border border-gray-300 rounded px-1 py-0.5 text-xs text-right" 
                       data-id="${cat.id}" value="${parseFloat(amount).toFixed(2)}" 
                       ${isChecked ? '' : 'disabled'} onchange="onStableCostAmountChange(this)">
            </div>
        `;
    });
    
    listContainer.innerHTML = html;
    updateStableCostsTotal();
}

/**
 * 稳定成本勾选变更
 */
window.onStableCostCheckChange = function(checkbox) {
    const categoryId = parseInt(checkbox.dataset.id);
    const calcType = checkbox.dataset.calcType;
    const rate = parseFloat(checkbox.dataset.rate) || 0;
    const amountInput = document.querySelector(`.stable-cost-amount[data-id="${categoryId}"]`);
    
    if (checkbox.checked) {
        // 计算金额
        let amount = 0;
        if (calcType === 'percent') {
            // 按比例计算（基于成交价）
            const finalAmount = parseFloat(document.getElementById('orderFinalAmount')?.textContent?.replace(/[¥,]/g, '')) || 0;
            amount = finalAmount * rate / 100;
        } else {
            amount = rate; // 固定金额
        }
        
        // 添加到数据
        stableCostsData.push({
            category_id: categoryId,
            calc_type: calcType,
            rate: rate,
            amount: amount,
            is_manual: 0
        });
        
        if (amountInput) {
            amountInput.value = amount.toFixed(2);
            amountInput.disabled = false;
        }
    } else {
        // 从数据中移除
        stableCostsData = stableCostsData.filter(sc => sc.category_id !== categoryId);
        if (amountInput) {
            amountInput.disabled = true;
        }
    }
    
    updateStableCostsTotal();
    calculateOrderTotal();
};

/**
 * 稳定成本金额手动修改
 */
window.onStableCostAmountChange = function(input) {
    const categoryId = parseInt(input.dataset.id);
    const newAmount = parseFloat(input.value) || 0;
    
    const costItem = stableCostsData.find(sc => sc.category_id === categoryId);
    if (costItem) {
        costItem.amount = newAmount;
        costItem.is_manual = 1; // 标记为手动修改
    }
    
    updateStableCostsTotal();
    calculateOrderTotal();
};

/**
 * 更新稳定成本总计
 */
function updateStableCostsTotal() {
    const total = stableCostsData.reduce((sum, sc) => sum + (parseFloat(sc.amount) || 0), 0);
    const totalEl = document.getElementById('stableCostsTotal');
    if (totalEl) {
        totalEl.textContent = `¥${total.toFixed(2)}`;
    }
}

/**
 * 获取稳定成本总额
 */
function getStableCostsTotal() {
    return stableCostsData.reduce((sum, sc) => sum + (parseFloat(sc.amount) || 0), 0);
}

// ==================== 特殊成本管理 ====================

/**
 * 添加特殊成本行
 */
window.addSpecialCostRow = function() {
    specialCostsData.push({
        id: ++specialCostIdCounter,
        name: '',
        amount: 0,
        remark: ''
    });
    renderSpecialCostsList();
};

/**
 * 渲染特殊成本列表
 */
function renderSpecialCostsList() {
    const listContainer = document.getElementById('specialCostsList');
    if (!listContainer) return;
    
    if (specialCostsData.length === 0) {
        listContainer.innerHTML = '<div class="text-xs text-gray-500 text-center py-1">暂无特殊成本</div>';
        updateSpecialCostsTotal();
        return;
    }
    
    let html = '';
    specialCostsData.forEach((cost, index) => {
        html += `
            <div class="flex items-center gap-1 text-xs py-1 border-b border-purple-100 last:border-0">
                <input type="text" class="special-cost-name flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs" 
                       data-id="${cost.id}" value="${cost.name}" placeholder="成本名称" onchange="onSpecialCostChange(this, 'name')">
                <input type="number" step="0.01" class="special-cost-amount w-16 border border-gray-300 rounded px-1 py-0.5 text-xs text-right" 
                       data-id="${cost.id}" value="${cost.amount}" placeholder="金额" onchange="onSpecialCostChange(this, 'amount')">
                <input type="text" class="special-cost-remark w-20 border border-gray-300 rounded px-1 py-0.5 text-xs" 
                       data-id="${cost.id}" value="${cost.remark}" placeholder="备注" onchange="onSpecialCostChange(this, 'remark')">
                <button type="button" onclick="removeSpecialCost(${cost.id})" class="text-red-500 hover:text-red-700 px-1">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    listContainer.innerHTML = html;
    updateSpecialCostsTotal();
}

/**
 * 特殊成本字段变更
 */
window.onSpecialCostChange = function(input, field) {
    const costId = parseInt(input.dataset.id);
    const costItem = specialCostsData.find(sc => sc.id === costId);
    if (costItem) {
        if (field === 'amount') {
            costItem[field] = parseFloat(input.value) || 0;
        } else {
            costItem[field] = input.value;
        }
    }
    updateSpecialCostsTotal();
    calculateOrderTotal();
};

/**
 * 删除特殊成本
 */
window.removeSpecialCost = function(costId) {
    specialCostsData = specialCostsData.filter(sc => sc.id !== costId);
    renderSpecialCostsList();
    calculateOrderTotal();
};

/**
 * 更新特殊成本总计
 */
function updateSpecialCostsTotal() {
    const total = specialCostsData.reduce((sum, sc) => sum + (parseFloat(sc.amount) || 0), 0);
    const totalEl = document.getElementById('specialCostsTotal');
    if (totalEl) {
        totalEl.textContent = `¥${total.toFixed(2)}`;
    }
}

/**
 * 获取特殊成本总额
 */
function getSpecialCostsTotal() {
    return specialCostsData.reduce((sum, sc) => sum + (parseFloat(sc.amount) || 0), 0);
}

/**
 * 清空所有成本数据
 */
function clearAllCosts() {
    stableCostsData = [];
    specialCostsData = [];
    specialCostIdCounter = 0;
    renderStableCostsList();
    renderSpecialCostsList();
}

/**
 * 获取订单总成本（商品成本 + 稳定成本 + 特殊成本）
 * 替代原来的 getOtherCostsTotal
 */
function getTotalOrderCost() {
    const itemsCostText = document.getElementById('orderItemsTotalCost')?.textContent || '¥0.00';
    const itemsCost = parseFloat(itemsCostText.replace(/[¥,]/g, '')) || 0;
    const stableCost = getStableCostsTotal();
    const specialCost = getSpecialCostsTotal();
    return itemsCost + stableCost + specialCost;
}

// 在模态框打开时加载成本类别
const originalOpenAddOrderModal = window.openAddOrderModal;
window.openAddOrderModal = async function() {
    // 调用原函数
    if (typeof originalOpenAddOrderModal === 'function') {
        await originalOpenAddOrderModal();
    }
    // 加载成本类别
    await loadCostCategories();
    // 清空旧数据
    stableCostsData = [];
    specialCostsData = [];
    specialCostIdCounter = 0;
    renderSpecialCostsList();
};

console.log('🎉 [orders.js] 文件加载完成！v24.3.16 (含成本管理)');

// ==================== 订单操作日志功能 ====================

/**
 * 显示订单操作日志弹窗
 */
window.showOrderOperationLogs = async function() {
    const orderId = window.currentEditingOrderId;
    if (!orderId) {
        showNotification('无法获取订单ID', 'error');
        return;
    }
    
    const modal = document.getElementById('orderOperationLogsModal');
    const listContainer = document.getElementById('orderOperationLogsList');
    
    if (!modal || !listContainer) {
        console.error('操作日志弹窗元素未找到');
        return;
    }
    
    // 显示弹窗
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    
    // 显示加载中
    listContainer.innerHTML = `
        <div class="text-center py-8 text-gray-500">
            <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
            <p>加载中...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`/api/orders/${orderId}/operation-logs`, { credentials: 'include' });
        const result = await response.json();
        
        if (result.success && result.data) {
            renderOperationLogs(result.data, listContainer);
        } else {
            listContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                    <p>加载失败: ${result.message || '未知错误'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('加载操作日志失败:', error);
        listContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                <p>加载失败: 网络错误</p>
            </div>
        `;
    }
};

/**
 * 渲染操作日志列表
 */
function renderOperationLogs(logs, container) {
    if (!logs || logs.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-inbox text-3xl mb-2"></i>
                <p>暂无操作记录</p>
            </div>
        `;
        return;
    }
    
    // 操作类型颜色映射
    const typeColorMap = {
        'create': 'bg-green-100 text-green-800',
        'edit': 'bg-blue-100 text-blue-800',
        'business_audit': 'bg-purple-100 text-purple-800',
        'business_unaudit': 'bg-yellow-100 text-yellow-800',
        'finance_audit': 'bg-indigo-100 text-indigo-800',
        'finance_unaudit': 'bg-orange-100 text-orange-800',
        'delete': 'bg-red-100 text-red-800',
        'void': 'bg-gray-100 text-gray-800'
    };
    
    // 操作类型图标映射
    const typeIconMap = {
        'create': 'fa-plus-circle',
        'edit': 'fa-edit',
        'business_audit': 'fa-check-circle',
        'business_unaudit': 'fa-undo',
        'finance_audit': 'fa-dollar-sign',
        'finance_unaudit': 'fa-undo-alt',
        'delete': 'fa-trash',
        'void': 'fa-ban'
    };
    
    let html = '<div class="space-y-3">';
    
    logs.forEach(log => {
        const colorClass = typeColorMap[log.operation_type] || 'bg-gray-100 text-gray-800';
        const iconClass = typeIconMap[log.operation_type] || 'fa-info-circle';
        const operationTime = new Date(log.operation_time).toLocaleString('zh-CN');
        
        html += `
            <div class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                <div class="flex items-start justify-between">
                    <div class="flex items-center">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}">
                            <i class="fas ${iconClass} mr-1"></i>
                            ${log.operation_type_text || log.operation_type}
                        </span>
                        <span class="ml-2 text-sm text-gray-600">
                            <i class="fas fa-user mr-1"></i>${log.operator_name || '未知用户'}
                        </span>
                    </div>
                    <span class="text-xs text-gray-400">
                        <i class="fas fa-clock mr-1"></i>${operationTime}
                    </span>
                </div>
                ${log.remark ? `<p class="mt-2 text-sm text-gray-600"><i class="fas fa-comment mr-1"></i>${log.remark}</p>` : ''}
                ${renderChangesDetail(log.changes)}
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * 渲染变更详情
 */
function renderChangesDetail(changes) {
    if (!changes || Object.keys(changes).length === 0) {
        return '';
    }
    
    // 字段名称中文映射
    const fieldNameMap = {
        'customer_name': '客户',
        'order_date': '下单日期',
        'total_amount': '商品总额',
        'final_amount': '成交金额',
        'negotiation_amount': '议价金额',
        'business_staff': '业务人员',
        'service_staff': '服务人员',
        'team': '负责团队',
        'project': '归属项目',
        'status': '状态',
        'remarks': '备注'
    };
    
    let html = '<div class="mt-2 text-xs bg-gray-50 rounded p-2">';
    html += '<p class="font-medium text-gray-700 mb-1"><i class="fas fa-exchange-alt mr-1"></i>变更详情:</p>';
    html += '<ul class="space-y-1">';
    
    for (const [field, change] of Object.entries(changes)) {
        const fieldLabel = fieldNameMap[field] || field;
        const oldVal = change.old || '-';
        const newVal = change.new || '-';
        html += `
            <li class="text-gray-600">
                <span class="font-medium">${fieldLabel}:</span>
                <span class="text-red-500 line-through">${oldVal}</span>
                <i class="fas fa-arrow-right mx-1 text-gray-400"></i>
                <span class="text-green-600">${newVal}</span>
            </li>
        `;
    }
    
    html += '</ul></div>';
    return html;
}

/**
 * 关闭操作日志弹窗
 */
window.closeOrderOperationLogs = function() {
    const modal = document.getElementById('orderOperationLogsModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

console.log('📝 [操作日志] 功能加载完成');

