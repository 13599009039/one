/**
 * 批量订单登记模块
 * 版本: 1.0.0
 */

// 缓存数据
let batchOrderCustomers = [];
let batchOrderProducts = [];
let batchOrderServices = [];
let batchOrderTeams = [];
let batchOrderUsers = [];
let batchOrderProjects = [];
let batchOrderRows = [];
let batchOrderRowId = 0;

// ========== 模态框操作 ==========

window.openBatchOrderModal = async function() {
    const modal = document.getElementById('batchOrderModal');
    if (!modal) return;
    
    // 加载基础数据
    await loadBatchOrderBaseData();
    
    // 检查是否有草稿
    const hasDraft = await checkBatchOrderDraft();
    if (hasDraft) {
        if (confirm('检测到未完成的批量登记草稿，是否加载继续编辑？')) {
            await loadBatchOrderDraft();
        } else {
            initEmptyBatchOrderTable();
        }
    } else {
        initEmptyBatchOrderTable();
    }
    
    modal.classList.remove('hidden');
};

window.closeBatchOrderModal = function() {
    const modal = document.getElementById('batchOrderModal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

// ========== 基础数据加载 ==========

async function loadBatchOrderBaseData() {
    try {
        // 并行加载所有基础数据
        const [customersRes, productsRes, servicesRes, teamsRes, usersRes, projectsRes] = await Promise.all([
            fetch('/api/customers', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/products', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/services', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/teams', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/users', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/projects', { credentials: 'include' }).then(r => r.json())
        ]);
        
        batchOrderCustomers = customersRes.success ? customersRes.data : [];
        batchOrderProducts = productsRes.success ? productsRes.data : [];
        batchOrderServices = servicesRes.success ? servicesRes.data : [];
        batchOrderTeams = teamsRes.success ? teamsRes.data : [];
        batchOrderUsers = usersRes.success ? usersRes.data.filter(u => u.status === 'enabled') : [];
        batchOrderProjects = projectsRes.success ? projectsRes.data : [];
    } catch (error) {
        console.error('加载批量订单基础数据失败:', error);
    }
}

// ========== 表格行操作 ==========

function initEmptyBatchOrderTable() {
    batchOrderRows = [];
    batchOrderRowId = 0;
    renderBatchOrderTable();
    // 默认添加3行空行
    for (let i = 0; i < 3; i++) {
        addBatchOrderRow();
    }
}

window.addBatchOrderRow = function(data = {}) {
    const today = new Date().toISOString().split('T')[0];
    batchOrderRowId++;
    const row = {
        id: batchOrderRowId,
        customer_name: data.customer_name || '',
        customer_id: data.customer_id || null,
        order_date: data.order_date || today,
        product_name: data.product_name || '',
        product_id: data.product_id || null,
        quantity: data.quantity || 1,
        unit_price: data.unit_price || 0,
        final_amount: data.final_amount || 0,
        team: data.team || '',
        team_id: data.team_id || null,
        business_staff: data.business_staff || '',
        business_staff_id: data.business_staff_id || null,
        project: data.project || '',
        project_id: data.project_id || null,
        remark: data.remark || '',
        isValid: true,
        errors: {}
    };
    batchOrderRows.push(row);
    renderBatchOrderTable();
    updateBatchOrderRowCount();
};

window.removeBatchOrderRow = function(rowId) {
    batchOrderRows = batchOrderRows.filter(r => r.id !== rowId);
    renderBatchOrderTable();
    updateBatchOrderRowCount();
};

window.clearAllBatchOrderRows = function() {
    if (confirm('确定要清空所有订单数据吗？')) {
        batchOrderRows = [];
        batchOrderRowId = 0;
        renderBatchOrderTable();
        updateBatchOrderRowCount();
        // 添加3行空行
        for (let i = 0; i < 3; i++) {
            addBatchOrderRow();
        }
    }
};

function updateBatchOrderRowCount() {
    const countEl = document.getElementById('batchOrderRowCount');
    if (countEl) {
        countEl.textContent = batchOrderRows.length;
    }
}

// ========== 表格渲染 ==========

function renderBatchOrderTable() {
    const tbody = document.getElementById('batchOrderTableBody');
    if (!tbody) return;
    
    if (batchOrderRows.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-3xl mb-2"></i>
                    <p>暂无订单数据，点击"新增行"开始录入</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = batchOrderRows.map((row, index) => `
        <tr class="border-b hover:bg-gray-50 ${row.isValid ? '' : 'bg-red-50'}" data-row-id="${row.id}">
            <td class="px-2 py-2 text-center text-gray-500">${index + 1}</td>
            <td class="px-2 py-2">
                <input type="text" 
                    class="w-full border ${row.errors.customer_name ? 'border-red-500' : 'border-gray-300'} rounded px-2 py-1 text-sm batch-customer-input"
                    value="${escapeHtml(row.customer_name)}"
                    placeholder="输入客户名称"
                    data-row-id="${row.id}"
                    data-field="customer_name"
                    onchange="updateBatchOrderField(${row.id}, 'customer_name', this.value)"
                    onfocus="showBatchCustomerDropdown(this, ${row.id})"
                    autocomplete="off">
                <div class="batch-customer-dropdown hidden absolute z-50 bg-white border rounded shadow-lg max-h-48 overflow-auto"></div>
            </td>
            <td class="px-2 py-2">
                <input type="date" 
                    class="w-full border ${row.errors.order_date ? 'border-red-500' : 'border-gray-300'} rounded px-2 py-1 text-sm"
                    value="${row.order_date}"
                    data-row-id="${row.id}"
                    onchange="updateBatchOrderField(${row.id}, 'order_date', this.value)">
            </td>
            <td class="px-2 py-2">
                <input type="text" 
                    class="w-full border ${row.errors.product_name ? 'border-red-500' : 'border-gray-300'} rounded px-2 py-1 text-sm batch-product-input"
                    value="${escapeHtml(row.product_name)}"
                    placeholder="输入商品/服务"
                    data-row-id="${row.id}"
                    data-field="product_name"
                    onchange="updateBatchOrderField(${row.id}, 'product_name', this.value)"
                    onfocus="showBatchProductDropdown(this, ${row.id})"
                    autocomplete="off">
            </td>
            <td class="px-2 py-2">
                <input type="number" 
                    class="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
                    value="${row.quantity}"
                    min="1"
                    data-row-id="${row.id}"
                    onchange="updateBatchOrderField(${row.id}, 'quantity', this.value); calculateBatchRowAmount(${row.id})">
            </td>
            <td class="px-2 py-2">
                <input type="number" 
                    class="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
                    value="${row.unit_price}"
                    step="0.01"
                    data-row-id="${row.id}"
                    onchange="updateBatchOrderField(${row.id}, 'unit_price', this.value); calculateBatchRowAmount(${row.id})">
            </td>
            <td class="px-2 py-2">
                <input type="number" 
                    class="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right font-medium"
                    value="${row.final_amount}"
                    step="0.01"
                    data-row-id="${row.id}"
                    onchange="updateBatchOrderField(${row.id}, 'final_amount', this.value)">
            </td>
            <td class="px-2 py-2">
                <select class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    data-row-id="${row.id}"
                    onchange="updateBatchOrderTeam(${row.id}, this.value)">
                    <option value="">选择团队</option>
                    ${batchOrderTeams.map(t => `<option value="${t.id}" ${row.team_id == t.id ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}
                </select>
            </td>
            <td class="px-2 py-2">
                <select class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    data-row-id="${row.id}"
                    onchange="updateBatchOrderStaff(${row.id}, this.value)">
                    <option value="">选择人员</option>
                    ${batchOrderUsers.map(u => `<option value="${u.id}" ${row.business_staff_id == u.id ? 'selected' : ''}>${escapeHtml(u.name)}</option>`).join('')}
                </select>
            </td>
            <td class="px-2 py-2">
                <select class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    data-row-id="${row.id}"
                    onchange="updateBatchOrderProject(${row.id}, this.value)">
                    <option value="">选择项目</option>
                    ${batchOrderProjects.map(p => `<option value="${p.id}" ${row.project_id == p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
                </select>
            </td>
            <td class="px-2 py-2">
                <input type="text" 
                    class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    value="${escapeHtml(row.remark)}"
                    placeholder="备注"
                    data-row-id="${row.id}"
                    onchange="updateBatchOrderField(${row.id}, 'remark', this.value)">
            </td>
            <td class="px-2 py-2 text-center">
                <button onclick="removeBatchOrderRow(${row.id})" class="text-red-500 hover:text-red-700">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ========== 字段更新 ==========

window.updateBatchOrderField = function(rowId, field, value) {
    const row = batchOrderRows.find(r => r.id === rowId);
    if (row) {
        row[field] = value;
    }
};

window.updateBatchOrderTeam = function(rowId, teamId) {
    const row = batchOrderRows.find(r => r.id === rowId);
    if (row) {
        const team = batchOrderTeams.find(t => t.id == teamId);
        row.team_id = teamId ? parseInt(teamId) : null;
        row.team = team ? team.name : '';
    }
};

window.updateBatchOrderStaff = function(rowId, staffId) {
    const row = batchOrderRows.find(r => r.id === rowId);
    if (row) {
        const staff = batchOrderUsers.find(u => u.id == staffId);
        row.business_staff_id = staffId ? parseInt(staffId) : null;
        row.business_staff = staff ? staff.name : '';
    }
};

window.updateBatchOrderProject = function(rowId, projectId) {
    const row = batchOrderRows.find(r => r.id === rowId);
    if (row) {
        const project = batchOrderProjects.find(p => p.id == projectId);
        row.project_id = projectId ? parseInt(projectId) : null;
        row.project = project ? project.name : '';
    }
};

window.calculateBatchRowAmount = function(rowId) {
    const row = batchOrderRows.find(r => r.id === rowId);
    if (row) {
        row.final_amount = (parseFloat(row.quantity) || 0) * (parseFloat(row.unit_price) || 0);
        // 更新输入框显示
        const amountInput = document.querySelector(`input[data-row-id="${rowId}"][onchange*="final_amount"]`);
        if (amountInput) {
            amountInput.value = row.final_amount.toFixed(2);
        }
    }
};

// ========== 客户搜索下拉 ==========

window.showBatchCustomerDropdown = function(input, rowId) {
    const value = input.value.trim().toLowerCase();
    const filtered = batchOrderCustomers.filter(c => 
        c.shop_name && c.shop_name.toLowerCase().includes(value)
    ).slice(0, 10);
    
    // 创建下拉框
    let dropdown = input.nextElementSibling;
    if (!dropdown || !dropdown.classList.contains('batch-customer-dropdown')) {
        dropdown = document.createElement('div');
        dropdown.className = 'batch-customer-dropdown absolute z-50 bg-white border rounded shadow-lg max-h-48 overflow-auto';
        input.parentNode.style.position = 'relative';
        input.parentNode.appendChild(dropdown);
    }
    
    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="px-3 py-2 text-gray-500 text-sm">无匹配客户</div>';
    } else {
        dropdown.innerHTML = filtered.map(c => `
            <div class="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                onclick="selectBatchCustomer(${rowId}, ${c.id}, '${escapeHtml(c.shop_name)}')">
                ${escapeHtml(c.shop_name)}
            </div>
        `).join('');
    }
    dropdown.classList.remove('hidden');
    
    // 点击外部关闭
    setTimeout(() => {
        document.addEventListener('click', function hideDropdown(e) {
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', hideDropdown);
            }
        });
    }, 100);
};

window.selectBatchCustomer = function(rowId, customerId, customerName) {
    const row = batchOrderRows.find(r => r.id === rowId);
    if (row) {
        row.customer_id = customerId;
        row.customer_name = customerName;
        // 更新输入框
        const input = document.querySelector(`input.batch-customer-input[data-row-id="${rowId}"]`);
        if (input) {
            input.value = customerName;
            const dropdown = input.nextElementSibling;
            if (dropdown) dropdown.classList.add('hidden');
        }
    }
};

// ========== 商品搜索下拉 ==========

window.showBatchProductDropdown = function(input, rowId) {
    const value = input.value.trim().toLowerCase();
    const allItems = [
        ...batchOrderProducts.map(p => ({ ...p, type: 'product', displayName: p.name })),
        ...batchOrderServices.map(s => ({ ...s, type: 'service', displayName: s.name }))
    ];
    const filtered = allItems.filter(item => 
        item.displayName && item.displayName.toLowerCase().includes(value)
    ).slice(0, 10);
    
    let dropdown = input.nextElementSibling;
    if (!dropdown || !dropdown.classList.contains('batch-product-dropdown')) {
        dropdown = document.createElement('div');
        dropdown.className = 'batch-product-dropdown absolute z-50 bg-white border rounded shadow-lg max-h-48 overflow-auto';
        input.parentNode.style.position = 'relative';
        input.parentNode.appendChild(dropdown);
    }
    
    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="px-3 py-2 text-gray-500 text-sm">无匹配商品/服务</div>';
    } else {
        dropdown.innerHTML = filtered.map(item => `
            <div class="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm flex justify-between"
                onclick="selectBatchProduct(${rowId}, ${item.id}, '${escapeHtml(item.displayName)}', '${item.type}', ${item.base_price || item.price || 0})">
                <span>${escapeHtml(item.displayName)}</span>
                <span class="text-gray-500">¥${item.base_price || item.price || 0}</span>
            </div>
        `).join('');
    }
    dropdown.classList.remove('hidden');
    
    setTimeout(() => {
        document.addEventListener('click', function hideDropdown(e) {
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', hideDropdown);
            }
        });
    }, 100);
};

window.selectBatchProduct = function(rowId, productId, productName, type, price) {
    const row = batchOrderRows.find(r => r.id === rowId);
    if (row) {
        row.product_id = productId;
        row.product_name = productName;
        row.product_type = type;
        row.unit_price = price;
        row.final_amount = row.quantity * price;
        
        // 更新输入框
        const input = document.querySelector(`input.batch-product-input[data-row-id="${rowId}"]`);
        if (input) {
            input.value = productName;
            const dropdown = input.nextElementSibling;
            if (dropdown) dropdown.classList.add('hidden');
        }
        
        // 更新单价和金额
        renderBatchOrderTable();
    }
};

// ========== 草稿操作 ==========

async function checkBatchOrderDraft() {
    try {
        const res = await fetch('/api/orders/batch/draft', { credentials: 'include' });
        const result = await res.json();
        return result.success && result.data;
    } catch (error) {
        console.error('检查草稿失败:', error);
        return false;
    }
}

async function loadBatchOrderDraft() {
    try {
        const res = await fetch('/api/orders/batch/draft', { credentials: 'include' });
        const result = await res.json();
        if (result.success && result.data && result.data.draft_data) {
            const draftData = typeof result.data.draft_data === 'string' 
                ? JSON.parse(result.data.draft_data) 
                : result.data.draft_data;
            
            batchOrderRows = [];
            batchOrderRowId = 0;
            draftData.forEach(row => {
                addBatchOrderRow(row);
            });
            
            // 显示草稿状态
            const statusEl = document.getElementById('batchOrderDraftStatus');
            if (statusEl) {
                statusEl.textContent = `草稿已加载（保存于 ${result.data.updated_at}）`;
            }
            
            showNotification('草稿已加载', 'success');
        }
    } catch (error) {
        console.error('加载草稿失败:', error);
        showNotification('加载草稿失败', 'error');
    }
}

window.saveBatchOrderDraft = async function() {
    try {
        const draftData = batchOrderRows.map(row => ({
            customer_name: row.customer_name,
            customer_id: row.customer_id,
            order_date: row.order_date,
            product_name: row.product_name,
            product_id: row.product_id,
            product_type: row.product_type,
            quantity: row.quantity,
            unit_price: row.unit_price,
            final_amount: row.final_amount,
            team: row.team,
            team_id: row.team_id,
            business_staff: row.business_staff,
            business_staff_id: row.business_staff_id,
            project: row.project,
            project_id: row.project_id,
            remark: row.remark
        }));
        
        const res = await fetch('/api/orders/batch/draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ draft_data: draftData })
        });
        const result = await res.json();
        
        if (result.success) {
            const statusEl = document.getElementById('batchOrderDraftStatus');
            if (statusEl) {
                statusEl.textContent = '草稿已保存';
            }
            showNotification('草稿已保存', 'success');
        } else {
            showNotification('保存草稿失败: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('保存草稿失败:', error);
        showNotification('保存草稿失败', 'error');
    }
};

window.deleteBatchOrderDraft = async function() {
    if (!confirm('确定要删除草稿吗？此操作不可恢复。')) return;
    
    try {
        const res = await fetch('/api/orders/batch/draft', {
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await res.json();
        
        if (result.success) {
            const statusEl = document.getElementById('batchOrderDraftStatus');
            if (statusEl) {
                statusEl.textContent = '';
            }
            showNotification('草稿已删除', 'success');
        } else {
            showNotification('删除草稿失败: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('删除草稿失败:', error);
        showNotification('删除草稿失败', 'error');
    }
};

// ========== 校验和提交 ==========

window.previewBatchOrders = async function() {
    // 先校验数据
    const validRows = [];
    const invalidRows = [];
    const customerNames = [];
    
    batchOrderRows.forEach((row, index) => {
        row.errors = {};
        row.isValid = true;
        
        // 校验必填项
        if (!row.customer_name.trim()) {
            row.errors.customer_name = '客户名称必填';
            row.isValid = false;
        } else {
            customerNames.push(row.customer_name.trim());
        }
        
        if (!row.order_date) {
            row.errors.order_date = '下单日期必填';
            row.isValid = false;
        }
        
        if (!row.product_name.trim()) {
            row.errors.product_name = '商品/服务必填';
            row.isValid = false;
        }
        
        if (row.isValid) {
            validRows.push({ ...row, index });
        } else {
            invalidRows.push({ ...row, index });
        }
    });
    
    // 重新渲染表格显示错误
    renderBatchOrderTable();
    
    if (invalidRows.length > 0) {
        showNotification(`有 ${invalidRows.length} 条订单校验不通过，请检查标红行`, 'error');
        return;
    }
    
    // 校验客户是否存在
    try {
        const uniqueNames = [...new Set(customerNames)];
        const res = await fetch('/api/orders/batch/validate-customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ customer_names: uniqueNames })
        });
        const result = await res.json();
        
        if (result.success && result.data.missing.length > 0) {
            // 显示不存在的客户提示
            showMissingCustomersAlert(result.data.missing, result.data.existing);
            return;
        }
        
        // 更新客户ID
        validRows.forEach(row => {
            if (result.data.existing[row.customer_name]) {
                row.customer_id = result.data.existing[row.customer_name];
            }
        });
        
    } catch (error) {
        console.error('校验客户失败:', error);
    }
    
    // 显示预览
    showBatchOrderPreview(validRows);
};

function showMissingCustomersAlert(missing, existing) {
    const container = document.getElementById('batchOrderMissingCustomers');
    const list = document.getElementById('missingCustomersList');
    if (!container || !list) return;
    
    list.innerHTML = missing.map(name => `
        <label class="flex items-center space-x-2 text-sm">
            <input type="checkbox" class="missing-customer-checkbox" value="${escapeHtml(name)}" checked>
            <span class="text-yellow-800">${escapeHtml(name)}</span>
        </label>
    `).join('');
    
    container.classList.remove('hidden');
}

window.batchCreateMissingCustomers = async function() {
    const checkboxes = document.querySelectorAll('.missing-customer-checkbox:checked');
    const names = Array.from(checkboxes).map(cb => cb.value);
    
    if (names.length === 0) {
        showNotification('请选择要新建的客户', 'warning');
        return;
    }
    
    let created = 0;
    for (const name of names) {
        try {
            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ shop_name: name, customer_status: '合作中' })
            });
            const result = await res.json();
            if (result.success) {
                created++;
                // 更新表格中对应行的customer_id
                const newCustomerId = result.data.id;
                batchOrderRows.forEach(row => {
                    if (row.customer_name === name) {
                        row.customer_id = newCustomerId;
                    }
                });
                // 添加到客户列表缓存
                batchOrderCustomers.push({ id: newCustomerId, shop_name: name });
            }
        } catch (error) {
            console.error(`创建客户 ${name} 失败:`, error);
        }
    }
    
    showNotification(`成功新建 ${created} 个客户`, 'success');
    
    // 隐藏提示框
    const container = document.getElementById('batchOrderMissingCustomers');
    if (container) container.classList.add('hidden');
    
    // 重新预览
    previewBatchOrders();
};

function showBatchOrderPreview(rows) {
    const previewModal = document.getElementById('batchOrderPreviewModal');
    const content = document.getElementById('batchOrderPreviewContent');
    const countEl = document.getElementById('batchOrderPreviewCount');
    
    if (!previewModal || !content) return;
    
    content.innerHTML = `
        <table class="w-full text-sm border">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-3 py-2 text-left">#</th>
                    <th class="px-3 py-2 text-left">客户</th>
                    <th class="px-3 py-2 text-left">日期</th>
                    <th class="px-3 py-2 text-left">商品/服务</th>
                    <th class="px-3 py-2 text-right">数量</th>
                    <th class="px-3 py-2 text-right">金额</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map((row, idx) => `
                    <tr class="border-t">
                        <td class="px-3 py-2">${idx + 1}</td>
                        <td class="px-3 py-2">${escapeHtml(row.customer_name)}</td>
                        <td class="px-3 py-2">${row.order_date}</td>
                        <td class="px-3 py-2">${escapeHtml(row.product_name)}</td>
                        <td class="px-3 py-2 text-right">${row.quantity}</td>
                        <td class="px-3 py-2 text-right">¥${parseFloat(row.final_amount).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot class="bg-gray-50 font-medium">
                <tr>
                    <td colspan="5" class="px-3 py-2 text-right">合计金额：</td>
                    <td class="px-3 py-2 text-right text-blue-600">¥${rows.reduce((sum, r) => sum + parseFloat(r.final_amount || 0), 0).toFixed(2)}</td>
                </tr>
            </tfoot>
        </table>
    `;
    
    if (countEl) countEl.textContent = rows.length;
    
    // 保存待提交数据
    window._batchOrdersToSubmit = rows;
    
    previewModal.classList.remove('hidden');
}

window.closeBatchOrderPreview = function() {
    const modal = document.getElementById('batchOrderPreviewModal');
    if (modal) modal.classList.add('hidden');
};

window.confirmSubmitBatchOrders = async function() {
    const rows = window._batchOrdersToSubmit;
    if (!rows || rows.length === 0) {
        showNotification('没有待提交的订单', 'error');
        return;
    }
    
    const btn = document.getElementById('batchSubmitBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>提交中...';
    }
    
    try {
        // 转换数据格式
        const orders = rows.map(row => ({
            customer_id: row.customer_id,
            order_date: row.order_date,
            final_amount: row.final_amount,
            team: row.team,
            team_id: row.team_id,
            business_staff: row.business_staff,
            business_staff_id: row.business_staff_id,
            project: row.project,
            project_id: row.project_id,
            remark: row.remark,
            items: [{
                type: row.product_type || 'product',
                product_id: row.product_type === 'product' ? row.product_id : null,
                service_id: row.product_type === 'service' ? row.product_id : null,
                name: row.product_name,
                quantity: row.quantity,
                unit_price: row.unit_price,
                amount: row.final_amount
            }]
        }));
        
        const res = await fetch('/api/orders/batch/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ orders })
        });
        const result = await res.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            closeBatchOrderPreview();
            closeBatchOrderModal();
            
            // 刷新订单列表
            if (typeof loadOrdersList === 'function') {
                loadOrdersList();
            }
        } else {
            showNotification('提交失败: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('提交批量订单失败:', error);
        showNotification('提交失败', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check mr-1"></i>确认提交';
        }
    }
};

// ========== Excel导入/导出 ==========

window.downloadBatchOrderTemplate = function() {
    // 创建CSV模板
    const headers = ['客户名称', '下单日期', '商品/服务', '数量', '单价', '最终金额', '负责团队', '业务人员', '归属项目', '备注'];
    const example = ['示例客户', new Date().toISOString().split('T')[0], '示例商品', '1', '100', '100', '', '', '', ''];
    
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + example.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '订单批量登记模板.csv';
    link.click();
};

window.importBatchOrderExcel = function(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                showNotification('文件格式错误或无数据', 'error');
                return;
            }
            
            // 跳过标题行
            const dataLines = lines.slice(1);
            let imported = 0;
            
            dataLines.forEach(line => {
                const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                if (cols[0]) {
                    addBatchOrderRow({
                        customer_name: cols[0] || '',
                        order_date: cols[1] || new Date().toISOString().split('T')[0],
                        product_name: cols[2] || '',
                        quantity: parseFloat(cols[3]) || 1,
                        unit_price: parseFloat(cols[4]) || 0,
                        final_amount: parseFloat(cols[5]) || 0,
                        team: cols[6] || '',
                        business_staff: cols[7] || '',
                        project: cols[8] || '',
                        remark: cols[9] || ''
                    });
                    imported++;
                }
            });
            
            showNotification(`成功导入 ${imported} 条数据`, 'success');
        } catch (error) {
            console.error('导入失败:', error);
            showNotification('导入失败: ' + error.message, 'error');
        }
    };
    reader.readAsText(file, 'UTF-8');
    
    // 清空input以便重复选择同一文件
    input.value = '';
};

// ========== 工具函数 ==========

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}

console.log('✅ 批量订单登记模块已加载');
