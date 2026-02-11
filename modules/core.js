// 全局数据
const transactionsData = [
    {"transaction_date": "2026-01-25", "transaction_type": "来账", "payer_bank": "中国银联股份有限公司", "payer_name": "北京字节跳动科技有限公司", "payee_bank": "中国银行股份有限公司许昌分行", "payee_name": "许昌爱佳网络科技有限公司", "amount": 10849.7, "balance_after": 134635.78, "purpose": "抖音生活服务服务商提现", "remark": "抖音生活服务服务商提现"},
    {"transaction_date": "2026-01-24", "transaction_type": "往账", "payer_bank": "中国银行股份有限公司许昌分行", "payer_name": "许昌爱佳网络科技有限公司", "payee_bank": "中国工商银行股份有限公司许昌建安支行", "payee_name": "许昌雷韵文化传媒有限公司", "amount": -16451.0, "balance_after": 118184.78, "purpose": "往来款", "remark": "往来款"},
    {"transaction_date": "2026-01-23", "transaction_type": "来账", "payer_bank": "中国银联股份有限公司", "payer_name": "北京字节跳动科技有限公司", "payee_bank": "中国银行股份有限公司许昌分行", "payee_name": "许昌爱佳网络科技有限公司", "amount": 5987.0, "balance_after": 124171.78, "purpose": "抖音生活服务服务商提现", "remark": "抖音生活服务服务商提现"},
    {"transaction_date": "2026-01-22", "transaction_type": "往账", "payer_bank": "中国银行股份有限公司许昌分行", "payer_name": "许昌爱佳网络科技有限公司", "payee_bank": "中国工商银行股份有限公司许昌建安支行", "payee_name": "许昌雷韵文化传媒有限公司", "amount": -5987.0, "balance_after": 118184.78, "purpose": "往来款", "remark": "往来款"},
    {"transaction_date": "2026-01-21", "transaction_type": "来账", "payer_bank": "中国银联股份有限公司", "payer_name": "北京字节跳动科技有限公司", "payee_bank": "中国银行股份有限公司许昌分行", "payee_name": "许昌爱佳网络科技有限公司", "amount": 4890.5, "balance_after": 123075.28, "purpose": "抖音生活服务服务商提现", "remark": "抖音生活服务服务商提现"},
    {"transaction_date": "2026-01-20", "transaction_type": "往账", "payer_bank": "中国银行股份有限公司许昌分行", "payer_name": "许昌爱佳网络科技有限公司", "payee_bank": "中国工商银行股份有限公司许昌建安支行", "payee_name": "许昌雷韵文化传媒有限公司", "amount": -4890.5, "balance_after": 118184.78, "purpose": "往来款", "remark": "往来款"},
    {"transaction_date": "2026-01-19", "transaction_type": "来账", "payer_bank": "中国银联股份有限公司", "payer_name": "北京字节跳动科技有限公司", "payee_bank": "中国银行股份有限公司许昌分行", "payee_name": "许昌爱佳网络科技有限公司", "amount": 3456.8, "balance_after": 121641.58, "purpose": "抖音生活服务服务商提现", "remark": "抖音生活服务服务商提现"},
    {"transaction_date": "2026-01-18", "transaction_type": "往账", "payer_bank": "中国银行股份有限公司许昌分行", "payer_name": "许昌爱佳网络科技有限公司", "payee_bank": "中国工商银行股份有限公司许昌建安支行", "payee_name": "许昌雷韵文化传媒有限公司", "amount": -3456.8, "balance_after": 118184.78, "purpose": "往来款", "remark": "往来款"},
    {"transaction_date": "2026-01-17", "transaction_type": "来账", "payer_bank": "武汉合众易宝科技有限公司", "payer_name": "武汉合众易宝科技有限公司", "payee_bank": "中国银行股份有限公司许昌分行", "payee_name": "许昌爱佳网络科技有限公司", "amount": 2345.6, "balance_after": 120530.38, "purpose": "抖音生活服务提现", "remark": "抖音生活服务提现"},
    {"transaction_date": "2026-01-16", "transaction_type": "往账", "payer_bank": "中国银行股份有限公司许昌分行", "payer_name": "许昌爱佳网络科技有限公司", "payee_bank": "中国工商银行股份有限公司许昌建安支行", "payee_name": "许昌雷韵文化传媒有限公司", "amount": -2345.6, "balance_after": 118184.78, "purpose": "往来款", "remark": "往来款"}
];

const categoriesData = [
    {"income_type": "日常办公", "category": "支出"}, {"income_type": "达人车马", "category": "支出"}, {"income_type": "福利费用", "category": "支出"},
    {"income_type": "招待费用", "category": "支出"}, {"income_type": "工资绩效", "category": "支出"}, {"income_type": "介绍返利", "category": "支出"},
    {"income_type": "差旅交通", "category": "支出"}, {"income_type": "餐费补助", "category": "支出"}, {"income_type": "固定资产", "category": "支出"},
    {"income_type": "广告物料", "category": "支出"}, {"income_type": "广告投流", "category": "支出"}, {"income_type": "推广费用", "category": "支出"},
    {"income_type": "房租水电", "category": "支出"}, {"income_type": "手续费", "category": "支出"}, {"income_type": "借还款", "category": "收入/支出"},
    {"income_type": "投资款", "category": "收入/支出"}, {"income_type": "其他", "category": "收入/支出"}, {"income_type": "保证金", "category": "收入/支出"},
    {"income_type": "部门聚餐", "category": "支出"}, {"income_type": "发放薪资", "category": "支出"}
];

const summaryData = {
    "total_records": 26,
    "total_amount": -10321.15,
    "avg_amount": -396.97,
    "balance_change": -15724.28
};

// 分页变量
let coreCurrentPage = 1;

// 工具函数：显示加载动画
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.style.display = 'flex';
    }
}

// 工具函数：隐藏加载动画
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
        loadingOverlay.style.display = 'none';
    }
}

// 主初始化函数
document.addEventListener('DOMContentLoaded', function() {
    try {
        // 自动合并新的模拟数据（如果 localStorage 中已有旧数据）
        syncMockData();
        
        // 初始化登录表单
        initLoginForm();
    } catch (error) {
        console.error('初始化登录表单时发生错误:', error);
    }
});

// 同步新的模拟数据到 localStorage
function syncMockData() {
    const savedData = localStorage.getItem('ajkuaiji_data');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            if (data.transactions && data.transactions.length < 30) {
                console.log('检测到旧数据，正在合并新的模拟流水...');
                const defaultData = window.db.getDefaultData ? window.db.getDefaultData() : null;
                if (defaultData) {
                    // 仅添加不存在的交易（以ID判断）
                    const existingIds = new Set(data.transactions.map(t => t.id));
                    defaultData.transactions.forEach(t => {
                        if (!existingIds.has(t.id)) {
                            data.transactions.push(t);
                        }
                    });
                    localStorage.setItem('ajkuaiji_data', JSON.stringify(data));
                    console.log('模拟数据同步完成');
                }
            }
        } catch (e) {
            console.error('同步模拟数据失败:', e);
        }
    }
}

// 登录成功后初始化所有模块
function initSystem() {
    try {
        initNavigation();
    } catch (error) {
        console.error('初始化导航时发生错误:', error);
    }
    
    try {
        // 初始化用户菜单
        if (typeof initUserMenu === 'function') {
            initUserMenu();
        }
    } catch (error) {
        console.error('初始化用户菜单时发生错误:', error);
    }
    
    try {
        // 初始化仪表盘
        if (typeof initDashboard === 'function') {
            initDashboard();
        }
    } catch (error) {
        console.error('初始化仪表盘时发生错误:', error);
    }
    
    try {
        // 初始化流水记录页面
        if (typeof loadTransactionData === 'function') {
            loadTransactionData();
        }
    } catch (error) {
        console.error('初始化流水记录页面时发生错误:', error);
    }
};

// 通知函数
window.showNotification = function(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.error('Notification container not found');
        alert(message);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    
    // 根据类型选择图标
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'info') icon = 'fa-info-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';

    toast.innerHTML = `
        <i class="fas ${icon} mr-3"></i>
        <div class="flex-grow">${message}</div>
        <button class="ml-3 text-white opacity-70 hover:opacity-100" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // 自动移除
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }, 3000);
};

// 更新用户信息显示
function updateUserInfoDisplay() {
    try {
        // 安全检查：确保db对象存在
        if (typeof window.db !== 'undefined' && db.getCurrentUser) {
            const currentUser = db.getCurrentUser();
            if (currentUser) {
                console.log('当前登录用户信息:', currentUser);
                // 这里可以添加用户信息显示逻辑
                // 例如：显示用户名、角色、公司信息等
                
                // 示例：在页面顶部显示用户名
                const usernameElement = document.getElementById('currentUsername');
                if (usernameElement) {
                    usernameElement.textContent = currentUser.name || currentUser.username;
                }
                
                // 示例：根据角色显示不同的欢迎信息
                const welcomeElement = document.getElementById('welcomeMessage');
                if (welcomeElement) {
                    welcomeElement.textContent = `欢迎回来，${currentUser.name || currentUser.username}（${currentUser.role}）`;
                }
            }
        } else {
            console.log('db对象未定义，跳过用户信息更新');
        }
    } catch (error) {
        console.error('更新用户信息时发生错误:', error);
    }
}