// 财务报表模块（V3.0版）

// 初始化财务报表页面
function initReportsPage() {
    // 绑定报表生成按钮事件
    const generateBalanceSheetBtn = document.getElementById('generateBalanceSheet');
    const generateIncomeStatementBtn = document.getElementById('generateIncomeStatement');
    const generateCashFlowBtn = document.getElementById('generateCashFlow');
    const generateEquityBtn = document.getElementById('generateEquity');
    
    if (generateBalanceSheetBtn) {
        generateBalanceSheetBtn.addEventListener('click', function() {
            generateBalanceSheet();
        });
    }
    
    if (generateIncomeStatementBtn) {
        generateIncomeStatementBtn.addEventListener('click', function() {
            generateIncomeStatement();
        });
    }
    
    if (generateCashFlowBtn) {
        generateCashFlowBtn.addEventListener('click', function() {
            generateCashFlow();
        });
    }
    
    if (generateEquityBtn) {
        generateEquityBtn.addEventListener('click', function() {
            generateEquityStatement();
        });
    }
    
    // 绑定自定义日期范围显示/隐藏事件
    const reportPeriodSelect = document.getElementById('reportPeriod');
    const customDateRange = document.getElementById('customDateRange');
    
    if (reportPeriodSelect && customDateRange) {
        reportPeriodSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customDateRange.classList.remove('hidden');
            } else {
                customDateRange.classList.add('hidden');
            }
        });
    }
    
    // 初始化公司选择器
    initCompanySelector();
}

// 初始化公司选择器
function initCompanySelector() {
    const companySelector = document.getElementById('companySelector');
    const companySelectorContainer = companySelector?.closest('div');
    if (!companySelector || !companySelectorContainer) return;
    
    // 获取当前用户和公司
    const currentUser = getCurrentUser();
    const currentCompany = getCurrentCompany();
    
    // 对于非超级管理员，隐藏公司选择器，直接使用用户关联的公司
    if (currentUser && currentUser.role !== 'superadmin') {
        companySelectorContainer.style.display = 'none';
        return;
    }
    
    // 对于超级管理员，显示所有公司
    const companiesResult = getCompanies();
    if (companiesResult.success) {
        const companies = companiesResult.data;
        
        // 清空选择器
        companySelector.innerHTML = '';
        
        // 添加公司选项
        companies.forEach(company => {
            const option = document.createElement('option');
            option.value = company.id;
            option.textContent = company.name;
            companySelector.appendChild(option);
        });
        
        // 如果有当前公司，设置默认选择
        if (currentCompany) {
            companySelector.value = currentCompany.id;
        }
    }
    
    // 绑定公司选择事件
    companySelector.addEventListener('change', function() {
        const companyId = this.value;
        const result = setCurrentCompany(companyId);
        if (!result.success) {
            alert(result.message);
        }
    });
}

// 辅助函数：获取报表期间
function getReportPeriod(companyId) {
    // 检查是否存在用户选择的期间
    if (window.currentReportPeriod) {
        const { period, customStartDate, customEndDate } = window.currentReportPeriod;
        
        // 如果是自定义期间，验证日期
        if (period === 'custom') {
            if (!customStartDate || !customEndDate) {
                alert('请选择自定义日期范围');
                return null;
            }
            
            // 返回自定义期间对象
            return {
                period_name: `${customStartDate} 至 ${customEndDate}`,
                start_date: customStartDate,
                end_date: customEndDate
            };
        } else {
            // 根据选择的期间类型获取对应的日期范围
            const now = new Date();
            let startDate, endDate;
            
            switch(period) {
                case 'currentMonth':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    break;
                case 'lastMonth':
                    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                    break;
                case 'currentQuarter':
                    const quarter = Math.floor(now.getMonth() / 3);
                    startDate = new Date(now.getFullYear(), quarter * 3, 1);
                    endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
                    break;
                case 'lastQuarter':
                    const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
                    startDate = new Date(now.getFullYear(), lastQuarter * 3, 1);
                    endDate = new Date(now.getFullYear(), lastQuarter * 3 + 3, 0);
                    break;
                case 'currentYear':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    endDate = new Date(now.getFullYear(), 11, 31);
                    break;
                case 'lastYear':
                    const lastYear = now.getFullYear() - 1;
                    startDate = new Date(lastYear, 0, 1);
                    endDate = new Date(lastYear, 11, 31);
                    break;
                default:
                    // 如果没有匹配的期间类型，使用当前会计期间
                    return getCurrentAccountingPeriod(companyId);
            }
            
            // 格式化日期为YYYY-MM-DD
            const formatDate = (date) => {
                return date.toISOString().split('T')[0];
            };
            
            // 返回期间对象
            return {
                period_name: getPeriodName(period, now),
                start_date: formatDate(startDate),
                end_date: formatDate(endDate)
            };
        }
    }
    
    // 如果没有用户选择的期间，使用当前会计期间
    return getCurrentAccountingPeriod(companyId);
}

// 辅助函数：获取期间名称
function getPeriodName(period, date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    switch(period) {
        case 'currentMonth':
            return `${year}年${month}月`;
        case 'lastMonth':
            return `${year}年${month - 1}月`;
        case 'currentQuarter':
            const quarter = Math.floor(month / 3) + 1;
            return `${year}年第${quarter}季度`;
        case 'lastQuarter':
            const lastQuarter = Math.floor((month - 1) / 3);
            return `${year}年第${lastQuarter}季度`;
        case 'currentYear':
            return `${year}年`;
        case 'lastYear':
            return `${year - 1}年`;
        default:
            return '';
    }
}

// 生成资产负债表
function generateBalanceSheet() {
    console.log('生成资产负债表');
    
    // 获取当前公司
    const company = getCurrentCompany();
    if (!company) {
        alert('无法获取公司信息，请重新登录');
        return;
    }
    
    // 获取报表期间
    const currentPeriod = getReportPeriod(company.id);
    if (!currentPeriod) {
        return;
    }
    
    // 获取会计科目数据
    const chartOfAccounts = getChartOfAccounts(company.id);
    
    // 分类会计科目
    const assets = chartOfAccounts.filter(account => account.account_type === 'asset' && account.status === 'active');
    const liabilities = chartOfAccounts.filter(account => account.account_type === 'liability' && account.status === 'active');
    const equity = chartOfAccounts.filter(account => account.account_type === 'equity' && account.status === 'active');
    
    // 计算总计
    const totalAssets = assets.reduce((sum, account) => sum + account.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, account) => sum + account.balance, 0);
    const totalEquity = equity.reduce((sum, account) => sum + account.balance, 0);
    const totalLiabilitiesEquity = totalLiabilities + totalEquity;
    
    // 渲染报表
    renderBalanceSheet(company, currentPeriod, assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, totalLiabilitiesEquity);
}

// 生成利润表
function generateIncomeStatement() {
    console.log('生成利润表');
    
    // 获取当前公司
    const company = getCurrentCompany();
    if (!company) {
        alert('请先选择公司');
        return;
    }
    
    // 获取报表期间
    const currentPeriod = getReportPeriod(company.id);
    if (!currentPeriod) {
        return;
    }
    
    // 获取期间内的所有交易
    const transactions = getTransactionsByPeriod(company.id, currentPeriod.start_date, currentPeriod.end_date);
    
    // 分类收入和支出
    const revenues = [];
    const expenses = [];
    
    transactions.forEach(transaction => {
        if (transaction.transaction_type === '收入') {
            revenues.push(transaction);
        } else if (transaction.transaction_type === '支出') {
            expenses.push(transaction);
        }
    });
    
    // 计算总计
    const totalRevenue = revenues.reduce((sum, rev) => sum + rev.amount, 0);
    const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalRevenue - totalExpense;
    
    // 渲染报表
    renderIncomeStatement(company, currentPeriod, revenues, expenses, totalRevenue, totalExpense, netProfit);
}

// 生成现金流量表
function generateCashFlow() {
    console.log('生成现金流量表');
    
    // 获取当前公司
    const company = getCurrentCompany();
    if (!company) {
        alert('请先选择公司');
        return;
    }
    
    // 获取报表期间
    const currentPeriod = getReportPeriod(company.id);
    if (!currentPeriod) {
        return;
    }
    
    // 获取期间内的所有现金交易
    const cashTransactions = getCashTransactionsByPeriod(company.id, currentPeriod.start_date, currentPeriod.end_date);
    
    // 分类经营活动、投资活动、筹资活动
    const operatingActivities = [];
    const investingActivities = [];
    const financingActivities = [];
    
    // 简单分类（实际项目中需要更详细的分类规则）
    cashTransactions.forEach(transaction => {
        if (transaction.purpose.includes('销售') || transaction.purpose.includes('采购') || transaction.purpose.includes('工资')) {
            operatingActivities.push(transaction);
        } else if (transaction.purpose.includes('投资') || transaction.purpose.includes('资产')) {
            investingActivities.push(transaction);
        } else if (transaction.purpose.includes('借款') || transaction.purpose.includes('还款') || transaction.purpose.includes('投资')) {
            financingActivities.push(transaction);
        } else {
            operatingActivities.push(transaction); // 默认归类为经营活动
        }
    });
    
    // 计算各部分现金流量
    const netOperatingCashFlow = calculateNetCashFlow(operatingActivities);
    const netInvestingCashFlow = calculateNetCashFlow(investingActivities);
    const netFinancingCashFlow = calculateNetCashFlow(financingActivities);
    const netChangeInCash = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;
    
    // 获取期初现金余额
    const beginningCashBalance = getBeginningCashBalance(company.id, currentPeriod.start_date);
    const endingCashBalance = beginningCashBalance + netChangeInCash;
    
    // 渲染报表
    renderCashFlowStatement(company, currentPeriod, operatingActivities, investingActivities, financingActivities, 
                           netOperatingCashFlow, netInvestingCashFlow, netFinancingCashFlow, netChangeInCash, 
                           beginningCashBalance, endingCashBalance);
}

// 生成所有者权益变动表
function generateEquityStatement() {
    console.log('生成所有者权益变动表');
    
    // 获取当前公司
    const company = getCurrentCompany();
    if (!company) {
        alert('请先选择公司');
        return;
    }
    
    // 获取报表期间
    const currentPeriod = getReportPeriod(company.id);
    if (!currentPeriod) {
        return;
    }
    
    // 获取期初权益余额
    const beginningEquity = getBeginningEquityBalance(company.id, currentPeriod.start_date);
    
    // 获取期间内的利润
    const incomeStatementData = getIncomeStatementData(company.id, currentPeriod.start_date, currentPeriod.end_date);
    const netProfit = incomeStatementData.netProfit;
    
    // 获取期间内的权益变动（如股东投入、分红等）
    const equityTransactions = getEquityTransactionsByPeriod(company.id, currentPeriod.start_date, currentPeriod.end_date);
    const additionalInvestments = equityTransactions.filter(t => t.transaction_type === '股东投入').reduce((sum, t) => sum + t.amount, 0);
    const dividends = equityTransactions.filter(t => t.transaction_type === '分红').reduce((sum, t) => sum + t.amount, 0);
    
    // 计算期末权益
    const endingEquity = beginningEquity + netProfit + additionalInvestments - dividends;
    
    // 渲染报表
    renderEquityStatement(company, currentPeriod, beginningEquity, netProfit, additionalInvestments, dividends, endingEquity);
}

// 辅助函数：计算现金流量净额
function calculateNetCashFlow(transactions) {
    return transactions.reduce((sum, transaction) => {
        if (transaction.transaction_type === '收入') {
            return sum + transaction.amount;
        } else if (transaction.transaction_type === '支出') {
            return sum - transaction.amount;
        }
        return sum;
    }, 0);
}

// 渲染资产负债表
function renderBalanceSheet(company, period, assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, totalLiabilitiesEquity) {
    const reportContainer = document.getElementById('reportContent');
    if (!reportContainer) return;
    
    let html = `
        <div class="bg-white shadow-lg rounded-lg p-6 mb-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-4">资产负债表</h2>
            <div class="mb-4">
                <p class="text-gray-600">公司：${company.name}</p>
                <p class="text-gray-600">期间：${period.period_name}</p>
                <p class="text-gray-600">日期：${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="grid grid-cols-2 gap-6">
                <!-- 资产 -->
                <div>
                    <h3 class="text-xl font-semibold text-gray-800 mb-4">资产</h3>
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">账户名称</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">余额</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    assets.forEach(account => {
        html += `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${account.account_name}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${account.balance.toFixed(2)}</td>
                            </tr>
        `;
    });
    
    html += `
                        </tbody>
                        <tfoot class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">资产总计</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">¥${totalAssets.toFixed(2)}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <!-- 负债和所有者权益 -->
                <div>
                    <h3 class="text-xl font-semibold text-gray-800 mb-4">负债和所有者权益</h3>
                    
                    <!-- 负债 -->
                    <h4 class="text-lg font-medium text-gray-700 mb-2">负债</h4>
                    <table class="min-w-full divide-y divide-gray-200 mb-4">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">账户名称</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">余额</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    liabilities.forEach(account => {
        html += `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${account.account_name}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${account.balance.toFixed(2)}</td>
                            </tr>
        `;
    });
    
    html += `
                        </tbody>
                        <tfoot class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">负债总计</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">¥${totalLiabilities.toFixed(2)}</th>
                            </tr>
                        </tfoot>
                    </table>
                    
                    <!-- 所有者权益 -->
                    <h4 class="text-lg font-medium text-gray-700 mb-2">所有者权益</h4>
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">账户名称</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">余额</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    equity.forEach(account => {
        html += `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${account.account_name}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${account.balance.toFixed(2)}</td>
                            </tr>
        `;
    });
    
    html += `
                        </tbody>
                        <tfoot class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">所有者权益总计</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">¥${totalEquity.toFixed(2)}</th>
                            </tr>
                            <tr class="border-t-2 border-gray-300">
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">负债和所有者权益总计</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">¥${totalLiabilitiesEquity.toFixed(2)}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    reportContainer.innerHTML = html;
}

// 渲染利润表
function renderIncomeStatement(company, period, revenues, expenses, totalRevenue, totalExpense, netProfit) {
    const reportContainer = document.getElementById('reportContent');
    if (!reportContainer) return;
    
    let html = `
        <div class="bg-white shadow-lg rounded-lg p-6 mb-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-4">利润表</h2>
            <div class="mb-4">
                <p class="text-gray-600">公司：${company.name}</p>
                <p class="text-gray-600">期间：${period.period_name}</p>
                <p class="text-gray-600">日期：${new Date().toLocaleDateString()}</p>
            </div>
            
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">项目</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <!-- 收入 -->
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">一、营业收入</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
                    </tr>
    `;
    
    revenues.forEach(transaction => {
        html += `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 pl-12">${transaction.purpose}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${transaction.amount.toFixed(2)}</td>
                    </tr>
        `;
    });
    
    html += `
                    <tr class="font-medium">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">收入总计</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${totalRevenue.toFixed(2)}</td>
                    </tr>
                    
                    <!-- 费用 -->
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 pt-6">二、营业成本和费用</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right pt-6"></td>
                    </tr>
    `;
    
    expenses.forEach(transaction => {
        html += `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 pl-12">${transaction.purpose}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${transaction.amount.toFixed(2)}</td>
                    </tr>
        `;
    });
    
    html += `
                    <tr class="font-medium">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">费用总计</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${totalExpense.toFixed(2)}</td>
                    </tr>
                    
                    <!-- 利润 -->
                    <tr class="border-t-2 border-gray-300 font-bold text-lg">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">三、净利润</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}">¥${netProfit.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    reportContainer.innerHTML = html;
}

// 渲染现金流量表
function renderCashFlowStatement(company, period, operatingActivities, investingActivities, financingActivities, 
                               netOperatingCashFlow, netInvestingCashFlow, netFinancingCashFlow, netChangeInCash, 
                               beginningCashBalance, endingCashBalance) {
    const reportContainer = document.getElementById('reportContent');
    if (!reportContainer) return;
    
    let html = `
        <div class="bg-white shadow-lg rounded-lg p-6 mb-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-4">现金流量表</h2>
            <div class="mb-4">
                <p class="text-gray-600">公司：${company.name}</p>
                <p class="text-gray-600">期间：${period.period_name}</p>
                <p class="text-gray-600">日期：${new Date().toLocaleDateString()}</p>
            </div>
            
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">项目</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <!-- 经营活动现金流量 -->
                    <tr class="bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">一、经营活动产生的现金流量</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
                    </tr>
    `;
    
    operatingActivities.forEach(transaction => {
        const amount = transaction.transaction_type === '收入' ? transaction.amount : -transaction.amount;
        html += `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 pl-12">${transaction.purpose}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${amount.toFixed(2)}</td>
                    </tr>
        `;
    });
    
    html += `
                    <tr class="font-medium">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">经营活动现金流量净额</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${netOperatingCashFlow.toFixed(2)}</td>
                    </tr>
                    
                    <!-- 投资活动现金流量 -->
                    <tr class="bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 pt-6">二、投资活动产生的现金流量</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right pt-6"></td>
                    </tr>
    `;
    
    investingActivities.forEach(transaction => {
        const amount = transaction.transaction_type === '收入' ? transaction.amount : -transaction.amount;
        html += `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 pl-12">${transaction.purpose}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${amount.toFixed(2)}</td>
                    </tr>
        `;
    });
    
    html += `
                    <tr class="font-medium">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">投资活动现金流量净额</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${netInvestingCashFlow.toFixed(2)}</td>
                    </tr>
                    
                    <!-- 筹资活动现金流量 -->
                    <tr class="bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 pt-6">三、筹资活动产生的现金流量</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right pt-6"></td>
                    </tr>
    `;
    
    financingActivities.forEach(transaction => {
        const amount = transaction.transaction_type === '收入' ? transaction.amount : -transaction.amount;
        html += `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 pl-12">${transaction.purpose}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${amount.toFixed(2)}</td>
                    </tr>
        `;
    });
    
    html += `
                    <tr class="font-medium">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">筹资活动现金流量净额</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${netFinancingCashFlow.toFixed(2)}</td>
                    </tr>
                    
                    <!-- 现金及现金等价物净增加额 -->
                    <tr class="border-t-2 border-gray-300 font-bold">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 pt-6">四、现金及现金等价物净增加额</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right pt-6">¥${netChangeInCash.toFixed(2)}</td>
                    </tr>
                    
                    <!-- 期初现金余额 -->
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">加：期初现金及现金等价物余额</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${beginningCashBalance.toFixed(2)}</td>
                    </tr>
                    
                    <!-- 期末现金余额 -->
                    <tr class="border-t-2 border-gray-300 font-bold text-lg">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">五、期末现金及现金等价物余额</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${endingCashBalance.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    reportContainer.innerHTML = html;
}

// 渲染所有者权益变动表
function renderEquityStatement(company, period, beginningEquity, netProfit, additionalInvestments, dividends, endingEquity) {
    const reportContainer = document.getElementById('reportContent');
    if (!reportContainer) return;
    
    let html = `
        <div class="bg-white shadow-lg rounded-lg p-6 mb-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-4">所有者权益变动表</h2>
            <div class="mb-4">
                <p class="text-gray-600">公司：${company.name}</p>
                <p class="text-gray-600">期间：${period.period_name}</p>
                <p class="text-gray-600">日期：${new Date().toLocaleDateString()}</p>
            </div>
            
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">项目</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <!-- 期初余额 -->
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">一、期初所有者权益余额</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${beginningEquity.toFixed(2)}</td>
                    </tr>
                    
                    <!-- 本年增减变动 -->
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 pt-6">二、本年增减变动金额</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right pt-6"></td>
                    </tr>
                    
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 pl-12">（一）净利润</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}">¥${netProfit.toFixed(2)}</td>
                    </tr>
                    
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 pl-12">（二）所有者投入和减少资本</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">¥${additionalInvestments.toFixed(2)}</td>
                    </tr>
                    
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 pl-12">（三）利润分配</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">-¥${dividends.toFixed(2)}</td>
                    </tr>
                    
                    <!-- 期末余额 -->
                    <tr class="border-t-2 border-gray-300 font-bold text-lg">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 pt-6">三、期末所有者权益余额</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right pt-6">¥${endingEquity.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    reportContainer.innerHTML = html;
}

// 导出报表为Excel
function exportReportToExcel(reportType) {
    console.log('导出报表为Excel:', reportType);
    // 这里可以实现Excel导出功能
    alert('报表导出功能将在后续版本中实现');
}

// 打印报表
function printReport() {
    console.log('打印报表');
    window.print();
}