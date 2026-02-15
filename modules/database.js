// 数据库连接和操作模块（V5.0版 - ❗ 已废弃，请使用MySQL API）
// 全局变量存储当前登录用户和公司信息
let currentUser = null;
let currentCompany = null;

// ============ ⚠️ 废弃警告 ============
// ⚠️ 此文件为LocalStorage旧版架构，已于2026-02-12标记为废弃
// ⚠️ 新功能开发请使用MySQL API（backend/app.py）
// ⚠️ 保留此文件仅为兼容性目的，将在未来版本删除
// ============================================

// 从localStorage加载数据，如果没有则使用默认数据
function loadDataFromStorage() {
    const savedData = localStorage.getItem('ajkuaiji_data');
    if (savedData) {
        try {
            return JSON.parse(savedData);
        } catch (e) {
            console.error('解析localStorage数据失败:', e);
            return getDefaultData();
        }
    }
    return getDefaultData();
}

// 获取默认数据
// 获取默认数据（精简版 - 只保留必要示例）
function getDefaultData() {
    return {
        systemSettings: { companyName: "许昌爱佳网络科技有限公司", taxNumber: "91411000MA48XXXX88", address: "许昌市魏都区七一路", phone: "0374-12345678" },
        cooperationModes: ["短视频拍摄", "直播代运营", "林客服务"],
        industries: ["餐饮", "零售", "服务业"],
        companies: [{ id: 1, name: "许昌爱佳网络科技有限公司", tax_number: "91411000MA48XXXX88" }],
        users: [],
        accounts: [{ id: 1, name: "库存现金", code: "1001", type: "asset", company_id: 1 }, { id: 2, name: "银行存款", code: "1002", type: "asset", company_id: 1 }],
        chart_of_accounts: [{ id: 1, code: "1001", name: "库存现金", type: "asset", parent_id: null }, { id: 2, code: "1002", name: "银行存款", type: "asset", parent_id: null }],
        transactions: [{ id: 1, transaction_type: "收入", transaction_date: "2026-02-08", payer_name: "示例客户", payee_name: "许昌爱佳网络科技", amount: 10000.00, purpose: "销售收入", remark: "示例交易记录", account_id: 1, company_id: 1, created_by: 1, audit_status: "已审核", is_void: 0 }],
        operationLogs: [],
        transactionAttachments: [],
        accountingPeriods: [{ id: 1, year: 2026, month: 2, status: "open", company_id: 1 }],
        customers: [],
        services: [{ id: 1, name: "短视频拍摄-单条", code: "S001", type: "service", category: "短视频拍摄", team_id: 1, base_price: 800.00, status: "active" }],
        servicePackages: [],
        inventory: [],
        purchaseOrders: [],
        inventoryAdjustments: [],
        orders: [{ id: 1, order_number: "ORD2026020800001", customer_id: 1, order_date: "2026-02-08", total_amount: 800.00, status: "completed", created_by: 1 }],
        orderItems: [],
        orderAfterSales: [],
        departments: [],
        teams: [],
        positions: [],
        costCategories: [{ id: 1, name: "拍摄费用", type: "direct", description: "视频拍摄相关成本" }],
        taskPool: []
    };
}


// 保存数据到localStorage
function saveDataToStorage() {
    localStorage.setItem('ajkuaiji_data', JSON.stringify(mockData));
}

// 模拟数据库数据（从localStorage加载或使用默认数据）
let mockData = loadDataFromStorage();

// 登录验证
function login(username, password) {
    const user = mockData.users.find(u => u.username === username && u.password === password);
    if (user && user.status === "enabled") {
        currentUser = user;
        if (user.company_id) {
            currentCompany = mockData.companies.find(c => c.id === user.company_id);
        } else {
            currentCompany = null;
        }
        return { success: true, user: user };
    }
    return { success: false, message: "用户名或密码错误" };
}

// 获取当前用户
function getCurrentUser() {
    return currentUser;
}

// 设置当前用户(用于登录状态恢复)
function setCurrentUser(user) {
    currentUser = user;
    // 如果用户有company_id,同时设置当前公司
    if (user && user.company_id) {
        const companiesResult = getCompanies();
        // ✅ 修复：getCompanies()返回的是API格式 {success: true, data: [...]}
        const companies = companiesResult.success ? companiesResult.data : [];
        currentCompany = companies.find(c => c.id === user.company_id) || null;
    }
    return currentUser;
}

// 获取当前公司
function getCurrentCompany() {
    return currentCompany;
}

// 检查用户权限
function checkPermission(requiredRole) {
    if (!currentUser) return false;
    if (currentUser.role === "superadmin") return true;
    
    const roleHierarchy = {
        "admin": ["admin", "financial_entry", "financial_view", "financial_audit"],
        "financial_entry": ["financial_entry"],
        "financial_view": ["financial_view"],
        "financial_audit": ["financial_audit"]
    };
    
    return roleHierarchy[requiredRole]?.includes(currentUser.role);
}

// 获取公司列表（超级管理员和管理员可访问）
function getCompanies() {
    if (currentUser?.role !== "superadmin" && currentUser?.role !== "admin") {
        return { success: false, message: "权限不足" };
    }
    return { success: true, data: mockData.companies };
}

// 设置当前公司
function setCurrentCompany(companyId) {
    if (!currentUser) {
        return { success: false, message: "请先登录" };
    }
    
    const company = mockData.companies.find(c => c.id === companyId);
    if (!company) {
        return { success: false, message: "公司不存在" };
    }
    
    // 数据隔离：非超级管理员只能选择自己的公司
    if (currentUser.role !== "superadmin" && company.id !== currentUser.company_id) {
        return { success: false, message: "无权访问该公司" };
    }
    
    currentCompany = company;
    return { success: true, data: company };
}

// 获取当前公司的交易记录
function getTransactions(filter = {}) {
    if (!currentUser) {
        return { success: false, message: "请先登录" };
    }
    
    let transactions = mockData.transactions;
    
    // 数据隔离：非超级管理员只能看到自己公司的数据
    if (currentUser.role !== "superadmin") {
        transactions = transactions.filter(t => t.company_id === currentUser.company_id);
    }
    
    // 应用筛选条件
    if (filter.startDate) {
        transactions = transactions.filter(t => t.transaction_date >= filter.startDate);
    }
    if (filter.endDate) {
        transactions = transactions.filter(t => t.transaction_date <= filter.endDate);
    }
    if (filter.transactionType) {
        transactions = transactions.filter(t => t.transaction_type === filter.transactionType);
    }
    if (filter.accountId) {
        transactions = transactions.filter(t => t.account_id === filter.accountId);
    }
    if (filter.isVoid !== undefined) {
        transactions = transactions.filter(t => t.is_void === filter.isVoid);
    }
    if (filter.auditStatus) {
        transactions = transactions.filter(t => t.audit_status === filter.auditStatus);
    }
    
    // 按日期降序排序
    transactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
    
    return { success: true, data: transactions };
}

// 获取当前公司的账户
function getAccounts() {
    if (!currentUser) {
        return { success: false, message: "请先登录" };
    }
    
    let accounts = mockData.accounts;
    
    // 数据隔离：非超级管理员只能看到自己公司的数据
    if (currentUser.role !== "superadmin") {
        accounts = accounts.filter(a => a.company_id === currentUser.company_id);
    }
    
    return { success: true, data: accounts };
}

// 添加操作日志
function addOperationLog(logData) {
    const log = {
        id: mockData.operationLogs.length + 1,
        operator_id: currentUser?.id || 0,
        company_id: currentUser?.company_id || null,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        ...logData
    };
    mockData.operationLogs.push(log);
    saveDataToStorage();
    return { success: true, data: log };
}

// 添加交易记录
function addTransaction(transactionData) {
    if (!currentUser) {
        return { success: false, message: "请先登录" };
    }
    
    // 添加公司ID和创建者ID
    const newTransaction = {
        ...transactionData,
        id: transactionData.id || `tx_${Date.now()}`,
        company_id: currentUser.company_id,
        created_by: currentUser.id
    };
    
    // 添加到数据中
    mockData.transactions.push(newTransaction);
    saveDataToStorage();
    return { success: true, data: newTransaction };
}

// 获取指定公司的账户
function getAccountsByCompany(companyId) {
    return mockData.accounts.filter(account => account.company_id === companyId);
}

// 获取指定公司的当前会计期间
function getCurrentAccountingPeriod(companyId) {
    // 获取未结账的期间，按开始日期降序排序
    const openPeriods = mockData.accountingPeriods
        .filter(period => period.company_id === companyId && period.status === "未结账")
        .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    
    return openPeriods[0] || null;
}

// 获取指定期间内的交易记录
function getTransactionsByPeriod(companyId, startDate, endDate) {
    return mockData.transactions.filter(transaction => 
        transaction.company_id === companyId &&
        transaction.transaction_date >= startDate &&
        transaction.transaction_date <= endDate
    );
}

// 获取指定公司的会计科目
function getChartOfAccounts(companyId) {
    if (!mockData.chart_of_accounts) {
        return [];
    }
    return mockData.chart_of_accounts.filter(account => account.company_id === companyId);
}

// 获取会计科目余额
function getAccountBalance(companyId, accountCode, startDate, endDate) {
    const transactions = getTransactionsByPeriod(companyId, startDate, endDate);
    let balance = 0;
    
    transactions.forEach(transaction => {
        // 简单实现，实际应该根据借贷方向计算
        if (transaction.transaction_type === "收入") {
            balance += transaction.amount;
        } else if (transaction.transaction_type === "支出") {
            balance -= transaction.amount;
        }
    });
    
    return balance;
}

// 获取指定公司的所有会计期间
function getAccountingPeriods(companyId) {
    return mockData.accountingPeriods.filter(period => period.company_id === companyId);
}

// 获取指定期间内的现金交易记录
function getCashTransactionsByPeriod(companyId, startDate, endDate) {
    const cashAccounts = mockData.accounts.filter(account => 
        account.company_id === companyId && 
        (account.account_type === '银行账户' || account.account_type === '现金账户')
    );
    const cashAccountIds = cashAccounts.map(account => account.id);
    
    return mockData.transactions.filter(transaction => 
        transaction.company_id === companyId &&
        cashAccountIds.includes(transaction.account_id) &&
        transaction.transaction_date >= startDate &&
        transaction.transaction_date <= endDate
    );
}

// 获取指定日期的期初现金余额
function getBeginningCashBalance(companyId, startDate) {
    const cashAccounts = mockData.accounts.filter(account => 
        account.company_id === companyId && 
        (account.account_type === '银行账户' || account.account_type === '现金账户')
    );
    
    let totalBalance = 0;
    cashAccounts.forEach(account => {
        // 获取账户在指定日期前的所有交易
        const transactions = mockData.transactions.filter(transaction => 
            transaction.company_id === companyId &&
            transaction.account_id === account.id &&
            transaction.transaction_date < startDate
        );
        
        // 计算期初余额
        let balance = account.initial_balance;
        transactions.forEach(transaction => {
            if (transaction.transaction_type === "收入") {
                balance += transaction.amount;
            } else if (transaction.transaction_type === "支出") {
                balance -= transaction.amount;
            }
        });
        
        totalBalance += balance;
    });
    
    return totalBalance;
}

// 获取利润表数据
function getIncomeStatementData(companyId, startDate, endDate) {
    const transactions = getTransactionsByPeriod(companyId, startDate, endDate);
    
    const revenues = transactions.filter(t => t.transaction_type === '收入');
    const expenses = transactions.filter(t => t.transaction_type === '支出');
    
    const totalRevenue = revenues.reduce((sum, rev) => sum + rev.amount, 0);
    const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalRevenue - totalExpense;
    
    return { revenues, expenses, totalRevenue, totalExpense, netProfit };
}

// 获取指定期间内的权益变动交易
function getEquityTransactionsByPeriod(companyId, startDate, endDate) {
    return mockData.transactions.filter(transaction => 
        transaction.company_id === companyId &&
        (transaction.transaction_type === '股东投入' || transaction.transaction_type === '分红') &&
        transaction.transaction_date >= startDate &&
        transaction.transaction_date <= endDate
    );
}

// 获取指定日期的期初权益余额
function getBeginningEquityBalance(companyId, startDate) {
    // 简单实现，实际应该根据会计科目计算
    const equityAccounts = mockData.accounts.filter(account => 
        account.company_id === companyId && 
        account.account_type === '权益账户'
    );
    
    let totalBalance = 0;
    equityAccounts.forEach(account => {
        // 获取账户在指定日期前的所有交易
        const transactions = mockData.transactions.filter(transaction => 
            transaction.company_id === companyId &&
            transaction.account_id === account.id &&
            transaction.transaction_date < startDate
        );
        
        // 计算期初余额
        let balance = account.initial_balance;
        transactions.forEach(transaction => {
            if (transaction.transaction_type === "收入") {
                balance += transaction.amount;
            } else if (transaction.transaction_type === "支出") {
                balance -= transaction.amount;
            }
        });
        
        totalBalance += balance;
    });
    
    return totalBalance;
}

// 更新交易记录
function updateTransaction(transactionData) {
    if (!currentUser) {
        return { success: false, message: "请先登录" };
    }
    
    const index = mockData.transactions.findIndex(t => t.id === transactionData.id);
    if (index === -1) {
        return { success: false, message: "交易记录不存在" };
    }
    
    // 确保只能更新自己公司的交易
    if (mockData.transactions[index].company_id !== currentUser.company_id) {
        return { success: false, message: "没有权限更新此交易记录" };
    }
    
    // 更新交易记录
    mockData.transactions[index] = {
        ...mockData.transactions[index],
        ...transactionData,
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    
    saveDataToStorage();
    return { success: true, data: mockData.transactions[index] };
}

// 获取系统设置
function getSystemSettings() {
    return mockData.systemSettings || getDefaultData().systemSettings;
}

// 保存系统设置
function saveSystemSettings(settings) {
    if (!currentUser) {
        return { success: false, message: "请先登录" };
    }
    
    // 确保当前用户有管理员权限
    if (!checkPermission('admin')) {
        return { success: false, message: "权限不足，无法修改系统设置" };
    }
    
    // 更新系统设置
    mockData.systemSettings = {
        ...mockData.systemSettings,
        ...settings
    };
    
    saveDataToStorage();
    return { success: true, data: mockData.systemSettings };
}

// 获取所有客户
function getCustomers() {
    return { success: true, data: mockData.customers || [] };
}

// 获取所有客户（直接返回数组）
function getAllCustomers() {
    return mockData.customers || [];
}

// 根据ID获取客户
function getCustomerById(id) {
    return mockData.customers.find(c => c.id === id);
}

// 获取所有用户
function getUsers() {
    return { success: true, data: mockData.users || [] };
}

// 添加用户
function addUser(userData) {
    // 检查用户名是否已存在
    if (userData.username) {
        const existingUser = mockData.users.find(u => u.username === userData.username);
        if (existingUser) {
            return { success: false, message: '用户名已存在' };
        }
    }
    
    const newUser = {
        ...userData,
        id: mockData.users.length > 0 ? Math.max(...mockData.users.map(u => u.id)) + 1 : 1,
        company_id: userData.company_id || 1,
        status: userData.status || 'enabled',
        created_at: new Date().toISOString().split('T')[0]
    };
    
    mockData.users.push(newUser);
    saveDataToStorage();
    return { success: true, data: newUser };
}

// 更新用户
function updateUser(id, userData) {
    const index = mockData.users.findIndex(u => u.id === id);
    if (index === -1) {
        return { success: false, message: '用户不存在' };
    }
    
    // 检查用户名是否与其他用户重复
    if (userData.username) {
        const existingUser = mockData.users.find(u => u.username === userData.username && u.id !== id);
        if (existingUser) {
            return { success: false, message: '用户名已被其他用户使用' };
        }
    }
    
    // 如果没有传密码，保留原密码
    const updateData = { ...userData };
    if (!updateData.password) {
        delete updateData.password;
    }
    
    mockData.users[index] = {
        ...mockData.users[index],
        ...updateData,
        id: mockData.users[index].id,
        updated_at: new Date().toISOString().split('T')[0]
    };
    
    saveDataToStorage();
    return { success: true, data: mockData.users[index] };
}

// 删除用户
function deleteUser(id) {
    const index = mockData.users.findIndex(u => u.id === id);
    if (index === -1) {
        return { success: false, message: '用户不存在' };
    }
    
    mockData.users.splice(index, 1);
    saveDataToStorage();
    return { success: true };
}

// 添加客户
function addCustomer(customerData) {
    // 验证商家ID是否重复
    if (customerData.merchant_id) {
        const existingMerchant = mockData.customers.find(c => c.merchant_id === customerData.merchant_id);
        if (existingMerchant) {
            return { success: false, message: '商家ID已存在，不能重复登记' };
        }
    }
    
    // 验证统一社会信用代码是否重复
    if (customerData.credit_code) {
        const existingCustomer = mockData.customers.find(c => c.credit_code === customerData.credit_code);
        if (existingCustomer) {
            return { success: false, message: '统一社会信用代码已存在，不能重复保存' };
        }
    }
    
    const now = new Date().toISOString().split('T')[0];
    const newCustomer = {
        ...customerData,
        id: mockData.customers.length > 0 ? Math.max(...mockData.customers.map(c => c.id)) + 1 : 1,
        contacts: customerData.contacts || [],
        memos: customerData.memos || [],
        attachments: customerData.attachments || [],
        tags: customerData.tags || [],
        created_at: now,
        updated_at: now
    };
    mockData.customers.push(newCustomer);
    saveDataToStorage();
    return { success: true, data: newCustomer };
}

// 更新客户
function updateCustomer(id, customerData) {
    const index = mockData.customers.findIndex(c => c.id === id);
    if (index === -1) return { success: false, message: '客户不存在' };
    
    // 验证商家ID是否与其他客户重复
    if (customerData.merchant_id) {
        const existingMerchant = mockData.customers.find(c => c.merchant_id === customerData.merchant_id && c.id !== id);
        if (existingMerchant) {
            return { success: false, message: '商家ID已存在，不能重复登记' };
        }
    }
    
    // 验证统一社会信用代码是否与其他客户重复
    if (customerData.credit_code) {
        const existingCustomer = mockData.customers.find(c => c.credit_code === customerData.credit_code && c.id !== id);
        if (existingCustomer) {
            return { success: false, message: '统一社会信用代码已存在，不能重复保存' };
        }
    }
    
    const now = new Date().toISOString().split('T')[0];
    mockData.customers[index] = {
        ...mockData.customers[index],
        ...customerData,
        id: mockData.customers[index].id,
        created_at: mockData.customers[index].created_at,
        updated_at: now
    };
    saveDataToStorage();
    return { success: true, data: mockData.customers[index] };
}

// 删除客户
function deleteCustomer(id) {
    const index = mockData.customers.findIndex(c => c.id === id);
    if (index === -1) return { success: false, message: '客户不存在' };
    
    mockData.customers.splice(index, 1);
    saveDataToStorage();
    return { success: true };
}

// 获取所有服务
function getServices() {
    return { success: true, data: mockData.services || [] };
}

// 获取所有服务包
function getServicePackages() {
    return { success: true, data: mockData.servicePackages || [] };
}

// 获取所有订单
function getOrders() {
    return { success: true, data: mockData.orders || [] };
}

// 添加订单
function addOrder(orderData) {
    const newOrder = {
        ...orderData,
        id: orderData.id || `ORD${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 12)}`
    };
    mockData.orders.push(newOrder);
    saveDataToStorage();
    return { success: true, data: newOrder };
}

// 添加订单收款
function addOrderPayment(orderId, paymentData) {
    const order = mockData.orders.find(o => o.id === orderId);
    if (!order) return { success: false, message: '订单不存在' };
    
    // 1. 创建财务流水记录
    const transactionId = `tx_${Date.now()}`;
    const customer = mockData.customers.find(c => c.id === order.customer_id);
    
    const transactionData = {
        id: transactionId,
        transaction_type: "收入",
        transaction_date: paymentData.date,
        payer_name: customer ? customer.shop_name : '订单客户',
        payer_bank: paymentData.payer_bank || '-',
        payee_name: currentCompany ? currentCompany.name : '公司账户',
        payee_bank: paymentData.payee_bank || '-',
        amount: paymentData.amount,
        purpose: "订单收款",
        remark: `订单 ${orderId} 收款: ${paymentData.type}`,
        account_id: paymentData.account_id,
        company_id: currentUser?.company_id || 1,
        created_by: currentUser?.id || 1,
        audit_status: "待审核",
        is_void: 0
    };
    
    addTransaction(transactionData);
    
    // 2. 添加到订单收款记录
    const newPayment = {
        id: (order.payments || []).length + 1,
        amount: paymentData.amount,
        date: paymentData.date,
        type: paymentData.type,
        status: "已收",
        transaction_id: transactionId
    };
    
    if (!order.payments) order.payments = [];
    order.payments.push(newPayment);
    
    // 3. 更新订单状态
    const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid >= order.contract_amount) {
        order.status = '服务中'; // 或其他逻辑
    }
    
    saveDataToStorage();
    return { success: true, data: newPayment };
}

// 更新订单
function updateOrder(orderId, orderData) {
    const index = mockData.orders.findIndex(o => o.id === orderId);
    if (index === -1) return { success: false, message: '订单不存在' };
    
    mockData.orders[index] = {
        ...mockData.orders[index],
        ...orderData
    };
    saveDataToStorage();
    return { success: true, data: mockData.orders[index] };
}

// === 供应商管理 ===
function getSuppliers() {
    return { success: true, data: mockData.suppliers || [] };
}

function addSupplier(supplierData) {
    const newSupplier = {
        ...supplierData,
        id: mockData.suppliers.length > 0 ? Math.max(...mockData.suppliers.map(s => s.id)) + 1 : 1,
        code: supplierData.code || `SUP${String(mockData.suppliers.length + 1).padStart(3, '0')}`,
        status: supplierData.status || 'active'
    };
    mockData.suppliers.push(newSupplier);
    saveDataToStorage();
    return { success: true, data: newSupplier };
}

function updateSupplier(id, supplierData) {
    const index = mockData.suppliers.findIndex(s => s.id === id);
    if (index === -1) return { success: false, message: '供应商不存在' };
    
    mockData.suppliers[index] = {
        ...mockData.suppliers[index],
        ...supplierData,
        id: mockData.suppliers[index].id
    };
    saveDataToStorage();
    return { success: true, data: mockData.suppliers[index] };
}

function deleteSupplier(id) {
    const index = mockData.suppliers.findIndex(s => s.id === id);
    if (index === -1) return { success: false, message: '供应商不存在' };
    
    mockData.suppliers.splice(index, 1);
    saveDataToStorage();
    return { success: true };
}

// === 采购单管理 ===
function getPurchases() {
    return { success: true, data: mockData.purchases || [] };
}

function addPurchase(purchaseData) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const count = mockData.purchases.filter(p => p.id.startsWith(`PUR${dateStr}`)).length + 1;
    
    const newPurchase = {
        ...purchaseData,
        id: purchaseData.id || `PUR${dateStr}${String(count).padStart(3, '0')}`,
        status: purchaseData.status || '待入库',
        created_by: currentUser?.id || 1
    };
    mockData.purchases.push(newPurchase);
    saveDataToStorage();
    return { success: true, data: newPurchase };
}

function updatePurchase(id, purchaseData) {
    const index = mockData.purchases.findIndex(p => p.id === id);
    if (index === -1) return { success: false, message: '采购单不存在' };
    
    mockData.purchases[index] = {
        ...mockData.purchases[index],
        ...purchaseData
    };
    saveDataToStorage();
    return { success: true, data: mockData.purchases[index] };
}

// 采购单入库
function warehousePurchase(purchaseId) {
    const purchase = mockData.purchases.find(p => p.id === purchaseId);
    if (!purchase) return { success: false, message: '采购单不存在' };
    if (purchase.status === '已入库') return { success: false, message: '该采购单已入库' };
    
    const now = new Date().toISOString().split('T')[0];
    
    // 更新库存并记录日志
    purchase.items.forEach(item => {
        // 更新库存
        let inventory = mockData.inventory.find(inv => inv.service_id === item.service_id);
        if (inventory) {
            inventory.quantity += item.quantity;
            inventory.last_updated = now;
        } else {
            mockData.inventory.push({
                id: mockData.inventory.length + 1,
                service_id: item.service_id,
                quantity: item.quantity,
                min_stock: 5,
                last_updated: now
            });
        }
        
        // 记录库存变动
        mockData.inventoryLogs.push({
            id: mockData.inventoryLogs.length + 1,
            service_id: item.service_id,
            change_type: '入库',
            quantity: item.quantity,
            reference_type: '采购单',
            reference_id: purchaseId,
            created_at: now,
            created_by: currentUser?.id || 1,
            remark: '采购入库'
        });
    });
    
    // 更新采购单状态
    purchase.status = '已入库';
    purchase.warehouse_date = now;
    
    saveDataToStorage();
    return { success: true, data: purchase };
}

// === 库存管理 ===
function getInventory() {
    return { success: true, data: mockData.inventory || [] };
}

function getInventoryLogs(filter = {}) {
    let logs = mockData.inventoryLogs || [];
    
    if (filter.service_id) {
        logs = logs.filter(l => l.service_id === filter.service_id);
    }
    if (filter.change_type) {
        logs = logs.filter(l => l.change_type === filter.change_type);
    }
    
    logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { success: true, data: logs };
}

// 库存出库（销售单关联）
function stockOut(serviceId, quantity, referenceType, referenceId, remark = '') {
    const inventory = mockData.inventory.find(inv => inv.service_id === serviceId);
    if (!inventory) return { success: false, message: '库存记录不存在' };
    if (inventory.quantity < quantity) return { success: false, message: '库存不足' };
    
    const now = new Date().toISOString().split('T')[0];
    
    inventory.quantity -= quantity;
    inventory.last_updated = now;
    
    mockData.inventoryLogs.push({
        id: mockData.inventoryLogs.length + 1,
        service_id: serviceId,
        change_type: '出库',
        quantity: -quantity,
        reference_type: referenceType,
        reference_id: referenceId,
        created_at: now,
        created_by: currentUser?.id || 1,
        remark: remark || '销售出库'
    });
    
    saveDataToStorage();
    return { success: true, data: inventory };
}

// 库存盘点调整
function adjustInventory(serviceId, newQuantity, remark = '') {
    let inventory = mockData.inventory.find(inv => inv.service_id === serviceId);
    const now = new Date().toISOString().split('T')[0];
    
    if (!inventory) {
        inventory = {
            id: mockData.inventory.length + 1,
            service_id: serviceId,
            quantity: 0,
            min_stock: 5,
            last_updated: now
        };
        mockData.inventory.push(inventory);
    }
    
    const diff = newQuantity - inventory.quantity;
    
    mockData.inventoryLogs.push({
        id: mockData.inventoryLogs.length + 1,
        service_id: serviceId,
        change_type: '盘点调整',
        quantity: diff,
        reference_type: '盘点',
        reference_id: null,
        created_at: now,
        created_by: currentUser?.id || 1,
        remark: remark || `盘点调整: ${inventory.quantity} -> ${newQuantity}`
    });
    
    inventory.quantity = newQuantity;
    inventory.last_updated = now;
    
    saveDataToStorage();
    return { success: true, data: inventory };
}

// === 部门和团队管理 ===
function getDepartments() {
    return { success: true, data: mockData.departments || [] };
}

function getTeams() {
    return { success: true, data: mockData.teams || [] };
}

function addDepartment(data) {
    const newDept = {
        ...data,
        id: mockData.departments.length > 0 ? Math.max(...mockData.departments.map(d => d.id)) + 1 : 1,
        status: 'active'
    };
    mockData.departments.push(newDept);
    saveDataToStorage();
    return { success: true, data: newDept };
}

function updateDepartment(id, data) {
    const index = mockData.departments.findIndex(d => d.id === id);
    if (index === -1) return { success: false, message: '部门不存在' };
    
    mockData.departments[index] = { ...mockData.departments[index], ...data };
    saveDataToStorage();
    return { success: true, data: mockData.departments[index] };
}

function addTeam(data) {
    const newTeam = {
        ...data,
        id: mockData.teams.length > 0 ? Math.max(...mockData.teams.map(t => t.id)) + 1 : 1,
        members: data.members || [],
        status: 'active'
    };
    mockData.teams.push(newTeam);
    saveDataToStorage();
    return { success: true, data: newTeam };
}

function updateTeam(id, data) {
    const index = mockData.teams.findIndex(t => t.id === id);
    if (index === -1) return { success: false, message: '团队不存在' };
    
    mockData.teams[index] = { ...mockData.teams[index], ...data };
    saveDataToStorage();
    return { success: true, data: mockData.teams[index] };
}

// === 岗位管理 ===
function getPositions() {
    return { success: true, data: mockData.positions || [] };
}

function addPosition(data) {
    if (!mockData.positions) mockData.positions = [];
    const newPosition = {
        ...data,
        id: mockData.positions.length > 0 ? Math.max(...mockData.positions.map(p => p.id)) + 1 : 1,
        status: 'active'
    };
    mockData.positions.push(newPosition);
    saveDataToStorage();
    return { success: true, data: newPosition };
}

function updatePosition(id, data) {
    if (!mockData.positions) return { success: false, message: '岗位不存在' };
    const index = mockData.positions.findIndex(p => p.id === id);
    if (index === -1) return { success: false, message: '岗位不存在' };
    
    mockData.positions[index] = { ...mockData.positions[index], ...data };
    saveDataToStorage();
    return { success: true, data: mockData.positions[index] };
}

function deletePosition(id) {
    if (!mockData.positions) return { success: false, message: '岗位不存在' };
    const index = mockData.positions.findIndex(p => p.id === id);
    if (index === -1) return { success: false, message: '岗位不存在' };
    
    mockData.positions.splice(index, 1);
    saveDataToStorage();
    return { success: true };
}

// === 业务成本项目管理 ===
function getCostCategories() {
    return { success: true, data: mockData.costCategories || [] };
}

function addCostCategory(data) {
    if (!mockData.costCategories) mockData.costCategories = [];
    const newItem = {
        ...data,
        id: mockData.costCategories.length > 0 ? Math.max(...mockData.costCategories.map(c => c.id)) + 1 : 1,
        status: data.status || 'active'
    };
    mockData.costCategories.push(newItem);
    saveDataToStorage();
    return { success: true, data: newItem };
}

function updateCostCategory(id, data) {
    if (!mockData.costCategories) return { success: false, message: '项目不存在' };
    const index = mockData.costCategories.findIndex(c => c.id === id);
    if (index === -1) return { success: false, message: '项目不存在' };
    mockData.costCategories[index] = { ...mockData.costCategories[index], ...data, id };
    saveDataToStorage();
    return { success: true, data: mockData.costCategories[index] };
}

function deleteCostCategory(id) {
    if (!mockData.costCategories) return { success: false, message: '项目不存在' };
    const index = mockData.costCategories.findIndex(c => c.id === id);
    if (index === -1) return { success: false, message: '项目不存在' };
    mockData.costCategories.splice(index, 1);
    saveDataToStorage();
    return { success: true };
}

// === 任务池管理 ===
function getTaskPool() {
    return { success: true, data: mockData.taskPool || [] };
}

function addTaskToPool(orderData) {
    if (!mockData.taskPool) mockData.taskPool = [];
    const newTask = {
        id: mockData.taskPool.length > 0 ? Math.max(...mockData.taskPool.map(t => t.id)) + 1 : 1,
        order_id: orderData.order_id,
        title: orderData.title || '',
        customer_name: orderData.customer_name || '',
        status: 'waiting',
        assigned_to: null,
        assigned_name: null,
        assigned_at: null,
        created_at: new Date().toLocaleString('zh-CN'),
        completed_at: null,
        costs: []
    };
    mockData.taskPool.push(newTask);
    saveDataToStorage();
    return { success: true, data: newTask };
}

function acceptTask(taskId, userId, userName) {
    if (!mockData.taskPool) return { success: false, message: '任务不存在' };
    const task = mockData.taskPool.find(t => t.id === taskId);
    if (!task) return { success: false, message: '任务不存在' };
    if (task.status !== 'waiting') return { success: false, message: '任务已被接单' };
    task.status = 'in_progress';
    task.assigned_to = userId;
    task.assigned_name = userName;
    task.assigned_at = new Date().toLocaleString('zh-CN');
    // 同步更新订单状态
    const order = mockData.orders.find(o => o.id === task.order_id);
    if (order) order.status = '服务中';
    saveDataToStorage();
    return { success: true, data: task };
}

function completeTask(taskId) {
    if (!mockData.taskPool) return { success: false, message: '任务不存在' };
    const task = mockData.taskPool.find(t => t.id === taskId);
    if (!task) return { success: false, message: '任务不存在' };
    task.status = 'completed';
    task.completed_at = new Date().toLocaleString('zh-CN');
    // 同步更新订单状态
    const order = mockData.orders.find(o => o.id === task.order_id);
    if (order) order.status = '已完成';
    saveDataToStorage();
    return { success: true, data: task };
}

function addTaskCost(taskId, costData) {
    if (!mockData.taskPool) return { success: false, message: '任务不存在' };
    const task = mockData.taskPool.find(t => t.id === taskId);
    if (!task) return { success: false, message: '任务不存在' };
    if (!task.costs) task.costs = [];
    const newCost = {
        id: task.costs.length > 0 ? Math.max(...task.costs.map(c => c.id)) + 1 : 1,
        category_id: costData.category_id,
        category_name: costData.category_name || '',
        amount: parseFloat(costData.amount) || 0,
        remark: costData.remark || '',
        date: costData.date || new Date().toISOString().split('T')[0]
    };
    task.costs.push(newCost);
    saveDataToStorage();
    return { success: true, data: newCost };
}

function removeTaskCost(taskId, costId) {
    if (!mockData.taskPool) return { success: false, message: '任务不存在' };
    const task = mockData.taskPool.find(t => t.id === taskId);
    if (!task || !task.costs) return { success: false, message: '成本记录不存在' };
    const index = task.costs.findIndex(c => c.id === costId);
    if (index === -1) return { success: false, message: '成本记录不存在' };
    task.costs.splice(index, 1);
    saveDataToStorage();
    return { success: true };
}

// === 服务/商品管理 ===
function addService(serviceData) {
    const newService = {
        ...serviceData,
        id: mockData.services.length > 0 ? Math.max(...mockData.services.map(s => s.id)) + 1 : 1,
        code: serviceData.code || `${serviceData.type === 'product' ? 'P' : 'S'}${String(mockData.services.length + 1).padStart(3, '0')}`,
        status: 'active'
    };
    mockData.services.push(newService);
    saveDataToStorage();
    return { success: true, data: newService };
}

function updateService(id, serviceData) {
    const index = mockData.services.findIndex(s => s.id === id);
    if (index === -1) return { success: false, message: '服务/商品不存在' };
    
    mockData.services[index] = {
        ...mockData.services[index],
        ...serviceData,
        id: mockData.services[index].id
    };
    saveDataToStorage();
    return { success: true, data: mockData.services[index] };
}

function deleteService(id) {
    const index = mockData.services.findIndex(s => s.id === id);
    if (index === -1) return { success: false, message: '服务/商品不存在' };
    
    mockData.services.splice(index, 1);
    saveDataToStorage();
    return { success: true };
}

function addServicePackage(packageData) {
    const newPackage = {
        ...packageData,
        id: mockData.servicePackages.length > 0 ? Math.max(...mockData.servicePackages.map(p => p.id)) + 1 : 1,
        code: packageData.code || `PKG${String(mockData.servicePackages.length + 1).padStart(3, '0')}`,
        status: 'active'
    };
    mockData.servicePackages.push(newPackage);
    saveDataToStorage();
    return { success: true, data: newPackage };
}

function updateServicePackage(id, packageData) {
    const index = mockData.servicePackages.findIndex(p => p.id === id);
    if (index === -1) return { success: false, message: '服务包不存在' };
    
    mockData.servicePackages[index] = {
        ...mockData.servicePackages[index],
        ...packageData,
        id: mockData.servicePackages[index].id
    };
    saveDataToStorage();
    return { success: true, data: mockData.servicePackages[index] };
}

function deleteServicePackage(id) {
    const index = mockData.servicePackages.findIndex(p => p.id === id);
    if (index === -1) return { success: false, message: '服务包不存在' };
    
    mockData.servicePackages.splice(index, 1);
    saveDataToStorage();
    return { success: true };
}

// 订单售后处理（逆流程）
function addOrderAfterSales(orderId, afterSalesData) {
    const order = mockData.orders.find(o => o.id === orderId);
    if (!order) return { success: false, message: '订单不存在' };
    
    order.status = '售后中';
    if (!order.after_sales) order.after_sales = [];
    
    const newRecord = {
        id: order.after_sales.length + 1,
        date: new Date().toISOString().split('T')[0],
        type: afterSalesData.type,
        content: afterSalesData.content,
        amount: afterSalesData.amount || 0
    };
    
    order.after_sales.push(newRecord);
    
    // 如果涉及退款
    if (afterSalesData.amount > 0) {
        const transactionData = {
            id: `tx_ref_${Date.now()}`,
            transaction_type: "支出",
            transaction_date: newRecord.date,
            payer_name: currentCompany ? currentCompany.name : '公司账户',
            payee_name: mockData.customers.find(c => c.id === order.customer_id)?.shop_name || '订单客户',
            amount: -afterSalesData.amount,
            purpose: "订单退款",
            remark: `订单 ${orderId} 售后退款`,
            account_id: afterSalesData.account_id,
            company_id: currentUser?.company_id || 1,
            created_by: currentUser?.id || 1,
            audit_status: "待审核",
            is_void: 0
        };
        addTransaction(transactionData);
    }
    
    saveDataToStorage();
    return { success: true };
}

// 导出函数
if (typeof window !== 'undefined') {
    window.db = {
        login,
        getCurrentUser,
        setCurrentUser,
        getCurrentCompany,
        checkPermission,
        getCompanies,
        getTransactions,
        getAccounts,
        addOperationLog,
        addTransaction,
        updateTransaction,
        getAccountsByCompany,
        getCurrentAccountingPeriod,
        getTransactionsByPeriod,
        getChartOfAccounts,
        getAccountBalance,
        getAccountingPeriods,
        getCashTransactionsByPeriod,
        getBeginningCashBalance,
        getIncomeStatementData,
        getEquityTransactionsByPeriod,
        getBeginningEquityBalance,
        getSystemSettings,
        saveSystemSettings,
        // 客户管理
        getCustomers,
        getAllCustomers,
        getCustomerById,
        getUsers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        // 服务/商品管理
        getServices,
        addService,
        updateService,
        deleteService,
        getServicePackages,
        addServicePackage,
        updateServicePackage,
        deleteServicePackage,
        // 订单管理
        getOrders,
        addOrder,
        updateOrder,
        addOrderPayment,
        addOrderAfterSales,
        // 供应商管理
        getSuppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        // 采购单管理
        getPurchases,
        addPurchase,
        updatePurchase,
        warehousePurchase,
        // 库存管理
        getInventory,
        getInventoryLogs,
        stockOut,
        adjustInventory,
        // 部门和团队管理
        getDepartments,
        addDepartment,
        updateDepartment,
        getTeams,
        addTeam,
        updateTeam,
        // 用户管理
        addUser,
        updateUser,
        deleteUser,
        // 岗位管理
        getPositions,
        addPosition,
        updatePosition,
        deletePosition,
        // 业务成本管理
        getCostCategories,
        addCostCategory,
        updateCostCategory,
        deleteCostCategory,
        // 任务池管理
        getTaskPool,
        addTaskToPool,
        acceptTask,
        completeTask,
        addTaskCost,
        removeTaskCost,
        // 其他
        getDefaultData
    };
}
