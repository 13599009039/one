// 任务池模块

let currentTaskFilter = 'all';

// 初始化任务池页面
function initTaskPoolPage() {
    currentTaskFilter = 'all';
    renderTaskPool();
}

// 筛选任务
window.filterTasks = function(filter) {
    currentTaskFilter = filter;
    // 更新按钮样式
    document.querySelectorAll('.task-filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.className = 'task-filter-btn active px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white';
        } else {
            btn.className = 'task-filter-btn px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200';
        }
    });
    renderTaskPool();
};

// 渲染任务池列表
function renderTaskPool() {
    const tbody = document.getElementById('taskPoolTableBody');
    if (!tbody) return;

    const result = getTaskPool ? getTaskPool() : { data: [] };
    const allTasks = result.data || [];

    // 统计
    const waitingCount = allTasks.filter(t => t.status === 'waiting').length;
    const progressCount = allTasks.filter(t => t.status === 'in_progress').length;
    const completedCount = allTasks.filter(t => t.status === 'completed').length;

    const wEl = document.getElementById('taskWaitingCount');
    const pEl = document.getElementById('taskProgressCount');
    const cEl = document.getElementById('taskCompletedCount');
    if (wEl) wEl.textContent = waitingCount;
    if (pEl) pEl.textContent = progressCount;
    if (cEl) cEl.textContent = completedCount;

    // 筛选
    const tasks = currentTaskFilter === 'all' ? allTasks : allTasks.filter(t => t.status === currentTaskFilter);

    tbody.innerHTML = '';

    if (tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-500">暂无任务</td></tr>';
        return;
    }

    tasks.forEach(task => {
        const totalCost = (task.costs || []).reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

        const statusMap = {
            'waiting': { label: '待接单', cls: 'bg-yellow-100 text-yellow-800', icon: 'fa-clock' },
            'in_progress': { label: '进行中', cls: 'bg-blue-100 text-blue-800', icon: 'fa-spinner' },
            'completed': { label: '已完成', cls: 'bg-green-100 text-green-800', icon: 'fa-check-circle' }
        };
        const st = statusMap[task.status] || statusMap['waiting'];

        // 操作按钮
        let actions = '';
        if (task.status === 'waiting') {
            actions = `<button onclick="handleAcceptTask(${task.id})" class="text-blue-600 hover:text-blue-800 text-sm font-medium"><i class="fas fa-hand-pointer mr-1"></i>接单</button>`;
        } else if (task.status === 'in_progress') {
            actions = `
                <button onclick="openTaskCostModal(${task.id})" class="text-green-600 hover:text-green-800 text-sm mr-2"><i class="fas fa-coins mr-1"></i>登记成本</button>
                <button onclick="handleCompleteTask(${task.id})" class="text-purple-600 hover:text-purple-800 text-sm"><i class="fas fa-flag-checkered mr-1"></i>完成</button>
            `;
        } else {
            actions = `<button onclick="viewTaskCosts(${task.id})" class="text-gray-600 hover:text-gray-800 text-sm"><i class="fas fa-eye mr-1"></i>查看成本</button>`;
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';
        tr.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-gray-900">${task.title || '-'}</td>
            <td class="px-4 py-3 text-sm text-blue-600">${task.order_id || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-500">${task.customer_name || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-500">${task.assigned_name || '<span class="text-gray-400">待分配</span>'}</td>
            <td class="px-4 py-3 text-center">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${st.cls}">
                    <i class="fas ${st.icon} mr-1"></i>${st.label}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-right font-medium ${totalCost > 0 ? 'text-red-600' : 'text-gray-400'}">¥${totalCost.toFixed(2)}</td>
            <td class="px-4 py-3 text-xs text-gray-500">${task.created_at || '-'}</td>
            <td class="px-4 py-3 text-center whitespace-nowrap">${actions}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 接单
window.handleAcceptTask = function(taskId) {
    // 获取当前登录用户
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const userId = currentUser ? currentUser.id : 1;
    const userName = currentUser ? currentUser.name : '当前用户';

    const result = acceptTask(taskId, userId, userName);
    if (result.success) {
        showNotification('接单成功，任务已开始', 'success');
        renderTaskPool();
    } else {
        showNotification(result.message || '接单失败', 'error');
    }
};

// 完成任务
window.handleCompleteTask = function(taskId) {
    if (!confirm('确认标记该任务为已完成？')) return;

    const result = completeTask(taskId);
    if (result.success) {
        showNotification('任务已完成', 'success');
        renderTaskPool();
    } else {
        showNotification(result.message || '操作失败', 'error');
    }
};

// 登记成本模态框
window.openTaskCostModal = function(taskId) {
    let modal = document.getElementById('taskCostModal');
    if (!modal) {
        createTaskCostModal();
        modal = document.getElementById('taskCostModal');
    }

    modal.dataset.taskId = taskId;
    document.getElementById('taskCostForm')?.reset();

    // 加载成本类别选项
    const categorySelect = document.getElementById('taskCostCategory');
    if (categorySelect) {
        const categories = getCostCategories ? getCostCategories().data || [] : [];
        categorySelect.innerHTML = '<option value="">请选择成本项目</option>' +
            categories.filter(c => c.status === 'active').map(c => `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`).join('');
    }

    // 设置默认日期
    const dateInput = document.getElementById('taskCostDate');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    // 渲染已有成本
    renderTaskCostList(taskId);

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

function createTaskCostModal() {
    const modal = document.createElement('div');
    modal.id = 'taskCostModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div class="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
                <h3 class="text-lg font-semibold text-gray-900"><i class="fas fa-coins text-green-600 mr-2"></i>登记业务成本</h3>
                <button type="button" onclick="closeTaskCostModal()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div class="p-4">
                <!-- 添加成本表单 -->
                <form id="taskCostForm" class="mb-4">
                    <h4 class="text-sm font-medium text-gray-500 mb-3 pb-2 border-b">添加成本项</h4>
                    <div class="grid grid-cols-4 gap-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">成本项目 <span class="text-red-500">*</span></label>
                            <select id="taskCostCategory" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" required>
                                <option value="">请选择</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">金额 <span class="text-red-500">*</span></label>
                            <input type="number" step="0.01" id="taskCostAmount" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="0.00" required>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">日期</label>
                            <input type="date" id="taskCostDate" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="flex items-end">
                            <button type="submit" class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                                <i class="fas fa-plus mr-1"></i>添加
                            </button>
                        </div>
                    </div>
                    <div class="mt-2">
                        <label class="block text-xs font-medium text-gray-700 mb-1">备注</label>
                        <input type="text" id="taskCostRemark" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="费用说明">
                    </div>
                </form>
                <!-- 已登记成本列表 -->
                <div>
                    <h4 class="text-sm font-medium text-gray-500 mb-3 pb-2 border-b">已登记成本</h4>
                    <div id="taskCostListContainer">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">项目</th>
                                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">金额</th>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">日期</th>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">备注</th>
                                    <th class="px-3 py-2 text-center text-xs font-medium text-gray-500">操作</th>
                                </tr>
                            </thead>
                            <tbody id="taskCostListBody" class="divide-y divide-gray-200"></tbody>
                        </table>
                        <div class="flex justify-end pt-3 border-t mt-2">
                            <span class="text-sm text-gray-600">合计：</span>
                            <span id="taskCostTotal" class="text-lg font-bold text-red-600 ml-2">¥0.00</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex justify-end p-4 border-t">
                <button type="button" onclick="closeTaskCostModal()" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">关闭</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('taskCostForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const taskId = parseInt(document.getElementById('taskCostModal').dataset.taskId);
        const categorySelect = document.getElementById('taskCostCategory');
        const selectedOption = categorySelect.options[categorySelect.selectedIndex];

        const costData = {
            category_id: parseInt(categorySelect.value),
            category_name: selectedOption ? selectedOption.dataset.name || selectedOption.textContent : '',
            amount: document.getElementById('taskCostAmount').value,
            remark: document.getElementById('taskCostRemark').value,
            date: document.getElementById('taskCostDate').value
        };

        if (!costData.category_id || !costData.amount) {
            alert('请选择成本项目并填写金额');
            return;
        }

        const result = addTaskCost(taskId, costData);
        if (result.success) {
            showNotification('成本登记成功', 'success');
            document.getElementById('taskCostForm').reset();
            document.getElementById('taskCostDate').value = new Date().toISOString().split('T')[0];
            renderTaskCostList(taskId);
            renderTaskPool();
        } else {
            showNotification(result.message || '登记失败', 'error');
        }
    });
}

function renderTaskCostList(taskId) {
    const tbody = document.getElementById('taskCostListBody');
    const totalEl = document.getElementById('taskCostTotal');
    if (!tbody) return;

    const result = getTaskPool ? getTaskPool() : { data: [] };
    const task = (result.data || []).find(t => t.id === taskId);
    const costs = task ? (task.costs || []) : [];

    tbody.innerHTML = '';
    let total = 0;

    if (costs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-400 text-sm">暂无成本记录</td></tr>';
    } else {
        costs.forEach(cost => {
            total += parseFloat(cost.amount) || 0;
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50';
            tr.innerHTML = `
                <td class="px-3 py-2 text-sm text-gray-900">${cost.category_name || '-'}</td>
                <td class="px-3 py-2 text-sm text-right text-red-600 font-medium">¥${parseFloat(cost.amount).toFixed(2)}</td>
                <td class="px-3 py-2 text-sm text-gray-500">${cost.date || '-'}</td>
                <td class="px-3 py-2 text-sm text-gray-500">${cost.remark || '-'}</td>
                <td class="px-3 py-2 text-center">
                    <button onclick="handleRemoveTaskCost(${taskId}, ${cost.id})" class="text-red-500 hover:text-red-700 text-sm"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    if (totalEl) totalEl.textContent = '¥' + total.toFixed(2);
}

window.handleRemoveTaskCost = function(taskId, costId) {
    if (!confirm('确认删除该成本记录？')) return;
    const result = removeTaskCost(taskId, costId);
    if (result.success) {
        showNotification('已删除', 'success');
        renderTaskCostList(taskId);
        renderTaskPool();
    }
};

window.closeTaskCostModal = function() {
    const modal = document.getElementById('taskCostModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

// 查看已完成任务的成本
window.viewTaskCosts = function(taskId) {
    openTaskCostModal(taskId);
};

// =============== 业务成本设置页面 ===============
function initCostConfigPage() {
    renderCostCategories();
}

function renderCostCategories() {
    const tbody = document.getElementById('costCategoriesTableBody');
    if (!tbody) return;

    const result = getCostCategories ? getCostCategories() : { data: [] };
    const categories = result.data || [];
    tbody.innerHTML = '';

    if (categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-500">暂无成本项目</td></tr>';
        return;
    }

    categories.forEach(cat => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';
        tr.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-gray-900">${cat.name}</td>
            <td class="px-4 py-3 text-sm text-gray-500">${cat.description || '-'}</td>
            <td class="px-4 py-3 text-center">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${cat.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${cat.status === 'active' ? '启用' : '禁用'}
                </span>
            </td>
            <td class="px-4 py-3 text-center">
                <button onclick="openCostCategoryModal(${cat.id})" class="text-blue-600 hover:text-blue-800 text-sm mr-2"><i class="fas fa-edit"></i></button>
                <button onclick="handleDeleteCostCategory(${cat.id})" class="text-red-600 hover:text-red-800 text-sm"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

let currentEditingCostCategory = null;

window.openCostCategoryModal = function(id = null) {
    currentEditingCostCategory = id;
    let modal = document.getElementById('costCategoryModal');
    if (!modal) {
        createCostCategoryModal();
        modal = document.getElementById('costCategoryModal');
    }

    document.getElementById('costCategoryForm')?.reset();
    document.getElementById('costCategoryModalTitle').textContent = id ? '编辑成本项目' : '新增成本项目';

    if (id) {
        const result = getCostCategories ? getCostCategories() : { data: [] };
        const cat = (result.data || []).find(c => c.id === id);
        if (cat) {
            document.getElementById('costCatName').value = cat.name || '';
            document.getElementById('costCatDesc').value = cat.description || '';
            document.getElementById('costCatStatus').value = cat.status || 'active';
        }
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

function createCostCategoryModal() {
    const modal = document.createElement('div');
    modal.id = 'costCategoryModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div class="flex items-center justify-between p-4 border-b">
                <h3 id="costCategoryModalTitle" class="text-lg font-semibold text-gray-900">新增成本项目</h3>
                <button type="button" onclick="closeCostCategoryModal()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form id="costCategoryForm" class="p-4 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">项目名称 <span class="text-red-500">*</span></label>
                    <input type="text" id="costCatName" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required placeholder="如：拍摄费用">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
                    <input type="text" id="costCatDesc" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="简要描述该成本项目">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">状态</label>
                    <select id="costCatStatus" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="active">启用</option>
                        <option value="inactive">禁用</option>
                    </select>
                </div>
                <div class="flex justify-end space-x-3 pt-4 border-t">
                    <button type="button" onclick="closeCostCategoryModal()" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('costCategoryForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const data = {
            name: document.getElementById('costCatName').value.trim(),
            description: document.getElementById('costCatDesc').value.trim(),
            status: document.getElementById('costCatStatus').value
        };

        if (!data.name) { alert('请填写项目名称'); return; }

        let result;
        if (currentEditingCostCategory) {
            result = updateCostCategory(currentEditingCostCategory, data);
        } else {
            result = addCostCategory(data);
        }

        if (result.success) {
            showNotification(currentEditingCostCategory ? '更新成功' : '创建成功', 'success');
            closeCostCategoryModal();
            renderCostCategories();
        } else {
            showNotification(result.message || '操作失败', 'error');
        }
    });
}

window.closeCostCategoryModal = function() {
    const modal = document.getElementById('costCategoryModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    currentEditingCostCategory = null;
};

window.handleDeleteCostCategory = function(id) {
    if (!confirm('确认删除该成本项目？')) return;
    const result = deleteCostCategory(id);
    if (result.success) {
        showNotification('已删除', 'success');
        renderCostCategories();
    }
};
