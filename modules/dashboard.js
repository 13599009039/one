// 仪表盘模块

// 全局变量：当前日期筛选范围
let currentDateRange = 'month'; // 默认显示本月
let customStartDate = null;
let customEndDate = null;

// 初始化仪表盘
function initDashboard() {
    // 加载最近交易
    loadRecentTransactions();
    
    // 计算并显示统计数据
    calculateAndDisplayStats();
    
    // 初始化图表
    initCharts();
}

// 设置仪表盘日期范围
function setDashboardDateRange(range) {
    currentDateRange = range;
    customStartDate = null;
    customEndDate = null;
    
    // 更新按钮样式
    updateDateRangeButtonStyles(range);
    
    // 隐藏自定义日期选择器
    const customPicker = document.getElementById('customDateRangePicker');
    if (customPicker) {
        customPicker.classList.add('hidden');
    }
    
    // 重新加载数据
    refreshDashboardData();
}

// 切换自定义日期范围选择器
function toggleCustomDateRangePicker() {
    const customPicker = document.getElementById('customDateRangePicker');
    if (customPicker) {
        customPicker.classList.toggle('hidden');
        
        // 如果显示，初始化日期输入框
        if (!customPicker.classList.contains('hidden')) {
            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth(), 1); // 本月第一天
            const endDate = today;
            
            document.getElementById('dashStartDate').value = formatDateForInput(startDate);
            document.getElementById('dashEndDate').value = formatDateForInput(endDate);
        }
    }
}

// 应用自定义日期范围
function applyCustomDateRange() {
    const startDateInput = document.getElementById('dashStartDate').value;
    const endDateInput = document.getElementById('dashEndDate').value;
    
    if (!startDateInput || !endDateInput) {
        alert('请选择开始日期和结束日期');
        return;
    }
    
    if (new Date(startDateInput) > new Date(endDateInput)) {
        alert('开始日期不能大于结束日期');
        return;
    }
    
    currentDateRange = 'custom';
    customStartDate = startDateInput;
    customEndDate = endDateInput;
    
    // 更新按钮样式
    updateDateRangeButtonStyles('custom');
    
    // 隐藏选择器
    const customPicker = document.getElementById('customDateRangePicker');
    if (customPicker) {
        customPicker.classList.add('hidden');
    }
    
    // 重新加载数据
    refreshDashboardData();
}

// 更新日期范围按钮样式
function updateDateRangeButtonStyles(activeRange) {
    const buttons = {
        'today': document.getElementById('btnDashToday'),
        'week': document.getElementById('btnDashWeek'),
        'month': document.getElementById('btnDashMonth'),
        'quarter': document.getElementById('btnDashQuarter'),
        'year': document.getElementById('btnDashYear'),
        'custom': document.getElementById('btnDashCustom')
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

// 格式化日期为输入框格式 (YYYY-MM-DD)
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 获取当前日期范围
function getCurrentDateRange() {
    const today = new Date();
    let startDate, endDate;
    
    switch (currentDateRange) {
        case 'today':
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            break;
            
        case 'week':
            const dayOfWeek = today.getDay();
            const monday = new Date(today);
            monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            startDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            break;
            
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            break;
            
        case 'quarter':
            const currentQuarter = Math.floor(today.getMonth() / 3);
            startDate = new Date(today.getFullYear(), currentQuarter * 3, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            break;
            
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            break;
            
        case 'custom':
            if (customStartDate && customEndDate) {
                startDate = new Date(customStartDate);
                endDate = new Date(customEndDate + ' 23:59:59');
            } else {
                // 默认本月
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            }
            break;
            
        default:
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    }
    
    return { startDate, endDate };
}

// 刷新仪表盘数据
function refreshDashboardData() {
    loadRecentTransactions();
    calculateAndDisplayStats();
    initCharts();
}

// 过滤交易数据根据日期范围
function filterTransactionsByDateRange(transactions) {
    const { startDate, endDate } = getCurrentDateRange();
    
    return transactions.filter(transaction => {
        const transDate = new Date(transaction.transaction_date);
        return transDate >= startDate && transDate <= endDate;
    });
}

// 过滤订单数据根据日期范围
function filterOrdersByDateRange(orders) {
    const { startDate, endDate } = getCurrentDateRange();
    
    return orders.filter(order => {
        // 优先使用contract_date，如果没有则使用created_at
        const orderDate = new Date(order.contract_date || order.created_at);
        return orderDate >= startDate && orderDate <= endDate;
    });
}

// 加载最近交易
function loadRecentTransactions() {
    const recentTransactionsContainer = document.getElementById('recentTransactions');
    if (recentTransactionsContainer) {
        // 清空容器
        recentTransactionsContainer.innerHTML = '';
        
        // 从数据源获取交易数据
        const result = getTransactions();
        if (result.success) {
            // 根据日期范围过滤交易
            const filteredTransactions = filterTransactionsByDateRange(result.data);
            
            // 获取最近5条交易
            const recentTransactions = filteredTransactions.slice(0, 5);
            
            // 渲染最近交易
            recentTransactions.forEach(transaction => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${transaction.transaction_date}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span class="badge ${transaction.transaction_type === '收入' ? 'badge-success' : 'badge-danger'}">
                            ${transaction.transaction_type}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${transaction.payer_name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${transaction.payee_name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm ${transaction.amount >= 0 ? 'amount-positive' : 'amount-negative'}">
                        ¥${Math.abs(transaction.amount).toFixed(2)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span class="badge badge-info">${transaction.audit_status}</span>
                    </td>
                `;
                recentTransactionsContainer.appendChild(row);
            });
        }
    }
}

// 计算并显示统计数据
function calculateAndDisplayStats() {
    // 获取所有交易数据
    const transactionResult = db.getTransactions();
    const orderResult = db.getOrders();
    const customerResult = db.getCustomers();
    
    if (transactionResult.success && orderResult.success && customerResult.success) {
        // 根据日期范围过滤数据
        const transactions = filterTransactionsByDateRange(transactionResult.data);
        const orders = filterOrdersByDateRange(orderResult.data);
        const customers = customerResult.data; // 客户不需要日期筛选
        
        // 计算总收入
        let totalIncome = 0;
        transactions.forEach(t => {
            if (t.transaction_type === '收入') totalIncome += t.amount;
        });
        
        // 计算待收账款（✅ 使用final_amount作为订单总金额基准）
        // final_amount = 商品原价合计 + 议价/加价/减价金额 = 最终成交金额
        let totalOrderAmount = orders.reduce((sum, o) => {
            // 优先使用final_amount，其次使用total_amount
            const amount = o.final_amount || o.total_amount || 0;
            return sum + amount;
        }, 0);
        let pendingPayments = totalOrderAmount - totalIncome;
        if (pendingPayments < 0) pendingPayments = 0;
        
        // 更新DOM显示
        const totalOrdersEl = document.getElementById('totalOrders');
        const totalCustomersEl = document.getElementById('totalCustomers');
        const totalIncomeEl = document.getElementById('totalIncome');
        const pendingPaymentsEl = document.getElementById('pendingPayments');
        
        if (totalOrdersEl) totalOrdersEl.textContent = orders.length;
        if (totalCustomersEl) totalCustomersEl.textContent = customers.length;
        if (totalIncomeEl) totalIncomeEl.textContent = `¥${totalIncome.toLocaleString()}`;
        if (pendingPaymentsEl) pendingPaymentsEl.textContent = `¥${pendingPayments.toLocaleString()}`;
    }
}

// 初始化图表
let chartInitRetryCount = 0;
const MAX_CHART_RETRY = 10; // 最多重试10次

function initCharts() {
    // 检查Chart.js是否已加载
    if (typeof Chart === 'undefined') {
        if (chartInitRetryCount < MAX_CHART_RETRY) {
            chartInitRetryCount++;
            console.warn(`[Dashboard] Chart.js尚未加载，延迟初始化图表 (${chartInitRetryCount}/${MAX_CHART_RETRY})`);
            setTimeout(initCharts, 100);
        } else {
            console.error('[Dashboard] Chart.js加载失败，已达最大重试次数，放弃初始化图表');
        }
        return;
    }
    
    console.log('[Dashboard] Chart.js加载成功，开始初始化图表');

    // 获取所有交易数据
    const result = getTransactions();
    if (!result.success) {
        console.error('获取交易数据失败:', result.message);
        return;
    }
    
    // 根据日期范围过滤交易
    const transactions = filterTransactionsByDateRange(result.data);
    
    // 收支趋势图表
    const incomeExpenseCtx = document.getElementById('incomeExpenseChart');
    if (incomeExpenseCtx) {
        try {
            // 按月份分组统计收支数据
            const monthlyData = {};
            const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
            
            // 初始化月度数据
            months.forEach(month => {
                monthlyData[month] = { income: 0, expense: 0 };
            });
            
            // 统计各月收支
            transactions.forEach(transaction => {
                const date = new Date(transaction.transaction_date);
                const monthIndex = date.getMonth();
                const monthName = months[monthIndex];
                
                if (transaction.transaction_type === '收入') {
                    monthlyData[monthName].income += transaction.amount;
                } else if (transaction.transaction_type === '支出') {
                    monthlyData[monthName].expense += Math.abs(transaction.amount);
                }
            });
            
            // 准备图表数据
            const incomeData = months.map(month => monthlyData[month].income);
            const expenseData = months.map(month => monthlyData[month].expense);
            const netIncomeData = incomeData.map((income, index) => income - expenseData[index]);
            
            // 先销毁已有图表实例
            if (window.incomeExpenseChart && typeof window.incomeExpenseChart.destroy === 'function') {
                window.incomeExpenseChart.destroy();
            }
            
            // 创建新图表并保存实例
            window.incomeExpenseChart = new Chart(incomeExpenseCtx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: '收入',
                            data: incomeData,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: '支出',
                            data: expenseData,
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: '净收入',
                            data: netIncomeData,
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4,
                            fill: true,
                            borderDash: []
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += '¥' + context.parsed.y.toLocaleString();
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '¥' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('初始化收支趋势图表时发生错误:', error);
        }
    }
    
    // 支出分类图表
    const expenseCategoryCtx = document.getElementById('expenseCategoryChart');
    if (expenseCategoryCtx) {
        try {
            // 按支出用途分组统计
            const categoryData = {};
            
            // 统计各分类支出
            transactions.forEach(transaction => {
                if (transaction.transaction_type === '支出') {
                    const category = transaction.purpose || '其他';
                    if (!categoryData[category]) {
                        categoryData[category] = 0;
                    }
                    categoryData[category] += Math.abs(transaction.amount);
                }
            });
            
            // 准备图表数据
            const labels = Object.keys(categoryData);
            const expenseData = Object.values(categoryData);
            const totalExpense = expenseData.reduce((sum, value) => sum + value, 0);
            
            // 颜色数组
            const colors = [
                '#3b82f6',
                '#10b981',
                '#f59e0b',
                '#ef4444',
                '#8b5cf6',
                '#6366f1',
                '#ec4899',
                '#14b8a6',
                '#f97316',
                '#84cc16'
            ];
            
            // 先销毁已有图表实例
            if (window.expenseCategoryChart && typeof window.expenseCategoryChart.destroy === 'function') {
                window.expenseCategoryChart.destroy();
            }
            
            // 创建新图表并保存实例
            window.expenseCategoryChart = new Chart(expenseCategoryCtx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            data: expenseData,
                            backgroundColor: colors.slice(0, labels.length),
                            borderWidth: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const percentage = totalExpense > 0 ? ((value / totalExpense) * 100).toFixed(1) : 0;
                                    return `${label}: ¥${value.toLocaleString()} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('初始化支出分类图表时发生错误:', error);
        }
    }
}