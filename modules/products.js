/**
 * 商品管理模块 (v1.0.0)
 * 仅管理实物类商品 (item_type = 'product')
 */

// 模块变量
let allProducts = [];
let allProductTeams = [];
let productTemplates = [];
let currentEditProductId = null;

// ========== 初始化 ==========

function initProductsPage() {
    console.log('✅ 初始化商品管理页面');
    renderProductsList();
}

// ========== 商品列表 ==========

async function renderProductsList(searchKeyword = '') {
    console.log('\n📦 ========== [renderProductsList] 开始渲染商品列表 ==========');
    let products = [];
    let teams = [];
    
    try {
        console.log('📡 调用 API 加载商品列表 (无type参数，前端过滤)...');
        const [productsRes, teamsRes] = await Promise.all([
            fetch('/api/services', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/teams', { credentials: 'include' }).then(r => r.json())
        ]);
        
        console.log('📦 [renderProductsList] API原始响应:', productsRes);
        console.log('📦 [renderProductsList] 原始数据条数:', productsRes.data?.length);
        
        if (productsRes.success) {
            // 仅筛选商品类型 (item_type = 'product')
            const allData = productsRes.data || [];
            products = allData.filter(item => {
                const itemType = item.item_type || item.type || 'service';
                return itemType === 'product';
            });
            console.log(`✅ 前端过滤后商品数: ${products.length}条 (原始数据${allData.length}条)`);
            if (products.length === 0 && allData.length > 0) {
                console.warn('⚠️ [警告] 有数据但无商品，检查item_type字段:');
                allData.slice(0, 3).forEach((item, i) => {
                    console.log(`  样本${i+1}: id=${item.id}, name="${item.name}", item_type="${item.item_type}", type="${item.type}"`);
                });
            }
        }
        if (teamsRes.success) {
            teams = teamsRes.data || [];
        }
    } catch (error) {
        console.error('加载商品列表失败:', error);
        showNotification('加载商品列表失败', 'error');
        return;
    }
    
    allProducts = products;
    allProductTeams = teams;
    
    // 搜索过滤
    if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        products = products.filter(p => {
            return (p.name && p.name.toLowerCase().includes(keyword)) ||
                   (p.code && p.code.toLowerCase().includes(keyword)) ||
                   (p.category && p.category.toLowerCase().includes(keyword));
        });
    }
    
    // 【P1-6修复】预警商品筛选
    const warningFilter = document.getElementById('productWarningFilter');
    if (warningFilter && warningFilter.checked) {
        products = products.filter(p => {
            const stock = parseInt(p.stock) || 0;
            const minStock = parseInt(p.min_stock) || 10;
            return stock <= minStock;
        });
    }
    
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    
    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-gray-500">
            ${searchKeyword ? `未找到匹配 "${searchKeyword}" 的商品` : '暂无商品数据，点击"新增商品"开始添加'}
        </td></tr>`;
        return;
    }
    
    tbody.innerHTML = products.map(product => {
        const team = teams.find(t => t.id === product.team_id);
        const stock = parseInt(product.stock) || 0;
        const minStock = parseInt(product.min_stock) || 10;
        const isLowStock = stock <= minStock;
        
        const statusLabel = product.status === 'active' ?
            '<span class="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">启用</span>' :
            '<span class="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs">停用</span>';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-600">${product.code || '-'}</td>
                <td class="px-4 py-3">
                    <div class="font-medium text-gray-900">${product.name}</div>
                    <div class="text-xs text-gray-500">${team?.name || '-'}</div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">${product.category || '-'}</td>
                <td class="px-4 py-3 text-right text-sm font-medium text-blue-600">¥${parseFloat(product.retail_price || 0).toFixed(2)}</td>
                <td class="px-4 py-3 text-right text-sm font-medium text-orange-600">¥${parseFloat(product.supply_price || 0).toFixed(2)}</td>
                <td class="px-4 py-3 text-right text-sm font-medium text-green-600">¥${parseFloat(product.wholesale_price || 0).toFixed(2)}</td>
                <td class="px-4 py-3 text-center">
                    <span class="${isLowStock ? 'text-red-600 font-bold' : ''}">${stock}</span>
                </td>
                <td class="px-4 py-3 text-center text-sm text-gray-500">${minStock}</td>
                <td class="px-4 py-3 text-center">${statusLabel}</td>
                <td class="px-4 py-3 text-center">
                    <button onclick="viewProductDetail(${product.id})" class="text-blue-600 hover:text-blue-800 mr-2" title="查看详情">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editProduct(${product.id})" class="text-green-600 hover:text-green-800 mr-2" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteProduct(${product.id})" class="text-red-600 hover:text-red-800" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// 刷新商品列表
window.refreshProductsList = function() {
    renderProductsList();
    showNotification('商品列表已刷新', 'success');
};

// 搜索商品
window.searchProducts = function() {
    const keyword = document.getElementById('productSearch')?.value || '';
    renderProductsList(keyword);
};

// 清空搜索
window.clearProductSearch = function() {
    const input = document.getElementById('productSearch');
    if (input) input.value = '';
    renderProductsList();
};

// 【P1-6修复】按预警状态筛选商品
window.filterProductsByWarning = function() {
    const keyword = document.getElementById('productSearch')?.value || '';
    renderProductsList(keyword);
};

// ========== 商品模态框 ==========

window.openProductModal = async function(id = null) {
    currentEditProductId = id;
    
    // 确保模态框存在
    let modal = document.getElementById('productServiceModal');
    if (!modal) {
        await createProductServiceModal();
        modal = document.getElementById('productServiceModal');
    }
    
    // 加载团队数据
    const teamSelect = document.getElementById('psTeamId');
    if (teamSelect && allProductTeams.length > 0) {
        teamSelect.innerHTML = '<option value="">请选择团队</option>' +
            allProductTeams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    }
    
    // 加载模板数据
    await loadProductTemplatesForModal();
    
    // 设置模态框类型为商品
    document.getElementById('psItemType').value = 'product';
    document.getElementById('psModalTitle').textContent = id ? '编辑商品' : '新增商品';
    
    // 显示库存标签页（商品专属）
    const inventoryTab = document.getElementById('psTabInventory');
    if (inventoryTab) inventoryTab.classList.remove('hidden');
    
    if (id) {
        // 编辑模式：加载现有数据
        const product = allProducts.find(p => p.id === id);
        if (product) {
            fillProductForm(product);
        }
    } else {
        // 新增模式：重置表单
        document.getElementById('psForm').reset();
        document.getElementById('psItemType').value = 'product';
    }
    
    // 切换到第一个标签页
    switchProductServiceTab('basic');
    
    modal.classList.remove('hidden');
};

// ========== 服务/服务包模态框（隐藏库存标签页） ==========

/**
 * 打开服务模态框（供services.js调用）
 * @param {string} itemType - 类型: 'service' 或 'package'
 * @param {number|null} id - 编辑时传入ID
 * @param {object|null} serviceData - 服务数据（编辑时传入）
 */
// 服务包已选组合项
let selectedPackageItems = [];

window.openServiceModalNew = async function(itemType = 'service', id = null, serviceData = null) {
    currentEditProductId = id;
    selectedPackageItems = []; // 重置服务包组合项
    
    // 确保模态框存在
    let modal = document.getElementById('productServiceModal');
    if (!modal) {
        await createProductServiceModal();
        modal = document.getElementById('productServiceModal');
    }
    
    // 加载团队数据
    try {
        const teamsRes = await fetch('/api/teams', { credentials: 'include' }).then(r => r.json());
        if (teamsRes.success) {
            allProductTeams = teamsRes.data || [];
        }
    } catch (error) {
        console.error('加载团队失败:', error);
    }
    
    const teamSelect = document.getElementById('psTeamId');
    if (teamSelect && allProductTeams.length > 0) {
        teamSelect.innerHTML = '<option value="">请选择团队</option>' +
            allProductTeams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    }
    
    // 设置模态框类型
    document.getElementById('psItemType').value = itemType;
    
    // 设置标题
    const titles = {
        'service': id ? '编辑服务' : '新增服务',
        'package': id ? '编辑服务包' : '新增服务包'
    };
    document.getElementById('psModalTitle').textContent = titles[itemType] || '新增服务';
    
    // 根据类型显示/隐藏标签页
    const inventoryTab = document.getElementById('psTabInventory');
    const packageTab = document.getElementById('psTabPackage');
    const inventoryPanel = document.getElementById('psPanelInventory');
    const packagePanel = document.getElementById('psPanelPackage');
    const serviceHint = document.getElementById('psServiceHint');
    
    if (itemType === 'service') {
        // 服务：隐藏库存和服务包标签页，显示服务提示
        if (inventoryTab) inventoryTab.classList.add('hidden');
        if (inventoryPanel) inventoryPanel.classList.add('hidden');
        if (packageTab) packageTab.classList.add('hidden');
        if (packagePanel) packagePanel.classList.add('hidden');
        if (serviceHint) serviceHint.classList.remove('hidden');
    } else if (itemType === 'package') {
        // 服务包：隐藏库存标签页，显示服务包组合标签页
        if (inventoryTab) inventoryTab.classList.add('hidden');
        if (inventoryPanel) inventoryPanel.classList.add('hidden');
        if (packageTab) packageTab.classList.remove('hidden');
        if (serviceHint) serviceHint.classList.add('hidden');
        // 加载可选商品/服务列表
        await loadPackageItemOptions();
    } else {
        // 商品：显示库存标签页，隐藏服务包标签页
        if (inventoryTab) inventoryTab.classList.remove('hidden');
        if (packageTab) packageTab.classList.add('hidden');
        if (packagePanel) packagePanel.classList.add('hidden');
        if (serviceHint) serviceHint.classList.add('hidden');
    }
    
    if (id && serviceData) {
        // 编辑模式：填充数据
        fillServiceForm(serviceData);
        // 如果是服务包，加载已选组合项
        if (itemType === 'package' && serviceData.package_items) {
            selectedPackageItems = JSON.parse(serviceData.package_items) || [];
            renderSelectedPackageItems();
        }
    } else {
        // 新增模式：重置表单
        document.getElementById('psForm').reset();
        document.getElementById('psItemType').value = itemType;
        selectedPackageItems = [];
        renderSelectedPackageItems();
    }
    
    // 切换到第一个标签页
    switchProductServiceTab('basic');
    
    modal.classList.remove('hidden');
};

// 填充服务表单
function fillServiceForm(service) {
    document.getElementById('psName').value = service.name || '';
    document.getElementById('psCode').value = service.code || '';
    document.getElementById('psCategory').value = service.category || '';
    document.getElementById('psTeamId').value = service.team_id || '';
    document.getElementById('psUnit').value = service.unit || '';
    document.getElementById('psDescription').value = service.description || '';
    document.getElementById('psStatus').value = service.status || 'active';
    
    // 价格字段
    document.getElementById('psRetailPrice').value = service.retail_price || 0;
    document.getElementById('psWholesalePrice').value = service.wholesale_price || 0;
    document.getElementById('psAgentPrice').value = service.agent_price || 0;
    document.getElementById('psSupplyPrice').value = service.supply_price || 0;
    document.getElementById('psInternalPrice').value = service.internal_price || 0;
    document.getElementById('psCostPrice').value = service.cost_price || 0;
    document.getElementById('psOperationCost').value = service.operation_cost || 0;
}

// 填充商品表单
function fillProductForm(product) {
    document.getElementById('psName').value = product.name || '';
    document.getElementById('psCode').value = product.code || '';
    document.getElementById('psCategory').value = product.category || '';
    document.getElementById('psTeamId').value = product.team_id || '';
    document.getElementById('psUnit').value = product.unit || '';
    document.getElementById('psDescription').value = product.description || '';
    document.getElementById('psStatus').value = product.status || 'active';
    
    // 价格字段
    document.getElementById('psRetailPrice').value = product.retail_price || 0;
    document.getElementById('psWholesalePrice').value = product.wholesale_price || 0;
    document.getElementById('psAgentPrice').value = product.agent_price || 0;
    document.getElementById('psSupplyPrice').value = product.supply_price || 0;
    document.getElementById('psInternalPrice').value = product.internal_price || 0;
    document.getElementById('psCostPrice').value = product.cost_price || 0;
    document.getElementById('psOperationCost').value = product.operation_cost || 0;
    
    // 库存字段
    document.getElementById('psStock').value = product.stock || 0;
    document.getElementById('psMinStock').value = product.min_stock || 10;
}

// 编辑商品
window.editProduct = function(id) {
    openProductModal(id);
};

// 删除商品
window.deleteProduct = async function(id) {
    if (!confirm('确定要删除此商品吗？删除后将移入回收站。')) return;
    
    try {
        const res = await fetch(`/api/services/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await res.json();
        
        if (result.success) {
            showNotification('商品已删除', 'success');
            renderProductsList();
        } else {
            showNotification('删除失败: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('删除商品失败:', error);
        showNotification('删除失败', 'error');
    }
};

// 查看商品详情
window.viewProductDetail = function(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    
    const team = allProductTeams.find(t => t.id === product.team_id);
    
    const html = `
        <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="bg-gray-50 p-3 rounded">
                <p class="text-gray-500">商品名称</p>
                <p class="font-bold">${product.name}</p>
            </div>
            <div class="bg-gray-50 p-3 rounded">
                <p class="text-gray-500">编码</p>
                <p class="font-bold">${product.code || '-'}</p>
            </div>
            <div class="bg-gray-50 p-3 rounded">
                <p class="text-gray-500">分类</p>
                <p class="font-bold">${product.category || '-'}</p>
            </div>
            <div class="bg-gray-50 p-3 rounded">
                <p class="text-gray-500">负责团队</p>
                <p class="font-bold">${team?.name || '-'}</p>
            </div>
            <div class="bg-blue-50 p-3 rounded">
                <p class="text-blue-600">零售价</p>
                <p class="font-bold text-blue-600">¥${parseFloat(product.retail_price || 0).toFixed(2)}</p>
            </div>
            <div class="bg-green-50 p-3 rounded">
                <p class="text-green-600">批发价</p>
                <p class="font-bold text-green-600">¥${parseFloat(product.wholesale_price || 0).toFixed(2)}</p>
            </div>
            <div class="bg-orange-50 p-3 rounded">
                <p class="text-orange-600">供货价</p>
                <p class="font-bold text-orange-600">¥${parseFloat(product.supply_price || 0).toFixed(2)}</p>
            </div>
            <div class="bg-red-50 p-3 rounded">
                <p class="text-red-600">成本价</p>
                <p class="font-bold text-red-600">¥${parseFloat(product.cost_price || 0).toFixed(2)}</p>
            </div>
            <div class="bg-gray-50 p-3 rounded">
                <p class="text-gray-500">当前库存</p>
                <p class="font-bold ${(product.stock || 0) <= (product.min_stock || 10) ? 'text-red-600' : ''}">${product.stock || 0}</p>
            </div>
            <div class="bg-gray-50 p-3 rounded">
                <p class="text-gray-500">库存预警值</p>
                <p class="font-bold">${product.min_stock || 10}</p>
            </div>
        </div>
    `;
    
    showModalAlert(`商品详情 - ${product.name}`, html);
};

// 显示提示弹窗
function showModalAlert(title, content) {
    const existingModal = document.getElementById('alertModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'alertModal';
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div class="flex justify-between items-center px-6 py-4 border-b">
                <h3 class="text-lg font-bold text-gray-900">${title}</h3>
                <button onclick="document.getElementById('alertModal').remove()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div class="px-6 py-4">${content}</div>
            <div class="px-6 py-4 border-t flex justify-end">
                <button onclick="document.getElementById('alertModal').remove()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">关闭</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// 加载商品模板
async function loadProductTemplatesForModal() {
    try {
        const res = await fetch('/api/product-templates', { credentials: 'include' });
        const result = await res.json();
        if (result.success) {
            productTemplates = result.data || [];
            const select = document.getElementById('psTemplateId');
            if (select) {
                select.innerHTML = '<option value="">选择商品类型模板...</option>' +
                    productTemplates.map(t => `<option value="${t.id}">${t.type_name}</option>`).join('');
            }
        }
    } catch (error) {
        console.warn('加载商品模板失败:', error);
    }
}

// 通知函数
function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}

// ========== 统一模态框 (1100x749 + 标签页) ==========

async function createProductServiceModal() {
    // 移除已存在的模态框
    const existing = document.getElementById('productServiceModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'productServiceModal';
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 hidden flex items-center justify-center z-50';
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl flex flex-col" style="width: 1100px; height: 749px;">
            <!-- 头部固定 -->
            <div class="flex justify-between items-center px-6 py-4 border-b bg-gray-50 rounded-t-lg flex-shrink-0">
                <h3 id="psModalTitle" class="text-lg font-bold text-gray-900">新增商品/服务</h3>
                <button onclick="closeProductServiceModal()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <!-- 标签页导航 -->
            <div class="flex border-b bg-white px-6 flex-shrink-0">
                <button id="psTabBasic" onclick="switchProductServiceTab('basic')" class="px-6 py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600 -mb-px">
                    <i class="fas fa-info-circle mr-2"></i>基础信息
                </button>
                <button id="psTabPrice" onclick="switchProductServiceTab('price')" class="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent -mb-px">
                    <i class="fas fa-tags mr-2"></i>价格与成本
                </button>
                <button id="psTabInventory" onclick="switchProductServiceTab('inventory')" class="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent -mb-px">
                    <i class="fas fa-boxes mr-2"></i>库存管理
                </button>
                <button id="psTabPackage" onclick="switchProductServiceTab('package')" class="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent -mb-px hidden">
                    <i class="fas fa-cubes mr-2"></i>组合商品/服务
                </button>
                <button id="psTabAttribute" onclick="switchProductServiceTab('attribute')" class="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent -mb-px">
                    <i class="fas fa-sliders-h mr-2"></i>专属属性
                </button>
            </div>
            
            <!-- 中间内容滚动区 -->
            <div class="flex-1 overflow-y-auto p-6">
                <form id="psForm" class="space-y-4">
                    <input type="hidden" id="psItemType" value="product">
                    
                    <!-- Tab 1: 基础信息 -->
                    <div id="psPanelBasic" class="tab-panel">
                        <!-- 服务类型提示（仅服务显示） -->
                        <div id="psServiceHint" class="hidden bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                            <div class="flex items-center text-blue-700">
                                <i class="fas fa-info-circle mr-2"></i>
                                <span class="text-sm font-medium">服务类型，无需管理库存</span>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-3 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">名称 <span class="text-red-500">*</span></label>
                                <input type="text" id="psName" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="商品/服务名称">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">编码</label>
                                <input type="text" id="psCode" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-50" placeholder="自动生成">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">分类</label>
                                <input type="text" id="psCategory" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="如：电子产品、日用品">
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-3 gap-4 mt-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">单位</label>
                                <input type="text" id="psUnit" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="如：个、件、套">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">负责团队</label>
                                <select id="psTeamId" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">请选择团队</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">状态</label>
                                <select id="psStatus" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                    <option value="active">启用</option>
                                    <option value="inactive">停用</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="mt-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">描述/备注</label>
                            <textarea id="psDescription" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="商品/服务的详细说明..."></textarea>
                        </div>
                    </div>
                    
                    <!-- Tab 2: 价格与成本 -->
                    <div id="psPanelPrice" class="tab-panel hidden">
                        <div class="bg-blue-50 p-4 rounded-lg mb-4">
                            <h4 class="text-sm font-bold text-blue-800 mb-3"><i class="fas fa-dollar-sign mr-2"></i>价格设置</h4>
                            <div class="grid grid-cols-5 gap-3">
                                <div>
                                    <label class="block text-xs text-blue-600 mb-1">零售价</label>
                                    <input type="number" id="psRetailPrice" step="0.01" min="0" class="w-full px-2 py-1.5 border border-blue-200 rounded text-sm" value="0">
                                </div>
                                <div>
                                    <label class="block text-xs text-blue-600 mb-1">批发价</label>
                                    <input type="number" id="psWholesalePrice" step="0.01" min="0" class="w-full px-2 py-1.5 border border-blue-200 rounded text-sm" value="0">
                                </div>
                                <div>
                                    <label class="block text-xs text-blue-600 mb-1">代理价</label>
                                    <input type="number" id="psAgentPrice" step="0.01" min="0" class="w-full px-2 py-1.5 border border-blue-200 rounded text-sm" value="0">
                                </div>
                                <div>
                                    <label class="block text-xs text-blue-600 mb-1">供货价</label>
                                    <input type="number" id="psSupplyPrice" step="0.01" min="0" class="w-full px-2 py-1.5 border border-blue-200 rounded text-sm" value="0">
                                </div>
                                <div>
                                    <label class="block text-xs text-blue-600 mb-1">内部价</label>
                                    <input type="number" id="psInternalPrice" step="0.01" min="0" class="w-full px-2 py-1.5 border border-blue-200 rounded text-sm" value="0">
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-orange-50 p-4 rounded-lg mb-4">
                            <h4 class="text-sm font-bold text-orange-800 mb-3"><i class="fas fa-calculator mr-2"></i>成本设置</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs text-orange-600 mb-1">成本价 (采购/制造成本)</label>
                                    <input type="number" id="psCostPrice" step="0.01" min="0" class="w-full px-3 py-2 border border-orange-200 rounded" value="0">
                                </div>
                                <div>
                                    <label class="block text-xs text-orange-600 mb-1">运营成本 (仓储/物流等)</label>
                                    <input type="number" id="psOperationCost" step="0.01" min="0" class="w-full px-3 py-2 border border-orange-200 rounded" value="0">
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <div class="flex justify-between items-center mb-3">
                                <h4 class="text-sm font-bold text-gray-800"><i class="fas fa-list-ul mr-2"></i>成本项配置</h4>
                                <button type="button" onclick="addProductCostItem()" class="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                                    <i class="fas fa-plus mr-1"></i>新增成本项
                                </button>
                            </div>
                            <div id="psCostItemsList" class="space-y-2">
                                <div class="text-sm text-gray-500 text-center py-4">暂无自定义成本项</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tab 3: 库存管理 (仅商品显示) -->
                    <div id="psPanelInventory" class="tab-panel hidden">
                        <div class="bg-green-50 p-4 rounded-lg mb-4">
                            <h4 class="text-sm font-bold text-green-800 mb-3"><i class="fas fa-warehouse mr-2"></i>库存设置</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs text-green-600 mb-1">当前库存</label>
                                    <input type="number" id="psStock" min="0" class="w-full px-3 py-2 border border-green-200 rounded" value="0">
                                </div>
                                <div>
                                    <label class="block text-xs text-green-600 mb-1">最低库存预警值</label>
                                    <input type="number" id="psMinStock" min="0" class="w-full px-3 py-2 border border-green-200 rounded" value="10">
                                </div>
                            </div>
                        </div>
                                            
                        <div class="bg-yellow-50 p-4 rounded-lg">
                            <h4 class="text-sm font-bold text-yellow-800 mb-3"><i class="fas fa-info-circle mr-2"></i>库存提示</h4>
                            <ul class="text-sm text-yellow-700 space-y-2">
                                <li>• 当库存低于预警值时，列表中将以红色标注提醒</li>
                                <li>• 库存变动请通过“库存管理”功能进行入库/出库操作</li>
                                <li>• 此处设置的库存仅作为初始值使用</li>
                            </ul>
                        </div>
                    </div>
                                        
                    <!-- Tab 4: 服务包组合 (仅服务包显示) -->
                    <div id="psPanelPackage" class="tab-panel hidden">
                        <div class="bg-indigo-50 p-4 rounded-lg mb-4">
                            <h4 class="text-sm font-bold text-indigo-800 mb-3"><i class="fas fa-search mr-2"></i>搜索并添加商品/服务</h4>
                            <div class="flex space-x-2">
                                <input type="text" id="psPackageSearch" placeholder="搜索商品或服务名称..." 
                                       class="flex-1 px-3 py-2 border border-indigo-200 rounded" 
                                       onkeypress="if(event.key==='Enter'){event.preventDefault();searchPackageItems()}">
                                <button type="button" onclick="searchPackageItems()" class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                                    <i class="fas fa-search"></i>
                                </button>
                            </div>
                            <!-- 搜索结果列表 -->
                            <div id="psPackageSearchResults" class="mt-3 max-h-48 overflow-y-auto border border-indigo-100 rounded bg-white">
                                <div class="text-center text-gray-400 py-4 text-sm">输入关键词搜索商品/服务</div>
                            </div>
                        </div>
                                            
                        <!-- 已选组合项列表 -->
                        <div class="bg-white border border-gray-200 rounded-lg p-4">
                            <div class="flex justify-between items-center mb-3">
                                <h4 class="text-sm font-bold text-gray-800"><i class="fas fa-cubes mr-2"></i>已选组合项</h4>
                                <div id="psPackageTotalHint" class="text-sm text-gray-500">共 0 项</div>
                            </div>
                            <div id="psSelectedPackageItems" class="space-y-2 min-h-24 max-h-64 overflow-y-auto">
                                <div class="text-center text-gray-400 py-6 text-sm">暂未添加任何商品/服务</div>
                            </div>
                        </div>
                                            
                        <!-- 价格自动计算提示 -->
                        <div class="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div class="flex items-start text-yellow-700">
                                <i class="fas fa-lightbulb mr-2 mt-0.5"></i>
                                <div class="text-sm">
                                    <p class="font-medium">价格自动计算</p>
                                    <p class="text-xs mt-1">服务包的零售价和成本价会根据已选组合项自动计算，也可在“价格与成本”标签页手动修改</p>
                                </div>
                            </div>
                        </div>
                    </div>
                                        
                    <!-- Tab 5: 专属属性 -->
                    <div id="psPanelAttribute" class="tab-panel hidden">
                        <div class="bg-purple-50 p-4 rounded-lg mb-4">
                            <h4 class="text-sm font-bold text-purple-800 mb-3"><i class="fas fa-tags mr-2"></i>类型模板</h4>
                            <div>
                                <label class="block text-xs text-purple-600 mb-1">选择商品类型模板</label>
                                <select id="psTemplateId" onchange="loadProductTemplateFields()" class="w-full px-3 py-2 border border-purple-200 rounded">
                                    <option value="">选择商品类型模板...</option>
                                </select>
                            </div>
                        </div>
                        
                        <div id="psTemplateFields" class="bg-white border border-gray-200 rounded-lg p-4">
                            <div class="text-center text-gray-400 py-8">
                                <i class="fas fa-cube text-4xl mb-3"></i>
                                <p>请先选择商品类型模板，将自动加载该类型的专属属性字段</p>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            
            <!-- 底部按钮固定 -->
            <div class="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg flex-shrink-0">
                <button type="button" onclick="closeProductServiceModal()" class="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                    取消
                </button>
                <button type="button" onclick="saveProductService()" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    <i class="fas fa-save mr-2"></i>保存
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 【P1-8修复】记录初始表单状态，用于检测未保存修改
    setTimeout(() => {
        const form = document.getElementById('psForm');
        if (form) {
            window._psFormInitialState = new FormData(form);
        }
    }, 100);
}

// 【P1-8修复】检查表单是否有未保存的修改
function hasUnsavedChanges() {
    const form = document.getElementById('psForm');
    if (!form || !window._psFormInitialState) return false;
    
    const currentData = new FormData(form);
    const initialState = window._psFormInitialState;
    
    // 比较关键字段
    const fieldsToCheck = ['psName', 'psCode', 'psCategory', 'psRetailPrice', 'psWholesalePrice', 'psSupplyPrice'];
    for (const field of fieldsToCheck) {
        const currentVal = currentData.get(field) || '';
        const initialVal = initialState.get(field) || '';
        if (currentVal !== initialVal) return true;
    }
    return false;
}

// 关闭模态框
window.closeProductServiceModal = function(forceClose = false) {
    // 【P1-8修复】检查未保存修改
    if (!forceClose && hasUnsavedChanges()) {
        const confirmed = confirm('检测到未保存的修改，确定要关闭吗？\n\n点击“确定”放弃修改，点击“取消”返回继续编辑。');
        if (!confirmed) return;
    }
    
    const modal = document.getElementById('productServiceModal');
    if (modal) modal.classList.add('hidden');
    
    // 清理状态
    window._psFormInitialState = null;
};

// 切换标签页
window.switchProductServiceTab = function(tabName) {
    // 隐藏所有面板
    const panels = ['psPanelBasic', 'psPanelPrice', 'psPanelInventory', 'psPanelPackage', 'psPanelAttribute'];
    panels.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    // 重置所有标签样式
    const tabs = ['psTabBasic', 'psTabPrice', 'psTabInventory', 'psTabPackage', 'psTabAttribute'];
    tabs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.className = 'px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent -mb-px';
            // 保持hidden状态
            if (el.classList.contains('hidden')) {
                el.className += ' hidden';
            }
        }
    });
    
    // 显示选中的面板
    const panelMap = {
        'basic': 'psPanelBasic',
        'price': 'psPanelPrice',
        'inventory': 'psPanelInventory',
        'package': 'psPanelPackage',
        'attribute': 'psPanelAttribute'
    };
    const activePanel = document.getElementById(panelMap[tabName]);
    if (activePanel) activePanel.classList.remove('hidden');
    
    // 高亮选中的标签
    const tabMap = {
        'basic': 'psTabBasic',
        'price': 'psTabPrice',
        'inventory': 'psTabInventory',
        'package': 'psTabPackage',
        'attribute': 'psTabAttribute'
    };
    const activeTab = document.getElementById(tabMap[tabName]);
    if (activeTab) {
        const isHidden = activeTab.classList.contains('hidden');
        activeTab.className = 'px-6 py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600 -mb-px';
        if (isHidden) activeTab.className += ' hidden';
    }
};

// 保存商品/服务
window.saveProductService = async function() {
    const itemType = document.getElementById('psItemType').value;
    const name = document.getElementById('psName').value.trim();
    
    if (!name) {
        showNotification('请输入名称', 'error');
        switchProductServiceTab('basic');
        return;
    }
    
    // 服务包需要至少添加一个组合项
    if (itemType === 'package' && selectedPackageItems.length === 0) {
        showNotification('请至少添加一个商品或服务到服务包', 'error');
        switchProductServiceTab('package');
        return;
    }
    
    const data = {
        name: name,
        code: document.getElementById('psCode').value.trim(),
        category: document.getElementById('psCategory').value.trim(),
        unit: document.getElementById('psUnit').value.trim(),
        team_id: parseInt(document.getElementById('psTeamId').value) || null,
        status: document.getElementById('psStatus').value,
        description: document.getElementById('psDescription').value.trim(),
        item_type: itemType,
        // 价格字段
        retail_price: parseFloat(document.getElementById('psRetailPrice').value) || 0,
        wholesale_price: parseFloat(document.getElementById('psWholesalePrice').value) || 0,
        agent_price: parseFloat(document.getElementById('psAgentPrice').value) || 0,
        supply_price: parseFloat(document.getElementById('psSupplyPrice').value) || 0,
        internal_price: parseFloat(document.getElementById('psInternalPrice').value) || 0,
        cost_price: parseFloat(document.getElementById('psCostPrice').value) || 0,
        operation_cost: parseFloat(document.getElementById('psOperationCost').value) || 0
    };
    
    // 仅商品保存库存字段，服务/服务包忽略
    if (itemType === 'product') {
        data.stock = parseInt(document.getElementById('psStock')?.value) || 0;
        data.min_stock = parseInt(document.getElementById('psMinStock')?.value) || 10;
    }
    
    // 服务包保存组合项
    if (itemType === 'package') {
        data.package_items = JSON.stringify(selectedPackageItems);
    }
    
    try {
        const url = currentEditProductId ? `/api/services/${currentEditProductId}` : '/api/services';
        const method = currentEditProductId ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        
        const result = await res.json();
        
        if (result.success) {
            showNotification(currentEditProductId ? '更新成功' : '新增成功', 'success');
            closeProductServiceModal(true);  // 强制关闭，跳过未保存检查
            // 刷新对应列表
            if (itemType === 'service' && typeof window.renderServicesList === 'function') {
                window.renderServicesList();
            } else if (itemType === 'package' && typeof window.renderServicePackagesList === 'function') {
                window.renderServicePackagesList();
            } else if (typeof renderProductsList === 'function') {
                renderProductsList();
            }
        } else {
            showNotification('保存失败: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('保存失败:', error);
        showNotification('保存失败', 'error');
    }
};

// 加载模板字段
window.loadProductTemplateFields = function() {
    const templateId = document.getElementById('psTemplateId').value;
    const container = document.getElementById('psTemplateFields');
    
    if (!templateId) {
        container.innerHTML = `
            <div class="text-center text-gray-400 py-8">
                <i class="fas fa-cube text-4xl mb-3"></i>
                <p>请先选择商品类型模板，将自动加载该类型的专属属性字段</p>
            </div>
        `;
        return;
    }
    
    const template = productTemplates.find(t => t.id == templateId);
    if (!template || !template.fields || template.fields.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 py-8">
                <i class="fas fa-inbox text-4xl mb-3"></i>
                <p>该模板暂未配置自定义字段</p>
            </div>
        `;
        return;
    }
    
    // 渲染模板字段
    container.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            ${template.fields.map(field => `
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${field.label}${field.required ? ' <span class="text-red-500">*</span>' : ''}</label>
                    ${renderTemplateField(field)}
                </div>
            `).join('')}
        </div>
    `;
};

// 渲染模板字段
function renderTemplateField(field) {
    switch (field.type) {
        case 'select':
            return `<select id="psField_${field.name}" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="">请选择...</option>
                ${(field.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join('')}
            </select>`;
        case 'textarea':
            return `<textarea id="psField_${field.name}" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>`;
        case 'number':
            return `<input type="number" id="psField_${field.name}" class="w-full px-3 py-2 border border-gray-300 rounded-md" value="0">`;
        default:
            return `<input type="text" id="psField_${field.name}" class="w-full px-3 py-2 border border-gray-300 rounded-md">`;
    }
}

// 添加成本项
window.addProductCostItem = function() {
    const container = document.getElementById('psCostItemsList');
    const items = container.querySelectorAll('.cost-item-row');
    const idx = items.length;
    
    // 清除空态提示
    const emptyHint = container.querySelector('.text-center');
    if (emptyHint) emptyHint.remove();
    
    const row = document.createElement('div');
    row.className = 'cost-item-row flex items-center gap-2 p-2 bg-white rounded border border-gray-200';
    row.innerHTML = `
        <input type="text" placeholder="成本项名称" class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm" data-field="name">
        <select class="w-28 px-2 py-1 border border-gray-300 rounded text-sm" data-field="calc_type">
            <option value="fixed">固定金额</option>
            <option value="percent">按比例</option>
        </select>
        <input type="number" placeholder="金额/比例" step="0.01" min="0" class="w-24 px-2 py-1 border border-gray-300 rounded text-sm" data-field="value">
        <button type="button" onclick="this.closest('.cost-item-row').remove()" class="text-red-500 hover:text-red-700 px-2">
            <i class="fas fa-trash-alt"></i>
        </button>
    `;
    
    container.appendChild(row);
};

// ==================== 服务包组合功能 ====================

// 缓存所有可选商品/服务
let allPackageOptions = [];

// 加载可选商品/服务列表
async function loadPackageItemOptions() {
    try {
        const res = await fetch('/api/services', { credentials: 'include' });
        const result = await res.json();
        if (result.success) {
            // 过滤掉服务包类型，只显示商品和服务
            allPackageOptions = (result.data || []).filter(item => {
                const type = item.item_type || item.type || 'service';
                return type === 'product' || type === 'service';
            });
        }
    } catch (error) {
        console.error('加载商品/服务列表失败:', error);
    }
}

// 搜索服务包可选项
window.searchPackageItems = function() {
    const keyword = document.getElementById('psPackageSearch')?.value?.trim().toLowerCase() || '';
    const container = document.getElementById('psPackageSearchResults');
    if (!container) return;
    
    if (!keyword) {
        container.innerHTML = '<div class="text-center text-gray-400 py-4 text-sm">输入关键词搜索商品/服务</div>';
        return;
    }
    
    // 过滤匹配项
    const matched = allPackageOptions.filter(item => {
        return (item.name && item.name.toLowerCase().includes(keyword)) ||
               (item.code && item.code.toLowerCase().includes(keyword));
    });
    
    if (matched.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-4 text-sm">未找到匹配的商品/服务</div>';
        return;
    }
    
    container.innerHTML = matched.map(item => {
        const itemType = item.item_type || item.type || 'service';
        const typeLabel = itemType === 'product' ? 
            '<span class="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">商品</span>' :
            '<span class="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">服务</span>';
        const isSelected = selectedPackageItems.some(s => s.id === item.id);
        
        return `
            <div class="flex items-center justify-between p-2 hover:bg-gray-50 border-b border-gray-100 ${isSelected ? 'bg-green-50' : ''}">
                <div class="flex items-center space-x-2">
                    ${typeLabel}
                    <span class="text-sm font-medium">${item.name}</span>
                    <span class="text-xs text-gray-400">${item.code || ''}</span>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-500">¥${parseFloat(item.retail_price || 0).toFixed(2)}</span>
                    ${isSelected ? 
                        '<span class="text-xs text-green-600"><i class="fas fa-check"></i> 已添加</span>' :
                        `<button type="button" onclick="addPackageItem(${item.id})" class="px-2 py-1 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600">
                            <i class="fas fa-plus"></i> 添加
                        </button>`
                    }
                </div>
            </div>
        `;
    }).join('');
};

// 添加项到服务包
window.addPackageItem = function(itemId) {
    const item = allPackageOptions.find(i => i.id === itemId);
    if (!item) return;
    
    // 检查是否已添加
    const existing = selectedPackageItems.find(s => s.id === itemId);
    if (existing) {
        existing.quantity++;
    } else {
        selectedPackageItems.push({
            id: item.id,
            name: item.name,
            code: item.code,
            item_type: item.item_type || item.type || 'service',
            retail_price: parseFloat(item.retail_price || 0),
            cost_price: parseFloat(item.cost_price || 0),
            quantity: 1
        });
    }
    
    renderSelectedPackageItems();
    searchPackageItems(); // 刷新搜索结果中的状态
    calculatePackagePrice(); // 自动计算价格
};

// 从服务包移除项
window.removePackageItem = function(itemId) {
    selectedPackageItems = selectedPackageItems.filter(s => s.id !== itemId);
    renderSelectedPackageItems();
    searchPackageItems(); // 刷新搜索结果中的状态
    calculatePackagePrice();
};

// 更新服务包项数量
window.updatePackageItemQty = function(itemId, qty) {
    const item = selectedPackageItems.find(s => s.id === itemId);
    if (item) {
        item.quantity = Math.max(1, parseInt(qty) || 1);
        renderSelectedPackageItems();
        calculatePackagePrice();
    }
};

// 渲染已选服务包项列表
function renderSelectedPackageItems() {
    const container = document.getElementById('psSelectedPackageItems');
    const hintEl = document.getElementById('psPackageTotalHint');
    if (!container) return;
    
    if (selectedPackageItems.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-6 text-sm">暂未添加任何商品/服务</div>';
        if (hintEl) hintEl.textContent = '共 0 项';
        return;
    }
    
    if (hintEl) hintEl.textContent = `共 ${selectedPackageItems.length} 项`;
    
    container.innerHTML = selectedPackageItems.map(item => {
        const typeLabel = item.item_type === 'product' ? 
            '<span class="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">商品</span>' :
            '<span class="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">服务</span>';
        const subtotal = (item.retail_price * item.quantity).toFixed(2);
        
        return `
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                <div class="flex items-center space-x-2">
                    ${typeLabel}
                    <span class="text-sm font-medium">${item.name}</span>
                </div>
                <div class="flex items-center space-x-3">
                    <span class="text-xs text-gray-500">¥${item.retail_price.toFixed(2)}</span>
                    <span class="text-gray-400">×</span>
                    <input type="number" min="1" value="${item.quantity}" 
                           onchange="updatePackageItemQty(${item.id}, this.value)"
                           class="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm">
                    <span class="text-sm font-medium text-blue-600">=¥${subtotal}</span>
                    <button type="button" onclick="removePackageItem(${item.id})" class="text-red-500 hover:text-red-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 自动计算服务包价格
function calculatePackagePrice() {
    if (selectedPackageItems.length === 0) return;
    
    let totalRetail = 0;
    let totalCost = 0;
    
    selectedPackageItems.forEach(item => {
        totalRetail += item.retail_price * item.quantity;
        totalCost += item.cost_price * item.quantity;
    });
    
    // 更新价格字段
    const retailInput = document.getElementById('psRetailPrice');
    const costInput = document.getElementById('psCostPrice');
    
    if (retailInput) retailInput.value = totalRetail.toFixed(2);
    if (costInput) costInput.value = totalCost.toFixed(2);
}

// 导出全局函数
window.initProductsPage = initProductsPage;
window.renderProductsList = renderProductsList;
window.createProductServiceModal = createProductServiceModal;

console.log('✅ 商品管理模块已加载 (products.js v3.0.0)');
console.log('✅ window.openServiceModalNew:', typeof window.openServiceModalNew);
