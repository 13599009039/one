// 交易记录模块（V3.0版）
// v24.3.10 - 使用SafeUtils防御性编程，批量修复getElementById（关键函数已完成）

// 交易类型配置
const transactionTypes = [
    { value: '收入', label: '收入', color: 'green' },
    { value: '支出', label: '支出', color: 'red' },
    { value: '内部转账', label: '内部转账', color: 'blue' },
    { value: '退款', label: '退款', color: 'orange' },
    { value: '代收款', label: '代收款', color: 'purple' },
    { value: '代付款', label: '代付款', color: 'yellow' }
];

// 当前页码
let currentPage = 1;
// 每页显示数量
let itemsPerPage = 10;

// 设置财务流水日期范围
// 设置日期范围快捷按钮（导出到全局供HTML调用）
window.setTransactionDateRange = function(range) {
    const today = new Date();
    let startDate, endDate;
    
    switch (range) {
        case 'today':
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            break;
            
        case 'week':
            const dayOfWeek = today.getDay();
            const monday = new Date(today);
            monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            startDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            break;
            
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            break;
            
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            break;
            
        default:
            return;
    }
    
    // 格式化为 YYYY-MM-DD
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    // 设置日期输入框的值
    const startDateInput = SafeUtils.safeGetElement('startDate', 'setTransactionDateRange');
    const endDateInput = SafeUtils.safeGetElement('endDate', 'setTransactionDateRange');
    
    if (startDateInput) startDateInput.value = formatDate(startDate);
    if (endDateInput) endDateInput.value = formatDate(endDate);
    
    // 更新按钮样式
    updateTransactionDateButtonStyles(range);
    
    // 自动触发筛选
    loadTransactionData();
};

// 更新日期范围按钮样式
function updateTransactionDateButtonStyles(activeRange) {
    const buttons = {
        'today': SafeUtils.safeGetElement('btnTransToday', 'updateTransactionDateButtonStyles'),
        'week': SafeUtils.safeGetElement('btnTransWeek', 'updateTransactionDateButtonStyles'),
        'month': SafeUtils.safeGetElement('btnTransMonth', 'updateTransactionDateButtonStyles'),
        'year': SafeUtils.safeGetElement('btnTransYear', 'updateTransactionDateButtonStyles')
    };
    
    Object.keys(buttons).forEach(key => {
        const btn = buttons[key];
        if (btn) {
            if (key === activeRange) {
                btn.className = 'px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500';
            } else {
                btn.className = 'px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500';
            }
        }
    });
}

// 初始化流水记录页面
// 初始化流水记录页面（导出到全局供navigation.js调用）
window.initTransactionsPage = function() {
    console.log('[Transactions] 🚀 初始化流水记录页面...');
    
    // 应用权限控制到UI
    if (window.PermissionManager && window.PermissionManager.initialized) {
        const transactionsContainer = document.getElementById('transactions');
        if (transactionsContainer) {
            window.PermissionManager.applyPermissionsToUI(transactionsContainer);
            window.PermissionManager.applyPermissionsToDisable(transactionsContainer);
            console.log('[Transactions] ✅ 已应用权限控制');
        }
    }
    
    // 初始化日期选择器
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    // 获取元素并添加空值检查
    const startDateElement = SafeUtils.safeGetElement('startDate', 'initTransactionsPage');
    const endDateElement = SafeUtils.safeGetElement('endDate', 'initTransactionsPage');
    const filterButtonElement = SafeUtils.safeGetElement('filterTransactionsBtn', 'initTransactionsPage');
    const resetButtonElement = SafeUtils.safeGetElement('resetButton', 'initTransactionsPage');
    const itemsPerPageElement = SafeUtils.safeGetElement('itemsPerPage', 'initTransactionsPage');
    const searchInputElement = SafeUtils.safeGetElement('searchInput', 'initTransactionsPage');
    const transactionTypeFilterElement = SafeUtils.safeGetElement('transactionTypeFilter', 'initTransactionsPage');
    const accountFilterElement = SafeUtils.safeGetElement('accountFilter', 'initTransactionsPage');
    const auditStatusFilterElement = SafeUtils.safeGetElement('auditStatusFilter', 'initTransactionsPage');
    const addTransactionButtonElement = SafeUtils.safeGetElement('addTransactionBtn', 'initTransactionsPage');
    const transactionTypeElement = SafeUtils.safeGetElement('transactionType', 'initTransactionsPage');
    const transactionFormElement = SafeUtils.safeGetElement('transactionForm', 'initTransactionsPage');
    const closeModalElements = document.querySelectorAll('.close-modal');
    
    // 设置默认日期
    if (startDateElement) startDateElement.value = oneMonthAgo.toISOString().split('T')[0];
    if (endDateElement) endDateElement.value = today.toISOString().split('T')[0];
    
    // 加载账户下拉列表
    if (accountFilterElement) {
        loadAccountsForFilter();
    }
    
    // 绑定筛选按钮事件
    if (filterButtonElement) {
        filterButtonElement.addEventListener('click', function() {
            loadTransactionData();
        });
    }
    
    // 绑定重置按钮事件
    if (resetButtonElement) {
        resetButtonElement.addEventListener('click', function() {
            if (startDateElement) startDateElement.value = oneMonthAgo.toISOString().split('T')[0];
            if (endDateElement) endDateElement.value = today.toISOString().split('T')[0];
            if (transactionTypeFilterElement) transactionTypeFilterElement.value = '';
            if (accountFilterElement) accountFilterElement.value = '';
            if (auditStatusFilterElement) auditStatusFilterElement.value = '';
            if (searchInputElement) searchInputElement.value = '';
            if (itemsPerPageElement) itemsPerPageElement.value = '10';
            loadTransactionData();
        });
    }
    
    // 绑定每页显示数量变化事件
    if (itemsPerPageElement) {
        itemsPerPageElement.addEventListener('change', function() {
            currentPage = 1;
            loadTransactionData();
        });
    }
    
    // 绑定添加交易按钮事件（手工登记）
    if (addTransactionButtonElement) {
        addTransactionButtonElement.addEventListener('click', function() {
            openAddTransactionModal();
        });
    }
    
    // 绑定导入按钮事件
    const importButtonElement = SafeUtils.safeGetElement('importTransactionsBtn', 'initTransactionsPage');
    if (importButtonElement) {
        importButtonElement.addEventListener('click', function() {
            openImportModal();
        });
    }
    
    // 绑定取消交易按钮事件
    const cancelTransactionButton = SafeUtils.safeGetElement('cancelTransactionBtn', 'initTransactionsPage');
    if (cancelTransactionButton) {
        cancelTransactionButton.addEventListener('click', function() {
            console.log('点击了取消交易按钮');
            closeTransactionModal();
        });
    }
    
    // 批量登记按钮
    const batchTransactionButton = SafeUtils.safeGetElement('batchTransactionBtn', 'initTransactionsPage');
    if (batchTransactionButton) {
        batchTransactionButton.onclick = null;
        batchTransactionButton.addEventListener('click', function() {
            openBatchTransactionModal();
        });
    }
    
    // 绑定批量登记相关按钮事件
    const closeBatchModalBtn = SafeUtils.safeGetElement('closeBatchTransactionModal', 'initTransactionsPage');
    if (closeBatchModalBtn) {
        closeBatchModalBtn.addEventListener('click', closeBatchTransactionModal);
    }
    
    const cancelBatchBtn = SafeUtils.safeGetElement('cancelBatchTransactionBtn', 'initTransactionsPage');
    if (cancelBatchBtn) {
        cancelBatchBtn.addEventListener('click', closeBatchTransactionModal);
    }
    
    const addBatchRowBtn = SafeUtils.safeGetElement('addBatchRowBtn', 'initTransactionsPage');
    if (addBatchRowBtn) {
        addBatchRowBtn.addEventListener('click', () => addBatchRow(1));
    }

    const add5BatchRowsBtn = SafeUtils.safeGetElement('add5BatchRowsBtn', 'initTransactionsPage');
    if (add5BatchRowsBtn) {
        add5BatchRowsBtn.addEventListener('click', () => addBatchRow(5));
    }

    const add10BatchRowsBtn = SafeUtils.safeGetElement('add10BatchRowsBtn', 'initTransactionsPage');
    if (add10BatchRowsBtn) {
        add10BatchRowsBtn.addEventListener('click', () => addBatchRow(10));
    }
    
    const saveBatchBtn = SafeUtils.safeGetElement('saveBatchTransactionBtn', 'initTransactionsPage');
    if (saveBatchBtn) {
        saveBatchBtn.addEventListener('click', saveBatchTransactions);
    }
    
    // 绑定生成报表按钮事件
    const generateReportBtn = SafeUtils.safeGetElement('generateReportBtn', 'initTransactionsPage');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', function() {
            generateReport();
        });
    }
    
    // 绑定交易类型变化事件
    if (transactionTypeElement) {
        transactionTypeElement.addEventListener('change', function() {
            showHideFieldsByTransactionType(this.value);
        });
    }
    
    // 绑定表单提交事件
    if (transactionFormElement) {
        transactionFormElement.addEventListener('submit', function(e) {
            e.preventDefault();
            saveTransaction();
        });
    }
    
    // 绑定关闭模态框事件
    if (closeModalElements && closeModalElements.length > 0) {
        closeModalElements.forEach(element => {
            element.addEventListener('click', closeTransactionModal);
        });
    }
    
    // 点击模态框外部关闭模态框
    window.addEventListener('click', function(e) {
        const modal = document.querySelector('.modal');
        if (modal && e.target === modal) {
            closeTransactionModal();
        }
    });
    
    // 初始化权限控制
    initPermissionControls();
    
    // 初始加载交易数据
    loadTransactionData();
    
    // 初始化报表页面功能
    if (typeof initReportsPage === 'function') {
        initReportsPage();
    }
};

// 加载账户数据用于筛选
async function loadAccountsForFilter() {
    const accountFilterElement = SafeUtils.safeGetElement('accountFilter', 'loadAccountsForFilter');
    if (!accountFilterElement) return;
    
    try {
        // ✅ 使用 API 替代 database.js
        const result = await window.api.getAccounts();
        if (result.success) {
            // 清空现有选项
            accountFilterElement.innerHTML = '<option value="">全部账户</option>';
            
            // 添加账户选项
            result.data.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.name} (${account.bank_name || account.code})`;
                accountFilterElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载账户列表失败:', error);
    }
}

// 初始化权限控制
async function initPermissionControls() {
    try {
        // ✅ 使用 API 替代 database.js
        const userResult = await window.api.getCurrentUser();
        if (!userResult.success) return;
        
        const currentUser = userResult.data;
        
        // 控制按钮显示
        const addButton = SafeUtils.safeGetElement('addTransactionBtn', 'initPermissions');
        const editButtons = document.querySelectorAll('.edit-transaction-btn');
        const deleteButtons = document.querySelectorAll('.delete-transaction-btn');
        const auditButtons = document.querySelectorAll('.audit-transaction-btn');
        
        // 财务录入岗和管理员可以添加和编辑
        if (addButton) {
            // 所有登录用户都可以添加现金收入记录
            addButton.style.display = 'block';
        }
        
        // 财务审核岗可以审核
        auditButtons.forEach(btn => {
            if (currentUser.role === 'financial_audit' || currentUser.role === 'admin' || currentUser.role === 'superadmin') {
                btn.style.display = 'inline-block';
            } else {
                btn.style.display = 'none';
            }
        });
    } catch (error) {
        console.error('初始化权限控制失败:', error);
    }
}



// 关闭交易模态框
// 关闭所有模态框（统一处理）
function closeAllModals() {
    console.log('执行closeAllModals函数');
    
    // 隐藏所有模态框
    const modals = document.querySelectorAll('.modal');
    if (modals && modals.length > 0) {
        console.log('找到', modals.length, '个模态框，全部隐藏');
        modals.forEach(modal => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        });
    } else {
        console.log('未找到模态框元素');
    }
    
    // 清空文件输入
    const attachmentInput = SafeUtils.safeGetElement('attachment', 'closeAllModals');
    if (attachmentInput) {
        attachmentInput.value = '';
    }
}

// 编辑交易记录
async function editTransaction(transaction, index) {
    try {
        // 检查权限
        const userResult = await window.api.getCurrentUser();
        if (!userResult.success) {
            showNotification('获取用户信息失败', 'error');
            return;
        }
        const currentUser = userResult.data;
        if (currentUser.role === 'financial_view') {
            alert('您没有编辑权限！');
            return;
        }
        
        // 已审核的记录不能编辑
        if (transaction.audit_status === '已审核') {
            alert('已审核的记录不能编辑！');
            return;
        }
    
        // 显示编辑模态框
        SafeUtils.safeSetText('modalTitle', '编辑交易记录');
        
        // 加载配置管理数据到下拉列表
        loadConfigurationToDropdowns();
        
        // 填充表单数据
        SafeUtils.safeSetValue('transactionDate', transaction.transaction_date);
        SafeUtils.safeSetValue('transactionType', transaction.transaction_type);
        SafeUtils.safeSetValue('payerBank', transaction.payer_bank);
        SafeUtils.safeSetValue('payerName', transaction.payer_name);
        SafeUtils.safeSetValue('payeeBank', transaction.payee_bank);
        SafeUtils.safeSetValue('payeeName', transaction.payee_name);
        SafeUtils.safeSetValue('amount', Math.abs(transaction.amount));
        
        // 填充配置管理项目数据
        SafeUtils.safeSetValue('personnel', transaction.personnel || '');
        SafeUtils.safeSetValue('department', transaction.department || '');
        SafeUtils.safeSetValue('project', transaction.project || '');
        SafeUtils.safeSetValue('team', transaction.team || '');
        SafeUtils.safeSetValue('expenseCategory', transaction.expenseCategory || '');
        SafeUtils.safeSetValue('account', transaction.account || '');
        SafeUtils.safeSetValue('balanceAfter', transaction.balance_after);
        SafeUtils.safeSetValue('purpose', transaction.purpose);
        SafeUtils.safeSetValue('remark', transaction.remark);
        
        // 根据交易类型显示/隐藏特定字段
        showHideFieldsByTransactionType(transaction.transaction_type);
        
        // 显示模态框
        document.querySelector('.modal').classList.remove('hidden');
        
        // 保存原始交易数据
        window.currentEditingTransaction = transaction;
        window.currentEditingIndex = index;
    } catch (error) {
        console.error('❌ 编辑交易记录失败:', error);
        showNotification('编辑交易记录失败：' + error.message, 'error');
    }
}

// 加载配置管理数据到下拉列表
async function loadConfigurationToDropdowns() {
    console.log('执行loadConfigurationToDropdowns函数');
    
    // 加载分类选项
    const categorySelect = document.getElementById('transactionCategory');
    if (categorySelect) {
        // 简化处理，直接添加一些默认分类选项
        categorySelect.innerHTML = `
            <option value="income_001">销售收入</option>
            <option value="income_002">投资收益</option>
            <option value="income_003">其他收入</option>
            <option value="expense_001">办公费用</option>
            <option value="expense_002">人员工资</option>
            <option value="expense_003">差旅费</option>
            <option value="expense_004">采购成本</option>
        `;
    }
    
    // 加载账户选项
    const accountSelect = document.getElementById('transactionAccount');
    if (accountSelect) {
        // 从API获取实际账户数据
        try {
            const result = await window.api.getAccounts();
            if (result.success && result.data) {
                accountSelect.innerHTML = '';
                result.data.forEach(account => {
                    const option = document.createElement('option');
                    option.value = account.id;
                    option.textContent = `${account.name} (${account.bank_name || ''})`;
                    accountSelect.appendChild(option);
                });
            } else {
                // API失败时使用默认选项
                accountSelect.innerHTML = `
                    <option value="1">中国银行基本户 (中国银行)</option>
                    <option value="2">工商银行一般户 (工商银行)</option>
                `;
            }
        } catch (error) {
            console.error('❌ 加载账户失败:', error);
            // 数据库不可用时使用默认选项
            accountSelect.innerHTML = `
                <option value="1">中国银行基本户 (中国银行)</option>
                <option value="2">工商银行一般户 (工商银行)</option>
            `;
        }
    }
    
    console.log('loadConfigurationToDropdowns函数执行完成');
}

// 获取配置类型的中文名称
function getConfigTypeName(type) {
    const typeNames = {
        personnel: '人员',
        department: '部门',
        project: '项目',
        team: '团队',
        expenseCategory: '费用类别',
        account: '资金账户'
    };
    return typeNames[type] || type;
}

// 根据ID获取配置项名称
function getConfigItemName(type, id) {
    if (!id) return '';
    
    const configData = window.getConfigurationData ? window.getConfigurationData(type) : [];
    const item = configData.find(item => item.id == id);
    return item ? item.name : '';
}

// 打开添加交易记录模态框
function openAddTransactionModal() {
    closeAllModals();
    
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.textContent = '添加交易记录';
    
    const transactionForm = document.getElementById('transactionForm');
    if (transactionForm) transactionForm.reset();
    
    const transactionDate = document.getElementById('transactionDate');
    if (transactionDate) transactionDate.value = new Date().toISOString().split('T')[0];
    
    const transactionType = document.getElementById('transactionType');
    if (transactionType) transactionType.value = '收入';
    
    const transferAccountDiv = document.getElementById('transferAccountDiv');
    const payerDiv = document.getElementById('payerDiv');
    const payeeDiv = document.getElementById('payeeDiv');
    const payerBankDiv = document.getElementById('payerBankDiv');
    const payeeBankDiv = document.getElementById('payeeBankDiv');
    
    if (transferAccountDiv) transferAccountDiv.style.display = 'none';
    if (payerDiv) payerDiv.style.display = 'none';
    if (payeeDiv) payeeDiv.style.display = 'none';
    if (payerBankDiv) payerBankDiv.style.display = 'none';
    if (payeeBankDiv) payeeBankDiv.style.display = 'none';
    
    loadConfigurationToDropdowns();
    loadOrdersToDropdown();
    
    window.currentEditingTransaction = null;
    window.currentEditingIndex = null;
    
    const modal = document.getElementById('transactionModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = '10000';
    }
}

// 根据交易类型显示/隐藏字段
function showHideFieldsByTransactionType(type) {
    console.log('执行showHideFieldsByTransactionType函数，交易类型:', type);
    
    const transferAccountDiv = document.getElementById('transferAccountDiv');
    const payerDiv = document.getElementById('payerDiv');
    const payeeDiv = document.getElementById('payeeDiv');
    const payerBankDiv = document.getElementById('payerBankDiv');
    const payeeBankDiv = document.getElementById('payeeBankDiv');
    
    console.log('获取到的元素:', {
        transferAccountDiv: transferAccountDiv ? '找到' : '未找到',
        payerDiv: payerDiv ? '找到' : '未找到',
        payeeDiv: payeeDiv ? '找到' : '未找到',
        payerBankDiv: payerBankDiv ? '找到' : '未找到',
        payeeBankDiv: payeeBankDiv ? '找到' : '未找到'
    });
    
    if (type === '内部转账') {
        if (transferAccountDiv) transferAccountDiv.style.display = 'block';
        if (payerDiv) payerDiv.style.display = 'none';
        if (payeeDiv) payeeDiv.style.display = 'none';
        if (payerBankDiv) payerBankDiv.style.display = 'none';
        if (payeeBankDiv) payeeBankDiv.style.display = 'none';
        console.log('设置内部转账类型的字段显示状态');
    } else {
        if (transferAccountDiv) transferAccountDiv.style.display = 'none';
        if (payerDiv) payerDiv.style.display = 'block';
        if (payeeDiv) payeeDiv.style.display = 'block';
        if (payerBankDiv) payerBankDiv.style.display = 'block';
        if (payeeBankDiv) payeeBankDiv.style.display = 'block';
        console.log('设置非内部转账类型的字段显示状态');
    }
    
    console.log('showHideFieldsByTransactionType函数执行完成');
}

// 关闭交易记录模态框
// 保留兼容性函数，重定向到closeAllModals
function closeTransactionModal() {
    console.log('closeTransactionModal被调用，重定向到closeAllModals');
    closeAllModals();
}

// 打开导入交易记录模态框
function openImportModal() {
    console.log('执行openImportModal函数');
    
    // 先关闭所有其他模态框
    closeAllModals();
    
    // 显示导入模态框
    const importModal = document.getElementById('importModal');
    if (importModal) {
        importModal.classList.remove('hidden');
        importModal.style.display = 'flex';
        importModal.style.visibility = 'visible';
        importModal.style.opacity = '1';
        importModal.style.zIndex = '10000';
        console.log('显示导入模态框成功');
    } else {
        console.log('未找到导入模态框元素');
    }
    
    // 设置默认日期
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    const importStartDate = document.getElementById('importStartDate');
    const importEndDate = document.getElementById('importEndDate');
    
    if (importStartDate) importStartDate.value = oneMonthAgo.toISOString().split('T')[0];
    if (importEndDate) importEndDate.value = today.toISOString().split('T')[0];
    
    // 初始化导入模态框的事件监听器
    // 绑定文件选择事件
    const importFile = document.getElementById('importFile');
    if (importFile) {
        // 先移除已有的事件监听器
        importFile.replaceWith(importFile.cloneNode(true));
        // 重新添加事件监听器
        const newImportFile = document.getElementById('importFile');
        newImportFile.addEventListener('change', handleFileSelect);
    }
    
    // 绑定导入按钮事件
    const confirmImportButton = document.getElementById('confirmImportButton');
    if (confirmImportButton) {
        // 先移除已有的事件监听器
        confirmImportButton.replaceWith(confirmImportButton.cloneNode(true));
        // 重新添加事件监听器
        const newConfirmImportButton = document.getElementById('confirmImportButton');
        newConfirmImportButton.addEventListener('click', confirmImport);
    }
    
    // 绑定下载示例表格按钮事件
    const downloadSampleLink = document.getElementById('downloadSampleLink');
    if (downloadSampleLink) {
        downloadSampleLink.addEventListener('click', function(e) {
            e.preventDefault();
            downloadSampleCSV();
        });
    }
    
    // 绑定取消导入按钮事件
    const cancelImportButton = document.getElementById('cancelImportBtn');
    if (cancelImportButton) {
        // 先移除已有的事件监听器
        cancelImportButton.replaceWith(cancelImportButton.cloneNode(true));
        // 重新添加事件监听器
        const newCancelImportButton = document.getElementById('cancelImportBtn');
        newCancelImportButton.addEventListener('click', closeTransactionModal);
    }
}

// 下载示例CSV文件
function downloadSampleCSV() {
    // 定义CSV字段名
    const fields = [
        '交易日期',
        '交易类型',
        '付款人名称',
        '付款人银行',
        '收款人名称',
        '收款人银行',
        '金额',
        '用途',
        '备注',
        '人员',
        '部门',
        '项目',
        '团队',
        '费用类别',
        '资金账户',
        '交易后余额'
    ];
    
    // 定义示例数据
    const data = [
        ['2023-01-01', '收入', '客户A', '工商银行', '我公司', '招商银行', '10000.00', '产品销售', '销售合同No.2023001', '张三', '销售部', '项目X', '团队1', '产品销售收入', '银行存款', '50000.00'],
        ['2023-01-02', '支出', '我公司', '招商银行', '供应商B', '建设银行', '5000.00', '采购原材料', '采购合同No.2023002', '李四', '采购部', '项目Y', '团队2', '原材料采购', '银行存款', '45000.00'],
        ['2023-01-03', '内部转账', '', '', '', '', '2000.00', '资金调拨', '从银行存款到备用金', '', '', '', '', '', '备用金', '3000.00']
    ];
    
    // 生成CSV内容
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'; // 添加BOM以支持中文
    
    // 添加字段名
    csvContent += fields.join(',') + '\n';
    
    // 添加数据行
    data.forEach(row => {
        const escapedRow = row.map(cell => {
            // 转义包含逗号、双引号或换行符的单元格
            if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                return '"' + cell.replace(/"/g, '""') + '"';
            }
            return cell;
        });
        csvContent += escapedRow.join(',') + '\n';
    });
    
    // 创建下载链接并触发下载
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', '交易记录导入模板.csv');
    document.body.appendChild(link);
    link.click();
}

// 打开批量登记交易记录模态框
window.openBatchTransactionModal = function() {
    console.log('开始执行openBatchTransactionModal函数');
    
    closeAllModals();
    
    const modal = document.getElementById('batchTransactionModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.zIndex = '10000';
    }
    
    const tableBody = document.getElementById('batchTransactionsTableBody');
    if (tableBody) {
        if (tableBody.rows.length === 0) {
            addBatchRow(5); // 默认打开时添加5行
        }
    }
}

// 关闭批量登记交易记录模态框
function closeBatchTransactionModal() {
    console.log('执行closeBatchTransactionModal函数');
    
    // 隐藏模态框
    const modal = document.getElementById('batchTransactionModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none'; // 确保完全隐藏
        console.log('隐藏批量登记模态框成功');
    } else {
        console.log('未找到批量登记模态框元素');
    }
    
    // 清空表格内容
    const tableBody = document.getElementById('batchTransactionsTableBody');
    if (tableBody) {
        tableBody.innerHTML = '';
    }
}

// 生成报表
function generateReport() {
    // 获取用户选择的报表类型和期间
    const reportType = document.getElementById('reportType')?.value;
    const reportPeriod = document.getElementById('reportPeriod')?.value;
    
    // 获取自定义日期（如果选择了自定义期间）
    const customStartDate = document.getElementById('customStartDate')?.value;
    const customEndDate = document.getElementById('customEndDate')?.value;
    
    if (!reportType) {
        alert('请选择报表类型');
        return;
    }
    
    // 保存用户选择的期间信息，供reports.js使用
    window.currentReportPeriod = {
        period: reportPeriod,
        customStartDate: customStartDate,
        customEndDate: customEndDate
    };
    
    // 根据选择的报表类型调用相应的生成函数
    switch(reportType) {
        case 'balanceSheet':
            generateBalanceSheet();
            break;
        case 'incomeStatement':
            generateIncomeStatement();
            break;
        case 'cashFlow':
            generateCashFlow();
            break;
        case 'equity':
            generateEquityStatement();
            break;
        default:
            alert('未知的报表类型');
    }
}

// 添加一行批量登记表格
window.addBatchRow = async function(count = 1) {
    console.log('执行addBatchRow函数, count:', count);
    
    const tableBody = document.getElementById('batchTransactionsTableBody');
    if (!tableBody) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    // 获取账户选项
    let accountOptions = '<option value="">请选择</option>';
    try {
        const result = await window.api.getAccounts();
        if (result.success && result.data) {
            result.data.forEach(account => {
                accountOptions += `<option value="${account.id}">${account.name}</option>`;
            });
        }
    } catch (error) {
        console.error('❌ 加载账户失败:', error);
    }

    // 获取类别选项
    let categories = [];
    if (typeof categoriesData !== 'undefined') {
        categories = categoriesData.map(c => ({ name: c.income_type, type: c.category === '收入/支出' ? '收入' : c.category }));
        // 处理 收入/支出 类型的额外项
        categoriesData.filter(c => c.category === '收入/支出').forEach(c => {
            categories.push({ name: c.income_type, type: '支出' });
        });
    } else {
        categories = [
            { name: "主营业务收入", type: "收入" },
            { name: "抖音林客结算", type: "收入" },
            { name: "小红书分成", type: "收入" },
            { name: "其他业务收入", type: "收入" },
            { name: "办公用品支出", type: "支出" },
            { name: "员工工资支出", type: "支出" },
            { name: "房租水电支出", type: "支出" },
            { name: "差旅招待支出", type: "支出" },
            { name: "广告投流支出", type: "支出" },
            { name: "设备采购支出", type: "支出" },
            { name: "税费缴纳", type: "支出" }
        ];
    }

    const incomeCategories = categories.filter(c => c.type === '收入').map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    const expenseCategories = categories.filter(c => c.type === '支出').map(c => `<option value="${c.name}">${c.name}</option>`).join('');

    for (let i = 0; i < count; i++) {
        const newRow = document.createElement('tr');
        newRow.className = 'hover:bg-gray-50 transition-colors';
        newRow.innerHTML = `
            <td class="px-2 py-2 border-r">
                <input type="date" class="batch-transaction-date w-full border-none focus:ring-0 text-sm" value="${today}" required>
            </td>
            <td class="px-2 py-2 border-r">
                <select class="batch-transaction-type w-full border-none focus:ring-0 text-sm" required onchange="updateBatchCategoryOptions(this)">
                    <option value="">类型</option>
                    <option value="收入">收入</option>
                    <option value="支出">支出</option>
                </select>
            </td>
            <td class="px-2 py-2 border-r">
                <select class="batch-transaction-category w-full border-none focus:ring-0 text-sm" required>
                    <option value="">分类</option>
                    <optgroup label="收入">${incomeCategories}</optgroup>
                    <optgroup label="支出">${expenseCategories}</optgroup>
                </select>
            </td>
            <td class="px-2 py-2 border-r">
                <input type="number" class="batch-transaction-amount w-full border-none focus:ring-0 text-sm font-semibold" placeholder="0.00" step="0.01" min="0" required>
            </td>
            <td class="px-2 py-2 border-r">
                <select class="batch-transaction-account w-full border-none focus:ring-0 text-sm" required>
                    ${accountOptions}
                </select>
            </td>
            <td class="px-2 py-2 border-r">
                <input type="text" class="batch-transaction-description w-full border-none focus:ring-0 text-sm" placeholder="备注..." maxlength="100">
            </td>
            <td class="px-2 py-2 text-center">
                <button type="button" class="text-red-400 hover:text-red-600 transition-colors" onclick="deleteBatchRow(this)">
                    <i class="fas fa-minus-circle"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(newRow);

        // 为新行添加键盘导航支持
        const inputs = newRow.querySelectorAll('input, select');
        inputs.forEach((input, index) => {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (index < inputs.length - 1) {
                        // 移动到下一个输入框
                        inputs[index + 1].focus();
                    } else {
                        // 如果是最后一个输入框，自动添加新行并跳转
                        addBatchRow(1);
                        setTimeout(() => {
                            const nextRow = newRow.nextElementSibling;
                            if (nextRow) {
                                nextRow.querySelector('input, select').focus();
                            }
                        }, 10);
                    }
                }
            });
        });
    }
}

// 辅助函数：根据类型更新分类选项
window.updateBatchCategoryOptions = function(typeSelect) {
    const row = typeSelect.closest('tr');
    const categorySelect = row.querySelector('.batch-transaction-category');
    const type = typeSelect.value;
    
    const optgroups = categorySelect.querySelectorAll('optgroup');
    optgroups.forEach(group => {
        if (!type || group.label === type) {
            group.style.display = '';
        } else {
            group.style.display = 'none';
        }
    });
}

// 删除一行批量登记表格
// 确保函数在全局作用域可用
window.deleteBatchRow = function(button) {
    console.log('执行deleteBatchRow函数');
    
    const row = button.closest('tr');
    if (row) {
        row.remove();
        console.log('删除批量登记行成功');
    }
    
    // 如果表格为空，添加一行
    const tableBody = document.getElementById('batchTransactionsTableBody');
    if (tableBody && tableBody.rows.length === 0) {
        addBatchRow();
    }
}

// 批量保存交易记录
async function saveBatchTransactions() {
    console.log('执行saveBatchTransactions函数');
    
    const tableBody = document.getElementById('batchTransactionsTableBody');
    if (!tableBody) {
        console.log('未找到批量登记表格体元素');
        return;
    }
    
    const rows = tableBody.rows;
    const transactions = [];
    let hasError = false;
    
    // 收集所有交易数据
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // 获取表单元素
        const dateInput = row.querySelector('.batch-transaction-date');
        const typeSelect = row.querySelector('.batch-transaction-type');
        const categorySelect = row.querySelector('.batch-transaction-category');
        const amountInput = row.querySelector('.batch-transaction-amount');
        const accountSelect = row.querySelector('.batch-transaction-account');
        const descriptionInput = row.querySelector('.batch-transaction-description');
        
        // 验证必填字段
        if (!dateInput.value || !typeSelect.value || !categorySelect.value || !amountInput.value || !accountSelect.value) {
            alert(`第${i+1}行数据不完整，请检查所有必填字段`);
            hasError = true;
            break;
        }
        
        // 创建交易对象
        const transaction = {
            transaction_date: dateInput.value,
            transaction_type: typeSelect.value,
            purpose: categorySelect.value,
            amount: parseFloat(amountInput.value),
            account_id: parseInt(accountSelect.value),
            remark: descriptionInput.value,
            audit_status: '已审核',
            is_void: 0,
            create_time: new Date().toISOString(),
            update_time: new Date().toISOString()
        };
        
        // 根据交易类型调整金额符号
        if (transaction.transaction_type === '支出' || transaction.transaction_type === '代付款') {
            transaction.amount = -transaction.amount;
        }
        
        transactions.push(transaction);
    }
    
    if (hasError) {
        return;
    }
    
    // 保存所有交易
    let savedCount = 0;
    for (const transaction of transactions) {
        try {
            const result = await window.api.addTransaction(transaction);
            if (result.success) {
                savedCount++;
            } else {
                console.error(`保存交易失败:`, result.message);
            }
        } catch (error) {
            console.error(`保存交易异常:`, error);
        }
    }
    
    // 显示保存结果
    showNotification(`批量保存完成，共${transactions.length}条记录，成功保存${savedCount}条`, 'success');
    
    // 关闭模态框
    closeBatchTransactionModal();
    
    // 重新加载交易数据
    await loadTransactionData();
    
    console.log('批量保存交易记录完成');
}

// 加载账户数据用于导入
async function loadAccountsForImport() {
    const importAccountElement = document.getElementById('importAccount');
    if (!importAccountElement) return;
    
    try {
        const result = await window.api.getAccounts();
        if (result.success && result.data) {
            // 清空现有选项
            importAccountElement.innerHTML = '<option value="">请选择银行账户</option>';
            
            // 添加账户选项
            result.data.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.name} (${account.bank_name})`;
                importAccountElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error('❌ 加载账户列表失败:', error);
    }
}

// 处理文件选择
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
        alert('请选择CSV或Excel文件！');
        return;
    }
    
    // 检查文件大小（不超过10MB）
    if (file.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过10MB！');
        return;
    }
    
    // 读取文件内容
    if (file.name.endsWith('.csv')) {
        readCSVFile(file);
    } else if (file.name.endsWith('.xlsx')) {
        // Excel文件处理需要额外的库，这里简化处理
        alert('Excel文件导入功能正在开发中，暂时只支持CSV文件导入！');
    }
}

// 读取CSV文件
function readCSVFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const content = e.target.result;
        const lines = content.split('\n');
        
        // 解析CSV数据
        const csvData = [];
        const headers = lines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const rowData = {};
            
            for (let j = 0; j < headers.length; j++) {
                rowData[headers[j]] = values[j] || '';
            }
            
            csvData.push(rowData);
        }
        
        // 显示数据预览
        showImportPreview(csvData);
        
        // 保存解析后的数据到全局变量
        window.importedData = csvData;
    };
    
    reader.onerror = function() {
        alert('文件读取失败！');
    };
    
    reader.readAsText(file, 'UTF-8');
}

// 显示导入数据预览
function showImportPreview(data) {
    const previewDiv = document.getElementById('importPreview');
    const previewHeader = document.getElementById('previewHeader');
    const previewBody = document.getElementById('previewBody');
    
    if (!previewDiv || !previewHeader || !previewBody) return;
    
    // 清空预览
    previewHeader.innerHTML = '';
    previewBody.innerHTML = '';
    
    // 显示预览区域
    previewDiv.classList.remove('hidden');
    
    // 添加表头
    if (data.length > 0) {
        const headers = Object.keys(data[0]);
        headers.forEach(header => {
            const th = document.createElement('th');
            th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
            th.textContent = header;
            previewHeader.appendChild(th);
        });
        
        // 添加数据行（最多显示10条）
        const displayData = data.slice(0, 10);
        displayData.forEach(row => {
            const tr = document.createElement('tr');
            
            headers.forEach(header => {
                const td = document.createElement('td');
                td.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
                td.textContent = row[header] || '';
                tr.appendChild(td);
            });
            
            previewBody.appendChild(tr);
        });
    }
}

// 确认导入
async function confirmImport() {
    const importedData = window.importedData;
    if (!importedData || importedData.length === 0) {
        alert('没有可导入的数据！');
        return;
    }
    
    const selectedAccountId = document.getElementById('importAccount').value;
    if (!selectedAccountId) {
        alert('请选择要导入的银行账户！');
        return;
    }
    
    try {
        // 获取账户信息
        const accountResult = await window.api.getAccounts();
        if (!accountResult.success || !accountResult.data) {
            alert('获取账户信息失败！');
            return;
        }
        
        const selectedAccount = accountResult.data.find(acc => acc.id == selectedAccountId);
        if (!selectedAccount) {
            alert('选择的账户不存在！');
            return;
        }
    
    // 处理导入数据
    let importedCount = 0;
    let errorCount = 0;
    
    importedData.forEach(dataRow => {
        // 简单映射CSV字段到交易记录字段
        // 这里假设CSV文件使用标准字段名
        const transactionData = {
            account_id: selectedAccountId,
            transaction_date: dataRow['交易日期'] || dataRow['Date'] || '',
            transaction_type: dataRow['交易类型'] || dataRow['Type'] || (parseFloat(dataRow['金额']) > 0 ? '收入' : '支出'),
            payer_name: dataRow['付款人名称'] || dataRow['Payer'] || '',
            payer_bank: dataRow['付款人银行'] || dataRow['Payer Bank'] || '',
            payee_name: dataRow['收款人名称'] || dataRow['Payee'] || '',
            payee_bank: dataRow['收款人银行'] || dataRow['Payee Bank'] || '',
            amount: parseFloat(dataRow['金额']) || parseFloat(dataRow['Amount']) || 0,
            purpose: dataRow['用途'] || dataRow['Purpose'] || '',
            remark: dataRow['备注'] || dataRow['Remark'] || '',
            balance_after: parseFloat(dataRow['交易后余额']) || parseFloat(dataRow['Balance']) || 0,
            audit_status: '未审核',
            is_void: 0
        };
        
        // 验证必填字段
        if (transactionData.transaction_date && transactionData.amount) {
            // 添加交易记录
            // TODO: API迁移 - 使用 window.api.addTransaction()
    const result = db.addTransaction(transactionData);
            if (result.success) {
                importedCount++;
            } else {
                errorCount++;
            }
        } else {
            errorCount++;
        }
    });
    
    // 显示导入结果
    alert(`导入完成！成功导入 ${importedCount} 条记录，失败 ${errorCount} 条记录。`);
    
    // 关闭模态框并刷新交易列表
    closeTransactionModal();
    loadTransactionData();
    
    } catch (error) {
        console.error('❌ 导入交易记录失败:', error);
        alert('导入失败：' + error.message);
    }
}

// 处理导入功能（兼容旧版本）
function handleImport() {
    confirmImport();
}

// 保存交易记录
async function saveTransaction() {
    // 获取表单数据（添加空值检查）
    const transactionDate = document.getElementById('transactionDate')?.value;
    const transactionType = document.getElementById('transactionType')?.value;
    const amount = parseFloat(document.getElementById('transactionAmount')?.value || 0);
    const description = document.getElementById('transactionDescription')?.value || '';
    const category = document.getElementById('transactionCategory')?.value || '';
    const account = document.getElementById('transactionAccount')?.value || '';
    const orderId = document.getElementById('transactionOrderId')?.value || null; // P1-UI-2: 订单关联
    
    // 验证必填字段
    if (!transactionDate || !transactionType || !amount || !category || !account) {
        alert('请填写所有必填字段！');
        return;
    }
    
    // 构建交易数据
    const transactionData = {
        id: window.currentEditingTransaction ? window.currentEditingTransaction.id : `tx_${Date.now()}`,
        transaction_date: transactionDate,
        transaction_type: transactionType === 'income' ? '收入' : '支出',
        amount: transactionType === 'expense' ? -amount : amount,
        description: description,
        category_id: category,
        account_id: parseInt(account),
        order_id: orderId ? parseInt(orderId) : null, // P1-UI-2: 订单关联
        // 其他字段
        payer_bank: '',
        payer_name: '',
        payee_bank: '',
        payee_name: '',
        purpose: description,
        remark: '',
        balance_after: 0,
        audit_status: '未审核',
        is_void: 0,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    
    try {
        // 尝试使用 API 保存
        if (window.currentEditingTransaction) {
            // 更新交易记录
            console.log('📡 调用 API 更新流水...');
            const result = await window.api.updateTransaction(window.currentEditingTransaction.id, transactionData);
            if (result.success) {
                console.log('✅ API 更新成功');
                showNotification('交易记录更新成功！', 'success');
                closeTransactionModal();
                loadTransactionData();
                return;
            } else {
                throw new Error(result.message || 'API返回失败');
            }
        } else {
            // 添加新交易记录
            console.log('📡 调用 API 添加流水...');
            const result = await window.api.addTransaction(transactionData);
            if (result.success) {
                console.log('✅ API 添加成功');
                showNotification('交易记录添加成功！', 'success');
                closeTransactionModal();
                loadTransactionData();
                return;
            } else {
                throw new Error(result.message || 'API返回失败');
            }
        }
    } catch (error) {
        console.error('❌ 保存交易记录失败:', error);
        showNotification(`保存失败: ${error.message}`, 'error');
    }
}

// 作废交易记录
async function voidTransaction(transaction) {
    try {
        // 检查权限
        const userResult = await window.api.getCurrentUser();
        if (!userResult.success) {
            showNotification('获取用户信息失败', 'error');
            return;
        }
        const currentUser = userResult.data;
        if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
            alert('您没有作废权限！');
            return;
        }
        
        if (confirm(`确定要作废该交易记录吗？\n日期: ${transaction.transaction_date}\n金额: ¥${transaction.amount.toFixed(2)}\n用途: ${transaction.purpose}`)) {
            // 更新交易记录的作废状态
            const updatedTransaction = {
            ...transaction,
            is_void: 1
        };
        
        // 记录操作日志
        if (typeof window.db !== 'undefined' && db.addOperationLog) {
            // TODO: API迁移 - 需后端添加 /api/operation_logs 接口
        db.addOperationLog({
                target_type: 'transaction',
                target_id: transaction.id,
                operation_type: '作废',
                content_before: JSON.stringify(transaction),
                content_after: JSON.stringify(updatedTransaction)
            });
        }
        
        // 更新数据库
        const result = await window.api.updateTransaction(transaction.id, updatedTransaction);
        if (result.success) {
            // 刷新交易列表
            await loadTransactionData();
            
            // 显示成功提示
            showNotification('交易记录已作废！', 'success');
        } else {
            showNotification('作废交易记录失败：' + result.message, 'error');
        }
    }
    } catch (error) {
        console.error('❌ 作废交易记录失败:', error);
        showNotification('作废交易记录失败：' + error.message, 'error');
    }
}

// 审核交易记录
async function auditTransaction(transaction, approved) {
    try {
        // 检查权限
        const userResult = await window.api.getCurrentUser();
        if (!userResult.success) {
            showNotification('获取用户信息失败', 'error');
            return;
        }
        const currentUser = userResult.data;
        if (currentUser.role !== 'financial_audit' && currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
            alert('您没有审核权限！');
        return;
    }
    
    const status = approved ? '已审核' : '审核拒绝';
    
    // 更新交易记录的审核状态
    const updatedTransaction = {
        ...transaction,
        audit_status: status
    };
    
    // 记录操作日志
    if (typeof window.db !== 'undefined' && db.addOperationLog) {
        // TODO: API迁移 - 需后端添加 /api/operation_logs 接口
        db.addOperationLog({
            target_type: 'transaction',
            target_id: transaction.id,
            operation_type: '审核',
            content_before: JSON.stringify(transaction),
            content_after: JSON.stringify(updatedTransaction)
        });
    }
    
    // 更新数据库
    const result = await window.api.updateTransaction(transaction.id, updatedTransaction);
    if (result.success) {
        // 刷新交易列表
        await loadTransactionData();
        
        // 显示成功提示
        showNotification(`交易记录已${approved ? '通过' : '拒绝'}审核！`, 'success');
    } else {
        showNotification('审核交易记录失败：' + result.message, 'error');
    }
    } catch (error) {
        console.error('❌ 审核交易记录失败:', error);
        showNotification('审核交易记录失败：' + error.message, 'error');
    }
}

// 加载交易数据
async function loadTransactionData() {
    try {
        showLoading();
        console.log('开始加载交易数据');
        
        // 获取筛选条件
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        const transactionType = document.getElementById('transactionTypeFilter')?.value;
        const accountId = document.getElementById('accountFilter')?.value;
        const auditStatus = document.getElementById('auditStatusFilter')?.value;
        const searchKeyword = document.getElementById('searchInput')?.value;
        
        let filteredTransactions = [];
        
        // 尝试使用 API 加载
        try {
            console.log('📡 调用 API 加载财务流水...');
            const params = {
                start_date: startDate,
                end_date: endDate
            };
            if (transactionType) params.type = transactionType;
            if (accountId) params.account_id = accountId;
            if (searchKeyword) params.search = searchKeyword;
            
            const result = await window.api.getTransactions(params);
            if (result.success) {
                console.log('✅ API 加载成功:', result.data.length, '条');
                filteredTransactions = result.data;
            } else {
                throw new Error('API 返回失败');
            }
        } catch (error) {
            console.error('❌ API 加载失败:', error);
            showNotification('加载财务流水失败，请刷新页面', 'error');
            return;
        }
        
        // 应用搜索关键词筛选
        if (searchKeyword) {
            const keyword = searchKeyword.toLowerCase();
            filteredTransactions = filteredTransactions.filter(transaction => 
                transaction.payer_name?.toLowerCase().includes(keyword) ||
                transaction.payee_name?.toLowerCase().includes(keyword) ||
                transaction.purpose?.toLowerCase().includes(keyword) ||
                transaction.remark?.toLowerCase().includes(keyword)
            );
        }
        
        // 获取每页显示数量
        itemsPerPage = parseInt(document.getElementById('itemsPerPage')?.value || 10);
        
        // 计算总页数
        const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
        
        // 确保当前页码在有效范围内
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;
        
        // 分页处理
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);
        
        // 渲染交易数据
        await renderTransactions(paginatedTransactions);
        
        // 渲染分页控件
        renderPagination(totalPages, filteredTransactions.length);
        
    } catch (error) {
        console.error('加载交易数据时发生错误:', error);
        // 显示错误提示
        const transactionsTableBody = document.getElementById('transactionsList');
        if (transactionsTableBody) {
            transactionsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-red-500">
                        加载数据失败，请稍后重试。错误信息：${error.message}
                    </td>
                </tr>
            `;
        }
    } finally {
        hideLoading();
    }
}

// 渲染交易记录列表
async function renderTransactions(transactions) {
    console.log('开始渲染交易列表，数据量:', transactions.length);
    const transactionsTableBody = document.getElementById('transactionsList');
    if (!transactionsTableBody) {
        console.error('未找到流水记录表格体(transactionsList)');
        return;
    }
    
    transactionsTableBody.innerHTML = '';
    
    if (transactions.length === 0) {
        console.log('没有数据可渲染');
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                没有找到符合条件的交易记录
            </td>
        `;
        transactionsTableBody.appendChild(emptyRow);
        return;
    }
    
    // 预先加载账户数据
    let accounts = [];
    try {
        const accountsResult = await window.api.getAccounts();
        if (accountsResult.success && accountsResult.data) {
            accounts = accountsResult.data;
        }
    } catch (error) {
        console.error('❌ 加载账户数据失败:', error);
    }
    
    transactions.forEach((transaction, index) => {
        // 确保所有必要的字段都存在
        const transaction_date = transaction.transaction_date || '';
        // 格式化日期为 YYYY-MM-DD
        const formattedDate = transaction_date ? new Date(transaction_date).toISOString().split('T')[0] : '';
        const transaction_type = transaction.transaction_type || '';
        const amount = transaction.amount || 0;
        const purpose = transaction.purpose || '';
        const account_id = transaction.account_id || 1;
        const audit_status = transaction.audit_status || '未审核';
        const is_void = transaction.is_void || 0;
        const is_refund = transaction.is_refund || 0; // P1-UI-3: 退款标识
        
        // 获取账户名称
        let accountName = '未知账户';
        const account = accounts.find(a => a.id == account_id);
        if (account) accountName = account.name;
        
        // 获取交易类型颜色
        const typeConfig = transactionTypes.find(t => t.value === transaction_type) || { color: 'gray' };
        
        const row = document.createElement('tr');
        if (is_void) row.classList.add('bg-gray-100', 'line-through');
        if (is_refund) row.classList.add('bg-red-50'); // P1-UI-3: 退款记录浅红色背景
        
        // P1-UI-3: 退款记录红色文字样式
        const refundTextClass = is_refund ? 'text-red-600' : 'text-gray-900';
        const refundBadge = is_refund ? '<span class="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">退款</span>' : '';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm ${refundTextClass}">${formattedDate}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="font-medium ${refundTextClass}">${purpose}${refundBadge}</div>
                <div class="text-xs text-gray-400">${transaction.remark || ''}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span class="px-2 py-1 rounded-full text-xs font-medium text-white bg-${typeConfig.color}-500">
                    ${transaction_type}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm ${amount >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}">
                ¥${Math.abs(amount).toFixed(2)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm ${refundTextClass}">${accountName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="edit-transaction-btn text-blue-600 hover:text-blue-900 mr-3" data-index="${index}">编辑</button>
                <button class="void-transaction-btn text-orange-600 hover:text-orange-900" data-index="${index}">作废</button>
            </td>
        `;
        transactionsTableBody.appendChild(row);
    });
    
    // 添加按钮事件处理
    addTransactionEventListeners(transactions);
}

// 渲染分页控件
function renderPagination(totalPages, totalItems) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    // 清空现有分页控件
    paginationContainer.innerHTML = '';
    
    // 如果没有数据，不显示分页
    if (totalItems === 0) return;
    
    // 创建分页控件
    const paginationHTML = `
        <div class="flex items-center justify-between">
            <div class="text-sm text-gray-700">
                显示 ${(currentPage - 1) * itemsPerPage + 1} 到 ${Math.min(currentPage * itemsPerPage, totalItems)} 条，共 ${totalItems} 条记录
            </div>
            <div class="flex items-center space-x-2">
                <a href="#" class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 page-link" data-page="prev">
                    <span class="sr-only">上一页</span>
                    <i class="fas fa-chevron-left"></i>
                </a>
                ${generatePageNumbers(totalPages)}
                <a href="#" class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 page-link" data-page="next">
                    <span class="sr-only">下一页</span>
                    <i class="fas fa-chevron-right"></i>
                </a>
            </div>
        </div>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
    
    // 添加分页事件监听器
    addPaginationEventListeners();
}

// 生成页码按钮
function generatePageNumbers(totalPages) {
    let pageNumbersHTML = '';
    
    // 显示页码的逻辑
    for (let i = 1; i <= totalPages; i++) {
        // 只显示当前页附近的页码，最多显示7个
        if (i === 1 || i === totalPages || (i >= currentPage - 3 && i <= currentPage + 3)) {
            pageNumbersHTML += `
                <a href="#" class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${i === currentPage ? 'text-blue-600 border-blue-500' : 'text-gray-500'} hover:bg-gray-50 page-link" data-page="${i}">
                    ${i}
                </a>
            `;
        } else if (i === currentPage - 4 || i === currentPage + 4) {
            // 显示省略号
            pageNumbersHTML += `
                <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500">
                    ...
                </span>
            `;
        }
    }
    
    return pageNumbersHTML;
}

// 添加分页事件监听器
function addPaginationEventListeners() {
    document.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', async function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            
            switch (page) {
                case 'prev':
                    if (currentPage > 1) {
                        currentPage--;
                        loadTransactionData();
                    }
                    break;
                case 'next':
                    // 简化逻辑：直接重新加载数据来获取总页数
                    const itemsPerPage = parseInt(document.getElementById('itemsPerPage')?.value || 10);
                    // 总页数会在loadTransactionData中计算
                    currentPage++;
                    await loadTransactionData();
                    break;
                default:
                    currentPage = parseInt(page);
                    loadTransactionData();
                    break;
            }
        });
    });
}

// 添加交易记录事件监听器
function addTransactionEventListeners(transactions) {
    // 编辑按钮
    document.querySelectorAll('.edit-transaction-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const transaction = transactions[index];
            editTransaction(transaction, index);
        });
    });
    
    // 作废按钮
    document.querySelectorAll('.void-transaction-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const transaction = transactions[index];
            voidTransaction(transaction);
        });
    });
    
    // 审核通过按钮
    document.querySelectorAll('.approve-transaction-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const transaction = transactions[index];
            auditTransaction(transaction, true);
        });
    });
    
    // 审核拒绝按钮
    document.querySelectorAll('.reject-transaction-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const transaction = transactions[index];
            auditTransaction(transaction, false);
        });
    });
    
    // 附件预览按钮
    document.querySelectorAll('.view-attachments-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const transaction = transactions[index];
            viewAttachments(transaction);
        });
    });
    
    // 上传凭证按钮
    document.querySelectorAll('.upload-attachment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const transaction = transactions[index];
            uploadAttachment(transaction);
        });
    });
}

// 预览附件
function viewAttachments(transaction) {
    alert(`查看附件功能开发中\n交易ID: ${transaction.id}\n附件数量: ${transaction.attachment_ids ? transaction.attachment_ids.split(',').length : 0}`);
}

// 上传凭证
function uploadAttachment(transaction) {
    // 创建一个隐藏的文件输入元素
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,application/pdf';
    fileInput.multiple = true;
    
    // 监听文件选择事件
    fileInput.addEventListener('change', function(e) {
        const files = e.target.files;
        if (files.length === 0) return;
        
        showLoading();
        
        // 模拟文件上传过程
        setTimeout(async function() {
            // 更新交易记录的附件信息
            const attachmentIds = transaction.attachment_ids ? transaction.attachment_ids.split(',') : [];
            const newAttachmentIds = [];
            
            for (let i = 0; i < files.length; i++) {
                // 生成随机附件ID
                const attachmentId = `att_${Date.now()}_${i}`;
                newAttachmentIds.push(attachmentId);
                
                // 在实际应用中，这里会发送文件到服务器
                console.log(`上传文件: ${files[i].name} -> 附件ID: ${attachmentId}`);
            }
            
            // 更新交易记录
            const updatedAttachmentIds = [...attachmentIds, ...newAttachmentIds].join(',');
            transaction.attachment_ids = updatedAttachmentIds;
            
            // 如果数据库模块可用，更新数据库
            try {
                const result = await window.api.updateTransaction(transaction.id, transaction);
                if (!result.success) {
                    throw new Error(result.message || '更新失败');
                }
            } catch (error) {
                console.error('❌ 更新凭证信息失败:', error);
            }
            
            // 重新加载交易数据以显示最新状态
            loadTransactionData();
            
            hideLoading();
            
            alert(`成功上传${files.length}个凭证！`);
        }, 1500);
    });
    
    // 触发文件选择对话框
    fileInput.click();
}

// ==================== P1-UI-2: 订单关联下拉框加载 ====================

/**
 * 加载订单列表到财务流水模态框的订单下拉框
 */
async function loadOrdersToDropdown() {
    const orderSelect = document.getElementById('transactionOrderId');
    if (!orderSelect) {
        console.warn('未找到订单下拉框：transactionOrderId');
        return;
    }
    
    try {
        // 调用后端API获取订单列表（使用封装好的API方法）
        const result = await window.api.getOrders();
        
        if (!result.success) {
            throw new Error(result.message || '获取订单列表失败');
        }
        
        const orders = result.data || [];
        
        // 清空下拉框（保留"无关联订单"选项）
        orderSelect.innerHTML = '<option value="">-- 无关联订单 --</option>';
        
        // 添加订单选项
        orders.forEach(order => {
            const option = document.createElement('option');
            option.value = order.id;
            
            // 显示格式：订单号 - 客户名称 - 合同金额 - 状态
            const customerName = order.customer_name || '未知客户';
            const amount = parseFloat(order.contract_amount || order.total_amount || 0).toFixed(2);
            const status = order.status || '进行中';
            
            option.textContent = `#${order.id} - ${customerName} - ¥${amount} - ${status}`;
            
            // 如果是已完成或已取消订单，灰色显示
            if (status === '已完成' || status === '已取消') {
                option.style.color = '#9CA3AF';
            }
            
            orderSelect.appendChild(option);
        });
        
        console.log(`✅ 订单下拉框加载完成，共 ${orders.length} 个订单`);
        
    } catch (error) {
        console.error('❌ 加载订单列表失败:', error);
        orderSelect.innerHTML = '<option value="">加载失败，请重试</option>';
    }
}
