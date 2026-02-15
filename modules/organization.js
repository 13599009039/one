// 组织架构管理模块 - 人员、部门、团队、岗位独立页面
// 版本: v1.1.0 (增加邀请制、搜索框、角色设置)

// ============ 人员搜索过滤 ============
let allPersonnelData = []; // 缓存人员数据用于搜索

window.filterPersonnelList = function() {
    const searchInput = document.getElementById('personnelSearchInput');
    const keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const tbody = document.getElementById('usersTableBody');
    
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (!keyword || text.includes(keyword)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
};

// ============ 邀请成员功能 ============
window.openInviteModal = async function() {
    let modal = document.getElementById('inviteModal');
    if (!modal) {
        createInviteModal();
        modal = document.getElementById('inviteModal');
    }
    
    // 重置表单
    const resultArea = document.getElementById('inviteResult');
    if (resultArea) resultArea.classList.add('hidden');
    
    // 加载可选角色
    await loadInviteRoleOptions();
    
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

async function loadInviteRoleOptions() {
    try {
        const response = await fetch('/api/roles', { credentials: 'include' });
        const result = await response.json();
        
        if (result.success) {
            const select = document.getElementById('invitePresetRole');
            if (select) {
                select.innerHTML = '<option value="">不指定角色</option>' + 
                    result.data.filter(r => r.status === 'active').map(r => 
                        `<option value="${r.id}">${r.name}</option>`
                    ).join('');
            }
        }
    } catch (error) {
        console.error('加载角色列表失败:', error);
    }
}

function createInviteModal() {
    const modal = document.createElement('div');
    modal.id = 'inviteModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div class="flex items-center justify-between p-4 border-b">
                <h3 class="text-lg font-semibold text-gray-900">
                    <i class="fas fa-user-plus mr-2 text-blue-600"></i>邀请成员
                </h3>
                <button onclick="closeInviteModal()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div class="p-4">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">预设角色（可选）</label>
                    <select id="invitePresetRole" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="">不指定角色</option>
                    </select>
                    <p class="text-xs text-gray-500 mt-1">新成员注册后将自动分配此角色</p>
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">有效期</label>
                    <select id="inviteExpireDays" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="1">1天</option>
                        <option value="3">3天</option>
                        <option value="7" selected>7天</option>
                        <option value="14">14天</option>
                        <option value="30">30天</option>
                    </select>
                </div>
                
                <button onclick="generateInviteLink()" class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
                    <i class="fas fa-link mr-2"></i>生成邀请链接
                </button>
                
                <!-- 邀请结果区域 -->
                <div id="inviteResult" class="mt-4 hidden">
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p class="text-sm text-green-800 mb-2">
                            <i class="fas fa-check-circle mr-1"></i>邀请链接已生成
                        </p>
                        <div class="flex items-center space-x-2">
                            <input type="text" id="inviteLinkUrl" readonly
                                   class="flex-1 px-3 py-2 bg-white border rounded text-sm text-gray-700">
                            <button onclick="copyInviteLink()" class="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                        <p class="text-xs text-gray-500 mt-2" id="inviteExpireInfo"></p>
                    </div>
                </div>
            </div>
            <div class="flex justify-end p-4 border-t">
                <button onclick="closeInviteModal()" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">关闭</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.closeInviteModal = function() {
    const modal = document.getElementById('inviteModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

window.generateInviteLink = async function() {
    try {
        const roleId = document.getElementById('invitePresetRole')?.value || null;
        const expireDays = document.getElementById('inviteExpireDays')?.value || 7;
        
        const response = await fetch('/api/invite/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                role_id: roleId ? parseInt(roleId) : null,
                expire_days: parseInt(expireDays)
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 显示结果区域
            const resultArea = document.getElementById('inviteResult');
            if (resultArea) resultArea.classList.remove('hidden');
            
            // 设置邀请链接
            const fullUrl = window.location.origin + result.data.invite_url;
            const linkInput = document.getElementById('inviteLinkUrl');
            if (linkInput) linkInput.value = fullUrl;
            
            // 显示过期时间
            const expireInfo = document.getElementById('inviteExpireInfo');
            if (expireInfo) {
                const expireDate = new Date(result.data.expire_at);
                expireInfo.textContent = `有效期至：${expireDate.toLocaleString('zh-CN')}`;
            }
            
            showNotification('邀请链接已生成', 'success');
        } else {
            showNotification(result.message || '生成失败', 'error');
        }
    } catch (error) {
        console.error('生成邀请链接失败:', error);
        showNotification('生成邀请链接失败', 'error');
    }
};

window.copyInviteLink = function() {
    const linkInput = document.getElementById('inviteLinkUrl');
    if (linkInput) {
        linkInput.select();
        document.execCommand('copy');
        showNotification('邀请链接已复制到剪贴板', 'success');
    }
};

// ============ 人员设置页面（含角色管理标签页）============
function initPersonnelPage() {
    // 默认显示人员列表
    switchPersonnelTab('personnel-list');
}

// 切换人员设置标签页
window.switchPersonnelTab = function(tabName) {
    console.log('[Personnel] 切换标签页:', tabName);
    
    // 更新标签按钮样式
    document.querySelectorAll('.personnel-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.remove('border-transparent', 'text-gray-500');
            btn.classList.add('border-blue-500', 'text-blue-600');
        } else {
            btn.classList.remove('border-blue-500', 'text-blue-600');
            btn.classList.add('border-transparent', 'text-gray-500');
        }
    });
    
    // 显示对应的标签页内容
    document.querySelectorAll('.personnel-tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(`personnel-tab-${tabName}`).classList.remove('hidden');
    
    // 加载对应数据
    if (tabName === 'personnel-list') {
        renderPersonnelList();
    } else if (tabName === 'roles') {
        // 调用权限管理模块加载角色列表
        if (typeof window.permissionAdmin !== 'undefined' && window.permissionAdmin.loadRoles) {
            window.permissionAdmin.loadRoles();
        }
    }
};

// 缓存所有用户数据（用于回收站）
let allUsersCache = [];
let disabledUsersCache = [];

async function renderPersonnelList() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    let users = [];
    let departments = [];
    let teams = [];
    let positions = [];
    
    // 使用 fetch 加载数据
    try {
        const [usersRes, deptRes, teamRes, posRes] = await Promise.all([
            fetch('/api/users', { credentials: 'include' }),
            fetch('/api/departments', { credentials: 'include' }),
            fetch('/api/teams', { credentials: 'include' }),
            fetch('/api/positions', { credentials: 'include' })
        ]);
        
        const [usersResult, deptResult, teamResult, posResult] = await Promise.all([
            usersRes.json(),
            deptRes.json(),
            teamRes.json(),
            posRes.json()
        ]);
        
        if (usersResult.success) {
            allUsersCache = usersResult.data || [];
            // 分离启用和禁用的用户
            users = allUsersCache.filter(u => u.status === 'enabled');
            disabledUsersCache = allUsersCache.filter(u => u.status === 'disabled');
            // 更新回收站计数
            updateRecycleBinCount();
        } else {
            throw new Error('API返回失败');
        }
        
        if (deptResult.success) {
            departments = deptResult.data || [];
        }
        
        if (teamResult.success) {
            teams = teamResult.data || [];
        }
        
        if (posResult.success) {
            positions = posResult.data || [];
        }
    } catch (error) {
        console.error('❌ API 加载失败:', error);
        showNotification('加载用户列表失败，请刷新页面', 'error');
    }
    
    // 缓存部门、团队、岗位数据供回收站使用
    window._personnelDepts = departments;
    window._personnelTeams = teams;
    window._personnelPositions = positions;
    
    // 加载用户角色信息
    const userRolesMap = await loadUserRoles(users.map(u => u.id));
    
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-8 text-gray-500">暂无在职人员</td></tr>';
        return;
    }
    
    users.forEach(user => {
        const dept = departments.find(d => d.id === user.department_id);
        const pos = positions.find(p => p.id === user.position_id);
        
        // 联系方式显示
        const contactInfo = [];
        if (user.phone) contactInfo.push(`<i class="fas fa-phone text-gray-400 mr-1"></i>${user.phone}`);
        if (user.email) contactInfo.push(`<i class="fas fa-envelope text-gray-400 mr-1"></i>${user.email}`);
        const contactHtml = contactInfo.length > 0 ? contactInfo.join('<br>') : '<span class="text-gray-400">-</span>';
        
        // ✅ 部门/团队显示（支持多团队）
        const deptTeamInfo = [];
        if (dept) deptTeamInfo.push(dept.name);
        // 显示用户的所有团队（一人多团队）
        if (user.teams && user.teams.length > 0) {
            const teamNames = user.teams.map(t => {
                const isPrimary = t.is_primary ? '★' : '';
                return `${isPrimary}${t.team_name}`;
            }).join(', ');
            deptTeamInfo.push(teamNames);
        } else {
            // 兼容旧数据：使用team_id
            const team = teams.find(t => t.id === user.team_id);
            if (team) deptTeamInfo.push(team.name);
        }
        const deptTeamHtml = deptTeamInfo.length > 0 ? deptTeamInfo.join(' / ') : '<span class="text-gray-400">未分配</span>';
        
        // 岗位显示（优先显示岗位，其次role）
        const positionHtml = pos ? pos.name : (user.role ? getRoleText(user.role) : '-');
        
        // 角色显示
        const userRoles = userRolesMap[user.id] || [];
        const rolesHtml = userRoles.length > 0 
            ? userRoles.map(r => `<span class="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">${r.name}</span>`).join(' ')
            : '<span class="text-gray-400 text-xs">未分配</span>';
        
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';
        tr.innerHTML = `
            <td class="px-3 py-3 text-sm text-gray-900 font-medium">${user.name || '-'}</td>
            <td class="px-3 py-3 text-sm text-gray-500">${user.alias || '-'}</td>
            <td class="px-3 py-3 text-sm text-gray-500">${user.username || '-'}</td>
            <td class="px-3 py-3 text-xs text-gray-500">${contactHtml}</td>
            <td class="px-3 py-3 text-sm text-gray-500">${positionHtml}</td>
            <td class="px-3 py-3 text-sm text-gray-500">${deptTeamHtml}</td>
            <td class="px-3 py-3 text-sm">${rolesHtml}</td>
            <td class="px-3 py-3 text-center">
                <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">启用</span>
            </td>
            <td class="px-3 py-3 text-center">
                <button onclick="openUserModal(${user.id})" class="text-blue-600 hover:text-blue-800 text-sm mr-3">
                    编辑
                </button>
                <button onclick="openAssignRoleModal(${user.id}, '${user.name}')" class="text-purple-600 hover:text-purple-800 text-sm mr-3">
                    分配角色
                </button>
                <button onclick="moveToRecycleBin(${user.id}, '${user.name}')" class="text-orange-600 hover:text-orange-800 text-sm">
                    停用
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 更新回收站计数
function updateRecycleBinCount() {
    const countEl = document.getElementById('recycleBinCount');
    if (countEl) {
        const count = disabledUsersCache.length;
        if (count > 0) {
            countEl.textContent = count;
            countEl.classList.remove('hidden');
        } else {
            countEl.classList.add('hidden');
        }
    }
}

// 移动到回收站（停用人员）
window.moveToRecycleBin = async function(userId, userName) {
    if (!confirm(`确定要停用"${userName}"吗？\n停用后该人员将移入回收站。`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: 'disabled' })
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification('人员已停用，已移入回收站', 'success');
            renderPersonnelList();
        } else {
            showNotification(result.message || '停用失败', 'error');
        }
    } catch (error) {
        console.error('停用人员失败:', error);
        showNotification('停用失败', 'error');
    }
};

// 从回收站恢复
window.restoreFromRecycleBin = async function(userId, userName) {
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: 'enabled' })
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification(`"${userName}"已恢复`, 'success');
            renderPersonnelList();
            // 刷新回收站列表
            renderRecycleBinList();
        } else {
            showNotification(result.message || '恢复失败', 'error');
        }
    } catch (error) {
        console.error('恢复人员失败:', error);
        showNotification('恢复失败', 'error');
    }
};

// 打开回收站模态框
window.openRecycleBinModal = function() {
    let modal = document.getElementById('recycleBinModal');
    if (!modal) {
        createRecycleBinModal();
        modal = document.getElementById('recycleBinModal');
    }
    
    renderRecycleBinList();
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

// 关闭回收站模态框
window.closeRecycleBinModal = function() {
    const modal = document.getElementById('recycleBinModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

// 创建回收站模态框
function createRecycleBinModal() {
    const modal = document.createElement('div');
    modal.id = 'recycleBinModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div class="flex items-center justify-between p-4 border-b bg-gray-50">
                <h3 class="text-lg font-semibold text-gray-900">
                    <i class="fas fa-trash-alt mr-2 text-gray-500"></i>人员回收站
                </h3>
                <button onclick="closeRecycleBinModal()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div class="p-4 flex-1 overflow-y-auto">
                <div class="mb-3 text-sm text-gray-500">
                    <i class="fas fa-info-circle mr-1"></i>
                    回收站中的人员已被停用，可以随时恢复启用。
                </div>
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">姓名</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">用户名</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">联系方式</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">部门/团队</th>
                            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500">操作</th>
                        </tr>
                    </thead>
                    <tbody id="recycleBinTableBody" class="divide-y divide-gray-200"></tbody>
                </table>
            </div>
            <div class="flex justify-end p-4 border-t bg-gray-50">
                <button onclick="closeRecycleBinModal()" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100">关闭</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// 渲染回收站列表
function renderRecycleBinList() {
    const tbody = document.getElementById('recycleBinTableBody');
    if (!tbody) return;
    
    const departments = window._personnelDepts || [];
    const teams = window._personnelTeams || [];
    
    if (disabledUsersCache.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">回收站为空</td></tr>';
        return;
    }
    
    tbody.innerHTML = disabledUsersCache.map(user => {
        const dept = departments.find(d => d.id === user.department_id);
        const team = teams.find(t => t.id === user.team_id);
        const deptTeamHtml = [dept?.name, team?.name].filter(Boolean).join(' / ') || '-';
        const contactHtml = user.phone || user.email || '-';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-900">${user.name || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-500">${user.username || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-500">${contactHtml}</td>
                <td class="px-4 py-3 text-sm text-gray-500">${deptTeamHtml}</td>
                <td class="px-4 py-3 text-center">
                    <button onclick="restoreFromRecycleBin(${user.id}, '${user.name}')" 
                            class="text-green-600 hover:text-green-800 text-sm mr-3">
                        <i class="fas fa-undo mr-1"></i>恢复
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// 加载用户角色信息
async function loadUserRoles(userIds) {
    const rolesMap = {};
    
    try {
        // 批量查询用户角色
        for (const userId of userIds) {
            const response = await fetch(`/api/user-roles/${userId}`, {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success && result.data) {
                rolesMap[userId] = result.data;
            } else {
                rolesMap[userId] = [];
            }
        }
    } catch (error) {
        console.error('[Personnel] 加载用户角色失败:', error);
    }
    
    return rolesMap;
}

// 打开角色分配模态框
window.openAssignRoleModal = async function(userId, userName) {
    console.log('[Personnel] 打开角色分配模态框:', userId, userName);
    
    // 调用权限管理模块的函数
    if (typeof window.permissionAdmin !== 'undefined' && window.permissionAdmin.assignUserRoles) {
        await window.permissionAdmin.assignUserRoles(userId, userName);
    } else {
        alert('权限管理模块未加载，请刷新页面');
    }
};

// 角色名称转换
function getRoleText(role) {
    const roleMap = {
        'super_admin': '超级管理员',
        'admin': '管理员',
        'user': '普通用户',
        'operation': '运营人员',
        'financial_entry': '财务录入',
        'financial_view': '财务查看',
        'financial_audit': '财务审核'
    };
    return roleMap[role] || role;
}

// ============ 部门设置页面 ============
function initDepartmentPage() {
    renderDepartmentsList();
}

async function renderDepartmentsList() {
    const tbody = document.getElementById('departmentsTableBody');
    if (!tbody) return;
    
    let departments = [];
    let users = [];
    
    // 使用 fetch 加载部门和用户数据
    try {
        const [deptRes, userRes] = await Promise.all([
            fetch('/api/departments', { credentials: 'include' }),
            fetch('/api/users', { credentials: 'include' })
        ]);
        
        const [deptResult, userResult] = await Promise.all([
            deptRes.json(),
            userRes.json()
        ]);
        
        if (deptResult.success) {
            departments = deptResult.data || [];
        }
        if (userResult.success) {
            users = userResult.data || [];
        }
        
        if (!deptResult.success || !userResult.success) {
            throw new Error('API返回失败');
        }
    } catch (error) {
        console.error('❌ API 加载失败:', error);
        showNotification('加载部门列表失败，请刷新页面', 'error');
    }
    
    tbody.innerHTML = '';
    
    if (departments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-500">暂无部门数据</td></tr>';
        return;
    }
    
    departments.forEach(dept => {
        const manager = users.find(u => u.id === dept.manager_id);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${dept.name || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-500">${manager ? manager.name : '-'}</td>
            <td class="px-4 py-3 text-center">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${dept.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${dept.status === 'active' ? '启用' : '禁用'}
                </span>
            </td>
            <td class="px-4 py-3 text-center">
                <button onclick="openDepartmentModal(${dept.id})" class="text-blue-600 hover:text-blue-800 text-sm mr-2">编辑</button>
                <button onclick="deleteDepartmentItem(${dept.id})" class="text-red-600 hover:text-red-800 text-sm">删除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ============ 团队设置页面 ============
function initTeamPage() {
    renderTeamsList();
}

async function renderTeamsList() {
    const tbody = document.getElementById('teamsTableBody');
    if (!tbody) return;
    
    let teams = [];
    let departments = [];
    let users = [];
    
    // 使用 fetch 加载数据
    try {
        const [teamRes, deptRes, userRes] = await Promise.all([
            fetch('/api/teams', { credentials: 'include' }),
            fetch('/api/departments', { credentials: 'include' }),
            fetch('/api/users', { credentials: 'include' })
        ]);
        
        const [teamResult, deptResult, userResult] = await Promise.all([
            teamRes.json(),
            deptRes.json(),
            userRes.json()
        ]);
        
        if (teamResult.success) {
            teams = teamResult.data || [];
        }
        if (deptResult.success) {
            departments = deptResult.data || [];
        }
        if (userResult.success) {
            users = userResult.data || [];
        }
        
        if (!teamResult.success || !deptResult.success || !userResult.success) {
            throw new Error('API返回失败');
        }
    } catch (error) {
        console.error('❌ API 加载失败:', error);
        showNotification('加载团队列表失败，请刷新页面', 'error');
    }
    
    tbody.innerHTML = '';
    
    if (teams.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">暂无团队数据</td></tr>';
        return;
    }
    
    teams.forEach(team => {
        const dept = departments.find(d => d.id === team.department_id);
        const leader = users.find(u => u.id === team.leader_id);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${team.name || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-500">${dept ? dept.name : '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-500">${leader ? leader.name : '-'}</td>
            <td class="px-4 py-3 text-center text-sm text-gray-500">${team.members ? team.members.length : 0}</td>
            <td class="px-4 py-3 text-center">
                <button onclick="openTeamModal(${team.id})" class="text-blue-600 hover:text-blue-800 text-sm mr-2">编辑</button>
                <button onclick="deleteTeamItem(${team.id})" class="text-red-600 hover:text-red-800 text-sm">删除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ============ 岗位设置页面 ============
function initPositionPage() {
    renderPositionsList();
}

async function renderPositionsList() {
    const tbody = document.getElementById('positionsTableBody');
    if (!tbody) return;
    
    let positions = [];
    let departments = [];
    
    // 使用 fetch 加载数据
    try {
        const [posRes, deptRes] = await Promise.all([
            fetch('/api/positions', { credentials: 'include' }),
            fetch('/api/departments', { credentials: 'include' })
        ]);
        
        const [posResult, deptResult] = await Promise.all([
            posRes.json(),
            deptRes.json()
        ]);
        
        if (posResult.success) {
            positions = posResult.data || [];
        }
        if (deptResult.success) {
            departments = deptResult.data || [];
        }
        
        if (!posResult.success || !deptResult.success) {
            throw new Error('API返回失败');
        }
    } catch (error) {
        console.error('❌ API 加载失败:', error);
        showNotification('加载岗位列表失败，请刷新页面', 'error');
    }
    
    tbody.innerHTML = '';
    
    if (positions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">暂无岗位数据</td></tr>';
        return;
    }
    
    positions.forEach(pos => {
        const dept = departments.find(d => d.id === pos.department_id);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${pos.name || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-500">${dept ? dept.name : '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-500">${pos.description || '-'}</td>
            <td class="px-4 py-3 text-center">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${pos.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${pos.status === 'active' ? '启用' : '禁用'}
                </span>
            </td>
            <td class="px-4 py-3 text-center">
                <button onclick="openPositionModal(${pos.id})" class="text-blue-600 hover:text-blue-800 text-sm mr-2">编辑</button>
                <button onclick="deletePositionItem(${pos.id})" class="text-red-600 hover:text-red-800 text-sm">删除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ============ 模态框操作 ============
let currentEditingUser = null;
let currentEditingDepartment = null;
let currentEditingTeam = null;
let currentEditingPosition = null;

// 人员模态框
async function openUserModal(id = null) {
    currentEditingUser = id;
    let modal = document.getElementById('userModal');
    if (!modal) {
        createUserModal();
        modal = document.getElementById('userModal');
    }
    
    const form = document.getElementById('userForm');
    if (form) form.reset();
    
    // 重置角色和超级管理员复选框
    const roleSelect = document.getElementById('userRoleSelect');
    const superAdminCheckbox = document.getElementById('userIsSuperAdmin');
    if (roleSelect) roleSelect.value = '';
    if (superAdminCheckbox) superAdminCheckbox.checked = false;
    
    // 更新标题
    const titleEl = document.getElementById('userModalTitle');
    if (titleEl) {
        titleEl.textContent = id ? '编辑人员' : '新增人员';
    }
    
    // 加载部门、团队、岗位、角色选项
    await loadUserFormOptions();
    
    // 显示/隐藏密码区域
    const passwordSection = document.getElementById('passwordSection');
    const passwordRequiredMark = document.getElementById('passwordRequiredMark');
    if (id) {
        // 编辑模式，密码可选
        if (passwordSection) passwordSection.style.display = 'block';
        if (passwordRequiredMark) passwordRequiredMark.style.display = 'none';
        document.getElementById('userPassword').removeAttribute('required');
        
        // 使用 fetch 加载用户数据
        try {
            const [usersResponse, rolesResponse, teamsResponse, areasResponse] = await Promise.all([
                fetch('/api/users', { credentials: 'include' }),
                fetch(`/api/user-roles/${id}`, { credentials: 'include' }),
                fetch(`/api/users/${id}/teams`, { credentials: 'include' }),  // ✅ 加载用户团队
                fetch(`/api/users/${id}/areas`, { credentials: 'include' })   // ✅ 加载用户区域
            ]);
            
            const [usersResult, rolesResult, teamsResult, areasResult] = await Promise.all([
                usersResponse.json(),
                rolesResponse.json(),
                teamsResponse.json(),
                areasResponse.json()
            ]);
            
            if (usersResult.success) {
                const user = usersResult.data.find(u => u.id === id);
                if (user) {
                    document.getElementById('userName').value = user.name || '';
                    document.getElementById('userAlias').value = user.alias || '';
                    document.getElementById('userUsername').value = user.username || '';
                    document.getElementById('userPhone').value = user.phone || '';
                    document.getElementById('userEmail').value = user.email || '';
                    document.getElementById('userPosition').value = user.position_id || '';
                    document.getElementById('userDepartment').value = user.department_id || '';
                    document.getElementById('userProject').value = user.project_id || '';
                    document.getElementById('userPassword').value = '';
                    document.getElementById('userPassword').placeholder = '留空则不修改密码';
                    
                    // ✅ 设置团队多选（使用新的user_teams数据）
                    if (teamsResult.success && teamsResult.data?.teams) {
                        setUserTeamsChecked(teamsResult.data.teams);
                    } else if (user.teams && user.teams.length > 0) {
                        // 兼容：使用用户数据中的teams
                        setUserTeamsChecked(user.teams);
                    }
                    
                    // ✅ 设置区域多选（使用新的user_areas数据）
                    if (areasResult.success && areasResult.data?.areas) {
                        setUserAreasChecked(areasResult.data.areas);
                    } else if (user.areas && user.areas.length > 0) {
                        // 兼容：使用用户数据中的areas
                        setUserAreasChecked(user.areas);
                    }
                    
                    // 设置超级管理员复选框
                    const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
                    if (superAdminCheckbox) superAdminCheckbox.checked = isSuperAdmin;
                } else {
                    showNotification('用户不存在', 'error');
                }
            }
            
            // 加载用户角色
            if (rolesResult.success && rolesResult.data && rolesResult.data.length > 0) {
                // 取第一个角色作为主要角色
                const primaryRole = rolesResult.data[0];
                if (roleSelect) roleSelect.value = primaryRole.id;
            }
        } catch (error) {
            console.error('加载用户数据失败:', error);
            showNotification('加载用户数据失败', 'error');
        }
    } else {
        // 新增模式，密码必填
        if (passwordSection) passwordSection.style.display = 'block';
        if (passwordRequiredMark) passwordRequiredMark.style.display = 'inline';
        document.getElementById('userPassword').setAttribute('required', 'required');
        document.getElementById('userPassword').placeholder = '请输入密码';
    }
    
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

// ✅ 更新主团队下拉框（根据已选择的团队）
function updatePrimaryTeamOptions() {
    const checkboxes = document.querySelectorAll('.team-checkbox:checked');
    const primaryTeamSelect = document.getElementById('userPrimaryTeam');
    
    if (!primaryTeamSelect) return;
    
    const selectedTeams = Array.from(checkboxes).map(cb => ({
        id: cb.value,
        name: cb.dataset.name
    }));
    
    if (selectedTeams.length === 0) {
        primaryTeamSelect.innerHTML = '<option value="">请先选择团队</option>';
    } else if (selectedTeams.length === 1) {
        // 只有一个团队，自动设为主团队
        primaryTeamSelect.innerHTML = `<option value="${selectedTeams[0].id}" selected>${selectedTeams[0].name}</option>`;
    } else {
        // 多个团队，允许选择主团队
        const currentValue = primaryTeamSelect.value;
        primaryTeamSelect.innerHTML = '<option value="">请选择主团队</option>' +
            selectedTeams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        // 保持原选择（如果仍在列表中）
        if (selectedTeams.find(t => t.id === currentValue)) {
            primaryTeamSelect.value = currentValue;
        }
    }
}

// ✅ 设置用户团队多选状态
function setUserTeamsChecked(userTeams) {
    const checkboxes = document.querySelectorAll('.team-checkbox');
    checkboxes.forEach(cb => {
        const isSelected = userTeams.some(ut => ut.team_id == cb.value);
        cb.checked = isSelected;
    });
    
    // 更新主团队下拉框
    updatePrimaryTeamOptions();
    
    // 设置主团队选中
    const primaryTeam = userTeams.find(ut => ut.is_primary);
    const primaryTeamSelect = document.getElementById('userPrimaryTeam');
    if (primaryTeamSelect && primaryTeam) {
        primaryTeamSelect.value = primaryTeam.team_id;
    }
}

// ✅ 更新主区域下拉框（根据已选择的区域）
function updatePrimaryAreaOptions() {
    const checkboxes = document.querySelectorAll('.area-checkbox:checked');
    const primaryAreaSelect = document.getElementById('userPrimaryArea');
    
    if (!primaryAreaSelect) return;
    
    const selectedAreas = Array.from(checkboxes).map(cb => ({
        id: cb.value,
        name: cb.dataset.name
    }));
    
    if (selectedAreas.length === 0) {
        primaryAreaSelect.innerHTML = '<option value="">请先选择区域</option>';
    } else if (selectedAreas.length === 1) {
        // 只有一个区域，自动设为主区域
        primaryAreaSelect.innerHTML = `<option value="${selectedAreas[0].id}" selected>${selectedAreas[0].name}</option>`;
    } else {
        // 多个区域，允许选择主区域
        const currentValue = primaryAreaSelect.value;
        primaryAreaSelect.innerHTML = '<option value="">请选择主区域</option>' +
            selectedAreas.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
        // 保持原选择（如果仍在列表中）
        if (selectedAreas.find(a => a.id === currentValue)) {
            primaryAreaSelect.value = currentValue;
        }
    }
}

// ✅ 设置用户区域多选状态
function setUserAreasChecked(userAreas) {
    const checkboxes = document.querySelectorAll('.area-checkbox');
    checkboxes.forEach(cb => {
        const isSelected = userAreas.some(ua => ua.area_id == cb.value);
        cb.checked = isSelected;
    });
    
    // 更新主区域下拉框
    updatePrimaryAreaOptions();
    
    // 设置主区域选中
    const primaryArea = userAreas.find(ua => ua.is_primary);
    const primaryAreaSelect = document.getElementById('userPrimaryArea');
    if (primaryAreaSelect && primaryArea) {
        primaryAreaSelect.value = primaryArea.area_id;
    }
}

async function loadUserFormOptions() {
    let departments = [];
    let teams = [];
    let positions = [];
    let projects = [];
    let areas = [];
    let roles = [];
    
    // 使用 fetch 加载数据
    try {
        const [deptRes, teamRes, posRes, projectRes, areaRes, rolesRes] = await Promise.all([
            fetch('/api/departments', { credentials: 'include' }),
            fetch('/api/teams', { credentials: 'include' }),
            fetch('/api/positions', { credentials: 'include' }),
            fetch('/api/projects', { credentials: 'include' }),
            fetch('/api/areas', { credentials: 'include' }),
            fetch('/api/roles', { credentials: 'include' })
        ]);
        
        const [deptResult, teamResult, posResult, projectResult, areaResult, rolesResult] = await Promise.all([
            deptRes.json(),
            teamRes.json(),
            posRes.json(),
            projectRes.json(),
            areaRes.json(),
            rolesRes.json()
        ]);
        
        if (deptResult.success) {
            departments = deptResult.data || [];
        }
        if (teamResult.success) {
            teams = teamResult.data || [];
        }
        if (posResult.success) {
            positions = posResult.data || [];
        }
        if (projectResult.success) {
            projects = projectResult.data || [];
        }
        if (areaResult.success) {
            areas = areaResult.data || [];
        }
        if (rolesResult.success) {
            roles = rolesResult.data || [];
        }
    } catch (error) {
        console.error('❌ API加载失败:', error);
        showNotification('加载表单数据失败，请刷新页面重试', 'error');
    }
    
    const deptSelect = document.getElementById('userDepartment');
    const teamsContainer = document.getElementById('userTeamsCheckboxes');
    const primaryTeamSelect = document.getElementById('userPrimaryTeam');
    const areasContainer = document.getElementById('userAreasCheckboxes');
    const primaryAreaSelect = document.getElementById('userPrimaryArea');
    const posSelect = document.getElementById('userPosition');
    const projectSelect = document.getElementById('userProject');
    const roleSelect = document.getElementById('userRoleSelect');
    
    if (deptSelect) {
        deptSelect.innerHTML = '<option value="">请选择部门</option>' + 
            departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }
    
    // ✅ 团队多选：生成复选框
    if (teamsContainer) {
        teamsContainer.innerHTML = teams.map(t => `
            <label class="inline-flex items-center px-2 py-1 bg-white border rounded cursor-pointer hover:bg-blue-50 text-sm">
                <input type="checkbox" class="team-checkbox mr-1.5" value="${t.id}" data-name="${t.name}">
                ${t.name}
            </label>
        `).join('');
        
        // 监听复选框变化，更新主团队下拉框
        teamsContainer.querySelectorAll('.team-checkbox').forEach(cb => {
            cb.addEventListener('change', updatePrimaryTeamOptions);
        });
    }
    
    if (primaryTeamSelect) {
        primaryTeamSelect.innerHTML = '<option value="">请先选择团队</option>';
    }
    
    // ✅ 区域多选：生成复选框
    if (areasContainer) {
        areasContainer.innerHTML = areas.filter(a => a.status === 'active').map(a => `
            <label class="inline-flex items-center px-2 py-1 bg-white border rounded cursor-pointer hover:bg-blue-50 text-sm">
                <input type="checkbox" class="area-checkbox mr-1.5" value="${a.id}" data-name="${a.name}">
                ${a.name}
            </label>
        `).join('');
        
        // 监听复选框变化，更新主区域下拉框
        areasContainer.querySelectorAll('.area-checkbox').forEach(cb => {
            cb.addEventListener('change', updatePrimaryAreaOptions);
        });
    }
    
    if (primaryAreaSelect) {
        primaryAreaSelect.innerHTML = '<option value="">请先选择区域</option>';
    }
    
    if (posSelect) {
        posSelect.innerHTML = '<option value="">请选择岗位</option>' + 
            positions.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }
    
    if (projectSelect) {
        projectSelect.innerHTML = '<option value="">请选择项目</option>' + 
            projects.filter(p => ['active', 'planning'].includes(p.status)).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }
    
    if (roleSelect) {
        roleSelect.innerHTML = '<option value="">请选择角色</option>' + 
            roles.filter(r => r.status === 'active').map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    }
}

function createUserModal() {
    const modal = document.createElement('div');
    modal.id = 'userModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl mx-4 overflow-hidden" style="width: 960px; max-height: 540px; display: flex; flex-direction: column;">
            <div class="flex items-center justify-between px-4 py-2 border-b bg-gray-50 flex-shrink-0">
                <h3 id="userModalTitle" class="text-base font-semibold text-gray-900">编辑人员</h3>
                <button type="button" onclick="closeUserModal()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <form id="userForm" class="p-4 overflow-y-auto flex-1" style="min-height: 0;">
                <!-- 第一行：姓名、别名、用户名、密码 -->
                <div class="grid grid-cols-4 gap-3 mb-3">
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">姓名 <span class="text-red-500">*</span></label>
                        <input type="text" id="userName" class="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" required placeholder="姓名">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">别名</label>
                        <input type="text" id="userAlias" class="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" placeholder="如：小明">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">用户名 <span class="text-red-500">*</span></label>
                        <input type="text" id="userUsername" class="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" required placeholder="登录账号">
                    </div>
                    <div id="passwordSection">
                        <label class="block text-xs font-medium text-gray-600 mb-1">密码 <span id="passwordRequiredMark" class="text-red-500">*</span></label>
                        <input type="password" id="userPassword" class="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" placeholder="留空不修改">
                    </div>
                </div>

                <!-- 第二行：手机号、邮箱、角色、超级管理员 -->
                <div class="grid grid-cols-4 gap-3 mb-3">
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">手机号</label>
                        <input type="tel" id="userPhone" class="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" placeholder="手机号">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">邮箱</label>
                        <input type="email" id="userEmail" class="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" placeholder="邮箱地址">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">角色</label>
                        <select id="userRoleSelect" class="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">请选择角色</option>
                        </select>
                    </div>
                    <div class="flex items-end pb-1">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="userIsSuperAdmin" class="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="ml-1.5 text-xs font-medium text-gray-700">
                                <i class="fas fa-crown text-yellow-500 mr-0.5"></i>超级管理员
                            </span>
                        </label>
                    </div>
                </div>

                <!-- 第三行：岗位、部门、项目、区域 -->
                <div class="grid grid-cols-4 gap-3 mb-3">
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">岗位</label>
                        <select id="userPosition" class="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">请选择</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">部门</label>
                        <select id="userDepartment" class="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">请选择</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">项目</label>
                        <select id="userProject" class="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">请选择</option>
                        </select>
                    </div>
                </div>

                <!-- 第四行：团队多选 + 主团队 -->
                <div class="grid grid-cols-4 gap-3 mb-3">
                    <div class="col-span-3">
                        <label class="block text-xs font-medium text-gray-600 mb-1">团队（可多选）</label>
                        <div id="userTeamsContainer" class="border rounded p-2 min-h-[32px] max-h-[80px] overflow-y-auto bg-gray-50">
                            <div id="userTeamsCheckboxes" class="flex flex-wrap gap-1.5">
                                <!-- 团队复选框动态生成 -->
                            </div>
                        </div>
                        <input type="hidden" id="userTeam" value="">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">主团队</label>
                        <select id="userPrimaryTeam" class="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">请先选择团队</option>
                        </select>
                    </div>
                </div>

                <!-- 第五行：区域多选 + 主区域 -->
                <div class="grid grid-cols-4 gap-3 mb-3">
                    <div class="col-span-3">
                        <label class="block text-xs font-medium text-gray-600 mb-1">区域（可多选）</label>
                        <div id="userAreasContainer" class="border rounded p-2 min-h-[32px] max-h-[80px] overflow-y-auto bg-gray-50">
                            <div id="userAreasCheckboxes" class="flex flex-wrap gap-1.5">
                                <!-- 区域复选框动态生成 -->
                            </div>
                        </div>
                        <input type="hidden" id="userArea" value="">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">主区域</label>
                        <select id="userPrimaryArea" class="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">请先选择区域</option>
                        </select>
                    </div>
                </div>

                <!-- 底部按钮 -->
                <div class="flex justify-end space-x-2 pt-3 border-t mt-2">
                    <button type="button" onclick="closeUserModal()" class="px-4 py-1.5 text-sm border rounded text-gray-700 hover:bg-gray-50">取消</button>
                    <button type="submit" class="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">保存</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('userForm').addEventListener('submit', saveUser);
}

function closeUserModal() {
    const modal = document.getElementById('userModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    currentEditingUser = null;
}

async function saveUser(e) {
    e.preventDefault();
    
    const name = document.getElementById('userName').value.trim();
    const alias = document.getElementById('userAlias').value.trim();
    const username = document.getElementById('userUsername').value.trim();
    const password = document.getElementById('userPassword').value;
    const phone = document.getElementById('userPhone').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const position_id = document.getElementById('userPosition').value ? parseInt(document.getElementById('userPosition').value) : null;
    const department_id = document.getElementById('userDepartment').value ? parseInt(document.getElementById('userDepartment').value) : null;
    const project_id = document.getElementById('userProject').value ? parseInt(document.getElementById('userProject').value) : null;
    
    // ✅ 获取多选的团队ID列表
    const selectedTeamCheckboxes = document.querySelectorAll('.team-checkbox:checked');
    const team_ids = Array.from(selectedTeamCheckboxes).map(cb => parseInt(cb.value));
    const primary_team_id = document.getElementById('userPrimaryTeam')?.value ? parseInt(document.getElementById('userPrimaryTeam').value) : null;
    
    // ✅ 获取多选的区域ID列表
    const selectedAreaCheckboxes = document.querySelectorAll('.area-checkbox:checked');
    const area_ids = Array.from(selectedAreaCheckboxes).map(cb => parseInt(cb.value));
    const primary_area_id = document.getElementById('userPrimaryArea')?.value ? parseInt(document.getElementById('userPrimaryArea').value) : null;
    
    // 兼容旧逻辑：主团队作为team_id
    const team_id = primary_team_id || (team_ids.length > 0 ? team_ids[0] : null);
    // 兼容旧逻辑：主区域作为area_id
    const area_id = primary_area_id || (area_ids.length > 0 ? area_ids[0] : null);
    
    // 获取角色和超级管理员设置
    const selectedRoleId = document.getElementById('userRoleSelect')?.value;
    const isSuperAdmin = document.getElementById('userIsSuperAdmin')?.checked || false;
    
    if (!name || !username) {
        alert('请填写姓名和用户名');
        return;
    }
    
    // 新增时密码必填
    if (!currentEditingUser && !password) {
        alert('请设置密码');
        return;
    }
    
    // 确定用户角色
    let userRole = 'user';
    if (isSuperAdmin) {
        userRole = 'admin'; // 超级管理员使用admin角色
    }
    
    const userData = {
        name,
        alias,
        username,
        password: password || undefined,
        phone,
        email,
        position_id,
        department_id,
        team_id,
        project_id,
        area_id,
        role: userRole,
        status: 'enabled'
    };
    
    // 尝试使用 API 保存
    try {
        let result;
        let userId = currentEditingUser;
        
        if (currentEditingUser) {
            result = await window.api.updateUser(currentEditingUser, userData);
        } else {
            result = await window.api.addUser(userData);
            if (result.success && result.data) {
                userId = result.data.id;
            }
        }
        
        if (result.success) {
            // ✅ 保存用户的多团队关联
            if (team_ids.length > 0 && userId) {
                try {
                    await fetch(`/api/users/${userId}/teams`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            team_ids: team_ids,
                            primary_team_id: primary_team_id || team_ids[0]
                        })
                    });
                    console.log('✅ 用户团队关联已保存:', team_ids);
                } catch (teamError) {
                    console.error('保存团队关联失败:', teamError);
                }
            }
            
            // ✅ 保存用户的多区域关联
            if (area_ids.length > 0 && userId) {
                try {
                    await fetch(`/api/users/${userId}/areas`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            area_ids: area_ids,
                            primary_area_id: primary_area_id || area_ids[0]
                        })
                    });
                    console.log('✅ 用户区域关联已保存:', area_ids);
                } catch (areaError) {
                    console.error('保存区域关联失败:', areaError);
                }
            }
            
            // 如果选择了角色，同时更新用户角色
            if (selectedRoleId && userId) {
                try {
                    await fetch('/api/user-roles/assign', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            user_id: userId,
                            role_ids: [parseInt(selectedRoleId)]
                        })
                    });
                } catch (roleError) {
                    console.error('分配角色失败:', roleError);
                }
            }
            
            showNotification(currentEditingUser ? '人员信息更新成功' : '人员创建成功', 'success');
            closeUserModal();
            renderPersonnelList();
            return;
        } else {
            throw new Error(result.message || 'API返回失败');
        }
    } catch (error) {
        console.error('❌ API 保存失败:', error);
        showNotification(`保存人员失败: ${error.message}`, 'error');
    }
}

// 保存到 LocalStorage（降级方案）
function saveUserToLocalStorage(userId, userData) {
    
    // 检查用户名是否已存在
    const users = getUsers ? getUsers().data || [] : [];
    const existingUser = users.find(u => u.username === userData.username && u.id !== userId);
    if (existingUser) {
        alert('用户名已存在，请使用其他用户名');
        return;
    }
    
    let result;
    if (userId) {
        // 编辑现有用户
        result = updateUser(userId, userData);
        if (result.success) {
            showNotification('人员信息更新成功', 'success');
        } else {
            showNotification(result.message || '更新失败', 'error');
            return;
        }
    } else {
        // 新增用户
        result = addUser(userData);
        if (result.success) {
            showNotification('人员创建成功', 'success');
        } else {
            showNotification(result.message || '创建失败', 'error');
            return;
        }
    }
    
    closeUserModal();
    renderPersonnelList();
}

// 部门模态框
async function openDepartmentModal(id = null) {
    currentEditingDepartment = id;
    let modal = document.getElementById('departmentModal');
    if (!modal) {
        createDepartmentModal();
        modal = document.getElementById('departmentModal');
    }
    
    const form = document.getElementById('departmentForm');
    if (form) form.reset();
    
    await loadDepartmentFormOptions();
    
    if (id) {
        const departments = getDepartments ? getDepartments().data || [] : [];
        const dept = departments.find(d => d.id === id);
        if (dept) {
            const nameEl = document.getElementById('departmentName');
            const managerEl = document.getElementById('departmentManager');
            if (nameEl) nameEl.value = dept.name || '';
            if (managerEl) managerEl.value = dept.manager_id || '';
        }
    }
    
    modal?.classList.remove('hidden');
}

async function loadDepartmentFormOptions() {
    let users = [];
    
    // API优先 + LocalStorage降级
    try {
        const result = await window.api.getUsers();
        if (result.success) {
            users = result.data || [];
        } else {
            throw new Error('API返回失败');
        }
    } catch (error) {
        console.error('❌ API加载失败:', error);
        showNotification('加载人员数据失败，请刷新页面重试', 'error');
    }
    
    const managerSelect = document.getElementById('departmentManager');
    if (managerSelect) {
        managerSelect.innerHTML = '<option value="">请选择负责人</option>' + 
            users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    }
}

function createDepartmentModal() {
    const modal = document.createElement('div');
    modal.id = 'departmentModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div class="flex items-center justify-between p-4 border-b">
                <h3 class="text-lg font-semibold text-gray-900">部门信息</h3>
                <button onclick="closeDepartmentModal()" class="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form id="departmentForm" class="p-4 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">部门名称 <span class="text-red-500">*</span></label>
                    <input type="text" id="departmentName" class="w-full px-3 py-2 border rounded-lg" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">负责人</label>
                    <select id="departmentManager" class="w-full px-3 py-2 border rounded-lg">
                        <option value="">请选择负责人</option>
                    </select>
                </div>
                <div class="flex justify-end space-x-3 pt-4">
                    <button type="button" onclick="closeDepartmentModal()" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('departmentForm').addEventListener('submit', saveDepartment);
}

function closeDepartmentModal() {
    document.getElementById('departmentModal')?.classList.add('hidden');
    currentEditingDepartment = null;
}

async function saveDepartment(e) {
    e.preventDefault();
    const name = document.getElementById('departmentName')?.value;
    const managerId = document.getElementById('departmentManager')?.value;
    const description = document.getElementById('departmentDescription')?.value;
    
    if (!name) {
        showNotification('请输入部门名称', 'error');
        return;
    }
    
    const deptData = {
        name,
        manager_id: managerId ? parseInt(managerId) : null,
        description: description || null
    };
    
    // 尝试使用 API 保存
    try {
        let result;
        if (currentEditingDepartment) {
            result = await window.api.updateDepartment(currentEditingDepartment, deptData);
        } else {
            result = await window.api.addDepartment(deptData);
        }
        
        if (result.success) {
            closeDepartmentModal();
            renderDepartmentsList();
            showNotification('保存成功', 'success');
            return;
        } else {
            throw new Error(result.message || 'API返回失败');
        }
    } catch (error) {
        console.error('❌ API 保存失败:', error);
        showNotification(`保存部门失败: ${error.message}`, 'error');
    }
}

async function deleteDepartmentItem(id) {
    if (!confirm('确定要删除该部门吗？')) return;
    
    // 尝试使用 API 删除
    try {
        const result = await window.api.deleteDepartment(id);
        if (result.success) {
            renderDepartmentsList();
            showNotification('删除成功', 'success');
            return;
        } else {
            throw new Error(result.message || 'API返回失败');
        }
    } catch (error) {
        console.error('❌ API 删除失败:', error);
        showNotification(`删除部门失败: ${error.message}`, 'error');
    }
}

// 团队模态框
async function openTeamModal(id = null) {
    currentEditingTeam = id;
    let modal = document.getElementById('teamModal');
    if (!modal) {
        createTeamModal();
        modal = document.getElementById('teamModal');
    }
    
    const form = document.getElementById('teamForm');
    if (form) form.reset();
    
    await loadTeamFormOptions();
    
    if (id) {
        // 使用 fetch 加载团队数据
        try {
            const response = await fetch('/api/teams', { credentials: 'include' });
            const result = await response.json();
            if (result.success) {
                const teams = result.data || [];
                const team = teams.find(t => t.id === id);
                if (team) {
                    const nameEl = document.getElementById('teamName');
                    const deptEl = document.getElementById('teamDepartment');
                    const leaderEl = document.getElementById('teamLeader');
                    if (nameEl) nameEl.value = team.name || '';
                    if (deptEl) deptEl.value = team.department_id || '';
                    if (leaderEl) leaderEl.value = team.leader_id || '';
                }
            }
        } catch (error) {
            console.error('❌ 加载团队数据失败:', error);
        }
    }
    
    modal?.classList.remove('hidden');
}

async function loadTeamFormOptions() {
    let users = [];
    let departments = [];
    
    // API优先 + LocalStorage降级
    try {
        const [userResult, deptResult] = await Promise.all([
            window.api.getUsers(),
            window.api.getDepartments()
        ]);
        
        if (userResult.success) {
            users = userResult.data || [];
        }
        if (deptResult.success) {
            departments = deptResult.data || [];
        }
    } catch (error) {
        console.error('❌ API加载失败:', error);
        showNotification('加载表单数据失败，请刷新页面重试', 'error');
    }
    
    const deptSelect = document.getElementById('teamDepartment');
    const leaderSelect = document.getElementById('teamLeader');
    
    if (deptSelect) {
        deptSelect.innerHTML = '<option value="">请选择部门</option>' + 
            departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }
    
    if (leaderSelect) {
        leaderSelect.innerHTML = '<option value="">请选择负责人</option>' + 
            users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    }
}

function createTeamModal() {
    const modal = document.createElement('div');
    modal.id = 'teamModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div class="flex items-center justify-between p-4 border-b">
                <h3 class="text-lg font-semibold text-gray-900">团队信息</h3>
                <button onclick="closeTeamModal()" class="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form id="teamForm" class="p-4 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">团队名称 <span class="text-red-500">*</span></label>
                    <input type="text" id="teamName" class="w-full px-3 py-2 border rounded-lg" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">所属部门</label>
                    <select id="teamDepartment" class="w-full px-3 py-2 border rounded-lg">
                        <option value="">请选择部门</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">负责人</label>
                    <select id="teamLeader" class="w-full px-3 py-2 border rounded-lg">
                        <option value="">请选择负责人</option>
                    </select>
                </div>
                <div class="flex justify-end space-x-3 pt-4">
                    <button type="button" onclick="closeTeamModal()" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('teamForm').addEventListener('submit', saveTeam);
}

function closeTeamModal() {
    document.getElementById('teamModal')?.classList.add('hidden');
    currentEditingTeam = null;
}

async function saveTeam(e) {
    e.preventDefault();
    const name = document.getElementById('teamName')?.value;
    const departmentId = document.getElementById('teamDepartment')?.value;
    const leaderId = document.getElementById('teamLeader')?.value;
    const description = document.getElementById('teamDescription')?.value;
    
    if (!name) {
        showNotification('请输入团队名称', 'error');
        return;
    }
    
    const teamData = { 
        name, 
        department_id: departmentId ? parseInt(departmentId) : null,
        leader_id: leaderId ? parseInt(leaderId) : null,
        description: description || null
    };
    
    // 尝试使用 API 保存
    try {
        let result;
        if (currentEditingTeam) {
            result = await window.api.updateTeam(currentEditingTeam, teamData);
        } else {
            result = await window.api.addTeam(teamData);
        }
        
        if (result.success) {
            closeTeamModal();
            renderTeamsList();
            showNotification('保存成功', 'success');
            return;
        } else {
            throw new Error(result.message || 'API返回失败');
        }
    } catch (error) {
        console.error('❌ API 保存失败:', error);
        showNotification(`保存团队失败: ${error.message}`, 'error');
    }
}

async function deleteTeamItem(id) {
    if (!confirm('确定要删除该团队吗？')) return;
    
    // 尝试使用 API 删除
    try {
        const result = await window.api.deleteTeam(id);
        if (result.success) {
            renderTeamsList();
            showNotification('删除成功', 'success');
            return;
        } else {
            throw new Error(result.message || 'API返回失败');
        }
    } catch (error) {
        console.error('❌ API 删除失败:', error);
        showNotification(`删除团队失败: ${error.message}`, 'error');
    }
}

// 岗位模态框
async function openPositionModal(id = null) {
    currentEditingPosition = id;
    let modal = document.getElementById('positionModal');
    if (!modal) {
        createPositionModal();
        modal = document.getElementById('positionModal');
    }
    
    const form = document.getElementById('positionForm');
    if (form) form.reset();
    
    await loadPositionFormOptions();
    
    if (id) {
        // 使用 fetch 加载岗位数据
        try {
            const response = await fetch('/api/positions', { credentials: 'include' });
            const result = await response.json();
            if (result.success) {
                const positions = result.data || [];
                const pos = positions.find(p => p.id === id);
                if (pos) {
                    const nameEl = document.getElementById('positionName');
                    const deptEl = document.getElementById('positionDepartment');
                    const descEl = document.getElementById('positionDescription');
                    if (nameEl) nameEl.value = pos.name || '';
                    if (deptEl) deptEl.value = pos.department_id || '';
                    if (descEl) descEl.value = pos.description || '';
                }
            }
        } catch (error) {
            console.error('❌ 加载岗位数据失败:', error);
        }
    }
    
    modal?.classList.remove('hidden');
}

async function loadPositionFormOptions() {
    let departments = [];
    
    // 使用 fetch 加载数据
    try {
        const response = await fetch('/api/departments', { credentials: 'include' });
        const result = await response.json();
        if (result.success) {
            departments = result.data || [];
        } else {
            throw new Error('API返回失败');
        }
    } catch (error) {
        console.error('❌ API加载失败:', error);
        showNotification('加载部门数据失败，请刷新页面重试', 'error');
    }
    
    const deptSelect = document.getElementById('positionDepartment');
    if (deptSelect) {
        deptSelect.innerHTML = '<option value="">请选择部门</option>' + 
            departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }
}

function createPositionModal() {
    const modal = document.createElement('div');
    modal.id = 'positionModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div class="flex items-center justify-between p-4 border-b">
                <h3 class="text-lg font-semibold text-gray-900">岗位信息</h3>
                <button onclick="closePositionModal()" class="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form id="positionForm" class="p-4 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">岗位名称 <span class="text-red-500">*</span></label>
                    <input type="text" id="positionName" class="w-full px-3 py-2 border rounded-lg" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">所属部门</label>
                    <select id="positionDepartment" class="w-full px-3 py-2 border rounded-lg">
                        <option value="">请选择部门</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">岗位描述</label>
                    <textarea id="positionDescription" rows="3" class="w-full px-3 py-2 border rounded-lg"></textarea>
                </div>
                <div class="flex justify-end space-x-3 pt-4">
                    <button type="button" onclick="closePositionModal()" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('positionForm').addEventListener('submit', savePosition);
}

function closePositionModal() {
    document.getElementById('positionModal')?.classList.add('hidden');
    currentEditingPosition = null;
}

async function savePosition(e) {
    e.preventDefault();
    const name = document.getElementById('positionName')?.value;
    const code = document.getElementById('positionCode')?.value;
    const departmentId = document.getElementById('positionDepartment')?.value;
    const level = document.getElementById('positionLevel')?.value;
    const description = document.getElementById('positionDescription')?.value;
    const requirements = document.getElementById('positionRequirements')?.value;
    
    if (!name) {
        showNotification('请输入岗位名称', 'error');
        return;
    }
    
    const posData = { 
        name, 
        code: code || null,
        department_id: departmentId ? parseInt(departmentId) : null,
        level: level || null,
        description: description || null,
        requirements: requirements || null
    };
    
    // 尝试使用 API 保存
    try {
        let result;
        if (currentEditingPosition) {
            result = await window.api.updatePosition(currentEditingPosition, posData);
        } else {
            result = await window.api.addPosition(posData);
        }
        
        if (result.success) {
            closePositionModal();
            renderPositionsList();
            showNotification('保存成功', 'success');
            return;
        } else {
            throw new Error(result.message || 'API返回失败');
        }
    } catch (error) {
        console.error('❌ API 保存失败:', error);
        showNotification(`保存岗位失败: ${error.message}`, 'error');
    }
}

async function deletePositionItem(id) {
    if (!confirm('确定要删除该岗位吗？')) return;
    
    // 尝试使用 API 删除
    try {
        const result = await window.api.deletePosition(id);
        if (result.success) {
            renderPositionsList();
            showNotification('删除成功', 'success');
            return;
        } else {
            throw new Error(result.message || 'API返回失败');
        }
    } catch (error) {
        console.error('❌ API 删除失败:', error);
        showNotification(`删除岗位失败: ${error.message}`, 'error');
    }
}

// ============ 系统配置页面 ============
// initBasicConfigPage已移至settings.js中的loadBasicConfigPage

async function initAccountConfigPage() {
    // 加载账户列表
    const tbody = document.getElementById('configAccountsTableBody');
    if (!tbody) return;
    
    let accounts = [];
    try {
        const result = await window.api.getAccounts();
        if (result.success && result.data) {
            accounts = result.data;
        }
    } catch (error) {
        console.error('❌ 加载账户列表失败:', error);
    }
    
    tbody.innerHTML = '';
    accounts.forEach(acc => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${acc.name || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-500">${acc.account_type || '-'}</td>
            <td class="px-4 py-3 text-sm text-right text-gray-900">¥${(acc.balance || 0).toLocaleString('zh-CN', {minimumFractionDigits: 2})}</td>
            <td class="px-4 py-3 text-center">
                <button onclick="window.openAccountModal(${acc.id})" class="text-blue-600 hover:text-blue-800 text-sm">编辑</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    if (accounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-500">暂无账户数据</td></tr>';
    }
}

// 账户模态框函数（占位符，待实现）
window.openAccountModal = function(accountId) {
    console.log('TODO: 打开账户编辑模态框', accountId);
    alert('账户编辑功能待实现');
};

function initCategoryConfigPage() {
    // 类别配置页面初始化
}

function initBackupConfigPage() {
    // 备份配置页面初始化
}

// 通知函数
// showNotification 函数已移动到 utils.js（作为基础工具函数）
// 移动日期：2026-02-12
// 直接调用 window.showNotification 即可
