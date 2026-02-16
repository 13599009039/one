// 客户管理模块（升级版）
window.initCustomersPage = function() {
    console.log('初始化客户管理页面');
    loadCustomersData();
    
    const addCustomerBtn = document.getElementById('addCustomerBtn');
    const customerModal = document.getElementById('customerModal');
    const closeButtons = document.querySelectorAll('#closeCustomerModal, .close-customer-modal');
    const customerForm = document.getElementById('customerForm');
    const addContactBtn = document.getElementById('addContactBtn');
    const addMemoBtn = document.getElementById('addMemoBtn');
    
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
    
    if (addContactBtn) {
        addContactBtn.onclick = function() {
            addContactItem();
        };
    }
    
    if (addMemoBtn) {
        addMemoBtn.onclick = function() {
            addMemoItem();
        };
    }
    
    if (customerForm) {
        customerForm.onsubmit = function(e) {
            e.preventDefault();
            saveCustomer();
        };
    }
    
    // 初始化联系人删除按钮
    initContactDeleteButtons();
};

// 添加联系人项
function addContactItem() {
    const contactsList = document.getElementById('contactsList');
    const contactItem = document.createElement('div');
    contactItem.className = 'contact-item grid grid-cols-1 md:grid-cols-4 gap-2 items-end';
    contactItem.innerHTML = `
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">姓名</label>
            <input type="text" class="contact-name block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">电话</label>
            <input type="text" class="contact-phone block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">职位</label>
            <input type="text" class="contact-position block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
        </div>
        <div>
            <button type="button" class="remove-contact-btn text-red-600 hover:text-red-800 px-3 py-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    contactsList.appendChild(contactItem);
    initContactDeleteButtons();
}

// 添加备忘录项
function addMemoItem() {
    const memosList = document.getElementById('memosList');
    const now = new Date().toISOString().split('T')[0];
    const memoItem = document.createElement('div');
    memoItem.className = 'memo-item border border-gray-200 rounded-md p-3 bg-gray-50';
    memoItem.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">日期</label>
                <input type="date" class="memo-date block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value="${now}">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">类型</label>
                <select class="memo-type block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                    <option value="洽谈结果">洽谈结果</option>
                    <option value="跟进记录">跟进记录</option>
                    <option value="合作意向">合作意向</option>
                    <option value="问题记录">问题记录</option>
                    <option value="其他">其他</option>
                </select>
            </div>
            <div class="flex items-end">
                <button type="button" class="remove-memo-btn text-red-600 hover:text-red-800 px-2 py-1 text-sm">
                    <i class="fas fa-trash mr-1"></i>删除
                </button>
            </div>
        </div>
        <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">内容</label>
            <textarea class="memo-content block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" rows="2"></textarea>
        </div>
    `;
    memosList.appendChild(memoItem);
    initMemoDeleteButtons();
}

// 初始化联系人删除按钮
function initContactDeleteButtons() {
    document.querySelectorAll('.remove-contact-btn').forEach(btn => {
        btn.onclick = function() {
            const contactsList = document.getElementById('contactsList');
            if (contactsList.children.length > 1) {
                this.closest('.contact-item').remove();
            } else {
                alert('至少保留一个联系人');
            }
        };
    });
}

// 初始化备忘录删除按钮
function initMemoDeleteButtons() {
    document.querySelectorAll('.remove-memo-btn').forEach(btn => {
        btn.onclick = function() {
            this.closest('.memo-item').remove();
        };
    });
}

// 打开客户模态框
window.openCustomerModal = function(customer = null) {
    const modal = document.getElementById('customerModal');
    const title = document.getElementById('customerModalTitle');
    const form = document.getElementById('customerForm');
    
    if (customer) {
        title.textContent = '编辑客户';
        document.getElementById('customerId').value = customer.id;
        document.getElementById('shopName').value = customer.shop_name || '';
        document.getElementById('douyinName').value = customer.douyin_name || '';
        document.getElementById('companyName').value = customer.company_name || '';
        document.getElementById('creditCode').value = customer.credit_code || '';
        document.getElementById('legalPerson').value = customer.legal_person || '';
        document.getElementById('registeredCapital').value = customer.registered_capital || '';
        document.getElementById('industry').value = customer.industry || '';
        document.getElementById('customerStatus').value = customer.status || '';
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
        
        // 加载联系人
        const contactsList = document.getElementById('contactsList');
        contactsList.innerHTML = '';
        if (customer.contacts && customer.contacts.length > 0) {
            customer.contacts.forEach(contact => {
                const contactItem = document.createElement('div');
                contactItem.className = 'contact-item grid grid-cols-1 md:grid-cols-4 gap-2 items-end';
                contactItem.innerHTML = `
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                        <input type="text" class="contact-name block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value="${contact.name || ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">电话</label>
                        <input type="text" class="contact-phone block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value="${contact.phone || ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">职位</label>
                        <input type="text" class="contact-position block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value="${contact.position || ''}">
                    </div>
                    <div>
                        <button type="button" class="remove-contact-btn text-red-600 hover:text-red-800 px-3 py-2">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                contactsList.appendChild(contactItem);
            });
        } else {
            addContactItem();
        }
        
        // 加载备忘录
        const memosList = document.getElementById('memosList');
        memosList.innerHTML = '';
        if (customer.memos && customer.memos.length > 0) {
            customer.memos.forEach(memo => {
                const memoItem = document.createElement('div');
                memoItem.className = 'memo-item border border-gray-200 rounded-md p-3 bg-gray-50';
                memoItem.innerHTML = `
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">日期</label>
                            <input type="date" class="memo-date block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value="${memo.date || ''}">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-1">类型</label>
                            <select class="memo-type block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                <option value="洽谈结果" ${memo.type === '洽谈结果' ? 'selected' : ''}>洽谈结果</option>
                                <option value="跟进记录" ${memo.type === '跟进记录' ? 'selected' : ''}>跟进记录</option>
                                <option value="合作意向" ${memo.type === '合作意向' ? 'selected' : ''}>合作意向</option>
                                <option value="问题记录" ${memo.type === '问题记录' ? 'selected' : ''}>问题记录</option>
                                <option value="其他" ${memo.type === '其他' ? 'selected' : ''}>其他</option>
                            </select>
                        </div>
                        <div class="flex items-end">
                            <button type="button" class="remove-memo-btn text-red-600 hover:text-red-800 px-2 py-1 text-sm">
                                <i class="fas fa-trash mr-1"></i>删除
                            </button>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">内容</label>
                        <textarea class="memo-content block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" rows="2">${memo.content || ''}</textarea>
                    </div>
                `;
                memosList.appendChild(memoItem);
            });
        }
        
        initContactDeleteButtons();
        initMemoDeleteButtons();
    } else {
        title.textContent = '新增客户';
        form.reset();
        document.getElementById('customerId').value = '';
        
        // 重置联系人列表
        const contactsList = document.getElementById('contactsList');
        contactsList.innerHTML = '';
        addContactItem();
        
        // 清空备忘录列表
        const memosList = document.getElementById('memosList');
        memosList.innerHTML = '';
    }
    
    modal.classList.remove('hidden');
};

// 关闭客户模态框
window.closeCustomerModalFunc = function() {
    const modal = document.getElementById('customerModal');
    modal.classList.add('hidden');
};

// 保存客户
window.saveCustomer = function() {
    const id = document.getElementById('customerId').value;
    
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
    
    const customerData = {
        shop_name: document.getElementById('shopName').value,
        douyin_name: document.getElementById('douyinName').value,
        company_name: document.getElementById('companyName').value,
        credit_code: document.getElementById('creditCode').value,
        legal_person: document.getElementById('legalPerson').value,
        registered_capital: document.getElementById('registeredCapital').value,
        industry: document.getElementById('industry').value,
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
        tags: []
    };
    
    let result;
    if (id) {
        result = db.updateCustomer(parseInt(id), customerData);
    } else {
        result = db.addCustomer(customerData);
    }
    
    if (result.success) {
        alert(id ? '更新成功' : '添加成功');
        closeCustomerModalFunc();
        loadCustomersData();
    } else {
        alert('操作失败: ' + result.message);
    }
};

// 加载客户数据
window.loadCustomersData = function() {
    const customersList = document.getElementById('customersList');
    if (!customersList) return;
    
    const result = db.getCustomers();
    if (result.success) {
        customersList.innerHTML = '';
        result.data.forEach(customer => {
            const tr = document.createElement('tr');
            const mainContact = customer.contacts && customer.contacts.length > 0 ? customer.contacts[0] : {};
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${customer.shop_name || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${mainContact.name || '-'} (${mainContact.phone || '-'})</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${customer.industry || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(customer.status)}">
                        ${customer.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="editCustomer(${customer.id})">编辑</button>
                    <button class="text-red-600 hover:text-red-900" onclick="deleteCustomer(${customer.id})">删除</button>
                </td>
            `;
            customersList.appendChild(tr);
        });
    }
};

// 获取状态徽章样式
window.getStatusBadgeClass = function(status) {
    switch (status) {
        case '合作中': return 'bg-green-100 text-green-800';
        case '跟进中': return 'bg-yellow-100 text-yellow-800';
        case '已流失': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

// 编辑客户
window.editCustomer = function(id) {
    const result = db.getCustomers();
    const customer = result.data.find(c => c.id === id);
    if (customer) {
        openCustomerModal(customer);
    }
};

// 删除客户
window.deleteCustomer = function(id) {
    if (confirm('确定要删除此客户吗？')) {
        const result = db.deleteCustomer(id);
        if (result.success) {
            loadCustomersData();
        } else {
            alert('删除失败: ' + result.message);
        }
    }
};
