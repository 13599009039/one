// 订单管理模块
function initOrdersPage() {
    console.log('初始化订单管理页面');
    loadOrdersData();
    
    // 绑定新增订单按钮
    const addOrderBtn = document.getElementById('addOrderBtn');
    if (addOrderBtn) {
        addOrderBtn.onclick = function() {
            openAddOrderModal();
        };
    }
    
    // 绑定表单提交
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.onsubmit = function(e) {
            e.preventDefault();
            saveNewOrder();
        };
    }
    
    // 绑定收款表单提交
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.onsubmit = function(e) {
            e.preventDefault();
            savePayment();
        };
    }
    
    // 绑定售后表单提交
    const afterSalesForm = document.getElementById('afterSalesForm');
    if (afterSalesForm) {
        afterSalesForm.onsubmit = function(e) {
            e.preventDefault();
            saveAfterSales();
        };
    }
}

function openAddOrderModal() {
    const modal = document.getElementById('addOrderModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        // 重置表单
        const form = document.getElementById('orderForm');
        if (form) form.reset();
        
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
        
        // 加载客户下拉
        loadCustomersToSelect();
        // 加载人员、团队、公司、项目下拉
        loadOrderFormSelects();
        
        // 设置默认日期
        document.getElementById('orderDate').value = new Date().toISOString().split('T')[0];
    }
}

// 存储附件数据
let orderAttachments = [];

// 重置商品/服务项列表
function resetOrderItemsList() {
    const tbody = document.getElementById('orderItemsList');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr class="order-item-row border-t border-gray-200">
            <td class="py-2">
                <select class="order-item-select w-full border border-gray-300 rounded py-1 px-2 text-sm" onchange="updateOrderItemPrice(this)">
                    <option value="">请选择...</option>
                </select>
            </td>
            <td class="py-2 order-item-type text-sm text-gray-500">-</td>
            <td class="py-2"><input type="number" step="0.01" class="order-item-price w-full border border-gray-300 rounded py-1 px-2 text-sm text-right" value="0" onchange="calculateOrderItemTotal(this)"></td>
            <td class="py-2"><input type="number" class="order-item-quantity w-full border border-gray-300 rounded py-1 px-2 text-sm text-right" value="1" min="1" onchange="calculateOrderItemTotal(this)"></td>
            <td class="py-2 order-item-total text-sm text-right font-medium">¥0.00</td>
            <td class="py-2 text-center"><button type="button" onclick="removeOrderItem(this)" class="text-red-500 hover:text-red-700 text-sm"><i class="fas fa-trash-alt"></i></button></td>
        </tr>
    `;
    
    // 加载商品/服务选项
    loadServicesToItemSelect(tbody.querySelector('.order-item-select'));
    updateOrderItemsTotal();
}

async function loadOrderFormSelects() {
    let users = [];
    let teams = [];
    let companies = [];
    
    // API优先 + LocalStorage降级
    try {
        console.log('📡 调用 API 加载订单表单数据...');
        const [userResult, teamResult, companyResult] = await Promise.all([
            window.api.getUsers(),
            window.api.getTeams(),
            window.api.getCompanies()
        ]);
        
        if (userResult.success) {
            users = userResult.data || [];
            console.log(`✅ API加载人员: ${users.length}条`);
        }
        if (teamResult.success) {
            teams = teamResult.data || [];
            console.log(`✅ API加载团队: ${teams.length}条`);
        }
        if (companyResult.success) {
            companies = companyResult.data || [];
            console.log(`✅ API加载公司: ${companies.length}条`);
        }
    } catch (error) {
        console.warn('❌ API加载失败，降级到LocalStorage:', error);
        users = getUsers ? getUsers().data || [] : [];
        teams = getTeams ? getTeams().data || [] : [];
        companies = db.getCompanies ? db.getCompanies().data || [] : [];
    }
    
    // 加载人员列表
    const staffSelects = ['orderBusinessStaff', 'orderServiceStaff', 'orderOperationStaff'];
    staffSelects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">请选择</option>';
            users.forEach(u => {
                select.innerHTML += `<option value="${u.name}">${u.name}</option>`;
            });
        }
    });
    
    // 加载团队列表
    const teamSelect = document.getElementById('orderTeam');
    if (teamSelect) {
        teamSelect.innerHTML = '<option value="">请选择</option>';
        teams.forEach(t => {
            teamSelect.innerHTML += `<option value="${t.name}">${t.name}</option>`;
        });
    }
    
    // 加载公司列表
    const companySelect = document.getElementById('orderCompany');
    if (companySelect) {
        companySelect.innerHTML = '<option value="">请选择公司</option>';
        companies.forEach(c => {
            companySelect.innerHTML += `<option value="${c.name}">${c.short_name || c.name}</option>`;
        });
    }
    
    // 加载项目列表（暂时使用静态数据）
    const projectSelect = document.getElementById('orderProject');
    if (projectSelect) {
        projectSelect.innerHTML = `
            <option value="">请选择</option>
            <option value="短视频拍摄">短视频拍摄</option>
            <option value="直播代运营">直播代运营</option>
            <option value="广告投放">广告投放</option>
            <option value="全案服务">全案服务</option>
        `;
    }
}

// 加载商品/服务到项目下拉
function loadServicesToItemSelect(select) {
    if (!select) return;
    
    const services = db.getServices ? db.getServices().data || [] : [];
    select.innerHTML = '<option value="">请选择...</option>';
    services.forEach(s => {
        const typeLabel = s.type === 'product' ? '商品' : '服务';
        select.innerHTML += `<option value="${s.id}" data-price="${s.retail_price || s.price}" data-type="${typeLabel}">${s.name} (¥${s.retail_price || s.price})</option>`;
    });
}

// 添加商品/服务项
window.addOrderItem = function() {
    const tbody = document.getElementById('orderItemsList');
    if (!tbody) return;
    
    const tr = document.createElement('tr');
    tr.className = 'order-item-row border-t border-gray-200';
    tr.innerHTML = `
        <td class="py-2">
            <select class="order-item-select w-full border border-gray-300 rounded py-1 px-2 text-sm" onchange="updateOrderItemPrice(this)">
                <option value="">请选择...</option>
            </select>
        </td>
        <td class="py-2 order-item-type text-sm text-gray-500">-</td>
        <td class="py-2"><input type="number" step="0.01" class="order-item-price w-full border border-gray-300 rounded py-1 px-2 text-sm text-right" value="0" onchange="calculateOrderItemTotal(this)"></td>
        <td class="py-2"><input type="number" class="order-item-quantity w-full border border-gray-300 rounded py-1 px-2 text-sm text-right" value="1" min="1" onchange="calculateOrderItemTotal(this)"></td>
        <td class="py-2 order-item-total text-sm text-right font-medium">¥0.00</td>
        <td class="py-2 text-center"><button type="button" onclick="removeOrderItem(this)" class="text-red-500 hover:text-red-700 text-sm"><i class="fas fa-trash-alt"></i></button></td>
    `;
    tbody.appendChild(tr);
    
    loadServicesToItemSelect(tr.querySelector('.order-item-select'));
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
    const price = option.dataset.price || 0;
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
    const total = price * quantity;
    
    row.querySelector('.order-item-total').textContent = `¥${total.toFixed(2)}`;
    updateOrderItemsTotal();
};

// 更新总计
function updateOrderItemsTotal() {
    let total = 0;
    document.querySelectorAll('.order-item-row').forEach(row => {
        const price = parseFloat(row.querySelector('.order-item-price')?.value) || 0;
        const quantity = parseInt(row.querySelector('.order-item-quantity')?.value) || 1;
        total += price * quantity;
    });
    
    const totalEl = document.getElementById('orderItemsTotal');
    if (totalEl) {
        totalEl.textContent = `¥${total.toFixed(2)}`;
    }
}

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
    const modal = document.getElementById('addOrderModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

async function loadCustomersToSelect() {
    const select = document.getElementById('orderCustomer');
    if (!select) return;
    
    let customers = [];
    
    // API优先 + LocalStorage降级
    try {
        console.log('📡 调用 API 加载客户数据(订单)...');
        const result = await window.api.getCustomers();
        if (result.success) {
            customers = result.data || [];
            console.log(`✅ API加载客户: ${customers.length}条`);
        }
    } catch (error) {
        console.warn('❌ API加载失败，降级到LocalStorage:', error);
        const result = db.getCustomers();
        if (result.success) {
            customers = result.data || [];
        }
    }
    
    select.innerHTML = '<option value="">请选择客户</option>';
    customers.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.shop_name}</option>`;
    });
}

function loadPackagesToSelect() {
    const select = document.getElementById('orderPackage');
    if (!select) return;
    
    const result = db.getServicePackages();
    if (result.success) {
        select.innerHTML = '<option value="">请选择服务包</option>';
        result.data.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.name} (¥${p.price})</option>`;
        });
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

async function saveNewOrder() {
    const customer_id = parseInt(document.getElementById('orderCustomer').value);
    const order_date = document.getElementById('orderDate').value;
    const contract_amount = parseFloat(document.getElementById('orderContractAmount').value);
    const company = document.getElementById('orderCompany').value;
    const business_staff = document.getElementById('orderBusinessStaff').value;
    const team = document.getElementById('orderTeam').value;
    
    // 验证必填项
    if (!customer_id || !order_date || isNaN(contract_amount)) {
        showNotification('请填写客户、日期和合同金额', 'error');
        return;
    }
    
    if (!business_staff) {
        showNotification('请选择业务人员', 'error');
        return;
    }
    
    if (!team) {
        showNotification('请选择负责团队', 'error');
        return;
    }
    
    if (!company) {
        showNotification('请选择归属公司', 'error');
        return;
    }
    
    // 收集商品/服务项
    const items = [];
    document.querySelectorAll('.order-item-row').forEach(row => {
        const select = row.querySelector('.order-item-select');
        const serviceId = select ? parseInt(select.value) : null;
        const price = parseFloat(row.querySelector('.order-item-price')?.value) || 0;
        const quantity = parseInt(row.querySelector('.order-item-quantity')?.value) || 1;
        
        if (serviceId) {
            items.push({
                service_id: serviceId,
                service_name: select.options[select.selectedIndex].text.split(' (')[0],
                price: price,
                quantity: quantity,
                subtotal: price * quantity
            });
        }
    });
    
    // 收集备注
    const remarks = [];
    document.querySelectorAll('.order-remark-item').forEach(input => {
        if (input.value.trim()) {
            remarks.push({
                date: new Date().toISOString().split('T')[0],
                content: input.value.trim()
            });
        }
    });
    
    // 收集附件信息（仅文件名，实际上传需要后端支持）
    const attachments = orderAttachments.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type
    }));
    
    const orderData = {
        customer_id,
        order_date,
        items: items,
        total_amount: items.reduce((sum, item) => sum + item.subtotal, 0),
        contract_amount,
        business_staff,
        service_staff: document.getElementById('orderServiceStaff').value,
        operation_staff: document.getElementById('orderOperationStaff').value,
        team,
        project: document.getElementById('orderProject').value,
        company,
        remarks: remarks,
        attachments: attachments,
        status: '待签约',
        payments: [],
        gifts: []
    };
    
    // 尝试使用 API 保存
    try {
        console.log('📡 调用 API 添加订单...');
        const result = await window.api.addOrder(orderData);
        
        if (result.success) {
            console.log('✅ API 添加订单成功');
            showNotification('订单创建成功！', 'success');
            closeAddOrderModal();
            loadOrdersData();
            return;
        }
    } catch (error) {
        console.warn('❌ API 保存失败，降级到 LocalStorage:', error);
    }
    
    // 降级到 LocalStorage
    const result = db.addOrder(orderData);
    if (result.success) {
        showNotification('订单创建成功！', 'success');
        closeAddOrderModal();
        loadOrdersData();
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
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;
    
    let result, customersResult, packagesResult;
    
    // 尝试使用 API 加载
    try {
        console.log('📡 调用 API 加载订单列表...');
        result = await window.api.getOrders();
        customersResult = await window.api.getCustomers();
        // 服务包暂时使用 LocalStorage
        packagesResult = db.getServicePackages();
        
        if (!result.success) throw new Error('API 返回失败');
        console.log('✅ API 加载订单成功:', result.data.length, '条');
    } catch (error) {
        console.warn('❌ API 加载失败，降级到 LocalStorage:', error);
        result = db.getOrders();
        customersResult = db.getCustomers();
        packagesResult = db.getServicePackages();
    }
    
    if (result.success) {
        ordersList.innerHTML = '';
        result.data.forEach(order => {
            const customer = customersResult.data.find(c => c.id === order.customer_id);
            const servicePackage = packagesResult.data?.find(p => p.id === order.service_package_id);
            
            // 计算已收款金额
            const paidAmount = (order.payments || []).reduce((sum, p) => sum + p.amount, 0);
            
            // 状态样式
            const statusColors = {
                '待确认': 'bg-yellow-100 text-yellow-800',
                '服务中': 'bg-blue-100 text-blue-800',
                '已完成': 'bg-green-100 text-green-800',
                '已取消': 'bg-gray-100 text-gray-800',
                '售后中': 'bg-red-100 text-red-800'
            };
            const statusClass = statusColors[order.status] || 'bg-gray-100 text-gray-800';
            
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50';
            tr.innerHTML = `
                <td class="px-4 py-3 text-sm">
                    <div class="font-medium text-gray-900">${customer ? customer.shop_name : '未知客户'}</div>
                    <div class="text-xs text-gray-500">${order.id}</div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">${order.business_staff || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${order.service_staff || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${order.team || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${servicePackage?.name || '自定义服务'}</td>
                <td class="px-4 py-3 text-sm">
                    <div class="font-medium text-gray-900">¥${(order.contract_amount || order.total_amount).toFixed(2)}</div>
                    <div class="text-xs text-green-600">已收: ¥${paidAmount.toFixed(2)}</div>
                </td>
                <td class="px-4 py-3 text-center">
                    <span class="px-2 py-0.5 text-xs font-semibold rounded-full ${statusClass}">
                        ${order.status}
                    </span>
                </td>
                <td class="px-4 py-3 text-center text-sm">
                    <button class="text-blue-600 hover:text-blue-900 mr-2" onclick="viewOrder('${order.id}')" title="查看">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="text-green-600 hover:text-green-900" onclick="processOrder('${order.id}')" title="流转">
                        <i class="fas fa-exchange-alt"></i>
                    </button>
                </td>
            `;
            ordersList.appendChild(tr);
        });
    }
}

window.viewOrder = async function(id) {
    const modal = document.getElementById('orderDetailModal');
    if (!modal) return;
    
    let order;
    
    // 尝试使用 API 获取订单详情
    try {
        console.log('📡 调用 API 获取订单详情:', id);
        const result = await window.api.getOrder(id);
        if (result.success) {
            order = result.data;
            console.log('✅ API 获取订单成功');
        } else {
            throw new Error('API 返回失败');
        }
    } catch (error) {
        console.warn('❌ API 获取失败，降级到 LocalStorage:', error);
        const result = db.getOrders();
        order = result.data.find(o => o.id === id);
    }
    
    if (!order) return;
    
    let customer;
    try {
        const customersResult = await window.api.getCustomers();
        customer = customersResult.data.find(c => c.id === order.customer_id);
    } catch (error) {
        const customersResult = db.getCustomers();
        customer = customersResult.data.find(c => c.id === order.customer_id);
    }
    
    document.getElementById('detailOrderId').textContent = order.id;
    document.getElementById('detailCustomer').textContent = customer ? customer.shop_name : '未知客户';
    document.getElementById('detailDate').textContent = order.order_date;
    document.getElementById('detailContractAmount').textContent = `¥${(order.contract_amount || 0).toFixed(2)}`;
    
    // 扩展字段
    document.getElementById('detailBusinessStaff').textContent = order.business_staff || '-';
    document.getElementById('detailServiceStaff').textContent = order.service_staff || '-';
    document.getElementById('detailOperationStaff').textContent = order.operation_staff || '-';
    document.getElementById('detailTeam').textContent = order.team || '-';
    document.getElementById('detailProject').textContent = order.project || '-';
    document.getElementById('detailCompany').textContent = order.company || '-';
    
    const statusEl = document.getElementById('detailStatus');
    statusEl.textContent = order.status;
    statusEl.className = `px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusClass(order.status)}`;
    
    // 加载备注
    const remarksList = document.getElementById('detailRemarksList');
    remarksList.innerHTML = '';
    if (order.remarks && order.remarks.length > 0) {
        order.remarks.forEach(r => {
            const div = document.createElement('div');
            div.className = 'p-2 bg-white rounded border border-gray-100';
            div.innerHTML = `<p class="text-gray-500 mb-1">${r.date}</p><p class="text-gray-800">${r.content}</p>`;
            remarksList.appendChild(div);
        });
    } else {
        remarksList.innerHTML = '<p class="text-gray-400 italic">暂无备注</p>';
    }
    
    // 加载合同
    const contractInfo = document.getElementById('contractInfo');
    if (order.contract_id) {
        contractInfo.innerHTML = `
            <p class="text-sm text-green-600 font-medium">已签署 (编号: HT-${order.id.slice(-4)})</p>
            <button class="text-xs text-blue-600 underline mt-1">查看合同文件</button>
        `;
    } else {
        contractInfo.innerHTML = `
            <p class="text-sm text-gray-500 italic">暂无合同</p>
            <button onclick="signContract('${order.id}')" class="text-xs bg-green-600 text-white px-2 py-1 rounded mt-2">签署合同</button>
        `;
    }
    
    // 加载收款
    const paymentList = document.getElementById('paymentRecordsList');
    paymentList.innerHTML = '';
    if (order.payments && order.payments.length > 0) {
        order.payments.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="py-2">${p.date}</td>
                <td class="py-2 text-gray-600">${p.type}</td>
                <td class="py-2 text-green-600 font-medium text-right">¥${p.amount.toFixed(2)}</td>
            `;
            paymentList.appendChild(tr);
        });
    } else {
        paymentList.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-gray-400">暂无收款记录</td></tr>';
    }
    
    // 加载售后
    const afterSalesList = document.getElementById('afterSalesList');
    afterSalesList.innerHTML = '';
    if (order.after_sales && order.after_sales.length > 0) {
        order.after_sales.forEach(a => {
            const div = document.createElement('div');
            div.className = 'p-2 bg-red-50 rounded border border-red-100';
            div.innerHTML = `<p class="font-medium text-red-800">${a.type} (${a.date})</p><p class="text-red-600">${a.content}</p>`;
            if (a.amount > 0) div.innerHTML += `<p class="font-bold">退款金额: ¥${a.amount.toFixed(2)}</p>`;
            afterSalesList.appendChild(div);
        });
    } else {
        afterSalesList.innerHTML = '<p class="text-gray-400 italic">暂无售后记录</p>';
    }
    
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

window.openAddPaymentModal = function() {
    const orderId = document.getElementById('detailOrderId').textContent;
    document.getElementById('paymentOrderId').value = orderId;
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    
    // 加载账户
    const accountSelect = document.getElementById('paymentAccount');
    const accounts = db.getAccounts().data;
    accountSelect.innerHTML = '<option value="">请选择账户</option>';
    accounts.forEach(acc => {
        accountSelect.innerHTML += `<option value="${acc.id}">${acc.name} (余额: ¥${acc.balance})</option>`;
    });
    
    document.getElementById('addPaymentModal').classList.remove('hidden');
    document.getElementById('addPaymentModal').style.display = 'flex';
};

window.closeAddPaymentModal = function() {
    document.getElementById('addPaymentModal').classList.add('hidden');
    document.getElementById('addPaymentModal').style.display = 'none';
};

function savePayment() {
    const orderId = document.getElementById('paymentOrderId').value;
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const date = document.getElementById('paymentDate').value;
    const type = document.getElementById('paymentType').value;
    const account_id = parseInt(document.getElementById('paymentAccount').value);
    
    if (isNaN(amount) || !date || !account_id) {
        alert('请填写完整收款信息');
        return;
    }
    
    const result = db.addOrderPayment(orderId, { amount, date, type, account_id });
    if (result.success) {
        showNotification('收款登记成功，并已同步生成财务流水！', 'success');
        closeAddPaymentModal();
        viewOrder(orderId); // 刷新详情
        loadOrdersData(); // 刷新列表
    }
}

window.openAfterSalesModal = function() {
    const orderId = document.getElementById('detailOrderId').textContent;
    document.getElementById('afterSalesOrderId').value = orderId;
    
    const accountSelect = document.getElementById('afterSalesAccount');
    const accounts = db.getAccounts().data;
    accountSelect.innerHTML = '<option value="">请选择退款账户</option>';
    accounts.forEach(acc => {
        accountSelect.innerHTML += `<option value="${acc.id}">${acc.name}</option>`;
    });
    
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

function saveAfterSales() {
    const orderId = document.getElementById('afterSalesOrderId').value;
    const type = document.getElementById('afterSalesType').value;
    const amount = parseFloat(document.getElementById('afterSalesAmount').value);
    const content = document.getElementById('afterSalesContent').value;
    const account_id = parseInt(document.getElementById('afterSalesAccount').value);
    
    if (type === '退款申请' && (isNaN(amount) || amount <= 0 || !account_id)) {
        alert('退款必须填写金额和账户');
        return;
    }
    
    const result = db.addOrderAfterSales(orderId, { type, amount, content, account_id });
    if (result.success) {
        showNotification('售后记录保存成功！', 'success');
        closeAfterSalesModal();
        viewOrder(orderId);
        loadOrdersData();
    }
}
