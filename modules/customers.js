// 客户管理模块（三栏式布局版）
// v24.3.2 - 重构为三栏式布局：左侧列表 + 中间详情 + 右侧操作
let customerPageSize = 20;
let customerCurrentPage = 1;
let selectedCustomerId = null;  // 当前选中的客户ID
let currentCustomerTab = 'overview';  // 当前Tab页
let cachedCustomerDetail = null;  // 缓存的客户详情

window.initCustomersPage = function() {
    console.log('初始化客户管理页面（三栏式布局版）');
    loadCustomersData();
    
    const addCustomerBtn = SafeUtils.safeGetElement('addCustomerBtn', 'initCustomersPage');
    const customerModal = SafeUtils.safeGetElement('customerModal', 'initCustomersPage');
    const closeButtons = document.querySelectorAll('#closeCustomerModal, .close-customer-modal');
    const customerForm = SafeUtils.safeGetElement('customerForm', 'initCustomersPage');
    
    // 初始化可配置字段的下拉选项
    initConfigurableFields();
    // 初始化行业筛选下拉框
    initIndustryFilter();
    
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

// 初始化行业筛选下拉框
function initIndustryFilter() {
    const industryFilter = document.getElementById('customerIndustryFilter');
    if (!industryFilter) return;
    
    const db = window.db || window;
    const settings = db.getSystemSettings ? db.getSystemSettings() : {};
    
    industryFilter.innerHTML = '<option value="">全部行业</option>';
    if (settings.industries && Array.isArray(settings.industries)) {
        settings.industries.forEach(industry => {
            industryFilter.innerHTML += `<option value="${industry}">${industry}</option>`;
        });
    }
}

// 初始化可配置字段
function initConfigurableFields() {
    const db = window.db || window;
    const settings = db.getSystemSettings ? db.getSystemSettings() : {};
    
    // 填充合作模式下拉选项
    const cooperationModeSelect = SafeUtils.safeGetElement('cooperationMode', 'initConfigurableFields');
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
    const industrySelect = SafeUtils.safeGetElement('industry', 'initConfigurableFields');
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
    const followerSelect = SafeUtils.safeGetElement('followerId', 'initConfigurableFields');
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
window.openCustomerModal = async function(customerId = null) {
    const modal = SafeUtils.safeGetElement('customerModal', 'openCustomerModal');
    const modalTitle = SafeUtils.safeGetElement('customerModalTitle', 'openCustomerModal');
    const form = SafeUtils.safeGetElement('customerForm', 'openCustomerModal');
    
    if (!modal || !form) {
        console.error('找不到客户模态框或表单元素');
        return;
    }
    
    // 重置表单
    form.reset();
    SafeUtils.safeSetValue('customerId', '');
    
    // 清空联系人列表（保留一个空行）
    const contactsList = SafeUtils.safeGetElement('contactsList', 'openCustomerModal');
    if (contactsList) {
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
    }
    
    // 清空备忘录列表
    SafeUtils.safeSetHTML('memosList', '', false);
    
    // 清空附件列表
    SafeUtils.safeSetHTML('attachmentsList', '', false);
    
    // 重置唯一标识字段的禁用状态
    const merchantIdInput = document.getElementById('merchantId');
    const creditCodeInput = document.getElementById('creditCode');
    if (merchantIdInput) merchantIdInput.disabled = false;
    if (creditCodeInput) creditCodeInput.disabled = false;
    
    if (customerId) {
        // 编辑模式 - 使用API获取客户详情
        try {
            const result = await window.api.getCustomer(customerId);
            if (result.success && result.data) {
                const customer = result.data;
                
                if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-user-edit mr-2 text-blue-600"></i>编辑客户';
                
                // 填充基础信息
                SafeUtils.safeSetValue('customerId', customer.id);
                SafeUtils.safeSetValue('merchantId', customer.merchant_id || '');
                SafeUtils.safeSetValue('shopName', customer.shop_name || '');
                SafeUtils.safeSetValue('douyinName', customer.douyin_name || '');
                SafeUtils.safeSetValue('customerCompanyName', customer.company_name || '');
                SafeUtils.safeSetValue('creditCode', customer.credit_code || '');
                SafeUtils.safeSetValue('legalPerson', customer.legal_person || '');
                
                // 填充其他字段（使用安全访问）
                const setFieldValue = (id, value) => {
                    const el = document.getElementById(id);
                    if (el) el.value = value || '';
                };
                
                setFieldValue('registeredCapital', customer.registered_capital);
                setFieldValue('cooperationMode', customer.cooperation_mode);
                setFieldValue('category', customer.category);
                setFieldValue('industry', customer.industry);
                setFieldValue('followerId', customer.follower_id);
                setFieldValue('customerStatus', customer.status || '合作中');
                setFieldValue('businessAddress', customer.business_address);
                setFieldValue('operatingAddress', customer.operating_address);
                setFieldValue('businessStaff', customer.business_staff);
                setFieldValue('serviceStaff', customer.service_staff);
                setFieldValue('operationStaff', customer.operation_staff);
                setFieldValue('managementStaff', customer.management_staff);
                setFieldValue('team', customer.team);
                setFieldValue('region', customer.region);
                setFieldValue('project', customer.project);
                setFieldValue('company', customer.company);
                
                // 唯一标识字段设为只读（编辑模式）
                if (merchantIdInput && customer.merchant_id) {
                    merchantIdInput.disabled = true;
                }
                if (creditCodeInput && customer.credit_code) {
                    creditCodeInput.disabled = true;
                }
                
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
            } else {
                console.error('获取客户详情失败:', result.message);
                showNotification('获取客户详情失败', 'error');
                return;
            }
        } catch (error) {
            console.error('获取客户详情异常:', error);
            showNotification('获取客户详情失败', 'error');
            return;
        }
    } else {
        // 新增模式
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-user-tie mr-2 text-blue-600"></i>新增客户';
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
    // 清除从订单页打开的标记
    window._addCustomerFromOrder = false;
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
            
            // 如果是编辑模式且有选中的客户，刷新详情页
            if (id && selectedCustomerId && parseInt(id) === selectedCustomerId) {
                loadCustomerDetail(selectedCustomerId);
            }
            
            // 如果是从订单页新增客户，执行回填回调
            if (!id && typeof window.onCustomerSavedFromOrder === 'function') {
                const newCustomerId = result.data?.id || result.id;
                const newCustomerName = customerData.shop_name;
                window.onCustomerSavedFromOrder(newCustomerId, newCustomerName);
            }
            return;
        } else {
            throw new Error(result.message || 'API返回失败');
        }
    } catch (error) {
        window.Utils.handleApiError(error, '保存客户');
    }
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
        } else {
            throw new Error('API返回失败');
        }
    } catch (error) {
        window.Utils.handleApiError(error, '加载客户数据');
    }
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

// 渲染客户列表（三栏式布局 - 左侧简洁列表）
function renderCustomersList(customers, totalCount, totalPages) {
    const customersListContainer = document.getElementById('customersList');
    const totalCountEl = document.getElementById('customerTotalCount');
    
    if (!customersListContainer) return;
    
    // 更新总数显示
    if (totalCountEl) totalCountEl.textContent = totalCount;
    
    customersListContainer.innerHTML = '';
    
    if (customers.length === 0) {
        customersListContainer.innerHTML = `
            <div class="p-8 text-center text-gray-400">
                <i class="fas fa-users text-3xl mb-2"></i>
                <p>未找到客户数据</p>
            </div>
        `;
        renderPagination(0, 0, 0);
        return;
    }
    
    // 获取所有用户信息用于显示跟进人
    const db = window.db || window;
    const usersResult = db.getUsers ? db.getUsers() : [];
    const users = Array.isArray(usersResult) ? usersResult : (usersResult.data || []);
    
    customers.forEach((customer, index) => {
        const statusBadge = getStatusBadgeClass(customer.status);
        const follower = customer.follower_id ? users.find(u => u.id === customer.follower_id) : null;
        const followerName = follower ? follower.name : '';
        const isSelected = customer.id === selectedCustomerId;
        
        const item = document.createElement('div');
        item.className = `customer-item p-3 cursor-pointer hover:bg-blue-50 border-l-4 transition-all ${isSelected ? 'bg-blue-50 border-blue-500' : 'border-transparent'}`;
        item.setAttribute('data-id', customer.id);
        item.onclick = () => selectCustomer(customer.id);
        
        item.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-900 text-sm truncate">${customer.shop_name || '-'}</div>
                    <div class="text-xs text-gray-500 truncate">${customer.merchant_id || ''}</div>
                </div>
                <span class="ml-2 px-1.5 py-0.5 text-xs rounded ${statusBadge}">${customer.status || '-'}</span>
            </div>
            <div class="mt-1 flex items-center text-xs text-gray-400">
                ${customer.industry ? `<span class="mr-2">${customer.industry}</span>` : ''}
                ${followerName ? `<span><i class="fas fa-user-tie mr-1"></i>${followerName}</span>` : ''}
            </div>
        `;
        
        customersListContainer.appendChild(item);
    });
    
    // 渲染分页控件
    renderPagination(totalCount, totalPages, customerCurrentPage);
    
    // 如果没有选中客户，默认选中第一个
    if (!selectedCustomerId && customers.length > 0) {
        selectCustomer(customers[0].id);
    } else if (selectedCustomerId) {
        // 刷新当前选中客户的详情
        loadCustomerDetail(selectedCustomerId);
    }
}

// 渲染分页控件（简洁版 - 适应左侧栏）
function renderPagination(totalCount, totalPages, currentPage) {
    const paginationContainer = document.getElementById('customerPagination');
    if (!paginationContainer) return;
    
    if (totalCount === 0 || totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let html = `
        <div class="flex items-center justify-center space-x-1">
            <button data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} 
                class="customer-page-btn px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                <i class="fas fa-chevron-left"></i>
            </button>
            <span class="text-xs text-gray-600">${currentPage} / ${totalPages}</span>
            <button data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} 
                class="customer-page-btn px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    
    paginationContainer.innerHTML = html;
    
    // 添加事件监听器
    addCustomerPaginationListeners();
}

// 添加分页事件监听器
function addCustomerPaginationListeners() {
    // 页码按钮事件
    const pageButtons = document.querySelectorAll('.customer-page-btn');
    pageButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (this.disabled) return;
            
            const page = parseInt(this.getAttribute('data-page'));
            if (!isNaN(page) && page > 0) {
                window.changeCustomerPage(page);
            }
        });
    });
}

// 切换页码
window.changeCustomerPage = function(page) {
    if (page < 1) return;
    
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
            } else {
                throw new Error(result.message || 'API返回失败');
            }
        } catch (error) {
            window.Utils.handleApiError(error, '删除客户');
        }
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

// ==================== 三栏式布局交互函数 ====================

// 选中客户（高亮显示 + 加载详情）
window.selectCustomer = function(customerId) {
    if (selectedCustomerId === customerId) return;  // 已选中，不重复操作
    
    selectedCustomerId = customerId;
    
    // 更新左侧列表高亮
    document.querySelectorAll('.customer-item').forEach(item => {
        const id = parseInt(item.getAttribute('data-id'));
        if (id === customerId) {
            item.classList.add('bg-blue-50', 'border-blue-500');
            item.classList.remove('border-transparent');
        } else {
            item.classList.remove('bg-blue-50', 'border-blue-500');
            item.classList.add('border-transparent');
        }
    });
    
    // 加载客户详情
    loadCustomerDetail(customerId);
};

// 加载客户详情
window.loadCustomerDetail = async function(customerId) {
    if (!customerId) return;
    
    // 隐藏空状态提示
    const noSelection = document.getElementById('customerNoSelection');
    if (noSelection) noSelection.classList.add('hidden');
    
    try {
        // 调用API获取客户详情
        const result = await window.api.getCustomer(customerId);
        if (result.success && result.data) {
            cachedCustomerDetail = result.data;
            renderCustomerOverview(result.data);
            
            // 加载统计数据
            loadCustomerStats(customerId);
            
            // 根据当前Tab加载对应数据
            if (currentCustomerTab === 'orders') {
                loadCustomerOrders(customerId);
            } else if (currentCustomerTab === 'followups') {
                loadCustomerFollowups(customerId);
            } else if (currentCustomerTab === 'payments') {
                loadCustomerPayments(customerId);
            }
        }
    } catch (error) {
        console.error('加载客户详情失败:', error);
    }
};

// 渲染客户概览页
function renderCustomerOverview(customer) {
    if (!customer) return;
    
    // 显示概览Tab
    showCustomerTab('overview');
    
    // 填充客户核心信息
    const nameEl = document.getElementById('customerDetailName');
    const statusEl = document.getElementById('customerDetailStatus');
    const merchantIdEl = document.getElementById('customerDetailMerchantId');
    const industryEl = document.getElementById('customerDetailIndustry');
    const followerEl = document.getElementById('customerDetailFollower');
    const contactEl = document.getElementById('customerDetailContact');
    const phoneEl = document.getElementById('customerDetailPhone');
    const createdAtEl = document.getElementById('customerDetailCreatedAt');
    const addressEl = document.getElementById('customerDetailAddress');
    
    if (nameEl) nameEl.textContent = customer.shop_name || '-';
    if (statusEl) {
        statusEl.textContent = customer.status || '-';
        statusEl.className = `px-3 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(customer.status)}`;
    }
    if (merchantIdEl) merchantIdEl.textContent = customer.merchant_id || '-';
    if (industryEl) industryEl.textContent = customer.industry || '-';
    
    // 获取跟进人姓名
    if (followerEl) {
        if (customer.follower_name) {
            followerEl.textContent = customer.follower_name;
        } else {
            followerEl.textContent = '-';
        }
    }
    
    // 联系人信息
    if (contactEl || phoneEl) {
        const firstContact = customer.contacts && customer.contacts.length > 0 ? customer.contacts[0] : null;
        if (contactEl) contactEl.textContent = firstContact ? (firstContact.name || '-') : '-';
        if (phoneEl) phoneEl.textContent = firstContact ? (firstContact.phone || '-') : '-';
    }
    
    if (createdAtEl) {
        createdAtEl.textContent = customer.created_at ? customer.created_at.split(' ')[0] : '-';
    }
    if (addressEl) {
        addressEl.textContent = customer.business_address || customer.operating_address || '-';
    }
    
    // 更新右侧归属信息
    const teamEl = document.getElementById('customerQuickTeam');
    const businessStaffEl = document.getElementById('customerQuickBusinessStaff');
    const projectEl = document.getElementById('customerQuickProject');
    
    if (teamEl) teamEl.textContent = customer.team || '-';
    if (businessStaffEl) businessStaffEl.textContent = customer.business_staff || '-';
    if (projectEl) projectEl.textContent = customer.project || '-';
}

// 加载客户统计数据
async function loadCustomerStats(customerId) {
    try {
        const result = await fetch(`/api/customers/${customerId}/stats`, {
            credentials: 'include'
        });
        const data = await result.json();
        
        if (data.success && data.data) {
            const stats = data.data;
            
            // 更新概览页统计卡片
            const ordersEl = document.getElementById('customerStatOrders');
            const amountEl = document.getElementById('customerStatAmount');
            const pendingEl = document.getElementById('customerStatPending');
            const lastOrderEl = document.getElementById('customerStatLastOrder');
            
            if (ordersEl) ordersEl.textContent = stats.total_orders || 0;
            if (amountEl) amountEl.textContent = '¥' + formatNumber(stats.total_amount || 0);
            if (pendingEl) pendingEl.textContent = '¥' + formatNumber(stats.pending_amount || 0);
            if (lastOrderEl) lastOrderEl.textContent = stats.last_order_date || '-';
            
            // 更新右侧数据快照
            const monthOrdersEl = document.getElementById('customerQuickMonthOrders');
            const monthAmountEl = document.getElementById('customerQuickMonthAmount');
            const lastFollowupEl = document.getElementById('customerQuickLastFollowup');
            const balanceEl = document.getElementById('customerQuickBalance');
            
            if (monthOrdersEl) monthOrdersEl.textContent = (stats.month_orders || 0) + ' 单';
            if (monthAmountEl) monthAmountEl.textContent = '¥' + formatNumber(stats.month_amount || 0);
            if (lastFollowupEl) lastFollowupEl.textContent = stats.last_followup_date || '-';
            if (balanceEl) balanceEl.textContent = '¥' + formatNumber(stats.balance || 0);
            
            // 更新归属信息（从最后一笔有效订单提取）
            const teamEl = document.getElementById('customerQuickTeam');
            const businessStaffEl = document.getElementById('customerQuickBusinessStaff');
            const projectEl = document.getElementById('customerQuickProject');
            
            if (teamEl) teamEl.textContent = stats.responsible_team || '-';
            if (businessStaffEl) businessStaffEl.textContent = stats.business_person || '-';
            if (projectEl) projectEl.textContent = stats.project || '-';
        } else {
            console.warn('加载统计数据失败:', data.message);
        }
    } catch (error) {
        console.error('加载客户统计数据失败:', error);
    }
}

// 格式化数字
function formatNumber(num) {
    return parseFloat(num || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Tab切换
window.switchCustomerTab = function(tabName) {
    if (!selectedCustomerId) {
        showNotification('请先选择一个客户', 'warning');
        return;
    }
    
    currentCustomerTab = tabName;
    
    // 更新Tab按钮样式
    document.querySelectorAll('.customer-tab-btn').forEach(btn => {
        const tab = btn.getAttribute('data-tab');
        if (tab === tabName) {
            btn.classList.add('border-blue-500', 'text-blue-600');
            btn.classList.remove('border-transparent', 'text-gray-500');
        } else {
            btn.classList.remove('border-blue-500', 'text-blue-600');
            btn.classList.add('border-transparent', 'text-gray-500');
        }
    });
    
    // 显示对应Tab内容
    showCustomerTab(tabName);
    
    // 加载Tab数据
    if (tabName === 'overview') {
        if (cachedCustomerDetail) {
            renderCustomerOverview(cachedCustomerDetail);
        }
    } else if (tabName === 'orders') {
        loadCustomerOrders(selectedCustomerId);
    } else if (tabName === 'followups') {
        loadCustomerFollowups(selectedCustomerId);
    } else if (tabName === 'payments') {
        loadCustomerPayments(selectedCustomerId);
    }
};

// 显示指定Tab内容
function showCustomerTab(tabName) {
    const tabs = ['tabOverview', 'tabOrders', 'tabFollowups', 'tabPayments'];
    tabs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.toggle('hidden', id !== 'tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
        }
    });
}

// 加载客户订单记录
window.loadCustomerOrders = async function(customerId) {
    const tbody = document.getElementById('customerOrdersList');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>';
    
    try {
        const result = await fetch(`/api/customers/${customerId}/orders`, {
            credentials: 'include'
        });
        const data = await result.json();
        
        if (data.success && data.data && data.data.length > 0) {
            tbody.innerHTML = '';
            data.data.forEach(order => {
                const statusClass = order.payment_status === '已收款' ? 'bg-green-100 text-green-800' : 
                                   order.payment_status === '部分收款' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800';
                
                tbody.innerHTML += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm text-gray-900">${order.order_date || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-600">${order.items_summary || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-900 text-right">¥${formatNumber(order.final_amount || 0)}</td>
                        <td class="px-4 py-3 text-center">
                            <span class="px-2 py-1 text-xs rounded ${statusClass}">${order.payment_status || '-'}</span>
                        </td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-400">暂无订单记录</td></tr>';
        }
    } catch (error) {
        console.error('加载客户订单失败:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-red-400">加载失败</td></tr>';
    }
};

// 加载客户跟进记录
window.loadCustomerFollowups = async function(customerId) {
    const container = document.getElementById('customerFollowupsList');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center text-gray-400 py-8"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</div>';
    
    try {
        const result = await fetch(`/api/customers/${customerId}/followups`, {
            credentials: 'include'
        });
        const data = await result.json();
        
        if (data.success && data.data && data.data.length > 0) {
            container.innerHTML = '';
            data.data.forEach(followup => {
                const time = followup.created_at ? new Date(followup.created_at).toLocaleString('zh-CN') : '-';
                
                const itemDiv = document.createElement('div');
                itemDiv.className = 'border-l-4 border-green-400 pl-4 py-3 bg-gray-50 rounded-r-lg mb-3';
                itemDiv.innerHTML = `
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    <i class="fas fa-${getFollowupIcon(followup.type)} mr-1"></i>${followup.type || '跟进记录'}
                                </span>
                                <span class="text-xs text-gray-500">${time}</span>
                            </div>
                            <p class="text-sm text-gray-700 whitespace-pre-line">${followup.content || '-'}</p>
                            <div class="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                ${followup.creator_name ? `<span><i class="fas fa-user mr-1"></i>${followup.creator_name}</span>` : ''}
                                ${followup.next_followup_date ? `<span class="text-orange-500"><i class="fas fa-bell mr-1"></i>下次跟进: ${followup.next_followup_date}</span>` : ''}
                            </div>
                        </div>
                        <div class="flex items-center gap-2 ml-4">
                            <button class="edit-followup-btn text-blue-500 hover:text-blue-700 text-sm" title="编辑">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-followup-btn text-red-400 hover:text-red-600 text-sm" title="删除">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                
                // 绑定编辑按钮事件
                itemDiv.querySelector('.edit-followup-btn').addEventListener('click', () => {
                    editFollowupById(followup);
                });
                
                // 绑定删除按钮事件
                itemDiv.querySelector('.delete-followup-btn').addEventListener('click', () => {
                    deleteFollowup(followup.id);
                });
                
                container.appendChild(itemDiv);
            });
        } else {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-comment-slash text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-400">暂无跟进记录</p>
                    <button onclick="quickAddFollowup()" class="mt-3 text-green-600 hover:text-green-800 text-sm">
                        <i class="fas fa-plus mr-1"></i>添加第一条跟进记录
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('加载客户跟进记录失败:', error);
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-exclamation-triangle text-4xl text-red-300 mb-3"></i>
                <p class="text-red-400">数据加载失败，请稍后重试</p>
                <button onclick="loadCustomerFollowups(${customerId})" class="mt-3 text-blue-600 hover:text-blue-800 text-sm">
                    <i class="fas fa-redo mr-1"></i>重新加载
                </button>
            </div>
        `;
    }
};

// 根据跟进方式获取图标
function getFollowupIcon(type) {
    const iconMap = {
        '电话沟通': 'phone',
        '微信沟通': 'comment',
        '线下拜访': 'walking',
        '视频会议': 'video',
        '邮件沟通': 'envelope',
        '其他': 'sticky-note'
    };
    return iconMap[type] || 'comment-dots';
}


// 加载客户收款记录
window.loadCustomerPayments = async function(customerId) {
    const tbody = document.getElementById('customerPaymentsList');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>';
    
    try {
        const result = await fetch(`/api/customers/${customerId}/payments`, {
            credentials: 'include'
        });
        const data = await result.json();
        
        if (data.success && data.data && data.data.length > 0) {
            tbody.innerHTML = '';
            data.data.forEach(payment => {
                tbody.innerHTML += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm text-gray-900">${payment.payment_date || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-600">${payment.order_info || '-'}</td>
                        <td class="px-4 py-3 text-sm text-green-600 text-right">¥${formatNumber(payment.amount || 0)}</td>
                        <td class="px-4 py-3 text-sm text-gray-600">${payment.payment_method || '-'}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-400">暂无收款记录</td></tr>';
        }
    } catch (error) {
        console.error('加载客户收款记录失败:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-red-400">加载失败</td></tr>';
    }
};

// ==================== 右侧快捷操作函数 ====================

// 快速为当前客户创建订单
window.quickCreateOrderForCustomer = function() {
    if (!selectedCustomerId || !cachedCustomerDetail) {
        showNotification('请先选择一个客户', 'warning');
        return;
    }
    
    // 打开订单创建模态框并预填客户
    if (typeof window.openAddOrderModal === 'function') {
        window.openAddOrderModal();
        
        // 延迟填充客户信息（等模态框打开）
        setTimeout(() => {
            const customerInput = document.getElementById('orderCustomerSearch');
            if (customerInput) {
                customerInput.value = cachedCustomerDetail.shop_name;
                customerInput.setAttribute('data-customer-id', selectedCustomerId);
                // 触发客户选中事件
                if (typeof window.setOrderCustomer === 'function') {
                    window.setOrderCustomer(selectedCustomerId, cachedCustomerDetail.shop_name);
                }
            }
        }, 200);
    } else {
        showNotification('订单创建功能不可用', 'error');
    }
};

// 快速添加跟进记录
window.quickAddFollowup = function() {
    if (!selectedCustomerId) {
        showNotification('请先选择一个客户', 'warning');
        return;
    }
    
    // 打开跟进记录模态框
    openFollowupModal(selectedCustomerId);
};

// 编辑当前选中客户
window.editSelectedCustomer = function() {
    if (!selectedCustomerId) {
        showNotification('请先选择一个客户', 'warning');
        return;
    }
    
    window.openCustomerModal(selectedCustomerId);
};

// ==================== 跟进记录模态框函数 ====================

// 打开跟进记录模态框
window.openFollowupModal = function(customerId, followupId = null) {
    const modal = document.getElementById('followupModal');
    const form = document.getElementById('followupForm');
    const title = document.getElementById('followupModalTitle');
    
    if (!modal || !form) {
        showNotification('跟进模态框未加载', 'error');
        return;
    }
    
    // 重置表单
    form.reset();
    document.getElementById('followupId').value = '';
    document.getElementById('followupCustomerId').value = customerId;
    
    // 设置默认时间为当前时间
    const now = new Date();
    const localDateTime = now.toISOString().slice(0, 16);
    document.getElementById('followupTime').value = localDateTime;
    
    // 确定默认跟进人：优先客户业务员，其次当前登录用户
    let defaultUserId = null;
    if (cachedCustomerDetail && cachedCustomerDetail.follower_id) {
        // 客户有对应业务员
        defaultUserId = cachedCustomerDetail.follower_id;
    } else if (window.currentUser && window.currentUser.id) {
        // 默认当前登录用户
        defaultUserId = window.currentUser.id;
    }
    
    // 加载跟进人下拉框（传入默认值）
    loadFollowupUsers(defaultUserId);
    
    if (followupId) {
        // 编辑模式
        title.textContent = '编辑跟进记录';
        loadFollowupDetail(followupId);
    } else {
        // 新增模式
        title.textContent = '添加跟进记录';
    }
    
    modal.classList.remove('hidden');
};

// 关闭跟进记录模态框
window.closeFollowupModal = function() {
    const modal = document.getElementById('followupModal');
    if (modal) modal.classList.add('hidden');
};

// 加载跟进人下拉框
async function loadFollowupUsers(defaultUserId = null) {
    const select = document.getElementById('followupUserId');
    if (!select) return;
    
    try {
        const result = await window.api.getUsers();
        if (result.success && result.data) {
            select.innerHTML = '<option value="">请选择</option>';
            // 状态字段为 enabled（数据库实际值）
            result.data.filter(u => u.status === 'enabled').forEach(user => {
                select.innerHTML += `<option value="${user.id}">${user.name}</option>`;
            });
            
            // 设置默认值
            if (defaultUserId) {
                select.value = defaultUserId;
            }
        }
    } catch (error) {
        console.error('加载跟进人列表失败:', error);
    }
}

// 加载跟进记录详情（编辑时）
async function loadFollowupDetail(followupId) {
    // 从当前列表中查找（简化实现）
    // 实际可以调用API获取单条记录
}

// 保存跟进记录
window.saveFollowup = async function(event) {
    event.preventDefault();
    
    const customerId = document.getElementById('followupCustomerId').value;
    const followupId = document.getElementById('followupId').value;
    
    const data = {
        type: document.getElementById('followupType').value,
        content: document.getElementById('followupContent').value,
        followup_time: document.getElementById('followupTime').value,
        user_id: document.getElementById('followupUserId').value || null,
        next_followup_date: document.getElementById('followupNextDate').value || null
    };
    
    if (!data.type || !data.content) {
        showNotification('请填写必填字段', 'warning');
        return;
    }
    
    try {
        let result;
        if (followupId) {
            // 更新
            result = await fetch(`/api/followups/${followupId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            }).then(r => r.json());
        } else {
            // 新增
            result = await fetch(`/api/customers/${customerId}/followups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            }).then(r => r.json());
        }
        
        if (result.success) {
            showNotification(followupId ? '更新成功' : '添加成功', 'success');
            closeFollowupModal();
            
            // 刷新跟进记录Tab
            if (selectedCustomerId) {
                loadCustomerFollowups(selectedCustomerId);
                // 刷新统计数据
                loadCustomerStats(selectedCustomerId);
            }
        } else {
            showNotification(result.message || '操作失败', 'error');
        }
    } catch (error) {
        console.error('保存跟进记录失败:', error);
        showNotification('保存失败，请稍后重试', 'error');
    }
};

// 编辑跟进记录（通过对象参数）
window.editFollowupById = function(followup) {
    openFollowupModal(selectedCustomerId, followup.id);
    
    // 填充数据
    setTimeout(() => {
        document.getElementById('followupId').value = followup.id;
        document.getElementById('followupType').value = followup.type || '';
        document.getElementById('followupContent').value = followup.content || '';
        if (followup.created_at) {
            // 转换时间格式
            const dt = new Date(followup.created_at);
            document.getElementById('followupTime').value = dt.toISOString().slice(0, 16);
        }
        if (followup.user_id) {
            document.getElementById('followupUserId').value = followup.user_id;
        }
        if (followup.next_followup_date) {
            document.getElementById('followupNextDate').value = followup.next_followup_date;
        }
    }, 150);
};

// 编辑跟进记录（兼容旧参数方式）
window.editFollowup = function(followupId, type, content, time, userId, nextDate) {
    openFollowupModal(selectedCustomerId, followupId);
    
    // 填充数据
    setTimeout(() => {
        document.getElementById('followupId').value = followupId;
        document.getElementById('followupType').value = type || '';
        document.getElementById('followupContent').value = content || '';
        if (time) {
            // 转换时间格式
            const dt = new Date(time);
            document.getElementById('followupTime').value = dt.toISOString().slice(0, 16);
        }
        if (userId) {
            document.getElementById('followupUserId').value = userId;
        }
        if (nextDate) {
            document.getElementById('followupNextDate').value = nextDate;
        }
    }, 100);
};

// 删除跟进记录
window.deleteFollowup = async function(followupId) {
    if (!confirm('确定要删除这条跟进记录吗？')) return;
    
    try {
        const result = await fetch(`/api/followups/${followupId}`, {
            method: 'DELETE',
            credentials: 'include'
        }).then(r => r.json());
        
        if (result.success) {
            showNotification('删除成功', 'success');
            if (selectedCustomerId) {
                loadCustomerFollowups(selectedCustomerId);
            }
        } else {
            showNotification(result.message || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除跟进记录失败:', error);
        showNotification('删除失败，请稍后重试', 'error');
    }
};

// ========== 客户信息快速录入功能 ==========

/**
 * 解析客户信息文本，提取姓名、手机号、地址
 * 算法优化：双向扫描+语义增强，优先从末尾提取姓名
 * @param {string} text - 输入的客户信息文本
 * @returns {object} - {name: '', phone: '', address: ''}
 */
function parseCustomerInfo(text) {
    const result = { name: '', phone: '', address: '' };
    if (!text || typeof text !== 'string') return result;
    
    // 预处理：统一分隔符为空格，清理多余空白
    let cleanText = text
        .replace(/[，,、；;\n\r\t]+/g, ' ')  // 统一分隔符为空格
        .replace(/\s+/g, ' ')               // 合并连续空格
        .trim();
    
    // 清理常见干扰词
    const noiseWords = ['联系电话', '电话', '手机', '地址', '姓名', '收件人', '联系人', '收货人'];
    noiseWords.forEach(word => {
        const regex = new RegExp(`(^|\\s)${word}[：:]?(?=\\s|$|\\d)`, 'g');
        cleanText = cleanText.replace(regex, ' ');
    });
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    
    // 地址关键词
    const addressKeywords = ['省', '市', '区', '县', '镇', '乡', '街道', '村', '路', '号', '弄', '巷', '幢', '栋', '单元', '室', '楼'];
    
    // 步骤1：提取并移除手机号（强分隔符）
    const phoneReg = /[\(（]?(1[3-9]\d{9})[\)）-]?/;
    const phoneMatch = cleanText.match(phoneReg);
    if (phoneMatch) {
        result.phone = phoneMatch[1];
        cleanText = cleanText.replace(phoneMatch[0], ' ').replace(/\s+/g, ' ').trim();
    }
    
    // 步骤2：优先从文本末尾提取姓名（处理"翁志伟收"场景）
    // 查找末尾的"收/先生/女士/小姐"等后缀
    const suffixMatch = cleanText.match(/([\u4e00-\u9fa5]{2,4})(收|先生|女士|小姐)$/);
    if (suffixMatch) {
        const candidateName = suffixMatch[1];
        // 验证是否为合法姓名（不含地址关键词）
        const isValidName = !addressKeywords.some(kw => candidateName.includes(kw));
        if (isValidName) {
            result.name = candidateName;
            // 移除姓名和后缀
            cleanText = cleanText.replace(suffixMatch[0], '').trim();
        }
    }
    
    // 步骤3：如果未从末尾找到姓名，尝试从开头正向扫描
    if (!result.name) {
        // 查找第一个地址起始词的位置
        const addressStartWords = ['省', '市', '区', '县', '镇', '乡', '街道', '村'];
        let addressStartIndex = -1;
        for (let i = 0; i < cleanText.length; i++) {
            if (addressStartWords.includes(cleanText[i])) {
                addressStartIndex = i;
                break;
            }
        }
        
        if (addressStartIndex > 0) {
            // 地址起始词之前的部分为候选姓名
            const candidateName = cleanText.substring(0, addressStartIndex).trim();
            const nameReg = /^[\u4e00-\u9fa5]{2,4}$/;
            const isValidName = nameReg.test(candidateName) && 
                               !addressKeywords.some(kw => candidateName.includes(kw));
            
            if (isValidName) {
                result.name = candidateName;
                cleanText = cleanText.substring(addressStartIndex).trim();
            }
        }
    }
    
    // 步骤4：剩余文本即为地址
    result.address = cleanText.replace(/(收|先生|女士|小姐|，|。|；)$/g, '').trim();
    
    // 步骤5：如果姓名仍然为空，尝试从地址开头提取（如"翁志伟福建省..."）
    if (!result.name && result.address) {
        const addressStartWords = ['省', '市', '区', '县', '镇', '乡', '街道', '村'];
        for (let len = 4; len >= 2; len--) {
            if (result.address.length > len) {
                const prefix = result.address.substring(0, len);
                const afterPrefix = result.address[len];
                // 检查前缀后是否紧跟地址起始词
                if (addressStartWords.includes(afterPrefix)) {
                    const nameReg = /^[\u4e00-\u9fa5]{2,4}$/;
                    if (nameReg.test(prefix) && !addressKeywords.some(kw => prefix.includes(kw))) {
                        result.name = prefix;
                        result.address = result.address.substring(len).trim();
                        break;
                    }
                }
            }
        }
    }
    
    // 步骤6：如果姓名仍为空，尝试从地址末尾提取（无后缀的情况）
    if (!result.name && result.address) {
        // 查找地址末尾的潜在姓名（如"...131号翁志伟"）
        const tailMatch = result.address.match(/([\u4e00-\u9fa5]{2,4})$/);
        if (tailMatch) {
            const candidateName = tailMatch[1];
            // 检查该文本是否不含地址关键词
            const isValidName = !addressKeywords.some(kw => candidateName.includes(kw));
            // 检查姓名前是否为数字或地址结束符（如"号"）
            const beforeName = result.address.substring(0, result.address.length - candidateName.length);
            const endsWithAddressMarker = /[\d号楼室单元幢栋]$/.test(beforeName);
            if (isValidName && endsWithAddressMarker) {
                result.name = candidateName;
                result.address = beforeName.trim();
            }
        }
    }
    
    return result;
}

/**
 * 一键识别并填充客户信息
 */
window.parseAndFillCustomerInfo = function() {
    const textInput = document.getElementById('customerInfoText');
    const tipEl = document.getElementById('parseResultTip');
    
    if (!textInput) {
        console.error('找不到客户信息输入框');
        return;
    }
    
    const inputText = textInput.value.trim();
    if (!inputText) {
        showParseTip(tipEl, '请先输入或粘贴客户信息文本', 'error');
        return;
    }
    
    // 解析信息
    const customerInfo = parseCustomerInfo(inputText);
    
    // 填充表单字段
    // 联系人姓名（第一个联系人）
    const contactNameInputs = document.querySelectorAll('#contactsList .contact-name');
    if (contactNameInputs.length > 0 && customerInfo.name) {
        contactNameInputs[0].value = customerInfo.name;
    }
    
    // 联系人电话（第一个联系人）
    const contactPhoneInputs = document.querySelectorAll('#contactsList .contact-phone');
    if (contactPhoneInputs.length > 0 && customerInfo.phone) {
        contactPhoneInputs[0].value = customerInfo.phone;
    }
    
    // 地址填充到经营地址（更常用）
    const operatingAddressInput = document.getElementById('operatingAddress');
    if (operatingAddressInput && customerInfo.address) {
        operatingAddressInput.value = customerInfo.address;
    }
    
    // 同时填充到营业地址
    const businessAddressInput = document.getElementById('businessAddress');
    if (businessAddressInput && customerInfo.address) {
        businessAddressInput.value = customerInfo.address;
    }
    
    // 如果识别到姓名，也填充到店铺名（可选，用户可修改）
    const shopNameInput = document.getElementById('shopName');
    if (shopNameInput && customerInfo.name && !shopNameInput.value) {
        shopNameInput.value = customerInfo.name;
    }
    
    // 构建提示信息
    let tipParts = [];
    if (customerInfo.name) {
        tipParts.push(`姓名【${customerInfo.name}】`);
    } else {
        tipParts.push('姓名未识别');
    }
    if (customerInfo.phone) {
        tipParts.push(`手机号【${customerInfo.phone}】`);
    } else {
        tipParts.push('手机号未识别');
    }
    if (customerInfo.address) {
        // 地址太长时截断显示
        const shortAddr = customerInfo.address.length > 20 
            ? customerInfo.address.substring(0, 20) + '...' 
            : customerInfo.address;
        tipParts.push(`地址【${shortAddr}】`);
    } else {
        tipParts.push('地址未识别');
    }
    
    // 判断识别结果
    const hasAny = customerInfo.name || customerInfo.phone || customerInfo.address;
    const hasAll = customerInfo.name && customerInfo.phone && customerInfo.address;
    
    if (hasAll) {
        showParseTip(tipEl, '✅ 识别成功：' + tipParts.join('，'), 'success');
    } else if (hasAny) {
        showParseTip(tipEl, '⚠️ 部分识别：' + tipParts.join('，') + '，请手动补充', 'warning');
    } else {
        showParseTip(tipEl, '❌ 未识别到有效客户信息，请手动录入', 'error');
    }
};

/**
 * 显示识别结果提示
 */
function showParseTip(tipEl, text, type) {
    if (!tipEl) return;
    
    tipEl.textContent = text;
    tipEl.classList.remove('hidden', 'text-green-600', 'text-yellow-600', 'text-red-600', 'bg-green-50', 'bg-yellow-50', 'bg-red-50');
    
    switch (type) {
        case 'success':
            tipEl.classList.add('text-green-600', 'bg-green-50', 'p-2', 'rounded');
            break;
        case 'warning':
            tipEl.classList.add('text-yellow-600', 'bg-yellow-50', 'p-2', 'rounded');
            break;
        case 'error':
            tipEl.classList.add('text-red-600', 'bg-red-50', 'p-2', 'rounded');
            break;
    }
}
