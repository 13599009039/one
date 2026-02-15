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
        showInfo('指派功能开发中');
    }

    /**
     * 转交任务
     */
    function transferTask(taskId) {
        showInfo('转交功能开发中');
    }

    /**
     * 添加协作人
     */
    function addCollaborator(taskId) {
        showInfo('添加协作人功能开发中');
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
        console.log('任务详情:', data);
        alert('详情模态框开发中\n\n' + JSON.stringify(data, null, 2));
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
