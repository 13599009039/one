// 系统设置模块

// 全局变量存储系统设置
let systemSettings = {};

// 配置管理数据
let configurationData = {
    personnel: [
        { id: 1, name: '张三', code: 'P001', status: 'active' },
        { id: 2, name: '李四', code: 'P002', status: 'active' },
        { id: 3, name: '王五', code: 'P003', status: 'inactive' }
    ],
    department: [
        { id: 1, name: '财务部', code: 'D001', status: 'active' },
        { id: 2, name: '技术部', code: 'D002', status: 'active' },
        { id: 3, name: '销售部', code: 'D003', status: 'active' }
    ],
    expenseCategory: [
        { id: 1, name: '办公用品', code: 'EC001', status: 'active' },
        { id: 2, name: '差旅费', code: 'EC002', status: 'active' },
        { id: 3, name: '招待费', code: 'EC003', status: 'active' }
    ],
    incomeCategory: [
        { id: 1, name: '主营业务收入', code: 'IC001', status: 'active' },
        { id: 2, name: '其他业务收入', code: 'IC002', status: 'active' },
        { id: 3, name: '投资收益', code: 'IC003', status: 'active' }
    ],
    serviceProduct: [
        { id: 1, name: '软件开发', code: 'SP001', status: 'active' },
        { id: 2, name: '技术咨询', code: 'SP002', status: 'active' },
        { id: 3, name: '系统维护', code: 'SP003', status: 'active' }
    ],
    account: [
        { id: 1, name: '现金账户', code: 'A001', status: 'active' },
        { id: 2, name: '银行账户', code: 'A002', status: 'active' },
        { id: 3, name: '支付宝', code: 'A003', status: 'active' }
    ],
    accountGroup: [
        { id: 1, name: '现金账户组', code: 'AG001', status: 'active' },
        { id: 2, name: '银行账户组', code: 'AG002', status: 'active' },
        { id: 3, name: '第三方支付组', code: 'AG003', status: 'active' }
    ],
    project: [
        { id: 1, name: '项目A', code: 'PJ001', status: 'active' },
        { id: 2, name: '项目B', code: 'PJ002', status: 'active' },
        { id: 3, name: '项目C', code: 'PJ003', status: 'inactive' }
    ],
    team: [
        { id: 1, name: '开发团队', code: 'T001', status: 'active' },
        { id: 2, name: '测试团队', code: 'T002', status: 'active' }
    ],
    paymentInterface: [
        { 
            id: 1, 
            name: '微信支付', 
            type: 'wechat', 
            appId: 'wx1234567890abcdef', 
            mchId: '1234567890', 
            apiKey: 'abcdef1234567890abcdef1234567890', 
            notifyUrl: 'https://example.com/api/wechat/notify', 
            status: 'active' 
        },
        { 
            id: 2, 
            name: '支付宝', 
            type: 'alipay', 
            appId: '2021000112345678', 
            publicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----', 
            privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----', 
            notifyUrl: 'https://example.com/api/alipay/notify', 
            status: 'active' 
        },
        { 
            id: 3, 
            name: '拉卡拉支付', 
            type: 'lakala', 
            merchantId: '8888123456789001', 
            terminalId: '88881234', 
            apiSecret: 'abcdef1234567890abcdef1234567890', 
            notifyUrl: 'https://example.com/api/lakala/notify', 
            status: 'inactive' 
        }
    ]
};

// 初始化系统设置页面
function initSettingsPage() {
    console.log('=== initSettingsPage 函数开始执行 ===');
    
    // 验证 DOM 元素是否存在
    console.log('settingsPage 元素:', document.getElementById('settingsPage'));
    console.log('basicSettings 元素:', document.getElementById('basicSettings'));
    console.log('systemName 输入框:', document.getElementById('systemName'));
    
    // 加载系统设置
    console.log('调用 loadSystemSettings 函数');
    loadSystemSettings();
    
    // 加载配置管理数据
    console.log('调用 loadConfigurationDataFromStorage 函数');
    loadConfigurationDataFromStorage();
    
    // 设置事件监听器
    console.log('调用 setupSettingsEventListeners 函数');
    setupSettingsEventListeners();
    
    // 初始化配置管理
    console.log('调用 initConfigurationManagement 函数');
    initConfigurationManagement();
    
    // 初始化接口管理
    console.log('调用 initInterfacesManagement 函数');
    initInterfacesManagement();
    
    // 初始化数据备份
    console.log('调用 initBackupManagement 函数');
    initBackupManagement();
    
    // 直接显示基本设置内容
    console.log('在 initSettingsPage 中直接显示基本设置内容');
    const basicSettings = document.getElementById('basicSettings');
    if (basicSettings) {
        // 隐藏所有内容区域
        document.querySelectorAll('.settings-content').forEach(content => {
            content.classList.add('hidden');
        });
        // 显示基本设置
        basicSettings.classList.remove('hidden');
        console.log('basicSettings 的类名:', basicSettings.className);
    } else {
        console.error('在 initSettingsPage 中未找到 basicSettings 元素');
    }
    
    console.log('=== initSettingsPage 函数执行完成 ===');
}

// 加载系统设置
function loadSystemSettings() {
    console.log('加载系统设置');
    
    try {
        // 安全检查：确保db对象存在
        if (typeof window.db !== 'undefined' && db.getSystemSettings) {
            // 使用数据库接口获取系统设置
            systemSettings = db.getSystemSettings();
        } else {
            // 直接使用模拟数据
            systemSettings = getMockSystemSettings();
        }
        
        // 填充设置表单
        populateSettingsForm();
    } catch (error) {
        console.error('加载系统设置失败:', error);
        alert('加载系统设置失败，请稍后重试');
        
        // 使用模拟数据作为后备
        systemSettings = getMockSystemSettings();
        populateSettingsForm();
    }
}

// 获取模拟系统设置数据
function getMockSystemSettings() {
    return {
        system_name: '财务流水账系统',
        system_version: '3.0',
        company_name: '许昌爱佳网络科技有限公司',
        contact_email: 'admin@example.com',
        date_format: 'YYYY-MM-DD',
        currency_format: 'CNY'
    };
}

// 填充设置表单
function populateSettingsForm() {
    console.log('填充设置表单');
    
    // 系统名称
    const systemNameInput = document.getElementById('systemName');
    if (systemNameInput) {
        systemNameInput.value = systemSettings.system_name || '财务流水账系统';
    }
    
    // 更新页面标题
    updatePageTitle();
    
    // 系统版本
    const systemVersionInput = document.getElementById('systemVersion');
    if (systemVersionInput) {
        systemVersionInput.value = systemSettings.system_version || '3.0';
    }
    
    // 公司名称
    const companyNameInput = document.getElementById('companyName');
    if (companyNameInput) {
        companyNameInput.value = systemSettings.company_name || '许昌爱佳网络科技有限公司';
    }
    
    // 联系邮箱
    const contactEmailInput = document.getElementById('contactEmail');
    if (contactEmailInput) {
        contactEmailInput.value = systemSettings.contact_email || 'admin@example.com';
    }
}

// 设置设置相关事件监听器
function setupSettingsEventListeners() {
    console.log('=== 设置设置事件监听器开始 ===');
    console.log('标签页链接数量:', document.querySelectorAll('#settingsPage nav a').length);
    console.log('内容区域数量:', document.querySelectorAll('.settings-content').length);
    
    // 保存设置按钮
    const saveButton = document.querySelector('#basicSettings button[type="submit"]');
    if (saveButton) {
        saveButton.addEventListener('click', handleSaveSettings);
    }
    
    // 取消按钮
    const cancelButton = document.querySelector('#basicSettings button[type="button"]');
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            // 重置表单为原始值
            populateSettingsForm();
        });
    }
    
    // 选项卡切换
    const tabLinks = document.querySelectorAll('#settingsPage nav a');
    tabLinks.forEach(link => {
        link.addEventListener('click', handleTabChange);
    });
    
    // 单独的添加按钮事件监听器
    const addPersonnelBtn = document.getElementById('addPersonnelBtn');
    const addDepartmentBtn = document.getElementById('addDepartmentBtn');
    const addAccountBtn = document.getElementById('addAccountBtn');
    const addProjectBtn = document.getElementById('addProjectBtn');
    const addTeamBtn = document.getElementById('addTeamBtn');
    
    if (addPersonnelBtn) {
        addPersonnelBtn.addEventListener('click', () => {
            // 切换到配置管理页面
            const configTab = document.querySelector('#settingsPage nav a[data-tab="personnel"]');
            if (configTab) {
                configTab.click();
                // 打开添加配置项模态框
                setTimeout(openAddConfigModal, 100);
            }
        });
    }
    
    if (addDepartmentBtn) {
        addDepartmentBtn.addEventListener('click', () => {
            // 切换到配置管理页面
            const configTab = document.querySelector('#settingsPage nav a[data-tab="department"]');
            if (configTab) {
                configTab.click();
                // 打开添加配置项模态框
                setTimeout(openAddConfigModal, 100);
            }
        });
    }
    
    if (addAccountBtn) {
        addAccountBtn.addEventListener('click', () => {
            // 切换到配置管理页面
            const configTab = document.querySelector('#settingsPage nav a[data-tab="accounts"]');
            if (configTab) {
                configTab.click();
                // 打开添加配置项模态框
                setTimeout(openAddConfigModal, 100);
            }
        });
    }
    
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', () => {
            // 设置表单分类属性
            const form = document.getElementById('addConfigForm');
            if (form) {
                form.setAttribute('data-category', 'project');
            }
            // 打开添加配置项模态框
            setTimeout(() => openAddConfigModal('project'), 100);
        });
    }
    
    if (addTeamBtn) {
        addTeamBtn.addEventListener('click', () => {
            // 设置表单分类属性
            const form = document.getElementById('addConfigForm');
            if (form) {
                form.setAttribute('data-category', 'team');
            }
            // 打开添加配置项模态框
            setTimeout(() => openAddConfigModal('team'), 100);
        });
    }
}

// 处理选项卡切换
function handleTabChange(e) {
    e.preventDefault();
    
    // 移除所有选项卡的激活状态
    const tabLinks = document.querySelectorAll('#settingsPage nav a');
    tabLinks.forEach(link => {
        link.classList.remove('border-blue-500', 'text-blue-600');
        link.classList.add('border-transparent', 'text-gray-500', 'hover:border-gray-300', 'hover:text-gray-700');
    });
    
    // 激活当前选项卡
    e.target.classList.remove('border-transparent', 'text-gray-500', 'hover:border-gray-300', 'hover:text-gray-700');
    e.target.classList.add('border-blue-500', 'text-blue-600');
    
    // 切换内容区域
    const tab = e.target.getAttribute('data-tab');
    
    // 隐藏所有内容区域
    document.querySelectorAll('.settings-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // 处理特殊标签页，直接切换到配置管理的对应分类
    const configCategoryMap = {
        // 不再将项目和团队映射到配置管理
    };
    
    if (configCategoryMap[tab]) {
        // 显示配置管理内容
        const configurationSettings = document.getElementById('configurationSettings');
        if (configurationSettings) {
            configurationSettings.classList.remove('hidden');
        }
        
        // 切换配置分类
        const configCategory = document.getElementById('configCategory');
        if (configCategory) {
            configCategory.value = configCategoryMap[tab];
            loadConfigurationData();
        }
    } else {
        // 显示当前内容区域
        const activeContent = document.getElementById(`${tab}Settings`);
        if (activeContent) {
            activeContent.classList.remove('hidden');
        }
        
        // 如果切换到配置管理标签页，加载配置数据
        if (tab === 'configuration') {
            loadConfigurationData();
        } else if (tab === 'interfaces') {
            // 如果切换到接口管理标签页，加载接口数据
            loadInterfacesData();
        } else if (tab === 'backup') {
            // 如果切换到数据备份标签页，加载备份数据
            loadBackupData();
        } else if (tab === 'categories') {
            // 如果切换到类别设置标签页，初始化类别管理
            if (typeof window.initCategoriesPage === 'function') {
                window.initCategoriesPage();
            }
        } else if (tab === 'accounts') {
            // 如果切换到账户设置标签页，加载账户数据
            loadAccountsData();
        } else if (tab === 'personnel') {
            // 如果切换到人员设置标签页，加载人员数据
            loadPersonnelData();
        } else if (tab === 'department') {
            // 如果切换到部门设置标签页，加载部门数据
            loadDepartmentData();
        }
    }
    
    console.log('切换到选项卡:', e.target.textContent.trim());
}

// 处理保存设置
function handleSaveSettings(e) {
    e.preventDefault();
    console.log('保存系统设置');
    
    // 获取表单数据
    const systemName = document.getElementById('systemName').value.trim();
    const companyName = document.getElementById('companyName').value.trim();
    const contactEmail = document.getElementById('contactEmail').value.trim();
    
    // 验证表单
    if (!systemName) {
        alert('请输入系统名称');
        return;
    }
    
    if (!companyName) {
        alert('请输入公司名称');
        return;
    }
    
    if (contactEmail && !isValidEmail(contactEmail)) {
        alert('请输入有效的联系邮箱');
        return;
    }
    
    try {
        // 更新系统设置
        systemSettings = {
            ...systemSettings,
            system_name: systemName,
            company_name: companyName,
            contact_email: contactEmail
        };
        
        // 如果有数据库接口，保存到数据库
        if (typeof window.db !== 'undefined' && db.saveSystemSettings) {
            db.saveSystemSettings(systemSettings);
        }
        
        // 显示成功消息
        alert('系统设置保存成功！');
        
        // 更新页面标题
        updatePageTitle();
    } catch (error) {
        console.error('保存系统设置失败:', error);
        alert('保存系统设置失败，请稍后重试');
    }
}

// 验证邮箱格式
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 更新页面标题
function updatePageTitle() {
    const pageTitle = document.querySelector('h1.text-xl.font-semibold.text-gray-900');
    if (pageTitle) {
        pageTitle.textContent = systemSettings.system_name || '财务流水账系统';
    }
}

// 初始化配置管理
function initConfigurationManagement() {
    const configCategory = document.getElementById('configCategory');
    const addConfigItemBtn = document.getElementById('addConfigItem');
    
    if (configCategory) {
        configCategory.addEventListener('change', loadConfigurationData);
    }
    
    if (addConfigItemBtn) {
        addConfigItemBtn.addEventListener('click', openAddConfigModal);
    }
    
    // 添加模态框事件监听器
    const modal = document.getElementById('addConfigModal');
    const closeBtn = document.getElementById('closeAddConfigModal');
    const form = document.getElementById('addConfigForm');
    const cancelBtn = document.getElementById('cancelAddConfigBtn');
    
    if (modal) {
        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAddConfigModal();
            }
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAddConfigModal);
    }
    
    if (form) {
        form.addEventListener('submit', handleAddConfigFormSubmit);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeAddConfigModal);
    }
}

// 初始化接口管理
function initInterfacesManagement() {
    console.log('初始化接口管理功能');
    // 接口管理功能在当前HTML结构中可能不存在，添加检查
    const addInterfaceBtn = document.getElementById('addInterface');
    
    if (addInterfaceBtn) {
        addInterfaceBtn.addEventListener('click', openAddInterfaceModal);
    } else {
        console.log('未找到接口管理相关元素，接口管理功能不可用');
    }
}

// 初始化数据备份
function initBackupManagement() {
    const createBackupBtn = document.getElementById('createBackup');
    
    if (createBackupBtn) {
        createBackupBtn.addEventListener('click', createBackup);
    }
}

// 加载备份数据
function loadBackupData() {
    // 在实际项目中，这里应该从服务器或本地存储加载备份数据
    // 现在使用模拟数据
    const backupData = [
        { id: 1, time: '2026-01-28 14:30:00', size: '12.5 MB', status: 'completed' },
        { id: 2, time: '2026-01-27 10:15:00', size: '11.8 MB', status: 'completed' },
        { id: 3, time: '2026-01-26 16:45:00', size: '11.2 MB', status: 'completed' }
    ];
    
    const tableBody = document.getElementById('backupList');
    
    if (!tableBody) {
        console.error('未找到备份表格体元素');
        return;
    }
    
    // 清空表格
    tableBody.innerHTML = '';
    
    // 填充表格数据
    backupData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap">${item.time}</td>
            <td class="px-4 py-3 whitespace-nowrap">${item.size}</td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    ${item.status === 'completed' ? '已完成' : '进行中'}
                </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">
                <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="downloadBackup(${item.id})">下载</button>
                <button class="text-red-600 hover:text-red-900" onclick="deleteBackup(${item.id})">删除</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 加载账户数据
async function loadAccountsData() {
    const tableBody = document.getElementById('accountsList');
    
    // 清空表格
    tableBody.innerHTML = '';
    
    let accounts = [];
    
    // 尝试使用 API 加载
    try {
        console.log('📡 调用 API 加载账户列表...');
        const result = await window.api.getAccounts();
        if (result.success) {
            console.log('✅ API 加载账户成功:', result.data.length, '条');
            accounts = result.data;
        } else {
            throw new Error('API 返回失败');
        }
    } catch (error) {
        console.warn('❌ API 加载失败，降级到 LocalStorage:', error);
        
        // 降级到 LocalStorage
        if (typeof window.db !== 'undefined' && db.getAccounts) {
            const result = db.getAccounts();
            if (result.success) {
                accounts = result.data;
            }
        }
    }
    
    // 填充表格数据
    accounts.forEach(account => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${account.name}</td>
            <td class="px-6 py-4 whitespace-nowrap">${account.account_type || account.type || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right">¥${parseFloat(account.initial_balance || 0).toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right">¥${parseFloat(account.balance || 0).toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${account.status === 'active' ? 'green' : 'red'}-100 text-${account.status === 'active' ? 'green' : 'red'}-800">
                    ${account.status === 'active' ? '启用' : '禁用'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="editAccount(${account.id})">编辑</button>
                <button class="text-red-600 hover:text-red-900" onclick="deleteAccount(${account.id})">删除</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 编辑账户
function editAccount(id) {
    // 账户管理功能暂时不实现模态框，避免与当前任务冲突
    alert('账户编辑功能正在开发中');
}

// 删除账户
async function deleteAccount(id) {
    if (!confirm('确定要删除此账户吗？')) return;
    
    // 尝试使用 API 删除
    try {
        console.log('📡 调用 API 删除账户:', id);
        const result = await window.api.deleteAccount(id);
        if (result.success) {
            console.log('✅ API 删除成功');
            showNotification('账户已删除', 'success');
            loadAccountsData();
            return;
        }
    } catch (error) {
        console.warn('❌ API 删除失败，降级到 LocalStorage:', error);
    }
    
    // 降级到 LocalStorage
    if (typeof window.db !== 'undefined' && db.deleteAccount) {
        const result = db.deleteAccount(id);
        if (result.success) {
            showNotification('账户已删除', 'success');
            loadAccountsData();
        }
    } else {
        alert('账户删除功能暂不可用');
    }
}

// 加载人员数据
function loadPersonnelData() {
    const tableBody = document.getElementById('personnelList');
    
    // 清空表格
    tableBody.innerHTML = '';
    
    // 获取人员数据
    const personnelData = configurationData.personnel || [];
    
    // 填充表格数据
    personnelData.forEach(person => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${person.name}</td>
            <td class="px-6 py-4 whitespace-nowrap">${person.position || '未设置'}</td>
            <td class="px-6 py-4 whitespace-nowrap">${person.department || '未设置'}</td>
            <td class="px-6 py-4 whitespace-nowrap">${person.contact || '未设置'}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${person.status === 'active' ? 'green' : 'red'}-100 text-${person.status === 'active' ? 'green' : 'red'}-800">
                    ${person.status === 'active' ? '启用' : '禁用'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="editPersonnel(${person.id})">编辑</button>
                <button class="text-red-600 hover:text-red-900" onclick="deletePersonnel(${person.id})">删除</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 编辑人员
function editPersonnel(id) {
    // 人员管理功能暂时不实现模态框，避免与当前任务冲突
    alert('人员编辑功能正在开发中');
}

// 删除人员
function deletePersonnel(id) {
    // 人员管理功能暂时不实现删除逻辑，避免与当前任务冲突
    alert('人员删除功能正在开发中');
}

// 加载部门数据
function loadDepartmentData() {
    const tableBody = document.getElementById('departmentList');
    
    // 清空表格
    tableBody.innerHTML = '';
    
    // 获取部门数据
    const departmentData = configurationData.department || [];
    
    // 填充表格数据
    departmentData.forEach(dept => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${dept.name}</td>
            <td class="px-6 py-4 whitespace-nowrap">${dept.code}</td>
            <td class="px-6 py-4 whitespace-nowrap">${dept.manager || '未设置'}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${dept.status === 'active' ? 'green' : 'red'}-100 text-${dept.status === 'active' ? 'green' : 'red'}-800">
                    ${dept.status === 'active' ? '启用' : '禁用'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="editDepartment(${dept.id})">编辑</button>
                <button class="text-red-600 hover:text-red-900" onclick="deleteDepartment(${dept.id})">删除</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 编辑部门
function editDepartment(id) {
    // 部门管理功能暂时不实现模态框，避免与当前任务冲突
    alert('部门编辑功能正在开发中');
}

// 删除部门
function deleteDepartment(id) {
    // 部门管理功能暂时不实现删除逻辑，避免与当前任务冲突
    alert('部门删除功能正在开发中');
}

// 创建备份
function createBackup() {
    // 在实际项目中，这里应该调用备份API
    alert('备份创建成功！');
    loadBackupData();
}

// 下载备份
function downloadBackup(id) {
    // 在实际项目中，这里应该触发文件下载
    alert(`正在下载备份 ${id}...`);
}

// 删除备份
function deleteBackup(id) {
    if (confirm('确定要删除这个备份吗？')) {
        // 在实际项目中，这里应该调用删除备份API
        alert(`备份 ${id} 已删除`);
        loadBackupData();
    }
}

// 加载接口数据
function loadInterfacesData() {
    const interfaces = configurationData.paymentInterface || [];
    const tableBody = document.getElementById('interfacesTableBody');
    
    // 清空表格
    tableBody.innerHTML = '';
    
    // 填充表格数据
    interfaces.forEach(interface => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap">${interface.name}</td>
            <td class="px-4 py-3 whitespace-nowrap">${interface.type === 'wechat' ? '微信支付' : interface.type === 'alipay' ? '支付宝' : '拉卡拉支付'}</td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${interface.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${interface.status === 'active' ? '启用' : '停用'}
                </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">${interface.notifyUrl}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">
                <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="editInterface(${interface.id})">编辑</button>
                <button class="text-red-600 hover:text-red-900" onclick="deleteInterface(${interface.id})">删除</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 打开添加接口模态框
function openAddInterfaceModal() {
    // 接口管理功能暂时不实现模态框，避免与当前任务冲突
    alert('接口管理功能正在开发中');
}

// 添加接口
function addInterface(name, type, notifyUrl) {
    const newInterface = {
        id: Date.now(),
        name: name,
        type: type,
        notifyUrl: notifyUrl,
        status: 'active',
        // 添加默认值
        appId: type === 'wechat' ? '' : type === 'alipay' ? '' : '',
        mchId: type === 'wechat' ? '' : '',
        apiKey: type === 'wechat' ? '' : '',
        publicKey: type === 'alipay' ? '' : '',
        privateKey: type === 'alipay' ? '' : '',
        merchantId: type === 'lakala' ? '' : '',
        terminalId: type === 'lakala' ? '' : '',
        apiSecret: type === 'lakala' ? '' : ''
    };
    
    if (!configurationData.paymentInterface) {
        configurationData.paymentInterface = [];
    }
    
    configurationData.paymentInterface.push(newInterface);
    loadInterfacesData();
    saveConfigurationDataToStorage(); // 保存到本地存储
    alert('支付接口已添加');
}

// 编辑接口
function editInterface(id) {
    // 接口管理功能暂时不实现模态框，避免与当前任务冲突
    alert('接口管理功能正在开发中');
}

// 删除接口
function deleteInterface(id) {
    if (confirm('确定要删除这个支付接口吗？')) {
        const interfaces = configurationData.paymentInterface;
        const index = interfaces.findIndex(item => item.id === id);
        
        if (index !== -1) {
            interfaces.splice(index, 1);
            loadInterfacesData();
            saveConfigurationDataToStorage(); // 保存到本地存储
            alert('支付接口已删除');
        }
    }
}

// 加载配置数据
function loadConfigurationData() {
    const category = document.getElementById('configCategory').value;
    const data = configurationData[category] || [];
    const tableBody = document.getElementById('configTableBody');
    const tableTitle = document.getElementById('configTableTitle');
    
    // 更新表格标题
    const categoryNames = {
        personnel: '人员列表',
        department: '部门列表',
        expenseCategory: '费用类别列表',
        incomeCategory: '收入分类列表',
        serviceProduct: '服务商品列表',
        account: '资金账户列表',
        accountGroup: '收款账户分组列表',
        project: '项目列表',
        team: '团队列表',
        paymentInterface: '支付接口列表'
    };
    tableTitle.textContent = categoryNames[category] || '配置列表';
    
    // 清空表格
    tableBody.innerHTML = '';
    
    // 填充表格数据
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap">${item.name}</td>
            <td class="px-4 py-3 whitespace-nowrap">${item.code}</td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${item.status === 'active' ? '启用' : '停用'}
                </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">
                <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="editConfigItem(${item.id}, '${category}')">编辑</button>
                <button class="text-red-600 hover:text-red-900" onclick="deleteConfigItem(${item.id}, '${category}')">删除</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 打开添加配置项模态框
function openAddConfigModal(category) {
    // 显示模态框
    const modal = document.getElementById('addConfigModal');
    const title = document.getElementById('addConfigModalTitle');
    const form = document.getElementById('addConfigForm');
    const additionalFields = document.getElementById('configItemAdditionalFields');
    
    // 设置模态框标题
    const categoryNames = {
        personnel: '添加人员',
        department: '添加部门',
        expenseCategory: '添加费用类别',
        incomeCategory: '添加收入分类',
        serviceProduct: '添加服务商品',
        account: '添加资金账户',
        accountGroup: '添加收款账户分组',
        project: '添加项目',
        team: '添加团队',
        paymentInterface: '添加支付接口'
    };
    
    // 如果没有提供category参数，从配置选择器获取
    const currentCategory = category || document.getElementById('configCategory').value;
    title.textContent = categoryNames[currentCategory] || '添加配置项';
    
    // 清空表单
    form.reset();
    
    // 根据配置类别显示不同的字段
    additionalFields.innerHTML = '';
    
    // 显示模态框
    modal.classList.remove('hidden');
}

// 关闭添加配置项模态框
function closeAddConfigModal() {
    const modal = document.getElementById('addConfigModal');
    modal.classList.add('hidden');
}

// 处理添加配置项表单提交
function handleAddConfigFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const name = formData.get('name').trim();
    const code = formData.get('code').trim();
    const status = formData.get('status');
    
    if (name && code) {
        const category = form.getAttribute('data-editing-category') || form.getAttribute('data-category') || document.getElementById('configCategory').value;
        const editingId = form.getAttribute('data-editing-id');
        
        if (editingId) {
            // 编辑现有配置项
            const items = configurationData[category];
            const item = items.find(item => item.id === parseInt(editingId));
            
            if (item) {
                item.name = name;
                item.code = code;
                item.status = status;
                loadConfigurationData();
                saveConfigurationDataToStorage(); // 保存到本地存储
                alert('配置项已更新');
            }
        } else {
            // 添加新配置项
            addConfigItem(name, code, category, status);
        }
        
        // 重置表单属性
        form.removeAttribute('data-editing-id');
        form.removeAttribute('data-editing-category');
        
        closeAddConfigModal();
    }
}

// 添加配置项
function addConfigItem(name, code, category, status = 'active') {
    const newItem = {
        id: Date.now(),
        name: name,
        code: code,
        status: status
    };
    
    if (!configurationData[category]) {
        configurationData[category] = [];
    }
    
    configurationData[category].push(newItem);
    loadConfigurationData();
    saveConfigurationDataToStorage(); // 保存到本地存储
    alert('配置项已添加');
}

// 编辑配置项
function editConfigItem(id, category) {
    const items = configurationData[category];
    const item = items.find(item => item.id === id);
    
    if (item) {
        // 显示模态框
        const modal = document.getElementById('addConfigModal');
        const title = document.getElementById('addConfigModalTitle');
        const form = document.getElementById('addConfigForm');
        const additionalFields = document.getElementById('configItemAdditionalFields');
        
        // 设置模态框标题
        const categoryNames = {
            personnel: '编辑人员',
            department: '编辑部门',
            expenseCategory: '编辑费用类别',
            incomeCategory: '编辑收入分类',
            serviceProduct: '编辑服务商品',
            account: '编辑资金账户',
            accountGroup: '编辑收款账户分组',
            project: '编辑项目',
            team: '编辑团队',
            paymentInterface: '编辑支付接口'
        };
        title.textContent = categoryNames[category] || '编辑配置项';
        
        // 填充表单数据
        document.getElementById('configItemName').value = item.name;
        document.getElementById('configItemCode').value = item.code;
        document.getElementById('configItemStatus').value = item.status;
        
        // 根据配置类别显示不同的字段
        additionalFields.innerHTML = '';
        
        // 保存当前编辑的项和类别
        form.setAttribute('data-editing-id', id);
        form.setAttribute('data-editing-category', category);
        
        // 显示模态框
        modal.classList.remove('hidden');
    }
}

// 保存配置数据到本地存储
function saveConfigurationDataToStorage() {
    localStorage.setItem('configurationData', JSON.stringify(configurationData));
}

// 从本地存储加载配置数据
function loadConfigurationDataFromStorage() {
    const data = localStorage.getItem('configurationData');
    if (data) {
        try {
            configurationData = JSON.parse(data);
            console.log('从本地存储加载配置数据成功');
        } catch (error) {
            console.error('解析配置数据失败:', error);
            // 使用默认数据
            alert('配置数据损坏，使用默认配置');
        }
    } else {
        console.log('本地存储无配置数据，使用默认配置');
        // 使用默认数据
        saveConfigurationDataToStorage();
    }
}

// 删除配置项
function deleteConfigItem(id, category) {
    if (confirm('确定要删除这个配置项吗？')) {
        const items = configurationData[category];
        const index = items.findIndex(item => item.id === id);
        
        if (index !== -1) {
            items.splice(index, 1);
            loadConfigurationData();
            saveConfigurationDataToStorage(); // 保存到本地存储
            alert('配置项已删除');
        }
    }
}

// 获取配置数据（供其他模块使用）
function getConfigurationData(category) {
    return configurationData[category] || [];
}

// 导出函数
if (typeof window !== 'undefined') {
    window.initSettingsPage = initSettingsPage;
    window.editConfigItem = editConfigItem;
    window.deleteConfigItem = deleteConfigItem;
    window.getConfigurationData = getConfigurationData;
    window.editInterface = editInterface;
    window.deleteInterface = deleteInterface;
}
