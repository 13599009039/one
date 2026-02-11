// 进销存管理模块

// 当前编辑ID
let currentEditSupplierId = null;
let currentEditPurchaseId = null;

// === 供应商管理 ===
function initSuppliersPage() {
    renderSuppliersList();
}

// 渲染供应商列表
function renderSuppliersList() {
    const result = db.getSuppliers();
    if (!result.success) return;
    
    const suppliers = result.data;
    const tbody = document.getElementById('suppliersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = suppliers.map(supplier => {
        const statusLabel = supplier.status === 'active' ?
            '<span class="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">启用</span>' :
            '<span class="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs">停用</span>';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-600">${supplier.code}</td>
                <td class="px-4 py-3 font-medium text-gray-900">${supplier.name}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${supplier.contact_name || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${supplier.contact_phone || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${supplier.category || '-'}</td>
                <td class="px-4 py-3 text-center">${statusLabel}</td>
                <td class="px-4 py-3 text-center">
                    <button onclick="editSupplier(${supplier.id})" class="text-green-600 hover:text-green-800 mr-2" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteSupplierItem(${supplier.id})" class="text-red-600 hover:text-red-800" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// 打开供应商模态框
function openSupplierModal(id = null) {
    currentEditSupplierId = id;
    const modal = document.getElementById('supplierModal');
    if (!modal) {
        createSupplierModal();
    }
    
    if (id) {
        const suppliers = db.getSuppliers().data || [];
        const supplier = suppliers.find(s => s.id === id);
        if (supplier) {
            document.getElementById('supplierModalTitle').innerText = '编辑供应商';
            document.getElementById('supplierName').value = supplier.name;
            document.getElementById('supplierCode').value = supplier.code;
            document.getElementById('supplierContactName').value = supplier.contact_name || '';
            document.getElementById('supplierContactPhone').value = supplier.contact_phone || '';
            document.getElementById('supplierAddress').value = supplier.address || '';
            document.getElementById('supplierCategory').value = supplier.category || '';
        }
    } else {
        document.getElementById('supplierModalTitle').innerText = '新增供应商';
        document.getElementById('supplierForm').reset();
    }
    
    document.getElementById('supplierModal').classList.remove('hidden');
}

// 创建供应商模态框
function createSupplierModal() {
    const modalHtml = `
        <div id="supplierModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full hidden z-50">
            <div class="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white mt-20">
                <div class="flex justify-between items-center mb-4">
                    <h3 id="supplierModalTitle" class="text-xl font-bold text-gray-900">新增供应商</h3>
                    <button onclick="closeSupplierModal()" class="text-gray-400 hover:text-gray-500">
                        <span class="text-2xl">&times;</span>
                    </button>
                </div>
                <form id="supplierForm" onsubmit="saveSupplier(event)">
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                                <input type="text" id="supplierName" required class="w-full px-3 py-2 border rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">编码</label>
                                <input type="text" id="supplierCode" class="w-full px-3 py-2 border rounded-lg" placeholder="自动生成">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">联系人</label>
                                <input type="text" id="supplierContactName" class="w-full px-3 py-2 border rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                                <input type="text" id="supplierContactPhone" class="w-full px-3 py-2 border rounded-lg">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">类别</label>
                            <input type="text" id="supplierCategory" class="w-full px-3 py-2 border rounded-lg" placeholder="如：设备供应商、器材供应商">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">地址</label>
                            <input type="text" id="supplierAddress" class="w-full px-3 py-2 border rounded-lg">
                        </div>
                    </div>
                    <div class="flex justify-end space-x-3 mt-6">
                        <button type="button" onclick="closeSupplierModal()" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 关闭供应商模态框
function closeSupplierModal() {
    document.getElementById('supplierModal')?.classList.add('hidden');
}

// 保存供应商
function saveSupplier(event) {
    event.preventDefault();
    
    const supplierData = {
        name: document.getElementById('supplierName').value,
        code: document.getElementById('supplierCode').value,
        contact_name: document.getElementById('supplierContactName').value,
        contact_phone: document.getElementById('supplierContactPhone').value,
        address: document.getElementById('supplierAddress').value,
        category: document.getElementById('supplierCategory').value,
        status: 'active'
    };
    
    let result;
    if (currentEditSupplierId) {
        result = db.updateSupplier(currentEditSupplierId, supplierData);
    } else {
        result = db.addSupplier(supplierData);
    }
    
    if (result.success) {
        closeSupplierModal();
        renderSuppliersList();
        showInventoryToast(currentEditSupplierId ? '供应商更新成功' : '供应商添加成功', 'success');
    } else {
        showInventoryToast(result.message || '操作失败', 'error');
    }
}

// 编辑供应商
function editSupplier(id) {
    openSupplierModal(id);
}

// 删除供应商
function deleteSupplierItem(id) {
    if (confirm('确定要删除此供应商吗？')) {
        const result = db.deleteSupplier(id);
        if (result.success) {
            renderSuppliersList();
            showInventoryToast('删除成功', 'success');
        } else {
            showInventoryToast(result.message || '删除失败', 'error');
        }
    }
}

// === 采购单管理 ===
function initPurchasesPage() {
    renderPurchasesList();
}

// 渲染采购单列表
function renderPurchasesList() {
    const result = db.getPurchases();
    if (!result.success) return;
    
    const purchases = result.data;
    const suppliers = db.getSuppliers().data || [];
    const tbody = document.getElementById('purchasesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = purchases.map(purchase => {
        const supplier = suppliers.find(s => s.id === purchase.supplier_id);
        const statusClass = {
            '待入库': 'bg-yellow-100 text-yellow-800',
            '已入库': 'bg-green-100 text-green-800',
            '已取消': 'bg-gray-100 text-gray-800'
        }[purchase.status] || 'bg-gray-100 text-gray-800';
        
        const actions = purchase.status === '待入库' ? `
            <button onclick="warehousePurchaseItem('${purchase.id}')" class="text-green-600 hover:text-green-800 mr-2" title="入库">
                <i class="fas fa-warehouse"></i>
            </button>
            <button onclick="viewPurchaseDetail('${purchase.id}')" class="text-blue-600 hover:text-blue-800" title="查看">
                <i class="fas fa-eye"></i>
            </button>
        ` : `
            <button onclick="viewPurchaseDetail('${purchase.id}')" class="text-blue-600 hover:text-blue-800" title="查看">
                <i class="fas fa-eye"></i>
            </button>
        `;
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">${purchase.id}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${supplier?.name || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${purchase.purchase_date}</td>
                <td class="px-4 py-3 text-right text-sm font-medium text-gray-900">¥${purchase.total_amount.toFixed(2)}</td>
                <td class="px-4 py-3 text-center">
                    <span class="px-2 py-0.5 ${statusClass} rounded text-xs">${purchase.status}</span>
                </td>
                <td class="px-4 py-3 text-center">${actions}</td>
            </tr>
        `;
    }).join('');
}

// 打开采购单模态框
function openPurchaseModal() {
    const modal = document.getElementById('purchaseModal');
    if (!modal) {
        createPurchaseModal();
    }
    
    // 加载供应商列表
    const suppliers = db.getSuppliers().data || [];
    const supplierSelect = document.getElementById('purchaseSupplierId');
    if (supplierSelect) {
        supplierSelect.innerHTML = '<option value="">请选择供应商</option>' +
            suppliers.filter(s => s.status === 'active').map(s => 
                `<option value="${s.id}">${s.name}</option>`
            ).join('');
    }
    
    // 重置表单
    document.getElementById('purchaseForm').reset();
    document.getElementById('purchaseDate').value = new Date().toISOString().split('T')[0];
    purchaseItems = [];
    renderPurchaseItems();
    
    document.getElementById('purchaseModal').classList.remove('hidden');
}

// 采购单项目
let purchaseItems = [];

// 创建采购单模态框
function createPurchaseModal() {
    const modalHtml = `
        <div id="purchaseModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full hidden z-50">
            <div class="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white mt-10">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-900">新增采购单</h3>
                    <button onclick="closePurchaseModal()" class="text-gray-400 hover:text-gray-500">
                        <span class="text-2xl">&times;</span>
                    </button>
                </div>
                <form id="purchaseForm" onsubmit="savePurchase(event)">
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">供应商 *</label>
                            <select id="purchaseSupplierId" required class="w-full px-3 py-2 border rounded-lg">
                                <option value="">请选择供应商</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">采购日期 *</label>
                            <input type="date" id="purchaseDate" required class="w-full px-3 py-2 border rounded-lg">
                        </div>
                    </div>
                    <!-- 采购项目 -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">采购项目</label>
                        <div class="flex space-x-2 mb-2">
                            <select id="purchaseProductSelect" class="flex-1 px-3 py-2 border rounded-lg">
                                <option value="">选择商品</option>
                            </select>
                            <input type="number" id="purchaseQtyInput" placeholder="数量" min="1" class="w-20 px-3 py-2 border rounded-lg">
                            <input type="number" id="purchasePriceInput" placeholder="单价" step="0.01" class="w-24 px-3 py-2 border rounded-lg">
                            <button type="button" onclick="addPurchaseItem()" class="px-4 py-2 bg-blue-600 text-white rounded-lg">添加</button>
                        </div>
                        <div id="purchaseItemsList" class="border rounded-lg p-2 min-h-24 max-h-40 overflow-y-auto">
                            <p class="text-gray-400 text-sm">请添加采购项目</p>
                        </div>
                    </div>
                    <div class="flex justify-between items-center mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">备注</label>
                            <input type="text" id="purchaseRemark" class="w-64 px-3 py-2 border rounded-lg">
                        </div>
                        <div class="text-right">
                            <p class="text-sm text-gray-500">采购总金额</p>
                            <p id="purchaseTotalAmount" class="text-2xl font-bold text-blue-600">¥0.00</p>
                        </div>
                    </div>
                    <div class="flex justify-end space-x-3">
                        <button type="button" onclick="closePurchaseModal()" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 加载商品列表
    loadPurchaseProductOptions();
}

// 加载采购商品选项
function loadPurchaseProductOptions() {
    const services = db.getServices().data || [];
    const products = services.filter(s => s.type === 'product');
    const select = document.getElementById('purchaseProductSelect');
    if (select) {
        select.innerHTML = '<option value="">选择商品</option>' +
            products.map(p => `<option value="${p.id}" data-price="${p.cost_price}">${p.name} (成本价: ¥${p.cost_price})</option>`).join('');
    }
}

// 添加采购项目
function addPurchaseItem() {
    const select = document.getElementById('purchaseProductSelect');
    const qtyInput = document.getElementById('purchaseQtyInput');
    const priceInput = document.getElementById('purchasePriceInput');
    
    const serviceId = parseInt(select.value);
    const quantity = parseInt(qtyInput.value);
    const unitPrice = parseFloat(priceInput.value);
    
    if (!serviceId || !quantity || !unitPrice) {
        showInventoryToast('请选择商品并填写数量和单价', 'error');
        return;
    }
    
    const existing = purchaseItems.find(item => item.service_id === serviceId);
    if (existing) {
        existing.quantity += quantity;
        existing.unit_price = unitPrice;
    } else {
        purchaseItems.push({ service_id: serviceId, quantity, unit_price: unitPrice });
    }
    
    renderPurchaseItems();
    select.value = '';
    qtyInput.value = '';
    priceInput.value = '';
}

// 渲染采购项目
function renderPurchaseItems() {
    const services = db.getServices().data || [];
    const container = document.getElementById('purchaseItemsList');
    if (!container) return;
    
    if (purchaseItems.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-sm">请添加采购项目</p>';
        document.getElementById('purchaseTotalAmount').innerText = '¥0.00';
        return;
    }
    
    let total = 0;
    container.innerHTML = purchaseItems.map((item, index) => {
        const service = services.find(s => s.id === item.service_id);
        const subtotal = item.quantity * item.unit_price;
        total += subtotal;
        return `
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded mb-1">
                <span class="font-medium text-sm">${service?.name || '未知'}</span>
                <div class="flex items-center space-x-4 text-sm">
                    <span>${item.quantity} x ¥${parseFloat(item.unit_price || 0).toFixed(2)}</span>
                    <span class="font-medium">= ¥${subtotal.toFixed(2)}</span>
                    <button type="button" onclick="removePurchaseItem(${index})" class="text-red-500 hover:text-red-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('purchaseTotalAmount').innerText = `¥${total.toFixed(2)}`;
}

// 移除采购项目
function removePurchaseItem(index) {
    purchaseItems.splice(index, 1);
    renderPurchaseItems();
}

// 关闭采购单模态框
function closePurchaseModal() {
    document.getElementById('purchaseModal')?.classList.add('hidden');
}

// 保存采购单
function savePurchase(event) {
    event.preventDefault();
    
    if (purchaseItems.length === 0) {
        showInventoryToast('请至少添加一个采购项目', 'error');
        return;
    }
    
    const total = purchaseItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    
    const purchaseData = {
        supplier_id: parseInt(document.getElementById('purchaseSupplierId').value),
        purchase_date: document.getElementById('purchaseDate').value,
        items: purchaseItems,
        total_amount: total,
        remark: document.getElementById('purchaseRemark').value,
        status: '待入库'
    };
    
    const result = db.addPurchase(purchaseData);
    
    if (result.success) {
        closePurchaseModal();
        renderPurchasesList();
        showInventoryToast('采购单创建成功', 'success');
    } else {
        showInventoryToast(result.message || '操作失败', 'error');
    }
}

// 采购单入库
function warehousePurchaseItem(id) {
    if (confirm('确认将此采购单入库？入库后库存将自动增加。')) {
        const result = db.warehousePurchase(id);
        if (result.success) {
            renderPurchasesList();
            showInventoryToast('入库成功', 'success');
        } else {
            showInventoryToast(result.message || '入库失败', 'error');
        }
    }
}

// 查看采购单详情
function viewPurchaseDetail(id) {
    const purchases = db.getPurchases().data || [];
    const purchase = purchases.find(p => p.id === id);
    if (!purchase) return;
    
    const suppliers = db.getSuppliers().data || [];
    const services = db.getServices().data || [];
    const supplier = suppliers.find(s => s.id === purchase.supplier_id);
    
    const itemsHtml = purchase.items.map(item => {
        const service = services.find(s => s.id === item.service_id);
        return `<tr>
            <td class="py-1">${service?.name || '未知'}</td>
            <td class="py-1 text-center">${item.quantity}</td>
            <td class="py-1 text-right">¥${parseFloat(item.unit_price || 0).toFixed(2)}</td>
            <td class="py-1 text-right">¥${parseFloat((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</td>
        </tr>`;
    }).join('');
    
    const content = `
        <div class="space-y-3 text-sm">
            <div class="grid grid-cols-2 gap-2">
                <p><span class="text-gray-500">采购单号：</span>${purchase.id}</p>
                <p><span class="text-gray-500">供应商：</span>${supplier?.name || '-'}</p>
                <p><span class="text-gray-500">采购日期：</span>${purchase.purchase_date}</p>
                <p><span class="text-gray-500">状态：</span>${purchase.status}</p>
            </div>
            <table class="w-full text-sm">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="py-1 text-left">商品</th>
                        <th class="py-1 text-center">数量</th>
                        <th class="py-1 text-right">单价</th>
                        <th class="py-1 text-right">小计</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
                <tfoot class="border-t">
                    <tr class="font-bold">
                        <td colspan="3" class="py-2 text-right">合计：</td>
                        <td class="py-2 text-right text-blue-600">¥${purchase.total_amount.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
            ${purchase.remark ? `<p class="text-gray-500">备注：${purchase.remark}</p>` : ''}
        </div>
    `;
    
    showInventoryAlert('采购单详情', content);
}

// === 库存管理 ===
function initInventoryPage() {
    renderInventoryList();
    renderInventoryLogs();
    updateInventoryStats();
}

// 渲染库存列表
function renderInventoryList() {
    const inventory = db.getInventory().data || [];
    const services = db.getServices().data || [];
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = inventory.map(inv => {
        const service = services.find(s => s.id === inv.service_id);
        const isLow = inv.quantity <= (inv.min_stock || 5);
        const statusLabel = isLow ?
            '<span class="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs">库存不足</span>' :
            '<span class="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">正常</span>';
        
        return `
            <tr class="hover:bg-gray-50 ${isLow ? 'bg-red-50' : ''}">
                <td class="px-4 py-3 text-sm text-gray-600">${service?.code || '-'}</td>
                <td class="px-4 py-3 font-medium text-gray-900">${service?.name || '未知'}</td>
                <td class="px-4 py-3 text-center">
                    <span class="${isLow ? 'text-red-600 font-bold' : 'text-gray-900'}">${inv.quantity}</span>
                </td>
                <td class="px-4 py-3 text-center text-sm text-gray-600">${inv.min_stock || 5}</td>
                <td class="px-4 py-3 text-center">${statusLabel}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${inv.last_updated}</td>
            </tr>
        `;
    }).join('');
}

// 渲染库存变动记录
function renderInventoryLogs() {
    const result = db.getInventoryLogs();
    if (!result.success) return;
    
    const logs = result.data.slice(0, 20); // 只显示最近20条
    const services = db.getServices().data || [];
    const tbody = document.getElementById('inventoryLogsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = logs.map(log => {
        const service = services.find(s => s.id === log.service_id);
        const typeClass = log.change_type === '入库' ? 'text-green-600' : 
                         log.change_type === '出库' ? 'text-red-600' : 'text-blue-600';
        const qtyDisplay = log.quantity > 0 ? `+${log.quantity}` : log.quantity;
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-600">${log.created_at}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${service?.name || '未知'}</td>
                <td class="px-4 py-3 text-center">
                    <span class="px-2 py-0.5 bg-gray-100 rounded text-xs">${log.change_type}</span>
                </td>
                <td class="px-4 py-3 text-center font-medium ${typeClass}">${qtyDisplay}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${log.reference_type || '-'} ${log.reference_id || ''}</td>
                <td class="px-4 py-3 text-sm text-gray-500">${log.remark || '-'}</td>
            </tr>
        `;
    }).join('');
}

// 更新库存统计
function updateInventoryStats() {
    const inventory = db.getInventory().data || [];
    
    document.getElementById('inventoryTotalItems').innerText = inventory.length;
    document.getElementById('inventoryTotalQty').innerText = inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    document.getElementById('inventoryAlertCount').innerText = inventory.filter(inv => inv.quantity <= (inv.min_stock || 5)).length;
}

// 打开盘点调整模态框
function openAdjustInventoryModal() {
    const modal = document.getElementById('adjustInventoryModal');
    if (!modal) {
        createAdjustInventoryModal();
    }
    
    // 加载商品列表
    const services = db.getServices().data || [];
    const products = services.filter(s => s.type === 'product');
    const select = document.getElementById('adjustServiceId');
    if (select) {
        select.innerHTML = '<option value="">选择商品</option>' +
            products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }
    
    document.getElementById('adjustInventoryForm').reset();
    document.getElementById('adjustInventoryModal').classList.remove('hidden');
}

// 创建盘点调整模态框
function createAdjustInventoryModal() {
    const modalHtml = `
        <div id="adjustInventoryModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full hidden z-50">
            <div class="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white mt-20">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-900">盘点调整</h3>
                    <button onclick="closeAdjustInventoryModal()" class="text-gray-400 hover:text-gray-500">
                        <span class="text-2xl">&times;</span>
                    </button>
                </div>
                <form id="adjustInventoryForm" onsubmit="saveAdjustInventory(event)">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">商品 *</label>
                            <select id="adjustServiceId" required class="w-full px-3 py-2 border rounded-lg" onchange="loadCurrentStock()">
                                <option value="">选择商品</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">当前库存</label>
                            <input type="text" id="adjustCurrentStock" readonly class="w-full px-3 py-2 border rounded-lg bg-gray-50">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">实际库存 *</label>
                            <input type="number" id="adjustNewStock" required min="0" class="w-full px-3 py-2 border rounded-lg">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">备注</label>
                            <input type="text" id="adjustRemark" class="w-full px-3 py-2 border rounded-lg" placeholder="如：实物盘点">
                        </div>
                    </div>
                    <div class="flex justify-end space-x-3 mt-6">
                        <button type="button" onclick="closeAdjustInventoryModal()" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">确认调整</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 加载当前库存
function loadCurrentStock() {
    const serviceId = parseInt(document.getElementById('adjustServiceId').value);
    if (!serviceId) {
        document.getElementById('adjustCurrentStock').value = '';
        return;
    }
    
    const inventory = db.getInventory().data || [];
    const inv = inventory.find(i => i.service_id === serviceId);
    document.getElementById('adjustCurrentStock').value = inv ? inv.quantity : 0;
}

// 关闭盘点调整模态框
function closeAdjustInventoryModal() {
    document.getElementById('adjustInventoryModal')?.classList.add('hidden');
}

// 保存盘点调整
function saveAdjustInventory(event) {
    event.preventDefault();
    
    const serviceId = parseInt(document.getElementById('adjustServiceId').value);
    const newQuantity = parseInt(document.getElementById('adjustNewStock').value);
    const remark = document.getElementById('adjustRemark').value;
    
    const result = db.adjustInventory(serviceId, newQuantity, remark);
    
    if (result.success) {
        closeAdjustInventoryModal();
        renderInventoryList();
        renderInventoryLogs();
        updateInventoryStats();
        showInventoryToast('库存调整成功', 'success');
    } else {
        showInventoryToast(result.message || '操作失败', 'error');
    }
}

// 显示模态提示框
function showInventoryAlert(title, content) {
    const existing = document.getElementById('inventoryAlertModal');
    if (existing) existing.remove();
    
    const modalHtml = `
        <div id="inventoryAlertModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white mt-20">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-900">${title}</h3>
                    <button onclick="document.getElementById('inventoryAlertModal').remove()" class="text-gray-400 hover:text-gray-500">
                        <span class="text-2xl">&times;</span>
                    </button>
                </div>
                <div>${content}</div>
                <div class="mt-4 text-right">
                    <button onclick="document.getElementById('inventoryAlertModal').remove()" class="px-4 py-2 bg-blue-600 text-white rounded-lg">关闭</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 显示提示消息
function showInventoryToast(message, type = 'info') {
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

// 挂载全局函数供 HTML 调用
if (typeof window !== 'undefined') {
    // 供应商管理
    window.initSuppliersPage = initSuppliersPage;
    window.openSupplierModal = openSupplierModal;
    window.closeSupplierModal = closeSupplierModal;
    window.saveSupplier = saveSupplier;
    window.editSupplier = editSupplier;
    window.deleteSupplierItem = deleteSupplierItem;
    
    // 采购单管理
    window.initPurchasesPage = initPurchasesPage;
    window.openPurchaseModal = openPurchaseModal;
    window.closePurchaseModal = closePurchaseModal;
    window.savePurchase = savePurchase;
    window.addPurchaseItem = addPurchaseItem;
    window.removePurchaseItem = removePurchaseItem;
        // window.editPurchase = editPurchase; // TODO: 该函数尚未实现
    window.deletePurchaseItem = deletePurchaseItem;
    window.updatePurchaseItemSubtotal = updatePurchaseItemSubtotal;
    
    // 库存管理
    window.initInventoryPage = initInventoryPage;
    window.openAdjustInventoryModal = openAdjustInventoryModal;
    window.closeAdjustInventoryModal = closeAdjustInventoryModal;
    window.saveAdjustInventory = saveAdjustInventory;
}
