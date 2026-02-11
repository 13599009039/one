// 服务管理模块 (v14.0 - 统一商品/服务/服务包)

// 当前编辑的服务ID
let currentEditServiceId = null;
let currentServiceItemType = 'product'; // 当前选择的类型: product | service | package
let selectedPackageItems = []; // 服务包已选项目
let allServices = []; // 全部服务数据（用于搜索）
let allTeams = []; // 全部团队数据
let productTemplates = []; // 商品类型模板列表
let currentTemplateFields = []; // 当前选择模板的自定义字段

// 提前定义全局函数，供 HTML 中的 onchange 使用
window.onProductTemplateChange = function() {
    const templateId = document.getElementById('productTemplateId')?.value;
    if (window.loadTemplateFields) {
        window.loadTemplateFields(templateId);
    }
};

// 初始化服务列表页面(统一入口)
function initServicesPage() {
    renderServicesList();
}

// 【废弃】保留兼容性
function initServicePackagesPage() {
    console.warn('initServicePackagesPage已废弃,请使用initServicesPage');
    renderServicesList();
}

// 渲染统一服务列表(商品+服务+服务包)
async function renderServicesList(searchKeyword = '') {
    let services = [];
    let teams = [];
    
    // API优先 + LocalStorage降级
    try {
        console.log('📡 调用 API 加载服务列表...');
        const [servicesResult, teamsResult] = await Promise.all([
            window.api.getServices(),
            window.api.getTeams()
        ]);
        
        if (servicesResult.success) {
            services = servicesResult.data || [];
            console.log(`✅ API加载服务: ${services.length}条`);
        }
        if (teamsResult.success) {
            teams = teamsResult.data || [];
        }
    } catch (error) {
        console.warn('❌ API加载失败，降级到LocalStorage:', error);
        const result = db.getServices();
        if (result.success) services = result.data || [];
        teams = db.getTeams()?.data || [];
    }
    
    // 保存全部数据
    allServices = services;
    allTeams = teams;
    
    // 搜索过滤
    if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        services = services.filter(s => {
            return (s.name && s.name.toLowerCase().includes(keyword)) ||
                   (s.code && s.code.toLowerCase().includes(keyword)) ||
                   (s.category && s.category.toLowerCase().includes(keyword)) ||
                   (s.description && s.description.toLowerCase().includes(keyword));
        });
        console.log(`🔍 搜索结果: ${services.length}条 (关键词: "${searchKeyword}")`);
    }
    
    const tbody = document.getElementById('servicesTableBody');
    if (!tbody) return;
    
    if (services.length === 0) {
        const emptyText = searchKeyword ? `未找到匹配 "${searchKeyword}" 的结果` : '暂无数据';
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-gray-500">${emptyText}</td></tr>`;
        return;
    }
    
    tbody.innerHTML = services.map(service => {
        const team = teams.find(t => t.id === service.team_id);
        
        // 统一使用item_type,兼容旧type字段
        const itemType = service.item_type || service.type || 'service';
        
        // 类型标签(三种类型)
        let typeLabel = '';
        if (itemType === 'product') {
            typeLabel = '<span class="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">商品</span>';
        } else if (itemType === 'service') {
            typeLabel = '<span class="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">服务</span>';
        } else if (itemType === 'package') {
            typeLabel = '<span class="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">服务包</span>';
        }
        
        // 状态标签
        const statusLabel = service.status === 'active' ?
            '<span class="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">启用</span>' :
            '<span class="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs">停用</span>';
        
        // 库存显示(仅商品)
        const stockDisplay = itemType === 'product' ? 
            `<span class="${(service.stock || 0) <= 10 ? 'text-red-600 font-bold' : ''}">${service.stock || 0}</span>` : 
            '<span class="text-gray-400">-</span>';
        
        // 服务包组合项显示
        let packageItemsDisplay = '-';
        if (itemType === 'package' && service.package_items && service.package_items.length > 0) {
            const itemsText = service.package_items.map(item => {
                const itemService = services.find(s => s.id === item.service_id);
                return itemService ? `${itemService.name}×${item.quantity}` : '';
            }).filter(Boolean).join(', ');
            packageItemsDisplay = `<span class="text-xs text-gray-600" title="${itemsText}">${itemsText.substring(0, 30)}${itemsText.length > 30 ? '...' : ''}</span>`;
        }
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-600">${service.code || '-'}</td>
                <td class="px-4 py-3">
                    <div class="font-medium text-gray-900">${service.name}</div>
                    <div class="text-xs text-gray-500">${team?.name || '-'}</div>
                </td>
                <td class="px-4 py-3">${typeLabel}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${service.category || '-'}</td>
                <td class="px-4 py-3 text-right text-sm font-medium text-blue-600">¥${parseFloat(service.retail_price || 0).toFixed(2)}</td>
                <td class="px-4 py-3 text-right text-sm font-medium text-orange-600">¥${parseFloat(service.supply_price || 0).toFixed(2)}</td>
                <td class="px-4 py-3 text-right text-sm font-medium text-green-600">¥${parseFloat(service.wholesale_price || 0).toFixed(2)}</td>
                <td class="px-4 py-3 text-center">${stockDisplay}</td>
                <td class="px-4 py-3 text-center">${statusLabel}</td>
                <td class="px-4 py-3 text-center">
                    <button onclick="viewServicePrices(${service.id})" class="text-blue-600 hover:text-blue-800 mr-2" title="查看价格">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editService(${service.id})" class="text-green-600 hover:text-green-800 mr-2" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteService(${service.id})" class="text-red-600 hover:text-red-800" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// 【废弃】服务包单独列表渲染(保留兼容性)
function renderServicePackagesList() {
    console.warn('renderServicePackagesList已废弃,请使用renderServicesList');
    renderServicesList();
}

// 查看服务价格详情
function viewServicePrices(id) {
    const services = db.getServices().data || [];
    const service = services.find(s => s.id === id);
    if (!service) return;
    
    const priceHtml = `
        <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="bg-gray-50 p-3 rounded">
                <p class="text-gray-500">内部服务价</p>
                <p class="font-bold text-lg">¥${parseFloat(service.internal_price || 0).toFixed(2)}</p>
            </div>
            <div class="bg-gray-50 p-3 rounded">
                <p class="text-gray-500">成本价</p>
                <p class="font-bold text-lg">¥${parseFloat(service.cost_price || 0).toFixed(2)}</p>
            </div>
            <div class="bg-gray-50 p-3 rounded">
                <p class="text-gray-500">供货价</p>
                <p class="font-bold text-lg">¥${parseFloat(service.supply_price || 0).toFixed(2)}</p>
            </div>
            <div class="bg-gray-50 p-3 rounded">
                <p class="text-gray-500">运营成本</p>
                <p class="font-bold text-lg">¥${parseFloat(service.operation_cost || 0).toFixed(2)}</p>
            </div>
            <div class="bg-blue-50 p-3 rounded">
                <p class="text-blue-600">零售价</p>
                <p class="font-bold text-lg text-blue-600">¥${parseFloat(service.retail_price || 0).toFixed(2)}</p>
            </div>
            <div class="bg-green-50 p-3 rounded">
                <p class="text-green-600">批发价</p>
                <p class="font-bold text-lg text-green-600">¥${parseFloat(service.wholesale_price || 0).toFixed(2)}</p>
            </div>
            <div class="bg-purple-50 p-3 rounded col-span-2">
                <p class="text-purple-600">代理价</p>
                <p class="font-bold text-lg text-purple-600">¥${parseFloat(service.agent_price || 0).toFixed(2)}</p>
            </div>
        </div>
    `;
    
    showModalAlert(`${service.name} - 价格详情`, priceHtml);
}

// 打开服务编辑模态框(统一入口)
async function openServiceModal(id = null) {
    currentEditServiceId = id;
    const modal = document.getElementById('serviceModal');
    if (!modal) {
        createServiceModal();
    }
    
    // 加载团队下拉框 (API优先)
    let teams = [];
    try {
        const result = await window.api.getTeams();
        if (result.success) teams = result.data || [];
    } catch (error) {
        teams = db.getTeams()?.data || [];
    }
    
    const teamSelect = document.getElementById('serviceTeamId');
    if (teamSelect) {
        teamSelect.innerHTML = '<option value="">请选择团队</option>' + 
            teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    }
    
    if (id) {
        // 编辑模式: 加载现有数据
        let services = [];
        try {
            const result = await window.api.getServices();
            if (result.success) services = result.data || [];
        } catch (error) {
            services = db.getServices()?.data || [];
        }
        
        const service = services.find(s => s.id === id);
        if (service) {
            const itemType = service.item_type || service.type || 'service';
            currentServiceItemType = itemType;
            
            document.getElementById('serviceModalTitle').innerText = 
                itemType === 'package' ? '编辑服务包' : 
                itemType === 'product' ? '编辑商品' : '编辑服务';
            
            document.getElementById('serviceName').value = service.name;
            document.getElementById('serviceCode').value = service.code || '';
            document.getElementById('serviceItemType').value = itemType;
            document.getElementById('serviceCategory').value = service.category || '';
            document.getElementById('serviceTeamId').value = service.team_id || '';
            document.getElementById('serviceUnit').value = service.unit || '';
            document.getElementById('serviceDescription').value = service.description || '';
            document.getElementById('serviceInternalPrice').value = service.internal_price || 0;
            document.getElementById('serviceCostPrice').value = service.cost_price || 0;
            document.getElementById('serviceSupplyPrice').value = service.supply_price || 0;
            document.getElementById('serviceOperationCost').value = service.operation_cost || 0;
            document.getElementById('serviceRetailPrice').value = service.retail_price || 0;
            document.getElementById('serviceWholesalePrice').value = service.wholesale_price || 0;
            document.getElementById('serviceAgentPrice').value = service.agent_price || 0;
            document.getElementById('serviceStock').value = service.stock || 0;
            document.getElementById('serviceMinStock').value = service.min_stock || 0;
            
            // 服务包特殊处理
            if (itemType === 'package' && service.package_items) {
                selectedPackageItems = [...service.package_items];
                await renderPackageItemsSelector();
                renderSelectedPackageItems();
            } else {
                selectedPackageItems = [];
            }
            
            // 商品类型需要加载模板和自定义字段
            if (itemType === 'product') {
                await loadProductTemplates();
                
                // 加载自定义字段值
                try {
                    const fieldsResult = await window.api.getServiceCustomFields(id);
                    if (fieldsResult.success && fieldsResult.data) {
                        // 根据field_id映射值
                        const fieldValues = {};
                        fieldsResult.data.forEach(item => {
                            fieldValues[item.field_id] = item.field_value;
                        });
                        
                        // 如果有字段值，加载对应模板的字段定义
                        if (Object.keys(fieldValues).length > 0 && fieldsResult.data[0]) {
                            const firstField = fieldsResult.data[0];
                            // 从第一个字段获取template_id（需要后端返回）
                            // 或者直接加载所有字段并渲染
                            currentTemplateFields = fieldsResult.data.map(item => ({
                                id: item.field_id,
                                field_name: item.field_name,
                                field_label: item.field_label,
                                field_type: item.field_type,
                                is_required: 0,
                                sort_order: 0
                            }));
                            
                            renderCustomFieldsForm();
                            
                            // 回显字段值
                            setTimeout(() => {
                                Object.keys(fieldValues).forEach(fieldId => {
                                    const input = document.querySelector(`[data-field-id="${fieldId}"]`);
                                    if (input) {
                                        input.value = fieldValues[fieldId];
                                    }
                                });
                            }, 100);
                            
                            console.log(`✅ 加载自定义字段: ${Object.keys(fieldValues).length}个`);
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ 加载自定义字段失败:', error);
                }
            }
            
            // 根据类型显示/隐藏字段
            toggleServiceFieldsByType(itemType);
        }
    } else {
        // 新增模式: 默认商品
        currentServiceItemType = 'product';
        document.getElementById('serviceModalTitle').innerText = '新增商品/服务/服务包';
        document.getElementById('serviceForm').reset();
        document.getElementById('serviceItemType').value = 'product';
        selectedPackageItems = [];
        
        // 先加载模板，再切换字段显示
        await loadProductTemplates();
        toggleServiceFieldsByType('product');
    }
    
    document.getElementById('serviceModal').classList.remove('hidden');
}

// 根据类型显示/隐藏表单字段
function toggleServiceFieldsByType(itemType) {
    const stockFields = document.getElementById('stockFieldsGroup');
    const packageFields = document.getElementById('packageFieldsGroup');
    const templateGroup = document.getElementById('productTemplateGroup');
    
    if (itemType === 'product') {
        // 商品: 显示库存+模板选择
        if (stockFields) stockFields.classList.remove('hidden');
        if (packageFields) packageFields.classList.add('hidden');
        if (templateGroup) {
            templateGroup.classList.remove('hidden');
            // 填充模板下拉框（移除长度判断，确保总是填充）
            const select = document.getElementById('productTemplateId');
            if (select) {
                const options = '<option value="">选择商品类型...</option>' + 
                    productTemplates.map(t => 
                        `<option value="${t.id}">${t.type_name}</option>`
                    ).join('');
                select.innerHTML = options;
                console.log(`🔄 填充模板下拉框: ${productTemplates.length}个选项`);
            }
        }
    } else if (itemType === 'service') {
        // 服务: 全部隐藏
        if (stockFields) stockFields.classList.add('hidden');
        if (packageFields) packageFields.classList.add('hidden');
        if (templateGroup) templateGroup.classList.add('hidden');
        currentTemplateFields = [];
        renderCustomFieldsForm();
    } else if (itemType === 'package') {
        // 服务包
        if (stockFields) stockFields.classList.add('hidden');
        if (packageFields) packageFields.classList.remove('hidden');
        if (templateGroup) templateGroup.classList.add('hidden');
        currentTemplateFields = [];
        renderCustomFieldsForm();
    }
}

// 类型选择器变化事件
function onServiceItemTypeChange() {
    const itemType = document.getElementById('serviceItemType').value;
    currentServiceItemType = itemType;
    toggleServiceFieldsByType(itemType);
    
    // 如果切换到服务包,需要加载可选项
    if (itemType === 'package') {
        renderPackageItemsSelector();
    }
}

// 创建统一服务模态框(v14.0)
function createServiceModal() {
    const modalHtml = `
        <div id="serviceModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full hidden z-50">
            <div class="relative mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white mt-10">
                <div class="flex justify-between items-center mb-4">
                    <h3 id="serviceModalTitle" class="text-xl font-bold text-gray-900">新增商品/服务/服务包</h3>
                    <button onclick="closeServiceModal()" class="text-gray-400 hover:text-gray-500">
                        <span class="text-2xl">&times;</span>
                    </button>
                </div>
                <form id="serviceForm" onsubmit="saveService(event)">
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">类型 *</label>
                            <select id="serviceItemType" required class="w-full px-3 py-2 border rounded-lg" onchange="onServiceItemTypeChange()">
                                <option value="product">商品(实物类)</option>
                                <option value="service">服务(虚拟类)</option>
                                <option value="package">服务包(组合装)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                            <input type="text" id="serviceName" required class="w-full px-3 py-2 border rounded-lg">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">编码</label>
                            <input type="text" id="serviceCode" class="w-full px-3 py-2 border rounded-lg" placeholder="自动生成">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">分类</label>
                            <input type="text" id="serviceCategory" class="w-full px-3 py-2 border rounded-lg">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">负责团队</label>
                            <select id="serviceTeamId" class="w-full px-3 py-2 border rounded-lg">
                                <option value="">请选择团队</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">单位</label>
                            <input type="text" id="serviceUnit" class="w-full px-3 py-2 border rounded-lg" placeholder="如：条、场、个">
                        </div>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
                        <textarea id="serviceDescription" rows="2" class="w-full px-3 py-2 border rounded-lg"></textarea>
                    </div>
                    
                    <!-- 服务包组合选择区（默认隐藏） -->
                    <div id="packageFieldsGroup" class="hidden mb-4">
                        <div class="bg-purple-50 p-4 rounded-lg">
                            <h4 class="font-semibold text-purple-800 mb-3">服务包组合</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">可选项目</label>
                                    <div id="packageItemsSelector" class="border rounded-lg p-2 max-h-48 overflow-y-auto space-y-2">
                                        <!-- 动态加载 -->
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">已选项目</label>
                                    <div id="selectedPackageItems" class="border rounded-lg p-2 min-h-48 max-h-48 overflow-y-auto space-y-2">
                                        <p class="text-gray-400 text-sm">请从左侧添加项目</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 价格体系 -->
                    <div class="bg-gray-50 p-4 rounded-lg mb-4">
                        <h4 class="font-semibold text-gray-700 mb-3">价格体系</h4>
                        <div class="grid grid-cols-4 gap-3">
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">内部服务价</label>
                                <input type="number" id="serviceInternalPrice" step="0.01" value="0" class="w-full px-2 py-1.5 border rounded text-sm">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">成本价</label>
                                <input type="number" id="serviceCostPrice" step="0.01" value="0" class="w-full px-2 py-1.5 border rounded text-sm">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">供货价</label>
                                <input type="number" id="serviceSupplyPrice" step="0.01" value="0" class="w-full px-2 py-1.5 border rounded text-sm">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">运营成本</label>
                                <input type="number" id="serviceOperationCost" step="0.01" value="0" class="w-full px-2 py-1.5 border rounded text-sm">
                            </div>
                            <div>
                                <label class="block text-xs text-blue-600 mb-1">零售价 *</label>
                                <input type="number" id="serviceRetailPrice" step="0.01" value="0" required class="w-full px-2 py-1.5 border border-blue-300 rounded text-sm">
                            </div>
                            <div>
                                <label class="block text-xs text-green-600 mb-1">批发价</label>
                                <input type="number" id="serviceWholesalePrice" step="0.01" value="0" class="w-full px-2 py-1.5 border rounded text-sm">
                            </div>
                            <div>
                                <label class="block text-xs text-purple-600 mb-1">代理价</label>
                                <input type="number" id="serviceAgentPrice" step="0.01" value="0" class="w-full px-2 py-1.5 border rounded text-sm">
                            </div>
                        </div>
                    </div>
                    
                    <!-- 商品类型模板选择（仅商品） -->
                    <div id="productTemplateGroup" class="hidden mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">商品类型模板</label>
                        <select id="productTemplateId" 
                                class="w-full px-3 py-2 border rounded-lg"
                                onchange="onProductTemplateChange()">
                            <option value="">选择商品类型...</option>
                        </select>
                    </div>

                    <!-- 自定义字段容器 -->
                    <div id="customFieldsContainer" class="hidden"></div>
                    
                    <!-- 库存管理（仅商品） -->
                    <div id="stockFieldsGroup" class="bg-green-50 p-4 rounded-lg mb-4">
                        <h4 class="font-semibold text-green-800 mb-3">库存管理(仅商品)</h4>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">当前库存</label>
                                <input type="number" id="serviceStock" value="0" class="w-full px-2 py-1.5 border rounded text-sm">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">最低库存预警</label>
                                <input type="number" id="serviceMinStock" value="10" class="w-full px-2 py-1.5 border rounded text-sm">
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3">
                        <button type="button" onclick="closeServiceModal()" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 关闭服务模态框
function closeServiceModal() {
    document.getElementById('serviceModal')?.classList.add('hidden');
}

// 保存服务(统一处理商品/服务/服务包)
async function saveService(event) {
    event.preventDefault();
    
    const itemType = document.getElementById('serviceItemType').value;
    
    // 服务包校验
    if (itemType === 'package' && selectedPackageItems.length === 0) {
        showToast('服务包至少需要一个组合项目', 'error');
        return;
    }
    
    const serviceData = {
        name: document.getElementById('serviceName').value,
        code: document.getElementById('serviceCode').value,
        item_type: itemType, // 新字段
        type: itemType === 'package' ? 'service' : itemType, // 兼容旧字段
        category: document.getElementById('serviceCategory').value,
        team_id: parseInt(document.getElementById('serviceTeamId').value) || null,
        unit: document.getElementById('serviceUnit').value,
        description: document.getElementById('serviceDescription').value,
        internal_price: parseFloat(document.getElementById('serviceInternalPrice').value) || 0,
        cost_price: parseFloat(document.getElementById('serviceCostPrice').value) || 0,
        supply_price: parseFloat(document.getElementById('serviceSupplyPrice').value) || 0,
        operation_cost: parseFloat(document.getElementById('serviceOperationCost').value) || 0,
        retail_price: parseFloat(document.getElementById('serviceRetailPrice').value) || 0,
        wholesale_price: parseFloat(document.getElementById('serviceWholesalePrice').value) || 0,
        agent_price: parseFloat(document.getElementById('serviceAgentPrice').value) || 0,
        stock: itemType === 'product' ? (parseInt(document.getElementById('serviceStock').value) || 0) : null,
        min_stock: itemType === 'product' ? (parseInt(document.getElementById('serviceMinStock').value) || 10) : null,
        package_items: itemType === 'package' ? selectedPackageItems : null,
        status: 'active'
    };
    
    // 收集自定义字段值
    const customFields = {};
    document.querySelectorAll('.custom-field').forEach(input => {
        const fieldId = input.getAttribute('data-field-id');
        if (fieldId && input.value) {
            customFields[fieldId] = input.value;
        }
    });
    
    let result;
    try {
        if (currentEditServiceId) {
            console.log('📡 调用 API 更新服务:', currentEditServiceId, serviceData);
            result = await window.api.updateService(currentEditServiceId, serviceData);
        } else {
            console.log('📡 调用 API 新增服务:', serviceData);
            result = await window.api.addService(serviceData);
        }
        
        if (!result.success) {
            throw new Error(result.message || 'API调用失败');
        }
        
        console.log('✅ API操作成功:', result);
    } catch (error) {
        console.warn('❌ API失败，降级到LocalStorage:', error);
        if (currentEditServiceId) {
            result = db.updateService(currentEditServiceId, serviceData);
        } else {
            result = db.addService(serviceData);
        }
    }
    
    if (result.success) {
        // 保存自定义字段（仅商品类型）
        if (itemType === 'product' && Object.keys(customFields).length > 0) {
            try {
                const serviceId = result.id || currentEditServiceId;
                await window.api.saveServiceCustomFields(serviceId, customFields);
                console.log('✅ 自定义字段保存成功');
            } catch (error) {
                console.warn('❌ 自定义字段保存失败:', error);
            }
        }
        
        closeServiceModal();
        await renderServicesList();
        const actionText = currentEditServiceId ? '更新' : '添加';
        const typeText = itemType === 'product' ? '商品' : itemType === 'service' ? '服务' : '服务包';
        showToast(`${typeText}${actionText}成功`, 'success');
    } else {
        showToast(result.message || '操作失败', 'error');
    }
}

// 编辑服务(统一入口)
function editService(id) {
    openServiceModal(id);
}

// 删除服务(统一入口)
async function deleteService(id) {
    if (!confirm('确定要删除此项目吗？')) return;
    
    let result;
    try {
        console.log('📡 调用 API 删除服务:', id);
        result = await window.api.deleteService(id);
        if (!result.success) throw new Error(result.message);
        console.log('✅ API删除成功');
    } catch (error) {
        console.warn('❌ API失败，降级到LocalStorage:', error);
        result = db.deleteService(id);
    }
    
    if (result.success) {
        await renderServicesList();
        showToast('删除成功', 'success');
    } else {
        showToast(result.message || '删除失败', 'error');
    }
}

// 渲染服务包可选项目选择器
async function renderPackageItemsSelector() {
    let services = [];
    
    // 优先使用全局变量allServices，如果为空则重新加载
    if (allServices.length > 0) {
        services = allServices;
    } else {
        try {
            const result = await window.api.getServices();
            if (result.success) services = result.data || [];
        } catch (error) {
            services = db.getServices()?.data || [];
        }
        allServices = services; // 缓存到全局变量
    }
    
    // 过滤掉服务包类型,仅显示商品和服务
    const availableServices = services.filter(s => {
        const itemType = s.item_type || s.type || 'service';
        return itemType === 'product' || itemType === 'service';
    });
    
    const container = document.getElementById('packageItemsSelector');
    if (!container) return;
    
    if (availableServices.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-sm">暂无可用项目</p>';
        return;
    }
    
    container.innerHTML = availableServices.map(s => {
        const itemType = s.item_type || s.type || 'service';
        const typeLabel = itemType === 'product' ? '商品' : '服务';
        return `
            <div class="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
                <div>
                    <span class="font-medium">${s.name}</span>
                    <span class="text-xs text-gray-500 ml-2">${typeLabel} ¥${parseFloat(s.retail_price || 0).toFixed(2)}</span>
                </div>
                <button type="button" onclick="addToPackage(${s.id})" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
    }).join('');
}

// 添加项目到服务包
function addToPackage(serviceId) {
    const existing = selectedPackageItems.find(item => item.service_id === serviceId);
    if (existing) {
        existing.quantity++;
    } else {
        selectedPackageItems.push({ service_id: serviceId, quantity: 1 });
    }
    renderSelectedPackageItems();
}

// 渲染已选服务包项目
function renderSelectedPackageItems() {
    // 使用全局变量allServices（已从API加载）
    const services = allServices.length > 0 ? allServices : (db.getServices()?.data || []);
    const container = document.getElementById('selectedPackageItems');
    if (!container) return;
    
    if (selectedPackageItems.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-sm">请从左侧添加项目</p>';
        return;
    }
    
    container.innerHTML = selectedPackageItems.map((item, index) => {
        const service = services.find(s => s.id === item.service_id);
        return `
            <div class="flex items-center justify-between p-2 bg-blue-50 rounded">
                <span class="font-medium text-sm">${service?.name || '未知'}</span>
                <div class="flex items-center space-x-2">
                    <button type="button" onclick="updatePackageItemQty(${index}, -1)" class="text-gray-500 hover:text-gray-700">-</button>
                    <span class="w-8 text-center">${item.quantity}</span>
                    <button type="button" onclick="updatePackageItemQty(${index}, 1)" class="text-gray-500 hover:text-gray-700">+</button>
                    <button type="button" onclick="removePackageItem(${index})" class="text-red-500 hover:text-red-700 ml-2">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 更新服务包项目数量
function updatePackageItemQty(index, delta) {
    selectedPackageItems[index].quantity += delta;
    if (selectedPackageItems[index].quantity <= 0) {
        selectedPackageItems.splice(index, 1);
    }
    renderSelectedPackageItems();
}

// 移除服务包项目
function removePackageItem(index) {
    selectedPackageItems.splice(index, 1);
    renderSelectedPackageItems();
}

// 【废弃】旧的服务包编辑模态框(保留兼容性)
function openServicePackageModal(id = null) {
    console.warn('openServicePackageModal已废弃,请使用openServiceModal');
    openServiceModal(id);
}

// 【废弃】保留兼容性
let currentEditPackageId = null;

// 【废弃】服务包编辑(保留兼容性)
function editServicePackage(id) {
    console.warn('editServicePackage已废弃,请使用editService');
    editService(id);
}

// 【废弃】服务包删除(保留兼容性)
function deleteServicePackage(id) {
    console.warn('deleteServicePackage已废弃,请使用deleteService');
    deleteService(id);
}

// 【废弃】创建服务包模态框(已合并到createServiceModal)
function createServicePackageModal() {
    console.warn('createServicePackageModal已废弃,功能已集成到createServiceModal');
}

// 【废弃】关闭服务包模态框(保留兼容性)
function closeServicePackageModal() {
    console.warn('closeServicePackageModal已废弃,请使用closeServiceModal');
    closeServiceModal();
}

// 【废弃】保存服务包(已合并到saveService)
function saveServicePackage(event) {
    console.warn('saveServicePackage已废弃,功能已集成到saveService');
    if (event) event.preventDefault();
}

// 显示模态提示框
function showModalAlert(title, content) {
    const existing = document.getElementById('alertModal');
    if (existing) existing.remove();
    
    const modalHtml = `
        <div id="alertModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white mt-20">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-900">${title}</h3>
                    <button onclick="document.getElementById('alertModal').remove()" class="text-gray-400 hover:text-gray-500">
                        <span class="text-2xl">&times;</span>
                    </button>
                </div>
                <div>${content}</div>
                <div class="mt-4 text-right">
                    <button onclick="document.getElementById('alertModal').remove()" class="px-4 py-2 bg-blue-600 text-white rounded-lg">确定</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 显示提示消息
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// 搜索服务/商品
window.searchServices = function() {
    const searchInput = document.getElementById('serviceSearch');
    const keyword = searchInput ? searchInput.value.trim() : '';
    renderServicesList(keyword);
};

// 清空搜索
window.clearServiceSearch = function() {
    const searchInput = document.getElementById('serviceSearch');
    if (searchInput) searchInput.value = '';
    renderServicesList();
};

// 挂载全局函数供 HTML 调用
if (typeof window !== 'undefined') {
    window.initServicesPage = initServicesPage;
    window.openServiceModal = openServiceModal;
    window.saveService = saveService;
    window.closeServiceModal = closeServiceModal;
    window.editService = editService;
    window.deleteService = deleteService;
    window.onServiceItemTypeChange = onServiceItemTypeChange;
    window.addToPackage = addToPackage; // 修正：addPackageItem -> addToPackage
    window.removePackageItem = removePackageItem;
    window.updatePackageItemQuantity = updatePackageItemQuantity;
    
    // 商品属性模板相关函数
    window.loadTemplateFields = loadTemplateFields;
    
    // 保留旧函数兼容(废弃)
    window.initServicePackagesPage = initServicePackagesPage;
    window.editServicePackage = editServicePackage;
    window.deleteServicePackage = deleteServicePackage;
}

// ==================== 商品属性模板功能 ====================

// 加载商品类型模板
async function loadProductTemplates() {
    console.log('🔍 开始加载商品模板...');
    try {
        const result = await window.api.getProductTemplates();
        console.log('📡 API返回:', result);
        if (result.success) {
            productTemplates = result.data || [];
            console.log(`✅ 加载商品模板: ${productTemplates.length}个`, productTemplates);
        } else {
            console.warn('⚠️ API返回false:', result);
        }
    } catch (error) {
        console.error('❌ 加载商品模板失败:', error);
    }
}

// 加载模板的自定义字段
async function loadTemplateFields(templateId) {
    if (!templateId) {
        currentTemplateFields = [];
        renderCustomFieldsForm();
        return;
    }
    
    try {
        const result = await window.api.getTemplateFields(templateId);
        if (result.success) {
            currentTemplateFields = result.data || [];
            console.log(`✅ 加载自定义字段: ${currentTemplateFields.length}个`);
            renderCustomFieldsForm();
        }
    } catch (error) {
        console.warn('❌ 加载自定义字段失败:', error);
        currentTemplateFields = [];
        renderCustomFieldsForm();
    }
}

// 商品模板选择变化
// 加载模板的自定义字段
function renderCustomFieldsForm() {
    const container = document.getElementById('customFieldsContainer');
    if (!container) return;
    
    if (currentTemplateFields.length === 0) {
        container.innerHTML = '';
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    container.innerHTML = `
        <div class="bg-blue-50 p-4 rounded-lg mb-4">
            <h4 class="font-semibold text-blue-800 mb-3">商品专属信息</h4>
            <div class="grid grid-cols-2 gap-3">
                ${currentTemplateFields.map(field => generateFieldHTML(field)).join('')}
            </div>
        </div>
    `;
}

// 生成字段HTML
function generateFieldHTML(field) {
    const requiredMark = field.is_required ? ' *' : '';
    const requiredAttr = field.is_required ? ' required' : '';
    
    switch (field.field_type) {
        case 'text':
            return `
                <div>
                    <label class="block text-xs text-gray-700 mb-1">${field.field_label}${requiredMark}</label>
                    <input type="text" 
                           id="custom_field_${field.id}" 
                           data-field-id="${field.id}"
                           placeholder="${field.placeholder || ''}"
                           ${requiredAttr}
                           class="w-full px-2 py-1.5 border rounded text-sm custom-field">
                </div>
            `;
        case 'number':
            return `
                <div>
                    <label class="block text-xs text-gray-700 mb-1">${field.field_label}${requiredMark}</label>
                    <input type="number" 
                           id="custom_field_${field.id}" 
                           data-field-id="${field.id}"
                           placeholder="${field.placeholder || ''}"
                           ${requiredAttr}
                           class="w-full px-2 py-1.5 border rounded text-sm custom-field">
                </div>
            `;
        case 'date':
            return `
                <div>
                    <label class="block text-xs text-gray-700 mb-1">${field.field_label}${requiredMark}</label>
                    <input type="date" 
                           id="custom_field_${field.id}" 
                           data-field-id="${field.id}"
                           ${requiredAttr}
                           class="w-full px-2 py-1.5 border rounded text-sm custom-field">
                </div>
            `;
        case 'select':
            const options = JSON.parse(field.field_options || '[]');
            return `
                <div>
                    <label class="block text-xs text-gray-700 mb-1">${field.field_label}${requiredMark}</label>
                    <select id="custom_field_${field.id}" 
                            data-field-id="${field.id}"
                            ${requiredAttr}
                            class="w-full px-2 py-1.5 border rounded text-sm custom-field">
                        <option value="">请选择</option>
                        ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>
                </div>
            `;
        case 'textarea':
            return `
                <div class="col-span-2">
                    <label class="block text-xs text-gray-700 mb-1">${field.field_label}${requiredMark}</label>
                    <textarea id="custom_field_${field.id}" 
                              data-field-id="${field.id}"
                              placeholder="${field.placeholder || ''}"
                              ${requiredAttr}
                              rows="3"
                              class="w-full px-2 py-1.5 border rounded text-sm custom-field"></textarea>
                </div>
            `;
        default:
            return '';
    }
}
