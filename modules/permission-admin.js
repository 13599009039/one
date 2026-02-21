/**
 * 权限管理模块 - Permission Admin
 * 版本: v1.1.0
 * 说明: 角色管理、权限分配（供人员设置页面调用）
 * 更新: 完善角色CRUD（编辑、停用/启用、删除）
 */

(function() {
    'use strict';

    // 全局数据缓存
    let allRoles = [];
    let allPermissions = [];
    let allUsers = [];
    let currentEditingRole = null;

    // ==================== 公开API ====================
    
    // 创建全局命名空间
    window.permissionAdmin = window.permissionAdmin || {};
    
    // 导出loadRoles供人员设置页面调用
    window.permissionAdmin.loadRoles = loadRoles;
    window.permissionAdmin.createRole = createRole;
    window.permissionAdmin.editRole = editRole;
    // editRolePermissions在第385行定义，不需要在此处导出
    window.permissionAdmin.toggleRoleStatus = toggleRoleStatus;
    window.permissionAdmin.deleteRole = deleteRole;

    // ==================== 数据加载 ====================

    // ==================== 加载数据 ====================

    async function loadRoles() {
        try {
            const response = await fetch('/api/roles', {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                allRoles = result.data || [];
                renderRolesList();
                console.log('[PermissionAdmin] ✅ 加载角色列表成功，共 ' + allRoles.length + ' 个角色');
            } else {
                console.error('[PermissionAdmin] ❌ 加载角色失败:', result.message);
            }
        } catch (error) {
            console.error('[PermissionAdmin] ❌ 加载角色异常:', error);
        }
    }

    async function loadPermissions() {
        try {
            const response = await fetch('/api/permissions', {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                allPermissions = result.data || [];
                console.log('[PermissionAdmin] ✅ 加载权限列表成功，共 ' + allPermissions.length + ' 个权限');
            } else {
                console.error('[PermissionAdmin] ❌ 加载权限失败:', result.message);
            }
        } catch (error) {
            console.error('[PermissionAdmin] ❌ 加载权限异常:', error);
        }
    }

    async function loadUsers() {
        try {
            const response = await fetch('/api/users', {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                allUsers = result.data || [];
                renderUsersList();
                console.log('[PermissionAdmin] ✅ 加载用户列表成功，共 ' + allUsers.length + ' 个用户');
            } else {
                console.error('[PermissionAdmin] ❌ 加载用户失败:', result.message);
            }
        } catch (error) {
            console.error('[PermissionAdmin] ❌ 加载用户异常:', error);
        }
    }

    // ==================== 渲染角色列表 ====================

    function renderRolesList() {
        const tbody = document.getElementById('rolesTableBody');
        if (!tbody) return;

        if (allRoles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">暂无角色数据</td></tr>';
            return;
        }

        tbody.innerHTML = allRoles.map(role => `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-4 py-3">${SafeUtils.escapeHTML(role.name)}</td>
                <td class="px-4 py-3">
                    <code class="text-sm bg-gray-100 px-2 py-1 rounded">${SafeUtils.escapeHTML(role.code)}</code>
                </td>
                <td class="px-4 py-3">
                    ${role.is_system ? '<span class="text-blue-600 text-xs">系统内置</span>' : '<span class="text-gray-500 text-xs">自定义</span>'}
                </td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 text-xs rounded ${role.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                        ${role.status === 'active' ? '启用' : '禁用'}
                    </span>
                </td>
                <td class="px-4 py-3">
                    ${!role.is_system ? `
                        <button onclick="window.permissionAdmin.editRole(${role.id})" 
                                class="text-blue-600 hover:underline text-sm mr-2"
                                data-permission="role:update">
                            编辑
                        </button>
                    ` : ''}
                    <button onclick="window.permissionAdmin.editRolePermissions(${role.id})" 
                            class="text-purple-600 hover:underline text-sm mr-2"
                            data-permission="role:assign_permission">
                        分配权限
                    </button>
                    ${!role.is_system ? `
                        <button onclick="window.permissionAdmin.toggleRoleStatus(${role.id})" 
                                class="text-${role.status === 'active' ? 'orange' : 'green'}-600 hover:underline text-sm mr-2"
                                data-permission="role:update">
                            ${role.status === 'active' ? '停用' : '启用'}
                        </button>
                        <button onclick="window.permissionAdmin.deleteRole(${role.id})" 
                                class="text-red-600 hover:underline text-sm"
                                data-permission="role:delete">
                            删除
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

        // 重新应用权限控制到新渲染的按钮
        if (window.PermissionManager && window.PermissionManager.initialized) {
            window.PermissionManager.applyPermissionsToUI(tbody);
        }
    }

    // ==================== 角色管理操作 ====================

    // 创建角色（使用模态框）
    function createRole() {
        // 重置表单
        const form = document.getElementById('createRoleForm');
        if (form) form.reset();
        
        document.getElementById('roleId').value = '';
        document.getElementById('roleCode').disabled = false; // 新增时可编辑代码
        document.getElementById('createRoleModalTitle').innerHTML = '<i class="fas fa-user-tag mr-2 text-blue-600"></i>新增角色';
        
        // 显示模态框
        document.getElementById('createRoleModal').classList.remove('hidden');
    }
    
    // 编辑角色
    function editRole(roleId) {
        const role = allRoles.find(r => r.id === roleId);
        if (!role) {
            alert('角色不存在');
            return;
        }
        
        if (role.is_system) {
            alert('系统内置角色不能编辑');
            return;
        }
        
        // 填充表单
        document.getElementById('roleId').value = role.id;
        document.getElementById('roleName').value = role.name || '';
        document.getElementById('roleCode').value = role.code || '';
        document.getElementById('roleCode').disabled = true; // 编辑时不能修改代码
        document.getElementById('roleDescription').value = role.description || '';
        document.getElementById('createRoleModalTitle').innerHTML = '<i class="fas fa-edit mr-2 text-blue-600"></i>编辑角色';
        
        // 显示模态框
        document.getElementById('createRoleModal').classList.remove('hidden');
    }

    // 关闭角色创建模态框
    window.closeCreateRoleModal = function() {
        document.getElementById('createRoleModal').classList.add('hidden');
    };

    // 保存角色
    window.saveRole = async function(event) {
        event.preventDefault();
        
        const roleId = document.getElementById('roleId').value;
        const roleName = document.getElementById('roleName').value.trim();
        const roleCode = document.getElementById('roleCode').value.trim();
        const description = document.getElementById('roleDescription').value.trim();
        
        if (!roleName || !roleCode) {
            alert('请填写角色名称和代码');
            return false;
        }
        
        // 验证角色代码格式
        if (!/^[a-z_]+$/.test(roleCode)) {
            alert('角色代码只能包含小写字母和下划线');
            return false;
        }
        
        try {
            let response;
            if (roleId) {
                // 更新角色
                response = await fetch(`/api/roles/${roleId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ name: roleName, description })
                });
            } else {
                // 创建角色
                response = await fetch('/api/roles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ name: roleName, code: roleCode, description })
                });
            }
            
            const result = await response.json();
            if (result.success) {
                if (typeof showNotification === 'function') {
                    showNotification(roleId ? '角色更新成功' : '角色创建成功', 'success');
                } else {
                    alert(roleId ? '角色更新成功！' : '角色创建成功！');
                }
                closeCreateRoleModal();
                loadRoles(); // 重新加载角色列表
            } else {
                alert('操作失败：' + (result.message || '未知错误'));
            }
        } catch (error) {
            console.error('[PermissionAdmin] 保存角色失败:', error);
            alert('操作失败：' + error.message);
        }
        
        return false;
    };
    
    // 停用/启用角色
    async function toggleRoleStatus(roleId) {
        const role = allRoles.find(r => r.id === roleId);
        if (!role) {
            alert('角色不存在');
            return;
        }
        
        if (role.is_system) {
            alert('系统内置角色不能停用');
            return;
        }
        
        const newStatus = role.status === 'active' ? 'inactive' : 'active';
        const action = newStatus === 'active' ? '启用' : '停用';
        
        if (!confirm(`确定要${action}角色"${role.name}"吗？`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/roles/${roleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus })
            });
            
            const result = await response.json();
            if (result.success) {
                if (typeof showNotification === 'function') {
                    showNotification(`角色${action}成功`, 'success');
                } else {
                    alert(`${action}成功`);
                }
                await loadRoles();
            } else {
                alert(`${action}失败：` + (result.message || '未知错误'));
            }
        } catch (error) {
            console.error('[PermissionAdmin] 状态更新失败:', error);
            alert(`${action}失败：` + error.message);
        }
    }

    // 删除角色
    async function deleteRole(roleId) {
        const role = allRoles.find(r => r.id === roleId);
        if (!role) {
            alert('角色不存在');
            return;
        }

        if (role.is_system) {
            alert('系统内置角色不能删除');
            return;
        }

        if (!confirm(`确定要删除角色"${role.name}"吗？\n\n注意：删除后该角色的所有权限配置将被清除！`)) {
            return;
        }

        try {
            const response = await fetch(`/api/roles/${roleId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const result = await response.json();
            if (result.success) {
                if (typeof showNotification === 'function') {
                    showNotification('角色删除成功', 'success');
                } else {
                    alert('删除成功');
                }
                await loadRoles();
            } else {
                alert('删除失败：' + (result.message || '未知错误'));
            }
        } catch (error) {
            console.error('[PermissionAdmin] 删除角色失败:', error);
            alert('删除失败：' + error.message);
        }
    }

    // ==================== 渲染用户列表 ====================

    function renderUsersList() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (allUsers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">暂无用户数据</td></tr>';
            return;
        }

        tbody.innerHTML = allUsers.map(user => `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-4 py-3">${SafeUtils.escapeHTML(user.username)}</td>
                <td class="px-4 py-3">${SafeUtils.escapeHTML(user.name || '-')}</td>
                <td class="px-4 py-3">
                    <code class="text-sm bg-gray-100 px-2 py-1 rounded">${SafeUtils.escapeHTML(user.role || '-')}</code>
                </td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 text-xs rounded ${user.status === 'enabled' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                        ${user.status === 'enabled' ? '启用' : '禁用'}
                    </span>
                </td>
                <td class="px-4 py-3">
                    <button onclick="window.permissionAdmin.assignUserRoles(${user.id})" 
                            class="text-blue-600 hover:underline text-sm"
                            data-permission="user:assign_role">
                        分配角色
                    </button>
                </td>
            </tr>
        `).join('');

        // 重新应用权限控制
        if (window.PermissionManager && window.PermissionManager.initialized) {
            window.PermissionManager.applyPermissionsToUI(tbody);
        }
    }

    // ==================== 编辑角色权限 ====================

    window.permissionAdmin = window.permissionAdmin || {};

    window.permissionAdmin.editRolePermissions = async function(roleId) {
        const role = allRoles.find(r => r.id === roleId);
        if (!role) {
            alert('角色不存在');
            return;
        }

        currentEditingRole = role;

        // 显示模态框
        const modal = document.getElementById('rolePermissionsModal');
        if (!modal) return;

        // 设置标题
        const titleEl = document.getElementById('rolePermissionsModalTitle');
        if (titleEl) {
            titleEl.textContent = `为角色"${role.name}"分配权限`;
        }
        
        // 加载所有权限（如果还没加载）
        if (allPermissions.length === 0) {
            await loadPermissions();
        }

        // 获取角色当前权限
        const currentPermissions = await getRolePermissions(roleId);

        // 渲染权限树
        renderPermissionsTree(currentPermissions);

        // 显示模态框
        modal.classList.remove('hidden');
    };

    async function getRolePermissions(roleId) {
        try {
            const response = await fetch(`/api/role-permissions/${roleId}`, {
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success && result.data) {
                return result.data.map(p => p.code);
            }
        } catch (error) {
            console.error('[PermissionAdmin] 获取角色权限失败:', error);
        }
        return [];
    }

    function renderPermissionsTree(currentPermissions) {
        const container = document.getElementById('permissionsTreeContainer');
        if (!container) return;

        // 按模块分组（从code中提取模块名）
        const grouped = {};
        allPermissions.forEach(perm => {
            // 从权限代码中提取模块名，如 "transaction:view" -> "transaction"
            const moduleName = perm.code.split(':')[0] || 'other';
            if (!grouped[moduleName]) {
                grouped[moduleName] = [];
            }
            grouped[moduleName].push(perm);
        });

        // 模块名称映射
        const moduleNames = {
            'menu': '菜单访问',
            'dashboard': '仪表盘',
            'transaction': '流水管理',
            'order': '订单管理',
            'customer': '客户管理',
            'service': '服务管理',
            'inventory': '库存管理',
            'report': '报表统计',
            'report_sales': '销售报表',
            'report_financial': '财务报表',
            'report_performance': '业绩报表',
            'report_custom': '自定义报表',
            'personnel': '人员管理',
            'role': '角色管理',
            'permission': '权限管理',
            'system': '系统设置',
            'data': '数据权限',
            'other': '其他权限'
        };

        // 模块图标映射
        const moduleIcons = {
            'menu': 'fas fa-bars',
            'dashboard': 'fas fa-tachometer-alt',
            'transaction': 'fas fa-exchange-alt',
            'order': 'fas fa-shopping-cart',
            'customer': 'fas fa-users',
            'service': 'fas fa-concierge-bell',
            'inventory': 'fas fa-boxes',
            'report': 'fas fa-chart-bar',
            'report_sales': 'fas fa-chart-line',
            'report_financial': 'fas fa-money-bill-wave',
            'report_performance': 'fas fa-trophy',
            'report_custom': 'fas fa-sliders-h',
            'personnel': 'fas fa-user-cog',
            'role': 'fas fa-user-tag',
            'permission': 'fas fa-shield-alt',
            'system': 'fas fa-cog',
            'data': 'fas fa-database',
            'other': 'fas fa-ellipsis-h'
        };

        let html = `
            <div class="mb-4 flex justify-between items-center">
                <div class="flex space-x-2">
                    <button type="button" onclick="window.permissionAdmin.selectAllPermissions()" 
                            class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                        全选
                    </button>
                    <button type="button" onclick="window.permissionAdmin.clearAllPermissions()" 
                            class="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                        清空
                    </button>
                </div>
                <span class="text-xs text-gray-500">
                    已选 <span id="selectedPermCount">0</span> 项
                </span>
            </div>
        `;
        
        // 按模块排序并渲染
        const sortedModules = Object.keys(grouped).sort((a, b) => {
            const order = [
                'menu', 'dashboard', 'transaction', 'order', 'customer', 
                'service', 'inventory', 'report', 'report_sales', 'report_financial', 
                'report_performance', 'report_custom', 'personnel', 'role', 
                'permission', 'system', 'data', 'other'
            ];
            return order.indexOf(a) - order.indexOf(b);
        });
        
        sortedModules.forEach(moduleName => {
            const permissions = grouped[moduleName];
            const icon = moduleIcons[moduleName] || 'fas fa-folder';
            const displayName = moduleNames[moduleName] || moduleName;
            
            html += `
                <div class="mb-4 border rounded-lg overflow-hidden">
                    <div class="bg-gray-50 px-4 py-2 flex items-center justify-between cursor-pointer" 
                         onclick="togglePermissionGroup('${moduleName}')">
                        <div class="flex items-center space-x-2">
                            <i class="${icon} text-gray-500 w-5"></i>
                            <span class="font-medium text-gray-700">${displayName}</span>
                            <span class="text-xs text-gray-400">(${permissions.length}项)</span>
                        </div>
                        <div class="flex items-center space-x-3">
                            <label class="flex items-center text-xs text-gray-500" onclick="event.stopPropagation()">
                                <input type="checkbox" class="module-checkbox mr-1" data-module="${moduleName}"
                                       onchange="toggleModulePermissions('${moduleName}', this.checked)">
                                全选此模块
                            </label>
                            <i class="fas fa-chevron-down text-gray-400 transform transition-transform" id="icon-${moduleName}"></i>
                        </div>
                    </div>
                    <div class="p-3 grid grid-cols-2 gap-2" id="perms-${moduleName}">
                        ${permissions.map(perm => {
                            const isChecked = currentPermissions.includes(perm.code);
                            return `
                                <label class="flex items-center space-x-2 p-2 hover:bg-blue-50 rounded cursor-pointer border border-transparent hover:border-blue-200">
                                    <input type="checkbox" 
                                           class="perm-checkbox w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                                           value="${perm.code}"
                                           data-module="${moduleName}"
                                           ${isChecked ? 'checked' : ''}
                                           onchange="updatePermissionCount()">
                                    <div class="flex-1 min-w-0">
                                        <div class="text-sm font-medium text-gray-800 truncate">${SafeUtils.escapeHTML(perm.name)}</div>
                                        <div class="text-xs text-gray-500 truncate" title="${SafeUtils.escapeHTML(perm.code)}">
                                            ${perm.description ? SafeUtils.escapeHTML(perm.description) : perm.code}
                                        </div>
                                    </div>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || '<p class="text-gray-500 text-center py-8">暂无可分配权限</p>';
        
        // 更新选中计数
        updatePermissionCount();
    }
    
    // 全局辅助函数
    window.togglePermissionGroup = function(moduleName) {
        const container = document.getElementById(`perms-${moduleName}`);
        const icon = document.getElementById(`icon-${moduleName}`);
        if (container) {
            container.classList.toggle('hidden');
            if (icon) {
                icon.classList.toggle('rotate-180');
            }
        }
    };
    
    window.toggleModulePermissions = function(moduleName, checked) {
        const checkboxes = document.querySelectorAll(`.perm-checkbox[data-module="${moduleName}"]`);
        checkboxes.forEach(cb => cb.checked = checked);
        updatePermissionCount();
    };
    
    window.updatePermissionCount = function() {
        const count = document.querySelectorAll('.perm-checkbox:checked').length;
        const countEl = document.getElementById('selectedPermCount');
        if (countEl) countEl.textContent = count;
    };
    
    window.permissionAdmin.selectAllPermissions = function() {
        document.querySelectorAll('.perm-checkbox').forEach(cb => cb.checked = true);
        document.querySelectorAll('.module-checkbox').forEach(cb => cb.checked = true);
        updatePermissionCount();
    };
    
    window.permissionAdmin.clearAllPermissions = function() {
        document.querySelectorAll('.perm-checkbox').forEach(cb => cb.checked = false);
        document.querySelectorAll('.module-checkbox').forEach(cb => cb.checked = false);
        updatePermissionCount();
    };

    window.permissionAdmin.saveRolePermissions = async function() {
        if (!currentEditingRole) return;

        const checkboxes = document.querySelectorAll('.perm-checkbox:checked');
        const permissionCodes = Array.from(checkboxes).map(cb => cb.value);

        try {
            const response = await fetch('/api/role-permissions/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    role_id: currentEditingRole.id,
                    permission_codes: permissionCodes
                })
            });

            const result = await response.json();

            if (result.success) {
                if (typeof showNotification === 'function') {
                    showNotification('权限分配成功', 'success');
                } else {
                    alert('权限分配成功！');
                }
                closeRolePermissionsModal();
            } else {
                alert('权限分配失败：' + result.message);
            }
        } catch (error) {
            console.error('[PermissionAdmin] ❌ 保存权限失败:', error);
            alert('保存失败：' + error.message);
        }
    };

    function closeRolePermissionsModal() {
        const modal = document.getElementById('rolePermissionsModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        currentEditingRole = null;
    }

    // ==================== 分配用户角色 ====================

    // 分配用户角色（简化版）
    window.permissionAdmin.assignUserRoles = async function(userId, userName) {
        try {
            // 加载所有角色
            if (allRoles.length === 0) {
                await loadRoles();
            }

            // 获取用户当前角色
            const response = await fetch(`/api/user-roles/${userId}`, {
                credentials: 'include'
            });
            const result = await response.json();
            const userRoles = result.success ? result.data : [];
            const userRoleIds = userRoles.map(r => r.id);

            // 构建角色选择列表
            let message = `为用户"${userName}"分配角色：\n\n`;
            message += '当前角色：' + (userRoles.length ? userRoles.map(r => r.name).join('、') : '未分配') + '\n\n';
            message += '可用角色列表：\n';
            allRoles.forEach((role, index) => {
                const checked = userRoleIds.includes(role.id) ? '[√]' : '[ ]';
                message += `${index + 1}. ${checked} ${role.name} (${role.code})\n`;
            });
            message += '\n请输入要分配的角色编号（多个用逗号分隔，如：1,2,3）：';

            const input = prompt(message);
            if (input === null) return; // 用户取消

            // 解析输入
            const selectedIndexes = input.trim() ? input.split(',').map(s => parseInt(s.trim()) - 1) : [];
            const selectedRoleIds = selectedIndexes
                .filter(i => i >= 0 && i < allRoles.length)
                .map(i => allRoles[i].id);

            // 调用API分配角色
            const assignResponse = await fetch('/api/user-roles/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    user_id: userId,
                    role_ids: selectedRoleIds
                })
            });

            const assignResult = await assignResponse.json();
            if (assignResult.success) {
                alert('角色分配成功！');
                // 如果在人员列表页面，刷新列表
                if (typeof window.switchPersonnelTab === 'function') {
                    window.switchPersonnelTab('personnel-list');
                }
            } else {
                alert('分配失败：' + (assignResult.message || '未知错误'));
            }
        } catch (error) {
            console.error('[PermissionAdmin] 分配用户角色失败:', error);
            alert('分配失败：' + error.message);
        }
    };

    // ==================== 权限树相关 ====================

    console.log('[PermissionAdmin] 📦 权限管理模块已加载 v1.0.1');

})();
