// 客户管理模块（折叠面板版 + 新字段支持 + 分页支持）
let customerPageSize = 20;
let customerCurrentPage = 1;

window.initCustomersPage = function() {
    console.log('初始化客户管理页面（折叠面板版）');
    loadCustomersData();
    
    const addCustomerBtn = document.getElementById('addCustomerBtn');
    const customerModal = document.getElementById('customerModal');
    const closeButtons = document.querySelectorAll('#closeCustomerModal, .close-customer-modal');
    const customerForm = document.getElementById('customerForm');
    
    // 初始化可配置字段的下拉选项
    initConfigurableFields();
    
    if (addCustomerBtn) {
        addCustomerBtn.onclick = function() {
            openCustomerModal();
        };
    }
    
    closeButtons.forEach(btn => {
        btn.onclick = function() {
            closeCustomerModalFunc();
        };
    });
    
    if (customerForm) {
        customerForm.onsubmit = function(e) {
            e.preventDefault();
            saveCustomer();
        };
    }
    
    // 初始化联系人删除按钮
    initContactDeleteButtons();
    
    // 初始化附件上传
    initAttachmentUpload();
};

// 初始化可配置字段
function initConfigurableFields() {
    const db = window.db || window;
    const settings = db.getSystemSettings ? db.getSystemSettings() : {};
    
    // 填充合作模式下拉选项
    const cooperationModeSelect = document.getElementById('cooperationMode');
    if (cooperationModeSelect && settings.cooperationModes) {
        cooperationModeSelect.innerHTML = '<option value="">请选择</option>';
        settings.cooperationModes.forEach(mode => {
            const option = document.createElement('option');
            option.value = mode;
            option.textContent = mode;
            cooperationModeSelect.appendChild(option);
        });
    }
    
    // 填充行业下拉选项
    const industrySelect = document.getElementById('industry');
    if (industrySelect && settings.industries) {
        industrySelect.innerHTML = '<option value="">请选择</option>';
        settings.industries.forEach(industry => {
            const option = document.createElement('option');
            option.value = industry;
            option.textContent = industry;
            industrySelect.appendChild(option);
        });
    }
    
    // 填充跟进人下拉选项（系统用户）
    const followerSelect = document.getElementById('followerId');
    if (followerSelect) {
        followerSelect.innerHTML = '<option value="">请选择</option>';
        const usersResult = db.getUsers ? db.getUsers() : [];
        const users = Array.isArray(usersResult) ? usersResult : (usersResult.data || []);
        users.filter(u => u.status === 'enabled').forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            followerSelect.appendChild(option);
        });
    }
}

// 打开客户模态框
window.openCustomerModal = function(customerId = null) {
    const modal = document.getElementById('customerModal');
    const modalTitle = document.getElementById('customerModalTitle');
    const form = document.getElementById('customerForm');
    
    if (!modal || !form) {
        console.error('找不到客户模态框或表单元素');
        return;
    }
    
    // 重置表单
    form.reset();
    document.getElementById('customerId').value = '';
    
    // 清空联系人列表（保留一个空行）
    const contactsList = document.getElementById('contactsList');
    contactsList.innerHTML = `
        <div class="contact-item grid grid-cols-1 md:grid-cols-4 gap-3 items-end p-3 bg-gray-50 rounded-lg">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input type="text" class="contact-name block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">电话</label>
                <input type="text" class="contact-phone block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">职位</label>
                <input type="text" class="contact-position block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm">
            </div>
            <div class="flex items-end">
                <button type="button" class="remove-contact-btn text-red-600 hover:text-red-800 px-4 py-2 bg-red-50 rounded-md border border-red-200 hover:bg-red-100 transition duration-150 w-full">
                    <i class="fas fa-trash mr-1"></i>删除
                </button>
            </div>
        </div>
    `;
    
    // 清空备忘录列表
    document.getElementById('memosList').innerHTML = '';
    
    // 清空附件列表
    document.getElementById('attachmentsList').innerHTML = '';
    
    if (customerId) {
        // 编辑模式
        const db = window.db || window;
        const customer = db.getCustomerById ? db.getCustomerById(customerId) : null;
        
        if (customer) {
            modalTitle.innerHTML = '<i class="fas fa-user-edit mr-2 text-blue-600"></i>编辑客户';
            document.getElementById('customerId').value = customer.id;
            document.getElementById('merchantId').value = customer.merchant_id || '';
            document.getElementById('shopName').value = customer.shop_name || '';
            document.getElementById('douyinName').value = customer.douyin_name || '';
            document.getElementById('customerCompanyName').value = customer.company_name || '';
            document.getElementById('creditCode').value = customer.credit_code || '';
            document.getElementById('legalPerson').value = customer.legal_person || '';
            document.getElementById('registeredCapital').value = customer.registered_capital || '';
            document.getElementById('cooperationMode').value = customer.cooperation_mode || '';
            document.getElementById('category').value = customer.category || '';
            document.getElementById('industry').value = customer.industry || '';
            document.getElementById('followerId').value = customer.follower_id || '';
            document.getElementById('customerStatus').value = customer.status || '合作中';
            document.getElementById('businessAddress').value = customer.business_address || '';
            document.getElementById('operatingAddress').value = customer.operating_address || '';
            document.getElementById('businessStaff').value = customer.business_staff || '';
            document.getElementById('serviceStaff').value = customer.service_staff || '';
            document.getElementById('operationStaff').value = customer.operation_staff || '';
            document.getElementById('managementStaff').value = customer.management_staff || '';
            document.getElementById('team').value = customer.team || '';
            document.getElementById('region').value = customer.region || '';
            document.getElementById('project').value = customer.project || '';
            document.getElementById('company').value = customer.company || '';
            
            // 填充联系人
            if (customer.contacts && customer.contacts.length > 0) {
                contactsList.innerHTML = '';
                customer.contacts.forEach(contact => {
                    addContactItem(contact);
                });
            }
            
            // 填充备忘录
            if (customer.memos && customer.memos.length > 0) {
                customer.memos.forEach(memo => {
                    addMemoItem(memo);
                });
            }
            
            // 显示附件列表（如果有）
            if (customer.attachments && customer.attachments.length > 0) {
                renderAttachmentsList(customer.attachments);
            }
        }
    } else {
        // 新增模式
        modalTitle.innerHTML = '<i class="fas fa-user-tie mr-2 text-blue-600"></i>新增客户';
    }
    
    modal.classList.remove('hidden');
    initContactDeleteButtons();
};

// 关闭客户模态框
window.closeCustomerModalFunc = function() {
    const modal = document.getElementById('customerModal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

// 添加联系人项
window.addContactItem = function(contact = null) {
    const contactsList = document.getElementById('contactsList');
    const contactItem = document.createElement('div');
    contactItem.className = 'contact-item grid grid-cols-1 md:grid-cols-4 gap-3 items-end p-3 bg-gray-50 rounded-lg';
    contactItem.innerHTML = `
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">姓名</label>
            <input type="text" class="contact-name block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm" value="${contact ? contact.name || '' : ''}">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">电话</label>
            <input type="text" class="contact-phone block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm" value="${contact ? contact.phone || '' : ''}">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">职位</label>
            <input type="text" class="contact-position block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm" value="${contact ? contact.position || '' : ''}">
        </div>
        <div class="flex items-end">
            <button type="button" class="remove-contact-btn text-red-600 hover:text-red-800 px-4 py-2 bg-red-50 rounded-md border border-red-200 hover:bg-red-100 transition duration-150 w-full">
                <i class="fas fa-trash mr-1"></i>删除
            </button>
        </div>
    `;
    contactsList.appendChild(contactItem);
    initContactDeleteButtons();
};

// 添加备忘录项
window.addMemoItem = function(memo = null) {
    const memosList = document.getElementById('memosList');
    const memoItem = document.createElement('div');
    const today = new Date().toISOString().split('T')[0];
    memoItem.className = 'memo-item p-3 bg-yellow-50 rounded-lg border border-yellow-200';
    memoItem.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-5 gap-3 items-start">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">日期</label>
                <input type="date" class="memo-date block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 text-sm" value="${memo ? memo.date || today : today}">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <select class="memo-type block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 text-sm">
                    <option value="洽谈结果" ${memo && memo.type === '洽谈结果' ? 'selected' : ''}>洽谈结果</option>
                    <option value="跟进记录" ${memo && memo.type === '跟进记录' ? 'selected' : ''}>跟进记录</option>
                    <option value="问题反馈" ${memo && memo.type === '问题反馈' ? 'selected' : ''}>问题反馈</option>
                    <option value="合同变更" ${memo && memo.type === '合同变更' ? 'selected' : ''}>合同变更</option>
                    <option value="其他" ${memo && memo.type === '其他' ? 'selected' : ''}>其他</option>
                </select>
            </div>
            <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">内容</label>
                <textarea class="memo-content block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 text-sm" rows="2">${memo ? memo.content || '' : ''}</textarea>
            </div>
            <div class="flex items-end">
                <button type="button" class="remove-memo-btn text-red-600 hover:text-red-800 px-4 py-2 bg-red-50 rounded-md border border-red-200 hover:bg-red-100 transition duration-150 w-full">
                    <i class="fas fa-trash mr-1"></i>删除
                </button>
            </div>
        </div>
    `;
    memosList.appendChild(memoItem);
    initMemoDeleteButtons();
};

// 初始化联系人删除按钮
function initContactDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.remove-contact-btn');
    deleteButtons.forEach(btn => {
        btn.onclick = function() {
            const contactItems = document.querySelectorAll('.contact-item');
            if (contactItems.length > 1) {
                this.closest('.contact-item').remove();
            } else {
                alert('至少保留一个联系人');
            }
        };
    });
}

// 初始化备忘录删除按钮
function initMemoDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.remove-memo-btn');
    deleteButtons.forEach(btn => {
        btn.onclick = function() {
            this.closest('.memo-item').remove();
        };
    });
}

// 初始化附件上传功能
function initAttachmentUpload() {
    const attachmentInput = document.getElementById('attachmentInput');
    if (attachmentInput) {
        attachmentInput.addEventListener('change', function(e) {
            const files = e.target.files;
            if (files.length > 0) {
                handleAttachmentUpload(files);
            }
        });
    }
}

// 处理附件上传（模拟）
function handleAttachmentUpload(files) {
    const attachmentsList = document.getElementById('attachmentsList');
    
    Array.from(files).forEach(file => {
        // 检查文件大小（10MB限制）
        if (file.size > 10 * 1024 * 1024) {
            alert(`文件 ${file.name} 超过10MB限制`);
            return;
        }
        
        // 创建附件项
        const attachmentItem = document.createElement('div');
        attachmentItem.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200';
        attachmentItem.innerHTML = `
            <div class="flex items-center space-x-3">
                <i class="fas ${getFileIcon(file.name)} text-2xl text-gray-500"></i>
                <div>
                    <p class="text-sm font-medium text-gray-900">${file.name}</p>
                    <p class="text-xs text-gray-500">${formatFileSize(file.size)}</p>
                </div>
            </div>
            <button type="button" class="remove-attachment-btn text-red-600 hover:text-red-800">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        attachmentsList.appendChild(attachmentItem);
        
        // 绑定删除按钮
        attachmentItem.querySelector('.remove-attachment-btn').onclick = function() {
            attachmentItem.remove();
        };
    });
    
    // 清空input以允许重复选择同一文件
    document.getElementById('attachmentInput').value = '';
}

// 渲染附件列表（编辑时）
function renderAttachmentsList(attachments) {
    const attachmentsList = document.getElementById('attachmentsList');
    attachmentsList.innerHTML = '';
    
    attachments.forEach(attachment => {
        const attachmentItem = document.createElement('div');
        attachmentItem.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200';
        attachmentItem.innerHTML = `
            <div class="flex items-center space-x-3">
                <i class="fas ${getFileIcon(attachment.name)} text-2xl text-gray-500"></i>
                <div>
                    <p class="text-sm font-medium text-gray-900">${attachment.name}</p>
                    <p class="text-xs text-gray-500">${attachment.size || '未知大小'}</p>
                </div>
            </div>
            <button type="button" class="remove-attachment-btn text-red-600 hover:text-red-800">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        attachmentsList.appendChild(attachmentItem);
        
        attachmentItem.querySelector('.remove-attachment-btn').onclick = function() {
            attachmentItem.remove();
        };
    });
}

// 获取文件图标
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
        'pdf': 'fa-file-pdf',
        'doc': 'fa-file-word',
        'docx': 'fa-file-word',
        'xls': 'fa-file-excel',
        'xlsx': 'fa-file-excel',
        'jpg': 'fa-file-image',
        'jpeg': 'fa-file-image',
        'png': 'fa-file-image',
        'gif': 'fa-file-image'
    };
    return iconMap[ext] || 'fa-file';
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// 保存客户
window.saveCustomer = async function() {
    console.log('=== 开始保存客户 ===');
    const id = document.getElementById('customerId').value;
    console.log('客户ID:', id || '新增客户');
    
    // 收集联系人数据
    const contacts = [];
    document.querySelectorAll('.contact-item').forEach(item => {
        const name = item.querySelector('.contact-name').value;
        const phone = item.querySelector('.contact-phone').value;
        const position = item.querySelector('.contact-position').value;
        if (name || phone) {
            contacts.push({ name, phone, position });
        }
    });
    console.log('联系人数据:', contacts);
    
    // 收集备忘录数据
    const memos = [];
    document.querySelectorAll('.memo-item').forEach(item => {
        const date = item.querySelector('.memo-date').value;
        const type = item.querySelector('.memo-type').value;
        const content = item.querySelector('.memo-content').value;
        if (content) {
            memos.push({ date, type, content });
        }
    });
    console.log('备忘录数据:', memos);
    
    // 收集附件数据（模拟）
    const attachments = [];
    document.querySelectorAll('#attachmentsList > div').forEach(item => {
        const name = item.querySelector('.text-sm.font-medium').textContent;
        const size = item.querySelector('.text-xs.text-gray-500').textContent;
        attachments.push({ name, size });
    });
    console.log('附件数据:', attachments);
    
    const customerData = {
        merchant_id: document.getElementById('merchantId').value,
        shop_name: document.getElementById('shopName').value,
        douyin_name: document.getElementById('douyinName').value,
        company_name: document.getElementById('customerCompanyName').value,
        credit_code: document.getElementById('creditCode').value,
        legal_person: document.getElementById('legalPerson').value,
        registered_capital: document.getElementById('registeredCapital').value,
        cooperation_mode: document.getElementById('cooperationMode').value,
        category: document.getElementById('category').value,
        industry: document.getElementById('industry').value,
        follower_id: document.getElementById('followerId').value ? parseInt(document.getElementById('followerId').value) : null,
        status: document.getElementById('customerStatus').value,
        business_address: document.getElementById('businessAddress').value,
        operating_address: document.getElementById('operatingAddress').value,
        business_staff: document.getElementById('businessStaff').value,
        service_staff: document.getElementById('serviceStaff').value,
        operation_staff: document.getElementById('operationStaff').value,
        management_staff: document.getElementById('managementStaff').value,
        team: document.getElementById('team').value,
        region: document.getElementById('region').value,
        project: document.getElementById('project').value,
        company: document.getElementById('company').value,
        contacts: contacts,
        memos: memos,
        attachments: attachments
    };
    console.log('客户数据:', customerData);
    
    // 尝试使用 API 保存
    try {
        let result;
        if (id) {
            console.log('调用 API 更新客户...');
            result = await window.api.updateCustomer(parseInt(id), customerData);
        } else {
            console.log('调用 API 添加客户...');
            result = await window.api.addCustomer(customerData);
        }
        
        if (result.success) {
            showNotification(id ? '更新成功' : '添加成功', 'success');
            closeCustomerModalFunc();
            console.log('关闭模态框，准备刷新列表...');
            loadCustomersData();
            return;
        }
    } catch (error) {
        console.warn('❌ API 保存失败，降级到 LocalStorage:', error);
    }
    
    // 降级到 LocalStorage
    saveCustomerToLocalStorage(id, customerData);
};

// 保存到 LocalStorage（降级方案）
function saveCustomerToLocalStorage(id, customerData) {
    console.log('使用 LocalStorage 保存客户...');
    
    const db = window.db || window;
    console.log('window.db 是否存在:', !!window.db);
    console.log('addCustomer 函数是否存在:', typeof db.addCustomer);
    console.log('updateCustomer 函数是否存在:', typeof db.updateCustomer);
    
    let result;
    
    if (id) {
        console.log('执行更新客户...');
        result = db.updateCustomer(parseInt(id), customerData);
    } else {
        console.log('执行添加客户...');
        result = db.addCustomer(customerData);
    }
    
    console.log('保存结果:', result);
    
    if (result.success) {
        showNotification(id ? '更新成功' : '添加成功', 'success');
        closeCustomerModalFunc();
        console.log('关闭模态框，准备刷新列表...');
        loadCustomersData();
    } else {
        showNotification('操作失败: ' + result.message, 'error');
    }
}

// 获取过滤后的客户数据
function getFilteredCustomers() {
    const db = window.db || window;
    let customers = db.getAllCustomers ? db.getAllCustomers() : [];
    
    const searchInput = document.getElementById('customerSearchInput');
    const statusFilter = document.getElementById('customerStatusFilter');
    
    if (searchInput && searchInput.value) {
        const keyword = searchInput.value.toLowerCase();
        customers = customers.filter(c => 
            (c.shop_name && c.shop_name.toLowerCase().includes(keyword)) ||
            (c.merchant_id && c.merchant_id.toLowerCase().includes(keyword)) ||
            (c.industry && c.industry.toLowerCase().includes(keyword))
        );
    }
    
    if (statusFilter && statusFilter.value) {
        customers = customers.filter(c => c.status === statusFilter.value);
    }
    
    return customers;
}

// 加载客户数据
window.loadCustomersData = async function() {
    console.log('=== 开始加载客户数据 ===');
    
    // 尝试使用 API 加载
    try {
        const searchInput = document.getElementById('customerSearchInput');
        const statusFilter = document.getElementById('customerStatusFilter');
        
        const params = {
            page: customerCurrentPage,
            page_size: customerPageSize,
            search: searchInput ? searchInput.value : '',
            status: statusFilter ? statusFilter.value : ''
        };
        
        console.log('调用 API 加载客户...', params);
        const result = await window.api.getCustomers(params);
        
        if (result.success) {
            console.log(`API 加载成功: ${result.data.length} 条数据`);
            renderCustomersList(result.data, result.total, Math.ceil(result.total / customerPageSize));
            return;
        }
    } catch (error) {
        console.warn('❌ API 加载失败，降级到 LocalStorage:', error);
    }
    
    // 降级到 LocalStorage
    loadCustomersFromLocalStorage();
};

// 从 LocalStorage 加载（降级方案）
function loadCustomersFromLocalStorage() {
    console.log('使用 LocalStorage 加载客户数据...');
    
    let customers = getFilteredCustomers();
    
    const totalCount = customers.length;
    const totalPages = Math.ceil(totalCount / customerPageSize);
    
    // 如果当前页超过总页数（比如搜索后结果变少），重置为第一页
    if (customerCurrentPage > totalPages && totalPages > 0) {
        customerCurrentPage = totalPages;
    }
    
    // 处理分页
    const start = (customerCurrentPage - 1) * customerPageSize;
    const end = start + customerPageSize;
    const paginatedCustomers = customers.slice(start, end);
    
    console.log(`符合条件的客户总量: ${totalCount}, 当前页: ${customerCurrentPage}, 每页: ${customerPageSize}`);
    
    renderCustomersList(paginatedCustomers, totalCount, totalPages);
}

// 渲染客户列表（通用函数）
function renderCustomersList(customers, totalCount, totalPages) {
    const customersTableBody = document.getElementById('customersList');
    if (!customersTableBody) return;
    
    customersTableBody.innerHTML = '';
    
    if (customers.length === 0) {
        customersTableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">未找到符合条件的客户数据</td></tr>';
        renderPagination(0, 0, 0);
        return;
    }
    
    // 获取所有用户信息用于显示跟进人
    const db = window.db || window;
    const usersResult = db.getUsers ? db.getUsers() : [];
    const users = Array.isArray(usersResult) ? usersResult : (usersResult.data || []);
    
    customers.forEach((customer) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const statusBadge = getStatusBadgeClass(customer.status);
        const firstContact = customer.contacts && customer.contacts.length > 0 ? customer.contacts[0] : null;
        const contactInfo = firstContact ? `${firstContact.name || ''} ${firstContact.phone || ''}` : '-';
        
        // 获取跟进人姓名
        const follower = customer.follower_id ? users.find(u => u.id === customer.follower_id) : null;
        const followerName = follower ? follower.name : '-';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${customer.shop_name}</div>
                <div class="text-xs text-gray-500">${customer.merchant_id || ''}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${contactInfo}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${customer.industry || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${followerName}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadge}">
                    ${customer.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <button onclick="window.openCustomerModal(${customer.id})" class="text-blue-600 hover:text-blue-900">
                    <i class="fas fa-edit"></i> 编辑
                </button>
                <button onclick="window.deleteCustomer(${customer.id})" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </td>
        `;
        customersTableBody.appendChild(row);
    });
    
    // 渲染分页控件
    renderPagination(totalCount, totalPages, customerCurrentPage);
}

// 渲染分页控件
function renderPagination(totalCount, totalPages, currentPage) {
    const paginationContainer = document.getElementById('customerPagination');
    if (!paginationContainer) return;
    
    if (totalCount === 0) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let html = `
        <div class="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
            <div class="flex flex-1 justify-between sm:hidden">
                <button onclick="window.changeCustomerPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">上一页</button>
                <button onclick="window.changeCustomerPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">下一页</button>
            </div>
            <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p class="text-sm text-gray-700">
                        显示第 <span class="font-medium">${(currentPage - 1) * customerPageSize + 1}</span> 到第 <span class="font-medium">${Math.min(currentPage * customerPageSize, totalCount)}</span> 条，共 <span class="font-medium">${totalCount}</span> 条记录
                    </p>
                </div>
                <div class="flex items-center space-x-4">
                    <select onchange="window.changeCustomerPageSize(this.value)" class="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                        <option value="20" ${customerPageSize === 20 ? 'selected' : ''}>20条/页</option>
                        <option value="50" ${customerPageSize === 50 ? 'selected' : ''}>50条/页</option>
                        <option value="100" ${customerPageSize === 100 ? 'selected' : ''}>100条/页</option>
                        <option value="500" ${customerPageSize === 500 ? 'selected' : ''}>500条/页</option>
                        <option value="${totalCount}" ${customerPageSize === totalCount ? 'selected' : ''}>全部显示</option>
                    </select>
                    <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button onclick="window.changeCustomerPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                            <span class="sr-only">Previous</span>
                            <i class="fas fa-chevron-left h-5 w-5 flex items-center justify-center"></i>
                        </button>
    `;
    
    // 页码逻辑
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    const adjustedStartPage = Math.max(1, endPage - 4);
    
    if (adjustedStartPage > 1) {
        html += `<button onclick="window.changeCustomerPage(1)" class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">1</button>`;
        if (adjustedStartPage > 2) {
            html += `<span class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">...</span>`;
        }
    }
    
    for (let i = adjustedStartPage; i <= endPage; i++) {
        html += `
            <button onclick="window.changeCustomerPage(${i})" class="relative inline-flex items-center px-4 py-2 text-sm font-semibold ${i === currentPage ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">...</span>`;
        }
        html += `<button onclick="window.changeCustomerPage(${totalPages})" class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">${totalPages}</button>`;
    }
    
    html += `
                        <button onclick="window.changeCustomerPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}">
                            <span class="sr-only">Next</span>
                            <i class="fas fa-chevron-right h-5 w-5 flex items-center justify-center"></i>
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    `;
    
    paginationContainer.innerHTML = html;
}

// 切换页码
window.changeCustomerPage = function(page) {
    let customers = getFilteredCustomers();
    const totalCount = customers.length;
    const totalPages = Math.ceil(totalCount / customerPageSize);
    
    if (page < 1 || page > totalPages) return;
    
    customerCurrentPage = page;
    loadCustomersData();
    // 滚动到顶部
    const mainContent = document.querySelector('main');
    if (mainContent) mainContent.scrollTop = 0;
};

// 切换每页显示数量
window.changeCustomerPageSize = function(size) {
    customerPageSize = parseInt(size);
    customerCurrentPage = 1;
    loadCustomersData();
};

// 处理搜索
let customerSearchTimer = null;
window.handleCustomerSearch = function() {
    if (customerSearchTimer) clearTimeout(customerSearchTimer);
    customerSearchTimer = setTimeout(() => {
        customerCurrentPage = 1;
        loadCustomersData();
    }, 300); // 防抖
};

// 获取用户名
function getUserNameById(userId) {
    const db = window.db || window;
    const usersResult = db.getUsers ? db.getUsers() : [];
    const users = Array.isArray(usersResult) ? usersResult : (usersResult.data || []);
    const user = users.find(u => u.id === userId);
    return user ? user.name : '-';
}

// 获取状态徽章样式
window.getStatusBadgeClass = function(status) {
    const statusMap = {
        '合作中': 'bg-green-100 text-green-800',
        '跟进中': 'bg-yellow-100 text-yellow-800',
        '已流失': 'bg-red-100 text-red-800'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
};

// 删除客户
window.deleteCustomer = async function(id) {
    if (confirm('确定要删除该客户吗？')) {
        // 尝试使用 API 删除
        try {
            console.log('调用 API 删除客户...', id);
            const result = await window.api.deleteCustomer(id);
            if (result.success) {
                showNotification('删除成功', 'success');
                loadCustomersData();
                return;
            }
        } catch (error) {
            console.warn('❌ API 删除失败，降级到 LocalStorage:', error);
        }
        
        // 降级到 LocalStorage
        deleteCustomerFromLocalStorage(id);
    }
};

// 从 LocalStorage 删除（降级方案）
function deleteCustomerFromLocalStorage(id) {
    console.log('使用 LocalStorage 删除客户...');
    const db = window.db || window;
    const result = db.deleteCustomer(id);
    if (result.success) {
        showNotification('删除成功', 'success');
        loadCustomersData();
    } else {
        showNotification('删除失败: ' + result.message, 'error');
    }
}
