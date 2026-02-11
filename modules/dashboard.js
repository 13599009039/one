// 仪表盘模块

// 初始化仪表盘
function initDashboard() {
    // 加载最近交易
    loadRecentTransactions();
    
    // 计算并显示统计数据
    calculateAndDisplayStats();
    
    // 初始化图表
    initCharts();
}

// 加载最近交易
function loadRecentTransactions() {
    const recentTransactionsContainer = document.getElementById('recentTransactions');
    if (recentTransactionsContainer) {
        // 清空容器
        recentTransactionsContainer.innerHTML = '';
        
        // 从localStorage获取交易数据
        const result = getTransactions();
        if (result.success) {
            // 获取最近5条交易
            const recentTransactions = result.data.slice(0, 5);
            
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
        const transactions = transactionResult.data;
        const orders = orderResult.data;
        const customers = customerResult.data;
        
        // 计算总收入
        let totalIncome = 0;
        transactions.forEach(t => {
            if (t.transaction_type === '收入') totalIncome += t.amount;
        });
        
        // 计算待收账款
        let totalOrderAmount = orders.reduce((sum, o) => sum + o.total_amount, 0);
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
function initCharts() {
    // 获取所有交易数据
    const result = getTransactions();
    if (!result.success) {
        console.error('获取交易数据失败:', result.message);
        return;
    }
    
    const transactions = result.data;
    
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