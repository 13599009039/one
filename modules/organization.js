// 组织架构管理模块 - 人员、部门、团队、岗位独立页面

// ============ 人员设置页面 ============
function initPersonnelPage() {
    renderPersonnelList();
}

async function renderPersonnelList() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    let users = [];
    
    // 尝试使用 API 加载
    try {
        console.log('调用 API 加载用户列表...');
        const result = await window.api.getUsers();
        if (result.success) {
            users = result.data || [];
            console.log(`API 加载成功: ${users.length} 个用户`);
        }
    } catch (error) {
        console.warn('❌ API 加载失败，降级到 LocalStorage:', error);
        // 降级到 LocalStorage
        const usersResult = getUsers ? getUsers() : { data: [] };
        users = usersResult.data || usersResult || [];
    }
    
    // 安全获取部门/团队/岗位数据（兼容空数据）
    const departments = (typeof getDepartments === 'function') ? (getDepartments().data || []) : [];
    const teams = (typeof getTeams === 'function') ? (getTeams().data || []) : [];
    const positions = (typeof getPositions === 'function') ? (getPositions().data || []) : [];
    
    console.log('部门数据:', departments.length, '团队数据:', teams.length, '岗位数据:', positions.length);
    
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-500">暂无人员数据</td></tr>';
        return;
    }
    
    users.forEach(user => {
        const dept = departments.find(d => d.id === user.department_id);
        const team = teams.find(t => t.id === user.team_id);
        const pos = positions.find(p => p.id === user.position_id);
        
        // 联系方式显示
        const contactInfo = [];
        if (user.phone) contactInfo.push(`<i class="fas fa-phone text-gray-400 mr-1"></i>${user.phone}`);
        if (user.email) contactInfo.push(`<i class="fas fa-envelope text-gray-400 mr-1"></i>${user.email}`);
        const contactHtml = contactInfo.length > 0 ? contactInfo.join('<br>') : '<span class="text-gray-400">-</span>';
        
        // 部门/团队显示
        const deptTeamInfo = [];
        if (dept) deptTeamInfo.push(dept.name);
        if (team) deptTeamInfo.push(team.name);
        const deptTeamHtml = deptTeamInfo.length > 0 ? deptTeamInfo.join(' / ') : '<span class="text-gray-400">未分配</span>';
        
        // 岗位显示（优先显示岗位，其次role）
        const positionHtml = pos ? pos.name : (user.role ? getRoleText(user.role) : '-');
        
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';
        tr.innerHTML = `
            <td class="px-3 py-3 text-sm text-gray-900 font-medium">${user.name || '-'}</td>
            <td class="px-3 py-3 text-sm text-gray-500">${user.alias || '-'}</td>
            <td class="px-3 py-3 text-sm text-gray-500">${user.username || '-'}</td>
            <td class="px-3 py-3 text-xs text-gray-500">${contactHtml}</td>
            <td class="px-3 py-3 text-sm text-gray-500">${positionHtml}</td>
            <td class="px-3 py-3 text-sm text-gray-500">${deptTeamHtml}</td>
            <td class="px-3 py-3 text-center">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${user.status === 'enabled' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${user.status === 'enabled' ? '启用' : '禁用'}
                </span>
            </td>
            <td class="px-3 py-3 text-center">
                <button onclick="openUserModal(${user.id})" class="text-blue-600 hover:text-blue-800 text-sm mr-2" title="编辑">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="toggleUserStatus(${user.id})" class="text-orange-600 hover:text-orange-800 text-sm" title="${user.status === 'enabled' ? '禁用' : '启用'}">
                    <i class="fas fa-${user.status === 'enabled' ? 'ban' : 'check-circle'}"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

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
    
    // 尝试使用 API 加载部门和用户数据
    try {
        console.log('调用 API 加载部门列表...');
        const [deptResult, userResult] = await Promise.all([
            window.api.getDepartments(),
            window.api.getUsers()
        ]);
        
        if (deptResult.success) {
            departments = deptResult.data || [];
            console.log(`API 加载成功: ${departments.length} 个部门`);
        }
        if (userResult.success) {
            users = userResult.data || [];
        }
    } catch (error) {
        console.warn('❌ API 加载失败，降级到 LocalStorage:', error);
        // 降级到 LocalStorage
        departments = (typeof getDepartments === 'function') ? (getDepartments().data || []) : [];
        const usersResult = (typeof getUsers === 'function') ? getUsers() : { data: [] };
        users = usersResult.data || usersResult || [];
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
    
    // 尝试使用 API 加载
    try {
        console.log('调用 API 加载团队列表...');
        const [teamResult, deptResult, userResult] = await Promise.all([
            window.api.getTeams(),
            window.api.getDepartments(),
            window.api.getUsers()
        ]);
        
        if (teamResult.success) {
            teams = teamResult.data || [];
            console.log(`API 加载成功: ${teams.length} 个团队`);
        }
        if (deptResult.success) {
            departments = deptResult.data || [];
        }
        if (userResult.success) {
            users = userResult.data || [];
        }
    } catch (error) {
        console.warn('❌ API 加载失败，降级到 LocalStorage:', error);
        // 降级到 LocalStorage
        teams = (typeof getTeams === 'function') ? (getTeams().data || []) : [];
        departments = (typeof getDepartments === 'function') ? (getDepartments().data || []) : [];
        const usersResult = (typeof getUsers === 'function') ? getUsers() : { data: [] };
        users = usersResult.data || usersResult || [];
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
    
    // 尝试使用 API 加载
    try {
        console.log('调用 API 加载岗位列表...');
        const [posResult, deptResult] = await Promise.all([
            window.api.getPositions(),
            window.api.getDepartments()
        ]);
        
        if (posResult.success) {
            positions = posResult.data || [];
            console.log(`API 加载成功: ${positions.length} 个岗位`);
        }
        if (deptResult.success) {
            departments = deptResult.data || [];
        }
    } catch (error) {
        console.warn('❌ API 加载失败，降级到 LocalStorage:', error);
        // 降级到 LocalStorage
        positions = (typeof getPositions === 'function') ? (getPositions().data || []) : [];
        departments = (typeof getDepartments === 'function') ? (getDepartments().data || []) : [];
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
    
    // 更新标题
    const titleEl = document.getElementById('userModalTitle');
    if (titleEl) {
        titleEl.textContent = id ? '编辑人员' : '新增人员';
    }
    
    // 加载部门、团队、岗位选项
    await loadUserFormOptions();
    
    // 显示/隐藏密码区域
    const passwordSection = document.getElementById('passwordSection');
    const passwordRequiredMark = document.getElementById('passwordRequiredMark');
    if (id) {
        // 编辑模式，密码可选
        if (passwordSection) passwordSection.style.display = 'block';
        if (passwordRequiredMark) passwordRequiredMark.style.display = 'none';
        document.getElementById('userPassword').removeAttribute('required');
        
        const users = getUsers ? getUsers().data || [] : [];
        const user = users.find(u => u.id === id);
        if (user) {
            document.getElementById('userName').value = user.name || '';
            document.getElementById('userAlias').value = user.alias || '';
            document.getElementById('userUsername').value = user.username || '';
            document.getElementById('userPhone').value = user.phone || '';
            document.getElementById('userEmail').value = user.email || '';
            document.getElementById('userPosition').value = user.position_id || '';
            document.getElementById('userDepartment').value = user.department_id || '';
            document.getElementById('userTeam').value = user.team_id || '';
            document.getElementById('userPassword').value = '';
            document.getElementById('userPassword').placeholder = '留空则不修改密码';
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

async function loadUserFormOptions() {
    let departments = [];
    let teams = [];
    let positions = [];
    
    // API优先 + LocalStorage降级
    try {
        console.log('📡 调用 API 加载组织架构数据...');
        const [deptResult, teamResult, posResult] = await Promise.all([
            window.api.getDepartments(),
            window.api.getTeams(),
            window.api.getPositions()
        ]);
        
        if (deptResult.success) {
            departments = deptResult.data || [];
            console.log(`✅ API加载部门: ${departments.length}条`);
        }
        if (teamResult.success) {
            teams = teamResult.data || [];
            console.log(`✅ API加载团队: ${teams.length}条`);
        }
        if (posResult.success) {
            positions = posResult.data || [];
            console.log(`✅ API加载岗位: ${positions.length}条`);
        }
    } catch (error) {
        console.warn('❌ API加载失败，降级到LocalStorage:', error);
        departments = getDepartments ? getDepartments().data || [] : [];
        teams = getTeams ? getTeams().data || [] : [];
        positions = getPositions ? getPositions().data || [] : [];
    }
    
    const deptSelect = document.getElementById('userDepartment');
    const teamSelect = document.getElementById('userTeam');
    const posSelect = document.getElementById('userPosition');
    
    if (deptSelect) {
        deptSelect.innerHTML = '<option value="">请选择部门</option>' + 
            departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }
    
    if (teamSelect) {
        teamSelect.innerHTML = '<option value="">请选择团队</option>' + 
            teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    }
    
    if (posSelect) {
        posSelect.innerHTML = '<option value="">请选择岗位</option>' + 
            positions.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }
}

function createUserModal() {
    const modal = document.createElement('div');
    modal.id = 'userModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
                <h3 id="userModalTitle" class="text-lg font-semibold text-gray-900">新增人员</h3>
                <button type="button" onclick="closeUserModal()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form id="userForm" class="p-4">
                <!-- 基本信息 -->
                <div class="mb-4">
                    <h4 class="text-sm font-medium text-gray-500 mb-3 pb-2 border-b">基本信息</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">姓名 <span class="text-red-500">*</span></label>
                            <input type="text" id="userName" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required placeholder="请输入姓名">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">别名</label>
                            <input type="text" id="userAlias" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="如：小明">
                        </div>
                    </div>
                </div>

                <!-- 账号信息 -->
                <div class="mb-4">
                    <h4 class="text-sm font-medium text-gray-500 mb-3 pb-2 border-b">账号信息</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">用户名 <span class="text-red-500">*</span></label>
                            <input type="text" id="userUsername" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required placeholder="登录账号">
                        </div>
                        <div id="passwordSection">
                            <label class="block text-sm font-medium text-gray-700 mb-1">密码 <span id="passwordRequiredMark" class="text-red-500">*</span></label>
                            <input type="password" id="userPassword" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="请输入密码">
                        </div>
                    </div>
                </div>

                <!-- 联系方式 -->
                <div class="mb-4">
                    <h4 class="text-sm font-medium text-gray-500 mb-3 pb-2 border-b">联系方式</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                            <input type="tel" id="userPhone" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="如：13800138000">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                            <input type="email" id="userEmail" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="如：example@company.com">
                        </div>
                    </div>
                </div>

                <!-- 组织信息 -->
                <div class="mb-4">
                    <h4 class="text-sm font-medium text-gray-500 mb-3 pb-2 border-b">组织信息</h4>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">岗位</label>
                            <select id="userPosition" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">请选择岗位</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">部门</label>
                            <select id="userDepartment" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">请选择部门</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">团队</label>
                            <select id="userTeam" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">请选择团队</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end space-x-3 pt-4 border-t">
                    <button type="button" onclick="closeUserModal()" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
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
    const team_id = document.getElementById('userTeam').value ? parseInt(document.getElementById('userTeam').value) : null;
    
    if (!name || !username) {
        alert('请填写姓名和用户名');
        return;
    }
    
    // 新增时密码必填
    if (!currentEditingUser && !password) {
        alert('请设置密码');
        return;
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
        role: 'user',
        status: 'enabled'
    };
    
    // 尝试使用 API 保存
    try {
        let result;
        if (currentEditingUser) {
            console.log('调用 API 更新用户...');
            result = await window.api.updateUser(currentEditingUser, userData);
        } else {
            console.log('调用 API 添加用户...');
            result = await window.api.addUser(userData);
        }
        
        if (result.success) {
            showNotification(currentEditingUser ? '人员信息更新成功' : '人员创建成功', 'success');
            closeUserModal();
            renderPersonnelList();
            return;
        }
    } catch (error) {
        console.warn('❌ API 保存失败，降级到 LocalStorage:', error);
    }
    
    // 降级到 LocalStorage
    saveUserToLocalStorage(currentEditingUser, userData);
}

// 保存到 LocalStorage（降级方案）
function saveUserToLocalStorage(userId, userData) {
    console.log('使用 LocalStorage 保存用户...');
    
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

function toggleUserStatus(id) {
    const users = getUsers ? getUsers().data || [] : [];
    const user = users.find(u => u.id === id);
    if (user) {
        user.status = user.status === 'enabled' ? 'disabled' : 'enabled';
        saveDataToStorage();
        renderPersonnelList();
        showNotification('状态更新成功', 'success');
    }
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
        console.log('📡 调用 API 加载人员数据(部门负责人)...');
        const result = await window.api.getUsers();
        if (result.success) {
            users = result.data || [];
            console.log(`✅ API加载人员: ${users.length}条`);
        }
    } catch (error) {
        console.warn('❌ API加载失败，降级到LocalStorage:', error);
        users = getUsers ? getUsers().data || [] : [];
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
            console.log('调用 API 更新部门...');
            result = await window.api.updateDepartment(currentEditingDepartment, deptData);
        } else {
            console.log('调用 API 添加部门...');
            result = await window.api.addDepartment(deptData);
        }
        
        if (result.success) {
            closeDepartmentModal();
            renderDepartmentsList();
            showNotification('保存成功', 'success');
            return;
        }
    } catch (error) {
        console.warn('❌ API 保存失败，降级到 LocalStorage:', error);
    }
    
    // 降级到 LocalStorage
    if (currentEditingDepartment) {
        updateDepartment(currentEditingDepartment, deptData);
    } else {
        addDepartment(deptData);
    }
    
    closeDepartmentModal();
    renderDepartmentsList();
    showNotification('保存成功', 'success');
}

async function deleteDepartmentItem(id) {
    if (!confirm('确定要删除该部门吗？')) return;
    
    // 尝试使用 API 删除
    try {
        console.log('调用 API 删除部门...', id);
        const result = await window.api.deleteDepartment(id);
        if (result.success) {
            renderDepartmentsList();
            showNotification('删除成功', 'success');
            return;
        }
    } catch (error) {
        console.warn('❌ API 删除失败，降级到 LocalStorage:', error);
    }
    
    // 降级到 LocalStorage
    if (typeof deleteDepartment === 'function') {
        deleteDepartment(id);
    }
    renderDepartmentsList();
    showNotification('删除成功', 'success');
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
        const teams = getTeams ? getTeams().data || [] : [];
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
    
    modal?.classList.remove('hidden');
}

async function loadTeamFormOptions() {
    let users = [];
    let departments = [];
    
    // API优先 + LocalStorage降级
    try {
        console.log('📡 调用 API 加载组织架构数据(团队)...');
        const [userResult, deptResult] = await Promise.all([
            window.api.getUsers(),
            window.api.getDepartments()
        ]);
        
        if (userResult.success) {
            users = userResult.data || [];
            console.log(`✅ API加载人员: ${users.length}条`);
        }
        if (deptResult.success) {
            departments = deptResult.data || [];
            console.log(`✅ API加载部门: ${departments.length}条`);
        }
    } catch (error) {
        console.warn('❌ API加载失败，降级到LocalStorage:', error);
        users = getUsers ? getUsers().data || [] : [];
        departments = getDepartments ? getDepartments().data || [] : [];
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
            console.log('调用 API 更新团队...');
            result = await window.api.updateTeam(currentEditingTeam, teamData);
        } else {
            console.log('调用 API 添加团队...');
            result = await window.api.addTeam(teamData);
        }
        
        if (result.success) {
            closeTeamModal();
            renderTeamsList();
            showNotification('保存成功', 'success');
            return;
        }
    } catch (error) {
        console.warn('❌ API 保存失败，降级到 LocalStorage:', error);
    }
    
    // 降级到 LocalStorage
    if (currentEditingTeam) {
        updateTeam(currentEditingTeam, teamData);
    } else {
        addTeam(teamData);
    }
    
    closeTeamModal();
    renderTeamsList();
    showNotification('保存成功', 'success');
}

async function deleteTeamItem(id) {
    if (!confirm('确定要删除该团队吗？')) return;
    
    // 尝试使用 API 删除
    try {
        console.log('调用 API 删除团队...', id);
        const result = await window.api.deleteTeam(id);
        if (result.success) {
            renderTeamsList();
            showNotification('删除成功', 'success');
            return;
        }
    } catch (error) {
        console.warn('❌ API 删除失败，降级到 LocalStorage:', error);
    }
    
    // 降级到 LocalStorage
    if (typeof deleteTeam === 'function') {
        deleteTeam(id);
    }
    renderTeamsList();
    showNotification('删除成功', 'success');
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
        const positions = getPositions ? getPositions().data || [] : [];
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
    
    modal?.classList.remove('hidden');
}

async function loadPositionFormOptions() {
    let departments = [];
    
    // API优先 + LocalStorage降级
    try {
        console.log('📡 调用 API 加载部门数据(岗位)...');
        const result = await window.api.getDepartments();
        if (result.success) {
            departments = result.data || [];
            console.log(`✅ API加载部门: ${departments.length}条`);
        }
    } catch (error) {
        console.warn('❌ API加载失败，降级到LocalStorage:', error);
        departments = getDepartments ? getDepartments().data || [] : [];
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
            console.log('调用 API 更新岗位...');
            result = await window.api.updatePosition(currentEditingPosition, posData);
        } else {
            console.log('调用 API 添加岗位...');
            result = await window.api.addPosition(posData);
        }
        
        if (result.success) {
            closePositionModal();
            renderPositionsList();
            showNotification('保存成功', 'success');
            return;
        }
    } catch (error) {
        console.warn('❌ API 保存失败，降级到 LocalStorage:', error);
    }
    
    // 降级到 LocalStorage
    if (currentEditingPosition) {
        updatePosition(currentEditingPosition, posData);
    } else {
        addPosition(posData);
    }
    
    closePositionModal();
    renderPositionsList();
    showNotification('保存成功', 'success');
}

async function deletePositionItem(id) {
    if (!confirm('确定要删除该岗位吗？')) return;
    
    // 尝试使用 API 删除
    try {
        console.log('调用 API 删除岗位...', id);
        const result = await window.api.deletePosition(id);
        if (result.success) {
            renderPositionsList();
            showNotification('删除成功', 'success');
            return;
        }
    } catch (error) {
        console.warn('❌ API 删除失败，降级到 LocalStorage:', error);
    }
    
    // 降级到 LocalStorage
    if (typeof deletePosition === 'function') {
        deletePosition(id);
    }
    renderPositionsList();
    showNotification('删除成功', 'success');
}

// ============ 系统配置页面 ============
function initBasicConfigPage() {
    // 加载基本配置
    const settings = getSystemSettings ? getSystemSettings().data : null;
    if (settings) {
        const sysNameEl = document.getElementById('configSystemName');
        const companyNameEl = document.getElementById('configCompanyName');
        if (sysNameEl) sysNameEl.value = settings.system_name || '';
        if (companyNameEl) companyNameEl.value = settings.company_name || '';
    }
}

function initAccountConfigPage() {
    // 加载账户列表
    const tbody = document.getElementById('configAccountsTableBody');
    if (!tbody) return;
    
    const accounts = getAccounts ? getAccounts().data || [] : [];
    
    tbody.innerHTML = '';
    accounts.forEach(acc => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${acc.name || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-500">${acc.account_type || '-'}</td>
            <td class="px-4 py-3 text-sm text-right text-gray-900">¥${(acc.balance || 0).toLocaleString('zh-CN', {minimumFractionDigits: 2})}</td>
            <td class="px-4 py-3 text-center">
                <button onclick="openAccountModal(${acc.id})" class="text-blue-600 hover:text-blue-800 text-sm">编辑</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    if (accounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-500">暂无账户数据</td></tr>';
    }
}

function initCategoryConfigPage() {
    // 类别配置页面初始化
}

function initBackupConfigPage() {
    // 备份配置页面初始化
}

// 通知函数
function showNotification(message, type = 'success') {
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}
