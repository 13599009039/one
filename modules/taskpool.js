/**
 * 任务池管理模块 v1.0
 * 功能:任务列表、领取、指派、转交、协作、放弃、状态更新
 */

const TaskPoolModule = (function() {
    'use strict';

    // 当前视图类型
    let currentView = 'available'; // available, my, all
    let currentUserId = null;

    /**
     * 初始化模块
     */
    function init(userId) {
        currentUserId = userId;
        bindEvents();
        loadTaskList();
    }

    /**
     * 绑定事件
     */
    function bindEvents() {
        // Tab切换
        document.querySelectorAll('[data-task-tab]').forEach(tab => {
            tab.addEventListener('click', function() {
                const view = this.getAttribute('data-task-tab');
                switchView(view);
            });
        });

        // 筛选器
        const statusFilter = document.getElementById('taskStatusFilter');
        const priorityFilter = document.getElementById('taskPriorityFilter');
        
        if (statusFilter) {
            statusFilter.addEventListener('change', loadTaskList);
        }
        if (priorityFilter) {
            priorityFilter.addEventListener('change', loadTaskList);
        }
    }

    /**
     * 切换视图
     */
    function switchView(view) {
        currentView = view;
        
        // 更新Tab激活状态
        document.querySelectorAll('[data-task-tab]').forEach(tab => {
            if (tab.getAttribute('data-task-tab') === view) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // 重新加载列表
        loadTaskList();
    }

    /**
     * 加载任务列表
     */
    async function loadTaskList() {
        try {
            const statusFilter = document.getElementById('taskStatusFilter');
            const priorityFilter = document.getElementById('taskPriorityFilter');

            const params = new URLSearchParams({
                view: currentView,
                user_id: currentUserId || '',
                status: statusFilter ? statusFilter.value : '',
                priority: priorityFilter ? priorityFilter.value : ''
            });

            const response = await fetch(`${API_BASE_URL}/task-pool?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                renderTaskList(result.data);
            } else {
                showError('加载任务列表失败: ' + result.message);
            }
        } catch (error) {
            console.error('加载任务列表失败:', error);
            showError('加载任务列表失败');
        }
    }

    /**
     * 渲染任务列表
     */
    function renderTaskList(tasks) {
        const container = document.getElementById('taskListContainer');
        if (!container) return;

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align:center; padding:60px 20px;">
                    <i class="fas fa-inbox" style="font-size: 48px; color: #ccc;"></i>
                    <p style="color: #999; margin-top: 20px;">暂无任务</p>
                </div>
            `;
            return;
        }

        const html = tasks.map(task => renderTaskCard(task)).join('');
        container.innerHTML = html;
    }

    /**
     * 渲染任务卡片
     */
    function renderTaskCard(task) {
        const statusColors = {
            '待接单': 'warning',
            '已接单': 'info',
            '进行中': 'primary',
            '待验收': 'secondary',
            '已完成': 'success',
            '已放弃': 'danger',
            '已拒绝': 'danger'
        };

        const priorityColors = {
            '低': 'secondary',
            '中': 'info',
            '高': 'warning',
            '紧急': 'danger'
        };

        return `
            <div class="card mb-3">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <span class="badge badge-${statusColors[task.status] || 'secondary'}">${task.status}</span>
                        <span class="badge badge-${priorityColors[task.priority] || 'secondary'}">${task.priority}</span>
                        <strong style="margin-left:10px;">订单ID: ${task.order_id}</strong>
                    </div>
                    <div>
                        ${renderTaskActions(task)}
                    </div>
                </div>
                <div class="card-body">
                    <p><strong>客户:</strong> ${task.customer_name || '未知'}</p>
                    <p><strong>描述:</strong> ${task.description || '无'}</p>
                    <p><strong>创建时间:</strong> ${formatDateTime(task.created_at)}</p>
                    ${task.participant_count > 0 ? `<p><strong>参与人数:</strong> ${task.participant_count}</p>` : ''}
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm btn-outline-primary" onclick="TaskPoolModule.viewTaskDetail(${task.id})">
                        <i class="fas fa-eye"></i> 查看详情
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 渲染任务操作按钮
     */
    function renderTaskActions(task) {
        const actions = [];

        // 待接单状态
        if (task.status === '待接单') {
            actions.push(`<button class="btn btn-sm btn-success" onclick="TaskPoolModule.claimTask(${task.id})"><i class="fas fa-hand-paper"></i> 领取</button>`);
            actions.push(`<button class="btn btn-sm btn-primary" onclick="TaskPoolModule.assignTask(${task.id})"><i class="fas fa-user-plus"></i> 指派</button>`);
        }

        // 已接单/进行中状态
        if (task.status === '已接单' || task.status === '进行中') {
            if (currentView === 'my') {
                actions.push(`<button class="btn btn-sm btn-info" onclick="TaskPoolModule.updateStatus(${task.id}, '进行中')"><i class="fas fa-play"></i> 开始</button>`);
                actions.push(`<button class="btn btn-sm btn-warning" onclick="TaskPoolModule.transferTask(${task.id})"><i class="fas fa-exchange-alt"></i> 转交</button>`);
                actions.push(`<button class="btn btn-sm btn-secondary" onclick="TaskPoolModule.addCollaborator(${task.id})"><i class="fas fa-user-plus"></i> 协作</button>`);
                actions.push(`<button class="btn btn-sm btn-danger" onclick="TaskPoolModule.abandonTask(${task.id})"><i class="fas fa-times"></i> 放弃</button>`);
            }
        }

        return actions.join(' ');
    }

    /**
     * 领取任务
     */
    async function claimTask(taskId) {
        if (!confirm('确认领取此任务?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/task-pool/${taskId}/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: currentUserId
                })
            });

            const result = await response.json();
            
            if (result.success) {
                showSuccess('任务领取成功');
                loadTaskList();
            } else {
                showError('领取失败: ' + result.message);
            }
        } catch (error) {
            console.error('领取任务失败:', error);
            showError('领取任务失败');
        }
    }

    /**
     * 指派任务
     */
    function assignTask(taskId) {
        document.getElementById('assignTaskId').value = taskId;
        $('#assignTaskModal').modal('show');
        loadServiceUsers('assignUserId');
    }

    /**
     * 转交任务
     */
    function transferTask(taskId) {
        document.getElementById('transferTaskId').value = taskId;
        $('#transferTaskModal').modal('show');
        loadServiceUsers('transferToUserId');
    }

    /**
     * 添加协作人
     */
    function addCollaborator(taskId) {
        document.getElementById('collaboratorTaskId').value = taskId;
        $('#addCollaboratorModal').modal('show');
        loadServiceUsers('collaboratorUserId');
    }

    /**
     * 放弃任务
     */
    async function abandonTask(taskId) {
        const reason = prompt('请输入放弃原因:');
        if (!reason) return;

        try {
            const response = await fetch(`${API_BASE_URL}/task-pool/${taskId}/abandon`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: currentUserId,
                    abandon_reason: reason
                })
            });

            const result = await response.json();
            
            if (result.success) {
                showSuccess('任务已放弃');
                loadTaskList();
            } else {
                showError('放弃失败: ' + result.message);
            }
        } catch (error) {
            console.error('放弃任务失败:', error);
            showError('放弃任务失败');
        }
    }

    /**
     * 更新任务状态
     */
    async function updateStatus(taskId, status) {
        try {
            const response = await fetch(`${API_BASE_URL}/task-pool/${taskId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: status,
                    user_id: currentUserId,
                    remark: ''
                })
            });

            const result = await response.json();
            
            if (result.success) {
                showSuccess('状态更新成功');
                loadTaskList();
            } else {
                showError('更新失败: ' + result.message);
            }
        } catch (error) {
            console.error('更新状态失败:', error);
            showError('更新状态失败');
        }
    }

    /**
     * 查看任务详情
     */
    async function viewTaskDetail(taskId) {
        try {
            const response = await fetch(`${API_BASE_URL}/task-pool/${taskId}/detail`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                showTaskDetailModal(result.data);
            } else {
                showError('加载详情失败: ' + result.message);
            }
        } catch (error) {
            console.error('加载任务详情失败:', error);
            showError('加载任务详情失败');
        }
    }

    /**
     * 显示任务详情模态框
     */
    function showTaskDetailModal(data) {
        const modal = document.getElementById('taskDetailModal');
        if (!modal) {
            showError('任务详情模态框未加载');
            return;
        }

        // 填充基本信息
        document.getElementById('detailTaskId').textContent = data.task.id;
        document.getElementById('detailOrderId').textContent = data.task.order_id || '-';
        document.getElementById('detailCustomerName').textContent = data.task.customer_name || '-';
        document.getElementById('detailTaskStatus').textContent = data.task.status;
        document.getElementById('detailTaskPriority').textContent = data.task.priority;
        document.getElementById('detailSourceType').textContent = data.task.source_type || '-';
        document.getElementById('detailCreatedAt').textContent = formatDateTime(data.task.created_at);
        document.getElementById('detailAcceptedAt').textContent = formatDateTime(data.task.accepted_at);
        document.getElementById('detailTaskDescription').textContent = data.task.description || '-';
        document.getElementById('detailTaskRequirements').textContent = data.task.requirements || '-';

        // 渲染参与人员
        const participantsTable = document.getElementById('detailParticipantsTable');
        if (data.participants && data.participants.length > 0) {
            participantsTable.innerHTML = data.participants.map(p => `
                <tr>
                    <td>${p.username}</td>
                    <td>${p.role_type}</td>
                    <td>${p.assignment_type}</td>
                    <td>${formatDateTime(p.accepted_at)}</td>
                    <td><span class="badge badge-${p.is_active ? 'success' : 'secondary'}">${p.is_active ? '活跃' : '已退出'}</span></td>
                </tr>
            `).join('');
        } else {
            participantsTable.innerHTML = '<tr><td colspan="5" style="text-align:center;">暂无参与人员</td></tr>';
        }

        // 渲染操作历史
        const logsContainer = document.getElementById('detailOperationLogs');
        if (data.logs && data.logs.length > 0) {
            logsContainer.innerHTML = data.logs.map(log => `
                <div style="padding:10px; border-bottom:1px solid #eee;">
                    <small class="text-muted">${formatDateTime(log.created_at)}</small>
                    <p><strong>${log.operation_type}:</strong> ${log.description}</p>
                </div>
            `).join('');
        } else {
            logsContainer.innerHTML = '<p style="text-align:center; color:#999;">暂无操作记录</p>';
        }

        $('#taskDetailModal').modal('show');
    }

    /**
     * 加载服务人员列表
     */
    async function loadServiceUsers(selectId) {
        try {
            const response = await fetch(`${API_BASE_URL}/users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success && result.data) {
                const select = document.getElementById(selectId);
                if (select) {
                    select.innerHTML = '<option value="">请选择人员</option>' + 
                        result.data.map(user => `<option value="${user.id}">${user.username} - ${user.full_name || ''}</option>`).join('');
                }
            }
        } catch (error) {
            console.error('加载人员列表失败:', error);
        }
    }

    /**
     * 格式化日期时间
     */
    function formatDateTime(datetime) {
        if (!datetime) return '-';
        const date = new Date(datetime);
        return date.toLocaleString('zh-CN');
    }

    /**
     * 显示成功消息
     */
    function showSuccess(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'success');
        } else {
            alert(message);
        }
    }

    /**
     * 显示错误消息
     */
    function showError(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'error');
        } else {
            alert(message);
        }
    }

    /**
     * 显示信息消息
     */
    function showInfo(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'info');
        } else {
            alert(message);
        }
    }

    // 导出公共方法
    return {
        init,
        loadTaskList,
        claimTask,
        assignTask,
        transferTask,
        addCollaborator,
        abandonTask,
        updateStatus,
        viewTaskDetail
    };
})();

// 使模块全局可用
window.TaskPoolModule = TaskPoolModule;

/**
 * 全局确认函数 - 指派任务
 */
window.confirmAssignTask = async function() {
    const taskId = document.getElementById('assignTaskId').value;
    const userId = document.getElementById('assignUserId').value;
    const note = document.getElementById('assignNote').value;

    if (!userId) {
        alert('请选择服务人员');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/task-pool/${taskId}/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                assigner_id: window.currentUser?.id || 1,
                note: note
            })
        });

        const result = await response.json();
        
        if (result.success) {
            $('#assignTaskModal').modal('hide');
            alert('指派成功');
            TaskPoolModule.loadTaskList();
        } else {
            alert('指派失败: ' + result.message);
        }
    } catch (error) {
        console.error('指派任务失败:', error);
        alert('指派任务失败');
    }
};

/**
 * 全局确认函数 - 转交任务
 */
window.confirmTransferTask = async function() {
    const taskId = document.getElementById('transferTaskId').value;
    const toUserId = document.getElementById('transferToUserId').value;
    const reason = document.getElementById('transferReason').value;

    if (!toUserId) {
        alert('请选择转交对象');
        return;
    }

    if (!reason) {
        alert('请输入转交原因');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/task-pool/${taskId}/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from_user_id: window.currentUser?.id || 1,
                to_user_id: toUserId,
                transfer_reason: reason
            })
        });

        const result = await response.json();
        
        if (result.success) {
            $('#transferTaskModal').modal('hide');
            alert('转交成功');
            TaskPoolModule.loadTaskList();
        } else {
            alert('转交失败: ' + result.message);
        }
    } catch (error) {
        console.error('转交任务失败:', error);
        alert('转交任务失败');
    }
};

/**
 * 全局确认函数 - 添加协作人
 */
window.confirmAddCollaborator = async function() {
    const taskId = document.getElementById('collaboratorTaskId').value;
    const userId = document.getElementById('collaboratorUserId').value;
    const note = document.getElementById('collaboratorNote').value;

    if (!userId) {
        alert('请选择协作人员');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/task-pool/${taskId}/collaborators`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                added_by: window.currentUser?.id || 1,
                note: note
            })
        });

        const result = await response.json();
        
        if (result.success) {
            $('#addCollaboratorModal').modal('hide');
            alert('添加协作人成功');
            TaskPoolModule.loadTaskList();
        } else {
            alert('添加失败: ' + result.message);
        }
    } catch (error) {
        console.error('添加协作人失败:', error);
        alert('添加协作人失败');
    }
};
