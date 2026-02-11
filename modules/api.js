// API 请求模块
// 统一管理所有后端 API 调用

// 判断当前是否为本地预览环境
const isLocalPreview = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalPreview ? 'http://localhost:5000/api' : '/api';

// 通用请求函数
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    // 如果有 body 数据，转换为 JSON
    if (finalOptions.body && typeof finalOptions.body === 'object') {
        finalOptions.body = JSON.stringify(finalOptions.body);
    }
    
    try {
        const response = await fetch(url, finalOptions);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `HTTP错误: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API请求失败:', error);
        throw error;
    }
}

// ==================== 用户相关 API ====================

// 用户登录
async function apiLogin(username, password) {
    return apiRequest('/users/login', {
        method: 'POST',
        body: { username, password }
    });
}

// 获取用户列表
async function apiGetUsers() {
    return apiRequest('/users');
}

// 添加用户
async function apiAddUser(userData) {
    return apiRequest('/users', {
        method: 'POST',
        body: userData
    });
}

// 更新用户
async function apiUpdateUser(userId, userData) {
    return apiRequest(`/users/${userId}`, {
        method: 'PUT',
        body: userData
    });
}

// ==================== 客户相关 API ====================

// 获取客户列表（支持分页、搜索、筛选）
async function apiGetCustomers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/customers${queryString ? '?' + queryString : ''}`);
}

// 获取单个客户详情
async function apiGetCustomer(customerId) {
    return apiRequest(`/customers/${customerId}`);
}

// 添加客户
async function apiAddCustomer(customerData) {
    return apiRequest('/customers', {
        method: 'POST',
        body: customerData
    });
}

// 更新客户
async function apiUpdateCustomer(customerId, customerData) {
    return apiRequest(`/customers/${customerId}`, {
        method: 'PUT',
        body: customerData
    });
}

// 删除客户
async function apiDeleteCustomer(customerId) {
    return apiRequest(`/customers/${customerId}`, {
        method: 'DELETE'
    });
}

// ==================== 系统设置 API ====================

// 获取系统设置
async function apiGetSettings() {
    return apiRequest('/settings');
}

// ==================== 组织架构 API ====================

// 部门管理
async function apiGetDepartments() {
    return apiRequest('/departments');
}

async function apiAddDepartment(deptData) {
    return apiRequest('/departments', {
        method: 'POST',
        body: deptData
    });
}

async function apiUpdateDepartment(deptId, deptData) {
    return apiRequest(`/departments/${deptId}`, {
        method: 'PUT',
        body: deptData
    });
}

async function apiDeleteDepartment(deptId) {
    return apiRequest(`/departments/${deptId}`, {
        method: 'DELETE'
    });
}

// 团队管理
async function apiGetTeams() {
    return apiRequest('/teams');
}

async function apiAddTeam(teamData) {
    return apiRequest('/teams', {
        method: 'POST',
        body: teamData
    });
}

async function apiUpdateTeam(teamId, teamData) {
    return apiRequest(`/teams/${teamId}`, {
        method: 'PUT',
        body: teamData
    });
}

async function apiDeleteTeam(teamId) {
    return apiRequest(`/teams/${teamId}`, {
        method: 'DELETE'
    });
}

// 岗位管理
async function apiGetPositions() {
    return apiRequest('/positions');
}

async function apiAddPosition(posData) {
    return apiRequest('/positions', {
        method: 'POST',
        body: posData
    });
}

async function apiUpdatePosition(posId, posData) {
    return apiRequest(`/positions/${posId}`, {
        method: 'PUT',
        body: posData
    });
}

async function apiDeletePosition(posId) {
    return apiRequest(`/positions/${posId}`, {
        method: 'DELETE'
    });
}

// ==================== 健康检查 ====================

// API 健康检查
async function apiHealthCheck() {
    return apiRequest('/health');
}

// ==================== 订单管理 API ====================

// 获取订单列表（支持分页、搜索、筛选）
async function apiGetOrders(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/orders${queryString ? '?' + queryString : ''}`);
}

// 获取单个订单详情
async function apiGetOrder(orderId) {
    return apiRequest(`/orders/${orderId}`);
}

// 添加订单
async function apiAddOrder(orderData) {
    return apiRequest('/orders', {
        method: 'POST',
        body: orderData
    });
}

// 更新订单
async function apiUpdateOrder(orderId, orderData) {
    return apiRequest(`/orders/${orderId}`, {
        method: 'PUT',
        body: orderData
    });
}

// 删除订单
async function apiDeleteOrder(orderId) {
    return apiRequest(`/orders/${orderId}`, {
        method: 'DELETE'
    });
}

// ==================== 服务/商品管理 API ====================

// 获取服务列表
async function apiGetServices() {
    return apiRequest('/services');
}

// 添加服务
async function apiAddService(serviceData) {
    return apiRequest('/services', {
        method: 'POST',
        body: serviceData
    });
}

// 更新服务
async function apiUpdateService(serviceId, serviceData) {
    return apiRequest(`/services/${serviceId}`, {
        method: 'PUT',
        body: serviceData
    });
}

// 删除服务（软删除）
async function apiDeleteService(serviceId) {
    return apiRequest(`/services/${serviceId}`, {
        method: 'DELETE'
    });
}

// 获取回收站商品/服务
async function apiGetRecycleServices() {
    return apiRequest('/services/recycle');
}

// 恢复商品/服务
async function apiRestoreService(serviceId) {
    return apiRequest(`/services/${serviceId}/restore`, {
        method: 'PUT'
    });
}

// 永久删除商品/服务
async function apiPermanentDeleteService(serviceId) {
    return apiRequest(`/services/${serviceId}/permanent`, {
        method: 'DELETE'
    });
}

// ==================== 商品属性模板 API ====================

// 获取商品类型模板列表
async function apiGetProductTemplates() {
    return apiRequest('/product-templates');
}

// 新增商品类型模板
async function apiAddProductTemplate(templateData) {
    return apiRequest('/product-templates', {
        method: 'POST',
        body: templateData
    });
}

// 更新商品类型模板
async function apiUpdateProductTemplate(templateId, templateData) {
    return apiRequest(`/product-templates/${templateId}`, {
        method: 'PUT',
        body: templateData
    });
}

// 删除商品类型模板
async function apiDeleteProductTemplate(templateId) {
    return apiRequest(`/product-templates/${templateId}`, {
        method: 'DELETE'
    });
}

// 获取模板的自定义字段
async function apiGetTemplateFields(templateId) {
    return apiRequest(`/product-templates/${templateId}/fields`);
}

// 新增自定义字段
async function apiAddProductField(fieldData) {
    return apiRequest('/product-fields', {
        method: 'POST',
        body: fieldData
    });
}

// 更新自定义字段
async function apiUpdateProductField(fieldId, fieldData) {
    return apiRequest(`/product-fields/${fieldId}`, {
        method: 'PUT',
        body: fieldData
    });
}

// 删除自定义字段
async function apiDeleteProductField(fieldId) {
    return apiRequest(`/product-fields/${fieldId}`, {
        method: 'DELETE'
    });
}

// 保存商品的自定义字段值
async function apiSaveServiceCustomFields(serviceId, customFields) {
    return apiRequest(`/services/${serviceId}/custom-fields`, {
        method: 'POST',
        body: { custom_fields: customFields }
    });
}

// 获取商品的自定义字段值
async function apiGetServiceCustomFields(serviceId) {
    return apiRequest(`/services/${serviceId}/custom-fields`);
}

// 导出 API 函数到全局作用域
window.api = {
    // 用户
    login: apiLogin,
    getUsers: apiGetUsers,
    addUser: apiAddUser,
    updateUser: apiUpdateUser,
    
    // 客户
    getCustomers: apiGetCustomers,
    getCustomer: apiGetCustomer,
    addCustomer: apiAddCustomer,
    updateCustomer: apiUpdateCustomer,
    deleteCustomer: apiDeleteCustomer,
    
    // 部门
    getDepartments: apiGetDepartments,
    addDepartment: apiAddDepartment,
    updateDepartment: apiUpdateDepartment,
    deleteDepartment: apiDeleteDepartment,
    
    // 团队
    getTeams: apiGetTeams,
    addTeam: apiAddTeam,
    updateTeam: apiUpdateTeam,
    deleteTeam: apiDeleteTeam,
    
    // 岗位
    getPositions: apiGetPositions,
    addPosition: apiAddPosition,
    updatePosition: apiUpdatePosition,
    deletePosition: apiDeletePosition,
    
    // 订单
    getOrders: apiGetOrders,
    getOrder: apiGetOrder,
    addOrder: apiAddOrder,
    updateOrder: apiUpdateOrder,
    deleteOrder: apiDeleteOrder,
    
    // 财务流水
    getTransactions: apiGetTransactions,
    getTransaction: apiGetTransaction,
    addTransaction: apiAddTransaction,
    updateTransaction: apiUpdateTransaction,
    deleteTransaction: apiDeleteTransaction,
    batchAddTransactions: apiBatchAddTransactions,
    
    // 账户管理
    getAccounts: apiGetAccounts,
    getAccount: apiGetAccount,
    addAccount: apiAddAccount,
    updateAccount: apiUpdateAccount,
    deleteAccount: apiDeleteAccount,
    
    // 公司管理
    getCompanies: apiGetCompanies,
    addCompany: apiAddCompany,
    updateCompany: apiUpdateCompany,
    deleteCompany: apiDeleteCompany,
    
    // 分类管理
    getCategories: apiGetCategories,
    addCategory: apiAddCategory,
    
    // 服务商品
    getServices: apiGetServices,
    addService: apiAddService,
    updateService: apiUpdateService,
    deleteService: apiDeleteService,
    getRecycleServices: apiGetRecycleServices,
    restoreService: apiRestoreService,
    permanentDeleteService: apiPermanentDeleteService,
    
    // 商品属性模板
    getProductTemplates: apiGetProductTemplates,
    addProductTemplate: apiAddProductTemplate,
    updateProductTemplate: apiUpdateProductTemplate,
    deleteProductTemplate: apiDeleteProductTemplate,
    getTemplateFields: apiGetTemplateFields,
    addProductField: apiAddProductField,
    updateProductField: apiUpdateProductField,
    deleteProductField: apiDeleteProductField,
    saveServiceCustomFields: apiSaveServiceCustomFields,
    getServiceCustomFields: apiGetServiceCustomFields,
    
    // 任务池
    getTasks: apiGetTasks,
    addTask: apiAddTask,
    acceptTask: apiAcceptTask,
    
    // 进销存
    getSuppliers: apiGetSuppliers,
    addSupplier: apiAddSupplier,
    getPurchases: apiGetPurchases,
    addPurchase: apiAddPurchase,
    
    // 系统设置
    getSystemSettings: apiGetSystemSettings,
    updateSystemSetting: apiUpdateSystemSetting,
    addSystemSetting: apiAddSystemSetting,
    
    // 系统
    getSettings: apiGetSettings,
    healthCheck: apiHealthCheck
};

// 分类管理
async function apiGetCategories(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/categories${queryString ? '?' + queryString : ''}`);
}

async function apiAddCategory(categoryData) {
    return apiRequest('/categories', {
        method: 'POST',
        body: categoryData
    });
}

// 服务商品管理
async function apiGetServices() {
    return apiRequest('/services');
}

async function apiAddService(serviceData) {
    return apiRequest('/services', {
        method: 'POST',
        body: serviceData
    });
}

// 任务池管理
async function apiGetTasks(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/tasks${queryString ? '?' + queryString : ''}`);
}

async function apiAddTask(taskData) {
    return apiRequest('/tasks', {
        method: 'POST',
        body: taskData
    });
}

async function apiAcceptTask(taskId, assigneeId) {
    return apiRequest(`/tasks/${taskId}/accept`, {
        method: 'PUT',
        body: { assignee_id: assigneeId }
    });
}

// 进销存管理
async function apiGetSuppliers() {
    return apiRequest('/suppliers');
}

async function apiAddSupplier(supplierData) {
    return apiRequest('/suppliers', {
        method: 'POST',
        body: supplierData
    });
}

async function apiGetPurchases() {
    return apiRequest('/purchases');
}

async function apiAddPurchase(purchaseData) {
    return apiRequest('/purchases', {
        method: 'POST',
        body: purchaseData
    });
}

// 系统设置管理
async function apiGetSystemSettings() {
    return apiRequest('/system-settings');
}

async function apiUpdateSystemSetting(settingKey, value) {
    return apiRequest(`/system-settings/${settingKey}`, {
        method: 'PUT',
        body: { value: value }
    });
}

async function apiAddSystemSetting(key, value, description) {
    return apiRequest('/system-settings', {
        method: 'POST',
        body: { key, value, description }
    });
}

// 公司管理
async function apiGetCompanies() {
    return apiRequest('/companies');
}

async function apiAddCompany(companyData) {
    return apiRequest('/companies', {
        method: 'POST',
        body: companyData
    });
}

async function apiUpdateCompany(companyId, companyData) {
    return apiRequest(`/companies/${companyId}`, {
        method: 'PUT',
        body: companyData
    });
}

async function apiDeleteCompany(companyId) {
    return apiRequest(`/companies/${companyId}`, {
        method: 'DELETE'
    });
}

// 账户管理
async function apiGetAccounts() {
    return apiRequest('/accounts');
}

async function apiGetAccount(accountId) {
    return apiRequest(`/accounts/${accountId}`);
}

async function apiAddAccount(accountData) {
    return apiRequest('/accounts', {
        method: 'POST',
        body: accountData
    });
}

async function apiUpdateAccount(accountId, accountData) {
    return apiRequest(`/accounts/${accountId}`, {
        method: 'PUT',
        body: accountData
    });
}

async function apiDeleteAccount(accountId) {
    return apiRequest(`/accounts/${accountId}`, {
        method: 'DELETE'
    });
}

// 财务流水管理
async function apiGetTransactions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/transactions${queryString ? '?' + queryString : ''}`);
}

async function apiGetTransaction(transactionId) {
    return apiRequest(`/transactions/${transactionId}`);
}

async function apiAddTransaction(transactionData) {
    return apiRequest('/transactions', {
        method: 'POST',
        body: transactionData
    });
}

async function apiUpdateTransaction(transactionId, transactionData) {
    return apiRequest(`/transactions/${transactionId}`, {
        method: 'PUT',
        body: transactionData
    });
}

async function apiDeleteTransaction(transactionId) {
    return apiRequest(`/transactions/${transactionId}`, {
        method: 'DELETE'
    });
}

async function apiBatchAddTransactions(transactionsList) {
    return apiRequest('/transactions/batch', {
        method: 'POST',
        body: { transactions: transactionsList }
    });
}

console.log('API模块已加载');
