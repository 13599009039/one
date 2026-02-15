// 进销存管理模块

// 当前编辑ID
let currentEditSupplierId = null;
let currentEditPurchaseId = null;
let allSuppliers = []; // 缓存供应商数据
let allPurchases = []; // 缓存采购单数据

// === 供应商管理 ===
async function initSuppliersPage() {
    await renderSuppliersList();
}

// 渲染供应商列表
async function renderSuppliersList() {
    try {
        const response = await fetch('/api/suppliers', { credentials: 'include' });
        const result = await response.json();
        if (!result.success) {
            console.error('加载供应商失败:', result.message);
            return;
        }
        
        allSuppliers = result.data || [];
        const suppliers = allSuppliers;
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
    } catch (error) {
        console.error('渲染供应商列表失败:', error);
    }
}

// 打开供应商模态框
function openSupplierModal(id = null) {
    currentEditSupplierId = id;
    const modal = document.getElementById('supplierModal');
    if (!modal) {
        createSupplierModal();
    }
    
    if (id) {
        // 使用缓存数据
        const supplier = allSuppliers.find(s => s.id === id);
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
async function saveSupplier(event) {
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
    
    try {
        let response;
        if (currentEditSupplierId) {
            response = await fetch(`${API_BASE_URL}/suppliers/${currentEditSupplierId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(supplierData)
            });
        } else {
            response = await fetch(`${API_BASE_URL}/suppliers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(supplierData)
            });
        }
        
        const result = await response.json();
        
        if (result.success) {
            closeSupplierModal();
            renderSuppliersList();
            showInventoryToast(currentEditSupplierId ? '供应商更新成功' : '供应商添加成功', 'success');
        } else {
            showInventoryToast(result.message || '操作失败', 'error');
        }
    } catch (error) {
        console.error('保存供应商失败:', error);
        showInventoryToast('操作失败', 'error');
    }
}

// 编辑供应商
function editSupplier(id) {
    openSupplierModal(id);
}

// 删除供应商
async function deleteSupplierItem(id) {
    if (confirm('确定要删除此供应商吗？')) {
        try {
            const response = await fetch(`/api/suppliers/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success) {
                await renderSuppliersList();
                showInventoryToast('删除成功', 'success');
            } else {
                showInventoryToast(result.message || '删除失败', 'error');
            }
        } catch (error) {
            console.error('删除供应商失败:', error);
            showInventoryToast('删除失败', 'error');
        }
    }
}

// === 采购单管理 ===
async function initPurchasesPage() {
    await renderPurchasesList();
}

// 渲染采购单列表
async function renderPurchasesList() {
    try {
        // 并行加载采购单和供应商数据
        const [purchasesRes, suppliersRes] = await Promise.all([
            fetch('/api/purchases', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/suppliers', { credentials: 'include' }).then(r => r.json())
        ]);
        
        if (!purchasesRes.success) {
            console.error('加载采购单失败:', purchasesRes.message);
            return;
        }
        
        allPurchases = purchasesRes.data || [];
        allSuppliers = suppliersRes.success ? (suppliersRes.data || []) : allSuppliers;
        
        const purchases = allPurchases;
        const suppliers = allSuppliers;
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
    } catch (error) {
        console.error('渲染采购单列表失败:', error);
    }
}

// 打开采购单模态框
async function openPurchaseModal() {
    const modal = document.getElementById('purchaseModal');
    if (!modal) {
        createPurchaseModal();
    }
    
    // 加载供应商列表
    try {
        if (allSuppliers.length === 0) {
            const res = await fetch('/api/suppliers', { credentials: 'include' });
            const result = await res.json();
            if (result.success) allSuppliers = result.data || [];
        }
        const supplierSelect = document.getElementById('purchaseSupplierId');
        if (supplierSelect) {
            supplierSelect.innerHTML = '<option value="">请选择供应商</option>' +
                allSuppliers.filter(s => s.status === 'active').map(s => 
                    `<option value="${s.id}">${s.name}</option>`
                ).join('');
        }
    } catch (error) {
        console.error('加载供应商列表失败:', error);
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
async function loadPurchaseProductOptions() {
    try {
        const response = await fetch(`${API_BASE_URL}/services`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 加载所有商品和服务（不限制type）
            const products = result.data || [];
            const select = document.getElementById('purchaseProductSelect');
            
            if (select) {
                if (products.length === 0) {
                    select.innerHTML = '<option value="">暂无商品</option>';
                } else {
                    select.innerHTML = '<option value="">选择商品</option>' +
                        products.map(p => `<option value="${p.id}" data-price="${p.cost_price || 0}">${p.name} (成本价: ¥${p.cost_price || 0})</option>`).join('');
                }
            }
        } else {
            console.error('加载商品列表失败:', result.message);
            showInventoryToast('加载商品列表失败', 'error');
        }
    } catch (error) {
        console.error('加载商品列表失败:', error);
        showInventoryToast('加载商品列表失败', 'error');
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
async function renderPurchaseItems() {
    let allProducts = [];
    try {
        const result = await window.api.getServices();
        if (result.success) allProducts = result.data || [];
    } catch (error) {
        console.error('加载商品列表失败:', error);
    }
    
    const container = document.getElementById('purchaseItemsList');
    if (!container) return;
    
    if (purchaseItems.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-sm">请添加采购项目</p>';
        document.getElementById('purchaseTotalAmount').innerText = '¥0.00';
        return;
    }
    
    let total = 0;
    container.innerHTML = purchaseItems.map((item, index) => {
        const service = allProducts.find(s => s.id === item.service_id);
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
async function savePurchase(event) {
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
    
    try {
        const response = await fetch('/api/purchases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(purchaseData)
        });
        const result = await response.json();
        
        if (result.success) {
            closePurchaseModal();
            await renderPurchasesList();
            showInventoryToast('采购单创建成功', 'success');
        } else {
            showInventoryToast(result.message || '操作失败', 'error');
        }
    } catch (error) {
        console.error('保存采购单失败:', error);
        showInventoryToast('操作失败', 'error');
    }
}

// 采购单入库
async function warehousePurchaseItem(id) {
    if (confirm('确认将此采购单入库？入库后库存将自动增加。')) {
        try {
            const response = await fetch(`/api/purchases/${id}/warehouse`, {
                method: 'POST',
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success) {
                await renderPurchasesList();
                showInventoryToast('入库成功', 'success');
            } else {
                showInventoryToast(result.message || '入库失败', 'error');
            }
        } catch (error) {
            console.error('入库失败:', error);
            showInventoryToast('入库失败', 'error');
        }
    }
}

// 查看采购单详情
async function viewPurchaseDetail(id) {
    // 使用缓存数据或重新加载
    const purchase = allPurchases.find(p => p.id === id || p.id === parseInt(id));
    if (!purchase) {
        showInventoryToast('采购单不存在', 'error');
        return;
    }
    
    // 加载商品数据
    let allProducts = [];
    try {
        const result = await window.api.getServices();
        if (result.success) allProducts = result.data || [];
    } catch (error) {
        console.error('加载商品数据失败:', error);
    }
    
    const supplier = allSuppliers.find(s => s.id === purchase.supplier_id);
    const purchaseItems = purchase.items || [];
    
    const itemsHtml = purchaseItems.map(item => {
        const product = allProducts.find(s => s.id === item.service_id);
        return `<tr>
            <td class="py-1">${product?.name || '未知'}</td>
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
async function initInventoryPage() {
    await renderInventoryList();
    await renderInventoryLogs();
    await updateInventoryStats();
}

// 渲染库存列表
async function renderInventoryList() {
    try {
        const result = await window.api.getServices();
        if (!result.success) throw new Error(result.message || 'API返回失败');
        
        const services = result.data || [];
        const products = services.filter(s => s.type === 'product');
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = products.map(product => {
            const stock = product.stock || 0;
            const minStock = product.min_stock || 5;
            const isLow = stock <= minStock;
            const statusLabel = isLow ?
                '<span class="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs">库存不足</span>' :
                '<span class="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">正常</span>';
            
            return `
                <tr class="hover:bg-gray-50 ${isLow ? 'bg-red-50' : ''}">
                    <td class="px-4 py-3 text-sm text-gray-600">${product.code || '-'}</td>
                    <td class="px-4 py-3 font-medium text-gray-900">${product.name || '未知'}</td>
                    <td class="px-4 py-3 text-center">
                        <span class="${isLow ? 'text-red-600 font-bold' : 'text-gray-900'}">${stock}</span>
                    </td>
                    <td class="px-4 py-3 text-center text-sm text-gray-600">${minStock}</td>
                    <td class="px-4 py-3 text-center">${statusLabel}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">${product.updated_at || '-'}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        window.Utils.handleApiError(error, '加载库存数据');
    }
}

// 渲染库存变动记录
async function renderInventoryLogs() {
    try {
        const result = await window.api.getInventoryTransactions();
        if (!result.success) throw new Error(result.message || 'API返回失败');
        
        const logs = (result.data || []).slice(0, 20); // 只显示最近20条
        const tbody = document.getElementById('inventoryLogsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = logs.map(log => {
            const typeClass = log.transaction_type === '入库' ? 'text-green-600' : 
                             log.transaction_type === '出库' ? 'text-red-600' : 'text-blue-600';
            const qtyDisplay = log.quantity > 0 ? `+${log.quantity}` : log.quantity;
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-sm text-gray-600">${log.created_at || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${log.material_name || '未知'}</td>
                    <td class="px-4 py-3 text-center">
                        <span class="px-2 py-0.5 bg-gray-100 rounded text-xs">${log.transaction_type}</span>
                    </td>
                    <td class="px-4 py-3 text-center font-medium ${typeClass}">${qtyDisplay}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">${log.related_type || '-'} ${log.related_id || ''}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">${log.remark || '-'}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        window.Utils.handleApiError(error, '加载库存流水');
    }
}

// 更新库存统计
async function updateInventoryStats() {
    try {
        const result = await window.api.getServices();
        if (!result.success) throw new Error(result.message || 'API返回失败');
        
        const products = (result.data || []).filter(s => s.type === 'product');
        
        document.getElementById('inventoryTotalItems').innerText = products.length;
        document.getElementById('inventoryTotalQty').innerText = products.reduce((sum, p) => sum + (p.stock || 0), 0);
        document.getElementById('inventoryAlertCount').innerText = products.filter(p => (p.stock || 0) <= (p.min_stock || 5)).length;
    } catch (error) {
        console.error('更新统计失败:', error);
    }
}

// 打开盘点调整模态框
async function openAdjustInventoryModal() {
    const modal = document.getElementById('adjustInventoryModal');
    if (!modal) {
        createAdjustInventoryModal();
    }
    
    // 加载商品列表
    try {
        const result = await window.api.getServices();
        if (result.success) {
            const allProducts = result.data || [];
            const products = allProducts.filter(s => s.type === 'product' || s.item_type === 'product');
            const select = document.getElementById('adjustServiceId');
            if (select) {
                select.innerHTML = '<option value="">选择商品</option>' +
                    products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('加载商品列表失败:', error);
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
async function loadCurrentStock() {
    const serviceId = parseInt(document.getElementById('adjustServiceId').value);
    if (!serviceId) {
        document.getElementById('adjustCurrentStock').value = '';
        return;
    }
    
    try {
        const result = await window.api.getServices();
        if (!result.success) throw new Error(result.message || 'API返回失败');
        
        const service = (result.data || []).find(s => s.id === serviceId);
        document.getElementById('adjustCurrentStock').value = service ? (service.stock || 0) : 0;
    } catch (error) {
        console.error('加载库存失败:', error);
        document.getElementById('adjustCurrentStock').value = 0;
    }
}

// 关闭盘点调整模态框
function closeAdjustInventoryModal() {
    document.getElementById('adjustInventoryModal')?.classList.add('hidden');
}

// 保存盘点调整
async function saveAdjustInventory(event) {
    event.preventDefault();
    
    const materialId = parseInt(document.getElementById('adjustServiceId').value);
    const newQuantity = parseInt(document.getElementById('adjustNewStock').value);
    const remark = document.getElementById('adjustRemark').value;
    
    try {
        const result = await window.api.inventoryAdjust({
            material_id: materialId,
            stock_after: newQuantity,
            remark: remark
        });
        
        if (!result.success) throw new Error(result.message || 'API返回失败');
        
        closeAdjustInventoryModal();
        await renderInventoryList();
        await renderInventoryLogs();
        await updateInventoryStats();
        if (window.showNotification) {
            window.showNotification('库存调整成功', 'success');
        }
    } catch (error) {
        window.Utils.handleApiError(error, '库存调整');
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

// ==================== P4-3: 采购入库UI ====================

// 打开采购入库模态框
function openInventoryInModal() {
    const modal = document.getElementById('inventoryInModal');
    if (!modal) {
        createInventoryInModal();
    }
    
    // 重置表单
    document.getElementById('inventoryInForm').reset();
    document.getElementById('inventoryInDate').value = new Date().toISOString().split('T')[0];
    
    // 加载商品列表
    loadInventoryInProducts();
    
    document.getElementById('inventoryInModal').classList.remove('hidden');
}

// 创建采购入库模态框
function createInventoryInModal() {
    const modalHtml = `
        <div id="inventoryInModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full hidden" style="z-index: 9999 !important;">
            <div class="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white mt-10">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-900">采购入库</h3>
                    <button onclick="closeInventoryInModal()" class="text-gray-400 hover:text-gray-500">
                        <span class="text-2xl">&times;</span>
                    </button>
                </div>
                <form id="inventoryInForm" onsubmit="saveInventoryIn(event)">
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">入库日期 *</label>
                                <input type="date" id="inventoryInDate" required class="w-full px-3 py-2 border rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                                <input type="text" id="inventoryInSupplier" class="w-full px-3 py-2 border rounded-lg" placeholder="可选">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">商品 *</label>
                            <select id="inventoryInProduct" required class="w-full px-3 py-2 border rounded-lg" onchange="updateInventoryInCurrentStock()">
                                <option value="">请选择商品</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">当前库存</label>
                            <input type="text" id="inventoryInCurrentStock" readonly class="w-full px-3 py-2 border rounded-lg bg-gray-50">
                        </div>
                        <div class="grid grid-cols-3 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">入库数量 *</label>
                                <input type="number" id="inventoryInQuantity" required min="1" class="w-full px-3 py-2 border rounded-lg" placeholder="0">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">单价</label>
                                <input type="number" id="inventoryInUnitPrice" step="0.01" class="w-full px-3 py-2 border rounded-lg" placeholder="0.00">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">总金额</label>
                                <input type="text" id="inventoryInTotalAmount" readonly class="w-full px-3 py-2 border rounded-lg bg-gray-50">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">备注</label>
                            <input type="text" id="inventoryInRemark" class="w-full px-3 py-2 border rounded-lg" placeholder="如：XX供应商采购">
                        </div>
                    </div>
                    <div class="flex justify-end space-x-3 mt-6">
                        <button type="button" onclick="closeInventoryInModal()" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">确认入库</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 监听数量和单价变化，自动计算总金额
    document.getElementById('inventoryInQuantity').addEventListener('input', calculateInventoryInTotal);
    document.getElementById('inventoryInUnitPrice').addEventListener('input', calculateInventoryInTotal);
}

// 加载采购入库商品列表
async function loadInventoryInProducts() {
    try {
        const result = await window.api.getServices();
        if (!result.success) throw new Error(result.message || 'API返回失败');
        
        const products = (result.data || []).filter(s => s.type === 'product');
        const select = document.getElementById('inventoryInProduct');
        if (select) {
            select.innerHTML = '<option value="">请选择商品</option>' +
                products.map(p => `<option value="${p.id}" data-stock="${p.stock || 0}">${p.name} (成本价: ¥${p.cost_price || 0})</option>`).join('');
        }
    } catch (error) {
        console.error('加载商品失败:', error);
    }
}

// 更新采购入库当前库存显示
function updateInventoryInCurrentStock() {
    const select = document.getElementById('inventoryInProduct');
    const option = select.options[select.selectedIndex];
    const stock = option ? (option.getAttribute('data-stock') || 0) : 0;
    document.getElementById('inventoryInCurrentStock').value = stock;
}

// 计算采购入库总金额
function calculateInventoryInTotal() {
    const quantity = parseFloat(document.getElementById('inventoryInQuantity').value) || 0;
    const unitPrice = parseFloat(document.getElementById('inventoryInUnitPrice').value) || 0;
    const total = quantity * unitPrice;
    document.getElementById('inventoryInTotalAmount').value = total.toFixed(2);
}

// 关闭采购入库模态框
function closeInventoryInModal() {
    document.getElementById('inventoryInModal')?.classList.add('hidden');
}

// 保存采购入库
async function saveInventoryIn(event) {
    event.preventDefault();
    
    const materialId = parseInt(document.getElementById('inventoryInProduct').value);
    const quantity = parseInt(document.getElementById('inventoryInQuantity').value);
    const unitPrice = parseFloat(document.getElementById('inventoryInUnitPrice').value) || 0;
    const totalAmount = parseFloat(document.getElementById('inventoryInTotalAmount').value) || 0;
    const remark = document.getElementById('inventoryInRemark').value;
    
    try {
        const result = await window.api.inventoryIn({
            material_id: materialId,
            quantity: quantity,
            unit_price: unitPrice,
            total_amount: totalAmount,
            related_type: '采购',
            remark: remark
        });
        
        if (!result.success) throw new Error(result.message || 'API返回失败');
        
        closeInventoryInModal();
        await renderInventoryList();
        await renderInventoryLogs();
        await updateInventoryStats();
        if (window.showNotification) {
            window.showNotification(`采购入库成功，当前库存：${result.stock_after}`, 'success');
        }
    } catch (error) {
        window.Utils.handleApiError(error, '采购入库');
    }
}

// ==================== P4-3: 任务出库UI ====================

// 打开任务出库模态框
function openInventoryOutModal() {
    const modal = document.getElementById('inventoryOutModal');
    if (!modal) {
        createInventoryOutModal();
    }
    
    // 重置表单
    document.getElementById('inventoryOutForm').reset();
    document.getElementById('inventoryOutDate').value = new Date().toISOString().split('T')[0];
    
    // 加载商品列表
    loadInventoryOutProducts();
    
    document.getElementById('inventoryOutModal').classList.remove('hidden');
}

// 创建任务出库模态框
function createInventoryOutModal() {
    const modalHtml = `
        <div id="inventoryOutModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full hidden" style="z-index: 9999 !important;">
            <div class="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white mt-10">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-900">任务出库</h3>
                    <button onclick="closeInventoryOutModal()" class="text-gray-400 hover:text-gray-500">
                        <span class="text-2xl">&times;</span>
                    </button>
                </div>
                <form id="inventoryOutForm" onsubmit="saveInventoryOut(event)">
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">出库日期 *</label>
                                <input type="date" id="inventoryOutDate" required class="w-full px-3 py-2 border rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">关联任务ID</label>
                                <input type="number" id="inventoryOutTaskId" class="w-full px-3 py-2 border rounded-lg" placeholder="可选">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">商品 *</label>
                            <select id="inventoryOutProduct" required class="w-full px-3 py-2 border rounded-lg" onchange="updateInventoryOutCurrentStock()">
                                <option value="">请选择商品</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">当前库存</label>
                            <input type="text" id="inventoryOutCurrentStock" readonly class="w-full px-3 py-2 border rounded-lg bg-gray-50">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">出库数量 *</label>
                            <input type="number" id="inventoryOutQuantity" required min="1" class="w-full px-3 py-2 border rounded-lg" placeholder="0">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">出库原因</label>
                            <input type="text" id="inventoryOutRemark" class="w-full px-3 py-2 border rounded-lg" placeholder="如：订单XX任务使用">
                        </div>
                    </div>
                    <div class="flex justify-end space-x-3 mt-6">
                        <button type="button" onclick="closeInventoryOutModal()" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
                        <button type="submit" class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">确认出库</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 加载任务出库商品列表
async function loadInventoryOutProducts() {
    try {
        const result = await window.api.getServices();
        if (!result.success) throw new Error(result.message || 'API返回失败');
        
        const products = (result.data || []).filter(s => s.type === 'product');
        const select = document.getElementById('inventoryOutProduct');
        if (select) {
            select.innerHTML = '<option value="">请选择商品</option>' +
                products.map(p => `<option value="${p.id}" data-stock="${p.stock || 0}">${p.name} (库存: ${p.stock || 0})</option>`).join('');
        }
    } catch (error) {
        console.error('加载商品失败:', error);
    }
}

// 更新任务出库当前库存显示
function updateInventoryOutCurrentStock() {
    const select = document.getElementById('inventoryOutProduct');
    const option = select.options[select.selectedIndex];
    const stock = option ? (option.getAttribute('data-stock') || 0) : 0;
    document.getElementById('inventoryOutCurrentStock').value = stock;
}

// 关闭任务出库模态框
function closeInventoryOutModal() {
    document.getElementById('inventoryOutModal')?.classList.add('hidden');
}

// 保存任务出库
async function saveInventoryOut(event) {
    event.preventDefault();
    
    const materialId = parseInt(document.getElementById('inventoryOutProduct').value);
    const quantity = parseInt(document.getElementById('inventoryOutQuantity').value);
    const taskId = document.getElementById('inventoryOutTaskId').value;
    const remark = document.getElementById('inventoryOutRemark').value;
    
    try {
        const result = await window.api.inventoryOut({
            material_id: materialId,
            quantity: quantity,
            related_type: '任务',
            related_id: taskId || null,
            remark: remark
        });
        
        if (!result.success) throw new Error(result.message || 'API返回失败');
        
        closeInventoryOutModal();
        await renderInventoryList();
        await renderInventoryLogs();
        await updateInventoryStats();
        if (window.showNotification) {
            window.showNotification(`任务出库成功，当前库存：${result.stock_after}`, 'success');
        }
    } catch (error) {
        window.Utils.handleApiError(error, '任务出库');
    }
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
    window.warehousePurchaseItem = warehousePurchaseItem;  // 采购单入库
    window.viewPurchaseDetail = viewPurchaseDetail;        // 查看采购单详情
    // window.editPurchase = editPurchase; // TODO: 该函数尚未实现
    // window.deletePurchaseItem = deletePurchaseItem; // 已废弃：函数未实现
    // window.updatePurchaseItemSubtotal = updatePurchaseItemSubtotal; // 已废弃：函数未实现
    
    // 库存管理
    window.initInventoryPage = initInventoryPage;
    window.openAdjustInventoryModal = openAdjustInventoryModal;
    window.closeAdjustInventoryModal = closeAdjustInventoryModal;
    window.saveAdjustInventory = saveAdjustInventory;
    window.loadCurrentStock = loadCurrentStock;
    
    // P4-3: 采购入库
    window.openInventoryInModal = openInventoryInModal;
    window.closeInventoryInModal = closeInventoryInModal;
    window.saveInventoryIn = saveInventoryIn;
    
    // P4-3: 任务出库
    window.openInventoryOutModal = openInventoryOutModal;
    window.closeInventoryOutModal = closeInventoryOutModal;
    window.saveInventoryOut = saveInventoryOut;
    
    // 库存单据管理 (新增)
    window.initStockDocumentsPage = initStockDocumentsPage;
    window.openStockDocumentModal = openStockDocumentModal;
    window.closeStockDocumentModal = closeStockDocumentModal;
    window.saveStockDocument = saveStockDocument;
    window.confirmStockDocument = confirmStockDocument;
    window.cancelStockDocument = cancelStockDocument;
    window.loadStockWarnings = loadStockWarnings;
}

// ==================== 库存单据管理（新增） ====================

let allStockDocuments = [];
let allProductsForStock = [];

// 初始化库存单据页面
async function initStockDocumentsPage() {
    console.log('✅ 初始化库存单据管理页面');
    await renderStockDocumentsList();
    await loadStockWarnings();
}

// 渲染库存单据列表
async function renderStockDocumentsList(docType = '') {
    try {
        const params = new URLSearchParams();
        if (docType) params.append('doc_type', docType);
        
        const res = await fetch(`/api/stock/documents?${params}`, { credentials: 'include' });
        const result = await res.json();
        
        if (!result.success) {
            console.error('加载库存单据失败:', result.message);
            return;
        }
        
        allStockDocuments = result.data || [];
        
        const tbody = document.getElementById('stockDocumentsTableBody');
        if (!tbody) return;
        
        if (allStockDocuments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-gray-500">暂无库存单据数据</td></tr>`;
            return;
        }
        
        tbody.innerHTML = allStockDocuments.map(doc => {
            const typeLabels = {
                'in': '<span class="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">入库</span>',
                'out': '<span class="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs">出库</span>',
                'check': '<span class="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">盘点</span>',
                'loss': '<span class="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs">报损</span>'
            };
            
            const statusLabels = {
                'draft': '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">草稿</span>',
                'confirmed': '<span class="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">已确认</span>',
                'cancelled': '<span class="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs">已取消</span>'
            };
            
            const actions = doc.status === 'draft' ? `
                <button onclick="confirmStockDocument(${doc.id})" class="text-green-600 hover:text-green-800 mr-2" title="确认">
                    <i class="fas fa-check"></i>
                </button>
                <button onclick="cancelStockDocument(${doc.id})" class="text-red-600 hover:text-red-800" title="取消">
                    <i class="fas fa-times"></i>
                </button>
            ` : '';
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-sm font-mono text-blue-600">${doc.doc_number}</td>
                    <td class="px-4 py-3">${typeLabels[doc.doc_type] || doc.doc_type}</td>
                    <td class="px-4 py-3">
                        <div class="font-medium text-gray-900">${doc.product_name || '-'}</div>
                        <div class="text-xs text-gray-500">${doc.product_code || ''}</div>
                    </td>
                    <td class="px-4 py-3 text-center">${doc.quantity}</td>
                    <td class="px-4 py-3 text-center">${doc.before_stock || 0}</td>
                    <td class="px-4 py-3 text-center ${doc.status === 'confirmed' ? 'font-bold text-green-600' : ''}">${doc.after_stock || '-'}</td>
                    <td class="px-4 py-3 text-right text-sm">¥${parseFloat(doc.total_amount || 0).toFixed(2)}</td>
                    <td class="px-4 py-3">${statusLabels[doc.status] || doc.status}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">${doc.operator_name || '-'}</td>
                    <td class="px-4 py-3 text-center">${actions}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('渲染库存单据列表失败:', error);
    }
}

// 打开库存单据模态框
async function openStockDocumentModal(docType = 'in') {
    // 加载商品列表
    try {
        const res = await fetch('/api/services', { credentials: 'include' });
        const result = await res.json();
        if (result.success) {
            allProductsForStock = (result.data || []).filter(s => s.item_type === 'product');
        }
    } catch (error) {
        console.error('加载商品列表失败:', error);
    }
    
    // 创建模态框
    let modal = document.getElementById('stockDocumentModal');
    if (!modal) {
        createStockDocumentModal();
        modal = document.getElementById('stockDocumentModal');
    }
    
    // 设置单据类型
    document.getElementById('sdDocType').value = docType;
    
    // 更新标题
    const titles = {
        'in': '新增入库单',
        'out': '新增出库单',
        'check': '新增盘点单',
        'loss': '新增报损单'
    };
    document.getElementById('sdModalTitle').textContent = titles[docType] || '新增库存单据';
    
    // 填充商品下拉框
    const productSelect = document.getElementById('sdProductId');
    if (productSelect) {
        productSelect.innerHTML = '<option value="">选择商品...</option>' +
            allProductsForStock.map(p => `<option value="${p.id}" data-stock="${p.stock || 0}">${p.name} (库存:${p.stock || 0})</option>`).join('');
    }
    
    // 重置表单
    document.getElementById('stockDocumentForm').reset();
    document.getElementById('sdDocType').value = docType;
    document.getElementById('sdCurrentStock').textContent = '-';
    
    modal.classList.remove('hidden');
}

// 创建库存单据模态框
function createStockDocumentModal() {
    const modal = document.createElement('div');
    modal.id = 'stockDocumentModal';
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 hidden flex items-center justify-center z-50';
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div class="flex justify-between items-center px-6 py-4 border-b">
                <h3 id="sdModalTitle" class="text-lg font-bold text-gray-900">新增库存单据</h3>
                <button onclick="closeStockDocumentModal()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <form id="stockDocumentForm" class="p-6 space-y-4">
                <input type="hidden" id="sdDocType" value="in">
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">商品 <span class="text-red-500">*</span></label>
                    <select id="sdProductId" required class="w-full px-3 py-2 border border-gray-300 rounded-md" onchange="onStockProductChange()">
                        <option value="">选择商品...</option>
                    </select>
                    <div class="mt-1 text-sm text-gray-500">当前库存: <span id="sdCurrentStock">-</span></div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">数量 <span class="text-red-500">*</span></label>
                        <input type="number" id="sdQuantity" required min="1" class="w-full px-3 py-2 border border-gray-300 rounded-md" value="1">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">单价</label>
                        <input type="number" id="sdUnitPrice" step="0.01" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md" value="0">
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">原因/备注</label>
                    <textarea id="sdReason" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="填写库存变动原因..."></textarea>
                </div>
            </form>
            <div class="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                <button type="button" onclick="closeStockDocumentModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">取消</button>
                <button type="button" onclick="saveStockDocument()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    <i class="fas fa-save mr-2"></i>保存草稿
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 关闭库存单据模态框
function closeStockDocumentModal() {
    const modal = document.getElementById('stockDocumentModal');
    if (modal) modal.classList.add('hidden');
}

// 商品选择变化时更新当前库存
window.onStockProductChange = function() {
    const select = document.getElementById('sdProductId');
    const option = select.options[select.selectedIndex];
    const stock = option?.dataset?.stock || '-';
    document.getElementById('sdCurrentStock').textContent = stock;
};

// 保存库存单据
async function saveStockDocument() {
    const docType = document.getElementById('sdDocType').value;
    const productId = document.getElementById('sdProductId').value;
    const quantity = parseInt(document.getElementById('sdQuantity').value) || 0;
    const unitPrice = parseFloat(document.getElementById('sdUnitPrice').value) || 0;
    const reason = document.getElementById('sdReason').value;
    
    if (!productId) {
        window.showNotification && window.showNotification('请选择商品', 'error');
        return;
    }
    if (quantity <= 0) {
        window.showNotification && window.showNotification('数量必须大于0', 'error');
        return;
    }
    
    try {
        const res = await fetch('/api/stock/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                doc_type: docType,
                product_id: productId,
                quantity: quantity,
                unit_price: unitPrice,
                reason: reason
            }),
            credentials: 'include'
        });
        
        const result = await res.json();
        
        if (result.success) {
            window.showNotification && window.showNotification('单据创建成功: ' + result.doc_number, 'success');
            closeStockDocumentModal();
            renderStockDocumentsList();
        } else {
            window.showNotification && window.showNotification('创建失败: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('保存库存单据失败:', error);
        window.showNotification && window.showNotification('保存失败', 'error');
    }
}

// 确认库存单据
async function confirmStockDocument(docId, forceFlag = false) {
    if (!forceFlag && !confirm('确认此单据将立即更新库存，确定要执行吗？')) return;
    
    try {
        const res = await fetch(`/api/stock/documents/${docId}/confirm`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ force: forceFlag })
        });
        
        const result = await res.json();
        
        if (result.success) {
            window.showNotification && window.showNotification('单据已确认，库存已更新', 'success');
            renderStockDocumentsList();
            loadStockWarnings();
        } else {
            // 【P1-5修复】库存不足时弹出强制确认
            if (result.insufficient_stock) {
                const forceConfirm = confirm(
                    `库存不足（当前库存：${result.current_stock}），是否强制出库？\n\n强制出库后库存可能为负数。`
                );
                if (forceConfirm) {
                    // 递归调用，传入force=true
                    await confirmStockDocument(docId, true);
                }
            } else {
                window.showNotification && window.showNotification('确认失败: ' + result.message, 'error');
            }
        }
    } catch (error) {
        console.error('确认库存单据失败:', error);
        window.showNotification && window.showNotification('确认失败', 'error');
    }
}

// 取消库存单据
async function cancelStockDocument(docId) {
    if (!confirm('确定要取消此单据吗？')) return;
    
    try {
        const res = await fetch(`/api/stock/documents/${docId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await res.json();
        
        if (result.success) {
            window.showNotification && window.showNotification('单据已取消', 'success');
            renderStockDocumentsList();
        } else {
            window.showNotification && window.showNotification('取消失败: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('取消库存单据失败:', error);
        window.showNotification && window.showNotification('取消失败', 'error');
    }
}

// 加载库存预警
async function loadStockWarnings() {
    try {
        const res = await fetch('/api/stock/warnings', { credentials: 'include' });
        const result = await res.json();
        
        const container = document.getElementById('stockWarningsContainer');
        if (!container) return;
        
        if (!result.success || !result.data || result.data.length === 0) {
            container.innerHTML = `<div class="text-gray-500 text-sm text-center py-4">
                <i class="fas fa-check-circle text-green-500 text-2xl mb-2"></i>
                <p>暂无库存预警</p>
            </div>`;
            return;
        }
        
        container.innerHTML = result.data.map(p => `
            <div class="flex items-center justify-between p-3 bg-red-50 rounded-lg mb-2">
                <div>
                    <div class="font-medium text-red-800">${p.name}</div>
                    <div class="text-xs text-red-600">${p.code || ''}</div>
                </div>
                <div class="text-right">
                    <div class="text-red-600 font-bold">${p.stock} / ${p.min_stock}</div>
                    <div class="text-xs text-red-500">当前/预警值</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载库存预警失败:', error);
    }
}

// 筛选库存单据
window.filterStockDocuments = function(docType) {
    renderStockDocumentsList(docType);
};

// 刷新库存单据列表
window.refreshStockDocuments = function() {
    renderStockDocumentsList();
    loadStockWarnings();
    window.showNotification && window.showNotification('列表已刷新', 'success');
};
